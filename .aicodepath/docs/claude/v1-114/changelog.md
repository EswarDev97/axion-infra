# Claude Code Changelog — v2.1.108 through v2.1.113

**Source**: https://code.claude.com/docs/en/changelog (Anthropic official)
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM extracted from the live page on fetch date]

> **No version "v1.114" is listed on the official changelog.** The page starts with v2.1.113
> (April 17, 2026). Opus 4.7 shipped in **v2.1.111** (April 16, 2026). For anything older than
> what is below, fetch the page directly or see the upstream GitHub `CHANGELOG.md`.

---

## v2.1.113 (April 17, 2026)

- Changed the CLI to spawn a native Claude Code binary (via a per-platform optional dependency) instead of bundled JavaScript
- Added `sandbox.network.deniedDomains` setting to block specific domains even when a broader `allowedDomains` wildcard would otherwise permit them
- Fullscreen mode: Shift+↑/↓ now scrolls the viewport when extending a selection past the visible edge
- `Ctrl+A` and `Ctrl+E` now move to the start/end of the current logical line in multiline input, matching readline behavior
- Windows: `Ctrl+Backspace` now deletes the previous word
- Long URLs in responses and bash output stay clickable when they wrap across lines (in terminals with OSC 8 hyperlinks)
- Improved `/loop`: pressing Esc now cancels pending wakeups, and wakeups display as "Claude resuming /loop wakeup" for clarity
- `/extra-usage` now works from Remote Control (mobile/web) clients
- Remote Control clients can now query `@`-file autocomplete suggestions
- Improved `/ultrareview`: faster launch with parallelized checks, diffstat in the launch dialog, and animated launching state
- Subagents that stall mid-stream now fail with a clear error after 10 minutes instead of hanging silently
- Bash tool: multi-line commands whose first line is a comment now show the full command in the transcript, closing a UI-spoofing vector
- Running `cd <current-directory> && git …` no longer triggers a permission prompt when the `cd` is a no-op
- Security: on macOS, `/private/{etc,var,tmp,home}` paths are now treated as dangerous removal targets under `Bash(rm:*)` allow rules
- Security: Bash deny rules now match commands wrapped in `env`/`sudo`/`watch`/`ionice`/`setsid` and similar exec wrappers
- Security: `Bash(find:*)` allow rules no longer auto-approve `find -exec`/`-delete`
- Fixed MCP concurrent-call timeout handling where a message for one tool call could silently disarm another call's watchdog
- Fixed Cmd-backspace / `Ctrl+U` to once again delete from the cursor to the start of the line
- Fixed markdown tables breaking when a cell contains an inline code span with a pipe character
- Fixed session recap auto-firing while composing unsent text in the prompt
- Fixed `/copy` "Full response" not aligning markdown table columns for pasting into GitHub, Notion, or Slack
- Fixed messages typed while viewing a running subagent being hidden from its transcript and misattributed to the parent AI
- Fixed Bash `dangerouslyDisableSandbox` running commands outside the sandbox without a permission prompt
- Fixed `/effort auto` confirmation — now says "Effort level set to max" to match the status bar label
- Fixed the "copied N chars" toast overcounting emoji and other multi-code-unit characters
- Fixed `/insights` crashing with `EBUSY` on Windows
- Fixed exit confirmation dialog mislabeling one-shot scheduled tasks as recurring — now shows a countdown
- Fixed slash/@ completion menu not sitting flush against the prompt border in fullscreen mode
- Fixed `CLAUDE_CODE_EXTRA_BODY` `output_config.effort` causing 400 errors on subagent calls to models that don't support effort and on Vertex AI
- Fixed prompt cursor disappearing when `NO_COLOR` is set
- Fixed `ToolSearch` ranking so pasted MCP tool names surface the actual tool instead of description-matching siblings
- Fixed compacting a resumed long-context session failing with "Extra usage is required for long context requests"
- Fixed `plugin install` succeeding when a dependency version conflicts with an already-installed plugin — now reports `range-conflict`
- Fixed "Refine with Ultraplan" not showing the remote session URL in the transcript
- Fixed SDK image content blocks that fail to process crashing the session — now degrade to a text placeholder
- Fixed Remote Control sessions not streaming subagent transcripts
- Fixed Remote Control sessions not being archived when Claude Code exits
- Fixed `thinking.type.enabled is not supported` 400 error when using Opus 4.7 via a Bedrock Application Inference Profile ARN

## v2.1.112 (April 16, 2026)

- Fixed "claude-opus-4-7 is temporarily unavailable" for auto mode

## v2.1.111 (April 16, 2026) — **Opus 4.7 launch**

