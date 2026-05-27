# Design: DumpParser for ER Diagram Generation from Database Dump Files

**Date:** 2026-03-17
**Status:** Approved
**Scope:** New `DumpParser`, content sniffing in `file_analyzer.py`, `DiagramOutput` error field, `ERDiagramGenerator` dispatch update, test fixtures + tests

---

## Problem

`ERDiagramGenerator` passes all `.sql` files through the generic `SQLParser`, which cannot handle dump-file noise:
- PostgreSQL: `ALTER TABLE ONLY ... ADD CONSTRAINT FOREIGN KEY` (FK relationships lost), `SET`, `SELECT pg_catalog` preamble
- MySQL: `/*!...*/` block comments, `LOCK TABLES`, backtick identifiers
- SQLite: `PRAGMA`, `BEGIN TRANSACTION` wrappers

Users who run `pg_dump --schema-only` and point the ER generator at the output get partial results (low confidence, missing FK edges) with no explanation of why.

---

## Architecture

```
file_analyzer.py
  └─ detect_language(file_path)
       └─ [NEW] sniff_sql_content(content) called for .sql files
            ├─ matches pg_dump   → language = "pgdump"
            ├─ matches mysqldump → language = "mysqldump"
            ├─ matches sqlite    → language = "sqlite_dump"
            ├─ corrupt/truncated → raises ValueError with clear message
            └─ no match         → falls through to existing "sql" path

  └─ get_parser(language)
       ├─ "pgdump"       → DumpParser("postgresql")
       ├─ "mysqldump"    → DumpParser("mysql")
       ├─ "sqlite_dump"  → DumpParser("sqlite")
       └─ "sql"          → SQLParser() [unchanged]

DumpParser(dialect)           [NEW: .aicodepath/generators/parsers/dump_parser.py]
  ├─ parse(content)           — CodeParser protocol entry point
  ├─ _strip_preamble()        — remove noise before SQL
  ├─ _extract_tables()        — CREATE TABLE with inline FKs
  ├─ _extract_alter_fks()     — ALTER TABLE ADD CONSTRAINT FOREIGN KEY (pg/mysql)
  └─ _normalize_types()       — dialect types → generic (bigserial→INTEGER, etc.)

ERDiagramGenerator            [MODIFIED: dispatch on analyzed_file.language]
DiagramOutput                 [MODIFIED: add errors: List[str] field]
base_generator.py             [MODIFIED: route ValueError → errors[], unexpected → warnings[]]
```

---

## Section 1: Content Sniffing

`file_analyzer.py` gains `sniff_sql_content(content: str) -> Optional[str]` called from `detect_language()` for `.sql` files. Reads first 50 lines only.

### Dialect Signatures

| Dialect | Signature |
|---------|-----------|
| PostgreSQL | `-- PostgreSQL database dump` OR `pg_dump` in first 5 lines |
| MySQL | `-- MySQL dump` OR `/*!40` block comment |
| SQLite | `PRAGMA foreign_keys=OFF` OR `BEGIN TRANSACTION;` with sqlite style |

### Validity Checks (raise ValueError)

| Condition | Error message |
|-----------|--------------|
| File empty | `"Dump file is empty"` |
| File < 3 lines | `"Dump file appears truncated (< 3 lines)"` |
| Dialect found, zero CREATE TABLE | `"Recognized as {dialect} dump but no CREATE TABLE statements found — file may be data-only (use --schema-only flag)"` |
| No dialect match, not plain SQL | `"Not a recognized dump format — expected pg_dump, mysqldump, or sqlite3 .schema output"` |

---

## Section 2: DumpParser Internals

**File:** `.aicodepath/generators/parsers/dump_parser.py`

```python
class DumpParser:
    parser_type = "regex"
    def __init__(self, dialect: str): ...   # "postgresql" | "mysql" | "sqlite"
    def parse(self, content: str) -> Dict[str, Any]: ...
```

### Three-Stage Pipeline

**Stage 1 — Strip preamble:**

| Dialect | Strips |
|---------|--------|
| PostgreSQL | `SET ...;`, `SELECT pg_catalog...`, `--` comments, `\connect`, `CREATE EXTENSION` |
| MySQL | `/*!...*/` block comments, `SET NAMES`, `SET character_set`, `LOCK TABLES`, `UNLOCK TABLES` |
| SQLite | `PRAGMA` statements, `BEGIN TRANSACTION`, `COMMIT` |

**Stage 2 — Extract tables + FKs:**

| Element | PostgreSQL | MySQL | SQLite |
|---------|-----------|-------|--------|
| Tables | `CREATE TABLE` | `CREATE TABLE` | `CREATE TABLE` |
| Inline FKs | `CONSTRAINT ... FOREIGN KEY` | `CONSTRAINT ... FOREIGN KEY` | inline only |
| ALTER FKs | `ALTER TABLE ONLY t ADD CONSTRAINT ... FOREIGN KEY (col) REFERENCES t2(col)` | `ALTER TABLE t ADD CONSTRAINT ...` | N/A |

