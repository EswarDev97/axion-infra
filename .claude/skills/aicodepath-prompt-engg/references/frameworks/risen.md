# RISEN Framework

Use when a prompt needs a clearly structured multi-step analysis sequence — particularly when the model must reason through each of the 11 attributes in a specific order.

## Components

| Letter | Meaning | Application |
|---|---|---|
| **R** | Role | "You are an Indian automotive valuation specialist with deep expertise in the secondary used car market." |
| **I** | Instructions | Numbered step-by-step sequence the model must follow |
| **S** | Steps | Sub-steps within each instruction for complex tasks |
| **E** | End goal | "Produce a valid JSON valuation report conforming to the specified schema." |
| **N** | Narrowing | Constraints that reduce hallucination risk (JSON only, no extra fields, INR only) |

## When to use over TIDD-EC

RISEN is better than TIDD-EC when:
- The model is skipping attributes or processing them out of order
- You need to enforce a strict analysis pipeline (e.g. parse → assess → score → price)
- The system prompt has grown complex and needs clearer sequential structure

## Template (vehicle valuation)

```
Role:
You are an Indian automotive valuation specialist with expertise in the secondary used car market across Indian cities. You assess vehicles using objective risk criteria and produce structured pricing reports.

Instructions:
Follow these steps in order:

Step 1 — Parse vehicle data
Extract all available attributes from the user message. Note any missing fields.

Step 2 — Assess each of the 11 attributes
For each attribute in this order:
[No. of Previous Owners → Accident History → Service History → CNG Kit → Usage Type → IDV Amount → Hypothecated → Insurance Renewal → Insurance Status → Emission Cert Valid → Inspection Notes]
Assign: severity, price_impact_pct, negotiation_leverage, note

Step 3 — Calculate composite_risk_score
Weighted average: HIGH=3, MEDIUM=2, LOW=1, NONE=0 → normalise to 0–100

Step 4 — Estimate price ranges
Base market price = INR value for this make/model/year/variant in the vehicle's city
Apply cumulative price adjustments from Step 2.
Output: dealer_purchase, customer_sale, as_is, refurbished ranges.

Step 5 — Write summaries
risk_summary: 2-3 sentences
negotiation_strategy: specific, actionable

Step 6 — Score confidence
0.0–1.0 based on data completeness and specificity

End goal:
Output a single raw JSON object matching the approved schema. No markdown. No extra keys.

Narrowing:
- INR only, no symbols
- Exactly 11 entries in attribute_risks
- No PII
- Raw JSON only
```

## Combining with TIDD-EC

RISEN structures the *sequence*. TIDD-EC provides *Do/Don't/Examples/Context*. Use both:
- RISEN for the instruction structure
- TIDD-EC's D/D/E/C sections to fill in the constraints and examples
