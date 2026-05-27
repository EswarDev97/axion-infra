# Claude Code Permissions: Safe vs Fast Development Modes

**Source**: https://claudefa.st/blog/guide/development/permission-management
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Five Permission Modes

Cycle with `Shift+Tab`, or set a persistent default via `permissions.defaultMode` in
`settings.json`.

- **Normal** — Prompts for every potentially risky operation (file edits, terminal commands,
  system changes). Prioritizes security over speed. Best for production code and unfamiliar
  projects.
- **Auto-Accept** (`acceptEdits`) — Removes confirmation dialogs for file modifications.
  Commands still prompt. Enables continuous work during large refactoring or documentation.
- **Plan** — Restricts Claude to read-only operations. Ideal for architecture reviews and
  initial codebase exploration.
- **Don't Ask** (`dontAsk`) — Auto-denies all tools unless explicitly pre-approved via
  `/permissions` rules. Suitable for CI/CD pipelines without human oversight.
- **Bypass Permissions** (`bypassPermissions`) — Skips all checks entirely. Only for isolated
  environments (containers) where damage cannot spread.

A fifth production-grade mode, **Auto Mode**, is documented separately in `auto-mode.md` — it
sits between `acceptEdits` and `bypassPermissions` by routing every action through an AI
classifier before execution.

## Managing Permissions

- `/permissions` launches an interactive UI for viewing allowed/denied tools and creating rules.
- Patterns like `Bash(npm run *)` provide granular control.
- **Deny rules always take precedence over allow rules.** Evaluation order: deny → ask → allow.

## Defense-in-Depth

Permissions and sandboxing complement each other:

- **Permissions** control which tools Claude attempts to use (application layer).
- **Sandboxing** provides OS-level enforcement that blocks access to restricted resources even
  if other controls fail.

See `auto-mode.md` for the full 5-layer defense stack (permission rules → auto-mode classifier
→ hooks → sandboxing → self-validating agents).
