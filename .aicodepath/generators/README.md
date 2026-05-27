# AICodePath Visual Memory Generators

AST/tree-sitter-powered diagram generators for high-confidence code visualization.

## Installation

```bash
cd .aicodepath/generators
pip install -r requirements.txt
```

## Usage

### As a Python Module

```bash
python -m generators generate --type er --files models.py --output diagram.mmd
python -m generators generate --type class --scope module --unit auth
```

### Individual Diagram Commands

```bash
# Entity-Relationship Diagram
python -m generators er schema.sql migrations/*.sql --output er.mmd

# Class Diagram
python -m generators class-diagram src/**/*.py --output classes.mmd --depth 3

# Flowchart
python -m generators flowchart app.py --function process_payment --output flow.mmd

# Sequence Diagram
python -m generators sequence api/*.py --entry "/api/checkout" --output seq.mmd

# User Journey
python -m generators journey flows/*.py --flow "user-registration" --output journey.mmd

# C4 Architecture
python -m generators c4 container --unit "payment-service" --output c4.mmd

# Layered Architecture
python -m generators layered src/**/*.py --output layers.mmd
```

## JSON Output Format

All commands output JSON for Node.js bridge integration:

```json
{
  "success": true,
  "data": {
    "diagram_type": "er",
    "files": ["schema.sql"],
    "diagram": "erDiagram\n    CUSTOMER ||--o{ ORDER : places\n",
    "output_path": "/path/to/output.mmd"
  }
}
```

## Directory Structure

```
generators/
├── __init__.py              # Package initialization
├── __main__.py              # Entry point for module execution
├── cli.py                   # Typer CLI interface
├── requirements.txt         # Python dependencies
├── core/                    # Core utilities
│   ├── __init__.py
│   ├── base_generator.py    # Base generator class
│   ├── mermaid_renderer.py  # Mermaid output formatter
│   ├── confidence_scorer.py # Confidence scoring for generated diagrams
│   └── file_analyzer.py     # File type detection and analysis
├── parsers/                 # Language parsers
│   ├── __init__.py
│   ├── python_parser.py     # Python AST parser
│   ├── typescript_parser.py # TypeScript tree-sitter parser
│   ├── sql_parser.py        # SQL parser using sqlparse
│   ├── alembic_parser.py    # Alembic migration parser
│   ├── ast_parser.py        # Generic AST parser
│   ├── dump_parser.py       # SQL dump parser
│   ├── graph_engine.py      # Graph traversal engine
│   ├── language_types.py    # Language type definitions
│   └── sqlalchemy_parser.py # SQLAlchemy ORM parser
├── diagrams/                # Diagram generators
│   ├── __init__.py
│   ├── er_diagram.py        # Entity-Relationship diagrams
│   ├── class_diagram.py     # UML class diagrams
│   ├── flowchart.py         # Flowcharts
│   ├── sequence_diagram.py  # Sequence diagrams
│   ├── user_journey.py      # User journey diagrams
│   ├── c4_diagram.py        # C4 architecture diagrams
│   └── layered_architecture.py # Layered architecture diagrams
├── models/                  # Pydantic models
│   ├── __init__.py
│   ├── code_entities.py     # Class, function, module models
│   ├── relationships.py     # Relationship models
│   └── diagram_output.py    # Output format models
└── tests/                   # Test suite
    ├── __init__.py
    ├── test_content_sniffing.py
    ├── test_dump_parser.py
    ├── test_er_dump_integration.py
    ├── test_er_pk_fix.py
    └── fixtures/
```

## Architecture

### Parser Layer
- Uses tree-sitter for TypeScript/JavaScript (high accuracy)
- Uses Python AST for Python (native support)
- Uses sqlparse for SQL (DDL/DML parsing)
- Provides unified interface for all languages

### Generator Layer
- Takes parsed AST and extracts relevant information
- Builds intermediate representation (Pydantic models)
- Generates Mermaid diagram syntax

### CLI Layer
- Typer-based CLI for easy invocation
- JSON output for Node.js bridge
- Rich progress indicators for user feedback

## Integration with Node.js

The Python generators are called from Node.js hooks via:

```javascript
const { spawn } = require('child_process');

function generateDiagram(type, files, options) {
  return new Promise((resolve, reject) => {
    const args = ['generators', 'generate', '--type', type, ...files];
    const py = spawn('python', ['-m', ...args]);
    
    let output = '';
    py.stdout.on('data', (data) => output += data);
    py.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error(`Generator failed with code ${code}`));
      }
    });
  });
}
```

## Development

### Running Tests

```bash
pytest tests/
```

### Adding a New Generator

1. Create parser in `parsers/` if needed
2. Create generator in `diagrams/`
3. Add models in `models/` for data structures
4. Add CLI command in `cli.py`
5. Add tests in `tests/`

## Version

Current version: **1.0.0**
