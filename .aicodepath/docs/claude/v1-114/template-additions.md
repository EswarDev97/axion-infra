# Settings Template Additions (v1.114+)

Reference for new settings added to `.aicodepath/templates/claude-settings.json.template` during the Opus 4.7 Alignment sprint.

---

## 1. `effortLevel: "xhigh"`

| Field | Value |
|-------|-------|
| Version | v2.1.111 |
| Default | `"xhigh"` |
| Override | `"low"` \| `"medium"` \| `"high"` \| `"xhigh"` in settings.json or `/model` slider |
| Rationale | Opus 4.7 uses an effort slider (not temperature sampling). Setting `xhigh` maximizes reasoning depth for complex tasks while allowing the effort scorer to recommend per-task downgrades. |

## 2. `ENABLE_PROMPT_CACHING_1H`

| Field | Value |
|-------|-------|
| Version | v2.1.108 |
| Default | `"1"` (enabled) |
| Override | Remove from `env` block or set to `"0"` |
| Rationale | Extends prompt cache TTL from 5 minutes to 1 hour, reducing token costs on repeated invocations within a session. Particularly effective for long-running sessions with stable system prompts. |

## 3. `sandbox.network.deniedDomains` (commented example)

| Field | Value |
|-------|-------|
| Version | v1.114 |
| Default | Not set (commented) |
| Override | Uncomment `_sandbox_network_deniedDomains_example` and rename to `sandbox.network.deniedDomains` |
| Rationale | Blocks outbound network requests to specified domains. Useful for preventing accidental data exfiltration to pastebins, tunneling services, or unapproved APIs. |

## 4. `autoScrollEnabled` (commented example)

| Field | Value |
|-------|-------|
| Version | v1.114 |
| Default | `true` |
| Override | Set to `false` to disable auto-scroll in terminal output |
| Rationale | Controls whether the Claude Code terminal UI auto-scrolls to follow new output. Disable for accessibility or when reviewing long outputs that should stay in place. |

## 5. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`

| Field | Value |
|-------|-------|
| Version | v1.114 |
| Default | `"1"` (enabled) |
| Override | Remove from `env` block or set to `"0"` |
| Rationale | Enables native Agent Teams — allows spawning named subagents that can exchange messages via `SendMessage`. Required for AICodePath's swarm orchestration (`/aicodepath-swarm`) and parallel construction patterns. |

## 6. `showThinkingSummaries`

| Field | Value |
|-------|-------|
| Version | v2.1.111 |
| Default | `true` |
| Override | Set to `false` to hide thinking summaries |
| Rationale | Displays condensed thinking summaries inline with responses. Useful for understanding reasoning depth without expanding full thinking blocks. |

---

## Migration Notes

When upgrading from a pre-v2.1.108 template:

1. **effortLevel**: Replace `"high"` with `"xhigh"` — the old `"high"` maps to a lower reasoning tier on Opus 4.7.
2. **ENABLE_PROMPT_CACHING_1H**: Add to `env` block for cost savings. Safe to leave enabled; no functional side effects.
3. **Sandbox/autoScroll**: These are commented examples — no action needed unless you want to customize them.
4. **Sampling params**: Remove `temperature`, `top_p`, `top_k` if present — Opus 4.7 uses `effortLevel` exclusively for reasoning control.
