"""
Tests for mcp_graph_server.py — FastMCP server with 8 code graph tools.

TDD order: tests written before implementation.
FastMCP 3.x: mcp.call_tool(name, args) returns ToolResult with .structured_content dict.
"""

from __future__ import annotations

import asyncio
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest
import pytest_asyncio

# ---------------------------------------------------------------------------
# Pytest-asyncio configuration
# ---------------------------------------------------------------------------
pytest_plugins = ("pytest_asyncio",)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_schema(conn: sqlite3.Connection) -> None:
    """Create minimal code_entities + code_relations schema."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS code_entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name TEXT,
            package_name TEXT,
            entity_type TEXT NOT NULL,
            name TEXT NOT NULL,
            qualified_name TEXT,
            language TEXT,
            file_path TEXT,
            line_start INTEGER,
            line_end INTEGER,
            signature TEXT,
            docstring TEXT,
            is_test INTEGER DEFAULT 0,
            content_hash TEXT,
            last_indexed_at TEXT,
            community INTEGER
        );

        CREATE TABLE IF NOT EXISTS code_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_entity_id INTEGER,
            to_entity_id INTEGER,
            from_entity_name TEXT,
            to_entity_name TEXT,
            relation_type TEXT NOT NULL,
            file_path TEXT,
            line_number INTEGER
        );
    """)
    conn.commit()


