---
name: aicodepath-model-training
description: Autonomous ML experiment loop — proposes changes, runs training, auto-keeps improvements and reverts regressions.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "[task description and dataset path, or leave blank to start interview]"
---

# AICodePath Model Training

Autonomous ML experiment loop — generalized from Karpathy's autoresearch pattern. Three phases: **Intake → Loop → Report**.

The core loop is simple: modify `train.py` → run for a fixed time budget → measure metric → keep if improved, discard otherwise → repeat. The agent's job is to be creative about what to try; the skill's job is to make that loop reliable.

<HARD-GATE>
Do NOT enter Phase 2 until:
1. Phase 1 interview is complete and environment is verified
2. The baseline run exits 0 and produces a valid metric
3. All scaffold files exist and imports smoke-test passes
</HARD-GATE>

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/scaffold-contract.md` | Generating scaffold files (prepare.py, train.py, strategy.md) |
| `references/strategy-skeleton.md` | Writing strategy.md for a specific task type |
| `references/gcp-vm-setup.md` | User needs a GPU VM on GCP |
| `references/analysis-template.md` | Writing the Phase 3 report |

Load these on demand — do NOT load all at session start.

---

## Phase 1: Intake

### Step 1 — Interview (one question at a time)

Ask these questions sequentially. Do not batch them. Each answer shapes subsequent questions.

1. **Task type** — pretraining, fine-tuning, image classification, object detection, tabular regression/classification, time-series, RL, other?
2. **Dataset** — path, format (HuggingFace dataset ID, CSV, image folder, parquet, custom)?
3. **Train/val split** — already split? If not, skill creates 90/10 (stratified for classification).
4. **Metric + direction** — what to optimize (loss, accuracy, F1, val_bpb, BLEU, etc.) and whether lower or higher is better?
5. **Noise threshold** — minimum meaningful improvement to count as a real gain. Defaults by task: 0.001 for loss/val_bpb, 0.002 for accuracy, 0.005 for F1, 0.01 for RMSE. User can override.
6. **Time budget per experiment** — in **seconds** (default: 300). The `timeout` shell command takes seconds; store as `TIME_BUDGET=300` in prepare.py.
7. **File allowlist** — which files can the agent modify? Default: `train.py` only. Multi-file changes are atomic (keep or discard all together).
8. **Existing code?** — yes → skip scaffold generation. No → generate scaffold.
9. **Pretrained weights?** — if yes, HuggingFace model ID or local path.

### Step 2 — Dataset Analysis

```bash
python3 -c "
import os, pathlib
# detect format, size, splits
"
```

- Detect size, format, feature types
- Infer task type if not stated (image folder → classification, parquet with text → NLP)
- If no train/val split: create one (90/10 default, stratified for classification tasks)

### Step 3 — Environment Setup

Ask: "Do you have a GPU available locally, or should we set up a GCP VM?"

**If GCP needed**: Read `references/gcp-vm-setup.md` — do NOT also load scaffold-contract.md or strategy-skeleton.md at this stage. Guide the user through VM creation. **Pause here until the user confirms they are SSH'd into a GPU machine.** GCP setup is a prerequisite, not part of the loop.

**If local GPU**: continue to Step 4.

### Step 4 — Hardware Detection

```bash
nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader
python3 -c "import torch; print(torch.__version__, torch.cuda.get_device_capability())"
```

Record: GPU name, VRAM (GB), compute capability. This determines:
- bf16 support: compute ≥ 8.0
- FlashAttention-3: compute 9.0+
- VRAM budget for conservative scaffold sizing

Generated code MUST adapt to detected hardware — do not hardcode H100 assumptions.

### Step 5 — Context7 API Verification

Before generating any PyTorch code, verify the API surface:

```
mcp__plugin_context7_context7__resolve-library-id("pytorch")
mcp__plugin_context7_context7__query-docs  → torch.compile, torch.amp.autocast, DataLoader
```

Generate code using only verified method signatures. This prevents hallucinated APIs that fail at runtime.

### Step 6 — Scaffold Generation (if no existing code)

Read `references/scaffold-contract.md` for the exact interface contract — do NOT also load strategy-skeleton.md until the contract is fully reviewed.

**Before sizing the model, ask:**
- What is available VRAM × 25%? That is the baseline budget — start here.
- What is the simplest architecture that produces a valid metric? (MLP baseline, not transformer)
- Does the task have a known-good small default? (ResNet-18 for vision, 2-layer LSTM for time-series)
- Conservative start is mandatory — the loop discovers optimal sizes. Oversizing OOMs the baseline and wastes the first run.

Generate three files:

**prepare.py** (immutable after generation — chmod 444):
- Constants: INPUT_SIZE/MAX_SEQ_LEN, TIME_BUDGET, EVAL_SIZE
- Data loading + train/val split logic
- **Image tasks only**: `get_train_transforms()` with base augmentation (RandomCrop, HorizontalFlip, Normalize). This goes in prepare.py because it must be constant for fair comparison — the agent may add advanced augmentation in train.py but cannot remove the base.
- `evaluate_<metric>(model, device) → float`
- `run_inference(model, device, input) → output` + `SAMPLE_INPUTS` list

**train.py** (agent modifies this):
- Seeds at top: `random.seed(42)`, `np.random.seed(42)`, `torch.manual_seed(42)`, `torch.cuda.manual_seed_all(42)`
- Model: conservatively small for detected VRAM (start small — agent discovers optimal size)
- Pretrained weight loading if specified
- Optimizer setup
- Training loop respecting TIME_BUDGET
- NaN/explosion guard: `if math.isnan(loss) or loss > 100: print("FAIL"); sys.exit(1)`
- Checkpoint at end: `torch.save(model.state_dict(), "run_model.pt")`
- Mandatory output contract at end (see scaffold-contract.md for exact format)

**strategy.md** (human edits, agent reads):
Read `references/strategy-skeleton.md` and generate a task-specific version. This file defines the agent's research mandate.

### Step 7 — Dependency Install & Smoke Test

```bash
# Auto-detect package manager
if [ -f pyproject.toml ] && [ -f uv.lock ]; then
    uv sync
