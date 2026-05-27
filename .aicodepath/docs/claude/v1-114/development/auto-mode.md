# Claude Code Auto Mode: Safe Uninterrupted Development

**Source**: https://claudefa.st/blog/guide/development/auto-mode
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

> Launched March 24, 2026. Per the v2.1.111 changelog: **"Auto mode no longer requires
> `--enable-auto-mode`."** Available for Max subscribers when using Opus 4.7.

---

## What Auto Mode Actually Does

Auto mode is a permission mode that sits between `default` (approve everything manually) and
`bypassPermissions` (no checks at all). When enabled, Claude executes actions without showing
permission prompts. Before each action runs, a separate classifier model reviews the
conversation context and the pending action to decide whether it should proceed.

The classifier checks for three categories of risk:

1. **Scope escalation**: Is Claude doing something beyond what you asked for?
2. **Untrusted infrastructure**: Is the action targeting systems the classifier doesn't recognize?
3. **Prompt injection**: Does the action look like it was driven by hostile content Claude encountered in a file or web page?

Safe actions proceed automatically. Risky ones get blocked, and Claude receives the reason so
it can try an alternative approach.

## How the Classifier Works

"The classifier runs on Claude Sonnet 4.6, regardless of which model your main session uses."
It receives your user messages and tool calls as input, with Claude's own text and tool
results stripped out. This design is intentional: because tool results never reach the
classifier, hostile content embedded in files or web pages cannot manipulate the classifier's
decisions directly.

The classifier also receives your CLAUDE.md content, so project-specific instructions factor
into its allow and block decisions.

### Decision Order

Each action follows a fixed evaluation sequence. The first matching step wins:

| Step | Check | Result |
|------|-------|--------|
| 1 | Matches your allow or deny rules | Resolves immediately |
| 2 | Read-only action or file edit in working directory | Auto-approved |
| 3 | Everything else | Goes to classifier |
| 4 | Classifier blocks | Claude retries with alternative approach |

Your existing permission rules still take priority. If you have `Bash(npm test)` in your allow
list, it executes instantly without a classifier call.

### Broad Allow Rules Dropped on Entry

On entering auto mode, Claude Code "drops broad allow rules that grant arbitrary code execution":

- `Bash(*)`
- `Bash(python*)`
- `Bash(node*)`
- Any `Agent` allow rule

These rules would auto-approve the exact commands most capable of causing damage before the
classifier ever evaluates them. **Narrow rules like `Bash(npm test)` or `Bash(git status)`
carry over.** The dropped rules restore when you leave auto mode.

## What Gets Blocked vs Allowed

### Blocked by Default

| Category | Examples |
|----------|----------|
| Remote code execution | `curl \| bash`, scripts from cloned repos |
| Data exfiltration | Sending sensitive data to external endpoints |
| Production operations | Deploys, migrations, database operations |
| Mass destruction | Bulk deletion on cloud storage, `rm -rf` on pre-existing files |
| Permission escalation | Granting IAM or repo permissions |
| Infrastructure changes | Modifying shared infrastructure |
| Destructive git operations | Force push, pushing directly to `main` |

### Allowed by Default

| Category | Examples |
|----------|----------|
| Local file operations | Reading, writing, editing files in your working directory |
| Declared dependencies | Installing packages already in your lock files or manifests |
| Credential usage | Reading `.env` and sending credentials to their matching API |
| Read-only network | HTTP GET requests, fetching documentation |
| Branch operations | Pushing to your current branch or one Claude created |

See all default rules as the classifier receives them: `claude auto-mode defaults`

Administrators can configure trusted infrastructure through the `autoMode.environment`
setting.

## Enabling Auto Mode

### Prerequisites

- **Claude Code Team plan** (Enterprise and API support rolling out shortly)
- **Claude Sonnet 4.6 or Claude Opus 4.6** (not Haiku, claude-3, Bedrock, Vertex)
- **Admin enablement** required on Team plans

### CLI

```
claude --enable-auto-mode
```

`Shift+Tab` cycles: `default` → `acceptEdits` → `plan` → `auto`. Current mode appears in
status bar.

