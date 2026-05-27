# Code Parsers for AICodePath

This directory contains specialized parsers for different programming languages and frameworks, designed to extract structured information for documentation generation.

## Available Parsers

### 1. PythonParser (`python_parser.py`)
**Confidence: 90-95%** - Uses Python's built-in `ast` module

**Capabilities:**
- Parse Python files into AST
- Extract classes with inheritance, methods, decorators, and docstrings
- Extract functions with arguments, decorators, async status
- Extract imports (standard and from-imports)
- Detect abstract classes and methods

**Key Methods:**
- `parse_file(file_path)` - Parse Python file into AST
- `extract_classes(ast_tree)` - Extract ClassEntity objects
- `extract_functions(ast_tree)` - Extract FunctionEntity objects
- `extract_imports(ast_tree)` - Extract import relationships
- `find_decorators(node)` - Get decorator names
- `analyze_file(file_path)` - Comprehensive analysis with metrics

**Example Usage:**
```python
from parsers.python_parser import PythonParser

parser = PythonParser()
tree = parser.parse_file('my_module.py')
classes = parser.extract_classes(tree)
functions = parser.extract_functions(tree)
```

### 2. TypeScriptParser (`typescript_parser.py`)
**Confidence: 85-90%** - Uses tree-sitter (when available)

**Capabilities:**
- Parse TypeScript/TSX files
- Extract classes with extends/implements
- Extract TypeScript interfaces
- Extract React functional components (arrow functions and function declarations)
- Detect React hooks usage (useState, useEffect, etc.)
- Extract prop types from interfaces

**Key Methods:**
- `parse_file(file_path)` - Parse TS/TSX file
- `extract_classes(tree)` - Extract class definitions
- `extract_interfaces(tree)` - Extract TypeScript interfaces
- `extract_react_components(tree)` - Extract React components
- `extract_hooks(tree)` - Find hook usage
- `extract_props(tree)` - Extract prop types

**React Component Detection:**
```typescript
// Detects both patterns:
function MyComponent(props: Props) { return <div>...</div> }
const MyComponent = (props: Props) => <div>...</div>
```

**Dependencies:**
- `tree-sitter` - Parser framework
- `tree-sitter-typescript` - TypeScript grammar

### 3. SQLParser (`sql_parser.py`)
**Confidence: 85-90%** - Uses sqlparse library

**Capabilities:**
- Parse SQL CREATE TABLE statements
- Extract table definitions with columns, types, constraints
- Extract foreign key relationships with ON DELETE/UPDATE
- Extract indexes and unique constraints
- Parse column attributes (nullable, default, primary key, unique, auto_increment)

**Key Methods:**
- `parse_file(file_path)` - Parse SQL file
- `extract_tables(statements)` - Extract TableEntity objects
- `extract_columns(create_stmt)` - Extract columns with types
- `extract_foreign_keys(create_stmt)` - Find FK relationships
- `extract_indexes(create_stmt)` - Find index definitions

**Example Usage:**
```python
from parsers.sql_parser import SQLParser

parser = SQLParser()
statements = parser.parse_file('schema.sql')
tables = parser.extract_tables(statements)
```

**Dependencies:**
- `sqlparse` - SQL parsing library

### 4. AlembicParser (`alembic_parser.py`)
**Confidence: 85%** - Uses Python AST

**Capabilities:**
- Parse Alembic migration Python files
- Extract migration metadata (revision, down_revision)
- Extract migration operations (create_table, add_column, alter_column, etc.)
- Build cumulative schema from migration history
- Track operation types: create_table, drop_table, add_column, drop_column, alter_column, create_index, create_foreign_key

**Key Methods:**
- `parse_migration(file_path)` - Parse migration Python file
- `extract_operations(ast_tree)` - Find op.create_table, op.add_column, etc.
- `build_schema_from_migrations(migration_files)` - Build cumulative schema from ordered migrations

**Supported Operations:**
- `op.create_table()` - Table creation
- `op.drop_table()` - Table deletion
- `op.add_column()` - Add column
- `op.drop_column()` - Remove column
- `op.alter_column()` - Modify column
- `op.create_index()` - Create index
- `op.create_foreign_key()` - Add foreign key

**Example Usage:**
```python
from parsers.alembic_parser import AlembicParser

parser = AlembicParser()
migration = parser.parse_migration('alembic/versions/001_initial.py')
operations = migration['operations']

# Build schema from multiple migrations
schema = parser.build_schema_from_migrations([
    'alembic/versions/001_initial.py',
    'alembic/versions/002_add_users.py'
])
```

### 5. SQLAlchemyParser (`sqlalchemy_parser.py`)
**Confidence: 88%** - Uses Python AST

