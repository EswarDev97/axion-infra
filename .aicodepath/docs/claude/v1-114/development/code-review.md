# Claude Code Review: AI PR Analysis

**Source**: https://claudefa.st/blog/guide/development/code-review
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

> Covers the cloud-hosted `/ultrareview` service that shipped in Claude Code v2.1.111.

## Overview

Claude Code Review is an automated system that deploys parallel agents to analyze pull
requests, identifying bugs and potential issues before code merges. Designed to **complement**
human code review, not replace it.

## Five-Step Operation

1. Parallel agent dispatch across different code sections simultaneously
2. Bug hunting for logic errors, security issues, and edge cases
3. Cross-verification to filter false positives
4. Severity ranking of confirmed issues
5. Output delivery via summary comments and inline flags

> "Code Review catches contextual bugs — things that are syntactically correct but logically wrong."

## Reported Performance Metrics

- PRs receiving substantive review comments increased from 16% to 54%
- Less than 1% of findings marked incorrect by engineers
- Large PRs (1,000+ lines) received findings 84% of the time, averaging 7.5 issues each

## Pricing and Requirements

- **Cost**: $15–25 per PR on average, based on token usage
- **Availability**: Team or Enterprise plans only
- **Setup**: Admin enables feature; developers see no configuration needed
- **Review time**: Approximately 20 minutes per PR

## Important Limitation

> "Claude Code Review will not approve PRs."

Human approval remains required before merge — AI is augmentation, not replacement.

## Related Native Command (v2.1.111+)

Use `/ultrareview` with no arguments to review your current branch, or
`/ultrareview <PR#>` to fetch and review a specific GitHub PR. Pro and Max users get 3 free
runs (per the Opus 4.7 best-practices page).
