# Data Analytics — Templates & Frameworks

## SQL Query Generation

Generate SQL for `$ARGUMENTS`. Specify dialect if known (BigQuery / PostgreSQL / MySQL / Snowflake).

**Standard patterns:**

```sql
-- Retention: users who performed event in week N and week N+1
WITH week_activity AS (
  SELECT
    user_id,
    DATE_TRUNC('week', event_time) AS week,
    COUNT(*) AS event_count
  FROM events
  WHERE event_name = 'session_start'
  GROUP BY 1, 2
),
cohorts AS (
  SELECT user_id, MIN(week) AS cohort_week
  FROM week_activity
  GROUP BY 1
)
SELECT
  c.cohort_week,
  DATEDIFF('week', c.cohort_week, w.week) AS weeks_since_cohort,
  COUNT(DISTINCT w.user_id) AS retained_users,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  ROUND(COUNT(DISTINCT w.user_id) * 100.0 / COUNT(DISTINCT c.user_id), 1) AS retention_pct
FROM cohorts c
JOIN week_activity w USING (user_id)
GROUP BY 1, 2
ORDER BY 1, 2;

-- Funnel analysis
SELECT
  COUNT(DISTINCT CASE WHEN step = 'sign_up' THEN user_id END) AS step1_sign_up,
  COUNT(DISTINCT CASE WHEN step = 'email_verified' THEN user_id END) AS step2_email_verified,
  COUNT(DISTINCT CASE WHEN step = 'onboarding_complete' THEN user_id END) AS step3_onboarded,
  COUNT(DISTINCT CASE WHEN step = 'first_value' THEN user_id END) AS step4_first_value
FROM events
WHERE event_time >= CURRENT_DATE - INTERVAL '30 days';

-- Cohort ARPU over time
SELECT
  DATE_TRUNC('month', first_purchase_date) AS cohort_month,
  DATE_TRUNC('month', purchase_date) AS purchase_month,
  DATEDIFF('month', first_purchase_date, purchase_date) AS months_since_acquisition,
  COUNT(DISTINCT user_id) AS paying_users,
  SUM(revenue) AS total_revenue,
  SUM(revenue) / COUNT(DISTINCT user_id) AS arpu
FROM purchases p
JOIN (SELECT user_id, MIN(purchase_date) AS first_purchase_date FROM purchases GROUP BY 1) fp
  USING (user_id)
GROUP BY 1, 2, 3
ORDER BY 1, 3;
```

---

## Cohort Analysis

Structure for `$ARGUMENTS`:

```markdown
## Cohort Analysis Report — [Product/Feature]

### Retention Curve
| Cohort | Week 0 | Week 1 | Week 2 | Week 4 | Week 8 | Week 12 |
|--------|--------|--------|--------|--------|--------|---------|
| [Month] | 100% | [X%] | [X%] | [X%] | [X%] | [X%] |

**Retention benchmark (SaaS):**
- Week 1: 40-60% = good
- Week 4: 20-30% = good
- Week 12: 10-20% = strong retention

### Feature Adoption by Cohort
[Did newer cohorts adopt feature X faster? What changed?]

### Engagement Trends
[Average sessions/month, actions/session — trending up or down across cohorts?]

### Key Findings
1. [Finding 1 — with data]
2. [Finding 2 — with data]

### Recommended Actions
1. [Action based on data]
```

---

## A/B Test Analysis

For `$ARGUMENTS` (test results):

```markdown
## A/B Test Analysis — [Test Name]

### Test Setup
**Hypothesis:** "We believe [change] will [outcome] because [reason]."
**Control:** [Description]
**Variant:** [Description]
**Primary Metric:** [Metric + definition]
**Secondary Metrics:** [List]
**Guardrail Metrics:** [What must not degrade]

### Sample Size Validation
Required sample size: [N per group] (for [X]% MDE, 80% power, 95% confidence)
Actual sample size: Control [N] | Variant [N]
Test duration: [X days]
✅ / ⚠️ Sample size sufficient?

### Results
| Metric | Control | Variant | Relative Change | p-value | Significant? |
|--------|---------|---------|----------------|---------|-------------|
| [Primary] | | | +X% | | ✅ / ❌ |
| [Secondary] | | | | | |
| [Guardrail] | | | | | |

### Statistical Significance
p-value: [X] | Confidence interval: [X% – Y%]
Power achieved: [X%]

### Recommendation
- [ ] **SHIP** — Significant positive result, no guardrail violations
- [ ] **EXTEND** — Trending positive, need more data (rerun with [N] more users)
- [ ] **STOP** — No significant difference or guardrail degradation

**Reasoning:** [1-2 sentences explaining the call]

### Next Steps
[Follow-up test / segment analysis / rollout plan]
```

**Common A/B test pitfalls to flag:**
- Novelty effect (test too short — users exploring new feature)
- Peeking problem (checking significance before predetermined end date)
- Multiple testing problem (running too many metrics simultaneously)
- Simpson's paradox (aggregate looks good but segments diverge)
