# Output Schema — Locked

All AI providers must return exactly this JSON structure. No extra keys. No missing keys.

```json
{
  "attribute_risks": [
    {
      "attribute": "string — exact attribute name from the approved list",
      "value": "string — the raw value extracted from vehicle data",
      "severity": "HIGH | MEDIUM | LOW | NONE",
      "price_impact_pct": 0.0,
      "negotiation_leverage": true,
      "note": "string — explanation of risk and price reasoning"
    }
  ],
  "composite_risk_score": 0.0,
  "risk_summary": "string — 2-3 sentence plain-language summary",
  "negotiation_strategy": "string — actionable advice for buyer/dealer",
  "dealer_purchase_price_range": { "min": 0, "max": 0 },
  "customer_sale_price_range":   { "min": 0, "max": 0 },
  "as_is_price_range":           { "min": 0, "max": 0 },
  "refurbished_price_range":     { "min": 0, "max": 0 },
  "estimated_refurbishment_cost": 0,
  "confidence_score": 0.0
}
```

---

## Field definitions

| Field | Type | Range / Notes |
|---|---|---|
| `attribute_risks` | array | One entry per attribute. Must contain all 11 attributes. |
| `attribute_risks[].attribute` | string | Exact name from the approved 11-attribute list |
| `attribute_risks[].value` | string | Raw value from vehicle data (not interpreted) |
| `attribute_risks[].severity` | enum | `HIGH`, `MEDIUM`, `LOW`, or `NONE` |
| `attribute_risks[].price_impact_pct` | float | Negative = reduces price. Range: typically -25.0 to +5.0 |
| `attribute_risks[].negotiation_leverage` | boolean | `true` if this attribute meaningfully supports buyer negotiation |
| `attribute_risks[].note` | string | Non-empty. Explains the risk and price rationale. |
| `composite_risk_score` | float | 0.0–100.0. Higher = more risk. Weighted average of severity levels. |
| `risk_summary` | string | Non-empty. 2-3 sentences max. |
| `negotiation_strategy` | string | Non-empty. Actionable, not generic. |
| `dealer_purchase_price_range` | object | `{ min, max }` in INR. What a dealer would pay. |
| `customer_sale_price_range` | object | `{ min, max }` in INR. What end customer pays. |
| `as_is_price_range` | object | `{ min, max }` in INR. No refurbishment. |
| `refurbished_price_range` | object | `{ min, max }` in INR. After full refurbishment. |
| `estimated_refurbishment_cost` | integer | INR. 0 if no refurbishment needed. |
| `confidence_score` | float | 0.0–1.0. How confident the model is given available data. |

---

## Constraints (all prompts must enforce these)

- Output is raw JSON only — no markdown fences, no prose before or after
- No extra top-level keys beyond the 10 listed above
- All price ranges use INR (Indian Rupees), no currency symbols
- `attribute_risks` array length must equal exactly 11
- `composite_risk_score` formula must be documented in the system prompt
- `confidence_score` derivation criteria must be stated in the system prompt
- No PII fields (name, phone, email, Aadhaar, vehicle owner identity)
