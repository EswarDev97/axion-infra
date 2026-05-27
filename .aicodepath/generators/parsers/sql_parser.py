"""SQL parser using sqlparse library."""
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import re
import logging

try:
    import sqlparse
    from sqlparse.sql import Statement, Token, Identifier, Function
    from sqlparse.tokens import Keyword, Name, Punctuation
    SQLPARSE_AVAILABLE = True
except ImportError:
    SQLPARSE_AVAILABLE = False
    sqlparse = None
    Statement = None
    Token = None
    Identifier = None
    Function = None

logger = logging.getLogger(__name__)


class ColumnEntity:
    """Represents a table column."""

    def __init__(
        self,
        name: str,
        data_type: str,
        nullable: bool = True,
        default: Optional[str] = None,
        primary_key: bool = False,
        unique: bool = False,
        auto_increment: bool = False
    ):
        self.name = name
        self.data_type = data_type
        self.nullable = nullable
        self.default = default
        self.primary_key = primary_key
        self.unique = unique
        self.auto_increment = auto_increment


class ForeignKeyEntity:
    """Represents a foreign key relationship."""

    def __init__(
        self,
        name: Optional[str],
        column: str,
        referenced_table: str,
        referenced_column: str,
        on_delete: Optional[str] = None,
        on_update: Optional[str] = None
    ):
        self.name = name
        self.column = column
        self.referenced_table = referenced_table
        self.referenced_column = referenced_column
        self.on_delete = on_delete
        self.on_update = on_update


class IndexEntity:
    """Represents a table index."""

    def __init__(
        self,
        name: str,
        columns: List[str],
        is_unique: bool = False,
        index_type: Optional[str] = None
    ):
        self.name = name
        self.columns = columns
        self.is_unique = is_unique
        self.index_type = index_type


class TableEntity:
    """Represents a database table."""

    def __init__(
        self,
        name: str,
        schema: Optional[str] = None,
        columns: List[ColumnEntity] = None,
        primary_keys: List[str] = None,
        foreign_keys: List[ForeignKeyEntity] = None,
        indexes: List[IndexEntity] = None,
        constraints: List[str] = None
    ):
        self.name = name
        self.schema = schema
        self.columns = columns or []
        self.primary_keys = primary_keys or []
        self.foreign_keys = foreign_keys or []
        self.indexes = indexes or []
        self.constraints = constraints or []