- Claude Opus 4.7 xhigh is now available! Use `/effort` to tune speed vs. intelligence
- Auto mode is now available for Max subscribers when using Opus 4.7
- Added `xhigh` effort level for Opus 4.7, sitting between `high` and `max`. Available via `/effort`, `--effort`, and the model picker; other models fall back to `high`
- `/effort` now opens an interactive slider when called without arguments, with arrow-key navigation between levels and Enter to confirm
- Added "Auto (match terminal)" theme option that matches your terminal's dark/light mode — select it from `/theme`
- Added `/less-permission-prompts` skill — scans transcripts for common read-only Bash and MCP tool calls and proposes a prioritized allowlist for `.claude/settings.json`
- Added `/ultrareview` for running comprehensive code review in the cloud using parallel multi-agent analysis and critique — invoke with no arguments to review your current branch, or `/ultrareview <PR#>` to fetch and review a specific GitHub PR
- Auto mode no longer requires `--enable-auto-mode`
- Windows: PowerShell tool is progressively rolling out. Opt in or out with `CLAUDE_CODE_USE_POWERSHELL_TOOL`. On Linux and macOS, enable with `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` (requires `pwsh` on PATH)
- Read-only bash commands with glob patterns (e.g. `ls *.ts`) and commands starting with `cd <project-dir> &&` no longer trigger a permission prompt
- Suggest the closest matching subcommand when `claude <word>` is invoked with a near-miss typo (e.g. `claude udpate` → "Did you mean `claude update`?")
- Plan files are now named after your prompt (e.g. `fix-auth-race-snug-otter.md`) instead of purely random words
- Improved `/setup-vertex` and `/setup-bedrock` to show the actual `settings.json` path when `CLAUDE_CONFIG_DIR` is set, seed model candidates from existing pins on re-run, and offer a "with 1M context" option for supported models
- `/skills` menu now supports sorting by estimated token count — press `t` to toggle
- `Ctrl+U` now clears the entire input buffer (previously: delete to start of line); press `Ctrl+Y` to restore
- `Ctrl+L` now forces a full screen redraw in addition to clearing the prompt input
- Transcript view footer now shows `[` (dump to scrollback) and `v` (open in editor) shortcuts
- The "+N lines" marker for truncated long pastes is now a full-width rule for easier scanning
- Headless `--output-format stream-json` now includes `plugin_errors` on the init event when plugins are demoted for unsatisfied dependencies
- Added `OTEL_LOG_RAW_API_BODIES` environment variable to emit full API request and response bodies as OpenTelemetry log events for debugging
- Suppressed spurious decompression, network, and transient error messages that could appear in the TUI during normal operation
- Reverted the v2.1.110 cap on non-streaming fallback retries — it traded long waits for more outright failures during API overload
- Fixed terminal display tearing (random characters, drifting input) in iTerm2 + tmux setups when terminal notifications are sent
- Fixed `@` file suggestions re-scanning the entire project on every turn in non-git working directories, and showing only config files in freshly-initialized git repos with no tracked files
- Fixed LSP diagnostics from before an edit appearing after it, causing the model to re-read files it just edited
- Fixed tab-completing `/resume` immediately resuming an arbitrary titled session instead of showing the session picker
- Fixed `/context` grid rendering with extra blank lines between rows
- Fixed `/clear` dropping the session name set by `/rename`, causing statusline output to lose `session_name`
- Improved plugin error handling: dependency errors now distinguish conflicting, invalid, and overly complex version requirements; fixed stale resolved versions after `plugin update`; `plugin install` now recovers from interrupted prior installs
- Fixed Claude calling a non-existent `commit` skill and showing "Unknown skill: commit" for users without a custom `/commit` command
- Fixed 429 rate-limit errors on Bedrock/Vertex/Foundry referencing status.claude.com (it only covers Anthropic-operated providers)
- Fixed feedback surveys appearing back-to-back after dismissing one
- Fixed bare URLs in bash/PowerShell/MCP tool output being unclickable when the terminal wraps them across lines
- Windows: `CLAUDE_ENV_FILE` and SessionStart hook environment files now apply (previously a no-op)
- Windows: permission rules with drive-letter paths are now correctly root-anchored, and paths differing only by drive-letter case are recognized as the same path

## v2.1.110 (April 15, 2026)

