# Content Generation

AICodePath does not include built-in content generation pipelines (slide decks, video scripts, etc.).
These are out of scope for a software development framework.

## What AICodePath Generates

AICodePath generates development artifacts:

| Output | Trigger | Location |
|--------|---------|----------|
| CHANGELOG | `/aicodepath-release` | Project root |
| ER / C4 diagrams | `/aicodepath-diagrams`, `/aicodepath-c4-architecture` | `aicodepath-docs/memory/` |
| Test suites | `/aicodepath-tdd` | Per-feature test files |
| Planning docs | `/aicodepath-brainstorm`, `/aicodepath-write-plan` | `aicodepath-docs/` |
| Session checkpoints | `/aicodepath-checkpoint` | `aicodepath-docs/checkpoints/` |

## Documentation Generation

For README generation, use `/aicodepath-readme-crafter`.

For architecture documentation, use `/aicodepath-c4-architecture` or `/aicodepath-diagrams`.

## External Tools

For slide/presentation generation from markdown, consider:
- **Marp** — Markdown-to-slides
- **Slidev** — Vue-based presentations
- **Reveal.js** — HTML presentations

These tools are compatible with AICodePath's output (markdown files in `aicodepath-docs/`).