class SQLParser:
    """Parser for SQL CREATE TABLE statements using sqlparse."""

    def __init__(self):
        self.confidence = 0.85 if SQLPARSE_AVAILABLE else 0.0
        self.parser_type = "regex"
        if not SQLPARSE_AVAILABLE:
            logger.warning("sqlparse not available. SQL parsing will be limited.")

    def parse(self, content: str) -> Dict[str, Any]:
        """Parse SQL content string — implements CodeParser protocol.

        Args:
            content: SQL source code as a string

        Returns:
            Dict with 'tables', 'foreign_keys', and 'indexes' keys
        """
        if not SQLPARSE_AVAILABLE:
            return {"tables": [], "foreign_keys": [], "indexes": []}

        try:
            statements = sqlparse.parse(content)
            tables = self.extract_tables(statements)
            foreign_keys = []
            indexes = []
            for stmt in statements:
                foreign_keys.extend(self.extract_foreign_keys(stmt))
                indexes.extend(self.extract_indexes(stmt))
            return {
                "tables": [t.__dict__ for t in tables],
                "foreign_keys": [fk.__dict__ for fk in foreign_keys],
                "indexes": [idx.__dict__ for idx in indexes],
            }
        except Exception as e:
            logger.error(f"Error parsing SQL content: {e}")
            return {"tables": [], "foreign_keys": [], "indexes": []}

    def parse_file(self, file_path: str) -> List[Statement]:
        """
        Parse SQL file into statements.

        Args:
            file_path: Path to the SQL file

        Returns:
            List of parsed SQL statements
        """
        if not SQLPARSE_AVAILABLE:
            logger.error("sqlparse not available")
            return []

        try:
            path = Path(file_path)
            if not path.exists():
                logger.error(f"File not found: {file_path}")
                return []

            if path.suffix not in ['.sql', '.ddl']:
                logger.warning(f"Not a SQL file: {file_path}")
                return []

            with open(path, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            statements = sqlparse.parse(sql_content)
            return statements

        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return []

    def extract_tables(self, statements: List[Statement]) -> List[TableEntity]:
        """
        Extract TableEntity objects from SQL statements.

        Args:
            statements: List of parsed SQL statements

        Returns:
            List of TableEntity objects
        """
        tables = []

        for statement in statements:
            if statement.get_type() == 'CREATE':
                table = self._parse_create_table(statement)
                if table:
                    tables.append(table)

        return tables

    def extract_columns(self, create_stmt: Statement) -> List[ColumnEntity]:
        """
        Extract columns from CREATE TABLE statement.

        Args:
            create_stmt: CREATE TABLE statement

        Returns:
            List of ColumnEntity objects
        """
        columns = []

        try:
            # Get the column definitions section
            tokens = list(create_stmt.flatten())
            in_columns = False
            current_column = []

            for i, token in enumerate(tokens):
                if token.ttype is Punctuation and token.value == '(':
                    in_columns = True
                    continue
                elif token.ttype is Punctuation and token.value == ')':
                    if current_column:
                        column = self._parse_column_definition(current_column)
                        if column:
                            columns.append(column)
                    break

                if in_columns:
                    if token.ttype is Punctuation and token.value == ',':
                        if current_column:
                            column = self._parse_column_definition(current_column)
                            if column:
                                columns.append(column)
                            current_column = []
                    else:
                        current_column.append(token)

        except Exception as e:
            logger.error(f"Error extracting columns: {e}")

        return columns

    def extract_foreign_keys(self, create_stmt: Statement) -> List[ForeignKeyEntity]:
        """
        Find foreign key relationships in CREATE TABLE statement.

        Args:
            create_stmt: CREATE TABLE statement

        Returns:
            List of ForeignKeyEntity objects
        """
        foreign_keys = []

        try:
            stmt_str = str(create_stmt)

            # Pattern: FOREIGN KEY (column) REFERENCES table(column)
            fk_pattern = r'FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\w+)\s*\(([^)]+)\)'
            fk_matches = re.finditer(fk_pattern, stmt_str, re.IGNORECASE)

            for match in fk_matches:
                column = match.group(1).strip()
                ref_table = match.group(2).strip()
                ref_column = match.group(3).strip()

                # Extract ON DELETE/UPDATE if present
                on_delete = None
                on_update = None

                # Look for ON DELETE
                delete_pattern = r'ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)'
                delete_match = re.search(delete_pattern, stmt_str[match.end():], re.IGNORECASE)
                if delete_match:
                    on_delete = delete_match.group(1)

                # Look for ON UPDATE
                update_pattern = r'ON\s+UPDATE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)'
                update_match = re.search(update_pattern, stmt_str[match.end():], re.IGNORECASE)
                if update_match:
                    on_update = update_match.group(1)

                foreign_keys.append(ForeignKeyEntity(
                    name=None,  # Usually not named in constraint
                    column=column,
                    referenced_table=ref_table,
                    referenced_column=ref_column,
                    on_delete=on_delete,
                    on_update=on_update
                ))

        except Exception as e:
            logger.error(f"Error extracting foreign keys: {e}")

        return foreign_keys

    def extract_indexes(self, create_stmt: Statement) -> List[IndexEntity]:
        """
        Find index definitions in CREATE TABLE statement.

        Args:
            create_stmt: CREATE TABLE statement

        Returns:
            List of IndexEntity objects
        """
        indexes = []

        try:
            stmt_str = str(create_stmt)

            # Pattern: INDEX index_name (columns)
            index_pattern = r'(UNIQUE\s+)?INDEX\s+(\w+)\s*\(([^)]+)\)'
            index_matches = re.finditer(index_pattern, stmt_str, re.IGNORECASE)

            for match in index_matches:
                is_unique = match.group(1) is not None
                name = match.group(2).strip()
                columns_str = match.group(3).strip()
                columns = [col.strip() for col in columns_str.split(',')]

                indexes.append(IndexEntity(
                    name=name,
                    columns=columns,
                    is_unique=is_unique
                ))

            # Also check for UNIQUE constraints
            unique_pattern = r'UNIQUE\s*\(([^)]+)\)'
            unique_matches = re.finditer(unique_pattern, stmt_str, re.IGNORECASE)

            for i, match in enumerate(unique_matches):
                columns_str = match.group(1).strip()
                columns = [col.strip() for col in columns_str.split(',')]

                indexes.append(IndexEntity(
                    name=f"unique_constraint_{i}",
                    columns=columns,
                    is_unique=True
                ))

        except Exception as e:
            logger.error(f"Error extracting indexes: {e}")

        return indexes

    def _parse_create_table(self, statement: Statement) -> Optional[TableEntity]:
        """Parse CREATE TABLE statement into TableEntity."""
        try:
            stmt_str = str(statement)

            # Extract table name
            table_pattern = r'CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:(\w+)\.)?(\w+)'
            match = re.search(table_pattern, stmt_str, re.IGNORECASE)

            if not match:
                return None

            schema = match.group(1)
            table_name = match.group(2)

            # Extract components
            columns = self.extract_columns(statement)
            foreign_keys = self.extract_foreign_keys(statement)
            indexes = self.extract_indexes(statement)

            # Extract primary keys
            primary_keys = [col.name for col in columns if col.primary_key]

            # Also check for table-level PRIMARY KEY constraint
            pk_pattern = r'PRIMARY\s+KEY\s*\(([^)]+)\)'
            pk_match = re.search(pk_pattern, stmt_str, re.IGNORECASE)
            if pk_match:
                pk_columns = [col.strip() for col in pk_match.group(1).split(',')]
                primary_keys.extend([pk for pk in pk_columns if pk not in primary_keys])

            return TableEntity(
                name=table_name,
                schema=schema,
                columns=columns,
                primary_keys=primary_keys,
                foreign_keys=foreign_keys,
                indexes=indexes
            )

        except Exception as e:
            logger.error(f"Error parsing CREATE TABLE: {e}")
            return None

    def _parse_column_definition(self, tokens: List[Token]) -> Optional[ColumnEntity]:
        """Parse column definition tokens into ColumnEntity."""
        try:
            if not tokens:
                return None

            # Skip if this is a constraint, not a column
            first_token = str(tokens[0]).upper()
            if first_token in ['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'INDEX']:
                return None

            # Get column name (first token)
            col_name = str(tokens[0]).strip()

            # Get data type (second token, possibly with size)
            col_type = str(tokens[1]).strip() if len(tokens) > 1 else 'TEXT'

            # Check for size specification
            if len(tokens) > 2 and str(tokens[2]).strip() == '(':
                size_parts = []
                for i in range(3, len(tokens)):
                    if str(tokens[i]).strip() == ')':
                        break
                    size_parts.append(str(tokens[i]).strip())
                col_type += '(' + ''.join(size_parts) + ')'

            # Parse constraints
            tokens_str = ' '.join(str(t) for t in tokens).upper()

            nullable = 'NOT NULL' not in tokens_str
            primary_key = 'PRIMARY KEY' in tokens_str
            unique = 'UNIQUE' in tokens_str
            auto_increment = any(kw in tokens_str for kw in ['AUTOINCREMENT', 'AUTO_INCREMENT', 'SERIAL'])

            # Extract default value
            default = None
            default_match = re.search(r'DEFAULT\s+([^\s,]+)', tokens_str)
            if default_match:
                default = default_match.group(1)

            return ColumnEntity(
                name=col_name,
                data_type=col_type,
                nullable=nullable,
                default=default,
                primary_key=primary_key,
                unique=unique,
                auto_increment=auto_increment
            )

        except Exception as e:
            logger.error(f"Error parsing column definition: {e}")
            return None

    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a SQL file and return comprehensive metadata.

        Args:
            file_path: Path to the SQL file

        Returns:
            Dictionary with tables, relationships, and metrics
        """
        result = {
            'file': file_path,
            'tables': [],
            'metrics': {
                'total_tables': 0,
                'total_columns': 0,
                'total_foreign_keys': 0,
                'total_indexes': 0
            },
            'confidence': self.confidence
        }

        try:
            statements = self.parse_file(file_path)
            if not statements:
                result['confidence'] = 0.0
                return result

            # Extract tables
            tables = self.extract_tables(statements)

            # Convert to dict format
            result['tables'] = []
            for table in tables:
                table_dict = {
                    'name': table.name,
                    'schema': table.schema,
                    'columns': [vars(col) for col in table.columns],
                    'primary_keys': table.primary_keys,
                    'foreign_keys': [vars(fk) for fk in table.foreign_keys],
                    'indexes': [vars(idx) for idx in table.indexes]
                }
                result['tables'].append(table_dict)

                # Update metrics
                result['metrics']['total_columns'] += len(table.columns)
                result['metrics']['total_foreign_keys'] += len(table.foreign_keys)
                result['metrics']['total_indexes'] += len(table.indexes)

            result['metrics']['total_tables'] = len(tables)

        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {e}")
            result['error'] = str(e)
            result['confidence'] = 0.5

        return result
