#!/usr/bin/env python3
"""
Validate a handoff document for completeness and quality.

Checks:
- No TODO placeholders remaining
- Required sections present and populated
- No potential secrets detected
- Referenced files exist
- Quality scoring

Usage:
    python validate_handoff.py <handoff-file>
    python validate_handoff.py aicodepath-docs/handoffs/2024-01-15-143022-auth.md
"""

import os
import re
import subprocess
import sys
from pathlib import Path


def get_project_root(hint: Path = None) -> str:
    """Resolve project root via git, falling back to __file__ traversal.

    hint: an absolute path anywhere inside the project (e.g. the handoff file)
          used as the cwd for git so it works even when this script is invoked
          from inside .aicodepath/.
    """
    cwd = str(hint.parent) if hint else None
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5, cwd=cwd
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    # Fallback: .aicodepath/skills/aicodepath-pause/scripts/ → 4 parents up
    return str(Path(__file__).resolve().parent.parent.parent.parent.parent)

# Secret detection patterns
SECRET_PATTERNS = [
    (r'["\']?[a-zA-Z_]*api[_-]?key["\']?\s*[:=]\s*["\'][^"\']{10,}["\']', "API key"),
    (r'["\']?[a-zA-Z_]*password["\']?\s*[:=]\s*["\'][^"\']+["\']', "Password"),
    (r'["\']?[a-zA-Z_]*secret["\']?\s*[:=]\s*["\'][^"\']{10,}["\']', "Secret"),
    (r'["\']?[a-zA-Z_]*token["\']?\s*[:=]\s*["\'][^"\']{20,}["\']', "Token"),
    (r'["\']?[a-zA-Z_]*private[_-]?key["\']?\s*[:=]', "Private key"),
    (r'-----BEGIN [A-Z]+ PRIVATE KEY-----', "PEM private key"),
    (r'mongodb(\+srv)?://[^/\s]+:[^@\s]+@', "MongoDB connection string with password"),
    (r'postgres://[^/\s]+:[^@\s]+@', "PostgreSQL connection string with password"),
    (r'mysql://[^/\s]+:[^@\s]+@', "MySQL connection string with password"),
    (r'Bearer\s+[a-zA-Z0-9_\-\.]+', "Bearer token"),
    (r'ghp_[a-zA-Z0-9]{36}', "GitHub personal access token"),
    (r'sk-[a-zA-Z0-9]{48}', "OpenAI API key"),
    (r'xox[baprs]-[a-zA-Z0-9-]+', "Slack token"),
]

# Required sections for a complete handoff
REQUIRED_SECTIONS = [
    "Current State Summary",
    "Important Context",
    "Immediate Next Steps",
]

# Recommended sections
RECOMMENDED_SECTIONS = [
    "AIDLC Workflow State",
    "Architecture Overview",
    "Critical Files",
    "Files Modified",
    "Decisions Made",
    "Assumptions Made",
    "Potential Gotchas",
]


def check_todos(content: str) -> tuple[bool, list[str]]:
    """Check for remaining TODO placeholders."""
    todos = re.findall(r'\[TODO:[^\]]*\]', content)
    return len(todos) == 0, todos


def check_required_sections(content: str) -> tuple[bool, list[str]]:
    """Check that required sections exist and have content."""
    missing = []
    for section in REQUIRED_SECTIONS:
        # Look for section header (H1–H3)
        pattern = rf'(?:^|\n)#{{1,3}}\s*{re.escape(section)}'
        match = re.search(pattern, content, re.IGNORECASE)
        if not match:
            missing.append(f"{section} (missing)")
        else:
            # Check if section has meaningful content (not just placeholder)
            section_start = match.end()
            next_section = re.search(r'\n#{1,4}\s+', content[section_start:])
            section_end = section_start + next_section.start() if next_section else len(content)
            section_content = content[section_start:section_end].strip()

            # 50 chars minimum: roughly 1-2 sentences, enough to convey meaningful context
            if len(section_content) < 50 or '[TODO' in section_content:
                missing.append(f"{section} (incomplete)")

    return len(missing) == 0, missing


def check_recommended_sections(content: str) -> list[str]:
    """Check which recommended sections are missing."""
    missing = []
    for section in RECOMMENDED_SECTIONS:
        pattern = rf'(?:^|\n)#{{1,3}}\s*{re.escape(section)}'
        if not re.search(pattern, content, re.IGNORECASE):
            missing.append(section)
    return missing


