"""Alembic migration parser for building database schema from migrations."""
import ast
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import logging
import re

logger = logging.getLogger(__name__)


class MigrationOperation:
    """Represents an Alembic migration operation."""

    def __init__(
        self,
        operation_type: str,
        table_name: Optional[str] = None,
        column_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        revision: Optional[str] = None
    ):
        self.operation_type = operation_type
        self.table_name = table_name
        self.column_name = column_name
        self.details = details or {}
        self.revision = revision


class AlembicParser:
    """Parser for Alembic migration files."""

    def __init__(self):
        self.confidence = 0.85
        self.parser_type = "AST"

    def parse(self, content: str) -> Dict[str, Any]:
        """Parse Alembic migration source string — implements CodeParser protocol.

        Args:
            content: Python source code as a string

        Returns:
            Dict with 'operations' key containing extracted migration operations
        """
        try:
            tree = ast.parse(content)
            operations = self.extract_operations(tree)
            return {"operations": [op.__dict__ for op in operations]}
        except Exception as e:
            logger.error(f"Error parsing Alembic content: {e}")
            return {"operations": []}

    def parse_migration(self, file_path: str) -> Dict[str, Any]:
        """
        Parse an Alembic migration Python file.

        Args:
            file_path: Path to the migration file

        Returns:
            Dictionary with migration metadata and operations
        """
        result = {
            'file': file_path,
            'revision': None,
            'down_revision': None,
            'branch_labels': None,
            'depends_on': None,
            'operations': [],
            'confidence': self.confidence
        }

        try:
            path = Path(file_path)
            if not path.exists():
                logger.error(f"File not found: {file_path}")
                result['confidence'] = 0.0
                return result

            with open(path, 'r', encoding='utf-8') as f:
                source = f.read()

            # Parse the file
            tree = ast.parse(source, filename=str(path))

            # Extract revision metadata
            metadata = self._extract_metadata(source)
            result.update(metadata)

            # Extract operations from upgrade() function
            operations = self.extract_operations(tree)
            result['operations'] = [vars(op) for op in operations]

            # Set revision for operations
            for op in operations:
                op.revision = result['revision']

        except Exception as e:
            logger.error(f"Error parsing migration {file_path}: {e}")
            result['error'] = str(e)
            result['confidence'] = 0.5

        return result

    def extract_operations(self, ast_tree: ast.AST) -> List[MigrationOperation]:
        """
        Find Alembic operations in the AST (op.create_table, op.add_column, etc.).

        Args:
            ast_tree: Parsed AST tree

        Returns:
            List of MigrationOperation objects
        """
        operations = []

        try:
            # Find the upgrade() function
            for node in ast.walk(ast_tree):
                if isinstance(node, ast.FunctionDef) and node.name == 'upgrade':
                    # Look for op.* calls in the function body
                    for stmt in ast.walk(node):
                        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
                            operation = self._parse_operation_call(stmt.value)
                            if operation:
                                operations.append(operation)

        except Exception as e:
            logger.error(f"Error extracting operations: {e}")

        return operations

    def build_schema_from_migrations(self, migration_files: List[str]) -> Dict[str, Any]:
        """
        Build cumulative schema by applying migrations in order.

        Args:
            migration_files: List of migration file paths in order

        Returns:
            Dictionary representing the final schema state
        """
        schema = {
            'tables': {},
            'operations_applied': 0,
            'confidence': self.confidence
        }

        try:
            # Sort migrations by revision order
            migrations = []
            for file_path in migration_files:
                migration_data = self.parse_migration(file_path)
                migrations.append(migration_data)

            # Apply operations in order
            for migration in migrations:
                for op_dict in migration.get('operations', []):
                    op = MigrationOperation(**op_dict)
                    self._apply_operation(schema['tables'], op)
                    schema['operations_applied'] += 1

        except Exception as e:
            logger.error(f"Error building schema: {e}")
            schema['error'] = str(e)
            schema['confidence'] = 0.5

        return schema

    def _extract_metadata(self, source: str) -> Dict[str, Any]:
        """Extract migration metadata from source code."""
        metadata = {
            'revision': None,
            'down_revision': None,
            'branch_labels': None,
            'depends_on': None
        }

        try:
            # Extract revision
            revision_match = re.search(r'revision\s*=\s*[\'"]([^\'"]+)[\'"]', source)
            if revision_match:
                metadata['revision'] = revision_match.group(1)

            # Extract down_revision
            down_match = re.search(r'down_revision\s*=\s*[\'"]([^\'"]+)[\'"]', source)
            if down_match:
                metadata['down_revision'] = down_match.group(1)

            # Extract branch_labels
            branch_match = re.search(r'branch_labels\s*=\s*([^\n]+)', source)
            if branch_match:
                metadata['branch_labels'] = branch_match.group(1).strip()

            # Extract depends_on
            depends_match = re.search(r'depends_on\s*=\s*([^\n]+)', source)
            if depends_match:
                metadata['depends_on'] = depends_match.group(1).strip()

        except Exception as e:
            logger.error(f"Error extracting metadata: {e}")

        return metadata

    def _parse_operation_call(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse an op.* call into a MigrationOperation."""
        try:
            # Check if it's an op.* call
            if not isinstance(call_node.func, ast.Attribute):
                return None

            if not isinstance(call_node.func.value, ast.Name):
                return None

            if call_node.func.value.id != 'op':
                return None

            operation_name = call_node.func.attr

            # Parse based on operation type
            if operation_name == 'create_table':
                return self._parse_create_table(call_node)
            elif operation_name == 'drop_table':
                return self._parse_drop_table(call_node)
            elif operation_name == 'add_column':
                return self._parse_add_column(call_node)
            elif operation_name == 'drop_column':
                return self._parse_drop_column(call_node)
            elif operation_name == 'alter_column':
                return self._parse_alter_column(call_node)
            elif operation_name == 'create_index':
                return self._parse_create_index(call_node)
            elif operation_name == 'drop_index':
                return self._parse_drop_index(call_node)
            elif operation_name == 'create_foreign_key':
                return self._parse_create_foreign_key(call_node)
            else:
                # Generic operation
                return MigrationOperation(
                    operation_type=operation_name,
                    details={'raw_call': ast.unparse(call_node) if hasattr(ast, 'unparse') else str(call_node)}
                )

        except Exception as e:
            logger.error(f"Error parsing operation call: {e}")
            return None

    def _parse_create_table(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.create_table() call."""
        try:
            # First argument is table name
            if not call_node.args:
                return None

            table_name = self._get_string_value(call_node.args[0])

            # Subsequent arguments are columns
            columns = []
            for arg in call_node.args[1:]:
                if isinstance(arg, ast.Call):
                    column_info = self._parse_column_call(arg)
                    if column_info:
                        columns.append(column_info)

            return MigrationOperation(
                operation_type='create_table',
                table_name=table_name,
                details={'columns': columns}
            )

        except Exception as e:
            logger.error(f"Error parsing create_table: {e}")
            return None

    def _parse_drop_table(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.drop_table() call."""
        if not call_node.args:
            return None

        table_name = self._get_string_value(call_node.args[0])
        return MigrationOperation(
            operation_type='drop_table',
            table_name=table_name
        )

    def _parse_add_column(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.add_column() call."""
        try:
            if len(call_node.args) < 2:
                return None

            table_name = self._get_string_value(call_node.args[0])
            column_info = self._parse_column_call(call_node.args[1])

            return MigrationOperation(
                operation_type='add_column',
                table_name=table_name,
                column_name=column_info.get('name'),
                details=column_info
            )

        except Exception as e:
            logger.error(f"Error parsing add_column: {e}")
            return None

    def _parse_drop_column(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.drop_column() call."""
        if len(call_node.args) < 2:
            return None

        table_name = self._get_string_value(call_node.args[0])
        column_name = self._get_string_value(call_node.args[1])

        return MigrationOperation(
            operation_type='drop_column',
            table_name=table_name,
            column_name=column_name
        )

    def _parse_alter_column(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.alter_column() call."""
        if not call_node.args:
            return None

        table_name = self._get_string_value(call_node.args[0])

        # Extract keyword arguments for column details
        details = {}
        for keyword in call_node.keywords:
            details[keyword.arg] = self._get_value(keyword.value)

        column_name = details.get('column_name')

        return MigrationOperation(
            operation_type='alter_column',
            table_name=table_name,
            column_name=column_name,
            details=details
        )

    def _parse_create_index(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.create_index() call."""
        if not call_node.args:
            return None

        index_name = self._get_string_value(call_node.args[0])
        table_name = self._get_string_value(call_node.args[1]) if len(call_node.args) > 1 else None

        # Extract columns from third argument (list)
        columns = []
        if len(call_node.args) > 2 and isinstance(call_node.args[2], ast.List):
            columns = [self._get_string_value(elt) for elt in call_node.args[2].elts]

        return MigrationOperation(
            operation_type='create_index',
            table_name=table_name,
            details={'index_name': index_name, 'columns': columns}
        )

    def _parse_drop_index(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.drop_index() call."""
        if not call_node.args:
            return None

        index_name = self._get_string_value(call_node.args[0])
        table_name = self._get_string_value(call_node.args[1]) if len(call_node.args) > 1 else None

        return MigrationOperation(
            operation_type='drop_index',
            table_name=table_name,
            details={'index_name': index_name}
        )

    def _parse_create_foreign_key(self, call_node: ast.Call) -> Optional[MigrationOperation]:
        """Parse op.create_foreign_key() call."""
        # Extract details from keyword arguments
        details = {}
        for keyword in call_node.keywords:
            details[keyword.arg] = self._get_value(keyword.value)

        return MigrationOperation(
            operation_type='create_foreign_key',
            table_name=details.get('source_table'),
            details=details
        )

    def _parse_column_call(self, call_node: ast.Call) -> Dict[str, Any]:
        """Parse sa.Column() call."""
        column_info = {}

        try:
            # First argument is column name
            if call_node.args:
                column_info['name'] = self._get_string_value(call_node.args[0])

            # Second argument is typically the type
            if len(call_node.args) > 1:
                type_node = call_node.args[1]
                if isinstance(type_node, ast.Call) and isinstance(type_node.func, ast.Attribute):
                    column_info['type'] = type_node.func.attr
                elif isinstance(type_node, ast.Name):
                    column_info['type'] = type_node.id

            # Extract keyword arguments
            for keyword in call_node.keywords:
                column_info[keyword.arg] = self._get_value(keyword.value)

        except Exception as e:
            logger.error(f"Error parsing column call: {e}")

        return column_info

    def _get_string_value(self, node: ast.AST) -> Optional[str]:
        """Extract string value from AST node."""
        if isinstance(node, ast.Constant):
            return str(node.value)
        elif isinstance(node, ast.Str):  # Python < 3.8
            return node.s
        return None

    def _get_value(self, node: ast.AST) -> Any:
        """Extract value from AST node."""
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, (ast.Str, ast.Num, ast.NameConstant)):
            return node.value if hasattr(node, 'value') else None
        elif isinstance(node, ast.List):
            return [self._get_value(elt) for elt in node.elts]
        elif isinstance(node, ast.Name):
            return node.id
        return None

    def _apply_operation(self, tables: Dict[str, Any], operation: MigrationOperation):
        """Apply a migration operation to the schema."""
        try:
            if operation.operation_type == 'create_table':
                tables[operation.table_name] = {
                    'name': operation.table_name,
                    'columns': operation.details.get('columns', []),
                    'indexes': [],
                    'foreign_keys': []
                }

            elif operation.operation_type == 'drop_table':
                if operation.table_name in tables:
                    del tables[operation.table_name]

            elif operation.operation_type == 'add_column':
                if operation.table_name in tables:
                    tables[operation.table_name]['columns'].append(operation.details)

            elif operation.operation_type == 'drop_column':
                if operation.table_name in tables:
                    columns = tables[operation.table_name]['columns']
                    tables[operation.table_name]['columns'] = [
                        col for col in columns
                        if col.get('name') != operation.column_name
                    ]

            elif operation.operation_type == 'create_index':
                if operation.table_name in tables:
                    tables[operation.table_name]['indexes'].append(operation.details)

            elif operation.operation_type == 'create_foreign_key':
                if operation.table_name in tables:
                    tables[operation.table_name]['foreign_keys'].append(operation.details)

        except Exception as e:
            logger.error(f"Error applying operation: {e}")
