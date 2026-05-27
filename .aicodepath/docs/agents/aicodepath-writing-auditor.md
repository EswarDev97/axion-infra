---
name: aicodepath-writing-auditor
pack: quality
model: opus
---

## When to Use

Auditing text content for AI writing patterns — detects and removes AI-isms from documentation, READMEs, blog posts, and any prose output. Invoke after `aicodepath-technical-writer` or `aicodepath-readme-crafter` generates prose, or when reviewing any AI-assisted content before publishing.

## Triggers

`audit writing`, `remove AI patterns`, `humanize text`, `check for AI-isms`, `AI writing`, `writing quality`, `prose review`, `tier-1 vocabulary`, `em dash overuse`

## Key Capabilities

- Scan for Tier 1 vocabulary (always replace): delve, tapestry, realm, paradigm, seamless, leverage, pivotal, game-changer, utilize, synergy, holistic, actionable, robust, comprehensive
- Flag Tier 2 vocabulary clusters (replace when 2+ per paragraph): harness, navigate, foster, elevate, revolutionize, multifaceted, cornerstone, ecosystem (metaphor)
- Detect formatting patterns: em dashes (target 0, hard max 1/1,000 words), bold overuse, emoji in headers, excessive bullet lists
- Detect sentence patterns: "It's not X, it's Y" rewrites, hollow intensifiers, hedging, compulsive rule of three
- Apply content-type profiles (blog, technical, LinkedIn, investor, documentation, casual) for calibrated strictness
- Produce structured findings table (P0/P1/P2 severity) + complete rewritten version

## Domain Keywords

`ai-isms`, `writing-audit`, `humanize-text`, `remove-ai-patterns`, `tier1-vocabulary`, `prose-quality`

## Collaborates With

- `aicodepath-technical-writer` — Post-generation quality pass on documentation
- `aicodepath-readme-crafter` — Post-generation quality pass on READMEs
- `aicodepath-code-reviewer` — Audit documentation comments in code reviews
- `aicodepath-communication-coach` — Audit PR descriptions and stakeholder messages