def check_next_steps_quality(content: str) -> tuple[bool, str]:
    """Check that Immediate Next Steps contains at least one /aicodepath- skill command.

    A handoff without a skill invocation command in Immediate Next Steps will
    cause resume workflow failure — the next agent won't know which skill to
    invoke to continue the AIDLC chain.

    Returns:
        (True, "")          if an /aicodepath-<name> command is found
        (False, <warning>)  if no skill command is found
    """
    # Locate the Immediate Next Steps section (H1–H3)
    pattern = r'(?:^|\n)#{1,3}\s*Immediate Next Steps'
    match = re.search(pattern, content, re.IGNORECASE)
    if not match:
        # Section absent entirely — already caught by check_required_sections
        return False, "Immediate Next Steps section not found"

    section_start = match.end()
    next_section = re.search(r'\n#{1,4}\s+', content[section_start:])
    section_end = section_start + next_section.start() if next_section else len(content)
    section_content = content[section_start:section_end]

    if re.search(r'/aicodepath-[a-z][a-z-]+', section_content):
        return True, ""

    return (
        False,
        "Immediate Next Steps has no /aicodepath- skill command — "
        "the resume workflow will not know which skill to invoke next"
    )


def scan_for_secrets(content: str) -> list[tuple[str, str]]:
    """Scan content for potential secrets."""
    findings = []
    for pattern, description in SECRET_PATTERNS:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            findings.append((description, f"Found {len(matches)} potential match(es)"))
    return findings


def check_file_references(content: str, base_path: str) -> tuple[list[str], list[str]]:
    """Check if referenced files exist."""
    # Extract file paths from content (look for common patterns)
    # Pattern 1: | path/to/file | in tables
    # Pattern 2: `path/to/file` in code
    # Pattern 3: path/to/file:123 with line numbers

    patterns = [
        r'\|\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)\s*\|',  # Table cells
        r'`([a-zA-Z0-9_\-./]+\.[a-zA-Z]+(?::\d+)?)`',  # Inline code
        r'(?:^|\s)([a-zA-Z0-9_\-./]+\.[a-zA-Z]+:\d+)',  # With line numbers
    ]

    found_files = set()
    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            # Remove line numbers
            filepath = match.split(':')[0]
            # Skip obvious non-files
            if filepath and not filepath.startswith('http') and '/' in filepath:
                found_files.add(filepath)

    existing = []
    missing = []

    for filepath in found_files:
        full_path = Path(base_path) / filepath
        if full_path.exists():
            existing.append(filepath)
        else:
            missing.append(filepath)

    return existing, missing


def calculate_quality_score(
    todos_clear: bool,
    required_complete: bool,
    missing_required: list,
    missing_recommended: list,
    secrets_found: list,
    files_missing: list,
    next_steps_has_skill: bool = True,
) -> tuple[int, str]:
    """Calculate overall quality score (0-100).

    Scoring rationale:
    - Start at 100, deduct for issues
    - TODOs remaining (-30): Indicates incomplete work, major blocker
    - Missing required sections (-10 each): Core context gaps
    - Secrets detected (-20): Security risk, must be fixed
    - Missing file refs (-5 each, max -20): Stale references
    - Missing recommended (-2 each): Nice-to-have completeness
    - No /aicodepath- skill in Immediate Next Steps (-5): Resume workflow blocker
    """
    score = 100

    # Deductions with justifications
    if not todos_clear:
        # -30: TODOs indicate unfinished work; next agent will lack critical info
        score -= 30
    if not required_complete:
        # -10 per section: Required sections are essential for handoff continuity
        score -= 10 * len(missing_required)
    if secrets_found:
        # -20: Security risk; handoffs may be shared or stored in repos
        score -= 20
    if files_missing:
        # -5 per file (max 4): Indicates stale refs; cap at -20 to avoid over-penalizing
        score -= 5 * min(len(files_missing), 4)
    if not next_steps_has_skill:
        # -5: Missing /aicodepath- command means resume workflow won't know which skill to invoke
        score -= 5

    # -2 per section: Recommended but not critical; minor impact on handoff quality
    score -= 2 * len(missing_recommended)

    score = max(0, score)

    # Rating thresholds based on handoff usability:
    # 90+: Comprehensive, ready to use immediately
    # 70-89: Usable with minor gaps
    # 50-69: Needs work before reliable handoff
    # <50: Too incomplete to be useful
    if score >= 90:
        rating = "Excellent - Ready for handoff"
    elif score >= 70:
        rating = "Good - Minor improvements suggested"
    elif score >= 50:
        rating = "Fair - Needs attention before handoff"
    else:
        rating = "Poor - Significant work needed"

    return score, rating


