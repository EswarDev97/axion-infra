<!-- TEMPLATE SOURCE — DO NOT edit this as a final doc. Run 'acp init --render-docs' to regenerate SKILL.md. -->
---
name: aicodepath-catalog
description: Browse {{AGENT_COUNT}} agents and {{SKILL_COUNT}} skills — discovery with category filtering.
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep
argument-hint: "[search <query>] | [list agents|skills] | [show <name>]"
---

# AICodePath Catalog — Discover Agents and Skills

## Overview

Browse, search, and inspect the AICodePath agent and skill registry. Reads directly from `.aicodepath/agents/` and `.aicodepath/skills/` — no network or cache.

## Commands

| Command | Action |
|---------|--------|
| `search <query>` | Find agents/skills matching the query in name or description |
| `list agents` | List all agents grouped by category |
| `list skills` | List all skills grouped by category |
| `show <name>` | Display the full description and frontmatter for an agent or skill |
| `categories` | Show all component categories from agent-taxonomy.md |

## Notable Recent Skills

| Skill | Added | Description |
|-------|-------|-------------|
| `aicodepath-web-design-intelligence` | 2026-04-10 | 84 visual styles, 160 palettes, BM25 search engine, motion/react patterns |
| `aicodepath-fluent-design` | 2026-04-03 | Fluent UI v9 — 5-file pattern, Griffel, tokens, HARD-GATEs |
| `aicodepath-code-graph` | 2026-03-28 | Tree-sitter AST + NetworkX BFS code graph via MCP |

## Process

### search <query>

Case-insensitive substring match across:
1. Agent/skill names
