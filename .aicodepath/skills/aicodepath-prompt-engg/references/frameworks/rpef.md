# RPEF Framework — Role · Parameters · Examples · Format

**Use when:** Standardising prompt criteria across multiple AI providers so they produce consistent output despite different model characteristics.

---

## Why cross-provider prompts drift

Each provider's base model has different default behaviours:
- OpenAI tends to follow JSON schemas strictly but adds prose if schema is loose
- Gemini may reformat numbers or change decimal precision
- Anthropic (Claude) tends to be verbose unless explicitly constrained
- Perplexity incorporates search results that can shift score anchoring

RPEF locks the four variables that cause drift.

---

## Component definitions

| Component | What it standardises |
|---|---|
| **Role** | Identical domain expert persona across all providers |
| **Parameters** | Identical scoring criteria, value ranges, and formula definitions |
| **Examples** | Identical worked examples showing the same input → same output |
| **Format** | Identical output schema with identical field names, types, and defaults |

---

## Cross-provider audit procedure

1. Read all provider `system.txt` files side-by-side
2. For each field that scored inconsistently, find which RPEF component differs between providers
3. Identify the canonical definition (usually from the provider with the most consistent output)
4. Propagate the canonical definition to all other providers' prompts
5. Update `user.txt` if the inconsistency is in variable handling

---

## RPEF diff table (use during audit)

| Field / criterion | gemini | openai | anthropic | perplexity | Canonical |
|---|---|---|---|---|---|
| [scoring field] | [definition used] | [definition used] | [definition used] | [definition used] | [agreed definition] |

Fill in one row per field that shows cross-provider variance.

---

## Minimum consistency checklist

After applying RPEF:
- [ ] Role description is word-for-word identical (or provider-adapted equivalent)
- [ ] All numeric ranges defined identically (e.g. risk score 0.0–1.0, not 0–100)
- [ ] All boolean conditions defined identically
- [ ] Output JSON schema is identical (same keys, same types, same defaults)
- [ ] At least one shared worked example is present in all provider prompts

---

## Provider-specific adaptations (allowed differences)

Not all differences are inconsistencies. Some are intentional:
- `with_search` variants include search result injection variables — `no_search` variants don't
- Provider-specific function calling format may differ (OpenAI tool use vs. Anthropic tool use syntax)
- Temperature / generation parameters are set at API call time, not in the prompt

Only flag differences in **criteria, scoring, and schema** as RPEF violations.
