"""Tests for resolve_entities() in ast_parser.py.

Uses in-memory SQLite (via ':memory:' path) with a minimal schema matching
the code_entities / code_relations tables used by the Code Graph system.
"""
import sqlite3
import sys
import os
import tempfile

# Allow running directly or via pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'generators', 'parsers'))

# Minimal schema matching the real DB tables (only columns needed for resolution)
_SCHEMA = """
CREATE TABLE IF NOT EXISTS code_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL DEFAULT 'function',
    name TEXT NOT NULL,
    qualified_name TEXT,
    language TEXT,
    file_path TEXT NOT NULL DEFAULT '',
    cr_number TEXT NOT NULL DEFAULT 'CR-GRAPH'
);
CREATE TABLE IF NOT EXISTS code_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id INTEGER,
    to_entity_id INTEGER,
    from_entity_name TEXT,
    to_entity_name TEXT,
    relation_type TEXT NOT NULL DEFAULT 'calls',
    metadata JSON,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def _make_db() -> tuple:
    """Create a named temp-file SQLite DB and return (path, conn)."""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    conn = sqlite3.connect(path)
    conn.executescript(_SCHEMA)
    conn.commit()
    return path, conn


def _teardown(path: str, conn: sqlite3.Connection) -> None:
    conn.close()
    try:
        os.unlink(path)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Import the function under test (after writing it we expect this to work)
# ---------------------------------------------------------------------------
from ast_parser import resolve_entities  # noqa: E402


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_resolve_exact_match():
    """Exact qualified_name match sets to_entity_id."""
    path, conn = _make_db()
    try:
        conn.execute(
            "INSERT INTO code_entities (name, qualified_name, file_path) VALUES (?, ?, ?)",
            ('ClassA', 'repo::file.py:ClassA', 'file.py')
        )
        entity_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute(
            "INSERT INTO code_relations (from_entity_name, to_entity_name) VALUES (?, ?)",
            ('caller', 'repo::file.py:ClassA')
        )
        conn.commit()

        stats = resolve_entities(path)

        row = conn.execute("SELECT to_entity_id FROM code_relations WHERE to_entity_name = ?",
                           ('repo::file.py:ClassA',)).fetchone()
        assert row is not None, "Relation row should exist"
        assert row[0] == entity_id, f"to_entity_id should be {entity_id}, got {row[0]}"
        assert stats['resolved'] == 1
    finally:
        _teardown(path, conn)


def test_resolve_suffix_match():
    """Unqualified name 'ClassA' resolves via suffix match."""
    path, conn = _make_db()
    try:
        conn.execute(
            "INSERT INTO code_entities (name, qualified_name, file_path) VALUES (?, ?, ?)",
            ('ClassA', 'repo:pkg:file.py:ClassA', 'file.py')
        )
        entity_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute(
            "INSERT INTO code_relations (from_entity_name, to_entity_name) VALUES (?, ?)",
            ('caller', 'ClassA')
        )
        conn.commit()

        stats = resolve_entities(path)

        row = conn.execute("SELECT to_entity_id FROM code_relations WHERE to_entity_name = ?",
                           ('ClassA',)).fetchone()
        assert row is not None
        assert row[0] == entity_id, f"to_entity_id should be {entity_id}, got {row[0]}"
        assert stats['resolved'] == 1
    finally:
        _teardown(path, conn)


def test_unresolvable_stays_null():
    """External dep like 'os.path' that has no matching entity stays NULL."""
    path, conn = _make_db()
    try:
        conn.execute(
            "INSERT INTO code_relations (from_entity_name, to_entity_name) VALUES (?, ?)",
            ('caller', 'os.path')
        )
        conn.commit()

        stats = resolve_entities(path)

        row = conn.execute("SELECT to_entity_id FROM code_relations WHERE to_entity_name = ?",
                           ('os.path',)).fetchone()
        assert row is not None
        assert row[0] is None, f"to_entity_id should remain NULL for external dep, got {row[0]}"
        assert stats['unresolved'] == 1
        assert stats['resolved'] == 0
    finally:
        _teardown(path, conn)


def test_resolve_returns_stats():
    """Return dict must have 'total', 'resolved', 'unresolved' keys."""
    path, conn = _make_db()
    try:
        # One resolvable, one not
        conn.execute(
            "INSERT INTO code_entities (name, qualified_name, file_path) VALUES (?, ?, ?)",
            ('MyFunc', 'repo::mod.py:MyFunc', 'mod.py')
        )
        conn.execute(
            "INSERT INTO code_relations (from_entity_name, to_entity_name) VALUES (?, ?)",
            ('a', 'repo::mod.py:MyFunc')
        )
        conn.execute(
            "INSERT INTO code_relations (from_entity_name, to_entity_name) VALUES (?, ?)",
            ('b', 'external.lib.Foo')
        )
        conn.commit()

        stats = resolve_entities(path)

        assert 'total' in stats, "Stats must have 'total' key"
        assert 'resolved' in stats, "Stats must have 'resolved' key"
        assert 'unresolved' in stats, "Stats must have 'unresolved' key"
        assert stats['total'] == 2
        assert stats['resolved'] == 1
        assert stats['unresolved'] == 1
        assert stats['total'] == stats['resolved'] + stats['unresolved']
    finally:
        _teardown(path, conn)


def test_resolve_idempotent():
    """Running resolve_entities twice does not double-count or corrupt data."""
    path, conn = _make_db()
    try:
        conn.execute(
            "INSERT INTO code_entities (name, qualified_name, file_path) VALUES (?, ?, ?)",
            ('Handler', 'repo::srv.py:Handler', 'srv.py')
        )
        entity_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute(
            "INSERT INTO code_relations (from_entity_name, to_entity_name) VALUES (?, ?)",
            ('caller', 'repo::srv.py:Handler')
        )
        conn.commit()

        stats1 = resolve_entities(path)
        stats2 = resolve_entities(path)

        # Second run should find 0 unresolved relations (already resolved)
        assert stats2['total'] == 0, (
            f"Second run should have 0 unresolved rows to process, got total={stats2['total']}"
        )
        assert stats2['resolved'] == 0

        # The resolved ID should still be correct
        row = conn.execute("SELECT to_entity_id FROM code_relations WHERE to_entity_name = ?",
                           ('repo::srv.py:Handler',)).fetchone()
        assert row[0] == entity_id
    finally:
        _teardown(path, conn)


# ---------------------------------------------------------------------------
# Runner (for direct execution: python test_entity_resolution.py)
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    tests = [
        test_resolve_exact_match,
        test_resolve_suffix_match,
        test_unresolvable_stays_null,
        test_resolve_returns_stats,
        test_resolve_idempotent,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
            passed += 1
        except Exception as exc:
            print(f"  FAIL  {t.__name__}: {exc}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
