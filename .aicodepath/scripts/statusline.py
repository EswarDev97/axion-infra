#!/usr/bin/env python3
"""
AICodePath Statusline Script (Python)

Cross-platform statusline for Claude Code terminal.
No external dependencies required (uses stdlib only).

Output format:
  [ Claude: Model ] [ ████░░ 60% ] [ PHASE ] [ branch ] [ project ]
"""

import json
import os
import subprocess
import sys
import sqlite3
from pathlib import Path

# ANSI Color Codes
RESET = "\033[0m"
BOLD = "\033[1m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
PURPLE = "\033[35m"
ORANGE = "\033[38;5;208m"
BLUE = "\033[34m"
WHITE = "\033[37m"
DIM = "\033[2m"


def get_git_branch(project_dir: str) -> str:
    """Get current git branch name."""
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=2
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()

        # Fallback to short HEAD for detached state
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=2
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        pass
    return ""


def get_aicodepath_data(project_dir: str) -> dict:
    """Query AICodePath knowledge base for workflow state."""
    result = {"phase": "", "unit": "", "validation_mode": ""}

    # Look for the database
    db_paths = [
        os.path.join(project_dir, "aicodepath-docs", "aicodepath.db"),
    ]

    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break

    if not db_path:
        return result

    try:
        conn = sqlite3.connect(db_path, timeout=1)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get current workflow state (most recent in_progress)
        cursor.execute("""
            SELECT phase, stage, unit
            FROM workflow_state
            WHERE status = 'in_progress'
            ORDER BY started_at DESC
            LIMIT 1
        """)
        row = cursor.fetchone()

        if row:
            result["phase"] = row["phase"] or ""
            result["unit"] = row["unit"] or ""

        # Get validation mode from session state
        cursor.execute("""
            SELECT value FROM session_state WHERE key = 'validation_mode'
        """)
        row = cursor.fetchone()
        if row:
            try:
                result["validation_mode"] = json.loads(row["value"])
            except json.JSONDecodeError:
                pass

        conn.close()
    except (sqlite3.Error, OSError):
        pass

    return result


def generate_progress_bar(percent: int, width: int = 10) -> str:
    """Generate a progress bar string."""
    filled = min(width, int(percent * width / 100))
    empty = width - filled
    return "█" * filled + "░" * empty


def get_bar_color(percent: int) -> str:
    """Get ANSI color based on context usage threshold."""
    if percent < 60:
        return GREEN
    elif percent < 80:
        return YELLOW
    return RED


def get_phase_color(phase: str) -> str:
    """Get ANSI color for AICodePath phase."""
    colors = {
        "PRE-FLIGHT": WHITE,
        "INCEPTION": CYAN,
        "CONSTRUCTION": BLUE,
        "OPERATIONS": GREEN,
    }
    return colors.get(phase, DIM)


def get_provider_data(raw_input: str):
    """Call provider-data-extractor.js. Returns normalized dict or None on failure."""
    _script_dir = Path(__file__).resolve().parent
    candidates = [
        Path.home() / ".aicodepath/scripts/provider-data-extractor.js",
        _script_dir / "provider-data-extractor.js",
        Path(".aicodepath/scripts/provider-data-extractor.js"),
    ]
    extractor = next((p for p in candidates if p.exists()), None)
    if extractor is None:
        return None
    try:
        result = subprocess.run(
            ["node", str(extractor)],
            input=raw_input, capture_output=True, text=True, timeout=2
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception:
        pass
    return None


def main():
    # Read JSON from stdin
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)
    except json.JSONDecodeError:
        print("[statusline: invalid JSON]")
        return

    # Try provider-aware extraction first
    provider_data = get_provider_data(input_data)

    # Parse Claude Code data — provider-aware path takes priority
    project_dir = data.get("workspace", {}).get("project_dir") or data.get("cwd", "")
    context_window = data.get("context_window", {})

    if provider_data is not None:
        model = provider_data.get("model_display", "Unknown")
        model_short = provider_data.get("model_display_short", model)
        percent_raw = provider_data.get("context_percent") or 0
        percent = max(0, min(100, int(round(percent_raw))))
    else:
        model = data.get("model", {}).get("display_name", "Unknown")

        # Shorten model display: strip "Claude " prefix
        model_short = model.removeprefix("Claude ") if model.startswith("Claude ") else model

        # Compute context percentage using all token types (input + cache_create + cache_read).
        # used_percentage counts input tokens only and underestimates when caching is active.
        # Take the higher of both to never show less than the CLI's own figure.
        used_pct = context_window.get("used_percentage")
        used_pct_int = int(round(used_pct)) if used_pct is not None else 0

        context_size = context_window.get("context_window_size", 0)
        current_usage = context_window.get("current_usage")
        if current_usage and context_size:
            input_tokens = current_usage.get("input_tokens", 0)
            cache_create = current_usage.get("cache_creation_input_tokens", 0)
            cache_read = current_usage.get("cache_read_input_tokens", 0)
            total_tokens = input_tokens + cache_create + cache_read
            raw_pct = int(total_tokens * 100 / context_size)
        else:
            raw_pct = 0

        percent = max(used_pct_int, raw_pct)

        # Clamp percentage to 0-100
        percent = max(0, min(100, percent))

    # Get bar color and progress bar
    bar_color = get_bar_color(percent)
    progress_bar = generate_progress_bar(percent)

    # Get git branch
    git_branch = get_git_branch(project_dir) if project_dir else ""

    # Get project name
    project_name = Path(project_dir).name if project_dir else "unknown"

    # Get AICodePath data
    aicodepath = get_aicodepath_data(project_dir)
    phase = aicodepath.get("phase", "")
    unit = aicodepath.get("unit", "")

    # Build user@host prefix
    import getpass
    import socket
    user_host = f"{getpass.getuser()}@{socket.gethostname().split('.')[0]}"

    # Build statusline: user@host:path [branch] [model] [bar%]
    parts = []

    # user@host:path
    parts.append(f"{BOLD}{user_host}:{project_dir}{RESET}")

    # Git branch
    if git_branch:
        parts.append(f"{PURPLE}[{git_branch}]{RESET}")

    # Model (shortened)
    parts.append(f"{CYAN}[{model_short}]{RESET}")

    # Context bar
    parts.append(f"{bar_color}[{progress_bar} {percent}%]{RESET}")

    # Output statusline
    print(" ".join(parts))


if __name__ == "__main__":
    main()