**Stage 3 — Type normalization:**

| Dialect type | Normalized |
|-------------|-----------|
| `bigserial`, `serial` | `INTEGER` |
| `uuid`, `bytea` | `VARCHAR` |
| `jsonb`, `json`, `hstore` | `TEXT` |
| `tinyint(1)` | `BOOLEAN` |
| `datetime` | `TIMESTAMP` |

**Returns:** `{"tables": [...], "foreign_keys": [...], "indexes": [...], "dialect": str, "warnings": [...]}`

---

## Section 3: Error Consolidation

**`DiagramOutput` in `base_generator.py`** gains `errors: List[str] = []` field.

**`base_generator.analyze_files()` catch block:**
```python
try:
    parsed_data = parser.parse(content)
except ValueError as e:       # clear, expected: corrupt/unrecognized
    self._add_error(str(e))
except Exception as e:         # unexpected
    self._add_warning(f"Unexpected error parsing {file_path}: {e}")
```

**`ERDiagramGenerator`** returns early if errors present after `analyze_files()`:
```python
DiagramOutput(
    mermaid_code="erDiagram\n    %% Generation failed — see errors",
    confidence_score=0.0,
    errors=self._get_errors(),
    warnings=self._get_warnings(),
    ...
)
```

Existing parsers (`SQLParser`, `SQLAlchemyParser`, `AlembicParser`) unchanged — they keep warnings-only behaviour.

---

## Section 4: ERDiagramGenerator Integration

Add language-aware dispatch in the file-type loop:
```python
elif file_path.endswith('.sql'):
    lang = analyzed_file.language  # "sql" | "pgdump" | "mysqldump" | "sqlite_dump"
    if lang == 'sql':
        self._parse_sql_schema(analyzed_file.content)
    else:
        self._parse_dump_output(analyzed_file)   # reads parsed_data from DumpParser
    parser_types_used.add('regex')
```

New `_parse_dump_output()` maps `parsed_data["tables"]` + `parsed_data["foreign_keys"]` → `self.entities{}` using existing `Entity` model.

---

## Section 5: Testing Strategy

### Test files

| File | Covers |
|------|--------|
| `tests/test_dump_parser.py` | Unit: strip_preamble, extract_tables, extract_alter_fks, normalize_types per dialect; ValueError on corrupt/empty/data-only |
| `tests/test_content_sniffing.py` | Unit: sniff_sql_content() identifies pg/mysql/sqlite; unrecognized → None; empty → ValueError |
| `tests/test_er_dump_integration.py` | Integration: ERDiagramGenerator with each dialect fixture; FK edges captured; confidence ≥ 0.7; errors=[] |

### Fixture files

```
.aicodepath/generators/tests/fixtures/
├── pg_dump_sample.sql       — 3 tables, 2 ALTER TABLE FK constraints
├── mysql_dump_sample.sql    — 3 tables, inline FK constraints
└── sqlite_dump_sample.sql   — 2 tables, inline FKs
```

---

## Files Changed

| File | Change |
|------|--------|
| `.aicodepath/generators/parsers/dump_parser.py` | New — DumpParser class |
| `.aicodepath/generators/parsers/__init__.py` | Export DumpParser |
| `.aicodepath/generators/core/file_analyzer.py` | sniff_sql_content(), 3 new language keys, 3 new get_parser() branches |
| `.aicodepath/generators/core/base_generator.py` | Add errors field + _add_error/_get_errors; update catch block |
| `.aicodepath/generators/diagrams/er_diagram.py` | _parse_dump_output(), language-aware dispatch |
| `.aicodepath/generators/tests/test_dump_parser.py` | New |
| `.aicodepath/generators/tests/test_content_sniffing.py` | New |
| `.aicodepath/generators/tests/test_er_dump_integration.py` | New |
| `.aicodepath/generators/tests/fixtures/pg_dump_sample.sql` | New |
| `.aicodepath/generators/tests/fixtures/mysql_dump_sample.sql` | New |
| `.aicodepath/generators/tests/fixtures/sqlite_dump_sample.sql` | New |

---

## Success Criteria

- [ ] `sniff_sql_content()` correctly identifies all three dialects from fixture files
- [ ] `DumpParser("postgresql").parse(pg_content)` extracts tables + ALTER TABLE FKs with zero warnings
- [ ] `DumpParser("mysql").parse(mysql_content)` extracts tables + inline FKs
- [ ] `DumpParser("sqlite").parse(sqlite_content)` extracts tables
- [ ] Empty/truncated/data-only dump raises `ValueError` with exact message
- [ ] `ERDiagramGenerator().generate([pg_dump_sample.sql])` returns confidence ≥ 0.7, errors=[]
- [ ] `DiagramOutput.errors` populated (not warnings) when ValueError raised
- [ ] All 3 test files pass
