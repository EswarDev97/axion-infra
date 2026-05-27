# TIDD-EC Framework

**Task · Instructions · Do · Don't · Examples · Context**

The most effective general-purpose framework for structured LLM output prompts. Use as the default starting point for any new prompt or when structural gaps are identified.

---

## Component definitions

| Component | Purpose | Signs it's missing |
|---|---|---|
| **Task** | One-sentence job description for the model | Model does inconsistent things; output varies by phrasing |
| **Instructions** | Numbered step-by-step rules | Steps skipped; wrong order; ambiguous handling of edge cases |
| **Do** | Explicit positive rules | Required fields missing; model uses wrong units/format |
| **Don't** | Explicit negative rules (the most commonly missing component) | Extra keys in output; prose leaking into JSON; PII included |
| **Examples** | Concrete input → output pair(s) | Model interprets field semantics incorrectly |
| **Context** | Domain, role, data quality assumptions | Generic answers; missing domain-specific scoring |

---

## Template (generic)

```
## Task
You are a [ROLE] specialising in [DOMAIN]. Your job is to [ONE SENTENCE JOB].

## Instructions
1. Read the input: [describe input structure]
2. For each [unit of analysis], assess [what to assess]
3. Apply [scoring rule or formula]
4. Produce structured output as defined in the Output Format section
5. [Additional steps...]

## Do
- Always return [required field(s)] even when data is unavailable (use [default/null])
- Use [unit/currency/scale] for all [field type] values
- Set [field] to [value] when [condition]
- [Additional positive rules...]

## Don't
- Never include fields not in the Output Format schema
- Never return markdown, code fences, or prose — JSON output only
- Never [domain-specific restriction]
- Never hardcode [scores/values] — derive from input data

## Examples
Input:
[concrete example input]

Output:
[concrete example output — must match Output Format exactly]

## Context
[Domain name], [real-world setting], [data quality assumptions], [units and currency], [any model limitations to account for]

## Output Format
Return a single valid JSON object with exactly these fields:
{
  "field_name": "type — description (valid values: ...)",
  ...
}
```

---

## Common gaps by symptom

| Symptom | Missing component | Fix |
|---|---|---|
| Extra keys in output | Don't | Add "Never include fields not in the Output Format schema" |
| Scores always the same value | Instructions | Add explicit derivation rule with input conditions |
| Boolean flag always true/false | Do + Don't | Add explicit condition for true AND condition for false |
| Wrong units (e.g. USD instead of INR) | Do | Add "Use [unit] for all monetary values" |
| Output contains prose/explanation | Don't | Add "Never return explanations — values only" |
| Required field missing when data absent | Do | Add "Always return [field] — use null if unknown" |
| Model doesn't act like a specialist | Context | Strengthen role + domain context section |
| Schema shape wrong | Output Format | Provide exact JSON structure with types |

---

## Layering with secondary frameworks

TIDD-EC is the base. Layer secondary frameworks for specific gaps:
- **CO-STAR** — if model lacks specialist persona (enrich Context section)
- **RISEN** — if Instructions steps need sub-steps with role/format/nuance
- **Self-Refine** — if iterating on a prompt that already partially works
- **CAI Critique-Revise** — if schema compliance keeps failing despite explicit schema
