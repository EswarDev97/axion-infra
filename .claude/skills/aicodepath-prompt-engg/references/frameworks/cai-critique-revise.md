# CAI Critique-Revise Framework

Constitutional AI (CAI) Critique-Revise adapts the model's self-evaluation against a set of explicit "constitutional" principles — applied here to enforce schema compliance and valuation quality.

## How it works

1. **Constitution:** Define the rules (the "constitution") the output must satisfy
2. **Critique:** The model reads its output and identifies violations
3. **Revise:** The model produces a new output that fixes all violations

Unlike Self-Refine (which uses the model's own judgment), CAI gives the model *specific principles* to check against — making it more consistent and auditable.

## When to use

- Schema violations are persistent across providers (extra keys, missing fields, wrong types)
- The model is ignoring specific constraints (e.g. outputting markdown despite being told not to)
- You want to add a structured compliance gate before the final output

## Constitution for vehicle valuation prompts

Use these principles as the critique checklist. Add them to the system prompt as a critique block:

```
CONSTITUTION (check your output against all principles before responding):

P1 — Schema completeness
attribute_risks must contain exactly 11 entries. One entry per attribute. No omissions.

P2 — Schema conformance
Output JSON must contain exactly these top-level keys and no others:
attribute_risks, composite_risk_score, risk_summary, negotiation_strategy,
dealer_purchase_price_range, customer_sale_price_range, as_is_price_range,
refurbished_price_range, estimated_refurbishment_cost, confidence_score

P3 — Format purity
Output is raw JSON only. No markdown code fences. No prose. No explanations before or after the JSON.

P4 — Currency discipline
All monetary values are plain integers in INR. No symbols (₹, Rs, INR string).

P5 — PII exclusion
No personally identifiable information in any field: no owner name, phone, email, Aadhaar number.

P6 — Severity–impact consistency
NONE severity → price_impact_pct must be 0.0
LOW severity → price_impact_pct between -0.1 and -3.0
MEDIUM severity → price_impact_pct between -3.0 and -10.0
HIGH severity → price_impact_pct ≤ -8.0

P7 — Non-empty notes
Every attribute_risks entry must have a non-empty note that explains the risk and pricing rationale.

P8 — Confidence honesty
confidence_score must reflect actual data availability. If fewer than 7 of 11 attributes have data, confidence_score must be ≤ 0.6.

---
Critique: List any principle violations in your draft response.
Revise: If violations found, rewrite the JSON to fix them.
Output: Only the final, corrected JSON.
```

## Guidance

- The Constitution block is verbose — only add it to prompts where persistent violations occur
- P3 and P4 (format, currency) are the most commonly violated; add these selectively if full CAI is too heavy
- For providers with strong instruction-following (Claude, GPT-4o), CAI may not be necessary — try TIDD-EC first
- For providers prone to format drift (some Gemini configurations), P3 + P4 inline as explicit "never" rules often suffice without the full CAI structure

## Combining with TIDD-EC

CAI Critique-Revise reinforces the D (Don't) component of TIDD-EC with explicit self-checking. Map:
- TIDD-EC D (Don't) → Constitution P1–P8
- The critique step → after TIDD-EC instructions, before output
