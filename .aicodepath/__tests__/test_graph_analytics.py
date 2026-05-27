"""
Tests for graph_analytics.GraphAnalytics — report generation.

Run: python3 -m pytest .aicodepath/__tests__/test_graph_analytics.py -v
"""
import os
import sqlite3
import tempfile
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "generators/parsers"))
from graph_analytics import GraphAnalytics

# ---------------------------------------------------------------------------
# Minimal schema (mirrors the code_entities + code_relations base schema)
# ---------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE code_entities (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type     TEXT    NOT NULL DEFAULT 'function',
    name            TEXT    NOT NULL,
    qualified_name  TEXT,
    language        TEXT    DEFAULT 'python',
    file_path       TEXT    NOT NULL DEFAULT 'test.py',
    line_start      INTEGER DEFAULT 1,
    is_test         BOOLEAN DEFAULT 0,
    community       INTEGER,
    cr_number       TEXT    NOT NULL DEFAULT 'CR-GRAPH'
);
CREATE TABLE code_relations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id   INTEGER,
    to_entity_id     INTEGER,
    from_entity_name TEXT,
    to_entity_name   TEXT,
    relation_type    TEXT NOT NULL DEFAULT 'calls'
);
"""


def make_db(entities=None, relations=None) -> str:
    """Create a temp SQLite DB with optional seed data. Caller owns cleanup."""
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    if entities:
        for e in entities:
            conn.execute(
                """INSERT INTO code_entities
                       (name, qualified_name, entity_type, language, file_path)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    e["name"],
                    e.get("qualified_name", e["name"]),
                    e.get("entity_type", "function"),
                    e.get("language", "python"),
                    e.get("file_path", "test.py"),
                ),
            )
    if relations:
        for r in relations:
            conn.execute(
                """INSERT INTO code_relations
                       (from_entity_name, to_entity_name, relation_type)
                   VALUES (?, ?, ?)""",
                (
                    r["from_entity_name"],
                    r["to_entity_name"],
                    r.get("relation_type", "calls"),
                ),
            )
    conn.commit()
    conn.close()
    return db_path


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGenerateReport:
    def test_report_file_created(self, tmp_path):
        """generate_report() creates a Markdown file at the given path."""
        db = make_db(entities=[{"name": "foo"}, {"name": "bar"}])
        try:
            analytics = GraphAnalytics(db)
            report_path = analytics.generate_report(report_path=str(tmp_path / "GRAPH_REPORT.md"))
            assert Path(report_path).exists(), "Report file should exist after generate_report()"
        finally:
            os.unlink(db)

    def test_report_contains_overview(self, tmp_path):
        """Report contains ## Overview section with correct entity count."""
        db = make_db(entities=[{"name": "foo"}, {"name": "bar"}])
        try:
            analytics = GraphAnalytics(db)
            report_path = analytics.generate_report(report_path=str(tmp_path / "GRAPH_REPORT.md"))
            content = Path(report_path).read_text()
            assert "## Overview" in content, "Report must contain ## Overview"
            assert "**Entities**: 2" in content, "Overview should show entity count"
        finally:
            os.unlink(db)

    def test_report_contains_most_connected_entities(self, tmp_path):
        """Report contains ## Most Connected Entities section."""
        db = make_db(
            entities=[
                {"name": "alpha", "qualified_name": "mod.alpha"},
                {"name": "beta",  "qualified_name": "mod.beta"},
            ],
            relations=[
                {"from_entity_name": "mod.alpha", "to_entity_name": "mod.beta"},
            ],
        )
        try:
            analytics = GraphAnalytics(db)
            report_path = analytics.generate_report(report_path=str(tmp_path / "GRAPH_REPORT.md"))
            content = Path(report_path).read_text()
            assert "## Most Connected Entities" in content, \
                "Report must contain ## Most Connected Entities"
        finally:
            os.unlink(db)

    def test_report_empty_db(self, tmp_path):
        """generate_report() succeeds on an empty DB with placeholder text."""
        db = make_db()
        try:
            analytics = GraphAnalytics(db)
            report_path = analytics.generate_report(report_path=str(tmp_path / "GRAPH_REPORT.md"))
            content = Path(report_path).read_text()
            assert "## Overview" in content
            assert "**Entities**: 0" in content
        finally:
            os.unlink(db)

    def test_report_returns_path_string(self, tmp_path):
        """generate_report() returns the path of the written file as a string."""
        db = make_db()
        try:
            analytics = GraphAnalytics(db)
            dest = str(tmp_path / "out.md")
            result = analytics.generate_report(report_path=dest)
            assert result == dest, "Should return the path passed in"
        finally:
            os.unlink(db)


