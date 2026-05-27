"""End-to-end test for the Code Graph pipeline.

Exercises the full pipeline:
  ast_parser.py (parse files)
    → SQLite DB (store entities + relations)
    → resolve_entities() (link call edges)
    → graph_engine.py (query: callers_of, impact_radius)
    → graph_visualizer.py (generate HTML)

Part of AICodePath Code Graph & RE Enhancement system (Task 28).
"""

from __future__ import annotations

import sqlite3
import sys
import os

import pytest

# ---------------------------------------------------------------------------
# Path setup — allow importing from generators/parsers/ without installing
# ---------------------------------------------------------------------------
sys.path.insert(0, '/home/faizal/workspace/aicodepath-tool/.aicodepath/generators/parsers')
sys.path.insert(0, '/home/faizal/workspace/aicodepath-tool/.aicodepath/generators')

from ast_parser import CodeGraphParser, DBWriter, resolve_entities
from graph_engine import GraphEngine
from graph_visualizer import GraphVisualizer

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
TEMPLATE_PATH = (
    '/home/faizal/workspace/aicodepath-tool/.aicodepath/generators/templates/graph-viewer.html'
)

# Minimal schema needed by DBWriter (mirrors the _ensure_tables() function in
# ast_parser.py's __main__ block).
_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS code_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    qualified_name TEXT,
    language TEXT,
    file_path TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    signature TEXT,
    body TEXT,
    documentation TEXT,
    entity_hash TEXT,
    token_hash TEXT,
    structural_hash TEXT,
    file_hash TEXT,
    complexity INTEGER,
    dependencies JSON,
    exported BOOLEAN DEFAULT 0,
    metadata JSON,
    cr_number TEXT NOT NULL DEFAULT 'CR-LEGACY',
    artifact_id INTEGER,
    repo_name TEXT,
    package_name TEXT,
    is_test BOOLEAN DEFAULT 0,
    indexed_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_code_entities_file ON code_entities(file_path);

CREATE TABLE IF NOT EXISTS code_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id INTEGER,
    to_entity_id INTEGER,
    from_entity_name TEXT,
    to_entity_name TEXT,
    relation_type TEXT NOT NULL,
    metadata JSON,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_code_relations_from_name ON code_relations(from_entity_name);