Start directly in auto mode:

```
claude --permission-mode auto
```

### VS Code / Desktop App

VS Code: enable "Allow dangerously skip permissions" → click mode indicator → **Auto**.
Desktop: enable auto mode in Desktop settings → mode selector next to send → **Auto**.

Auto mode is disabled by default on the Claude desktop app.

### Non-Interactive (`-p`)

```
claude -p "refactor the auth module" --permission-mode auto
```

If the classifier triggers a fallback, non-interactive mode **aborts the session** since there
is no user to prompt.

## Subagent Handling

Auto mode evaluates subagents at three points:

- **At spawn**: Classifier evaluates the delegated task description before the subagent starts.
  A task like "delete all remote branches matching this pattern" gets blocked before the
  subagent ever executes.
- **During execution**: Inside the subagent, auto mode runs with the same block and allow rules
  as the parent session. Any `permissionMode` the subagent defines in its own frontmatter is
  ignored. Each tool call goes through the classifier independently.
- **On return**: Classifier reviews the subagent's full action history. If the return check
  flags a concern, a security warning gets prepended to the subagent's results so the main
  agent can decide how to proceed.

## Auto Mode vs Other Permission Modes

| Feature | default | acceptEdits | plan | auto | dontAsk | bypassPermissions |
|---------|---------|-------------|------|------|---------|-------------------|
| Permission prompts | File edits and commands | Commands only | Same as default | None (unless fallback) | None (blocked unless pre-allowed) | None |
| Safety checks | You review each action | You review commands | You review commands | Classifier reviews commands | Your pre-approved rules only | None |
| Token usage | Standard | Standard | Standard | Higher (classifier calls) | Standard | Standard |
| Best for | Sensitive work | Code iteration | Codebase exploration | Long-running tasks | CI/CD pipelines | Isolated containers only |
| Risk level | Lowest | Low | Low | Medium | Depends on rules | Highest |

## When to Use Auto Mode

**Use when:**

- Running long tasks where constant approval prompts break concentration
- You trust the general direction and want a safety net against mistakes
- Using agent loops where no human is available to approve every step
- You want something safer than `bypassPermissions` for non-containerized development

**Do NOT use when:**

- Changing production infrastructure (classifier blocks these by default)
- Working on unfamiliar code where you want to review every action
- You need deterministic, auditable permission control (use `dontAsk` with explicit allow rules)
- Extremely cost-sensitive (classifier calls add token usage)

## Fallback Behavior

If the classifier blocks **3 in a row** or **20 total** in one session, auto mode pauses and
Claude Code resumes prompting manually. **These thresholds are not configurable.**

- **CLI**: notification in status area. Approving a prompt resets counters; you can continue in auto mode afterward.
- **Non-interactive (`-p`)**: session aborts.

Repeated blocks = task genuinely requires stopped actions, OR classifier lacks trusted-infra
context. Use `/feedback` to report false positives.

## Defense in Depth — 5 Layers

Auto mode is one layer. The strongest security posture combines:

1. **Permission rules** — `settings.json` allow/deny; resolve before classifier.
2. **Auto mode classifier** — evaluates what rules don't catch; reasons about context.
3. **Hooks** — `PreToolUse` hooks run custom logic before the permission system.
4. **Sandboxing** — OS-level filesystem/network restriction.
5. **Self-validating agents + stop hooks** — verify task completion and scope adherence.

Each layer catches what the others miss.

## Limitations — Research Preview

- **Does not guarantee safety.** Classifier can miss risky actions or block benign ones.
- **Costs more.** Classifier calls count toward token usage. Extra cost mainly from shell
  commands and network ops.
- **Adds latency.** Each check adds a round trip.
- **Limited availability.** Team plan only; Enterprise/API rolling out. Requires Sonnet 4.6 or
  Opus 4.6. Not available on Haiku, claude-3, or third-party providers.
- **Not a replacement for review on sensitive operations.**

The classifier will improve over time. Use `/feedback` to report false positives and missed
blocks.
