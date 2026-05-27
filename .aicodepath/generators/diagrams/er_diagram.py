"""ER Diagram Generator - Generates entity-relationship diagrams from database models."""
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple
import logging

from ..core.base_generator import BaseGenerator, DiagramOutput
from ..parsers.python_parser import PythonParser

logger = logging.getLogger(__name__)


class Entity:
    """Represents a database entity/table."""

    def __init__(self, name: str):
        self.name = name
        self.attributes: List[Dict[str, str]] = []
        self.relationships: List[Dict[str, Any]] = []

    def add_attribute(self, name: str, data_type: str, constraints: str = ""):
        """Add an attribute to the entity."""
        self.attributes.append({
            'name': name,
            'type': data_type,
            'constraints': constraints
        })

    def add_relationship(self, target_entity: str, cardinality: str, relationship_type: str = ""):
        """Add a relationship to another entity."""
        self.relationships.append({
            'target': target_entity,
            'cardinality': cardinality,
            'type': relationship_type
        })


class ERDiagramGenerator(BaseGenerator):
    """Generator for Entity-Relationship diagrams.

    Supports:
    - SQLAlchemy models (Python)
    - SQL CREATE statements
    - Alembic migrations

    Target confidence: 90-95%
    """

    def __init__(self):
        super().__init__()
        self.entities: Dict[str, Entity] = {}
        self.python_parser = PythonParser()

    @property
    def diagram_type(self) -> str:
        """Return the type of diagram this generator produces."""
        return "erd"

    @property
    def supported_extensions(self) -> List[str]:
        """Return list of file extensions this generator supports."""
        return ['.py', '.sql', '.alembic']

    def generate(self, source_files: List[str], options: Optional[Dict[str, Any]] = None) -> DiagramOutput:
        """Generate an ER diagram from source files.

        Args:
            source_files: List of file paths to analyze (Python models, SQL files, migrations)
            options: Optional generation options:
                - include_migrations: bool - Process Alembic migration files
                - show_indexes: bool - Show index constraints in diagram
                - show_foreign_keys: bool - Show FK constraints explicitly

        Returns:
            DiagramOutput: Generated ER diagram in Mermaid format
        """
        options = options or {}
        self._clear_warnings()
        self.entities.clear()

        # Analyze all source files
        analyzed_files = self.analyze_files(source_files)

        # Early return if any errors were captured (e.g. corrupt/data-only dump)
        if self._get_errors():
            return DiagramOutput(
                mermaid_code="erDiagram\n    %% Generation failed — see errors",
                confidence_score=0.0,
                metadata={'entities': 0, 'relationships': 0},
                warnings=self._get_warnings(),
                errors=self._get_errors(),
                source_files=source_files
            )

        if not analyzed_files:
            self._add_warning("No valid source files found")
            return DiagramOutput(
                mermaid_code="erDiagram\n    %% No entities found",
                confidence_score=0.0,
                metadata={'entities': 0, 'relationships': 0},
                warnings=self._get_warnings(),
                errors=[],
                source_files=source_files
            )

        # Parse files based on type
        parser_types_used = set()

        for analyzed_file in analyzed_files:
            file_path = analyzed_file.path

            if file_path.endswith('.py'):
                # Check if it's a SQLAlchemy model or Alembic migration
                if 'migration' in file_path.lower() or 'alembic' in file_path.lower():
                    if options.get('include_migrations', True):
                        self._parse_alembic_migration(analyzed_file.content)
                        parser_types_used.add('AST')
                else:
                    self._parse_sqlalchemy_model(analyzed_file)
                    parser_types_used.add('AST')

            elif file_path.endswith('.sql'):
                lang = analyzed_file.language  # 'sql' | 'pgdump' | 'mysqldump' | 'sqlite_dump'
                if lang == 'sql':
                    self._parse_sql_schema(analyzed_file.content)
                else:
                    self._parse_dump_output(analyzed_file)
                parser_types_used.add('regex')

        # Calculate confidence
        total_files = len(analyzed_files)
        code_coverage = len([f for f in analyzed_files if f.parsed_data]) / max(total_files, 1)

        # Relationship accuracy based on detected foreign keys
        relationship_accuracy = self._calculate_relationship_accuracy()

        confidence = self.calculate_confidence(
            parser_types=list(parser_types_used),
            code_coverage=code_coverage,
            relationship_accuracy=relationship_accuracy
        )

        # Generate Mermaid diagram
        mermaid_code = self._build_mermaid(options)

        return DiagramOutput(
            mermaid_code=mermaid_code,
            confidence_score=confidence,
            metadata={
                'entities': len(self.entities),
                'relationships': sum(len(e.relationships) for e in self.entities.values()),
                'parser_types': list(parser_types_used)
            },
            warnings=self._get_warnings(),
            errors=self._get_errors(),
            source_files=source_files
        )

    def _parse_sqlalchemy_model(self, analyzed_file) -> None:
        """Parse SQLAlchemy model using PythonParser."""
        if not analyzed_file.parsed_data:
            self._add_warning(f"Could not parse Python file: {analyzed_file.path}")
            return

        content = analyzed_file.content

        # Look for SQLAlchemy model classes
        model_pattern = re.compile(r'class\s+(\w+)\s*\([^)]*Base[^)]*\):', re.MULTILINE)

        for match in model_pattern.finditer(content):
            entity_name = match.group(1)
            entity = Entity(entity_name)

            # Extract class body
            class_start = match.end()
            class_content = self._extract_class_body(content, class_start)

            # Parse columns
            self._parse_sqlalchemy_columns(entity, class_content)

            # Parse relationships
            self._parse_sqlalchemy_relationships(entity, class_content)

            self.entities[entity_name] = entity

    def _extract_class_body(self, content: str, start_pos: int) -> str:
        """Extract the body of a class definition."""
        lines = content[start_pos:].split('\n')
        class_lines = []
        indent_level = None

        for line in lines:
            if not line.strip():
                continue

            current_indent = len(line) - len(line.lstrip())

            if indent_level is None:
                if line.strip():
                    indent_level = current_indent
                    class_lines.append(line)
            elif current_indent >= indent_level:
                class_lines.append(line)
            else:
                break

        return '\n'.join(class_lines)

    def _parse_sqlalchemy_columns(self, entity: Entity, class_content: str) -> None:
        """Parse SQLAlchemy Column definitions.

        Fixed: Handles both single-line and multi-line Column definitions.
        """
        # Find all column definitions first
        column_starts = []
        for match in re.finditer(r'(\w+)\s*=\s*Column\s*\(', class_content):
            col_name = match.group(1)
            start_pos = match.end() - 1  # Position of opening paren
            column_starts.append((col_name, start_pos))

        for col_name, start_pos in column_starts:
            # Find matching closing paren (handle nested parens)
            paren_count = 1
            pos = start_pos + 1
            while pos < len(class_content) and paren_count > 0:
                if class_content[pos] == '(':
                    paren_count += 1
                elif class_content[pos] == ')':
                    paren_count -= 1
                pos += 1

            # Extract the full Column(...) content
            column_def = class_content[start_pos + 1:pos - 1]

            # Parse type (first argument)
            type_match = re.match(r'\s*(\w+)(?:\([^)]*\))?\s*', column_def)
            if not type_match:
                continue

            col_type = type_match.group(1)
            constraints_str = column_def[type_match.end():]

            # Remove leading comma and whitespace from constraints
            constraints_str = re.sub(r'^\s*,\s*', '', constraints_str)

            # Determine constraints
            constraints = []
            if 'primary_key=True' in constraints_str or 'primary_key = True' in constraints_str:
                constraints.append('PK')
            if 'ForeignKey' in constraints_str:
                constraints.append('FK')
            if 'unique=True' in constraints_str or 'unique = True' in constraints_str:
                constraints.append('UNIQUE')
            if 'nullable=False' in constraints_str or 'nullable = False' in constraints_str or 'primary_key=True' in constraints_str or 'primary_key = True' in constraints_str:
                constraints.append('NOT NULL')

            entity.add_attribute(
                name=col_name,
                data_type=col_type.lower(),
                constraints=' '.join(constraints) if constraints else ''
            )

    def _parse_sqlalchemy_relationships(self, entity: Entity, class_content: str) -> None:
        """Parse SQLAlchemy relationship definitions."""
        # Pattern: relationship_name = relationship('TargetModel', ...)
        rel_pattern = re.compile(
            r'(\w+)\s*=\s*relationship\s*\(\s*[\'"](\w+)[\'"](?:,\s*(.+?))?(?=\n|\))',
            re.MULTILINE | re.DOTALL
        )

        for match in rel_pattern.finditer(class_content):
            rel_name = match.group(1)
            target_entity = match.group(2)
            rel_params = match.group(3) or ""

            # Infer cardinality
            cardinality = self._infer_cardinality(rel_params)

            entity.add_relationship(
                target_entity=target_entity,
                cardinality=cardinality,
                relationship_type=rel_name
            )

    def _infer_cardinality(self, rel_params: str) -> str:
        """Determine Mermaid cardinality notation from relationship parameters.

        Mermaid cardinality notation:
        - ||--o{ : one to zero or more
        - ||--|{ : one to one or more
        - }o--o{ : zero or more to zero or more
        - }|--|{ : one or more to one or more
        - ||--|| : one to one
        - }o--|| : zero or more to one
        """
        # Check for uselist parameter (indicates one-to-many or many-to-many)
        if 'uselist=False' in rel_params:
            # One-to-one or many-to-one
            if 'backref' in rel_params or 'back_populates' in rel_params:
                return '||--||'  # one to one
            return '}o--||'  # many to one

        # Check for secondary (many-to-many)
        if 'secondary=' in rel_params:
            return '}o--o{'  # many to many

        # Default: one to many
        return '||--o{'

    def _parse_sql_schema(self, sql_content: str) -> None:
        """Parse SQL CREATE TABLE statements."""
        # Pattern for CREATE TABLE
        create_table_pattern = re.compile(
            r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.*?)\);',
            re.IGNORECASE | re.DOTALL
        )

        for match in create_table_pattern.finditer(sql_content):
            table_name = match.group(1)
            table_def = match.group(2)

            entity = Entity(table_name)

            # Parse columns and constraints
            lines = [line.strip() for line in table_def.split(',')]

            for line in lines:
                if not line:
                    continue

                # Skip constraint definitions
                if line.upper().startswith(('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK', 'CONSTRAINT')):
                    # Extract foreign key relationships
                    if 'FOREIGN KEY' in line.upper():
                        fk_match = re.search(r'FOREIGN\s+KEY\s*\(\s*(\w+)\s*\)\s*REFERENCES\s+(\w+)', line, re.IGNORECASE)
                        if fk_match:
                            col_name = fk_match.group(1)
                            ref_table = fk_match.group(2)
                            entity.add_relationship(
                                target_entity=ref_table,
                                cardinality='}o--||',  # many to one
                                relationship_type=col_name
                            )
                    continue

                # Parse column definition
                parts = line.split()
                if len(parts) >= 2:
                    col_name = parts[0]
                    col_type = parts[1]

                    constraints = []
                    line_upper = line.upper()

                    if 'PRIMARY KEY' in line_upper:
                        constraints.append('PK')
                    if 'FOREIGN KEY' in line_upper or 'REFERENCES' in line_upper:
                        constraints.append('FK')
                        # Extract referenced table
                        ref_match = re.search(r'REFERENCES\s+(\w+)', line, re.IGNORECASE)
                        if ref_match:
                            ref_table = ref_match.group(1)
                            entity.add_relationship(
                                target_entity=ref_table,
                                cardinality='}o--||',
                                relationship_type=col_name
                            )
                    if 'UNIQUE' in line_upper:
                        constraints.append('UNIQUE')
                    if 'NOT NULL' in line_upper:
                        constraints.append('NOT NULL')

                    entity.add_attribute(
                        name=col_name,
                        data_type=col_type,
                        constraints=' '.join(constraints) if constraints else ''
                    )

            self.entities[table_name] = entity

    def _parse_dump_output(self, analyzed_file) -> None:
        """Map DumpParser output to self.entities.

        Args:
            analyzed_file: AnalyzedFile with parsed_data from DumpParser
        """
        if not analyzed_file.parsed_data:
            self._add_warning(f"No parsed data for dump file: {analyzed_file.path}")
            return

        parsed = analyzed_file.parsed_data

        # Build Entity objects from tables
        for table in parsed.get('tables', []):
            table_name = table.get('name', '')
            if not table_name:
                continue

            entity = Entity(table_name)

            for col in table.get('columns', []):
                col_name = col.get('name', '')
                col_type = col.get('type', 'TEXT')
                if col_name:
                    entity.add_attribute(name=col_name, data_type=col_type)

            self.entities[table_name] = entity

        # Add FK relationships
        for fk in parsed.get('foreign_keys', []):
            from_table = fk.get('from_table', '')
            to_table = fk.get('to_table', '')
            from_col = fk.get('from_column', '')
            if from_table in self.entities and to_table:
                self.entities[from_table].add_relationship(
                    target_entity=to_table,
                    cardinality='}o--||',
                    relationship_type=from_col
                )

    def _parse_alembic_migration(self, migration_content: str) -> None:
        """Parse Alembic migration files to build schema."""
        # Pattern for create_table operations
        create_pattern = re.compile(
            r'op\.create_table\s*\(\s*[\'"](\w+)[\'"]',
            re.MULTILINE
        )

        # Pattern for Column definitions in migrations
        column_pattern = re.compile(
            r'sa\.Column\s*\(\s*[\'"](\w+)[\'"]\s*,\s*sa\.(\w+)(?:\([^)]*\))?\s*(.*?)\)',
            re.MULTILINE | re.DOTALL
        )

        for table_match in create_pattern.finditer(migration_content):
            table_name = table_match.group(1)

            # Find the end of this create_table call
            start_pos = table_match.end()
            paren_count = 1
            end_pos = start_pos

            for i, char in enumerate(migration_content[start_pos:], start=start_pos):
                if char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        end_pos = i
                        break

            table_def = migration_content[start_pos:end_pos]
            entity = Entity(table_name)

            # Parse columns in this table definition
            for col_match in column_pattern.finditer(table_def):
                col_name = col_match.group(1)
                col_type = col_match.group(2)
                col_params = col_match.group(3) or ""

                constraints = []
                if 'primary_key=True' in col_params:
                    constraints.append('PK')
                if 'ForeignKey' in col_params:
                    constraints.append('FK')
                if 'unique=True' in col_params:
                    constraints.append('UNIQUE')
                if 'nullable=False' in col_params:
                    constraints.append('NOT NULL')

                entity.add_attribute(
                    name=col_name,
                    data_type=col_type.lower(),
                    constraints=' '.join(constraints) if constraints else ''
                )

            self.entities[table_name] = entity

    def _calculate_relationship_accuracy(self) -> float:
        """Calculate accuracy of relationship detection."""
        if not self.entities:
            return 0.0

        total_relationships = sum(len(e.relationships) for e in self.entities.values())

        # Check if relationships are bidirectional or have foreign keys
        valid_relationships = 0

        for entity in self.entities.values():
            for rel in entity.relationships:
                # Check if target entity exists
                if rel['target'] in self.entities:
                    valid_relationships += 1

        if total_relationships == 0:
            # No relationships is still valid (could be standalone tables)
            return 0.8

        return min(valid_relationships / total_relationships, 1.0)

    def _build_mermaid(self, options: Dict[str, Any]) -> str:
        """Generate Mermaid erDiagram syntax.

        Example output:
        ```mermaid
        erDiagram
            TENANT ||--o{ PRODUCT : has
            TENANT {
                int id PK
                string name
                string domain
            }
            PRODUCT {
                int id PK
                int tenant_id FK
                string name
                decimal price
            }
        ```
        """
        lines = ["erDiagram"]

        # First, add all relationships
        processed_relationships = set()

        for entity_name, entity in self.entities.items():
            for rel in entity.relationships:
                target = rel['target']
                cardinality = rel['cardinality']
                rel_type = rel.get('type', 'has')

                # Avoid duplicate relationships
                rel_key = tuple(sorted([entity_name, target]))
                if rel_key in processed_relationships:
                    continue

                processed_relationships.add(rel_key)

                # Format: ENTITY1 cardinality ENTITY2 : relationship_label
                lines.append(f"    {entity_name} {cardinality} {target} : {rel_type}")

        # Then, add entity definitions
        for entity_name, entity in sorted(self.entities.items()):
            lines.append(f"    {entity_name} {{")

            for attr in entity.attributes:
                attr_type = attr['type']
                attr_name = attr['name']
                constraints = attr['constraints']

                if constraints:
                    lines.append(f"        {attr_type} {attr_name} {constraints}")
                else:
                    lines.append(f"        {attr_type} {attr_name}")

            lines.append("    }")

        return '\n'.join(lines)