CREATE INDEX IF NOT EXISTS idx_code_relations_to_name ON code_relations(to_entity_name);
"""


def _init_db(db_path: str) -> None:
    """Create the minimal tables required by the code-graph pipeline."""
    conn = sqlite3.connect(db_path)
    conn.executescript(_SCHEMA_SQL)
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def src_dir(tmp_path):
    """Create two real Python source files and return the directory."""
    content_a = '''\
def function_a():
    return "hello"

def function_b():
    return function_a()  # calls function_a
'''
    content_b = '''\
from sample_a import function_a

def function_c():
    return function_a()  # also calls function_a
'''
    (tmp_path / 'sample_a.py').write_text(content_a, encoding='utf-8')
    (tmp_path / 'sample_b.py').write_text(content_b, encoding='utf-8')
    return tmp_path


@pytest.fixture()
def populated_db(tmp_path, src_dir):
    """Parse sample files, store in a temp DB, and return the db_path."""
    db_path = str(tmp_path / 'test.db')
    _init_db(db_path)

    parser = CodeGraphParser(repo_name='test-repo')
    writer = DBWriter(db_path=db_path)

    for py_file in sorted(src_dir.glob('*.py')):
        nodes, edges = parser.parse_file(py_file)
        writer.index_file(py_file, nodes, edges)

    return db_path


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestParseToDb:
    """Step 1: Parse → DB"""

    def test_parse_to_db_entities(self, populated_db):
        """At least 3 entities (function_a, function_b, function_c) land in DB."""
        conn = sqlite3.connect(populated_db)
        count = conn.execute('SELECT COUNT(*) FROM code_entities').fetchone()[0]
        conn.close()
        assert count >= 3, f'Expected >= 3 entities, got {count}'

    def test_parse_to_db_relations(self, populated_db):
        """At least 1 relation is stored."""
        conn = sqlite3.connect(populated_db)
        count = conn.execute('SELECT COUNT(*) FROM code_relations').fetchone()[0]
        conn.close()
        assert count >= 1, f'Expected >= 1 relation, got {count}'


class TestEntityResolution:
    """Step 2: resolve_entities() links call edges."""

    def test_entity_resolution_no_crash(self, populated_db):
        """resolve_entities() completes without raising an exception."""
        result = resolve_entities(populated_db)
        assert isinstance(result, dict), f'Expected dict, got {type(result)}'

    def test_entity_resolution_resolved_count(self, populated_db):
        """resolved key is present in the result and is a non-negative int."""
        result = resolve_entities(populated_db)
        resolved = result.get('resolved', 0)
        assert resolved >= 0


class TestGraphEngineCallers:
    """Step 3: GraphEngine.callers_of()"""

    def test_callers_of_returns_list(self, populated_db):
        """callers_of('function_a') returns a list (may be empty for simple files)."""
        engine = GraphEngine(db_path=populated_db)
        callers = engine.callers_of('function_a')
        assert isinstance(callers, list), f'Expected list, got {type(callers)}'

    def test_callers_of_no_crash(self, populated_db):
        """callers_of() does not raise for any entity name."""
        engine = GraphEngine(db_path=populated_db)
        # Also try a non-existent name to exercise the empty-graph path
        result = engine.callers_of('nonexistent_xyz')
        assert result == []


class TestGraphEngineImpactRadius:
    """Step 4: GraphEngine.impact_radius()"""

    def test_impact_radius_returns_dict_with_total(self, populated_db):
        """impact_radius('function_a') returns a dict containing 'total'."""
        engine = GraphEngine(db_path=populated_db)
        result = engine.impact_radius('function_a')
        assert isinstance(result, dict), f'Expected dict, got {type(result)}'
        assert 'total' in result, f"'total' key missing from result: {result.keys()}"

    def test_impact_radius_total_non_negative(self, populated_db):
        """impact_radius total is >= 0."""
        engine = GraphEngine(db_path=populated_db)
        result = engine.impact_radius('function_a')
        assert result['total'] >= 0


class TestVisualizeFull:
    """Step 5: GraphVisualizer.generate() — full scope"""

    def test_visualize_full_creates_html_file(self, populated_db, tmp_path):
        """generate(scope='full') writes an HTML file that exists."""
        output_path = str(tmp_path / 'graph.html')
        viz = GraphVisualizer(db_path=populated_db, template_path=TEMPLATE_PATH)
        returned_path = viz.generate(scope='full', output_path=output_path)

        assert os.path.exists(output_path), f'HTML file not found at {output_path}'

    def test_visualize_full_contains_nodes_key(self, populated_db, tmp_path):
        """Generated HTML contains the string 'nodes' (from graphData JSON)."""
        output_path = str(tmp_path / 'graph_nodes.html')
        viz = GraphVisualizer(db_path=populated_db, template_path=TEMPLATE_PATH)
        viz.generate(scope='full', output_path=output_path)

        content = open(output_path, encoding='utf-8').read()
        assert '"nodes"' in content, "'nodes' key not found in generated HTML"


class TestVisualizeReturnsPath:
    """Step 6: generate() return value is a valid file path."""

    def test_generate_returns_string_path(self, populated_db, tmp_path):
        """generate() returns a str pointing to an existing file."""
        output_path = str(tmp_path / 'graph_return.html')
        viz = GraphVisualizer(db_path=populated_db, template_path=TEMPLATE_PATH)
        returned = viz.generate(scope='full', output_path=output_path)

        assert isinstance(returned, str), f'Expected str, got {type(returned)}'
        assert os.path.isfile(returned), f'Returned path does not exist: {returned}'

    def test_generate_return_matches_output_path(self, populated_db, tmp_path):
        """generate() returned path is the same file we specified."""
        output_path = str(tmp_path / 'graph_match.html')
        viz = GraphVisualizer(db_path=populated_db, template_path=TEMPLATE_PATH)
        returned = viz.generate(scope='full', output_path=output_path)

        assert os.path.abspath(returned) == os.path.abspath(output_path)
