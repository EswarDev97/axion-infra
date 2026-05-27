---
name: aicodepath-readme-crafter
description: >
  Use when creating or rewriting a README — generates audience-appropriate documentation for OSS, internal, personal, or config projects with structure matched to project type. Triggered by: "write README", "create README", "update documentation", "document this project".
tags:
  - documentation
  - readme
  - writing
  - onboarding
  - communication
user-invocable: true
allowed-tools: Read, Write, Glob, Grep
argument-hint: "[readme-path]"
---

# AICodePath README Crafter

Craft effective READMEs tailored to your audience and project type. Integrated with the AICodePath DOCUMENT phase.---

## Quick Start

```
create a README for my OSS project
update the installation section
review my README for accuracy
```

The skill guides you through task-specific questions and delivers audience-appropriate documentation.

---

## Triggers

| Trigger | Example |
|---------|---------|
| Create README | "create a README", "need a README for this project" |
| Add section | "add installation section", "document the API" |
| Update content | "update the README", "refresh stale sections" |
| Review README | "review my README", "check if README is accurate" |

---

## Overview

READMEs answer questions your audience will have. Different audiences need different information - a contributor to an OSS project needs different context than future-you opening a config folder.

**Always ask:** Who will read this, and what do they need to know?

---

## Process

### Step 1: Identify the Task

**Ask:** "What README task are you working on?"

| Task | When |
|------|------|
| **Creating** | New project, no README yet |
| **Adding** | Need to document something new |
| **Updating** | Capabilities changed, content is stale |
| **Reviewing** | Checking if README is still accurate |

### Step 2: Task-Specific Questions

**Creating initial README:**
1. What type of project? (see Project Types below)
2. What problem does this solve in one sentence?
3. What's the quickest path to "it works"?
4. Anything notable to highlight?

**Adding a section:**
1. What needs documenting?
2. Where should it go in the existing structure?
3. Who needs this info most?

**Updating existing content:**
1. What changed?
2. Read current README, identify stale sections
3. Propose specific edits

**Reviewing/refreshing:**
1. Read current README
2. Check against actual project state (package.json, main files, etc.)
3. Flag outdated sections
4. Update "Last reviewed" date if present

### Step 3: Always Ask

After drafting, ask: **"Anything else to highlight or include that I might have missed?"**

---

## Project Types

| Type | Audience | Key Sections | Template |
|------|----------|--------------|----------|
| **Open Source** | Contributors, users worldwide | Install, Usage, Contributing, License | `templates/oss.md` |
| **Personal** | Future you, portfolio viewers | What it does, Tech stack, Learnings | `templates/personal.md` |
| **Internal** | Teammates, new hires | Setup, Architecture, Runbooks | `templates/internal.md` |
| **Config** | Future you (confused) | What's here, Why, How to extend, Gotchas | `templates/xdg-config.md` |

**Ask the user** if unclear. Don't assume OSS defaults for everything.

---

## Essential Sections (All Types)

Every README needs at minimum:

1. **Name** - Self-explanatory title
2. **Description** - What + why in 1-2 sentences
3. **Usage** - How to use it (examples help)

---

## Templates

Templates are located in `.aicodepath/skills/aicodepath-readme-crafter/templates/`:

- `oss.md` - Open source projects with contributors and public users
- `personal.md` - Side projects, portfolio pieces, experiments
- `internal.md` - Team codebases, services, internal tools
- `xdg-config.md` - Config directories, dotfiles, script folders

Use templates as starting points, then customize based on project specifics.

---

## References

Located in `.aicodepath/skills/aicodepath-readme-crafter/references/`:

- `section-checklist.md` - Which sections to include by project type
- `style-guide.md` - Common README mistakes and prose guidance
- `using-references.md` - Guide to deeper reference materials
- `art-of-readme.md` - Philosophy and cognitive funneling concepts
- `make-a-readme.md` - Section-by-section practical guidance
- `standard-readme-spec.md` - Formal specification for OSS compliance

**Tip:** Don't load all references at once. Pick the one most relevant to your situation.

---

## Integration with AICodePath

This skill integrates with the **DOCUMENT phase** of AICodePath workflows:

