"""Tests for DumpParser — unit tests for all three dialects."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from generators.parsers.dump_parser import DumpParser

FIXTURES = os.path.join(os.path.dirname(__file__), 'fixtures')


def read_fixture(name):
    with open(os.path.join(FIXTURES, name), 'r') as f:
        return f.read()


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

    print("=== test_dump_parser ===")

    pg_content = read_fixture('pg_dump_sample.sql')
    mysql_content = read_fixture('mysql_dump_sample.sql')
    sqlite_content = read_fixture('sqlite_dump_sample.sql')

    # --- PostgreSQL ---
    pg = DumpParser('postgresql')
    result = pg.parse(pg_content)

    check("pg: returns dict", isinstance(result, dict))
    check("pg: has 3 tables", len(result['tables']) == 3,
          f"got {len(result['tables'])}: {[t['name'] for t in result['tables']]}")
    check("pg: has 2 FK edges", len(result['foreign_keys']) == 2,
          f"got {len(result['foreign_keys'])}: {result['foreign_keys']}")
    check("pg: dialect is postgresql", result['dialect'] == 'postgresql')
    check("pg: no warnings", result['warnings'] == [])

    table_names = {t['name'] for t in result['tables']}
    check("pg: tables are users/posts/comments",
          table_names == {'users', 'posts', 'comments'}, f"got {table_names}")

    fk_pairs = {(fk['from_table'], fk['to_table']) for fk in result['foreign_keys']}
    check("pg: FK posts->users exists", ('posts', 'users') in fk_pairs, f"got {fk_pairs}")
    check("pg: FK comments->posts exists", ('comments', 'posts') in fk_pairs, f"got {fk_pairs}")

    # --- MySQL ---
    my = DumpParser('mysql')
    result = my.parse(mysql_content)

    check("mysql: has 3 tables", len(result['tables']) == 3,
          f"got {len(result['tables'])}: {[t['name'] for t in result['tables']]}")
    check("mysql: dialect is mysql", result['dialect'] == 'mysql')
    check("mysql: has FK edges", len(result['foreign_keys']) >= 2,
          f"got {len(result['foreign_keys'])}")

    # --- SQLite ---
    sq = DumpParser('sqlite')
    result = sq.parse(sqlite_content)

    check("sqlite: has 2 tables", len(result['tables']) == 2,
          f"got {len(result['tables'])}: {[t['name'] for t in result['tables']]}")
    check("sqlite: dialect is sqlite", result['dialect'] == 'sqlite')

    # --- Error cases ---
    try:
        pg.parse('')
        check("empty content -> ValueError", False, "no exception raised")
    except ValueError as e:
        check("empty content -> ValueError", True)

    try:
        pg.parse("line1\nline2")
        check("truncated (< 3 lines) -> ValueError", False, "no exception raised")
    except ValueError as e:
        check("truncated (< 3 lines) -> ValueError", True)

    try:
        pg.parse("-- PostgreSQL database dump\nINSERT INTO users VALUES (1);\nINSERT INTO posts VALUES (2);\n")
        check("data-only -> ValueError with 'data-only' in message", False, "no exception raised")
    except ValueError as e:
        check("data-only -> ValueError with 'data-only' in message",
              'data-only' in str(e), f"got: {e}")

    # --- Type normalization ---
    check("normalize bigserial -> INTEGER", pg._normalize_types('bigserial') == 'INTEGER')
    check("normalize uuid -> VARCHAR", pg._normalize_types('uuid') == 'VARCHAR')
    check("normalize jsonb -> TEXT", pg._normalize_types('jsonb') == 'TEXT')
    check("normalize tinyint(1) -> BOOLEAN", pg._normalize_types('tinyint(1)') == 'BOOLEAN')
    check("normalize datetime -> TIMESTAMP", pg._normalize_types('datetime') == 'TIMESTAMP')

    # --- Invalid dialect ---
    try:
        DumpParser('oracle')
        check("invalid dialect -> ValueError", False, "no exception raised")
    except ValueError:
        check("invalid dialect -> ValueError", True)

    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
