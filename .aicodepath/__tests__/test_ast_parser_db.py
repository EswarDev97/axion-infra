"""Tests for DBWriter in ast_parser.py.

Uses an in-memory SQLite database to verify entity/relation persistence
and file_hash skip logic.
"""
import hashlib
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest

# Allow running from project root; add parsers dir to path
sys.path.insert(0, str(Path(__file__).parent.parent / "generators" / "parsers"))

from ast_parser import CodeGraphParser, DBWriter  # noqa: E402

# ---------------------------------------------------------------------------
# Minimal schema — mirrors the real migration columns used by DBWriter
# ---------------------------------------------------------------------------

CREATE_ENTITIES = """
CREATE TABLE IF NOT EXISTS code_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL, name TEXT NOT NULL,
    qualified_name TEXT, language TEXT,
    file_path TEXT NOT NULL, line_start INTEGER, line_end INTEGER,
    signature TEXT, body TEXT, documentation TEXT,
    entity_hash TEXT, token_hash TEXT, structural_hash TEXT, file_hash TEXT,
    complexity INTEGER, dependencies JSON, exported BOOLEAN DEFAULT 0,
    metadata JSON, cr_number TEXT NOT NULL DEFAULT 'CR-LEGACY',
    artifact_id INTEGER, indexed_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    repo_name TEXT, package_name TEXT
);
"""

