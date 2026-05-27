# 11 Attributes — Risk Direction Reference

These are the only attributes that appear in `attribute_risks`. Every prompt must instruct the model to assess all 11.

| # | Attribute (exact name) | Typical direction | Severity guide | Notes |
|---|---|---|---|---|
| 1 | No. of Previous Owners | Negative | 1 owner = NONE/LOW, 2 = LOW/MEDIUM, 3+ = MEDIUM/HIGH | More ownership transfers = higher uncertainty about maintenance |
| 2 | Accident History | Negative | None = NONE, Minor = LOW/MEDIUM, Major = HIGH | Severity-weighted; structural damage → HIGH regardless of repair quality |
| 3 | Service History | Bidirectional | Full authorised = NONE/LOW (positive), Partial = MEDIUM, None = HIGH | Authorised service records signal better maintenance |
| 4 | CNG Kit | Bidirectional | Factory-fitted = LOW/NONE, Aftermarket = MEDIUM/HIGH | Aftermarket kits raise safety/insurance concerns; factory = neutral |
| 5 | Usage Type | Negative if commercial | Personal = NONE, Taxi/rental = HIGH | Commercial use → high mileage accumulation, harder wear |
| 6 | IDV Amount | Positive signal | Low IDV relative to market = MEDIUM/HIGH (underinsured) | Higher IDV signals owner valued the vehicle and maintained insurance properly |
| 7 | Hypothecated | Negative | Not hypothecated = NONE, Hypothecated = MEDIUM/HIGH | Active loan encumbrance creates transfer risk for buyer |
| 8 | Insurance Renewal | Negative if near expiry | >6 months = NONE, 3-6 = LOW, <3 months = MEDIUM, Lapsed = HIGH | Lapsed or near-lapse increases buyer's immediate cost |
| 9 | Insurance Status | Negative if lapsed | Live = NONE, Lapsed = HIGH | Binary: Live/Lapsed. Lapsed means no coverage at time of assessment. |
| 10 | Emission Cert Valid | Negative if expired | Valid + >6 months = NONE, Valid + <3 months = LOW, Expired = HIGH | PUC certificate validity; expired = cannot legally drive |
| 11 | Inspection Notes | Bidirectional | Depends on content | Free text field. Model must interpret severity from content. Positive notes can reduce risk. |

---

## Negotiation leverage guidance

Set `negotiation_leverage: true` when the attribute:
- Creates a meaningful legal, financial, or safety risk for the buyer
- Is difficult or expensive to resolve (e.g. remove hypothecation, fix structural damage)
- Gives the buyer objective grounds to negotiate down

Set `negotiation_leverage: false` when:
- The risk is cosmetic or easily resolved
- The attribute is neutral or positive (e.g. full service history, factory CNG)
- The severity is `NONE`

---

## Price impact guidance

`price_impact_pct` is the percentage adjustment relative to the base market price for the vehicle (make/model/year/variant/city).

- Negative values reduce the price (risks)
- Positive values increase the price (positives, rare)
- `NONE` severity → 0.0 impact
- `HIGH` severity → typically -10% to -25% depending on attribute
- `MEDIUM` → typically -3% to -10%
- `LOW` → typically -1% to -3%

These are guidelines, not hard rules. The model should reason from the specific vehicle context.
