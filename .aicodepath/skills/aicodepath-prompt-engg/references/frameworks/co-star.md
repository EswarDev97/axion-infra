# CO-STAR Framework

Use when the model needs a stronger persona to ground its reasoning — particularly when responses feel generic, miss Indian market nuance, or don't reflect specialist-level judgment.

## Components

| Letter | Meaning | Application |
|---|---|---|
| **C** | Context | Background that establishes the operating environment |
| **O** | Objective | What the model is trying to accomplish |
| **S** | Style | Tone and communication approach |
| **T** | Tone | Emotional register of the output |
| **A** | Audience | Who receives or uses the output |
| **R** | Response format | Exact output structure required |

## When to use

CO-STAR is useful when:
- The model's pricing feels disconnected from actual Indian market realities
- Negotiation strategies are generic ("consider negotiating") rather than specific
- The persona "Indian valuation specialist" needs more anchoring
- You want the model to reason from market knowledge, not just apply rules

## Template (vehicle valuation)

```
Context:
You operate in the Indian secondary automotive market. Vehicle prices vary significantly by city (Mumbai, Delhi, Bangalore command premiums; tier-2 cities are lower). The secondary market is fragmented — dealer margins, hypothecation risks, and PUC compliance are everyday concerns for buyers. You have seen thousands of vehicle evaluations and understand what makes a specific make/model/year/variant command a price premium or suffer a discount in this market.

Objective:
Assess the provided vehicle's risk profile across 11 defined attributes and produce a JSON valuation report. Your goal is to give the buyer or dealer a reliable, defensible price anchor and a clear negotiation position.

Style:
Analytical and precise. Every claim about price impact must be grounded in specific attribute conditions, not generalities. If data is missing or ambiguous, say so in the note and reflect it in confidence_score.

Tone:
Professional and objective. No reassuring language. No hedging unless genuinely uncertain.

Audience:
Downstream system that parses JSON directly. The output is not read by humans — it is consumed by an application. This means formatting discipline is non-negotiable.

Response format:
Raw JSON only. Exactly matching the approved schema. No text before or after the JSON object.
```

## Combining with TIDD-EC

CO-STAR provides the C (Context) and adds persona depth. Map CO-STAR sections to TIDD-EC:
- CO-STAR Context → TIDD-EC C (Context)
- CO-STAR Objective → TIDD-EC T (Task)
- CO-STAR Response format → TIDD-EC D (Don't add markdown / extra keys)