else
    pip install -r requirements.txt
fi

# Smoke test all imports
python3 -c "from prepare import *; from train import *; print('All imports OK')"
```

If imports fail: fix the scaffold (not prepare.py if user provided it). Do not proceed to Step 8 until imports pass.

### Step 8 — Baseline Run with Fix Loop

```bash
mkdir -p .autoresearch/logs
timeout $((TIME_BUDGET * 3)) python3 train.py > .autoresearch/logs/run_baseline.log 2>&1
echo "Exit: $?"
```

Verify all of:
- Exit code 0 (not 1=NaN, not 124=timeout)
- Metric parseable: `grep "^<metric_name>:" .autoresearch/logs/run_baseline.log`
- Metric is valid float (not NaN, not Inf, not empty)
- Checkpoint exists: `ls -la run_model.pt`

If crash: up to 3 fix attempts on allowlisted files only. If crash traces to prepare.py (user-provided) → **HALT, ask user to fix manually**.

On baseline success:
- Promote checkpoint: `cp run_model.pt .autoresearch/best_model.pt`
- Record in results.tsv (see git workflow below)
- Set up .gitignore: add `run_model.pt`, `.autoresearch/`, `__pycache__/`
- Enforce immutability: `chmod 444 prepare.py`
- Create branch: `git checkout -b autoresearch/<tag>` (tag = task-date or user-provided)

### Immutability Enforcement

These files are NEVER modified after scaffold generation:
- `prepare.py` — evaluation function must be constant for scores to be comparable across experiments. `chmod 444` is the hard guard; the allowlist and strategy.md are the soft guards.
- `strategy.md` — research directions are human-authored

---

## Phase 2: Loop

Run indefinitely until manually stopped or a pause condition triggers.

```
LOOP:
  1. Read strategy.md + current train.py + results context (last 20 rows + summary)
  2. Propose next change (must be in allowlisted files only)
  3. Check: does the change add any new import statements?
     → For each new top-level package: check stdlib list + importlib.util.find_spec()
     → If unavailable: DISCARD immediately, log "attempted to add unavailable dependency: <pkg>"
  4. Apply change to allowlisted file(s)
  5. git commit
  6. Run: timeout $((TIME_BUDGET * 2)) python3 train.py > .autoresearch/logs/run_<short_hash>.log 2>&1
  7. Parse exit code:
     - 0   → extract metric via grep "^<metric>:" from log
     - 1   → NaN/explosion (fast-fail in train.py) → log CRASH, revert
     - 124 → timeout exceeded → log CRASH(timeout), revert
     - other → read traceback (tail -50), fix attempts (max 3, allowlisted files only)
  8. Validate metric: NaN/Inf/empty → treat as CRASH (not regression)
  9. Compare metric (respecting direction):
     - Improved by > noise threshold → KEEP: advance branch, tag if new best,
       promote `cp run_model.pt .autoresearch/best_model.pt`
     - Improved but ≤ threshold → DISCARD (noise)
     - Same or worse → DISCARD
  10. On DISCARD: `rm -f run_model.pt` then `git reset --hard` to last kept commit
  11. Log to .autoresearch/results.tsv
  12. Check pause conditions
  13. Every 20 experiments: check disk, `rm -rf ~/.cache/torch*/ __pycache__/` if > 80%
