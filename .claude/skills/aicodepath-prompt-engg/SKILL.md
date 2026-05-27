---
name: aicodepath-prompt-engg
description: Debug and improve LLM prompt templates — fixes wrong field values, missing keys, and cross-provider inconsistency.
user-invocable: true
allowed-tools: Read, Edit, Write, Bash, Glob, WebFetch
argument-hint: "[provider] [variant] — e.g. gemini no_search, or describe the symptom"
---

# Prompt Engineering — AI Provider Prompt Templates

Systematic, framework-driven workflow for writing and refining LLM provider prompt templates that produce reliable, structured output.

**Primary framework:** TIDD-EC (Task · Instructions · Do · Don't · Examples · Context)
**Framework selection:** Driven by failure symptom — see Step 3.

---

## Step 0 — Domain context injection

Before touching any prompt file, establish the domain context. Ask or infer from the conversation:

| Context item | What to find |
|---|---|
| **Prompt location** | Where are the prompt files? (path pattern, storage system) |
| **Output schema** | What JSON/structured output does the prompt produce? Load or ask user to paste it. |
| **Provider(s)** | Which AI providers are targeted? (openai, anthropic, gemini, perplexity, etc.) |
| **Variant(s)** | Are there prompt variants? (e.g. with_search / no_search, short / long) |
| **Domain constraints** | Hard rules the output must follow (field types, value ranges, PII restrictions) |
| **Template variables** | What `{{variables}}` does the prompt receive at runtime? |

If the project has a worked example or domain spec file, ask user to point to it — load before proceeding.

**When switching providers mid-session:** repeat Step 0 — provider-specific constraints differ even with identical schemas (Gemini function calling format ≠ Anthropic tool use syntax).

**Vehicle valuation example:** see `references/examples/vehicle-valuation/` for a complete domain context bundle (schema, attribute table, TIDD-EC template).

---

## Step 1 — Identify the prompt target

Locate the specific file(s) to improve:
- Ask for the path if not provided, or `Glob` for `**/system.txt`, `**/user.txt`, `**/prompt*.txt`
- Confirm: provider, variant, file type (system vs. user)
- If the file doesn't exist, ask whether to create from scratch using the TIDD-EC template

---

## Step 2 — Load and read the current prompt

Read the target file in full. Note:
- Total line count
- Which TIDD-EC sections are present vs. absent
- Whether the output schema is defined inline or missing
- Template variables used (list them)
- Provider-specific instructions (if any)

---

## Step 3 — Select the primary framework

Match the failure symptom to the best framework. Load ONLY the selected framework reference — loading multiple frameworks produces contradictory structural instructions the LLM resolves arbitrarily.

| Symptom / Goal | Primary framework | Reference file |
|---|---|---|
| Prompt is new or missing structure entirely | **TIDD-EC** | `references/frameworks/tidd-ec.md` |
| Multi-step analysis sequence produces wrong order or missing steps | **RISEN** | `references/frameworks/risen.md` |
| Output fields are correct but wrong *values* (scoring, flags, formulas) | **TIDD-EC** + clarification gates | `references/frameworks/tidd-ec.md` |
| Persona / domain expertise missing — model doesn't "act" like a specialist | **CO-STAR** | `references/frameworks/co-star.md` |
| Existing prompt partially works — iterating to fix remaining 20% | **Self-Refine** | `references/frameworks/self-refine.md` |
| Schema compliance failing — LLM keeps adding/removing keys | **CAI Critique-Revise** | `references/frameworks/cai-critique-revise.md` |
| Reasoning chain needed for complex attribute-level decisions | **Chain of Thought** | `references/frameworks/chain-of-thought.md` |
| Cross-provider consistency — standardising criteria across providers | **RPEF** | `references/frameworks/rpef.md` |

Load the selected reference file when entering Step 4.

---

## Step 4 — Analyse current prompt quality (5 dimensions)

Score each dimension 1–5 with specific evidence from the prompt text:

| Dimension | What to check |
|---|---|
| **Clarity** | Are instructions unambiguous? Could an LLM misinterpret any step? |
| **Specificity** | Does it name exact output fields, value types, and valid ranges? |
| **Context** | Does it establish domain, role, and any required real-world constraints? |
| **Constraints** | Are format-only, no-extra-keys, no-markdown, and field restriction rules explicit? |
| **Output Format** | Is the full output schema provided inline with field types and example values? |

Total score: X/25. Dimensions with score ≤3 are priority fixes.

---

## Step 5 — Apply the selected framework + clarification gates

### Universal clarification gates (confirm before any edit):

1. Confirm the exact output schema — paste or load from the domain spec
2. Confirm which fields are **required** vs. optional in every response
3. Confirm any **computed fields** (scores, formulas, aggregations) — ask for exact calculation rule, not a description (e.g., "weighted average of X, Y, Z with weights 0.4/0.3/0.3" not "combine the scores")
4. Confirm boolean or enum fields — ask what specific input conditions set each value to true/false
5. Confirm template variable semantics — for each `{{variable}}`, ask: anchor value, informational context, or override?

Skip any gate already answered in the current conversation.

### Framework application:

Map each component of the selected framework to the current prompt. For TIDD-EC, the 6 questions to ask:
- **T**ask: Is the model's job stated in one sentence?
- **I**nstructions: Are step-by-step rules numbered and unambiguous?
- **D**o: Explicit positive rules (must include X, always return Y)?
- **D**on't: Explicit negative rules (never add Z, skip W if missing)?
- **E**xamples: At least one concrete input → output pair?
- **C**ontext: Domain, role, currency/units, data quality assumptions stated?

---

## Step 6 — Produce the improved prompt

Format the response as:

1. **Changes summary** — bulleted list of what changed and why (link each change to a framework component)
2. **Before** — original prompt (full text; truncate with `[... N lines omitted]` only if >60 lines)
3. **After** — complete improved prompt, ready to copy
4. **Gap analysis** — which framework components were missing and are now addressed, which remain weak

---

<HARD-GATE>
Do NOT write the prompt file (Step 7) before completing the validation checklist below.
A prompt with schema violations or missing formula rules will be imported to production
and cause systematic output failures across ALL calls until the file is manually corrected.
Partial edits are worse than no edits — the model receives contradictory instructions.
</HARD-GATE>

## Step 7 — Validate against hard constraints

All boxes must pass before writing the file:

- [ ] Output is the required format only (JSON-only if structured output — no markdown, no code fences, no prose)
- [ ] All required fields present in the schema definition inside the prompt
- [ ] Computed/formula fields have their exact calculation rule documented inside the prompt (not vague: "combine scores" → "weighted average with weights X/Y/Z")
- [ ] No PII fields referenced unless explicitly required by the domain
- [ ] Confidence/quality score derivation criteria stated in the prompt (not hardcoded)
- [ ] Schema has no extra keys beyond the approved output spec
- [ ] All template variables (`{{variable}}`) are present and their usage explained to the model
- [ ] Provider-specific constraints respected (e.g. Gemini function calling format vs. Anthropic tool use)

If any box fails, fix the prompt body before proceeding to Step 8.

---

## Step 8 — Write and deploy

1. Write the improved prompt to the target file
2. If the project uses a config import script (MinIO, S3, DB), run it and confirm success
3. For multi-provider projects: offer to apply the same fix to all affected providers

---

## Troubleshooting

| Symptom | Root cause | Fix |
|---|---|---|
| Output still has extra keys after adding "Don't include extra fields" | Model treats it as soft advice — "don't" without schema closes the loop partially | Replace with hard constraint: "Return EXACTLY these keys and NO others: [list them explicitly]" |
| Score field always returns same value despite input changes | Derivation rule missing from prompt — model uses prior/training default | Add explicit formula with input conditions → output mapping; include worked example |
| Boolean flag stuck at true (or always false) | Only one condition defined; model defaults when other condition is absent | Define BOTH conditions explicitly: what sets it true AND what sets it false |
| Provider A consistent, Provider B drifts | Role or Parameters section differs between providers | Run RPEF audit — diff Role sections side by side; propagate canonical definition |
| Template variable `{{var}}` appears literally in output | Variable not injected at runtime; prompt reached model unexpanded | Check runtime injection; if confirmed injecting, add `{{var}} will be replaced before this prompt reaches you` note |
| CAI Critique-Revise applied but schema still non-compliant | Critique step not strict enough — "almost correct" is rated as passing | Tighten the critique rubric: "any extra key = immediate FAIL, not 'minor issue'" |
| Prompt improved but output regressed on other fields | Over-constrained the Don't section — model is now avoiding valid fields | Review Don't rules for overly broad patterns; scope restrictions to specific fields |

---

## NEVER

- Edit a prompt without first loading the output schema — schema is ground truth; without it, you cannot tell what "correct output" looks like and every fix is a guess
- Assume a field's calculation rule from its name — "composite_risk_score" could mean average, weighted average, max, or custom formula; always confirm with clarification gate 3
- Apply all frameworks at once — multiple frameworks produce contradictory structural instructions (RISEN requires role steps, CO-STAR requires persona blocks, TIDD-EC has different ordering); the model resolves contradictions arbitrarily, making output inconsistent across calls
- Write the file before all Step 7 validation boxes pass — a malformed prompt will be imported live and persist until manually corrected; partial edits are worse than no edits because the model receives mixed signals
- Treat a symptom described as "bug" or "data error" as anything other than a prompt instruction gap — if the LLM produces wrong output, the instruction text is the only lever available; code fixes cannot change what an LLM outputs given a fixed prompt
- Add fields to the output schema inside the prompt that aren't in the approved spec — the application code expects exactly the approved schema; extra fields cause silent parse failures downstream
- Skip the domain context step (Step 0) when switching between providers — each provider has different default behaviors (verbosity, format adherence, function calling syntax); what works for Anthropic may hallucinate for Gemini

---

## Reference files

| File | Load when |
|---|---|
| `references/frameworks/tidd-ec.md` | Default — new prompts, structural gaps, or wrong field values |
| `references/frameworks/risen.md` | Multi-step analysis sequences in wrong order |
| `references/frameworks/co-star.md` | Persona / domain expertise missing |
| `references/frameworks/self-refine.md` | Iterative refinement of partial prompt |
| `references/frameworks/cai-critique-revise.md` | Schema compliance failures |
| `references/frameworks/chain-of-thought.md` | Complex reasoning chains |
| `references/frameworks/rpef.md` | Cross-provider standardisation |
| `references/examples/vehicle-valuation/` | Vehicle valuation domain — schema, attribute table, TIDD-EC template |