- Added `/tui` command and `tui` setting — run `/tui fullscreen` to switch to flicker-free rendering in the same conversation
- Added push notification tool — Claude can send mobile push notifications when Remote Control and "Push when Claude decides" config are enabled
- Changed `Ctrl+O` to toggle between normal and verbose transcript only; focus view is now toggled separately with the new `/focus` command
- Added `autoScrollEnabled` config to disable conversation auto-scroll in fullscreen mode
- Added option to show Claude's last response as commented context in the `Ctrl+G` external editor (enable via `/config`)
- Improved `/plugin` Installed tab — items needing attention and favorites appear at the top, disabled items are hidden behind a fold, and `f` favorites the selected item
- Improved `/doctor` to warn when an MCP server is defined in multiple config scopes with different endpoints
- `--resume`/`--continue` now resurrects unexpired scheduled tasks
- `/context`, `/exit`, and `/reload-plugins` now work from Remote Control (mobile/web) clients
- Write tool now informs the model when you edit the proposed content in the IDE diff before accepting
- Bash tool now enforces the documented maximum timeout instead of accepting arbitrarily large values
- SDK/headless sessions now read `TRACEPARENT`/`TRACESTATE` from the environment for distributed trace linking
- Session recap is now enabled for users with telemetry disabled (Bedrock, Vertex, Foundry, `DISABLE_TELEMETRY`). Opt out via `/config` or `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=0`.
- Fixed MCP tool calls hanging indefinitely when the server connection drops mid-response on SSE/HTTP transports
- Fixed non-streaming fallback retries causing multi-minute hangs when the API is unreachable
- Fixed session recap, local slash-command output, and other system status lines not appearing in focus mode
- Fixed high CPU usage in fullscreen when text is selected while a tool is running
- Fixed plugin install not honoring dependencies declared in `plugin.json` when the marketplace entry omits them; `/plugin` install now lists auto-installed dependencies
- Fixed skills with `disable-model-invocation: true` failing when invoked via `/<skill>` mid-message
- Fixed `--resume` sometimes showing the first prompt instead of the `/rename` name for sessions still running or exited uncleanly
- Fixed queued messages briefly appearing twice during multi-tool-call turns
- Fixed session cleanup not removing the full session directory including subagent transcripts
- Fixed dropped keystrokes after the CLI relaunches (e.g. `/tui`, provider setup wizards)
- Fixed garbled startup rendering in macOS Terminal.app and other terminals that don't support synchronized output
- Hardened "Open in editor" actions against command injection from untrusted filenames
- Fixed `PermissionRequest` hooks returning `updatedInput` not being re-checked against `permissions.deny` rules; `setMode:'bypassPermissions'` updates now respect `disableBypassPermissionsMode`
- Fixed `PreToolUse` hook `additionalContext` being dropped when the tool call fails
- Fixed stdio MCP servers that print stray non-JSON lines to stdout being disconnected on the first stray line (regression in 2.1.105)
- Fixed headless/SDK session auto-title firing an extra Haiku request when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` or `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` is set
- Fixed potential excessive memory allocation when piped (non-TTY) Ink output contains a single very wide line
- Fixed `/skills` menu not scrolling when the list overflows the modal in fullscreen mode
- Fixed Remote Control sessions showing a generic error instead of prompting for re-login when the session is too old
- Fixed Remote Control session renames from claude.ai not persisting the title to the local CLI session

## v2.1.109 (April 15, 2026)

- Improved the extended-thinking indicator with a rotating progress hint

## v2.1.108 (April 14, 2026)

- Added `ENABLE_PROMPT_CACHING_1H` env var to opt into 1-hour prompt cache TTL on API key, Bedrock, Vertex, and Foundry (`ENABLE_PROMPT_CACHING_1H_BEDROCK` is deprecated but still honored), and `FORCE_PROMPT_CACHING_5M` to force 5-minute TTL
- Added recap feature to provide context when returning to a session, configurable in `/config` and manually invocable with `/recap`; force with `CLAUDE_CODE_ENABLE_AWAY_SUMMARY` if telemetry disabled.
- The model can now discover and invoke built-in slash commands like `/init`, `/review`, and `/security-review` via the Skill tool
- `/undo` is now an alias for `/rewind`
- Improved `/model` to warn before switching models mid-conversation, since the next response re-reads the full history uncached
- Improved `/resume` picker to default to sessions from the current directory; press `Ctrl+A` to show all projects
- Improved error messages: server rate limits are now distinguished from plan usage limits; 5xx/529 errors show a link to status.claude.com; unknown slash commands suggest the closest match
- Reduced memory footprint for file reads, edits, and syntax highlighting by loading language grammars on demand
- Added "verbose" indicator when viewing the detailed transcript (`Ctrl+O`)
- Added a warning at startup when prompt caching is disabled via `DISABLE_PROMPT_CACHING*` environment variables
- Fixed paste not working in the `/login` code prompt (regression in 2.1.105)
- Fixed subscribers who set `DISABLE_TELEMETRY` falling back to 5-minute prompt cache TTL instead of 1 hour
- Fixed Agent tool prompting for permission in auto mode when the safety classifier's transcript exceeded its context window
- Fixed Bash tool producing no output when `CLAUDE_ENV_FILE` (e.g. `~/.zprofile`) ends with a `#` comment line
- Fixed `claude --resume <session-id>` losing the session's custom name and color set via `/rename`
- Fixed session titles showing placeholder example text when the first message is a short greeting
- Fixed terminal escape codes appearing as garbage text in the prompt input after `--teleport`
- Fixed `/feedback` retry: pressing Enter to resubmit after a failure now works without first editing the description
- Fixed `--teleport` and `--resume <id>` precondition errors (e.g. dirty git tree, session not found) exiting silently instead of showing the error message
- Fixed Remote Control session titles set in the web UI being overwritten by auto-generated titles after the third message
- Fixed `--resume` truncating sessions when the transcript contained a self-referencing message
- Fixed transcript write failures (e.g., disk full) being silently dropped instead of being logged
- Fixed diacritical marks (accents, umlauts, cedillas) being dropped from responses when the `language` setting is configured
- Fixed policy-managed plugins never auto-updating when running from a different project than where they were first installed

## v2.1.107 (April 14, 2026)

- Show thinking hints sooner during long operations
