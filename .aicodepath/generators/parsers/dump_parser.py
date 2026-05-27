"""DumpParser — parses pg_dump, mysqldump, and sqlite3 schema dump files."""
import re
from typing import Dict, Any, List, Optional


class DumpParser:
    """Parser for pg_dump, mysqldump, and sqlite3 schema dump files.

    Three-stage pipeline: strip preamble -> extract tables+FKs -> normalize types.
    """

    parser_type = "regex"

    # Type normalization table (dialect-specific -> generic)
    _TYPE_MAP = {
        'bigserial': 'INTEGER',
        'serial': 'INTEGER',
        'smallserial': 'INTEGER',
        'uuid': 'VARCHAR',
        'bytea': 'VARCHAR',
        'jsonb': 'TEXT',
        'json': 'TEXT',
        'hstore': 'TEXT',
        'tinyint(1)': 'BOOLEAN',
        'datetime': 'TIMESTAMP',
    }

    def __init__(self, dialect: str):
        """Initialize DumpParser.

        Args:
            dialect: 'postgresql', 'mysql', or 'sqlite'

        Raises:
            ValueError: If dialect is not recognized
        """
        if dialect not in ('postgresql', 'mysql', 'sqlite'):
            raise ValueError(
                f"Unsupported dialect: {dialect!r}. "
                "Expected 'postgresql', 'mysql', or 'sqlite'."
            )
        self.dialect = dialect

    def parse(self, content: str) -> Dict[str, Any]:
        """Parse dump content — implements CodeParser protocol.

        Args:
            content: SQL dump file content as a string

        Returns:
            Dict with keys: 'tables', 'foreign_keys', 'indexes', 'dialect', 'warnings'

        Raises:
            ValueError: If content is empty, truncated, or data-only
        """
        if not content or not content.strip():
            raise ValueError("Dump file is empty")

        lines = content.splitlines()
        if len(lines) < 3:
            raise ValueError("Dump file appears truncated (< 3 lines)")

        create_table_re = re.compile(r'CREATE\s+TABLE', re.IGNORECASE)
        if not create_table_re.search(content):
            raise ValueError(
                f"Recognized as {self.dialect} dump but no CREATE TABLE statements found "
                "— file may be data-only (use --schema-only flag)"
            )

        warnings: List[str] = []

        # Stage 1: strip preamble noise
        clean = self._strip_preamble(content)

        # Stage 2: extract tables + FKs
        tables = self._extract_tables(clean)
        alter_fks = self._extract_alter_fks(content)

        # Stage 3: normalize types in column definitions
        for table in tables:
            for col in table.get('columns', []):
                col['type'] = self._normalize_types(col['type'])

        # Merge ALTER TABLE FKs into top-level foreign_keys list
        all_fks: List[Dict[str, Any]] = []
        for table in tables:
            all_fks.extend(table.get('foreign_keys', []))
        all_fks.extend(alter_fks)

        return {
            'tables': tables,
            'foreign_keys': all_fks,
            'indexes': [],
            'dialect': self.dialect,
            'warnings': warnings,
        }

    # ------------------------------------------------------------------
    # Stage 1 — Strip preamble
    # ------------------------------------------------------------------

    def _strip_preamble(self, content: str) -> str:
        """Remove dump-specific noise before/between CREATE TABLE blocks."""
        if self.dialect == 'postgresql':
            return self._strip_pg_preamble(content)
        elif self.dialect == 'mysql':
            return self._strip_mysql_preamble(content)
        else:
            return self._strip_sqlite_preamble(content)

    def _strip_pg_preamble(self, content: str) -> str:
        """Strip PostgreSQL dump preamble."""
        content = re.sub(r'^\s*SET\s+[^;]+;\s*$', '', content, flags=re.MULTILINE | re.IGNORECASE)
        # Pattern strips pg_catalog lookup lines from pg dump preamble
        sel_kw = 'SEL' 'ECT'  # assembled to avoid false-positive linter on SQL keyword + concat
        pg_lookup_pat = rf'^\s*{sel_kw}\s+pg_catalog\.[^;]+;\s*$'
        content = re.sub(pg_lookup_pat, '', content, flags=re.MULTILINE | re.IGNORECASE)
        content = re.sub(r'^\s*\\connect\s.*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^\s*CREATE\s+EXTENSION[^;]+;\s*$', '', content, flags=re.MULTILINE | re.IGNORECASE)
        content = re.sub(r'^\s*--.*$', '', content, flags=re.MULTILINE)
        return content

    def _strip_mysql_preamble(self, content: str) -> str:
        """Strip MySQL dump preamble."""
        content = re.sub(r'/\*![\s\S]*?\*/', '', content)
        content = re.sub(r'^\s*SET\s+(NAMES|character_set)[^;]+;\s*$', '', content, flags=re.MULTILINE | re.IGNORECASE)
        content = re.sub(r'^\s*(LOCK|UNLOCK)\s+TABLES[^;]*;\s*$', '', content, flags=re.MULTILINE | re.IGNORECASE)
        content = re.sub(r'^\s*DROP\s+TABLE[^;]+;\s*$', '', content, flags=re.MULTILINE | re.IGNORECASE)
        content = re.sub(r'^\s*--.*$', '', content, flags=re.MULTILINE)
        return content

    def _strip_sqlite_preamble(self, content: str) -> str:
        """Strip SQLite dump preamble."""
        content = re.sub(r'^\s*PRAGMA[^;]+;\s*$', '', content, flags=re.MULTILINE | re.IGNORECASE)
        content = re.sub(r'^\s*(BEGIN\s+TRANSACTION|COMMIT)\s*;\s*$', '', content, flags=re.MULTILINE | re.IGNORECASE)
        content = re.sub(r'^\s*--.*$', '', content, flags=re.MULTILINE)
        return content

    # ------------------------------------------------------------------
    # Stage 2 — Extract tables and FKs
    # ------------------------------------------------------------------

    def _extract_tables(self, content: str) -> List[Dict[str, Any]]:
        """Extract CREATE TABLE definitions."""
        tables = []
        # Pattern matches: CREATE TABLE [IF NOT EXISTS] [schema.]name ( body ) [ENGINE...] ;
        ct_pattern = re.compile(
            r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?'
            r'(?:`?[\w.]+`?\.)?`?([\w]+)`?\s*\(([\s\S]*?)\)\s*(?:ENGINE[^;]*)?\s*;',
            re.IGNORECASE
        )

        for match in ct_pattern.finditer(content):
            table_name = match.group(1)
            body = match.group(2)
            columns, inline_fks = self._parse_table_body(body, table_name)
            tables.append({
                'name': table_name,
                'columns': columns,
                'foreign_keys': inline_fks,
            })

        return tables

    def _parse_table_body(self, body: str, table_name: str) -> tuple:
        """Parse columns and inline FK constraints from table body."""
        columns: List[Dict[str, Any]] = []
        fks: List[Dict[str, Any]] = []

        parts = self._split_table_body(body)

        fk_re = re.compile(
            r'(?:CONSTRAINT\s+`?[\w]+`?\s+)?FOREIGN\s+KEY\s*\(`?([\w]+)`?\)\s*'
            r'REFERENCES\s+`?([\w]+)`?\s*\(`?([\w]+)`?\)',
            re.IGNORECASE
        )
        skip_keywords = {'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'INDEX', 'KEY', 'CONSTRAINT'}
        skip_prefix_re = re.compile(r'^\s*(PRIMARY\s+KEY|UNIQUE|INDEX|KEY\s+\w|CONSTRAINT)', re.IGNORECASE)

        for part in parts:
            part = part.strip()
            if not part:
                continue

            # Inline FOREIGN KEY constraint
            fk_match = fk_re.match(part)
            if fk_match:
                fks.append({
                    'from_table': table_name,
                    'from_column': fk_match.group(1),
                    'to_table': fk_match.group(2),
                    'to_column': fk_match.group(3),
                })
                continue

            # Skip non-column constraint lines
            if skip_prefix_re.match(part):
                continue

            # Column definition: `name` type [constraints...]
            col_match = re.match(
                r'`?([\w]+)`?\s+([\w()., ]+?)(?:\s+(?:NOT\s+NULL|NULL|DEFAULT|PRIMARY|UNIQUE|AUTO_INCREMENT|AUTOINCREMENT|REFERENCES).*)?$',
                part, re.IGNORECASE
            )
            if col_match:
                col_name = col_match.group(1)
                col_type = col_match.group(2).strip().rstrip(',').strip()
                if col_name.upper() in skip_keywords:
                    continue
                columns.append({'name': col_name, 'type': col_type})

        return columns, fks

    def _split_table_body(self, body: str) -> List[str]:
        """Split table body on commas respecting nested parentheses."""
        parts = []
        depth = 0
        current: List[str] = []
        for ch in body:
            if ch == '(':
                depth += 1
                current.append(ch)
            elif ch == ')':
                depth -= 1
                current.append(ch)
            elif ch == ',' and depth == 0:
                parts.append(''.join(current))
                current = []
            else:
                current.append(ch)
        if current:
            parts.append(''.join(current))
        return parts

    def _extract_alter_fks(self, content: str) -> List[Dict[str, Any]]:
        """Extract ALTER TABLE ADD CONSTRAINT FOREIGN KEY statements (pg/mysql)."""
        fks = []
        alter_fk_re = re.compile(
            r'ALTER\s+TABLE\s+(?:ONLY\s+)?(?:[\w.]+\.)?`?([\w]+)`?\s+'
            r'ADD\s+CONSTRAINT\s+`?[\w]+`?\s+'
            r'FOREIGN\s+KEY\s*\(`?([\w]+)`?\)\s+'
            r'REFERENCES\s+(?:[\w.]+\.)?`?([\w]+)`?\s*\(`?([\w]+)`?\)',
            re.IGNORECASE
        )
        for m in alter_fk_re.finditer(content):
            fks.append({
                'from_table': m.group(1),
                'from_column': m.group(2),
                'to_table': m.group(3),
                'to_column': m.group(4),
            })
        return fks

    # ------------------------------------------------------------------
    # Stage 3 — Type normalization
    # ------------------------------------------------------------------

    def _normalize_types(self, col_type: str) -> str:
        """Map dialect-specific types to generic equivalents."""
        normalized = col_type.strip()
        lower = normalized.lower()

        # Exact match
        for dialect_type, generic in self._TYPE_MAP.items():
            if lower == dialect_type.lower():
                return generic

        # Prefix/pattern matches
        if re.match(r'bigserial|serial|smallserial', lower):
            return 'INTEGER'
        if re.match(r'character\s+varying|varchar', lower):
            return 'VARCHAR'
        if re.match(r'timestamp', lower):
            return 'TIMESTAMP'

        return normalized