def validate_handoff(filepath: str) -> dict:
    """Run all validations on a handoff file."""
    path = Path(filepath)

    if not path.exists():
        return {"error": f"File not found: {filepath}"}

    content = path.read_text()
    base_path = Path(get_project_root(hint=path))

    # Run checks
    todos_clear, remaining_todos = check_todos(content)
    required_complete, missing_required = check_required_sections(content)
    missing_recommended = check_recommended_sections(content)
    secrets_found = scan_for_secrets(content)
    existing_files, missing_files = check_file_references(content, str(base_path))
    next_steps_ok, next_steps_warning = check_next_steps_quality(content)

    # Calculate score
    score, rating = calculate_quality_score(
        todos_clear, required_complete, missing_required,
        missing_recommended, secrets_found, missing_files,
        next_steps_has_skill=next_steps_ok,
    )

    return {
        "filepath": str(path),
        "score": score,
        "rating": rating,
        "todos_clear": todos_clear,
        "remaining_todos": remaining_todos[:5],  # Limit output
        "todo_count": len(remaining_todos) if not todos_clear else 0,
        "required_complete": required_complete,
        "missing_required": missing_required,
        "missing_recommended": missing_recommended,
        "secrets_found": secrets_found,
        "files_verified": len(existing_files),
        "files_missing": missing_files[:5],  # Limit output
        "next_steps_ok": next_steps_ok,
        "next_steps_warning": next_steps_warning,
    }


def print_report(result: dict):
    """Print a formatted validation report."""
    if "error" in result:
        print(f"Error: {result['error']}")
        return False

    print(f"\n{'='*60}")
    print(f"Handoff Validation Report")
    print(f"{'='*60}")
    print(f"File: {result['filepath']}")
    print(f"\nQuality Score: {result['score']}/100 - {result['rating']}")
    print(f"{'='*60}")

    # TODOs
    if result['todos_clear']:
        print("\n[PASS] No TODO placeholders remaining")
    else:
        print(f"\n[FAIL] {result['todo_count']} TODO placeholders found:")
        for todo in result['remaining_todos']:
            print(f"       - {todo[:50]}...")

    # Required sections
    if result['required_complete']:
        print("\n[PASS] All required sections complete")
    else:
        print("\n[FAIL] Missing/incomplete required sections:")
        for section in result['missing_required']:
            print(f"       - {section}")

    # Secrets
    if not result['secrets_found']:
        print("\n[PASS] No potential secrets detected")
    else:
        print("\n[WARN] Potential secrets detected:")
        for secret_type, detail in result['secrets_found']:
            print(f"       - {secret_type}: {detail}")

    # File references
    if result['files_missing']:
        print(f"\n[WARN] {len(result['files_missing'])} referenced file(s) not found:")
        for f in result['files_missing']:
            print(f"       - {f}")
    else:
        print(f"\n[INFO] {result['files_verified']} file reference(s) verified")

    # Immediate Next Steps skill command
    if not result.get('next_steps_ok', True):
        print(f"\n[WARN] {result.get('next_steps_warning', 'Immediate Next Steps missing /aicodepath- skill command')}")

    # Recommended sections
    if result['missing_recommended']:
        print(f"\n[INFO] Consider adding these sections:")
        for section in result['missing_recommended']:
            print(f"       - {section}")

    print(f"\n{'='*60}")

    # Final verdict
    if result['score'] >= 70 and not result['secrets_found']:
        print("Verdict: READY for handoff")
        return True
    elif result['secrets_found']:
        print("Verdict: BLOCKED - Remove secrets before handoff")
        return False
    else:
        print("Verdict: NEEDS WORK - Complete required sections")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python validate_handoff.py <handoff-file>")
        print("Example: python3 validate_handoff.py aicodepath-docs/handoffs/2024-01-15-auth.md")
        sys.exit(1)

    filepath = sys.argv[1]
    result = validate_handoff(filepath)
    success = print_report(result)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
