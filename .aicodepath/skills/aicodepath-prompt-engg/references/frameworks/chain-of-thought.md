# Chain of Thought (CoT) Framework

**Use when:** Complex multi-attribute analysis where each attribute decision depends on reasoning, not just lookup. Also when the LLM needs to show its work before producing a final value.

---

## When CoT improves output quality

| Problem | How CoT fixes it |
|---|---|
| Computed score jumps to a value without derivation | Forces step-by-step reasoning before the final number |
| Boolean flag set inconsistently across similar inputs | Model must reason through conditions before setting true/false |
| Attribute analysis ignores interactions | Prompts cross-attribute consideration before final assessment |
| Output quality varies with input phrasing | Anchors reasoning to a fixed chain regardless of input style |

---

## Integration pattern (inside TIDD-EC)

Add to **Instructions** section:
```
For each [attribute/field], reason step by step before producing the final value:
1. State what the input data indicates about this [attribute]
2. Apply the rule: [rule text]
3. State your conclusion
4. Set [field] = [derived value]

Only after completing the reasoning chain, assemble the final JSON output.
```

**Note:** For providers that don't support extended reasoning (non-thinking models), embed reasoning inside a `_reasoning` scratch field and instruct the model to omit it from final output, OR use a two-pass approach (reasoning call → structured output call).

---

## Scratchpad pattern

If the model needs visible reasoning but output must be clean JSON:
```
## Instructions
Step 1: Reason through each attribute. Format your reasoning as:
  ATTRIBUTE: [name]
  DATA SIGNALS: [what the input says]
  RULE APPLIED: [which rule]
  CONCLUSION: [value and why]

Step 2: After reasoning through ALL attributes, produce the final JSON output.
DO NOT include the reasoning in the JSON output.
```

---

## When NOT to use CoT

- Simple field extraction with no computation (CoT adds token overhead with no quality gain)
- When token budget is critical (CoT increases output length significantly)
- When the provider has native thinking/reasoning mode enabled (CoT is redundant)
