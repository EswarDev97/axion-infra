"""graph_visualizer.py — HTML generator from the code graph DB with scope filtering.

Part of the AICodePath Code Graph & RE Enhancement system (Task 22).
"""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional


class GraphVisualizer:
    """Generate an interactive HTML graph from the code-graph SQLite database."""

    def __init__(self, db_path: str, template_path: Optional[str] = None):
        self.db_path = db_path
        if template_path is None:
            template_path = os.path.join(
                os.path.dirname(__file__), "templates", "graph-viewer.html"
            )
        self.template_path = template_path

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(
        self,
        scope: str = "full",
        scope_value: Optional[str] = None,
        max_nodes: int = 200,
        output_path: Optional[str] = None,
    ) -> str:
        """Build the HTML graph file and return the path it was written to."""
        if output_path is None:
            output_path = self._default_output_path()

        nodes, links = self._load_graph(scope, scope_value, max_nodes)

        metadata = {
            "scope": scope,
            "scope_value": scope_value,
            "total_nodes": len(nodes),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        graph_data = {"nodes": nodes, "links": links, "metadata": metadata}

        html = self._render(graph_data)
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as fh:
            fh.write(html)

        return output_path

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load_graph(
        self, scope: str, scope_value: Optional[str], max_nodes: int
    ) -> tuple[list[dict], list[dict]]:
        """Query the DB and return (nodes, links) for the requested scope."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            entity_ids, nodes = self._fetch_entities(conn, scope, scope_value, max_nodes)
            links = self._fetch_relations(conn, entity_ids)
        finally:
            conn.close()
        return nodes, links

    # ------------------------------------------------------------------
    # Entity loading
    # ------------------------------------------------------------------

    def _fetch_entities(
        self, conn: sqlite3.Connection, scope: str, scope_value: Optional[str], max_nodes: int
    ) -> tuple[set[int], list[dict]]:
        """Return (entity_id_set, node_list) based on scope."""
        if scope == "full":
            return self._fetch_full(conn, max_nodes)
        elif scope == "package":
            return self._fetch_by_column(conn, "package_name", scope_value, max_nodes)
        elif scope == "file":
            return self._fetch_by_column(conn, "file_path", scope_value, max_nodes)
        elif scope == "impact":
            return self._fetch_impact(conn, scope_value, max_nodes)
        else:
            raise ValueError(f"Unknown scope: {scope!r}")

    def _relation_count_subquery(self) -> str:
        return (
            "(SELECT COUNT(*) FROM code_relations cr "
            " WHERE cr.from_entity_id = e.id OR cr.to_entity_id = e.id)"
        )

    def _entity_select(self) -> str:
        rc = self._relation_count_subquery()
        return (
            f"SELECT e.id, e.name, e.qualified_name, e.entity_type, "
            f"e.file_path, e.language, e.signature, e.package_name, e.is_test, "
            f"{rc} AS relation_count "
            f"FROM code_entities e"
        )

    def _row_to_node(self, row) -> dict:
        return {
            "id": row["qualified_name"],
            "name": row["name"],
            "entity_type": row["entity_type"] or "unknown",
            "package_name": row["package_name"] or "",
            "file_path": row["file_path"] or "",
            "language": row["language"] or "",
            "signature": row["signature"] or "",
            "relation_count": row["relation_count"],
            "is_test": bool(row["is_test"]),
        }

    def _fetch_full(
        self, conn: sqlite3.Connection, max_nodes: int
    ) -> tuple[set[int], list[dict]]:
        sql = (
            f"{self._entity_select()} "
            f"ORDER BY relation_count DESC LIMIT ?"
        )
        rows = conn.execute(sql, (max_nodes,)).fetchall()
        ids = {r["id"] for r in rows}
        nodes = [self._row_to_node(r) for r in rows]
        return ids, nodes

    def _fetch_by_column(
        self, conn: sqlite3.Connection, column: str, value: Optional[str], max_nodes: int
    ) -> tuple[set[int], list[dict]]:
        sql = (
            f"{self._entity_select()} "
            f"WHERE e.{column} = ? "
            f"ORDER BY relation_count DESC LIMIT ?"
        )
        rows = conn.execute(sql, (value, max_nodes)).fetchall()
        ids = {r["id"] for r in rows}
        nodes = [self._row_to_node(r) for r in rows]
        return ids, nodes

    def _fetch_impact(
        self, conn: sqlite3.Connection, scope_value: Optional[str], max_nodes: int
    ) -> tuple[set[int], list[dict]]:
        """scope_value is a comma-separated list of qualified names.

        Includes those entities + their direct neighbors (1-hop).
        """
        seed_names: list[str] = [s.strip() for s in (scope_value or "").split(",") if s.strip()]

        if not seed_names:
            return set(), []

        # Fetch seed entity ids
        placeholders = ",".join("?" * len(seed_names))
        seed_rows = conn.execute(
            f"SELECT id FROM code_entities WHERE qualified_name IN ({placeholders})",
            seed_names,
        ).fetchall()
        seed_ids = {r["id"] for r in seed_rows}

        if not seed_ids:
            return set(), []

        # Find neighbor ids (direct relations)
        id_placeholders = ",".join("?" * len(seed_ids))
        seed_id_list = list(seed_ids)
        neighbor_rows = conn.execute(
            f"SELECT from_entity_id, to_entity_id FROM code_relations "
            f"WHERE from_entity_id IN ({id_placeholders}) "
            f"OR to_entity_id IN ({id_placeholders})",
            seed_id_list + seed_id_list,
        ).fetchall()

        neighbor_ids: set[int] = set()
        for r in neighbor_rows:
            neighbor_ids.add(r["from_entity_id"])
            neighbor_ids.add(r["to_entity_id"])

        all_ids = seed_ids | neighbor_ids

        # Fetch those entities
        all_placeholders = ",".join("?" * len(all_ids))
        rc = self._relation_count_subquery()
        sql = (
            f"SELECT e.id, e.name, e.qualified_name, e.entity_type, "
            f"e.file_path, e.language, e.signature, e.package_name, e.is_test, "
            f"{rc} AS relation_count "
            f"FROM code_entities e "
            f"WHERE e.id IN ({all_placeholders}) "
            f"ORDER BY relation_count DESC LIMIT ?"
        )
        rows = conn.execute(sql, list(all_ids) + [max_nodes]).fetchall()
        ids = {r["id"] for r in rows}
        nodes = [self._row_to_node(r) for r in rows]
        return ids, nodes

    # ------------------------------------------------------------------
    # Relations loading
    # ------------------------------------------------------------------

    def _fetch_relations(
        self, conn: sqlite3.Connection, entity_ids: set[int]
    ) -> list[dict]:
        """Return edges where both endpoints are in entity_ids."""
        if not entity_ids:
            return []

        placeholders = ",".join("?" * len(entity_ids))
        id_list = list(entity_ids)
        sql = (
            f"SELECT cr.relation_type, "
            f"src.qualified_name AS from_qn, tgt.qualified_name AS to_qn "
            f"FROM code_relations cr "
            f"JOIN code_entities src ON cr.from_entity_id = src.id "
            f"JOIN code_entities tgt ON cr.to_entity_id = tgt.id "
            f"WHERE cr.from_entity_id IN ({placeholders}) "
            f"  AND cr.to_entity_id IN ({placeholders})"
        )
        rows = conn.execute(sql, id_list + id_list).fetchall()
        return [
            {
                "source": r["from_qn"],
                "target": r["to_qn"],
                "relation_type": r["relation_type"],
            }
            for r in rows
        ]

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------

    def _render(self, graph_data: dict) -> str:
        with open(self.template_path, "r", encoding="utf-8") as fh:
            template = fh.read()
        json_str = json.dumps(graph_data, ensure_ascii=False)
        return template.replace("{GRAPH_DATA}", json_str)

    # ------------------------------------------------------------------
    # Output path resolution
    # ------------------------------------------------------------------

    def _default_output_path(self) -> str:
        # Allow override via environment variable
        project_root = os.environ.get("AICODEPATH_PROJECT_ROOT")
        if not project_root:
            project_root = self._find_project_root(self.db_path)
        return os.path.join(
            project_root, "aicodepath-docs", "memory", "global", "code-graph.html"
        )

    @staticmethod
    def _find_project_root(start_path: str) -> str:
        """Walk up from start_path until a directory containing .aicodepath/ is found."""
        current = os.path.abspath(start_path)
        # If start_path is a file, begin from its directory
        if os.path.isfile(current):
            current = os.path.dirname(current)
        while True:
            if os.path.isdir(os.path.join(current, ".aicodepath")):
                return current
            parent = os.path.dirname(current)
            if parent == current:
                # Reached filesystem root without finding .aicodepath/
                # Fall back to the directory containing the db file
                return os.path.dirname(os.path.abspath(start_path))
            current = parent
