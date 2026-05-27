---
name: aicodepath-discover
description: >
  Use when discovering the full ecosystem of related repositories, services, and dependencies from a single starting point — scans 10 signal types to auto-detect connected systems. Triggered by: "discover ecosystem", "find related repos", "map all services", "what else connects to this", platform audit.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, Agent, WebSearch, Skill, TodoWrite
argument-hint: "<starting-repo-path> [--org <github-org>] [--depth shallow|deep]"
---

# AICodePath Ecosystem Discovery

Auto-discover the full platform ecosystem from a single repository entry point by scanning 10 signal types with confidence scoring.

## Before You Start — Three Questions

1. **Is the org known?** If the git remote reveals the org (e.g., `github.com/acme/`), all signal scans can filter for org-scoped references. Without an org, you're pattern-matching blindly — lower confidence on everything.
2. **Monorepo or multi-repo?** Monorepo discovery is simpler (workspace configs are authoritative). Multi-repo requires external API calls (`gh repo list`) and signal correlation.
3. **What's the goal?** Platform migration (need everything) vs. feature impact analysis (need only direct dependencies) determines whether LOW-confidence signals matter.

## Process

### Step 1: Detect Starting Context

1. Extract org from git remote: `git remote get-url origin`
2. Check for monorepo workspace configs: `Glob` for `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`
3. Read `package.json` for scope and workspace fields

### Step 2: Scan 10 Signal Types

**MANDATORY — READ ENTIRE FILE `references/signal-scan-commands.md` (~100 lines)** before scanning. It contains per-signal detection commands using the correct AICodePath tools (Grep/Glob, not bash grep).

For each signal type:
1. Run the detection command from the reference file
2. Score each finding: CONFIRMED / HIGH / MEDIUM / LOW
3. Record: system name, type, confidence, signal source, location

**Agent delegation** — for deep scans (`--depth deep`), spawn an `Explore` agent per signal category:
- Infrastructure signals (Signals 2, 6, 9): one agent
- Code-level signals (Signals 1, 4, 5, 8, 10): one agent
- Config signals (Signals 3, 7): one agent

### Step 3: Compile Discovery Report

Write `aicodepath-docs/ecosystem-discovery.md` with discovered systems table, signal details, and recommendations.

### Step 4: Generate Dependency Graph

Invoke `/aicodepath-diagrams` to produce a Mermaid graph of system interconnections. If `/aicodepath-diagrams` is unavailable, generate inline Mermaid in the report.

### Step 5: Handoff

Offer the user explicit next steps:
1. `/aicodepath-reverse-engineer` on any discovered system
2. `/aicodepath-batch` on all discovered repos (pass the discovery report)
3. `/aicodepath-brainstorm` using discovery as context for multi-service features

## NEVER

- **NEVER report a system as CONFIRMED without verifying it exists** — a package name in `package.json` might be a typo or deprecated dependency. CONFIRMED means you verified the target is reachable or exists in the org.
- **NEVER use bash `grep` when the `Grep` tool is available** — Grep provides proper file access and permissions. Bash grep can silently fail on permission-denied files, giving incomplete results.
- **NEVER treat message queue names as service names** — `order-queue` is a queue, not a service. The service that consumes it may have a completely different name. Record the queue; mark the service as MEDIUM confidence.
- **NEVER scan `.env` files committed to git as authoritative** — committed `.env` files often contain outdated or placeholder values. Cross-reference with code that reads the env var.
- **NEVER report `node_modules/`, `vendor/`, or `.git/` contents as signals** — these are dependency artifacts, not project-owned code. Filter them from all scans.
- **NEVER assume HTTPS URL fragments in code are internal services** — `https://api.stripe.com` is an external dependency, not an org service. Check URL domain against org domain patterns.
- **NEVER skip the confidence level assignment** — every finding MUST have a confidence level. "Discovered" without confidence is unactionable.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Too many LOW-confidence signals | Scanning too broadly | Filter by org scope; use `--depth shallow` |
| Missing services that exist | Org name not detected | Pass `--org` explicitly |
| Duplicate findings across signals | Same system found by multiple signals | Deduplicate by system name; keep highest confidence |
| `gh repo list` fails | Not authenticated | Run `gh auth login` or skip GitHub API scan |
| Monorepo not detected | Non-standard workspace config | Check for `package.json` `workspaces` field manually |

## Reference Files

| File | Load when |
|------|-----------|
| `references/signal-scan-commands.md` (~100 lines) | **MANDATORY** — before running any signal scan in Step 2 |
