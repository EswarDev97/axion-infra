# Platform Notes

Per-platform requirements and cross-platform coding rules. Split out of `DEVELOPER-GUIDE.md` to keep the root developer guide compact.

---

## Platform Support Matrix

| Platform | Status | Notes |
|----------|--------|-------|
| Linux | Full support | Primary development platform |
| macOS | Full support | All Node.js hooks and bash scripts work natively |
| Windows | Partial support | Node.js hooks work; `.sh` scripts require WSL 2 or Git Bash |

**All platforms:**
- Node.js 18+ required
- `python3` (or set `AICODEPATH_PYTHON` env var) for graph/diagram features
- Claude Code Desktop app (or CLI) installed

---

## Windows Notes

- Use `node .aicodepath/bin/aicodepath.js init-db` instead of `init-knowledge-base.sh` — no bash or sqlite3 CLI needed
- Run other `.sh` scripts inside WSL 2 or Git Bash if needed (they are optional/utility scripts)
- Node.js hooks (`.js`) run natively via Claude Code's built-in Node.js
- Git pre-commit hooks work via Git for Windows (includes bash internally)
- Symlinks fall back to file copies automatically (handled by `symlink-manager.js`)

---

## Cross-Platform Coding Rules

- Use `lib/platform-utils.js` → `findExecutable()` instead of shell `which`/`where`
- Use `lib/platform-utils.js` → `findPython()` instead of hardcoding `python3`
- Use `os.tmpdir()` in Node.js (or `${TMPDIR:-/tmp}` in bash) instead of `/tmp/`
- Never hardcode absolute paths — use `path-resolver.js` or `$(dirname "$0")` in scripts
