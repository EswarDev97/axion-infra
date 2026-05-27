# Self-Refine Framework

Use when iterating on an existing prompt that partially works — you want the model to critique its own output and improve it in a structured loop.

## How it works

Self-Refine adds two phases after the initial generation:
1. **Critique:** The model evaluates its own output against explicit criteria
2. **Revise:** The model rewrites the output based on the critique

This is useful in the prompt itself (as a multi-turn or chain-of-thought instruction) or as a meta-loop during prompt development.

## When to use

- The prompt already produces roughly correct output but with occasional schema violations
- Specific attributes are frequently misjudged (e.g. CNG Kit always scored HIGH when it shouldn't)
- `negotiation_strategy` is consistently too vague
- You want to add a self-check step before the model finalises JSON output

## Applying Self-Refine to vehicle valuation prompts

### Option A: Inline critique (add to system prompt)

```
After generating your initial JSON response, perform a self-check before outputting:

Critique checklist:
□ Does attribute_risks contain exactly 11 entries?
□ Is each severity value one of: HIGH, MEDIUM, LOW, NONE?
□ Are price_impact_pct values consistent with severity? (NONE → 0.0, HIGH → typically < -8%)
□ Is composite_risk_score formula applied correctly?
□ Is the output raw JSON with no markdown or extra keys?
□ Are all price ranges positive integers in INR?
□ Is confidence_score ≤ 1.0 and > 0.0?

If any check fails, revise the output before responding.
Output only the final revised JSON.
```

### Option B: Use during prompt development

When refining a prompt manually:

1. **Generate:** Run the current prompt on a test vehicle
2. **Critique:** List all failures against the validation checklist (Step 6 of the skill)
3. **Identify root cause:** Is each failure a prompt gap, a model limitation, or an ambiguous instruction?
4. **Revise:** Update exactly the prompt section that caused each failure
5. **Repeat:** Run the revised prompt on the same test vehicle and compare

## Guidance

- Self-Refine works best for *format* failures (missing fields, wrong types)
- It is less effective for *reasoning* failures (e.g. wrong severity judgment) — those need better Examples (E in TIDD-EC)
- Don't add the inline critique to production prompts unless schema failures are persistent — it adds tokens and latency
- Prefer fixing the root instruction over relying on self-correction as a patch
