# Claude Code Pricing & Usage Optimization

**Source**: https://claudefa.st/blog/guide/development/usage-optimization
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Pricing Tiers (as reported by the source page)

Claude Code requires at least a Pro subscription since the free tier lacks terminal access:

- **Claude Pro** ($20/month): 5× usage limits, ~45 messages per 5-hour window
- **Claude Max 5×** ($100/month): ~225 messages per 5-hour window
- **Claude Max 20×** ($200/month): ~900 messages per 5-hour window
- **API Pay-per-Use**: Sonnet at $3/$15 per million tokens; Opus at $15/$75

## Cost-Reduction Strategies

> "Strategic model selection and usage tracking can cut costs by 70%."

- **Model switching** — start sessions with Sonnet for routine tasks; reserve Opus for complex
  architectural decisions.
- **Context management** — `/compact` when conversations grow lengthy; `/clear` when switching
  between unrelated work.
- **Planning mode** — press `Shift+Tab` twice before expensive operations to catch issues
  before costly rework.
- **Specific prompts** — detailed requests outperform vague ones, reducing clarification tokens.

## Monitoring

Install `ccusage` to track consumption across daily, monthly, or real-time billing windows
with per-model breakdowns.

## Advanced Controls

- `DISABLE_PROMPT_CACHING` env var to opt out of caching (affects cost/speed trade-off).
- `ENABLE_PROMPT_CACHING_1H` env var (from v2.1.108 changelog) to extend to 1-hour TTL.
- `FORCE_PROMPT_CACHING_5M` to force 5-minute TTL.
- Legacy `opusplan` model alias enables using Opus selectively during planning phases.
