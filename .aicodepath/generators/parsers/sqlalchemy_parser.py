"""SQLAlchemy ORM model parser."""
import ast
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class RelationshipEntity:
    """Represents a SQLAlchemy relationship."""

    def __init__(
        self,
        name: str,
        target_class: str,
        cardinality: str,
        back_populates: Optional[str] = None,
        foreign_key: Optional[str] = None,
        cascade: Optional[str] = None
    ):
        self.name = name
        self.target_class = target_class
        self.cardinality = cardinality  # one-to-one, one-to-many, many-to-one, many-to-many
        self.back_populates = back_populates
        self.foreign_key = foreign_key
        self.cascade = cascade


class ColumnEntity:
    """Represents a SQLAlchemy Column."""

    def __init__(
        self,
        name: str,
        column_type: str,
        primary_key: bool = False,
        nullable: bool = True,
        unique: bool = False,
        index: bool = False,
        default: Optional[str] = None,
        foreign_key: Optional[str] = None
    ):
        self.name = name
        self.column_type = column_type
        self.primary_key = primary_key
        self.nullable = nullable
        self.unique = unique
        self.index = index
        self.default = default
        self.foreign_key = foreign_key


class TableEntity:
    """Represents a SQLAlchemy model/table."""

    def __init__(
        self,
        class_name: str,
        table_name: str,
        columns: List[ColumnEntity] = None,
        relationships: List[RelationshipEntity] = None,
        base_class: Optional[str] = None,
        mixins: List[str] = None
    ):
        self.class_name = class_name
        self.table_name = table_name
        self.columns = columns or []
        self.relationships = relationships or []
        self.base_class = base_class
        self.mixins = mixins or []


