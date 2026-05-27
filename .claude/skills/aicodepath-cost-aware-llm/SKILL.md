---
name: aicodepath-cost-aware-llm
description: Manage LLM API costs — model routing by complexity, token budgets, and prompt caching optimization.
user-invocable: true
allowed-tools: [Read, Grep, Glob, Bash]
argument-hint: "cost audit | model routing | budget check"
---

# Cost-Aware LLM Pipeline

Manage LLM API costs through model routing, budget enforcement, and prompt caching. Integrates with AICodePath's `lib/pricing-calculator.js` and `rules/common/model-selection.md`.

---

## Model Routing by Complexity

Route tasks to the cheapest model that can handle them:

| Complexity | Model | Use Cases | Cost (per 1M tokens) |
|-----------|-------|-----------|---------------------|
| Trivial | Claude Haiku 4.5 | Classification, extraction, formatting, simple Q&A | $0.80 in / $4.00 out |
| Medium | Claude Sonnet 4.6 | Implementation, summarization, code review, analysis | $3.00 in / $15.00 out |
| Complex | Claude Opus 4.6 | Architecture, multi-step reasoning, novel problem solving | $15.00 in / $75.00 out |

**Decision criteria**:
- Can the task be solved with pattern matching alone? → Haiku
- Does the task require multi-step reasoning or code generation? → Sonnet
- Does the task require architectural judgment, novelty, or deep analysis? → Opus
- When uncertain, start with Sonnet — it handles 70% of tasks well

**Pricing note**: These are 2025-2026 prices. Always verify against [official Anthropic pricing](https://docs.anthropic.com) before budgeting.

### Routing implementation

Use AICodePath's built-in complexity classifier:

```javascript
const { classifyTaskComplexity, predictBudget } = require('.aicodepath/lib/pricing-calculator');

const complexity = classifyTaskComplexity(taskDescription);
// Returns: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex'

const budget = predictBudget(taskDescription, modelId);
// Returns: { maxOutputTokens, estimatedCost }
```

Map complexity to model:
```
trivial, simple    → claude-haiku-4-5
moderate           → claude-sonnet-4-6
complex, very_complex → claude-opus-4-6
```

---

## Cost Tracking

Track costs immutably — never modify historical cost records:

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass(frozen=True)
class LLMCostRecord:
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    timestamp: datetime
    task_id: str
    complexity: str
```

**Aggregation queries**:
- Cost per task: group by `task_id`
- Cost per model: group by `model`
- Cost trend: group by date
- Cost per complexity tier: group by `complexity`

---

## Budget Enforcement

Three states with escalating responses:

```
┌──────────────┬───────────────┬────────────────┐
│ within_budget│ approaching   │ over_budget    │
│ (< 80%)      │ (80-100%)     │ (> 100%)       │
│              │               │                │
│ Continue     │ Warn + switch │ FAIL FAST      │
│ normally     │ to cheaper    │ No more calls  │
│              │ model         │                │
└──────────────┴───────────────┴────────────────┘
```

```python
def check_budget(spent: float, budget: float) -> str:
    ratio = spent / budget
    if ratio >= 1.0:
        raise BudgetExceededError(f"Over budget: ${spent:.2f} / ${budget:.2f}")
    elif ratio >= 0.8:
        logger.warning(f"Approaching budget: {ratio:.0%} used")
        return "approaching_limit"  # switch to cheaper model
    return "within_budget"
```

**Key rule**: `over_budget` → fail-fast, never silently continue. An uncontrolled API call loop can cost hundreds of dollars in minutes.

---

## Retry Logic

Only retry on transient errors. Never retry on client errors:

| Status Code | Retry? | Reason |
|-------------|--------|--------|
| 429 | Yes | Rate limited — wait and retry |
| 500 | Yes | Server error — transient |
| 503 | Yes | Service unavailable — transient |
| 400 | No | Bad request — fix the input |
| 401 | No | Auth failure — fix credentials |
| 403 | No | Forbidden — check permissions |
| 404 | No | Not found — wrong endpoint |

**Backoff pattern**: Exponential with jitter:

```python
import random
import time

def retry_with_backoff(fn, max_retries=3, base_delay=1.0):
    for attempt in range(max_retries):
        try:
            return fn()
        except TransientError:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)
```

---

## Prompt Caching

Cache system prompts longer than 1024 tokens. Anthropic's prompt caching reduces input costs by up to 90% on cache hits:

**When to cache**:
- System prompts > 1024 tokens (the minimum for caching benefit)
- Prompts reused across multiple calls in a session
- Reference documents included in context

**Cache key strategy**:
```python
import hashlib

def cache_key(system_prompt: str, model: str) -> str:
    content = f"{model}:{system_prompt}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]
```

**Implementation**: Use the `cache_control` parameter in the Anthropic API:
```python
response = client.messages.create(
    model="claude-sonnet-4-6-20250514",
    system=[{
        "type": "text",
        "text": long_system_prompt,
        "cache_control": {"type": "ephemeral"}
    }],
    messages=[{"role": "user", "content": user_message}]
)
```

---

## Process: Cost Audit

Step-by-step workflow for auditing LLM costs:

1. **Inventory** — List all LLM API calls in the codebase:
   ```bash
   grep -rn 'client\.messages\.create\|openai\.chat\.completions' src/
   ```

2. **Classify** — For each call, determine complexity tier (trivial/medium/complex)

3. **Check routing** — Verify each call uses the appropriate model for its complexity tier

4. **Estimate** — Calculate monthly cost at expected volume:
   ```
   monthly_cost = calls_per_day × 30 × avg_tokens × price_per_token
   ```

5. **Optimize** — Apply fixes:
   - Downgrade over-provisioned calls (Opus doing Haiku work)
   - Add prompt caching for repeated system prompts
   - Add budget enforcement at the session/task level

6. **Monitor** — Set up cost tracking and alerts for budget thresholds

### Integration with AICodePath

- **`lib/pricing-calculator.js`** — `classifyTaskComplexity(desc)` and `predictBudget(desc, modelId)` for automated complexity classification
- **`rules/common/model-selection.md`** — Model routing heuristics and decision framework
- **Statusline `used_percentage`** — Real-time context budget awareness in terminal

---

## NEVER

<HARD-GATE>
- **NEVER** use Opus for tasks that Haiku can handle — a 19x cost difference ($0.80 vs $15.00 per 1M input tokens) means a $10 task could be $0.53. Always try the cheapest viable model first.
- **NEVER** retry on 400/401/403 errors — these are deterministic failures that waste money. Only retry on 429, 500, 503 with exponential backoff.
- **NEVER** continue API calls after `over_budget` — fail fast. An uncontrolled loop can spend your entire monthly budget in minutes.
- **NEVER** mutate cost records after creation — cost tracking must be immutable for accurate auditing. Use frozen dataclasses or read-only database records.
- **NEVER** skip prompt caching for system prompts > 1024 tokens that are reused — you are paying full price for identical content on every call. Caching reduces this by up to 90%.
</HARD-GATE>