```

**Results context management**: After 20+ experiments, do NOT read the full results.tsv. Read the last 20 rows plus a computed summary (total runs, keep rate, best metric, crash count). Context window matters for long runs.

### Exit Code Table

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Training completed | Extract metric, compare |
| 1 | NaN/explosion (train.py fast-fail) | CRASH — revert immediately |
| 124 | Timeout (exceeded 2× budget) | CRASH(timeout) — revert |
| other | Python error / OOM / segfault | Read traceback, fix (3 tries) |

### Pause Conditions (configurable in strategy.md)

- After N consecutive crashes (default: 3) — fundamental problem, needs human
- After N consecutive discards (default: 10) — agent may be stuck
- On first significant improvement (> X% over baseline) — optional milestone check
- Every N experiments — optional progress review

### Results Format (.autoresearch/results.tsv)

```
commit	metric_value	memory_gb	status	description
a1b2c3d	0.997900	44.0	keep	baseline
b2c3d4e	0.993200	44.2	keep	increase LR to 0.04
c3d4e5f	0.000000	0.0	crash	double model width (OOM)
e5f6g7h	0.993100	44.1	discard	switch to GeLU (below noise threshold)
f6g7h8i	0.000000	0.0	discard	attempted to add unavailable dependency: flash_attn
```

Status values: `keep`, `discard`, `crash`

### Per-Experiment Logs

Each run writes to `.autoresearch/logs/run_<short_hash>.log`. Never overwrite logs — crash diagnostics are needed after the fact. Maintain a symlink: `ln -sf run_<latest>.log .autoresearch/logs/run.log`

### Session Recovery

If disconnected mid-loop:
1. Read `.autoresearch/results.tsv` → last kept commit, best metric
2. Read `git log --oneline -5` → current branch state
3. If uncommitted changes → `git reset --hard`
4. Check if HEAD commit hash appears in results.tsv — if committed but no entry, experiment was interrupted mid-run → re-run that commit before continuing
5. Resume loop

---

## Phase 3: Report + Inference

Read `references/analysis-template.md` for the full report structure — do NOT re-load scaffold-contract.md or strategy-skeleton.md at this stage.

**Results summary:**
1. Best configuration — describe what train.py looks like at HEAD
2. Baseline → best improvement (absolute + %)
3. Top improvements ranked by delta
4. Failure analysis (common crash patterns, consistently unsuccessful approaches)
5. Recommendations for next directions

**Inference test:**
```python
# Load best model
model = <ModelClass>(...)
model.load_state_dict(torch.load('.autoresearch/best_model.pt'))
model.eval()

# Run sample inference from prepare.py
from prepare import run_inference, SAMPLE_INPUTS
for inp in SAMPLE_INPUTS:
    out = run_inference(model, device, inp)
    print(f"Input: {inp!r} → Output: {out!r}")
```

If `.autoresearch/best_model.pt` doesn't exist (user's existing code didn't checkpoint): re-run training on the best code state (HEAD) to produce it, then run inference.

If inference crashes: note in report, do not block report generation.

**GCP cleanup (if applicable):**
```
Training complete. Stop the VM to avoid charges:
  gcloud compute instances stop ml-training-<TAG>

Delete when done:
  gcloud compute instances delete ml-training-<TAG>
```

Write report to `.autoresearch/report.md`.

---

## NEVER

| Anti-Pattern | Consequence |
|-------------|-------------|
| NEVER promote `run_model.pt` to `best_model.pt` from inside train.py | Promoted checkpoints are never cleaned on DISCARD — stale weights silently become "best" after regression |
| NEVER skip `rm -f run_model.pt` on DISCARD | Stale checkpoint from a regressed run gets promoted if the next run crashes before saving |
| NEVER compare exit code 124 (timeout) as a metric result | Timeout produces no metric output — treating silence as "no improvement" misclassifies it; always revert on 124 |
| NEVER read the full results.tsv after 20+ experiments | Context window exhaustion causes the loop to lose strategy context and start proposing already-tried experiments |
| NEVER modify prepare.py during the loop, even to "just fix a bug" | Changing the evaluation function mid-session makes all previous metrics incomparable — the results.tsv becomes meaningless |
| NEVER apply a new import without `importlib.util.find_spec()` check | Missing packages crash with exit code 1 (NaN guard triggers), consuming a fix attempt and corrupting crash counts |
| NEVER batch multiple structural changes in one experiment | When a multi-change experiment regresses, there is no signal about which change caused the regression — bisecting wastes subsequent runs |

---

## Safety Rails

| Rail | Mechanism |
|------|-----------|
| Timeout kill | `timeout $((TIME_BUDGET * 2))` shell wrapper on every run |
| NaN fast-fail | train.py exits 1 on NaN/loss > 100; loop treats as crash, not regression |
| Regression guard | Auto-pause after 10 consecutive discards |
| Crash guard | Auto-pause after 3 consecutive crashes |
| Best checkpoint | `git tag best-<metric>` on best-known-good commit |
| Noise threshold | Configurable minimum delta; changes below it are discarded |
| Allowlist enforcement | Verify target file before every edit |
| Import guard | stdlib + importlib.util.find_spec() check before every run |
| prepare.py immutability | chmod 444 + allowlist + strategy.md warning |
| Disk cleanup | Every 20 experiments: clean torch cache + __pycache__ |

---

## Project File Structure

```
user-project/
├── prepare.py              # Immutable (chmod 444): data, eval, inference
├── train.py                # Agent modifies this
├── strategy.md             # Human edits, agent reads
├── pyproject.toml          # or requirements.txt
├── run_model.pt            # Temp checkpoint (deleted on discard)
└── .autoresearch/          # All outputs (gitignored)
    ├── best_model.pt       # Promoted from run_model.pt on KEEP
    ├── results.tsv         # Experiment log
    ├── report.md           # Final report
    └── logs/
        ├── run_baseline.log
        ├── run_a1b2c3d.log
        └── run.log → run_<latest>.log
```
