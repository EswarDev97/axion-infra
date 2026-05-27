"""Tests for graph_visualizer.py — Task 22 of Code Graph & RE Enhancement."""

import json
import os
import sqlite3
import sys

import pytest

# Add generators dir to path so we can import graph_visualizer
GENERATORS_DIR = os.path.join(os.path.dirname(__file__), "..", "generators")
sys.path.insert(0, GENERATORS_DIR)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
CREATE TABLE code_entities (
    id INTEGER PRIMARY KEY,
    name TEXT,
    qualified_name TEXT,
    entity_type TEXT DEFAULT 'function',
    file_path TEXT,
    language TEXT DEFAULT 'python',
    signature TEXT,
    repo_name TEXT,
    package_name TEXT,
    is_test INTEGER DEFAULT 0,
    file_hash TEXT,
    line_start INTEGER DEFAULT 1,
    line_end INTEGER DEFAULT 10
);
CREATE TABLE code_relations (
    id INTEGER PRIMARY KEY,
    from_entity_id INTEGER,
    to_entity_id INTEGER,
    relation_type TEXT DEFAULT 'calls'
);
"""

MINIMAL_TEMPLATE = """<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<script>
const graphData = {GRAPH_DATA};
</script>
</body>
</html>
"""


def _make_db(path: str, entities=None, relations=None):
    """Create a SQLite DB at *path* with optional seed data."""
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA_SQL)
    if entities:
        conn.executemany(
            "INSERT INTO code_entities (id, name, qualified_name, entity_type, "
            "file_path, language, signature, repo_name, package_name, is_test) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            entities,
        )
    if relations:
        conn.executemany(
            "INSERT INTO code_relations (from_entity_id, to_entity_id, relation_type) "
            "VALUES (?, ?, ?)",
            relations,
        )
    conn.commit()
    conn.close()


@pytest.fixture
def template_file(tmp_path):
    """Write a minimal template with {GRAPH_DATA} placeholder."""
    p = tmp_path / "graph-viewer.html"
    p.write_text(MINIMAL_TEMPLATE)
    return str(p)


@pytest.fixture
def simple_db(tmp_path):
    """DB with 3 entities and 1 relation."""
    db_path = str(tmp_path / "test.db")
    entities = [
        (1, "func_a", "pkg.func_a", "function", "src/a.py", "python", "def func_a()", "repo", "pkg", 0),
        (2, "func_b", "pkg.func_b", "function", "src/b.py", "python", "def func_b()", "repo", "pkg", 0),
        (3, "func_c", "other.func_c", "function", "src/c.py", "python", "def func_c()", "repo", "other", 0),
    ]
    relations = [
        (1, 2, "calls"),
    ]
    _make_db(db_path, entities, relations)
    return db_path


# ---------------------------------------------------------------------------
# Import the module under test (deferred so failures are clear)
# ---------------------------------------------------------------------------

def _get_visualizer_class():
    from graph_visualizer import GraphVisualizer
    return GraphVisualizer


# ---------------------------------------------------------------------------
# Helper: extract graph data JSON from HTML output
# ---------------------------------------------------------------------------

def _extract_graph_data(html: str) -> dict:
    """Pull the JSON object that replaced {GRAPH_DATA} from the HTML."""
    marker = "const graphData = "
    start = html.index(marker) + len(marker)
    end = html.index(";", start)
    return json.loads(html[start:end])


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGenerateFullScope:
    def test_generate_full_scope(self, simple_db, template_file, tmp_path):
        """Full scope returns HTML containing all entities as nodes."""
        GraphVisualizer = _get_visualizer_class()
        output = str(tmp_path / "out.html")
        vis = GraphVisualizer(db_path=simple_db, template_path=template_file)
        result_path = vis.generate(scope="full", output_path=output)

        assert result_path == output
        html = open(output).read()
        data = _extract_graph_data(html)

        node_ids = {n["id"] for n in data["nodes"]}
        assert "pkg.func_a" in node_ids
        assert "pkg.func_b" in node_ids
        assert "other.func_c" in node_ids


class TestGeneratePackageScope:
    def test_generate_package_scope(self, simple_db, template_file, tmp_path):
        """Package scope filters entities to the given package_name."""
        GraphVisualizer = _get_visualizer_class()
        output = str(tmp_path / "out.html")
        vis = GraphVisualizer(db_path=simple_db, template_path=template_file)
        vis.generate(scope="package", scope_value="pkg", output_path=output)

        html = open(output).read()
        data = _extract_graph_data(html)

        node_ids = {n["id"] for n in data["nodes"]}
        assert "pkg.func_a" in node_ids
        assert "pkg.func_b" in node_ids
        assert "other.func_c" not in node_ids


class TestGenerateFileScope:
    def test_generate_file_scope(self, simple_db, template_file, tmp_path):
        """File scope filters entities to the given file_path."""
        GraphVisualizer = _get_visualizer_class()
        output = str(tmp_path / "out.html")
        vis = GraphVisualizer(db_path=simple_db, template_path=template_file)
        vis.generate(scope="file", scope_value="src/a.py", output_path=output)

        html = open(output).read()
        data = _extract_graph_data(html)

        node_ids = {n["id"] for n in data["nodes"]}
        assert "pkg.func_a" in node_ids
        assert "pkg.func_b" not in node_ids
        assert "other.func_c" not in node_ids


class TestGraphDataInOutput:
    def test_graph_data_placeholder_replaced(self, simple_db, template_file, tmp_path):
        """{GRAPH_DATA} placeholder must NOT appear in the output."""
        GraphVisualizer = _get_visualizer_class()
        output = str(tmp_path / "out.html")
        vis = GraphVisualizer(db_path=simple_db, template_path=template_file)
        vis.generate(scope="full", output_path=output)

        html = open(output).read()
        assert "{GRAPH_DATA}" not in html


class TestNodesHaveRequiredFields:
    def test_nodes_have_required_fields(self, simple_db, template_file, tmp_path):
        """Every node must have id, name, entity_type, and relation_count."""
        GraphVisualizer = _get_visualizer_class()
        output = str(tmp_path / "out.html")
        vis = GraphVisualizer(db_path=simple_db, template_path=template_file)
        vis.generate(scope="full", output_path=output)

        html = open(output).read()
        data = _extract_graph_data(html)

        assert len(data["nodes"]) > 0
        for node in data["nodes"]:
            assert "id" in node, f"node missing 'id': {node}"
            assert "name" in node, f"node missing 'name': {node}"
            assert "entity_type" in node, f"node missing 'entity_type': {node}"
            assert "relation_count" in node, f"node missing 'relation_count': {node}"


class TestOutputWrittenToPath:
    def test_output_written_to_path(self, simple_db, template_file, tmp_path):
        """generate() writes HTML to the specified output_path and returns it."""
        GraphVisualizer = _get_visualizer_class()
        output = str(tmp_path / "subdir" / "graph.html")
        os.makedirs(os.path.dirname(output), exist_ok=True)
        vis = GraphVisualizer(db_path=simple_db, template_path=template_file)
        result = vis.generate(scope="full", output_path=output)

        assert result == output
        assert os.path.isfile(output)
        content = open(output).read()
        assert "<html" in content.lower()


class TestMaxNodesLimit:
    def test_max_nodes_limit(self, tmp_path, template_file):
        """With max_nodes=5 and 10 entities in DB, only 5 nodes appear in output."""
        db_path = str(tmp_path / "big.db")
        entities = [
            (i, f"func_{i}", f"pkg.func_{i}", "function", f"src/{i}.py",
             "python", f"def func_{i}()", "repo", "pkg", 0)
            for i in range(1, 11)
        ]
        # Add some relations so ordering by relation count is exercised
        relations = [(i, i + 1, "calls") for i in range(1, 10)]
        _make_db(db_path, entities, relations)

        GraphVisualizer = _get_visualizer_class()
        output = str(tmp_path / "out.html")
        vis = GraphVisualizer(db_path=db_path, template_path=template_file)
        vis.generate(scope="full", max_nodes=5, output_path=output)

        html = open(output).read()
        data = _extract_graph_data(html)
        assert len(data["nodes"]) == 5
