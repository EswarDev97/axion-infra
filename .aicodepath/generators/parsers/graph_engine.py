"""
graph_engine.py — NetworkX-based graph engine for code traversal queries.

Loads entity/relation data from SQLite (code_entities + code_relations tables)
and exposes BFS traversal methods for call-graph analysis.
"""
from __future__ import annotations

import re
import sqlite3
from collections import deque
from typing import Optional

import networkx as nx

# Test-name patterns that indicate a node is a test entity.
_TEST_NAME_PATTERNS: list[re.Pattern] = [
    re.compile(r'^test_', re.IGNORECASE),
    re.compile(r'_test$', re.IGNORECASE),
    re.compile(r'Test', re.IGNORECASE),
    re.compile(r'_spec$', re.IGNORECASE),
]


def _is_test_name(name: str) -> bool:
    return any(p.search(name) for p in _TEST_NAME_PATTERNS)


class GraphEngine:
    """NetworkX DiGraph wrapper for code-entity traversal."""

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self._graph: Optional[nx.DiGraph] = None

    # ------------------------------------------------------------------
    # Graph loading
    # ------------------------------------------------------------------

    def load_graph(self) -> None:
        """Load all code_entities + code_relations into a directed NetworkX graph.

        Node key  : qualified_name (str)
        Node attrs: entity_type, name, language, file_path, line_start, is_test
        Edge attrs: relation_type
        """
        g = nx.DiGraph()

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            # --- Nodes ---------------------------------------------------
            rows = conn.execute(
                """SELECT id, entity_type, name, qualified_name,
                          language, file_path, line_start, is_test
                   FROM code_entities"""
            ).fetchall()
            id_to_qname: dict[int, str] = {}
            for row in rows:
                qname = row['qualified_name'] or row['name']
                id_to_qname[row['id']] = qname
                g.add_node(
                    qname,
                    entity_type=row['entity_type'],
                    name=row['name'],
                    language=row['language'],
                    file_path=row['file_path'],
                    line_start=row['line_start'],
                    is_test=bool(row['is_test']),
                )

            # --- Edges ---------------------------------------------------
            rels = conn.execute(
                """SELECT from_entity_id, to_entity_id,
                          from_entity_name, to_entity_name, relation_type
                   FROM code_relations"""
            ).fetchall()
            for rel in rels:
                # Resolve source node key
                src = None
                if rel['from_entity_id'] is not None:
                    src = id_to_qname.get(rel['from_entity_id'])
                if src is None:
                    src = rel['from_entity_name']

                # Resolve target node key
                dst = None
                if rel['to_entity_id'] is not None:
                    dst = id_to_qname.get(rel['to_entity_id'])
                if dst is None:
                    dst = rel['to_entity_name']

                if src and dst:
                    g.add_edge(src, dst, relation_type=rel['relation_type'])
        finally:
            conn.close()

        self._graph = g

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_loaded(self) -> None:
        if self._graph is None:
            self.load_graph()

    def _find_nodes(self, entity_name: str) -> list[str]:
        """Return real graph nodes matching entity_name (exact or qualified-name suffix).

        Ghost nodes (bare unresolved names created from edge to_entity_name) are
        excluded — they have empty attrs and pollute traversal results.

        Qualified-name separators checked: '.' (method inside class),
        ':' (class/file segment), '/' (path segment).
        """
        self._ensure_loaded()
        g = self._graph

        def _is_real(node: str) -> bool:
            """A real node has at least one attribute (entity_type, file_path, etc.)."""
            return bool(g.nodes.get(node))

        # Exact match — only accept if it's a real node
        if entity_name in g and _is_real(entity_name):
            return [entity_name]

        # Suffix match across all three separators used in qualified names
        matches = [
            n for n in g.nodes
            if _is_real(n) and (
                n.endswith('.' + entity_name)
                or n.endswith(':' + entity_name)
                or n.endswith('/' + entity_name)
            )
        ]
        return matches

    def _degree_of(self, node: str) -> int:
        """Return total degree (in_degree + out_degree) for a node, or 0 if absent."""
        self._ensure_loaded()
        g = self._graph
        if node not in g:
            return 0
        return g.in_degree(node) + g.out_degree(node)

    def _node_dict(self, node: str, depth: int | None = None) -> dict:
        """Build the standard result dict for a node, optionally including depth."""
        self._ensure_loaded()
        attrs = self._graph.nodes.get(node, {})
        result = {
            'qualified_name': node,
            'name': attrs.get('name', node),
            'entity_type': attrs.get('entity_type', ''),
            'language': attrs.get('language', ''),
            'file_path': attrs.get('file_path', ''),
        }
        if depth is not None:
            result['depth'] = depth
        return result

    # ------------------------------------------------------------------
    # Traversal: callers
    # ------------------------------------------------------------------

    def callers_of(self, entity_name: str, max_depth: int = 5, max_results: int = 0) -> list[dict]:
        """BFS reverse traversal of 'calls' edges: who calls this entity?

        Returns list of {qualified_name, name, entity_type, language, file_path, depth}
        sorted by total degree descending (most connected first).

        Args:
            max_results: When > 0, truncate results to this many after sorting.
                         0 means return all results.
        """
        self._ensure_loaded()
        start_nodes = self._find_nodes(entity_name)
        if not start_nodes:
            return []

        g = self._graph
        visited: set[str] = set(start_nodes)
        queue: deque[tuple[str, int]] = deque()
        for n in start_nodes:
            queue.append((n, 0))

        result: list[dict] = []
        while queue:
            node, depth = queue.popleft()
            if depth >= max_depth:
                continue
            for predecessor in g.predecessors(node):
                edge_data = g.edges[predecessor, node]
                if edge_data.get('relation_type') != 'calls':
                    continue
                if predecessor not in visited:
                    visited.add(predecessor)
                    result.append(self._node_dict(predecessor, depth + 1))
                    queue.append((predecessor, depth + 1))

        result.sort(key=lambda r: -self._degree_of(r['qualified_name']))
        if max_results > 0:
            result = result[:max_results]
        return result

    # ------------------------------------------------------------------
    # Traversal: callees
    # ------------------------------------------------------------------

    def callees_of(self, entity_name: str, max_depth: int = 5, max_results: int = 0) -> list[dict]:
        """BFS forward traversal of 'calls' edges: what does this entity call?

        Returns list of {qualified_name, name, entity_type, language, file_path, depth}
        sorted by total degree descending (most connected first).

        Args:
            max_results: When > 0, truncate results to this many after sorting.
                         0 means return all results.
        """
        self._ensure_loaded()
        start_nodes = self._find_nodes(entity_name)
        if not start_nodes:
            return []

        g = self._graph
        visited: set[str] = set(start_nodes)
        queue: deque[tuple[str, int]] = deque()
        for n in start_nodes:
            queue.append((n, 0))

        result: list[dict] = []
        while queue:
            node, depth = queue.popleft()
            if depth >= max_depth:
                continue
            for successor in g.successors(node):
                edge_data = g.edges[node, successor]
                if edge_data.get('relation_type') != 'calls':
                    continue
                if successor not in visited:
                    visited.add(successor)
                    result.append(self._node_dict(successor, depth + 1))
                    queue.append((successor, depth + 1))

        result.sort(key=lambda r: -self._degree_of(r['qualified_name']))
        if max_results > 0:
            result = result[:max_results]
        return result

    # ------------------------------------------------------------------
    # Impact radius
    # ------------------------------------------------------------------

    def impact_radius(self, entity_name: str, max_hops: int = 5, max_results: int = 0) -> dict:
        """Compute all entities reachable from this entity (any edge type).

        Returns {entity_name, affected: list[dict], hop_counts: dict[int, int], total: int}.
        hop_counts maps hop distance -> number of nodes at that distance.
        ``affected`` is sorted by total degree descending (most connected first).

        Args:
            max_results: When > 0, truncate ``affected`` to this many after sorting.
                         0 means return all. ``total`` always reflects the full BFS count.
        """
        self._ensure_loaded()
        start_nodes = self._find_nodes(entity_name)
        canonical = start_nodes[0] if start_nodes else entity_name

        if not start_nodes:
            return {
                'entity_name': entity_name,
                'affected': [],
                'hop_counts': {},
                'total': 0,
            }

        g = self._graph
        visited: set[str] = set(start_nodes)
        queue: deque[tuple[str, int]] = deque()
        for n in start_nodes:
            queue.append((n, 0))

        hop_counts: dict[int, int] = {}
        affected: list[dict] = []

        while queue:
            node, depth = queue.popleft()
            if depth >= max_hops:
                continue
            for successor in g.successors(node):
                if successor not in visited:
                    visited.add(successor)
                    hop = depth + 1
                    hop_counts[hop] = hop_counts.get(hop, 0) + 1
                    affected.append(self._node_dict(successor))
                    queue.append((successor, hop))

        total = len(affected)
        affected.sort(key=lambda r: -self._degree_of(r['qualified_name']))
        if max_results > 0:
            affected = affected[:max_results]

        return {
            'entity_name': canonical,
            'affected': affected,
            'hop_counts': hop_counts,
            'total': total,
        }

    # ------------------------------------------------------------------
    # Tests for
    # ------------------------------------------------------------------

    def tests_for(self, entity_name: str) -> list[dict]:
        """Find test entities that call or contain this entity.

        A node is considered a test if:
        - its is_test attribute is True, OR
        - its name matches test_*, *_test, *Test*, *_spec patterns.

        Returns list of {qualified_name, name, file_path}.
        """
        self._ensure_loaded()
        start_nodes = self._find_nodes(entity_name)
        if not start_nodes:
            return []

        g = self._graph
        seen: set[str] = set()
        result: list[dict] = []

        def _is_test_node(node: str) -> bool:
            attrs = g.nodes.get(node, {})
            if attrs.get('is_test'):
                return True
            name = attrs.get('name', node)
            return _is_test_name(name)

        for target in start_nodes:
            for predecessor in g.predecessors(target):
                edge_data = g.edges[predecessor, target]
                if edge_data.get('relation_type') != 'calls':
                    continue
                if predecessor not in seen and _is_test_node(predecessor):
                    seen.add(predecessor)
                    attrs = g.nodes.get(predecessor, {})
                    result.append({
                        'qualified_name': predecessor,
                        'name': attrs.get('name', predecessor),
                        'file_path': attrs.get('file_path', ''),
                    })

        return result

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        entity_type: str = None,
        language: str = None,
        limit: int = 20,
    ) -> list[dict]:
        """Text search over entity names and qualified_names.

        Score: 2 for exact name match, 1 for partial match (name or qualified_name contains query).
        Results are sorted by score descending then by qualified_name ascending.
        Returns list of {qualified_name, name, entity_type, language, file_path, score}.
        """
        self._ensure_loaded()
        g = self._graph
        query_lower = query.lower()

        results: list[dict] = []
        for node, attrs in g.nodes(data=True):
            # --- Type / language filters ---------------------------------
            if entity_type is not None and attrs.get('entity_type') != entity_type:
                continue
            if language is not None and attrs.get('language') != language:
                continue

            # --- Scoring -------------------------------------------------
            name = attrs.get('name', node)
            if query_lower == '':
                # Empty query: match all (score=1)
                score = 1
            elif name.lower() == query_lower:
                score = 2
            elif query_lower in name.lower() or query_lower in node.lower():
                score = 1
            else:
                continue  # no match

            results.append({
                'qualified_name': node,
                'name': name,
                'entity_type': attrs.get('entity_type', ''),
                'language': attrs.get('language', ''),
                'file_path': attrs.get('file_path', ''),
                'score': score,
            })

        # Sort: highest score first, then stable alphabetical
        results.sort(key=lambda r: (-r['score'], r['qualified_name']))
        return results[:limit]
