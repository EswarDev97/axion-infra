"""
Tests for graph_engine.GraphEngine — NetworkX-based code traversal.
Run: /home/faizal/workspace/aicodepath-tool/.venv/bin/python3 -m pytest .aicodepath/__tests__/test_graph_engine.py -v
"""
import pytest
import sqlite3
import tempfile
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / 'generators/parsers'))
from graph_engine import GraphEngine

# ---------------------------------------------------------------------------
# Minimal schema shared across all fixtures
# ---------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE code_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL DEFAULT 'function',
    name TEXT NOT NULL,
    qualified_name TEXT,
    language TEXT DEFAULT 'python',
    file_path TEXT NOT NULL DEFAULT 'test.py',
    line_start INTEGER DEFAULT 1,
    is_test BOOLEAN DEFAULT 0,
    cr_number TEXT NOT NULL DEFAULT 'CR-GRAPH'
);
CREATE TABLE code_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id INTEGER,
    to_entity_id INTEGER,
    from_entity_name TEXT,
    to_entity_name TEXT,
    relation_type TEXT NOT NULL DEFAULT 'calls'
);
"""


def make_db(entities=None, relations=None) -> str:
    """Create a temp SQLite DB populated with given entities and relations.
    Returns the file path (caller is responsible for cleanup).
    """
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)
    if entities:
        for e in entities:
            conn.execute(
                """INSERT INTO code_entities
                   (entity_type, name, qualified_name, language, file_path, line_start, is_test)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    e.get('entity_type', 'function'),
                    e['name'],
                    e.get('qualified_name', e['name']),
                    e.get('language', 'python'),
                    e.get('file_path', 'test.py'),
                    e.get('line_start', 1),
                    e.get('is_test', 0),
                )
            )
    if relations:
        for r in relations:
            conn.execute(
                """INSERT INTO code_relations
                   (from_entity_id, to_entity_id, from_entity_name, to_entity_name, relation_type)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    r.get('from_entity_id'),
                    r.get('to_entity_id'),
                    r.get('from_entity_name'),
                    r.get('to_entity_name'),
                    r.get('relation_type', 'calls'),
                )
            )
    conn.commit()
    conn.close()
    return path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _qnames(result: list[dict]) -> set[str]:
    return {row['qualified_name'] for row in result}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestLoadGraph:
    def test_load_graph_creates_nodes(self):
        """3 entities loaded -> graph has exactly 3 nodes."""
        entities = [
            {'name': 'alpha', 'qualified_name': 'pkg.alpha'},
            {'name': 'beta',  'qualified_name': 'pkg.beta'},
            {'name': 'gamma', 'qualified_name': 'pkg.gamma'},
        ]
        path = make_db(entities=entities)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            assert engine._graph is not None
            assert engine._graph.number_of_nodes() == 3
            assert 'pkg.alpha' in engine._graph
            assert 'pkg.beta' in engine._graph
            assert 'pkg.gamma' in engine._graph
        finally:
            os.unlink(path)

    def test_load_graph_creates_edges(self):
        """2 entities + 1 relation -> graph has 1 edge between them."""
        entities = [
            {'name': 'foo', 'qualified_name': 'mod.foo'},
            {'name': 'bar', 'qualified_name': 'mod.bar'},
        ]
        # We need to know the IDs; since AUTOINCREMENT starts at 1:
        relations = [
            {
                'from_entity_id': 1,
                'to_entity_id': 2,
                'from_entity_name': 'mod.foo',
                'to_entity_name': 'mod.bar',
                'relation_type': 'calls',
            }
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            assert engine._graph.has_edge('mod.foo', 'mod.bar')
        finally:
            os.unlink(path)

    def test_load_graph_edge_with_null_to_entity_id(self):
        """Relation with null to_entity_id uses to_entity_name as target node."""
        entities = [
            {'name': 'alpha', 'qualified_name': 'mod.alpha'},
        ]
        relations = [
            {
                'from_entity_id': 1,
                'to_entity_id': None,
                'from_entity_name': 'mod.alpha',
                'to_entity_name': 'external.func',
                'relation_type': 'calls',
            }
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            assert engine._graph.has_edge('mod.alpha', 'external.func')
        finally:
            os.unlink(path)


class TestCallersOf:
    def test_callers_of(self):
        """Entity A calls B; callers_of(B) returns A."""
        entities = [
            {'name': 'A', 'qualified_name': 'mod.A'},
            {'name': 'B', 'qualified_name': 'mod.B'},
        ]
        relations = [
            {
                'from_entity_id': 1,
                'to_entity_id': 2,
                'from_entity_name': 'mod.A',
                'to_entity_name': 'mod.B',
                'relation_type': 'calls',
            }
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.callers_of('mod.B')
            assert len(result) == 1
            assert result[0]['qualified_name'] == 'mod.A'
            assert result[0]['name'] == 'A'
            assert 'depth' in result[0]
        finally:
            os.unlink(path)

    def test_callers_of_unknown_entity(self):
        """callers_of on a nonexistent entity returns empty list."""
        path = make_db(entities=[{'name': 'x', 'qualified_name': 'mod.x'}])
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.callers_of('nonexistent')
            assert result == []
        finally:
            os.unlink(path)

    def test_callers_of_depth_respected(self):
        """max_depth=1 prevents traversal beyond first hop."""
        # A -> B -> C; callers_of(C, max_depth=1) should return B only (not A)
        entities = [
            {'name': 'A', 'qualified_name': 'mod.A'},
            {'name': 'B', 'qualified_name': 'mod.B'},
            {'name': 'C', 'qualified_name': 'mod.C'},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.B', 'relation_type': 'calls'},
            {'from_entity_id': 2, 'to_entity_id': 3,
             'from_entity_name': 'mod.B', 'to_entity_name': 'mod.C', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.callers_of('mod.C', max_depth=1)
            qnames = _qnames(result)
            assert 'mod.B' in qnames
            assert 'mod.A' not in qnames
        finally:
            os.unlink(path)


class TestCalleesOf:
    def test_callees_of(self):
        """Entity A calls B and C; callees_of(A) returns both B and C."""
        entities = [
            {'name': 'A', 'qualified_name': 'mod.A'},
            {'name': 'B', 'qualified_name': 'mod.B'},
            {'name': 'C', 'qualified_name': 'mod.C'},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.B', 'relation_type': 'calls'},
            {'from_entity_id': 1, 'to_entity_id': 3,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.C', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.callees_of('mod.A')
            qnames = _qnames(result)
            assert 'mod.B' in qnames
            assert 'mod.C' in qnames
        finally:
            os.unlink(path)


class TestImpactRadius:
    def test_impact_radius(self):
        """A->B->C chain; impact_radius(A) returns B and C in affected."""
        entities = [
            {'name': 'A', 'qualified_name': 'mod.A'},
            {'name': 'B', 'qualified_name': 'mod.B'},
            {'name': 'C', 'qualified_name': 'mod.C'},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.B', 'relation_type': 'calls'},
            {'from_entity_id': 2, 'to_entity_id': 3,
             'from_entity_name': 'mod.B', 'to_entity_name': 'mod.C', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.impact_radius('mod.A')
            assert result['entity_name'] == 'mod.A'
            affected_qnames = _qnames(result['affected'])
            assert 'mod.B' in affected_qnames
            assert 'mod.C' in affected_qnames
            assert result['total'] == 2
            assert isinstance(result['hop_counts'], dict)
        finally:
            os.unlink(path)

    def test_impact_radius_unknown_entity(self):
        """impact_radius on unknown entity returns empty affected list."""
        path = make_db(entities=[{'name': 'x', 'qualified_name': 'mod.x'}])
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.impact_radius('nonexistent')
            assert result['total'] == 0
            assert result['affected'] == []
        finally:
            os.unlink(path)


class TestTestsFor:
    def test_tests_for(self):
        """test_foo calls bar; tests_for(bar) returns [test_foo]."""
        entities = [
            {'name': 'test_foo', 'qualified_name': 'tests.test_foo',
             'file_path': 'test_things.py', 'is_test': 1},
            {'name': 'bar', 'qualified_name': 'mod.bar',
             'file_path': 'mod.py', 'is_test': 0},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'tests.test_foo', 'to_entity_name': 'mod.bar',
             'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.tests_for('mod.bar')
            assert len(result) == 1
            assert result[0]['qualified_name'] == 'tests.test_foo'
        finally:
            os.unlink(path)

    def test_tests_for_pattern_match(self):
        """Entities whose name matches test_*/FooTest are returned even without is_test flag."""
        entities = [
            {'name': 'TestBar', 'qualified_name': 'tests.TestBar',
             'file_path': 'test_bar.py', 'is_test': 0},
            {'name': 'bar', 'qualified_name': 'mod.bar',
             'file_path': 'mod.py', 'is_test': 0},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'tests.TestBar', 'to_entity_name': 'mod.bar',
             'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.tests_for('mod.bar')
            qnames = _qnames(result)
            assert 'tests.TestBar' in qnames
        finally:
            os.unlink(path)


class TestSearch:
    def test_search_by_name(self):
        """search('foo') finds entity named 'foo'."""
        entities = [
            {'name': 'foo', 'qualified_name': 'mod.foo'},
            {'name': 'bar', 'qualified_name': 'mod.bar'},
        ]
        path = make_db(entities=entities)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.search('foo')
            qnames = _qnames(result)
            assert 'mod.foo' in qnames
        finally:
            os.unlink(path)

    def test_search_exact_match_scores_higher(self):
        """Exact name match scores 2; partial match scores 1."""
        entities = [
            {'name': 'foo',    'qualified_name': 'mod.foo'},
            {'name': 'foobar', 'qualified_name': 'mod.foobar'},
        ]
        path = make_db(entities=entities)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.search('foo')
            # Both should appear; exact match should have score=2
            by_qname = {r['qualified_name']: r for r in result}
            assert by_qname['mod.foo']['score'] == 2
            assert by_qname['mod.foobar']['score'] == 1
        finally:
            os.unlink(path)

    def test_search_by_type(self):
        """search('', entity_type='class') returns only class entities."""
        entities = [
            {'name': 'MyClass', 'qualified_name': 'mod.MyClass', 'entity_type': 'class'},
            {'name': 'my_func', 'qualified_name': 'mod.my_func', 'entity_type': 'function'},
        ]
        path = make_db(entities=entities)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.search('', entity_type='class')
            qnames = _qnames(result)
            assert 'mod.MyClass' in qnames
            assert 'mod.my_func' not in qnames
        finally:
            os.unlink(path)

    def test_search_by_language(self):
        """search('', language='typescript') returns only TS entities."""
        entities = [
            {'name': 'TsComp', 'qualified_name': 'src.TsComp', 'language': 'typescript'},
            {'name': 'py_util', 'qualified_name': 'src.py_util', 'language': 'python'},
        ]
        path = make_db(entities=entities)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.search('', language='typescript')
            qnames = _qnames(result)
            assert 'src.TsComp' in qnames
            assert 'src.py_util' not in qnames
        finally:
            os.unlink(path)

    def test_search_limit(self):
        """search respects the limit parameter."""
        entities = [{'name': f'fn_{i}', 'qualified_name': f'mod.fn_{i}'} for i in range(30)]
        path = make_db(entities=entities)
        try:
            engine = GraphEngine(path)
            engine.load_graph()
            result = engine.search('fn', limit=5)
            assert len(result) <= 5
        finally:
            os.unlink(path)


class TestDegreeOf:
    def test_degree_of_known_node(self):
        """Node with 1 in-edge and 1 out-edge reports degree 2."""
        entities = [
            {'name': 'hub',    'qualified_name': 'mod.hub'},
            {'name': 'caller', 'qualified_name': 'mod.caller'},
            {'name': 'callee', 'qualified_name': 'mod.callee'},
        ]
        # IDs: hub=1, caller=2, callee=3
        relations = [
            {'from_entity_id': 2, 'to_entity_id': 1,
             'from_entity_name': 'mod.caller', 'to_entity_name': 'mod.hub',   'relation_type': 'calls'},
            {'from_entity_id': 1, 'to_entity_id': 3,
             'from_entity_name': 'mod.hub',    'to_entity_name': 'mod.callee', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            assert engine._degree_of('mod.hub') == 2
            assert engine._degree_of('mod.caller') == 1
            assert engine._degree_of('mod.callee') == 1
        finally:
            os.unlink(path)

    def test_degree_of_unknown_node(self):
        """Unknown node returns 0 without error."""
        path = make_db()
        try:
            engine = GraphEngine(path)
            assert engine._degree_of('nonexistent.node') == 0
        finally:
            os.unlink(path)


class TestCallersOfMaxResults:
    """T12: max_results + degree sorting for callers_of."""

    def _build_db(self):
        """Build a graph: hub ← {A(2 edges), B(3 edges), C(1 edge)}.
        Degree: B=3, A=2, C=1 (in addition to the call edge to hub).
        """
        entities = [
            {'name': 'hub', 'qualified_name': 'mod.hub'},
            {'name': 'A',   'qualified_name': 'mod.A'},
            {'name': 'B',   'qualified_name': 'mod.B'},
            {'name': 'C',   'qualified_name': 'mod.C'},
            {'name': 'X',   'qualified_name': 'mod.X'},  # extra node for degree padding
        ]
        relations = [
            # A calls hub (degree contributor for A)
            {'from_entity_id': 2, 'to_entity_id': 1,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.hub', 'relation_type': 'calls'},
            # A also calls X (gives A extra degree)
            {'from_entity_id': 2, 'to_entity_id': 5,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.X', 'relation_type': 'calls'},
            # B calls hub + A + X (higher degree)
            {'from_entity_id': 3, 'to_entity_id': 1,
             'from_entity_name': 'mod.B', 'to_entity_name': 'mod.hub', 'relation_type': 'calls'},
            {'from_entity_id': 3, 'to_entity_id': 2,
             'from_entity_name': 'mod.B', 'to_entity_name': 'mod.A', 'relation_type': 'calls'},
            {'from_entity_id': 3, 'to_entity_id': 5,
             'from_entity_name': 'mod.B', 'to_entity_name': 'mod.X', 'relation_type': 'calls'},
            # C calls hub only (lowest degree)
            {'from_entity_id': 4, 'to_entity_id': 1,
             'from_entity_name': 'mod.C', 'to_entity_name': 'mod.hub', 'relation_type': 'calls'},
        ]
        return make_db(entities=entities, relations=relations)

    def test_max_results_truncates(self):
        """max_results=2 returns exactly 2 results."""
        path = self._build_db()
        try:
            engine = GraphEngine(path)
            result = engine.callers_of('mod.hub', max_results=2)
            assert len(result) == 2, f"Expected 2 results, got {len(result)}"
        finally:
            os.unlink(path)

    def test_max_results_zero_returns_all(self):
        """max_results=0 (default) returns all callers."""
        path = self._build_db()
        try:
            engine = GraphEngine(path)
            result = engine.callers_of('mod.hub', max_results=0)
            assert len(result) == 3  # A, B, C
        finally:
            os.unlink(path)

    def test_results_sorted_by_degree_desc(self):
        """Results are sorted by total degree descending (highest first)."""
        path = self._build_db()
        try:
            engine = GraphEngine(path)
            result = engine.callers_of('mod.hub')
            degrees = [engine._degree_of(r['qualified_name']) for r in result]
            assert degrees == sorted(degrees, reverse=True), \
                f"Results not sorted by degree desc: {degrees}"
        finally:
            os.unlink(path)


class TestCalleesOfMaxResults:
    """T13: max_results + degree sorting for callees_of."""

    def test_max_results_truncates(self):
        """max_results=1 returns exactly 1 callee."""
        entities = [
            {'name': 'root', 'qualified_name': 'mod.root'},
            {'name': 'p',    'qualified_name': 'mod.p'},
            {'name': 'q',    'qualified_name': 'mod.q'},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'mod.root', 'to_entity_name': 'mod.p', 'relation_type': 'calls'},
            {'from_entity_id': 1, 'to_entity_id': 3,
             'from_entity_name': 'mod.root', 'to_entity_name': 'mod.q', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            result = engine.callees_of('mod.root', max_results=1)
            assert len(result) == 1
        finally:
            os.unlink(path)

    def test_max_results_zero_returns_all(self):
        """max_results=0 returns all callees."""
        entities = [
            {'name': 'root', 'qualified_name': 'mod.root'},
            {'name': 'p',    'qualified_name': 'mod.p'},
            {'name': 'q',    'qualified_name': 'mod.q'},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'mod.root', 'to_entity_name': 'mod.p', 'relation_type': 'calls'},
            {'from_entity_id': 1, 'to_entity_id': 3,
             'from_entity_name': 'mod.root', 'to_entity_name': 'mod.q', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            result = engine.callees_of('mod.root', max_results=0)
            assert len(result) == 2
        finally:
            os.unlink(path)


class TestImpactRadiusMaxResults:
    """T13: max_results + degree sorting for impact_radius."""

    def test_max_results_truncates_affected(self):
        """max_results=1 limits affected list but total stays at full BFS count."""
        entities = [
            {'name': 'A', 'qualified_name': 'mod.A'},
            {'name': 'B', 'qualified_name': 'mod.B'},
            {'name': 'C', 'qualified_name': 'mod.C'},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.B', 'relation_type': 'calls'},
            {'from_entity_id': 1, 'to_entity_id': 3,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.C', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            result = engine.impact_radius('mod.A', max_results=1)
            assert len(result['affected']) == 1
            assert result['total'] == 2  # full BFS count preserved
        finally:
            os.unlink(path)

    def test_max_results_zero_returns_all(self):
        """max_results=0 returns all affected entities."""
        entities = [
            {'name': 'A', 'qualified_name': 'mod.A'},
            {'name': 'B', 'qualified_name': 'mod.B'},
            {'name': 'C', 'qualified_name': 'mod.C'},
        ]
        relations = [
            {'from_entity_id': 1, 'to_entity_id': 2,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.B', 'relation_type': 'calls'},
            {'from_entity_id': 1, 'to_entity_id': 3,
             'from_entity_name': 'mod.A', 'to_entity_name': 'mod.C', 'relation_type': 'calls'},
        ]
        path = make_db(entities=entities, relations=relations)
        try:
            engine = GraphEngine(path)
            result = engine.impact_radius('mod.A', max_results=0)
            assert len(result['affected']) == 2
            assert result['total'] == 2
        finally:
            os.unlink(path)
