#!/usr/bin/env python3
"""
Failing test for --aidlc-state flag in create_handoff.py.

Tests that passing --aidlc-state JSON populates the
`## AIDLC Workflow State` section with zero [TODO] placeholders.

Expected failure BEFORE implementation:
    error: unrecognized arguments: --aidlc-state ...
    OR AssertionError: AIDLC Workflow State section missing
"""

import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = str(
    Path(__file__).parent.parent
    / "skills"
    / "aicodepath-pause"
    / "scripts"
    / "create_handoff.py"
)

AIDLC_STATE = {
    "phase": "CONSTRUCTION",
    "next_skill": "/aicodepath-tdd",
    "batch": 1,
    "task": 1,
    "task_title": "Test title",
    "plan_file": "aicodepath-docs/plans/test.md",
}


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def assert_true(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

def assert_equal(actual, expected, msg=""):
    if actual != expected:
        raise AssertionError(f"{msg}\n  expected: {expected!r}\n  actual:   {actual!r}")


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_aidlc_state_flag_accepted_and_populates_section():
    """--aidlc-state JSON must be accepted and produce a populated AIDLC Workflow State section."""
    with tempfile.TemporaryDirectory() as tmpdir:
        result = subprocess.run(
            [
                sys.executable,
                SCRIPT,
                "aidlc-test",
                "--aidlc-state",
                json.dumps(AIDLC_STATE),
            ],
            capture_output=True,
            text=True,
            cwd=tmpdir,
        )

        assert_equal(
            result.returncode, 0,
            f"create_handoff.py exited with code {result.returncode}.\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )

        # Locate generated file
        handoffs_dir = Path(tmpdir) / "aicodepath-docs" / "handoffs"
        generated_files = list(handoffs_dir.glob("*aidlc-test*.md"))
        assert_true(
            len(generated_files) == 1,
            f"Expected 1 generated handoff, found: {generated_files}"
        )

        content = generated_files[0].read_text()

        # Section must be present
        assert_true(
            "## AIDLC Workflow State" in content,
            "## AIDLC Workflow State section not found in generated handoff"
        )

        # Extract section content (from heading to next ## heading or EOF)
        section_match = re.search(
            r'## AIDLC Workflow State\n(.*?)(?=\n## |\Z)',
            content,
            re.DOTALL
        )
        assert_true(
            section_match is not None,
            "Could not extract AIDLC Workflow State section body"
        )
        section_body = section_match.group(1)

        # No [TODO] placeholders inside the AIDLC section
        todos_in_section = re.findall(r'\[TODO[^\]]*\]', section_body)
        assert_equal(
            todos_in_section, [],
            f"Found [TODO] placeholders in AIDLC Workflow State section: {todos_in_section}\n"
            f"Section body:\n{section_body}"
        )

        # Key fields must appear in the section
        for field_value in [
            "CONSTRUCTION",
            "/aicodepath-tdd",
            "Test title",
            "aicodepath-docs/plans/test.md",
        ]:
            assert_true(
                field_value in section_body,
                f"Expected '{field_value}' to appear in AIDLC Workflow State section.\n"
                f"Section body:\n{section_body}"
            )


def test_handoff_created_without_flag_still_works():
    """create_handoff.py without --aidlc-state must still work (regression guard)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        result = subprocess.run(
            [sys.executable, SCRIPT, "no-aidlc"],
            capture_output=True,
            text=True,
            cwd=tmpdir,
        )
        assert_equal(
            result.returncode, 0,
            f"create_handoff.py without --aidlc-state failed.\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )
        handoffs_dir = Path(tmpdir) / "aicodepath-docs" / "handoffs"
        generated_files = list(handoffs_dir.glob("*no-aidlc*.md"))
        assert_true(len(generated_files) == 1, f"Expected 1 file, found: {generated_files}")


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_tests():
    tests = [
        test_aidlc_state_flag_accepted_and_populates_section,
        test_handoff_created_without_flag_still_works,
    ]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS  {test.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL  {test.__name__}: {e}")
            failed += 1

    print(f"\n{passed} passed, {failed} failed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
