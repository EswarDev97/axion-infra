"""
graph_analytics.py — Pure-SQL analytics for the code graph.

Provides report generation, community detection (Leiden/Louvain), and
FTS search over the code_entities table. No NetworkX dependency — all
operations run directly on SQLite.

Importable from mcp_graph_server.py via the _PARSERS_DIR sys.path insert.
"""
from __future__ import annotations

import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


def _find_report_dir() -> Path:
    """Locate aicodepath-docs relative to this file's position in the tree.

    File location: .aicodepath/generators/parsers/graph_analytics.py
    Project root : 4 levels up (parsers/ → generators/ → .aicodepath/ → root)
    """
    return Path(__file__).parent.parent.parent.parent / "aicodepath-docs"


class GraphAnalytics:
    """Pure-SQL analytics layer for the code graph SQLite database."""

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # ------------------------------------------------------------------
    # Report generation
    # ------------------------------------------------------------------

    def generate_report(self, report_path: Optional[str] = None) -> str:
        """Generate a Markdown summary of the code graph and write it to disk.

        Args:
            report_path: Destination path. Defaults to
                         ``aicodepath-docs/GRAPH_REPORT.md`` relative to the
                         project root.

        Returns:
            Absolute path of the written report file.
        """
        if report_path is None:
            report_dir = _find_report_dir()
            report_dir.mkdir(parents=True, exist_ok=True)
            report_path = str(report_dir / "GRAPH_REPORT.md")

        conn = self._connect()
        try:
            lines = self._build_report_lines(conn)
        finally:
            conn.close()

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

        return report_path

    def _build_report_lines(self, conn: sqlite3.Connection) -> list[str]:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        lines: list[str] = [
            "# Code Graph Report",
            f"*Generated: {now}*",
            "",
        ]

        # --- Overview ---
        total_entities = conn.execute("SELECT COUNT(*) FROM code_entities").fetchone()[0]
        total_relations = conn.execute("SELECT COUNT(*) FROM code_relations").fetchone()[0]
        lines += [
            "## Overview",
            f"- **Entities**: {total_entities}",
            f"- **Relations**: {total_relations}",
            "",
        ]

        # --- Most Connected Entities (god nodes) ---
        rows = conn.execute("""
            SELECT e.name, e.qualified_name, e.entity_type, e.language,
                   (
                       SELECT COUNT(*) FROM code_relations r
                       WHERE r.from_entity_name = e.qualified_name
                          OR r.to_entity_name   = e.qualified_name
                   ) AS degree
            FROM code_entities e
            ORDER BY degree DESC
            LIMIT 10
        """).fetchall()
        lines += ["## Most Connected Entities", ""]
        if rows and rows[0]["degree"] > 0:
            lines.append("| Name | Type | Language | Degree |")
            lines.append("|------|------|----------|--------|")
            for r in rows:
                lang = r["language"] or "—"
                lines.append(f"| `{r['name']}` | {r['entity_type']} | {lang} | {r['degree']} |")
        else:
            lines.append("*(no entities indexed yet)*")
        lines.append("")

        # --- Language Distribution ---
        rows = conn.execute("""
            SELECT language, COUNT(*) AS cnt
            FROM code_entities
            WHERE language IS NOT NULL
            GROUP BY language
            ORDER BY cnt DESC
        """).fetchall()
        lines += ["## Language Distribution", ""]
        if rows:
            lines.append("| Language | Entities |")
            lines.append("|----------|----------|")
            for r in rows:
                lines.append(f"| {r['language']} | {r['cnt']} |")
        else:
            lines.append("*(no language data)*")
        lines.append("")

        # --- Relation Types ---
        rows = conn.execute("""
            SELECT relation_type, COUNT(*) AS cnt
            FROM code_relations
            GROUP BY relation_type
            ORDER BY cnt DESC
        """).fetchall()
        lines += ["## Relation Types", ""]
        if rows:
            lines.append("| Relation Type | Count |")
            lines.append("|---------------|-------|")
            for r in rows:
                lines.append(f"| {r['relation_type']} | {r['cnt']} |")
        else:
            lines.append("*(no relations)*")
        lines.append("")

        # --- Cross-file Dependencies ---
        cross_file_count = conn.execute("""
            SELECT COUNT(*) FROM code_relations cr
            JOIN code_entities fe ON fe.qualified_name = cr.from_entity_name
            JOIN code_entities te ON te.qualified_name = cr.to_entity_name
            WHERE fe.file_path != te.file_path
        """).fetchone()[0]
        lines += [
            "## Cross-File Dependencies",
            f"- **Cross-file edges**: {cross_file_count}",
            "",
        ]

        # --- Community Summaries (populated after detect_communities() runs) ---
        try:
            community_count = conn.execute(
                "SELECT COUNT(DISTINCT community) FROM code_entities WHERE community IS NOT NULL"
            ).fetchone()[0]
        except Exception:
            community_count = 0

        lines += ["## Code Modules", ""]
        if community_count > 0:
            lines.append(f"*{community_count} communities detected.*")
            lines.append("")
            rows = conn.execute("""
                SELECT community, COUNT(*) AS size
                FROM code_entities
                WHERE community IS NOT NULL
                GROUP BY community
                ORDER BY size DESC
                LIMIT 20
            """).fetchall()
            lines.append("| Community | Entities |")
            lines.append("|-----------|----------|")
            for r in rows:
                lines.append(f"| {r['community']} | {r['size']} |")
        else:
            lines.append("*(Run `detect_communities` to populate this section.)*")
        lines.append("")

        return lines

    # ------------------------------------------------------------------
    # Community detection (T17)
    # ------------------------------------------------------------------

    _MAX_COMMUNITY_SIZE = 50  # split oversized communities to this cap

    def detect_communities(self) -> int:
        """Detect code communities and write assignments to ``code_entities.community``.

        Algorithm priority:
        1. Leiden (``leidenalg`` + ``igraph``) — highest quality
        2. Louvain (``python-louvain`` / ``community`` package) — fallback
        3. Connected-components (stdlib) — last resort (always available)

        Returns:
            Number of distinct communities written to the DB.
        """
        conn = self._connect()
        try:
            node_ids, adjacency = self._load_adjacency(conn)
            if not node_ids:
                return 0
            raw_communities = self._run_clustering(node_ids, adjacency)
            split_communities = self._split_oversized(raw_communities)
            self._write_communities(conn, split_communities)
            return len(set(split_communities.values()))
        finally:
            conn.close()

    def _load_adjacency(
        self, conn: sqlite3.Connection
    ) -> tuple[list[str], dict[str, list[str]]]:
        """Return (node_ids, adjacency_dict) from the DB.

        node_ids   : list of qualified_name strings
        adjacency  : {qualified_name: [neighbour_qualified_name, ...]} (undirected)
        """
        rows = conn.execute(
            "SELECT qualified_name FROM code_entities WHERE qualified_name IS NOT NULL"
        ).fetchall()
        node_ids = [r[0] for r in rows]
        if not node_ids:
            return [], {}

        adj: dict[str, list[str]] = {n: [] for n in node_ids}
        node_set = set(node_ids)

        rel_rows = conn.execute(
            "SELECT from_entity_name, to_entity_name FROM code_relations"
        ).fetchall()
        for src, dst in rel_rows:
            if src in node_set and dst in node_set and src != dst:
                adj[src].append(dst)
                adj[dst].append(src)

        return node_ids, adj

    def _run_clustering(
        self, node_ids: list[str], adjacency: dict[str, list[str]]
    ) -> dict[str, int]:
        """Run community detection, returning {qualified_name: community_id}.

        Tries Leiden → Louvain → connected-components in that order.
        """
        # --- Leiden (requires leidenalg + igraph) ---
        try:
            import igraph as ig  # type: ignore
            import leidenalg  # type: ignore

            idx = {n: i for i, n in enumerate(node_ids)}
            edges = [
                (idx[src], idx[dst])
                for src, neighbours in adjacency.items()
                for dst in neighbours
                if src < dst  # deduplicate undirected edges
            ]
            g = ig.Graph(n=len(node_ids), edges=edges, directed=False)
            partition = leidenalg.find_partition(g, leidenalg.ModularityVertexPartition)
            return {node_ids[i]: cid for cid, members in enumerate(partition) for i in members}
        except ImportError:
            pass

        # --- Louvain (requires python-louvain) ---
        try:
            import community as community_louvain  # type: ignore
            import networkx as nx  # type: ignore

            G = nx.Graph()
            G.add_nodes_from(node_ids)
            for src, neighbours in adjacency.items():
                for dst in neighbours:
                    if not G.has_edge(src, dst):
                        G.add_edge(src, dst)
            partition = community_louvain.best_partition(G)
            return partition  # already {node: community_id}
        except ImportError:
            pass

        # --- Connected components (stdlib fallback) ---
        visited: dict[str, int] = {}
        cid = 0
        for start in node_ids:
            if start in visited:
                continue
            stack = [start]
            while stack:
                node = stack.pop()
                if node in visited:
                    continue
                visited[node] = cid
                for neighbour in adjacency.get(node, []):
                    if neighbour not in visited:
                        stack.append(neighbour)
            cid += 1
        return visited

    def _split_oversized(self, communities: dict[str, int]) -> dict[str, int]:
        """Split any community with > _MAX_COMMUNITY_SIZE members into sub-groups.

        Sub-groups are assigned new community IDs appended after the existing max.
        """
        from collections import defaultdict

        buckets: dict[int, list[str]] = defaultdict(list)
        for node, cid in communities.items():
            buckets[cid].append(node)

        cap = self._MAX_COMMUNITY_SIZE
        result: dict[str, int] = {}
        next_id = max(communities.values(), default=-1) + 1

        for cid, members in buckets.items():
            if len(members) <= cap:
                for node in members:
                    result[node] = cid
            else:
                # Round-robin sub-partition
                for i, node in enumerate(members):
                    chunk = i // cap
                    result[node] = cid if chunk == 0 else next_id + chunk - 1
                next_id += (len(members) - 1) // cap

        return result

    def _write_communities(
        self, conn: sqlite3.Connection, communities: dict[str, int]
    ) -> None:
        """Write community assignments back to ``code_entities.community``."""
        conn.executemany(
            "UPDATE code_entities SET community = ? WHERE qualified_name = ?",
            [(cid, qname) for qname, cid in communities.items()],
        )
        conn.commit()

    # ------------------------------------------------------------------
    # FTS search (T19)
    # ------------------------------------------------------------------

    def search_fts(
        self,
        query: str,
        entity_type: Optional[str] = None,
        language: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Search code entities using SQLite FTS5.

        Creates a standalone FTS5 virtual table ``code_entities_fts`` on first
        use and populates it from ``code_entities``.  Falls back to returning
        an empty list on any error (e.g. FTS5 not compiled into the SQLite
        build).

        Args:
            query:       Search terms.  Special FTS5 characters are stripped
                         before submission via ``_sanitize_fts_query()``.
            entity_type: Optional filter (e.g. ``"function"``, ``"class"``).
            language:    Optional filter (e.g. ``"python"``).
            limit:       Maximum rows to return (default 20).

        Returns:
            List of dicts: ``{qualified_name, name, entity_type, language,
            file_path, score}``.  Empty list on empty query or any error.
        """
        sanitized = self._sanitize_fts_query(query)
        if not sanitized:
            return []

        conn = self._connect()
        try:
            self._ensure_fts_table(conn)

            # Step 1: FTS5 query — collect matching names and scores.
            fts_sql = "SELECT name, rank FROM code_entities_fts WHERE name MATCH ? ORDER BY rank LIMIT ?"
            fts_rows = conn.execute(fts_sql, [sanitized, limit]).fetchall()
            if not fts_rows:
                return []

            # Step 2: Fetch full entity rows from code_entities by name.
            name_to_score = {r["name"]: r["rank"] for r in fts_rows}
            names = list(name_to_score)
            placeholders = ",".join("?" * len(names))

            entity_conditions = [f"name IN ({placeholders})"]
            entity_params: list = names[:]

            if entity_type is not None:
                entity_conditions.append("entity_type = ?")
                entity_params.append(entity_type)
            if language is not None:
                entity_conditions.append("language = ?")
                entity_params.append(language)

            entity_sql = (
                f"SELECT qualified_name, name, entity_type, language, file_path "
                f"FROM code_entities WHERE {' AND '.join(entity_conditions)}"
            )
            entity_rows = conn.execute(entity_sql, entity_params).fetchall()

            results = [
                {
                    "qualified_name": r["qualified_name"],
                    "name": r["name"],
                    "entity_type": r["entity_type"],
                    "language": r["language"],
                    "file_path": r["file_path"],
                    "score": name_to_score.get(r["name"], 0),
                }
                for r in entity_rows
            ]
            # Preserve FTS5 rank ordering (lower rank = better match in FTS5)
            results.sort(key=lambda x: x["score"])
            return results
        except Exception:
            return []
        finally:
            conn.close()

    def _ensure_fts_table(self, conn: sqlite3.Connection) -> None:
        """Create and populate the standalone FTS5 virtual table if needed.

        Uses a standalone (non-content) FTS5 table to avoid content-table
        sync complexity.  Populated lazily on first use via a single INSERT.
        """
        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS code_entities_fts USING fts5(name)"
        )
        # Check whether the FTS index already has rows.
        row = conn.execute("SELECT name FROM code_entities_fts LIMIT 1").fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO code_entities_fts(name) SELECT name FROM code_entities"
            )
        conn.commit()

    @staticmethod
    def _sanitize_fts_query(query: str) -> str:
        """Strip characters that are special in FTS5 syntax.

        Removes: ``" ' ( ) [ ] { } * ? ^ ~ : - + = | & ! . ,``
        and collapses extra whitespace.  Returns empty string if nothing
        remains after sanitization.
        """
        sanitized = re.sub(r'[\"\'()\[\]{}\*\?^~:\-+=|&!.,]', ' ', query)
        sanitized = ' '.join(sanitized.split())
        return sanitized
