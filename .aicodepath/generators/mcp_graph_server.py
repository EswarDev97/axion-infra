"""
mcp_graph_server.py — FastMCP server with 8 code graph tools.

Delegates to GraphEngine for AST-based traversal of code entities and
relationships. Requires the aicodepath SQLite database with code_entities
and code_relations tables (built via ast_parser.py).

Usage:
    python mcp_graph_server.py            # stdio transport (default)
    AICODEPATH_DB_PATH=/path/to/db python mcp_graph_server.py
"""

from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Path setup — add parsers directory so graph_engine can be imported
# ---------------------------------------------------------------------------
_PARSERS_DIR = Path(__file__).parent / "parsers"
sys.path.insert(0, str(_PARSERS_DIR))

from graph_engine import GraphEngine  # noqa: E402  (after sys.path manipulation)

# ---------------------------------------------------------------------------
# Engine cache (mtime-invalidated; safe for single-threaded stdio MCP server)
# ---------------------------------------------------------------------------

_cached_engine: Optional[GraphEngine] = None
_cached_mtime: Optional[float] = None

# Flag file written after successful indexing — read by nudge hook + session-start
_FLAG_PATH = Path(__file__).parent.parent.parent / "aicodepath-docs" / "state" / "graph-indexed.json"


def _invalidate_cache() -> None:
    global _cached_engine, _cached_mtime
    _cached_engine = None
    _cached_mtime = None


def _write_graph_flag(stats: dict) -> None:
    """Write graph-indexed.json flag file after successful build.

    Captures entities, relations, indexed_at, report_path, and (when present)
    communities from ``stats``. Failures are swallowed so they never block the
    build response.
    """
    try:
        _FLAG_PATH.parent.mkdir(parents=True, exist_ok=True)
        payload: dict = {
            "entities": stats.get("entities", 0),
            "relations": stats.get("relations", 0),
            "indexed_at": datetime.now(timezone.utc).isoformat(),
            "report_path": stats.get("report_path", ""),
        }
        if "communities" in stats:
            payload["communities"] = stats["communities"]
        _FLAG_PATH.write_text(json.dumps(payload), encoding="utf-8")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# MCP server instance