1. **During DOCUMENT phase**: Automatically invoked when README creation/updates are needed
2. **Project setup**: Called during initial project scaffolding
3. **Post-implementation**: Creates documentation after feature completion
4. **Maintenance**: Reviews and updates documentation during refactoring

---

## NEVER

- **NEVER** default to the OSS template for every project — internal tools, config directories, and personal projects have different audiences with different questions. An internal service README that reads like an OSS project ("Contributing", "License", "Code of Conduct") wastes a teammate's time scrolling through irrelevant sections. Ask the project type before selecting a template.
- **NEVER** write "Getting Started" without testing the steps yourself (or asking the user to confirm they work) — install instructions that are subtly wrong are more damaging than no instructions. A broken quick start destroys first-impression trust and forces the reader to debug before they've even used the project.
- **NEVER** include a "Features" list as the primary selling point — features are what the software does, not why someone should care. Replace or precede any features list with a one-line problem statement. "What it does" is less compelling than "what problem it solves."
- **NEVER** leave placeholder content like `[INSERT DESCRIPTION]` or `TODO: explain X` in the final README — placeholders signal the author doesn't care. They also confuse automated documentation scrapers, search indexers, and README linters that treat them as actual content.
- **NEVER** write READMEs that describe what the code does without showing it — prose descriptions of behavior are always less clear than a 5-line code example. If a section takes more than 3 sentences to explain, a code block would probably convey it in 5 lines.

## Common Mistakes to Avoid (Quick Reference)

- **No install steps** - Never assume setup is obvious
- **No examples** - Show, don't just tell
- **Wall of text** - Use headers, tables, lists
- **Stale content** - Add "last reviewed" date
- **Generic tone** - Write for YOUR audience

---

## Prose Quality

For general writing advice - clear prose, Strunk's rules, and AI patterns to avoid - use the `writing-clearly-and-concisely` skill if available.

---

## Workflow

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ Step 1: IDENTIFY TASK & PROJECT TYPE                │
│ • Creating / Adding / Updating / Reviewing          │
│ • OSS / Personal / Internal / Config                │
├─────────────────────────────────────────────────────┤
│ Step 2: ASK TASK-SPECIFIC QUESTIONS                 │
│ • What problem does this solve?                     │
│ • Who is the audience?                              │
│ • What's the quickest path to "it works"?           │
├─────────────────────────────────────────────────────┤
│ Step 3: SELECT TEMPLATE                             │
│ • Load appropriate template                         │
│ • Reference section checklist                       │
├─────────────────────────────────────────────────────┤
│ Step 4: DRAFT CONTENT                               │
│ • Populate template sections                        │
│ • Add project-specific details                      │
│ • Include examples and code samples                 │
├─────────────────────────────────────────────────────┤
│ Step 5: REVIEW & REFINE                             │
│ • Check against style guide                         │
│ • Ask: "Anything else to include?"                  │
│ • Verify all essential sections present             │
└─────────────────────────────────────────────────────┘
```

---

## Examples

### Creating OSS Project README

**User**: "Create a README for my new CLI tool"

**Skill**:
1. Confirms project type (OSS)
2. Asks: What problem does it solve? Installation method? Key features?
3. Loads `templates/oss.md`
4. Populates with user's answers
5. Includes installation, usage examples, contributing guidelines

### Updating Internal Service README

**User**: "Update README - we changed the deployment process"

**Skill**:
1. Identifies task (updating)
2. Reads current README
3. Asks: What changed in deployment?
4. Proposes specific edits to deployment section
5. Updates "Last reviewed" date

### Reviewing Config README

**User**: "Review my .zshrc README"

**Skill**:
1. Identifies task (reviewing)
2. Reads current README and actual config files
3. Checks for stale sections or missing gotchas
4. Flags any outdated information
5. Updates "Last reviewed" date

---

## Related Skills

- `writing-clearly-and-concisely` - Prose quality and writing standards
- `aicodepath-mental-model` - Understanding AICodePath workflow phases
- `git-commit-messages` - If you have documentation commit standards

---

## Version History

- **1.0.0** - Initial integration from softaworks-agent-toolkit
  - Adapted frontmatter to aicodepath conventions
  - Added DOCUMENT phase integration
  - Updated template paths to aicodepath structure
  - Preserved all 4 project types and task-based workflow
