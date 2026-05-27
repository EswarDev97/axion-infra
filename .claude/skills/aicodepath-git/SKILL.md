---
name: aicodepath-git
description: Git operations beyond commits — branch management, conflict resolution, history, and safe destructive ops.
user-invocable: true
allowed-tools: Bash, Read, Glob
argument-hint: "<git operation or goal>"
---

# AICodePath Git

## When to Activate

- Complex git operations (rebase, cherry-pick, bisect, stash)
- Merge conflict resolution
- Investigating history ("when did this break?", "who changed X?")
- Setting up branch strategies for new features
- User asks "git help", "resolve this conflict", "find when this was introduced"

## Safety Rules

<HARD-GATE>
NEVER run destructive git operations without explicit user confirmation:
- `git reset --hard` — destroys uncommitted work
- `git push --force` — overwrites remote history
- `git branch -D` — deletes a branch permanently
- `git clean -f` — deletes untracked files

Always show the command and explain its effect BEFORE running.
</HARD-GATE>

## Common Operations

### Safe Read Operations (run freely)
```bash
git status                    # Current state
git log --oneline -20         # Recent commits
git diff HEAD                 # Uncommitted changes
git diff main...HEAD          # Changes vs main
git branch -a                 # All branches
git stash list                # Saved stashes
git log --follow -p <file>    # File history with diffs
```

### Branch Management
```bash
# Create feature branch from main
git checkout -b feat/description main

# Update feature branch with main changes
git fetch origin
git rebase origin/main

# List branches with last commit
git branch -v
```

### Commit Quality
```bash
# Stage selectively (not everything)
git add -p                    # Interactive patch staging

# Review before committing
git diff --staged             # What's about to be committed

# Good commit message format
git commit -m "type: short description (≤72 chars)

- Bullet detail if needed
- Another detail"
```

### Conflict Resolution
When conflicts arise:
1. `git status` — identify conflicted files
2. Read each conflicted file — understand BOTH sides
3. Decide: take ours, theirs, or merge manually
4. `git add <resolved-file>`
5. `git rebase --continue` or `git merge --continue`

### History Investigation
```bash
# Find when a line was last changed
git log -S "search string" --oneline

# Find which commit introduced a bug (binary search)
git bisect start
git bisect bad HEAD
git bisect good <last-known-good-commit>
# ... git bisect good/bad until found

# See file at specific commit
git show <commit>:<file>

# Who last changed each line
git blame <file>
```

### Worktree Operations
For parallel work without branch switching:
```bash
git worktree add ../project-feat-branch feat/branch-name
# Work in separate directory simultaneously
git worktree remove ../project-feat-branch
```

### Stash Operations
```bash
git stash push -m "description"   # Save with name
git stash list                    # See all stashes
git stash pop                     # Apply and remove latest
git stash drop stash@{0}          # Delete specific stash
```

## Destructive Operations — Confirm First

| Command | Effect | Alternative |
|---------|--------|------------|
| `git reset --hard` | Lose all uncommitted changes | `git stash` first |
| `git push --force` | Overwrite remote | `git push --force-with-lease` (safer) |
| `git branch -D` | Delete branch (even unmerged) | `git branch -d` (safe — requires merged) |
| `git clean -f` | Delete untracked files | `git clean -n` first (dry run) |
| `git rebase -i` | Rewrite history | Only on local, never on shared branches |

## AICodePath Integration

After completing a feature, the standard commit flow:
```bash
# 1. Verify everything passes (run /aicodepath-verify)
# 2. Stage specific files (not git add .)
git add .aicodepath/lib/my-module.js .aicodepath/hooks/my-hook.js

# 3. Review staged changes
git diff --staged

# 4. Commit with conventional format
git commit -m "feat: add my-module with X capability"

# 5. Push to remote
git push -u origin feat/my-branch
```

Conventional commit types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

## Integration

```
/aicodepath-verify → /aicodepath-git (commit) → /aicodepath-checkpoint
```
