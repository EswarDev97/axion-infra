#!/usr/bin/env python3
"""
Failing test for H3 heading support in check_required_sections().

Tests that `### Important Context` and `### Immediate Next Steps`
(H3 headings) are recognized by check_required_sections().

Expected failure BEFORE fix:
    AssertionError: Important Context reported missing but should be found
"""

import sys
import os
import tempfile
from pathlib import Path

# Resolve path to the script under test
SCRIPT_DIR = Path(__file__).parent.parent / "skills" / "aicodepath-pause" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from validate_handoff import check_required_sections, check_recommended_sections, check_next_steps_quality

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def assert_equal(actual, expected, msg=""):
    if actual != expected:
        raise AssertionError(f"{msg}\n  expected: {expected!r}\n  actual:   {actual!r}")

def assert_true(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_h3_required_sections_found():
    """H3 headings for required sections must be recognised."""
    content = """\
# Handoff: Test

## Session Metadata
- Created: 2026-03-25 10:00:00

## Current State Summary

This is a summary of what was being worked on during the session,
giving meaningful context so the next agent can pick up smoothly.

### Important Context

This is a critical piece of context that the next agent must know.
There is enough content here to exceed the fifty-character threshold.

### Immediate Next Steps

1. Run /aicodepath-tdd to implement the failing test suite.
2. Then verify with /aicodepath-verify after all tests pass.
3. Commit with a descriptive message once done.
"""

    ok, missing = check_required_sections(content)

    # Neither section should be reported missing
    assert_true(
        "Important Context (missing)" not in missing,
        f"Important Context reported missing but should be found. missing={missing}"
    )
    assert_true(
        "Important Context (incomplete)" not in missing,
        f"Important Context reported incomplete but has enough content. missing={missing}"
    )
    assert_true(
        "Immediate Next Steps (missing)" not in missing,
        f"Immediate Next Steps reported missing but should be found. missing={missing}"
    )
    assert_true(
        "Immediate Next Steps (incomplete)" not in missing,
        f"Immediate Next Steps reported incomplete but has enough content. missing={missing}"
    )
    assert_equal(ok, True, f"check_required_sections should return True. missing={missing}")


def test_h2_required_sections_still_work():
    """Existing H2 headings must still be recognised (regression guard)."""
    content = """\
# Handoff: Test

## Current State Summary

This is a summary giving meaningful context for the next agent.
It is definitely longer than fifty characters so it should pass.

## Important Context

Critical context for the next agent in H2 format.
Must be recognised even though it is not an H3.

## Immediate Next Steps

1. Do the first thing.
2. Do the second thing.
3. Do the third thing that completes the work.
"""

    ok, missing = check_required_sections(content)
    assert_equal(ok, True, f"H2 sections should still be found. missing={missing}")


def test_h3_section_with_insufficient_content_is_incomplete():
    """H3 section with < 50 chars of content should be reported incomplete."""
    content = """\
# Handoff: Test

## Current State Summary

Long enough content to pass the fifty-character threshold for sure.

### Important Context

Too short.

### Immediate Next Steps

1. Do something meaningful that goes beyond the threshold.
2. And another step to make it definitely longer than fifty characters.
"""

    ok, missing = check_required_sections(content)
    # Important Context has < 50 chars → should be incomplete
    assert_true(
        "Important Context (incomplete)" in missing,
        f"Expected 'Important Context (incomplete)' in missing. missing={missing}"
    )


def test_aidlc_workflow_state_in_missing_recommended():
    """Handoff without AIDLC Workflow State section → missing_recommended includes it."""
    content = """\
# Handoff: Test

## Current State Summary

This is a meaningful summary that gives context for the next agent.
It is definitely long enough to exceed the fifty-character threshold.

## Important Context

Important context here that the next agent needs to know.
There is enough content to exceed the fifty-character threshold.

## Immediate Next Steps

1. Do something.
2. Do another thing.
3. And a third thing to make sure content is long enough.
"""
    # No "AIDLC Workflow State" section → should appear in missing_recommended
    missing_recommended = check_recommended_sections(content)
    assert_true(
        "AIDLC Workflow State" in missing_recommended,
        f"Expected 'AIDLC Workflow State' in missing_recommended. got={missing_recommended}"
    )


def test_immediate_next_steps_without_skill_command_emits_warning():
    """Immediate Next Steps without /aicodepath- command → check_next_steps_quality returns False + warning."""
    content = """\
# Handoff: Test

## Current State Summary

Meaningful summary of what was worked on during this session.
Long enough to pass the fifty-character threshold easily.

## Important Context

Critical context for the next agent to know.
Long enough to pass the fifty-character threshold easily.

## Immediate Next Steps

1. Do the first thing.
2. Do the second thing.
3. Complete the third thing.
"""
    ok, warning = check_next_steps_quality(content)
    assert_true(
        ok is False,
        f"Expected check_next_steps_quality to return False when no /aicodepath- command present. got ok={ok}"
    )
    assert_true(
        warning != "",
        f"Expected a warning message when no /aicodepath- command present. got warning={warning!r}"
    )


def test_immediate_next_steps_with_skill_command_passes():
    """Immediate Next Steps with /aicodepath- command → check_next_steps_quality returns True."""
    content = """\
# Handoff: Test

## Current State Summary

Meaningful summary of what was worked on during this session.
Long enough to pass the fifty-character threshold easily.

## Important Context

Critical context for the next agent to know.
Long enough to pass the fifty-character threshold easily.

## Immediate Next Steps

1. Run /aicodepath-tdd to implement the failing test suite.
2. Then run /aicodepath-verify once all tests pass.
"""
    ok, warning = check_next_steps_quality(content)
    assert_true(
        ok is True,
        f"Expected check_next_steps_quality to return True when /aicodepath- command present. got ok={ok}, warning={warning!r}"
    )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_tests():
    tests = [
        test_h3_required_sections_found,
        test_h2_required_sections_still_work,
        test_h3_section_with_insufficient_content_is_incomplete,
        test_aidlc_workflow_state_in_missing_recommended,
        test_immediate_next_steps_without_skill_command_emits_warning,
        test_immediate_next_steps_with_skill_command_passes,
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