class SQLAlchemyParser:
    """Parser for SQLAlchemy ORM models."""

    def __init__(self):
        self.confidence = 0.88
        self.parser_type = "AST"

    def parse(self, content: str) -> Dict[str, Any]:
        """Parse SQLAlchemy model source string — implements CodeParser protocol.

        Args:
            content: Python source code as a string

        Returns:
            Dict with 'models' key containing extracted table entities
        """
        try:
            tree = ast.parse(content)
            tables = self.extract_tables(tree)
            return {"models": [t.__dict__ for t in tables]}
        except Exception as e:
            logger.error(f"Error parsing SQLAlchemy content: {e}")
            return {"models": []}

    def parse_model_file(self, file_path: str) -> Optional[ast.AST]:
        """
        Parse Python file containing SQLAlchemy models.

        Args:
            file_path: Path to the Python file

        Returns:
            AST tree or None if parsing fails
        """
        try:
            path = Path(file_path)
            if not path.exists():
                logger.error(f"File not found: {file_path}")
                return None

            with open(path, 'r', encoding='utf-8') as f:
                source = f.read()

            tree = ast.parse(source, filename=str(path))
            return tree

        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return None

    def extract_tables(self, ast_tree: ast.AST) -> List[TableEntity]:
        """
        Find classes with __tablename__ attribute.

        Args:
            ast_tree: Parsed AST tree

        Returns:
            List of TableEntity objects
        """
        tables = []

        try:
            for node in ast.walk(ast_tree):
                if isinstance(node, ast.ClassDef):
                    # Check if it has __tablename__
                    table_name = self._get_tablename(node)
                    if table_name:
                        table = self._parse_model_class(node, table_name)
                        if table:
                            tables.append(table)

        except Exception as e:
            logger.error(f"Error extracting tables: {e}")

        return tables

    def extract_columns(self, class_node: ast.ClassDef) -> List[ColumnEntity]:
        """
        Extract Column() definitions from class.

        Args:
            class_node: Class definition node

        Returns:
            List of ColumnEntity objects
        """
        columns = []

        try:
            for item in class_node.body:
                if isinstance(item, ast.Assign):
                    # Check if it's a Column() assignment
                    if isinstance(item.value, ast.Call):
                        column = self._parse_column_assignment(item)
                        if column:
                            columns.append(column)

        except Exception as e:
            logger.error(f"Error extracting columns: {e}")

        return columns

    def extract_relationships(self, class_node: ast.ClassDef) -> List[RelationshipEntity]:
        """
        Extract relationship() calls from class.

        Args:
            class_node: Class definition node

        Returns:
            List of RelationshipEntity objects
        """
        relationships = []

        try:
            for item in class_node.body:
                if isinstance(item, ast.Assign):
                    # Check if it's a relationship() assignment
                    if isinstance(item.value, ast.Call):
                        relationship = self._parse_relationship_assignment(item)
                        if relationship:
                            relationships.append(relationship)

        except Exception as e:
            logger.error(f"Error extracting relationships: {e}")

        return relationships

    def infer_cardinality(self, relationship_node: ast.Call) -> str:
        """
        Determine relationship cardinality from relationship() call.

        Cardinality inference rules:
        - one-to-many: uselist=True (default), no secondary table
        - many-to-one: uselist=False explicitly set, or foreign key on current side
        - one-to-one: uselist=False
        - many-to-many: secondary table is specified

        Args:
            relationship_node: relationship() call node

        Returns:
            Cardinality string
        """
        cardinality = 'one-to-many'  # Default

        try:
            # Check for secondary (many-to-many)
            has_secondary = False
            uselist_value = None

            for keyword in relationship_node.keywords:
                if keyword.arg == 'secondary':
                    has_secondary = True
                elif keyword.arg == 'uselist':
                    if isinstance(keyword.value, ast.Constant):
                        uselist_value = keyword.value.value
                    elif isinstance(keyword.value, ast.NameConstant):  # Python < 3.8
                        uselist_value = keyword.value.value

            if has_secondary:
                cardinality = 'many-to-many'
            elif uselist_value is False:
                cardinality = 'one-to-one'
            # Could be many-to-one if foreign key is on this side, but we'd need more context

        except Exception as e:
            logger.error(f"Error inferring cardinality: {e}")

        return cardinality

    def _get_tablename(self, class_node: ast.ClassDef) -> Optional[str]:
        """Get __tablename__ value from class."""
        for item in class_node.body:
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name) and target.id == '__tablename__':
                        if isinstance(item.value, ast.Constant):
                            return item.value.value
                        elif isinstance(item.value, ast.Str):  # Python < 3.8
                            return item.value.s
        return None

    def _parse_model_class(self, class_node: ast.ClassDef, table_name: str) -> Optional[TableEntity]:
        """Parse a SQLAlchemy model class."""
        try:
            class_name = class_node.name

            # Extract base class
            base_class = None
            mixins = []
            for base in class_node.bases:
                if isinstance(base, ast.Name):
                    base_name = base.id
                    if base_name in ['Base', 'DeclarativeBase', 'AbstractConcreteBase']:
                        base_class = base_name
                    else:
                        mixins.append(base_name)

            # Extract columns and relationships
            columns = self.extract_columns(class_node)
            relationships = self.extract_relationships(class_node)

            return TableEntity(
                class_name=class_name,
                table_name=table_name,
                columns=columns,
                relationships=relationships,
                base_class=base_class,
                mixins=mixins
            )

        except Exception as e:
            logger.error(f"Error parsing model class: {e}")
            return None

    def _parse_column_assignment(self, assign_node: ast.Assign) -> Optional[ColumnEntity]:
        """Parse a Column() assignment."""
        try:
            call_node = assign_node.value

            # Check if it's a Column() call
            if not self._is_column_call(call_node):
                return None

            # Get column name from assignment target
            column_name = None
            if assign_node.targets:
                target = assign_node.targets[0]
                if isinstance(target, ast.Name):
                    column_name = target.id

            if not column_name:
                return None

            # Extract column type from first argument
            column_type = 'String'  # Default
            if call_node.args:
                type_arg = call_node.args[0]
                if isinstance(type_arg, ast.Call) and isinstance(type_arg.func, ast.Name):
                    column_type = type_arg.func.id
                elif isinstance(type_arg, ast.Name):
                    column_type = type_arg.id

            # Extract keyword arguments
            primary_key = False
            nullable = True
            unique = False
            index = False
            default = None
            foreign_key = None

            for keyword in call_node.keywords:
                if keyword.arg == 'primary_key':
                    primary_key = self._get_bool_value(keyword.value)
                elif keyword.arg == 'nullable':
                    nullable = self._get_bool_value(keyword.value)
                elif keyword.arg == 'unique':
                    unique = self._get_bool_value(keyword.value)
                elif keyword.arg == 'index':
                    index = self._get_bool_value(keyword.value)
                elif keyword.arg == 'default':
                    default = self._get_value(keyword.value)

            # Check for ForeignKey in arguments
            for arg in call_node.args:
                if isinstance(arg, ast.Call) and self._is_foreign_key_call(arg):
                    foreign_key = self._get_foreign_key_target(arg)

            return ColumnEntity(
                name=column_name,
                column_type=column_type,
                primary_key=primary_key,
                nullable=nullable,
                unique=unique,
                index=index,
                default=default,
                foreign_key=foreign_key
            )

        except Exception as e:
            logger.error(f"Error parsing column assignment: {e}")
            return None

    def _parse_relationship_assignment(self, assign_node: ast.Assign) -> Optional[RelationshipEntity]:
        """Parse a relationship() assignment."""
        try:
            call_node = assign_node.value

            # Check if it's a relationship() call
            if not self._is_relationship_call(call_node):
                return None

            # Get relationship name from assignment target
            rel_name = None
            if assign_node.targets:
                target = assign_node.targets[0]
                if isinstance(target, ast.Name):
                    rel_name = target.id

            if not rel_name:
                return None

            # Extract target class from first argument
            target_class = None
            if call_node.args:
                if isinstance(call_node.args[0], ast.Constant):
                    target_class = call_node.args[0].value
                elif isinstance(call_node.args[0], ast.Str):  # Python < 3.8
                    target_class = call_node.args[0].s
                elif isinstance(call_node.args[0], ast.Name):
                    target_class = call_node.args[0].id

            # Extract keyword arguments
            back_populates = None
            foreign_key = None
            cascade = None

            for keyword in call_node.keywords:
                if keyword.arg == 'back_populates':
                    back_populates = self._get_string_value(keyword.value)
                elif keyword.arg == 'backref':
                    back_populates = self._get_string_value(keyword.value)
                elif keyword.arg == 'foreign_keys':
                    foreign_key = str(self._get_value(keyword.value))
                elif keyword.arg == 'cascade':
                    cascade = self._get_string_value(keyword.value)

            # Infer cardinality
            cardinality = self.infer_cardinality(call_node)

            return RelationshipEntity(
                name=rel_name,
                target_class=target_class or 'Unknown',
                cardinality=cardinality,
                back_populates=back_populates,
                foreign_key=foreign_key,
                cascade=cascade
            )

        except Exception as e:
            logger.error(f"Error parsing relationship assignment: {e}")
            return None

    def _is_column_call(self, node: ast.Call) -> bool:
        """Check if node is a Column() call."""
        if isinstance(node.func, ast.Name):
            return node.func.id == 'Column'
        elif isinstance(node.func, ast.Attribute):
            return node.func.attr == 'Column'
        return False

    def _is_relationship_call(self, node: ast.Call) -> bool:
        """Check if node is a relationship() call."""
        if isinstance(node.func, ast.Name):
            return node.func.id == 'relationship'
        elif isinstance(node.func, ast.Attribute):
            return node.func.attr == 'relationship'
        return False

    def _is_foreign_key_call(self, node: ast.Call) -> bool:
        """Check if node is a ForeignKey() call."""
        if isinstance(node.func, ast.Name):
            return node.func.id == 'ForeignKey'
        elif isinstance(node.func, ast.Attribute):
            return node.func.attr == 'ForeignKey'
        return False

    def _get_foreign_key_target(self, fk_node: ast.Call) -> Optional[str]:
        """Extract foreign key target from ForeignKey() call."""
        if fk_node.args:
            return self._get_string_value(fk_node.args[0])
        return None

    def _get_bool_value(self, node: ast.AST) -> bool:
        """Extract boolean value from AST node."""
        if isinstance(node, ast.Constant):
            return bool(node.value)
        elif isinstance(node, ast.NameConstant):  # Python < 3.8
            return bool(node.value)
        return False

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
        elif isinstance(node, ast.Name):
            return node.id
        return None

    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a SQLAlchemy model file and return comprehensive metadata.

        Args:
            file_path: Path to the Python file with SQLAlchemy models

        Returns:
            Dictionary with tables, relationships, and metrics
        """
        result = {
            'file': file_path,
            'tables': [],
            'metrics': {
                'total_tables': 0,
                'total_columns': 0,
                'total_relationships': 0
            },
            'confidence': self.confidence
        }

        try:
            tree = self.parse_model_file(file_path)
            if not tree:
                result['confidence'] = 0.0
                return result

            # Extract tables
            tables = self.extract_tables(tree)

            # Convert to dict format
            result['tables'] = []
            for table in tables:
                table_dict = {
                    'class_name': table.class_name,
                    'table_name': table.table_name,
                    'base_class': table.base_class,
                    'mixins': table.mixins,
                    'columns': [vars(col) for col in table.columns],
                    'relationships': [vars(rel) for rel in table.relationships]
                }
                result['tables'].append(table_dict)

                # Update metrics
                result['metrics']['total_columns'] += len(table.columns)
                result['metrics']['total_relationships'] += len(table.relationships)

            result['metrics']['total_tables'] = len(tables)

        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {e}")
            result['error'] = str(e)
            result['confidence'] = 0.5

        return result
