# Claude Code Fast Mode

**Source**: https://claudefa.st/blog/guide/performance/fast-mode
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

> **Important**: Per the SessionStart note, Fast mode is "available on Opus 4.6" (not 4.7).
> On Opus 4.7 use `/effort <level>` to tune speed vs intelligence instead.

## What Fast Mode Is

Fast mode delivers "**2.5× faster Claude Code responses**" by routing requests through
priority infrastructure rather than switching models.

> "Fast mode sidesteps that tradeoff entirely. You get speed without sacrificing quality."

Uses **actual Opus 4.6 with infrastructure-level priority** while maintaining identical
output quality. Contrasts with reducing effort levels, which genuinely compromises thinking
depth.

## Enabling

- `/fast` slash command, or
- `"fastMode": true` in settings.json.
- Auto-switches to Opus 4.6 if you're on Haiku or Sonnet when enabling.

## Pricing (as reported)

Varies by context window size:

- **Under 200K**: $30 input, $150 output per million tokens
- **Over 200K**: $60 input, $225 output per million tokens

> "Switching mid-conversation is expensive."

Enabling fast mode partway through requires paying full uncached input prices for existing
context.

## Best Use Cases

- Rapid iteration cycles
- Live debugging where latency directly impacts productivity
- Typical reported save: ~15–20 min off a 25-exchange debugging session

## When to Skip

Standard Opus remains preferable for:

- Long autonomous tasks
- Batch processing where response time doesn't affect workflows

## Availability

**Anthropic direct only** — Console API or subscription plans. Not available on Bedrock,
Vertex AI, or Azure.
