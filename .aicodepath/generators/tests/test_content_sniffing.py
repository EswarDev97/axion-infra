"""Tests for sniff_sql_content() content sniffing."""
import sys
import os

# Allow running from any directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.file_analyzer import sniff_sql_content

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

    print("=== test_content_sniffing ===")

    # pg fixture → "pgdump"
    pg_content = read_fixture('pg_dump_sample.sql')
    result = sniff_sql_content(pg_content)
    check("pg fixture → 'pgdump'", result == 'pgdump', f"got {result!r}")

    # mysql fixture → "mysqldump"
    mysql_content = read_fixture('mysql_dump_sample.sql')
    result = sniff_sql_content(mysql_content)
    check("mysql fixture → 'mysqldump'", result == 'mysqldump', f"got {result!r}")

    # sqlite fixture → "sqlite_dump"
    sqlite_content = read_fixture('sqlite_dump_sample.sql')
    result = sniff_sql_content(sqlite_content)
    check("sqlite fixture → 'sqlite_dump'", result == 'sqlite_dump', f"got {result!r}")

    # empty string → ValueError
    try:
        sniff_sql_content('')
        check("empty string → ValueError", False, "no exception raised")
    except ValueError as e:
        check("empty string → ValueError", True)

    # unrecognized content → None
    result = sniff_sql_content("SELECT 1;\nSELECT 2;\nSELECT 3;\n")
    check("unrecognized content → None", result is None, f"got {result!r}")

    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
