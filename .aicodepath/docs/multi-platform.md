# AICodePath Multi-Platform Notes

AICodePath is primarily designed for **Claude Code** (the CLI). This document notes compatibility considerations for other platforms.

---

## Supported Platform

### Claude Code (Primary)
All hooks, skills, agents, and guidelines are designed for Claude Code. Full feature support.

```bash
node .aicodepath/bin/aicodepath.js init
```

---

## Other Platforms (Not Officially Supported)

The following platforms share some compatibility but are not officially supported:

### OpenAI Codex CLI
- Skills (SKILL.md files) are plain markdown — portable to any AI tool that can read instruction files
- Hooks are Claude Code-specific and will not fire in Codex
- Guidelines JSON files can be adapted to Codex's custom instructions format

### Cursor
- Skills can be adapted to Cursor Rules (`.cursorrules`)
- GICL quality loop has no equivalent hook mechanism in Cursor
- Plans.md (5-column format) works as a task file regardless of editor

### OpenCode
- Skill SKILL.md files are compatible as slash commands
- Create symlinks in the OpenCode slash command directory pointing to `.aicodepath/skills/*/SKILL.md`

---

## Adapting Skills to Other Platforms

The SKILL.md format (YAML frontmatter + Markdown body) is intentionally portable:

1. Copy any `SKILL.md` file
2. Strip the YAML frontmatter
3. Use the markdown body as a system prompt or custom instruction

The workflow phases (PRE-FLIGHT → INCEPTION → CONSTRUCTION → OPERATIONS) and the skill chain
are documented in `using-aicodepath/SKILL.md` — this high-level workflow is platform-agnostic.

---

## Platform-Specific Limitations

| Feature | Claude Code | Cursor | OpenCode | Codex |
|---------|-------------|--------|----------|-------|
| Hooks | Full | None | None | None |
| Skills (slash cmds) | Full | Via Rules | Via symlinks | Manual |
| GICL quality loop | Full | None | None | None |
| SQLite DB | Full | None | None | None |
| Agent Teams | Full | None | None | None |
