"""Tests for ast_parser.py argparse CLI modes.

Runs ast_parser.py as a subprocess to test --index, --reindex,
--diff-reindex, and error cases.
"""

import json
import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

PYTHON = "/home/faizal/workspace/aicodepath-tool/.venv/bin/python3"
PARSER_DIR = str(
    Path(__file__).parent.parent / "generators" / "parsers"
)
PARSER_SCRIPT = "ast_parser.py"


def run_cli(*args, cwd=None, env=None):
    """Run ast_parser.py with given args, return CompletedProcess."""
    cmd = [PYTHON, PARSER_SCRIPT] + list(args)
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=cwd or PARSER_DIR,
        env=env,
    )


def make_temp_db():
    """Create a temporary SQLite DB file and return its path."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    return path


def make_temp_py_file(content="def hello():\n    pass\n"):
    """Write a Python source file to a temp directory, return (dir, file_path)."""
    tmp_dir = tempfile.mkdtemp()
    src_file = os.path.join(tmp_dir, "sample.py")
    with open(src_file, "w") as f:
        f.write(content)
    return tmp_dir, src_file


# ---------------------------------------------------------------------------
# Test: --index mode outputs valid JSON with expected keys
# ---------------------------------------------------------------------------

def test_index_mode_outputs_json():
    tmp_dir, _ = make_temp_py_file()
    db_path = make_temp_db()
    try:
        result = run_cli("--index", tmp_dir, "--db-path", db_path)
        assert result.returncode == 0, (
            f"Expected exit 0, got {result.returncode}\nstderr: {result.stderr}"
        )
        data = json.loads(result.stdout)
        for key in ("indexed", "skipped", "entities", "relations", "resolved"):
            assert key in data, f"Missing key '{key}' in output: {data}"
        assert data["indexed"] >= 1, f"Expected at least 1 indexed, got {data}"
    finally:
        os.unlink(db_path)
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Test: --reindex mode indexes a file then reindexes it, outputs JSON
# ---------------------------------------------------------------------------

def test_reindex_mode():
    tmp_dir, src_file = make_temp_py_file()
    db_path = make_temp_db()
    try:
        # First index the directory so the file exists in DB
        run_cli("--index", tmp_dir, "--db-path", db_path)

        # Now reindex the single file
        result = run_cli("--reindex", src_file, "--db-path", db_path)
        assert result.returncode == 0, (
            f"Expected exit 0, got {result.returncode}\nstderr: {result.stderr}"
        )
        data = json.loads(result.stdout)
        for key in ("indexed", "skipped", "entities", "relations", "resolved"):
            assert key in data, f"Missing key '{key}' in output: {data}"
        # reindex should always count as 1 indexed
        assert data["indexed"] == 1, f"Expected indexed=1, got {data}"
    finally:
        os.unlink(db_path)
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Test: no args → exit code 1
# ---------------------------------------------------------------------------

def test_no_args_exits_1():
    result = run_cli()
    assert result.returncode == 1, (
        f"Expected exit 1 (no mode given), got {result.returncode}"
    )


# ---------------------------------------------------------------------------
# Test: --diff-reindex in a non-git directory exits 0 with empty/zero stats
# ---------------------------------------------------------------------------

def test_diff_reindex_no_git_exits_0():
    tmp_dir = tempfile.mkdtemp()
    db_path = make_temp_db()
    try:
        # Run --diff-reindex from a non-git directory (tmp_dir has no .git)
        env = dict(os.environ)
        result = subprocess.run(
            [PYTHON, os.path.join(PARSER_DIR, PARSER_SCRIPT),
             "--diff-reindex", "--db-path", db_path],
            capture_output=True,
            text=True,
            cwd=tmp_dir,
            env=env,
        )
        assert result.returncode == 0, (
            f"Expected exit 0 (graceful degradation), got {result.returncode}\n"
            f"stderr: {result.stderr}\nstdout: {result.stdout}"
        )
        # Should still output valid JSON
        data = json.loads(result.stdout)
        for key in ("indexed", "skipped", "entities", "relations", "resolved"):
            assert key in data, f"Missing key '{key}' in output: {data}"
    finally:
        os.unlink(db_path)
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Test: --index with nonexistent path → exit 1
# ---------------------------------------------------------------------------

def test_index_missing_path_exits_1():
    db_path = make_temp_db()
    try:
        result = run_cli("--index", "/nonexistent/path/that/does/not/exist",
                         "--db-path", db_path)
        assert result.returncode == 1, (
            f"Expected exit 1 (missing path), got {result.returncode}\n"
            f"stderr: {result.stderr}"
        )
    finally:
        os.unlink(db_path)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    tests = [
        test_index_mode_outputs_json,
        test_reindex_mode,
        test_no_args_exits_1,
        test_diff_reindex_no_git_exits_0,
        test_index_missing_path_exits_1,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
            passed += 1
        except Exception as exc:
            print(f"  FAIL  {t.__name__}: {exc}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
