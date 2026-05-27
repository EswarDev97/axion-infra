# TIDD-EC Template — Vehicle Valuation Prompts

Pre-filled TIDD-EC framework for Indian automotive vehicle valuation prompts. Use this as the structural foundation when writing or auditing any prompt in this project.

---

## TIDD-EC Components

### T — Task Type
**Applied:** Structured JSON vehicle valuation with per-attribute risk scoring and price range estimation for the Indian secondary automotive market.

The model's job is to:
1. Assess each of the 11 defined attributes for risk severity
2. Estimate price impact per attribute
3. Calculate a composite risk score
4. Output four price ranges (dealer purchase, customer sale, as-is, refurbished)
5. Provide negotiation strategy guidance

### I — Instructions (step-by-step sequence)
**Applied sequence for system prompt:**

```
1. Parse the vehicle data provided in the user message.
2. For each of the 11 attributes, assess:
   a. severity (HIGH/MEDIUM/LOW/NONE)
   b. price_impact_pct (negative = risk, positive = positive signal)
   c. negotiation_leverage (true/false)
   d. note (brief explanation)
3. Calculate composite_risk_score as weighted average:
   HIGH=3, MEDIUM=2, LOW=1, NONE=0 → normalise to 0–100 scale
4. Derive four price ranges using base market price as anchor:
   - dealer_purchase_price_range: base × (1 + sum of impacts) × dealer margin factor
   - customer_sale_price_range: dealer price + retail margin
   - as_is_price_range: current condition, no repairs
   - refurbished_price_range: after addressing HIGH/MEDIUM risks
5. Estimate refurbishment cost to address HIGH/MEDIUM severity items.
6. Write risk_summary (2-3 sentences) and negotiation_strategy (actionable).
7. Score confidence_score 0.0–1.0 based on data completeness.
8. Output raw JSON matching the schema exactly.
```

### D — Do
**Applied:**
- Include all 11 attributes in `attribute_risks` — no omissions
- Use INR for all monetary values — no currency symbols
- Return raw JSON only — the downstream system parses this directly
- Ground price ranges in the Indian secondary market for the vehicle's city/state
- Apply the composite_risk_score formula documented above consistently
- State confidence_score honestly — lower it when key data is missing or ambiguous

### D — Don't
**Applied:**
- No fabricated vehicle data — only assess what is provided
- No PII in output (no owner name, phone, Aadhaar, email)
- No markdown formatting, code fences, or prose before/after the JSON
- No extra JSON keys beyond the 10 approved top-level fields
- No currency symbols in numeric price fields
- No vague notes — every `note` must explain the specific risk and price reasoning

### E — Examples
**Applied (inline in prompt):**

```json
{
  "attribute": "No. of Previous Owners",
  "value": "3",
  "severity": "MEDIUM",
  "price_impact_pct": -6.0,
  "negotiation_leverage": true,
  "note": "Three owners in 5 years suggests the vehicle has been sold frequently, possibly due to recurring issues. Reduces confidence in maintenance continuity. Supports buyer negotiation."
}
```

```json
{
  "attribute": "Service History",
  "value": "Full authorised service history",
  "severity": "NONE",
  "price_impact_pct": 0.0,
  "negotiation_leverage": false,
  "note": "Complete authorised service history is a strong positive signal. No price penalty applied."
}
```

### C — Context
**Applied:**
- Market: Indian secondary (used) automotive market
- Currency: INR (Indian Rupees)
- Pricing anchor: Base market price for the specific make/model/year/variant in the vehicle's city
- Regulatory context: Indian motor vehicle laws, PUC certificate requirements, RC transfer process
- Buyer profile: Either individual retail buyer or dealer acquisition

---

## Checklist: does the prompt cover all TIDD-EC components?

| Component | Prompt section to check |
|---|---|
| T — Task type | First paragraph of system prompt |
| I — Instructions | Step-by-step analysis sequence |
| D — Do | "You must" / "Always" section |
| D — Don't | "Never" / "Do not" section |
| E — Examples | Inline JSON examples for attribute_risks |
| C — Context | Indian market, INR, city/state context |

A prompt missing any component is incomplete. Return to Step 4 of the skill workflow.

---

## with_search variant additions

For `with_search` prompts, add these TIDD-EC extensions:

**T:** In addition to the base task, incorporate live market pricing data from web search results.

**I (additions):**
```
Before scoring attributes:
- Review {{gemini_price_ranges}} for current market listing prices
- Note {{listing_count}} to assess market liquidity
- Use these as the base market price anchor for all price range calculations
- If {{gemini_price_ranges}} is empty or "N/A", fall back to base model knowledge
```

**D (additions):**
- Reference {{gemini_price_ranges}} explicitly in price reasoning
- Adjust confidence_score upward if listing data is available and recent
- Note in risk_summary if price ranges are grounded in live data vs model knowledge

**C (additions):**
- The search data reflects current listing prices, not transaction prices
- Apply a 5–10% discount from listing price to arrive at transaction anchor