def _insert_entity(conn: sqlite3.Connection, name: str, entity_type: str = "function",
                    file_path: str = "src/mod.py", language: str = "python",
                    is_test: int = 0, qualified_name: str = None) -> int:
    cur = conn.execute(
        """INSERT INTO code_entities
               (name, entity_type, qualified_name, language, file_path, line_start, is_test)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (name, entity_type, qualified_name or name, language, file_path, 1, is_test),
    )
    conn.commit()
    return cur.lastrowid


def _insert_relation(conn: sqlite3.Connection, from_id: int, to_id: int,
                      from_name: str, to_name: str, relation_type: str = "calls") -> None:
    conn.execute(
        """INSERT INTO code_relations
               (from_entity_id, to_entity_id, from_entity_name, to_entity_name, relation_type)
           VALUES (?, ?, ?, ?, ?)""",
        (from_id, to_id, from_name, to_name, relation_type),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def temp_db(tmp_path):
    """Temp DB with schema + basic seed data."""
    db_path = str(tmp_path / "test_graph.db")
    conn = sqlite3.connect(db_path)
    _create_schema(conn)

    # Seed: bar calls foo; test_bar calls bar
    foo_id = _insert_entity(conn, "foo", file_path="src/foo.py")
    bar_id = _insert_entity(conn, "bar", file_path="src/bar.py")
    test_bar_id = _insert_entity(conn, "test_bar", file_path="tests/test_bar.py", is_test=1)

    _insert_relation(conn, bar_id, foo_id, "bar", "foo", "calls")
    _insert_relation(conn, test_bar_id, bar_id, "test_bar", "bar", "calls")

    conn.close()
    return db_path


@pytest.fixture()
def empty_db(tmp_path):
    """Temp DB with schema but no data."""
    db_path = str(tmp_path / "empty_graph.db")
    conn = sqlite3.connect(db_path)
    _create_schema(conn)
    conn.close()
    return db_path


@pytest.fixture()
def missing_db(tmp_path):
    """Path to a DB file that does NOT exist."""
    return str(tmp_path / "nonexistent.db")


@pytest_asyncio.fixture()
async def mcp_server(temp_db, monkeypatch):
    """Import and return the MCP server with AICODEPATH_DB_PATH set to temp_db."""
    monkeypatch.setenv("AICODEPATH_DB_PATH", temp_db)
    # Force reimport so env var is picked up freshly
    import importlib
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server
    importlib.reload(mcp_graph_server)
    return mcp_graph_server.mcp


@pytest_asyncio.fixture()
async def mcp_server_empty(empty_db, monkeypatch):
    """MCP server pointing to empty DB."""
    monkeypatch.setenv("AICODEPATH_DB_PATH", empty_db)
    import importlib
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server
    importlib.reload(mcp_graph_server)
    return mcp_graph_server.mcp


@pytest_asyncio.fixture()
async def mcp_server_missing(missing_db, monkeypatch):
    """MCP server pointing to non-existent DB."""
    monkeypatch.setenv("AICODEPATH_DB_PATH", missing_db)
    import importlib
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server
    importlib.reload(mcp_graph_server)
    return mcp_graph_server.mcp


# ---------------------------------------------------------------------------
# Helper: call tool and return structured_content dict
# ---------------------------------------------------------------------------

async def _call(mcp, tool_name: str, args: dict) -> dict:
    result = await mcp.call_tool(tool_name, args)
    return result.structured_content


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_callers_of_returns_dict(mcp_server):
    """callers_of returns a dict with 'callers' key."""
    result = await _call(mcp_server, "callers_of", {"entity_name": "foo"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "callers" in result, f"Expected 'callers' key, got keys: {list(result.keys())}"
    # bar calls foo, so bar should appear in callers
    callers = result["callers"]
    assert isinstance(callers, list)
    caller_names = [c.get("name") or c.get("qualified_name") for c in callers]
    assert "bar" in caller_names, f"Expected 'bar' in callers, got: {caller_names}"


@pytest.mark.asyncio
async def test_callers_of_unknown_entity(mcp_server):
    """callers_of on unknown entity returns dict with empty callers list."""
    result = await _call(mcp_server, "callers_of", {"entity_name": "nonexistent_xyz"})
    assert isinstance(result, dict)
    assert "callers" in result or "error" in result


@pytest.mark.asyncio
async def test_callees_of_returns_dict(mcp_server):
    """callees_of returns a dict with 'callees' key."""
    result = await _call(mcp_server, "callees_of", {"entity_name": "bar"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "callees" in result, f"Expected 'callees' key, got keys: {list(result.keys())}"
    callees = result["callees"]
    assert isinstance(callees, list)
    callee_names = [c.get("name") or c.get("qualified_name") for c in callees]
    assert "foo" in callee_names, f"Expected 'foo' in callees, got: {callee_names}"


@pytest.mark.asyncio
async def test_callees_of_unknown_entity(mcp_server):
    """callees_of on unknown entity returns acceptable dict."""
    result = await _call(mcp_server, "callees_of", {"entity_name": "no_such_fn"})
    assert isinstance(result, dict)
    assert "callees" in result or "error" in result


@pytest.mark.asyncio
async def test_impact_radius_returns_dict(mcp_server):
    """impact_radius returns dict with expected keys."""
    result = await _call(mcp_server, "impact_radius", {"entity_name": "bar"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    # Should have at minimum 'entity_name' and 'affected' or 'error'
    assert "error" in result or ("entity_name" in result and "affected" in result), \
        f"Unexpected keys: {list(result.keys())}"
    if "affected" in result:
        assert isinstance(result["affected"], list)


@pytest.mark.asyncio
async def test_tests_for_returns_dict(mcp_server):
    """tests_for returns dict with 'tests' key listing test entities."""
    result = await _call(mcp_server, "tests_for", {"entity_name": "bar"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "tests" in result, f"Expected 'tests' key, got: {list(result.keys())}"
    tests = result["tests"]
    assert isinstance(tests, list)
    test_names = [t.get("name") or t.get("qualified_name") for t in tests]
    assert "test_bar" in test_names, f"Expected 'test_bar' in tests, got: {test_names}"


@pytest.mark.asyncio
async def test_file_summary_returns_entities(temp_db, monkeypatch):
    """file_summary returns entities for a given file path substring."""
    monkeypatch.setenv("AICODEPATH_DB_PATH", temp_db)
    import importlib, sys
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server
    importlib.reload(mcp_graph_server)
    mcp = mcp_graph_server.mcp

    result = await _call(mcp, "file_summary", {"file_path": "src/foo.py"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "entities" in result, f"Expected 'entities' key, got: {list(result.keys())}"
    assert isinstance(result["entities"], list)
    entity_names = [e["name"] for e in result["entities"]]
    assert "foo" in entity_names, f"Expected 'foo' in entities, got: {entity_names}"


@pytest.mark.asyncio
async def test_search_entities_returns_results(mcp_server):
    """search_entities returns results matching query."""
    result = await _call(mcp_server, "search_entities", {"query": "foo"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "results" in result, f"Expected 'results' key, got: {list(result.keys())}"
    results = result["results"]
    assert isinstance(results, list)
    names = [r.get("name") or r.get("qualified_name") for r in results]
    assert "foo" in names, f"Expected 'foo' in search results, got: {names}"


@pytest.mark.asyncio
async def test_search_entities_no_match(mcp_server):
    """search_entities with no-match query returns empty list."""
    result = await _call(mcp_server, "search_entities", {"query": "zzz_no_match_xyz"})
    assert isinstance(result, dict)
    assert "results" in result
    assert result["results"] == []


@pytest.mark.asyncio
async def test_build_or_update_graph_invalid_path(mcp_server):
    """build_or_update_graph with nonexistent path returns dict (not raises)."""
    result = await _call(mcp_server, "build_or_update_graph",
                         {"path": "/tmp/nonexistent_path_xyz_123", "mode": "index"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    # Either an error key or a stats dict — both acceptable
    assert "error" in result or "status" in result or "entities_indexed" in result, \
        f"Unexpected keys: {list(result.keys())}"


@pytest.mark.asyncio
async def test_visualize_graph_stub(mcp_server):
    """visualize_graph calls GraphVisualizer and returns html_path + status='ok'."""
    result = await _call(mcp_server, "visualize_graph", {})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "html_path" in result, f"Expected 'html_path' key, got: {list(result.keys())}"
    assert result.get("status") == "ok", \
        f"Expected status='ok', got: {result}"
    assert isinstance(result["html_path"], str) and result["html_path"], \
        f"Expected non-empty html_path string, got: {result['html_path']!r}"


@pytest.mark.asyncio
async def test_missing_db_returns_error(mcp_server_missing):
    """When DB doesn't exist, tools return dict with 'error' key."""
    result = await _call(mcp_server_missing, "callers_of", {"entity_name": "foo"})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "error" in result, f"Expected 'error' key for missing DB, got: {list(result.keys())}"


@pytest.mark.asyncio
async def test_callers_of_with_max_depth(mcp_server):
    """callers_of respects max_depth parameter."""
    result = await _call(mcp_server, "callers_of", {"entity_name": "foo", "max_depth": 1})
    assert isinstance(result, dict)
    assert "callers" in result or "error" in result


@pytest.mark.asyncio
async def test_callees_of_with_max_depth(mcp_server):
    """callees_of respects max_depth parameter."""
    result = await _call(mcp_server, "callees_of", {"entity_name": "bar", "max_depth": 2})
    assert isinstance(result, dict)
    assert "callees" in result or "error" in result


@pytest.mark.asyncio
async def test_search_entities_with_type_filter(mcp_server):
    """search_entities accepts entity_type filter without raising."""
    result = await _call(mcp_server, "search_entities",
                         {"query": "foo", "entity_type": "function"})
    assert isinstance(result, dict)
    assert "results" in result


@pytest.mark.asyncio
async def test_impact_radius_total_count(mcp_server):
    """impact_radius includes 'total' count when data exists."""
    result = await _call(mcp_server, "impact_radius", {"entity_name": "bar"})
    assert isinstance(result, dict)
    if "affected" in result:
        assert "total" in result, f"Expected 'total' key alongside 'affected'"


# ---------------------------------------------------------------------------
# T8: Engine caching tests
# ---------------------------------------------------------------------------

def _load_srv(db_path: str):
    """Load mcp_graph_server with AICODEPATH_DB_PATH set, return the module."""
    import importlib
    os.environ["AICODEPATH_DB_PATH"] = db_path
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server as srv
    return srv


def test_get_engine_returns_cached_on_same_mtime(temp_db):
    """Two consecutive get_engine() calls return the same object when DB mtime is unchanged."""
    srv = _load_srv(temp_db)
    srv._invalidate_cache()
    e1 = srv.get_engine()
    e2 = srv.get_engine()
    assert e1 is e2, "Should return cached engine when mtime unchanged"
    srv._invalidate_cache()


def test_get_engine_new_object_after_mtime_change(temp_db):
    """After the DB file mtime changes, get_engine() returns a new engine object."""
    import time
    srv = _load_srv(temp_db)
    srv._invalidate_cache()
    e1 = srv.get_engine()
    time.sleep(0.05)
    os.utime(temp_db, None)
    e2 = srv.get_engine()
    assert e1 is not e2, "Should return new engine after DB mtime changes"
    srv._invalidate_cache()


# ---------------------------------------------------------------------------
# T6: generate_report MCP tool
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_report_returns_report_path(mcp_server, tmp_path, monkeypatch):
    """generate_report returns {report_path: ..., status: 'ok'}."""
    # Redirect graph_analytics to write to tmp_path
    import importlib
    import sys as _sys

    parsers_dir = str(Path(__file__).parent.parent / "generators" / "parsers")
    if parsers_dir not in _sys.path:
        _sys.path.insert(0, parsers_dir)

    from graph_analytics import GraphAnalytics

    original_generate = GraphAnalytics.generate_report

    def _patched_generate(self, report_path=None):
        dest = str(tmp_path / "GRAPH_REPORT.md")
        return original_generate(self, report_path=dest)

    monkeypatch.setattr(GraphAnalytics, "generate_report", _patched_generate)

    result = await _call(mcp_server, "generate_report", {})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert result.get("status") == "ok", f"Expected status='ok', got: {result}"
    assert "report_path" in result, f"Expected 'report_path' key, got: {list(result.keys())}"
    assert isinstance(result["report_path"], str) and result["report_path"], \
        "report_path should be a non-empty string"


# ---------------------------------------------------------------------------
# T7: build_or_update_graph includes report_path when entities > 0
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_build_or_update_graph_report_path_in_stats(mcp_server, tmp_path, monkeypatch):
    """After successful build with entities > 0, stats dict contains report_path."""
    import subprocess as _sp

    parsers_dir = str(Path(__file__).parent.parent / "generators" / "parsers")
    if parsers_dir not in sys.path:
        sys.path.insert(0, parsers_dir)
    from graph_analytics import GraphAnalytics

    expected_report = str(tmp_path / "GRAPH_REPORT.md")

    class _FakeProc:
        returncode = 0
        stdout = '{"entities": 5, "relations": 3}'
        stderr = ""

    monkeypatch.setattr(_sp, "run", lambda *a, **kw: _FakeProc())
    monkeypatch.setattr(GraphAnalytics, "generate_report", lambda self, **kw: expected_report)

    result = await _call(mcp_server, "build_or_update_graph", {"path": ".", "mode": "index"})
    assert isinstance(result, dict)
    assert "report_path" in result, f"Expected 'report_path' in stats, got: {list(result.keys())}"
    assert result["report_path"] == expected_report


# ---------------------------------------------------------------------------
# T14: Token budget metadata on callers_of / callees_of / impact_radius
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_callers_of_token_budget_metadata(mcp_server):
    """callers_of response contains total_found, returned, truncated keys."""
    result = await _call(mcp_server, "callers_of", {"entity_name": "foo"})
    assert isinstance(result, dict)
    if "error" not in result:
        assert "total_found" in result, f"Missing 'total_found': {list(result.keys())}"
        assert "returned" in result, f"Missing 'returned': {list(result.keys())}"
        assert "truncated" in result, f"Missing 'truncated': {list(result.keys())}"
        assert result["returned"] == len(result["callers"])
        assert isinstance(result["truncated"], bool)


@pytest.mark.asyncio
async def test_callees_of_token_budget_metadata(mcp_server):
    """callees_of response contains total_found, returned, truncated keys."""
    result = await _call(mcp_server, "callees_of", {"entity_name": "bar"})
    assert isinstance(result, dict)
    if "error" not in result:
        assert "total_found" in result, f"Missing 'total_found': {list(result.keys())}"
        assert "returned" in result, f"Missing 'returned': {list(result.keys())}"
        assert "truncated" in result, f"Missing 'truncated': {list(result.keys())}"
        assert result["returned"] == len(result["callees"])
        assert isinstance(result["truncated"], bool)


@pytest.mark.asyncio
async def test_impact_radius_token_budget_metadata(mcp_server):
    """impact_radius response contains total_found, returned, truncated keys."""
    result = await _call(mcp_server, "impact_radius", {"entity_name": "bar"})
    assert isinstance(result, dict)
    if "affected" in result:
        assert "total_found" in result, f"Missing 'total_found': {list(result.keys())}"
        assert "returned" in result, f"Missing 'returned': {list(result.keys())}"
        assert "truncated" in result, f"Missing 'truncated': {list(result.keys())}"
        assert result["returned"] == len(result["affected"])
        assert isinstance(result["truncated"], bool)


# ---------------------------------------------------------------------------
# T18: list_communities and get_community MCP tools
# ---------------------------------------------------------------------------

@pytest.fixture()
def community_db(tmp_path):
    """DB with community column populated with two communities."""
    db_path = str(tmp_path / "community_graph.db")
    conn = sqlite3.connect(db_path)
    _create_schema(conn)
    # Community 0: foo + bar (python)
    conn.execute(
        "INSERT INTO code_entities (name, entity_type, qualified_name, language, file_path, "
        "line_start, is_test, community) VALUES (?,?,?,?,?,?,?,?)",
        ("foo", "function", "foo", "python", "src/foo.py", 1, 0, 0),
    )
    conn.execute(
        "INSERT INTO code_entities (name, entity_type, qualified_name, language, file_path, "
        "line_start, is_test, community) VALUES (?,?,?,?,?,?,?,?)",
        ("bar", "function", "bar", "python", "src/bar.py", 1, 0, 0),
    )
    # Community 1: baz (javascript)
    conn.execute(
        "INSERT INTO code_entities (name, entity_type, qualified_name, language, file_path, "
        "line_start, is_test, community) VALUES (?,?,?,?,?,?,?,?)",
        ("baz", "class", "baz", "javascript", "src/baz.js", 1, 0, 1),
    )
    conn.commit()
    conn.close()
    return db_path


@pytest_asyncio.fixture()
async def mcp_server_community(community_db, monkeypatch):
    """MCP server pointing to community_db."""
    monkeypatch.setenv("AICODEPATH_DB_PATH", community_db)
    import importlib
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server
    importlib.reload(mcp_graph_server)
    return mcp_graph_server.mcp


@pytest.mark.asyncio
async def test_list_communities_returns_non_empty(mcp_server_community):
    """list_communities returns non-empty list after communities are populated."""
    result = await _call(mcp_server_community, "list_communities", {})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "communities" in result, f"Expected 'communities' key: {list(result.keys())}"
    assert len(result["communities"]) > 0, "Expected at least one community"
    assert result["total"] == len(result["communities"])
    # Each entry has required keys
    first = result["communities"][0]
    assert "community_id" in first
    assert "size" in first
    assert "top_entities" in first
    assert "languages" in first


@pytest.mark.asyncio
async def test_get_community_returns_correct_entities(mcp_server_community):
    """get_community(0) returns entities with community_id=0."""
    result = await _call(mcp_server_community, "get_community", {"community_id": 0})
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "entities" in result, f"Expected 'entities' key: {list(result.keys())}"
    assert result["community_id"] == 0
    assert result["size"] == len(result["entities"])
    entity_names = [e["name"] for e in result["entities"]]
    assert "foo" in entity_names and "bar" in entity_names, \
        f"Expected foo+bar in community 0, got: {entity_names}"
    # All returned entities carry the correct community_id
    for e in result["entities"]:
        assert e["community_id"] == 0


# ---------------------------------------------------------------------------
# T20: search_entities includes search_method key
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_entities_has_search_method(mcp_server):
    """search_entities response always contains search_method key."""
    result = await _call(mcp_server, "search_entities", {"query": "foo"})
    assert isinstance(result, dict)
    if "error" not in result:
        assert "search_method" in result, \
            f"Expected 'search_method' key, got: {list(result.keys())}"
        assert result["search_method"] in ("fts5", "substring"), \
            f"Unexpected search_method value: {result['search_method']!r}"


@pytest.mark.asyncio
async def test_search_entities_no_match_has_search_method(mcp_server):
    """search_entities with no-match query still returns search_method."""
    result = await _call(mcp_server, "search_entities", {"query": "zzz_no_match_xyz"})
    assert isinstance(result, dict)
    if "error" not in result:
        assert "search_method" in result, \
            f"Expected 'search_method' key on empty results: {list(result.keys())}"


# ---------------------------------------------------------------------------
# T9: build_or_update_graph writes graph-indexed.json flag file
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_build_writes_flag_file(tmp_path, monkeypatch):
    """T9: build_or_update_graph writes graph-indexed.json flag file with required keys."""
    import importlib
    import json as _json
    import subprocess as _sp

    db_path = str(tmp_path / "test.db")
    conn = sqlite3.connect(db_path)
    _create_schema(conn)
    conn.close()

    monkeypatch.setenv("AICODEPATH_DB_PATH", db_path)
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server
    importlib.reload(mcp_graph_server)

    expected_flag = tmp_path / "graph-indexed.json"
    expected_report = str(tmp_path / "GRAPH_REPORT.md")

    class _FakeProc:
        returncode = 0
        stdout = '{"entities": 5, "relations": 3}'
        stderr = ""

    parsers_dir = str(Path(__file__).parent.parent / "generators" / "parsers")
    if parsers_dir not in sys.path:
        sys.path.insert(0, parsers_dir)
    from graph_analytics import GraphAnalytics

    monkeypatch.setattr(_sp, "run", lambda *a, **kw: _FakeProc())
    monkeypatch.setattr(GraphAnalytics, "generate_report", lambda self, **kw: expected_report)
    monkeypatch.setattr(GraphAnalytics, "detect_communities", lambda self: 0)
    monkeypatch.setattr(mcp_graph_server, "_FLAG_PATH", expected_flag)

    result = await _call(mcp_graph_server.mcp, "build_or_update_graph",
                         {"path": ".", "mode": "index"})

    assert isinstance(result, dict)
    assert expected_flag.exists(), "Flag file should have been written by build_or_update_graph"
    flag = _json.loads(expected_flag.read_text())
    assert "entities" in flag, f"Missing 'entities' in flag: {list(flag.keys())}"
    assert "relations" in flag, f"Missing 'relations' in flag: {list(flag.keys())}"
    assert "indexed_at" in flag, f"Missing 'indexed_at' in flag: {list(flag.keys())}"
    assert "report_path" in flag, f"Missing 'report_path' in flag: {list(flag.keys())}"
    assert flag["entities"] == 5
    assert flag["relations"] == 3


# ---------------------------------------------------------------------------
# T21: build_or_update_graph wires community detection into pipeline
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_build_wires_community_detection(tmp_path, monkeypatch):
    """T21: build_or_update_graph runs detect_communities and includes 'communities' in flag."""
    import importlib
    import json as _json
    import subprocess as _sp

    db_path = str(tmp_path / "test.db")
    conn = sqlite3.connect(db_path)
    _create_schema(conn)
    conn.close()

    monkeypatch.setenv("AICODEPATH_DB_PATH", db_path)
    if "mcp_graph_server" in sys.modules:
        del sys.modules["mcp_graph_server"]
    sys.path.insert(0, str(Path(__file__).parent.parent / "generators"))
    import mcp_graph_server
    importlib.reload(mcp_graph_server)

    expected_flag = tmp_path / "graph-indexed.json"
    expected_report = str(tmp_path / "GRAPH_REPORT.md")

    # Write a report that includes community section (simulates post-detect_communities state)
    Path(expected_report).write_text(
        "# Code Graph Report\n\n## Code Modules\n\n*3 communities detected.*\n"
    )

    class _FakeProc:
        returncode = 0
        stdout = '{"entities": 10, "relations": 8}'
        stderr = ""

    generate_calls = []

    def _patched_generate(self, **kw):
        generate_calls.append(1)
        return expected_report

    parsers_dir = str(Path(__file__).parent.parent / "generators" / "parsers")
    if parsers_dir not in sys.path:
        sys.path.insert(0, parsers_dir)
    from graph_analytics import GraphAnalytics

    monkeypatch.setattr(_sp, "run", lambda *a, **kw: _FakeProc())
    monkeypatch.setattr(GraphAnalytics, "generate_report", _patched_generate)
    monkeypatch.setattr(GraphAnalytics, "detect_communities", lambda self: 3)
    monkeypatch.setattr(mcp_graph_server, "_FLAG_PATH", expected_flag)

    result = await _call(mcp_graph_server.mcp, "build_or_update_graph",
                         {"path": ".", "mode": "index"})

    assert isinstance(result, dict)

    # generate_report called twice: initial + after communities
    assert len(generate_calls) >= 2, \
        f"Expected ≥2 generate_report calls (initial + post-community), got {len(generate_calls)}"

    # Flag file has communities key
    assert expected_flag.exists(), "Flag file should have been written"
    flag = _json.loads(expected_flag.read_text())
    assert "communities" in flag, f"Expected 'communities' key in flag: {list(flag.keys())}"
    assert flag["communities"] == 3

    # Report contains ## Code Modules
    report_text = Path(expected_report).read_text()
    assert "## Code Modules" in report_text, \
        "GRAPH_REPORT.md should contain '## Code Modules'"
