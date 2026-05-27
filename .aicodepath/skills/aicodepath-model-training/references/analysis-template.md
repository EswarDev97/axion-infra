# Analysis Template — Phase 3 Report

Use this template when writing `.autoresearch/report.md` in Phase 3.

Read `.autoresearch/results.tsv` and `.autoresearch/logs/` to populate each section. Do not fabricate numbers — pull directly from the data.

---

## Report Template

```markdown
# Model Training Report
**Task**: <task type> on <dataset>
**Metric**: <metric_name> (<lower/higher>-is-better)
**Date**: <YYYY-MM-DD>
**Total experiments**: <N>
**Duration**: <wall clock hours>

---

## Executive Summary

Baseline <metric>: **<baseline_value>**
Best <metric>: **<best_value>**
Improvement: **<delta> (<percent>%)**

<1-2 sentence description of what drove the most improvement>

---

## Best Configuration

Branch HEAD (`git show --stat`):
```diff
<key changes in train.py vs baseline>
```

Key architectural/hyperparameter choices in the best model:
- <choice 1>
- <choice 2>
- ...

---

## Improvement History

Top improvements ranked by delta (KEEP entries only):

| Rank | Commit | Metric | Delta | Description |
|------|--------|--------|-------|-------------|
| 1 | <hash> | <value> | <+delta> | <description> |
| 2 | <hash> | <value> | <+delta> | <description> |
| 3 | <hash> | <value> | <+delta> | <description> |

Progress chart (ASCII, optional if many experiments):
```
Baseline  █████░░░░░ <baseline_value>
Best      ████████░░ <best_value>
```

---

## Failure Analysis

**Crash rate**: <N crashes> / <total> (<percent>%)
**Common crash patterns**:
- OOM: <N times> — typical cause: <model width/batch size>
- NaN: <N times> — typical cause: <LR too high / missing gradient clip>
- Timeout: <N times> — typical cause: <architecture too large>

**Consistently unsuccessful directions**:
- <approach>: tried <N> times, no improvement — likely reason: <hypothesis>
- <approach>: ...

---

## Recommendations

**Next directions to explore**:
1. <direction> — rationale: <why this wasn't tried or should be tried more>
2. <direction>
3. <direction>

**Transferability**: <notes on whether findings generalize to similar tasks>

**Potential v2 improvements**:
- <suggestion if multi-GPU would help>
- <suggestion if larger time budget would help>

---

## Sample Outputs

Inference test on `SAMPLE_INPUTS` from prepare.py (best model at `.autoresearch/best_model.pt`):

<task-specific format below — choose appropriate one>

### For Language Model
| Input prompt | Generated continuation |
|---|---|
| "<prompt 1>" | "<continuation 1>" |
| "<prompt 2>" | "<continuation 2>" |

### For Image Classification
| Image | Predicted class | Confidence |
|-------|----------------|------------|
| sample_0.jpg | <class> | <prob> |
| sample_1.jpg | <class> | <prob> |

### For Tabular
| Input features | Prediction | Ground truth |
|---------------|------------|--------------|
| <features> | <pred> | <gt> |

---

## Cost Summary (GCP only)

VM type: <instance type>
Total runtime: <N hours>
Estimated cost: $<amount> (based on <region> pricing)

**Action required**: Stop the VM to avoid further charges:
```bash
gcloud compute instances stop ml-training-<TAG> --zone=<ZONE>
```
```

---

## How to Populate the Report

### Parsing results.tsv

```python
import csv, statistics

with open('.autoresearch/results.tsv') as f:
    rows = list(csv.DictReader(f, delimiter='\t'))

total = len(rows)
keeps = [r for r in rows if r['status'] == 'keep']
crashes = [r for r in rows if r['status'] == 'crash']
discards = [r for r in rows if r['status'] == 'discard']

baseline = float(keeps[0]['metric_value'])
best = float(keeps[-1]['metric_value'])

# Sort keeps by improvement
keeps_with_delta = []
for i in range(1, len(keeps)):
    prev = float(keeps[i-1]['metric_value'])
    curr = float(keeps[i]['metric_value'])
    delta = curr - prev  # adjust sign for direction
    keeps_with_delta.append({'rank': i, 'row': keeps[i], 'delta': delta})

top_improvements = sorted(keeps_with_delta, key=lambda x: abs(x['delta']), reverse=True)[:5]
```

### Key metrics for the summary

```python
total_improvement = best - baseline  # adjust sign for lower-is-better
percent_improvement = abs(total_improvement / baseline) * 100
crash_rate = len(crashes) / total * 100
keep_rate = len(keeps) / total * 100
```

---

## Phase 3 Checklist

- [ ] Read results.tsv (full file for report, last 20 for loop context)
- [ ] Identify top 5 improvements by delta
- [ ] Identify common crash patterns from logs
- [ ] Load best_model.pt and run inference on SAMPLE_INPUTS
- [ ] Write report.md using this template
- [ ] If GCP: display stop/delete commands prominently
- [ ] Announce report location: `.autoresearch/report.md`