# ---------------------------------------------------------------------------
mcp = FastMCP(
    "aicodepath-code-graph",
    instructions=(
        "Code graph analysis server. Provides AST-based traversal of code "
        "entities and relationships. Use build_or_update_graph first to index "
        "the codebase, then query with callers_of, callees_of, impact_radius, "
        "tests_for, file_summary, and search_entities."
    ),
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_AST_PARSER_PATH = str(_PARSERS_DIR / "ast_parser.py")


def get_db_path() -> str:
    """Return the DB path from env or a sensible project-root default."""
    return os.environ.get(
        "AICODEPATH_DB_PATH",
        str(Path(__file__).parent.parent.parent / "aicodepath-docs" / "aicodepath.db"),
    )


def _db_exists() -> bool:
    """Return True if the DB file currently exists on disk."""
    return Path(get_db_path()).exists()


def get_engine() -> GraphEngine:
    """Return a GraphEngine, reusing the cached instance if DB mtime unchanged."""
    global _cached_engine, _cached_mtime
    db_path = get_db_path()
    try:
        current_mtime = Path(db_path).stat().st_mtime
    except OSError:
        _invalidate_cache()
        engine = GraphEngine(db_path)
        engine.load_graph()
        return engine
    if _cached_engine is not None and _cached_mtime == current_mtime:
        return _cached_engine
    engine = GraphEngine(db_path)
    engine.load_graph()
    _cached_engine = engine
    _cached_mtime = current_mtime
    return engine


_MISSING_DB_RESPONSE = {
    "error": "Graph DB not found. Run build_or_update_graph first.",
    "entities": [],
}


# ---------------------------------------------------------------------------
# Tool: callers_of
# ---------------------------------------------------------------------------

@mcp.tool()
def callers_of(entity_name: str, max_depth: int = 5, max_results: int = 50) -> dict:
    """Find all entities that call the given entity.

    Returns a dict with 'callers' (list of entity dicts with qualified_name,
    name, entity_type, language, file_path, depth), 'entity_name',
    'total_found', 'returned', and 'truncated'.

    max_results: cap on results returned (0 = all).
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        engine = get_engine()
        all_results = engine.callers_of(entity_name, max_depth=max_depth, max_results=0)
        total_found = len(all_results)
        callers = all_results[:max_results] if max_results > 0 else all_results
        returned = len(callers)
        return {
            "entity_name": entity_name,
            "callers": callers,
            "total_found": total_found,
            "returned": returned,
            "truncated": returned < total_found,
        }
    except Exception as exc:
        return {"error": str(exc), "entity_name": entity_name, "callers": []}


# ---------------------------------------------------------------------------
# Tool: callees_of
# ---------------------------------------------------------------------------

@mcp.tool()
def callees_of(entity_name: str, max_depth: int = 5, max_results: int = 50) -> dict:
    """Find all entities that this entity calls.

    Returns a dict with 'callees' (list of entity dicts with qualified_name,
    name, entity_type, language, file_path, depth), 'entity_name',
    'total_found', 'returned', and 'truncated'.

    max_results: cap on results returned (0 = all).
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        engine = get_engine()
        all_results = engine.callees_of(entity_name, max_depth=max_depth, max_results=0)
        total_found = len(all_results)
        callees = all_results[:max_results] if max_results > 0 else all_results
        returned = len(callees)
        return {
            "entity_name": entity_name,
            "callees": callees,
            "total_found": total_found,
            "returned": returned,
            "truncated": returned < total_found,
        }
    except Exception as exc:
        return {"error": str(exc), "entity_name": entity_name, "callees": []}


# ---------------------------------------------------------------------------
# Tool: impact_radius
# ---------------------------------------------------------------------------

@mcp.tool()
def impact_radius(entity_name: str, max_hops: int = 5, max_results: int = 50) -> dict:
    """Compute all entities affected if this entity changes.

    Returns a dict with 'entity_name', 'affected' (list of entity dicts),
    'hop_counts' (mapping hop distance → node count), 'total',
    'total_found', 'returned', and 'truncated'.

    max_results: cap on 'affected' list returned (0 = all).
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        engine = get_engine()
        result = engine.impact_radius(entity_name, max_hops=max_hops, max_results=0)
        total_found = result["total"]
        if max_results > 0:
            result["affected"] = result["affected"][:max_results]
        returned = len(result["affected"])
        result["total_found"] = total_found
        result["returned"] = returned
        result["truncated"] = returned < total_found
        return result
    except Exception as exc:
        return {"error": str(exc), "entity_name": entity_name, "affected": [], "total": 0}


# ---------------------------------------------------------------------------
# Tool: tests_for
# ---------------------------------------------------------------------------

@mcp.tool()
def tests_for(entity_name: str) -> dict:
    """Find test entities that cover this entity.

    Returns a dict with 'entity_name' and 'tests' (list of
    {qualified_name, name, file_path}).
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        engine = get_engine()
        results = engine.tests_for(entity_name)
        return {"entity_name": entity_name, "tests": results}
    except Exception as exc:
        return {"error": str(exc), "entity_name": entity_name, "tests": []}


# ---------------------------------------------------------------------------
# Tool: file_summary
# ---------------------------------------------------------------------------

@mcp.tool()
def file_summary(file_path: str) -> dict:
    """List all entities defined in a file.

    Queries code_entities for rows whose file_path contains the given
    substring and returns them ordered by line_start.

    Returns a dict with 'file_path' and 'entities' (list of
    {name, entity_type, line_start, line_end}).
    """
    db_path = get_db_path()
    if not Path(db_path).exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        conn = sqlite3.connect(db_path)
        rows = conn.execute(
            """SELECT name, entity_type, line_start, line_end
               FROM code_entities
               WHERE file_path LIKE ?
               ORDER BY line_start""",
            (f"%{file_path}%",),
        ).fetchall()
        conn.close()
        return {
            "file_path": file_path,
            "entities": [
                {
                    "name": r[0],
                    "entity_type": r[1],
                    "line_start": r[2],
                    "line_end": r[3],
                }
                for r in rows
            ],
        }
    except Exception as exc:
        return {"error": str(exc), "file_path": file_path, "entities": []}


# ---------------------------------------------------------------------------
# Tool: search_entities
# ---------------------------------------------------------------------------

@mcp.tool()
def search_entities(
    query: str,
    entity_type: Optional[str] = None,
    language: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """Search for entities by name.

    Tries FTS5 full-text search first; falls back to substring search.
    Returns a dict with 'query', 'results' (list of entity dicts sorted
    by relevance score descending), and 'search_method' ("fts5" or
    "substring").
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)

    # Try FTS5 via GraphAnalytics first
    try:
        from graph_analytics import GraphAnalytics  # noqa: PLC0415
        analytics = GraphAnalytics(get_db_path())
        fts_results = analytics.search_fts(
            query, entity_type=entity_type, language=language, limit=limit
        )
        if fts_results:
            return {"query": query, "results": fts_results, "search_method": "fts5"}
    except Exception:
        pass

    # Fallback: substring search via GraphEngine
    try:
        engine = get_engine()
        results = engine.search(query, entity_type=entity_type, language=language, limit=limit)
        return {"query": query, "results": results, "search_method": "substring"}
    except Exception as exc:
        return {"error": str(exc), "query": query, "results": [], "search_method": "substring"}


# ---------------------------------------------------------------------------
# Tool: generate_report
# ---------------------------------------------------------------------------

@mcp.tool()
def generate_report() -> dict:
    """Generate a Markdown analytics report for the code graph.

    Runs 5 SQL queries (god nodes, language distribution, relation types,
    cross-file edges, community summaries) and writes the result to
    ``aicodepath-docs/GRAPH_REPORT.md`` in the project root.

    Returns a dict with ``report_path`` and ``status: 'ok'`` on success,
    or ``error`` and ``status: 'error'`` on failure.
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        from graph_analytics import GraphAnalytics  # noqa: PLC0415
        analytics = GraphAnalytics(get_db_path())
        report_path = analytics.generate_report()
        return {"report_path": report_path, "status": "ok"}
    except Exception as exc:
        return {"error": str(exc), "status": "error"}


# ---------------------------------------------------------------------------
# Tool: list_communities
# ---------------------------------------------------------------------------

@mcp.tool()
def list_communities() -> dict:
    """List all code communities detected in the graph.

    Returns a dict with 'communities' (list of {community_id, size,
    top_entities, languages}) and 'total'.  Requires build_or_update_graph
    to have been run so that community detection has populated the
    code_entities.community column.
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute("""
                SELECT community, COUNT(*) AS size,
                       GROUP_CONCAT(DISTINCT language) AS languages
                FROM code_entities
                WHERE community IS NOT NULL
                GROUP BY community
                ORDER BY size DESC
            """).fetchall()
            communities = []
            for r in rows:
                top = conn.execute("""
                    SELECT e.name,
                           (SELECT COUNT(*) FROM code_relations cr
                            WHERE cr.from_entity_name = e.qualified_name
                               OR cr.to_entity_name   = e.qualified_name
                           ) AS degree
                    FROM code_entities e
                    WHERE e.community = ?
                    ORDER BY degree DESC
                    LIMIT 5
                """, (r["community"],)).fetchall()
                communities.append({
                    "community_id": r["community"],
                    "size": r["size"],
                    "top_entities": [t["name"] for t in top],
                    "languages": [ln for ln in (r["languages"] or "").split(",") if ln],
                })
            return {"communities": communities, "total": len(communities)}
        finally:
            conn.close()
    except Exception as exc:
        return {"error": str(exc), "communities": []}


# ---------------------------------------------------------------------------
# Tool: get_community
# ---------------------------------------------------------------------------

@mcp.tool()
def get_community(community_id: int) -> dict:
    """Get all entities belonging to a specific community.

    Returns a dict with 'community_id', 'entities' (list of entity dicts),
    'size', and 'languages'.  Use list_communities to discover available IDs.
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute("""
                SELECT qualified_name, name, entity_type, language, file_path
                FROM code_entities
                WHERE community = ?
                ORDER BY name
            """, (community_id,)).fetchall()
            entities = [
                {
                    "qualified_name": r["qualified_name"],
                    "name": r["name"],
                    "entity_type": r["entity_type"],
                    "language": r["language"],
                    "file_path": r["file_path"],
                    "community_id": community_id,
                }
                for r in rows
            ]
            languages = list({r["language"] for r in rows if r["language"]})
            return {
                "community_id": community_id,
                "entities": entities,
                "size": len(entities),
                "languages": languages,
            }
        finally:
            conn.close()
    except Exception as exc:
        return {"error": str(exc), "community_id": community_id, "entities": []}


# ---------------------------------------------------------------------------
# Tool: build_or_update_graph
# ---------------------------------------------------------------------------

@mcp.tool()
def build_or_update_graph(path: str = ".", mode: str = "index") -> dict:
    """Trigger graph indexing via ast_parser.py.

    mode values:
      'index'        — index new/modified files only
      'reindex'      — full re-index (clears existing data)
      'diff-reindex' — re-index only files changed since last run

    Returns a stats dict or an error dict on failure.
    """
    valid_modes = {"index", "reindex", "diff-reindex"}
    if mode not in valid_modes:
        return {"error": f"Invalid mode '{mode}'. Must be one of: {sorted(valid_modes)}"}

    db_path = get_db_path()

    # 'reindex' means full codebase rebuild: clear CR-GRAPH rows then run --index.
    # ast_parser.py's --reindex flag is single-file only and cannot be used for
    # directories — using it with '.' silently skips and returns indexed=0.
    if mode == "reindex":
        try:
            conn = __import__("sqlite3").connect(db_path)
            conn.execute("DELETE FROM code_relations WHERE from_entity_name IN "
                         "(SELECT qualified_name FROM code_entities WHERE cr_number='CR-GRAPH')")
            conn.execute("DELETE FROM code_entities WHERE cr_number='CR-GRAPH'")
            conn.commit()
            conn.close()
        except Exception as exc:
            return {"error": f"Failed to clear graph data: {exc}"}
        flag = "--index"
    else:
        flag = f"--{mode}"

    try:
        proc = subprocess.run(
            [sys.executable, _AST_PARSER_PATH, flag, path, "--db-path", db_path],
            capture_output=True,
            text=True,
            timeout=300,
        )
        # ast_parser.py writes a JSON stats dict to stdout on success
        stdout = proc.stdout.strip()
        if proc.returncode == 0 and stdout:
            try:
                stats = json.loads(stdout)
                _invalidate_cache()
                if stats.get("entities", 0) > 0:
                    try:
                        from graph_analytics import GraphAnalytics  # noqa: PLC0415
                        analytics = GraphAnalytics(get_db_path())
                        stats["report_path"] = analytics.generate_report()
                        # T21: detect communities, then re-generate report with summaries
                        try:
                            community_count = analytics.detect_communities()
                            stats["communities"] = community_count
                            stats["report_path"] = analytics.generate_report()
                        except Exception:
                            pass
                    except Exception:
                        pass
                    # T9: write flag file after report + community detection
                    _write_graph_flag(stats)
                return stats
            except json.JSONDecodeError:
                return {"status": "completed", "output": stdout}
        else:
            return {
                "error": proc.stderr.strip() or f"ast_parser exited with code {proc.returncode}",
                "returncode": proc.returncode,
                "stdout": stdout,
            }
    except subprocess.TimeoutExpired:
        return {"error": "Indexing timed out after 120 seconds", "path": path}
    except FileNotFoundError:
        return {"error": f"ast_parser.py not found at {_AST_PARSER_PATH}"}
    except Exception as exc:
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# Tool: visualize_graph
# ---------------------------------------------------------------------------

import sys as _sys
import os as _os
_sys.path.insert(0, _os.path.dirname(__file__))

@mcp.tool()
def visualize_graph(scope: str = "full", scope_value: Optional[str] = None, max_nodes: int = 200) -> dict:
    """Generate an interactive HTML code graph visualization.

    Renders a D3-based HTML file with nodes and edges from the code graph DB.
    Returns the path to the written HTML file.

    scope values: 'full', 'package', 'file', 'impact'
    scope_value: required for package/file/impact scopes
    max_nodes: cap on the number of nodes rendered (default 200)
    """
    if not _db_exists():
        return dict(_MISSING_DB_RESPONSE)
    try:
        from graph_visualizer import GraphVisualizer
        db_path = get_db_path()
        viz = GraphVisualizer(db_path=db_path)
        html_path = viz.generate(scope=scope, scope_value=scope_value, max_nodes=max_nodes)
        return {"html_path": html_path, "scope": scope, "status": "ok"}
    except Exception as exc:
        return {"error": str(exc), "status": "error"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