**Capabilities:**
- Parse SQLAlchemy ORM model files
- Extract table definitions from classes with `__tablename__`
- Extract Column() definitions with all attributes
- Extract relationship() calls with cardinality inference
- Infer relationship types: one-to-one, one-to-many, many-to-one, many-to-many
- Detect foreign keys, primary keys, unique constraints

**Key Methods:**
- `parse_model_file(file_path)` - Parse Python file with SQLAlchemy models
- `extract_tables(ast_tree)` - Find classes with __tablename__
- `extract_columns(class_node)` - Extract Column() definitions
- `extract_relationships(class_node)` - Extract relationship() calls
- `infer_cardinality(relationship_node)` - Determine cardinality

**Cardinality Inference Rules:**
- `one-to-many`: Default (uselist=True, no secondary)
- `many-to-one`: Foreign key on current side
- `one-to-one`: uselist=False
- `many-to-many`: secondary table specified

**Example Usage:**
```python
from parsers.sqlalchemy_parser import SQLAlchemyParser

parser = SQLAlchemyParser()
tree = parser.parse_model_file('models.py')
tables = parser.extract_tables(tree)

for table in tables:
    print(f"Table: {table.table_name}")
    for col in table.columns:
        print(f"  - {col.name}: {col.column_type}")
    for rel in table.relationships:
        print(f"  - {rel.name} -> {rel.target_class} ({rel.cardinality})")
```

## Entity Models

### Common Entities

**ClassEntity** (Python, TypeScript)
```python
class ClassEntity:
    name: str
    lineno: int
    bases: List[str]
    methods: List[str]
    decorators: List[str]
    docstring: Optional[str]
```

**FunctionEntity** (Python)
```python
class FunctionEntity:
    name: str
    lineno: int
    args: List[str]
    decorators: List[str]
    is_async: bool
    is_method: bool
    parent_class: Optional[str]
```

**ComponentEntity** (TypeScript/React)
```python
class ComponentEntity:
    name: str
    line: int
    is_exported: bool
    props_type: Optional[str]
    hooks_used: List[str]
```

**TableEntity** (SQL, SQLAlchemy)
```python
class TableEntity:
    name: str
    schema: Optional[str]
    columns: List[ColumnEntity]
    primary_keys: List[str]
    foreign_keys: List[ForeignKeyEntity]
    indexes: List[IndexEntity]
```

**ColumnEntity** (SQL, SQLAlchemy)
```python
class ColumnEntity:
    name: str
    data_type: str
    nullable: bool
    default: Optional[str]
    primary_key: bool
    unique: bool
    auto_increment: bool
```

**RelationshipEntity** (SQLAlchemy)
```python
class RelationshipEntity:
    name: str
    target_class: str
    cardinality: str  # one-to-one, one-to-many, many-to-one, many-to-many
    back_populates: Optional[str]
    foreign_key: Optional[str]
```

## Error Handling

All parsers include:
- **Fallback mechanisms**: If parsing fails, return empty results with confidence=0.0
- **Logging**: Detailed error logging for debugging
- **Type hints**: Full type annotations for better IDE support
- **Graceful degradation**: Continue parsing even if some elements fail

## Installation

```bash
# Core parsers (no dependencies)
# - PythonParser (uses stdlib ast)
# - AlembicParser (uses stdlib ast)
# - SQLAlchemyParser (uses stdlib ast)

# Optional dependencies
pip install tree-sitter tree-sitter-typescript  # For TypeScriptParser
pip install sqlparse                            # For SQLParser
```

## Confidence Levels

| Parser | Confidence | Notes |
|--------|-----------|-------|
| PythonParser | 90-95% | Uses stdlib AST, highly reliable |
| TypeScriptParser | 85-90% | Requires tree-sitter setup |
| SQLParser | 85-90% | Regex fallbacks for complex SQL |
| AlembicParser | 85% | Parses Python AST of migrations |
| SQLAlchemyParser | 88% | Infers relationships from code patterns |

## Future Enhancements

- [ ] Add Java parser using tree-sitter-java
- [ ] Add C# parser using tree-sitter-c-sharp
- [ ] Add Go parser using tree-sitter-go
- [ ] Improve React component prop extraction
- [ ] Add support for GraphQL schema parsing
- [ ] Add support for Prisma schema parsing
- [ ] Cache parsed ASTs for performance

## Testing

```python
# Test all parsers
cd .aicodepath/generators
python3 << 'EOF'
from parsers.python_parser import PythonParser
from parsers.typescript_parser import TypeScriptParser
from parsers.sql_parser import SQLParser
from parsers.alembic_parser import AlembicParser
from parsers.sqlalchemy_parser import SQLAlchemyParser

# Test each parser
for Parser in [PythonParser, TypeScriptParser, SQLParser, AlembicParser, SQLAlchemyParser]:
    parser = Parser()
    print(f"{Parser.__name__}: confidence={parser.confidence}")
