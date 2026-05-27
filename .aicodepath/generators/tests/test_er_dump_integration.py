"""Integration tests — ERDiagramGenerator with dump file fixtures."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from generators.diagrams.er_diagram import ERDiagramGenerator

FIXTURES = os.path.join(os.path.dirname(__file__), 'fixtures')


def fixture_path(name):
    return os.path.join(FIXTURES, name)


def run_tests():
    passed = 0
    failed = 0

    def check(name, condition, detail=""):
        nonlocal passed, failed
        if condition:
            print(f"  PASS: {name}")
            passed += 1
        else:
            print(f"  FAIL: {name}" + (f" — {detail}" if detail else ""))
            failed += 1

    print("=== test_er_dump_integration ===")

    # --- PostgreSQL fixture ---
    gen = ERDiagramGenerator()
    result = gen.generate([fixture_path('pg_dump_sample.sql')])

    check("pg: errors=[]", result.errors == [], f"errors: {result.errors}")
    check("pg: confidence >= 0.7", result.confidence_score >= 0.7,
          f"confidence={result.confidence_score}")
    # FK relationships should appear in mermaid output
    mermaid = result.mermaid_code
    check("pg: mermaid contains >=2 FK relationships",
          mermaid.count('||') + mermaid.count('}o') >= 2,
          f"mermaid:\n{mermaid}")
    check("pg: mermaid contains 'erDiagram'", 'erDiagram' in mermaid)
    check("pg: entities include users/posts/comments",
          'users' in mermaid and 'posts' in mermaid and 'comments' in mermaid,
          f"mermaid missing tables")

    # --- MySQL fixture ---
    gen = ERDiagramGenerator()
    result = gen.generate([fixture_path('mysql_dump_sample.sql')])

    check("mysql: errors=[]", result.errors == [], f"errors: {result.errors}")
    check("mysql: confidence >= 0.7", result.confidence_score >= 0.7,
          f"confidence={result.confidence_score}")

    # --- SQLite fixture ---
    gen = ERDiagramGenerator()
    result = gen.generate([fixture_path('sqlite_dump_sample.sql')])

    check("sqlite: errors=[]", result.errors == [], f"errors: {result.errors}")
    check("sqlite: confidence >= 0.7", result.confidence_score >= 0.7,
          f"confidence={result.confidence_score}")

    # --- Empty file -> errors non-empty, confidence=0.0 ---
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.sql', mode='w', delete=False) as f:
        f.write('')
        empty_path = f.name

    try:
        gen = ERDiagramGenerator()
        result = gen.generate([empty_path])
        check("empty file: errors non-empty", len(result.errors) > 0,
              f"errors={result.errors}")
        check("empty file: confidence=0.0", result.confidence_score == 0.0,
              f"confidence={result.confidence_score}")
    finally:
        os.unlink(empty_path)

    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