class TestDetectCommunities:
    """T17: community detection writes community column assignments."""

    def test_detect_communities_returns_count(self):
        """detect_communities() returns a positive integer on a connected graph."""
        db = make_db(
            entities=[
                {"name": "a", "qualified_name": "m.a"},
                {"name": "b", "qualified_name": "m.b"},
                {"name": "c", "qualified_name": "m.c"},
            ],
            relations=[
                {"from_entity_name": "m.a", "to_entity_name": "m.b"},
                {"from_entity_name": "m.b", "to_entity_name": "m.c"},
            ],
        )
        try:
            analytics = GraphAnalytics(db)
            count = analytics.detect_communities()
            assert isinstance(count, int), "Should return an int"
            assert count >= 1, "Should detect at least 1 community"
        finally:
            os.unlink(db)

    def test_detect_communities_writes_db(self):
        """After detect_communities(), code_entities has non-null community values."""
        db = make_db(
            entities=[
                {"name": "x", "qualified_name": "pkg.x"},
                {"name": "y", "qualified_name": "pkg.y"},
            ],
            relations=[
                {"from_entity_name": "pkg.x", "to_entity_name": "pkg.y"},
            ],
        )
        try:
            analytics = GraphAnalytics(db)
            analytics.detect_communities()
            import sqlite3
            conn = sqlite3.connect(db)
            rows = conn.execute(
                "SELECT COUNT(DISTINCT community) FROM code_entities WHERE community IS NOT NULL"
            ).fetchone()
            conn.close()
            assert rows[0] > 0, "community column should have non-null values after detection"
        finally:
            os.unlink(db)

    def test_detect_communities_empty_db(self):
        """detect_communities() on empty DB returns 0 without error."""
        db = make_db()
        try:
            analytics = GraphAnalytics(db)
            count = analytics.detect_communities()
            assert count == 0
        finally:
            os.unlink(db)

    def test_louvain_fallback(self, monkeypatch):
        """Falls back gracefully when leidenalg is not installed."""
        import builtins
        real_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if name in ("leidenalg", "igraph"):
                raise ImportError(f"mocked missing: {name}")
            return real_import(name, *args, **kwargs)

        monkeypatch.setattr(builtins, "__import__", mock_import)

        db = make_db(
            entities=[
                {"name": "p", "qualified_name": "m.p"},
                {"name": "q", "qualified_name": "m.q"},
            ],
            relations=[{"from_entity_name": "m.p", "to_entity_name": "m.q"}],
        )
        try:
            analytics = GraphAnalytics(db)
            count = analytics.detect_communities()
            assert count >= 1
        finally:
            os.unlink(db)


class TestSearchFts:
    """T19: FTS5 search with sanitization."""

    def test_search_fts_returns_results(self, tmp_path):
        """search_fts('parse') returns entities whose name contains 'parse'."""
        db = make_db(
            entities=[
                {"name": "parse_header", "qualified_name": "mod.parse_header"},
                {"name": "render_output", "qualified_name": "mod.render_output"},
            ]
        )
        try:
            analytics = GraphAnalytics(db)
            results = analytics.search_fts("parse")
            names = [r["name"] for r in results]
            assert "parse_header" in names, f"Expected parse_header in {names}"
        finally:
            os.unlink(db)

    def test_search_fts_has_score_field(self):
        """Each result dict contains a 'score' field."""
        db = make_db(entities=[{"name": "compute_sum", "qualified_name": "mod.compute_sum"}])
        try:
            analytics = GraphAnalytics(db)
            results = analytics.search_fts("compute")
            if results:
                assert "score" in results[0], "Result should include 'score'"
        finally:
            os.unlink(db)

    def test_search_fts_sanitize_strips_specials(self):
        """_sanitize_fts_query strips FTS5 special characters."""
        analytics = GraphAnalytics(":memory:")
        assert analytics._sanitize_fts_query("foo*bar") == "foo bar"
        assert analytics._sanitize_fts_query("hello(world)") == "hello world"
        assert analytics._sanitize_fts_query("  ") == ""

    def test_search_fts_empty_query_returns_empty(self):
        """Empty query (after sanitization) returns []."""
        db = make_db(entities=[{"name": "foo", "qualified_name": "mod.foo"}])
        try:
            analytics = GraphAnalytics(db)
            results = analytics.search_fts("")
            assert results == []
            results2 = analytics.search_fts("***")
            assert results2 == []
        finally:
            os.unlink(db)
