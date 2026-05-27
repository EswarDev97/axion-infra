# Claude Code Channels: Telegram, Discord & iMessage

**Source**: https://claudefa.st/blog/guide/development/claude-code-channels
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

> A plugin-based feature announced **March 20, 2026** (research preview). Requires Claude Code
> **v2.1.80 or later** and **Bun**. claude.ai (Pro or Max) authentication only — Console/API
> key not supported.

---

## What Are Claude Code Channels?

"Claude Code Channels are a plugin-based feature that lets you send messages from Telegram,
Discord, or iMessage directly into a running Claude Code session on your local machine." Your
session processes requests with full filesystem, MCP, and git access, then replies through the
same messaging app. Launched with Telegram and Discord; iMessage added a week later.

An MCP server connects your Claude Code session to a messaging platform. When you send a
message to your bot, the MCP server forwards it to Claude. Claude processes the request using
your local environment, then replies through the same channel.

## Channels vs Remote Control vs Web Sessions

| Aspect | Channels | Remote Control | Web Sessions |
|--------|----------|----------------|--------------|
| Interface | Telegram, Discord, iMessage | claude.ai/code, iOS app, Android app | claude.ai/code browser |
| Session location | Your machine (local) | Your machine (local) | Anthropic cloud |
| Setup | Install plugin, create bot, pair | `claude remote-control` | Open claude.ai/code |
| Best for | Async messages, mobile-first, team channels | Continuing terminal sessions from phone | Quick tasks without local setup |
| Local tools | Full access (filesystem, MCP, git) | Full access (filesystem, MCP, git) | Cloud sandbox only |
| Hackability | High (plugin architecture) | Low (fixed interface) | None |
| Notification style | Native app notifications | Must open claude.ai or app | Must open claude.ai |
| Team collaboration | Discord guild channels for shared access | Single-user only | Single-user only |

## How Channels Work Under the Hood

1. You install a channel plugin (Telegram, Discord, or iMessage) that runs as an MCP server
2. You launch Claude Code with the `--channels` flag, which activates the plugin
3. The MCP server connects to the messaging platform (polling for Telegram, WebSocket for Discord)
4. When a message arrives, the server wraps it as a `<channel>` event and pushes it into your Claude Code session
5. Claude processes the request using your full local environment
6. Claude replies through tools exposed by the MCP server (`reply`, `react`, `edit_message`)

**Security model — two layers**: each channel plugin maintains a sender allowlist (only
explicitly paired/approved user IDs can push messages); the `--channels` flag controls which
servers are active per session.

## Telegram Setup

1. Open `@BotFather` on Telegram → `/newbot` → pick display name + unique username ending in `bot`. Copy the token.
2. `/plugin install telegram@claude-plugins-official`
3. `/telegram:configure 123456789:AAHfiqksKZ8...`
4. `claude --channels plugin:telegram@claude-plugins-official`
5. DM your bot. It replies with a 6-character pairing code. Then: `/telegram:access pair <code>`
6. `/telegram:access policy allowlist`

Telegram-specific features:
- Inbound photos auto-download to `~/.claude/channels/telegram/inbox/`
- `reply` supports file attachments (max 50 MB per file)
- Telegram shows "botname is typing..." while Claude works
- No message history (Telegram Bot API limitation)

## Discord Setup (≈10 min)

1. Discord Developer Portal → **New Application**
2. **Bot** tab → set username → **Reset Token**
3. Still in Bot settings → enable **Message Content Intent** (Privileged Gateway Intents)
4. **OAuth2 → URL Generator** → scope `bot` → enable: View Channels, Send Messages, Send Messages in Threads, Read Message History, Attach Files, Add Reactions
5. `/plugin install discord@claude-plugins-official`
   `/discord:configure <your-bot-token>`
6. `claude --channels plugin:discord@claude-plugins-official`
7. DM your bot → pairing code → `/discord:access pair <code>` → `/discord:access policy allowlist`

Discord-specific features:
- `fetch_messages` pulls recent history (up to 100 messages per call)
- Attachments aren't auto-downloaded; `download_attachment` fetches files
- Guild channels support team collaboration
- `react` supports Unicode + custom server emoji
- `reply` supports `reply_to` for native Discord threading

## iMessage Setup (macOS only)

Reads `~/Library/Messages/chat.db` and controls Messages.app via AppleScript.

1. System Settings → Privacy & Security → **Full Disk Access** → enable for your terminal app
2. `/plugin install imessage@claude-plugins-official`
3. `claude --channels plugin:imessage@claude-plugins-official`
4. Text yourself from any Apple device (self-chat bypasses access control)
5. First reply triggers macOS Automation prompt → click OK
6. Allow others: `/imessage:access allow +15551234567` or `/imessage:access allow AppleID`

iMessage-specific features:
- macOS native, no bot token
- Self-chat works instantly (zero-config test)
- Identity detection by reading the Messages DB
- Supports phone numbers or Apple IDs
- AppleScript-based replies appear as normal iMessages from your account

## Practical Use Cases

- Monitor long-running tasks from your phone (notification on completion/error)
- Quick fixes on the go ("change Redis port in docker-compose.yml from 6380 to 6379 and commit it")
- Team collaboration through Discord guild channels
- Async workflows combined with scheduled tasks (hourly test runs → report → wait for instruction)
- AI executive assistant on Telegram (with calendar/email/CRM MCP tools)
- CI/CD notifications and reactions

## Building Your Own Channel

Anthropic provides a Channels reference. During the research preview `--channels` only accepts
plugins from an Anthropic-maintained allowlist. Use `--dangerously-load-development-channels`
to test custom channels.

The `fakechat` plugin ships as a development demo:

```
/plugin install fakechat@claude-plugins-official
claude --channels plugin:fakechat@claude-plugins-official
```

Opens `http://localhost:8787`.

## Requirements and Limitations

**Requirements:**

- Claude Code v2.1.80 or later
- Bun runtime installed
- claude.ai authentication (Pro or Max). Console and API key auth not supported.
- Team/Enterprise plans: admin must explicitly enable channels
- iMessage channel: macOS only, with Full Disk Access granted

**Current Limitations:**

- Session must stay running — close terminal, channel goes offline
- Permission prompts block remotely — Claude pauses until you approve at terminal
- Allowlisted plugins only during preview (only plugins from `claude-plugins-official`)
- No persistent background mode — keep session open (tmux/screen as workaround)
- Platform-specific gaps: Telegram has no history API, Discord requires more setup, iMessage macOS-only
