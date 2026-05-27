---
name: aicodepath-release
description: Package a release — automates CHANGELOG, version bumping, GitHub tag and Release publishing.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "<patch | minor | major> [--dry-run] [--no-tag] [--no-push]"
---

# AICodePath Release

Automates the full release workflow: CHANGELOG → version bump → commit → tag → GitHub Release.

## When to Use

- All planned tasks for a milestone are DONE in tasks.md
- `/aicodepath-verify` has passed
- Tests are green on main branch
- User says "release", "cut a release", "publish v2.x", "bump to patch/minor/major"

<HARD-GATE>
Do NOT create a release without:
1. Checking that all milestone tasks are DONE (not WIP or BLOCKED)
2. Running tests to confirm green state
3. Confirming version bump type with the user (patch/minor/major)
</HARD-GATE>

## Version Bump Rules (Semantic Versioning)

| Type | When | Example |
|------|------|---------|
| `patch` | Bug fixes, no new features, no breaking changes | 2.5.1 → 2.5.2 |
| `minor` | New features, no breaking changes | 2.5.1 → 2.6.0 |
| `major` | Breaking changes (removed/renamed API, incompatible behavior) | 2.5.1 → 3.0.0 |

**Default**: ask user if not specified. Never assume.

## Release Steps

### Step 1 — Pre-release Checks
```bash
# Verify clean working tree
git status

# Verify on main/master branch
git branch --show-current

# Verify tests are green
npm test 2>&1 | tail -5

# Read current version
cat package.json | node -e "const p=require('/dev/stdin'); console.log(p.version);"
```

If any check fails → stop and fix before proceeding.

### Step 2 — Collect Changes Since Last Tag
```bash
# Get last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

# Get commits since last tag (or all commits if no tag exists)
if [ -n "$LAST_TAG" ]; then
  git log ${LAST_TAG}..HEAD --oneline --no-merges
else
  git log --oneline --no-merges | head -50
fi
```

Group commits by type:
- `feat:` / `feature:` → Features
- `fix:` / `bugfix:` → Bug Fixes
- `perf:` → Performance
- `refactor:` → Refactoring
- `docs:` → Documentation
- `test:` → Tests
- `chore:` / `build:` / `ci:` → Maintenance

### Step 3 — Generate CHANGELOG Entry

Append to `CHANGELOG.md` (create if missing):

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Features
- feat: description of new feature (commit-hash)

### Bug Fixes
- fix: description of fix (commit-hash)

### Performance
- perf: description (commit-hash)

### Maintenance
- chore: description (commit-hash)
```

Omit empty sections. Include commit hash (short, 7 chars) for traceability.

### Step 4 — Bump Version

```bash
# Bump version in package.json
npm version patch|minor|major --no-git-tag-version

# Verify new version
node -e "console.log(require('./package.json').version)"
```

If no package.json, read from `VERSION` file and update manually.

### Step 5 — Commit Release

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release vX.Y.Z"
```

### Step 6 — Tag

```bash
git tag -a "vX.Y.Z" -m "Release vX.Y.Z"
```

Skip if `--no-tag` specified.

### Step 7 — Push

```bash
git push origin main --follow-tags
```

Skip if `--no-push` specified.

### Step 8 — GitHub Release

```bash
# Extract this release's CHANGELOG section
NOTES=$(awk '/^## \[X.Y.Z\]/,/^## \[/' CHANGELOG.md | head -n -1)

# Create GitHub Release
gh release create "vX.Y.Z" \
  --title "vX.Y.Z" \
  --notes "$NOTES" \
  --latest
```

If `--no-push`, skip this step.

## Dry Run Mode

With `--dry-run`:
- Show what version would be bumped to
- Show CHANGELOG entry that would be generated
- Show commits included
- Do NOT write any files, create tags, or push

Output: `DRY RUN: Would release vX.Y.Z with N commits`

## Error Handling

| Error | Action |
|-------|--------|
| Uncommitted changes | Stop — ask user to commit or stash first |
| Tests failing | Stop — fix tests before release |
| Not on main branch | Warn — confirm with user before proceeding |
| No `gh` CLI | Skip GitHub Release step, show manual instructions |
| No internet | Skip push, create local tag, remind to push manually |

## Output

After successful release:
```
✅ Released vX.Y.Z
   Tag: vX.Y.Z
   Commit: abc1234
   GitHub Release: https://github.com/{owner}/{repo}/releases/tag/vX.Y.Z
   CHANGELOG: updated with N commits
```

## NEVER

- **NEVER** release without running tests — a broken release is worse than a delayed release.
- **NEVER** force-push tags — tags are immutable references. If a tag was wrong, create a new one (vX.Y.Z+1).
- **NEVER** assume `major` without explicit confirmation — breaking changes affect downstream users.
- **NEVER** create a GitHub Release with an empty body — the CHANGELOG section is the release body.
