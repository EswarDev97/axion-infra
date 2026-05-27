# Product Discovery — Templates & Frameworks

## Brainstorm Ideas (New Product)

Generate ideas from 3 perspectives for `$ARGUMENTS`:

**Product Manager lens** — Business value, market gap, monetization angle
**Designer lens** — User experience, pain point relief, delight opportunities
**Engineer lens** — Technical feasibility, leverage existing infrastructure, platform opportunities

For each idea: Name | Core JTBD it solves | Why now | Biggest risk

---

## Brainstorm Ideas (Existing Product)

Use the **product trio** (PM + Designer + Engineer) to generate 5+ ideas.
For each: How does it extend the product's current value? What segment does it serve?
What's the smallest version (MVP)?

---

## Identify Assumptions (New Product)

Categorize assumptions across 8 risk areas for `$ARGUMENTS`:
1. **Desirability** — Do users want this?
2. **Feasibility** — Can we build it?
3. **Viability** — Can we monetize it?
4. **Usability** — Can users figure it out?
5. **Ethical** — Does it cause harm?
6. **Regulatory** — Any legal/compliance barriers?
7. **Channel** — Can we reach customers?
8. **Market timing** — Is the window open?

Output: Assumption | Category | Risk level (High/Med/Low) | Evidence needed

---

## Identify Assumptions (Existing Product)

Devil's advocate analysis across 4 areas:
1. **User behavior** — Will existing users change their behavior?
2. **Technical** — What could break?
3. **Business** — Revenue/cost model risks
4. **Market** — Competitive or timing risks

---

## Prioritize Assumptions

**Impact × Risk matrix:**
| Assumption | Impact if wrong | Likelihood of being wrong | Priority | Cheapest experiment |
|------------|-----------------|--------------------------|----------|---------------------|

Prioritize: High impact + High likelihood first → run experiments before building.

---

## Brainstorm Experiments (Existing Product)

For each assumption, design the lowest-effort experiment:
- **Prototype** — Fake UI, Figma mockup, Wizard of Oz
- **A/B test** — Feature flag on existing flow
- **Spike** — 1-2 day technical investigation
- **Data pull** — Does existing data answer this?

Output: Assumption | Experiment type | What to measure | Pass/fail threshold | Effort (days)

---

## Brainstorm Experiments (New Product)

Use **pretotypes** (Alberto Savoia — The Right It):
- **Landing page** — Drive paid traffic, measure sign-ups before building
- **Pre-order / waitlist** — Measure willingness to pay
- **Concierge MVP** — Do the job manually for 10 users first
- **XYZ Hypothesis**: "At least X% of [Y] will [Z]" — define before running

---

## Opportunity Solution Tree (OST)

```
DESIRED OUTCOME
└── Opportunity 1 (unmet need / pain point)
    ├── Solution A
    │   └── Experiment →
    ├── Solution B
    │   └── Experiment →
└── Opportunity 2
    ├── Solution C
    │   └── Experiment →
```

Rule: Map opportunities before jumping to solutions. Each experiment tests one assumption.

---

## Customer Interview Script

Structure (The Mom Test principles — Rob Fitzpatrick):

1. **Warm-up** (2 min): "Tell me about your role and how you typically [domain]."
2. **Past behavior** (5 min): "Walk me through the last time you [task]. What happened?"
3. **Pain exploration** (10 min): "What's the hardest part of [task]?" → "Why is that hard?" → "How do you deal with it today?"
4. **Current solutions** (5 min): "What tools or workarounds do you use?" → "What do you like/dislike about them?"
5. **Future state** (5 min): "If you had a magic wand, what would change?" *(don't pitch your solution)*
6. **Wrap-up** (3 min): "Is there anyone else I should talk to?"

**Mom Test rules**: Ask about past behavior (not hypotheticals). Never pitch. Let silence breathe.

---

## Summarize Interview

Structure for interview notes:

```
## Interview Summary — [Participant Role], [Date]

### JTBD (primary job they're trying to do)

### Key Pains (in their words — direct quotes)

### Current Workarounds (what they use today)

### Surprising Insights (unexpected findings)

### Quotes worth sharing

### Action Items
```

---

## Analyze Feature Requests

Group requests into categories, then prioritize:

| Theme | # Requests | Segments requesting | Business value | Effort | Recommendation |
|-------|-----------|---------------------|---------------|--------|----------------|

Recommendation options: Build now / Bundle with planned work / Defer / Won't build (explain why)

---

## Metrics Dashboard Design

**North Star Metric** — one metric that captures the core value delivered to users.
Choose: Attention game (time/engagement), Transaction game (revenue/conversions), or Productivity game (tasks completed/time saved).

```
North Star Metric: [Metric name]
Definition: [Exact calculation]
Target: [Number] by [Date]

Input Metrics (levers that drive NSM):
1. [Metric] — [How it influences NSM]
2. [Metric] — [How it influences NSM]
3. [Metric] — [How it influences NSM]

Health Metrics (guardrails — must not degrade):
- [Metric] — threshold: [value]
- [Metric] — threshold: [value]
```