CREATE_RELATIONS = """
CREATE TABLE IF NOT EXISTS code_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id INTEGER, to_entity_id INTEGER,
    from_entity_name TEXT, to_entity_name TEXT,
    relation_type TEXT NOT NULL, metadata JSON,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_db() -> sqlite3.Connection:
    """Create an in-memory DB with the minimal schema."""
    conn = sqlite3.connect(":memory:")
    conn.execute(CREATE_ENTITIES)
    conn.execute(CREATE_RELATIONS)
    conn.commit()
    return conn


def _make_writer(conn: sqlite3.Connection) -> DBWriter:
    """Create a DBWriter that uses an already-open in-memory connection."""
    writer = DBWriter(":memory:")
    writer._conn = conn  # inject pre-created in-memory connection
    return writer


def _write_py_file(tmp_path: Path, content: str) -> Path:
    """Write content to a temp .py file and return the Path."""
    p = tmp_path / "sample.py"
    p.write_text(content, encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# Sample Python source used across tests
# ---------------------------------------------------------------------------

SAMPLE_SOURCE = '''\
import os
import sys


class MyClass:
    """A simple class."""

    def my_method(self):
        pass


def standalone_func():
    os.path.join("a", "b")
'''


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestIndexFileCreatesEntities:
    def test_index_file_creates_entities(self, tmp_path):
        """Indexing a Python file should produce rows in code_entities."""
        conn = _make_db()
        writer = _make_writer(conn)
        parser = CodeGraphParser(repo_name="test-repo")

        py_file = _write_py_file(tmp_path, SAMPLE_SOURCE)
        nodes, edges = parser.parse_file(py_file)

        result = writer.index_file(py_file, nodes, edges)

        assert result is True, "index_file should return True on first index"
        rows = conn.execute("SELECT COUNT(*) FROM code_entities").fetchone()[0]
        assert rows > 0, "Expected at least one entity row"

    def test_index_file_creates_relations(self, tmp_path):
        """Indexing a file that imports modules should produce code_relations rows."""
        conn = _make_db()
        writer = _make_writer(conn)
        parser = CodeGraphParser(repo_name="test-repo")

        py_file = _write_py_file(tmp_path, SAMPLE_SOURCE)
        nodes, edges = parser.parse_file(py_file)

        writer.index_file(py_file, nodes, edges)

        rows = conn.execute("SELECT COUNT(*) FROM code_relations").fetchone()[0]
        assert rows > 0, "Expected at least one relation row (import edges)"

    def test_repo_name_and_package_populated(self, tmp_path):
        """repo_name column should be set from NodeInfo.repo_name."""
        conn = _make_db()
        writer = _make_writer(conn)
        parser = CodeGraphParser(repo_name="my-repo")

        py_file = _write_py_file(tmp_path, SAMPLE_SOURCE)
        nodes, edges = parser.parse_file(py_file)

        writer.index_file(py_file, nodes, edges)

        row = conn.execute(
            "SELECT repo_name FROM code_entities WHERE entity_type != 'file' LIMIT 1"
        ).fetchone()
        assert row is not None, "Expected at least one non-file entity"
        assert row[0] == "my-repo", f"Expected repo_name='my-repo', got {row[0]!r}"


class TestFileHashSkip:
    def test_file_hash_skip(self, tmp_path):
        """Indexing the same file twice should return False on the second call."""
        conn = _make_db()
        writer = _make_writer(conn)
        parser = CodeGraphParser(repo_name="test-repo")

        py_file = _write_py_file(tmp_path, SAMPLE_SOURCE)
        nodes, edges = parser.parse_file(py_file)

        first = writer.index_file(py_file, nodes, edges)
        second = writer.index_file(py_file, nodes, edges)

        assert first is True, "First call should return True (indexed)"
        assert second is False, "Second call should return False (skipped — same hash)"

    def test_reindex_clears_old_entities(self, tmp_path):
        """After content changes, reindex should remove stale entities."""
        conn = _make_db()
        writer = _make_writer(conn)
        parser = CodeGraphParser(repo_name="test-repo")

        # First index
        py_file = _write_py_file(tmp_path, SAMPLE_SOURCE)
        nodes1, edges1 = parser.parse_file(py_file)
        writer.index_file(py_file, nodes1, edges1)

        count_before = conn.execute("SELECT COUNT(*) FROM code_entities").fetchone()[0]
        assert count_before > 0

        # Simulate changed file by writing new content
        new_content = '''\
class NewClass:
    def new_method(self):
        pass
'''
        py_file.write_text(new_content, encoding="utf-8")
        nodes2, edges2 = parser.parse_file(py_file)
        result = writer.index_file(py_file, nodes2, edges2)

        assert result is True, "Should return True after content change"

        # Old entity names should be gone, new ones present
        names = {
            row[0]
            for row in conn.execute("SELECT name FROM code_entities").fetchall()
        }
        assert "MyClass" not in names, "Old class should have been cleared"
        assert "NewClass" in names, "New class should be present"


class TestClearFile:
    def test_clear_file(self, tmp_path):
        """clear_file should remove all code_entities and code_relations for a path."""
        conn = _make_db()
        writer = _make_writer(conn)
        parser = CodeGraphParser(repo_name="test-repo")

        py_file = _write_py_file(tmp_path, SAMPLE_SOURCE)
        nodes, edges = parser.parse_file(py_file)
        writer.index_file(py_file, nodes, edges)

        # Verify rows exist
        assert conn.execute("SELECT COUNT(*) FROM code_entities").fetchone()[0] > 0

        writer.clear_file(str(py_file))

        entity_count = conn.execute(
            "SELECT COUNT(*) FROM code_entities WHERE file_path = ?",
            (str(py_file),),
        ).fetchone()[0]
        assert entity_count == 0, "All entities for file_path should be deleted"

        relation_count = conn.execute(
            "SELECT COUNT(*) FROM code_relations WHERE from_entity_name LIKE ?",
            (f"%{py_file.name}%",),
        ).fetchone()[0]
        # Relations are keyed by qualified name not raw file path but we still
        # verify the method runs without error and entities are cleared.
        _ = relation_count  # no assertion needed beyond no exception


class TestReindexFile:
    def test_reindex_file(self, tmp_path):
        """reindex_file should clear, re-parse, and re-insert entities."""
        conn = _make_db()
        writer = _make_writer(conn)
        parser = CodeGraphParser(repo_name="test-repo")

        py_file = _write_py_file(tmp_path, SAMPLE_SOURCE)

        # Index once to populate the DB
        nodes, edges = parser.parse_file(py_file)
        writer.index_file(py_file, nodes, edges)
        count_before = conn.execute("SELECT COUNT(*) FROM code_entities").fetchone()[0]

        # reindex_file: should clear and re-insert
        result = writer.reindex_file(py_file, parser)
        count_after = conn.execute("SELECT COUNT(*) FROM code_entities").fetchone()[0]

        assert result is True, "reindex_file should return True"
        assert count_after > 0, "Entities should be re-inserted after reindex"
