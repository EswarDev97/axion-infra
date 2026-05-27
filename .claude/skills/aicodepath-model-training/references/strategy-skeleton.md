# Strategy Skeleton — strategy.md Generation Guide

This file defines how to generate `strategy.md` for a given task type. Read this reference when writing the strategy.md scaffold in Phase 1 Step 6.

`strategy.md` is the agent's research mandate — it defines what to try, what not to try, and what the goal is. The human may edit it. The agent reads it at the start of every experiment.

---

## strategy.md Template Structure

```markdown
# Experiment Strategy — <Task Type> (<Date>)

## Goal
Optimize <metric_name> (target: <direction>-is-better) on <dataset>.
Minimum improvement threshold: <threshold> (changes below this are noise).
Time budget per experiment: <time_budget> seconds.

## Environment
- GPU: <detected GPU name>
- VRAM: <VRAM GB> GB
- PyTorch: <version>
- bf16: <yes/no> (compute cap <X.X>)

## Files
- Modifiable: <allowlist — default: train.py>
- Immutable: prepare.py (chmod 444), strategy.md

## Hard Rules
- Modify ONLY files in the modifiable list above
- Do NOT add new package imports (importlib check will catch it — auto-discard)
- Do NOT modify the mandatory output contract at the end of train.py
- Do NOT modify seeds at the top of train.py (reproducibility)
- Do NOT modify the TIME_BUDGET loop exit check
- Image tasks: call get_train_transforms() from prepare.py — never replace it

## Experiment Loop Protocol
1. Propose ONE change at a time — isolated changes produce interpretable results
2. Describe the change in ≤ 20 words for results.tsv
3. Keep changes to < 50 lines of diff — large changes are harder to diagnose on failure
4. After 3 consecutive crashes: PAUSE and report, do not keep retrying
5. After 10 consecutive discards: PAUSE and report, try a different direction

## Research Directions

<see task-specific sections below>

## What Has Been Tried
(Updated automatically — do not edit this section)
See .autoresearch/results.tsv for full history.
```

---

## Task-Specific Research Directions

Insert the appropriate section under "## Research Directions" based on the task type from the interview.

### Text Pretraining / Language Model

```markdown
### Learning Rate & Schedule
- LR range: 1e-5 (fine-tuning) to 1e-2 (pretraining) — log scale exploration
- LR schedule: cosine decay, linear warmdown, constant with warmup
- Warmup steps: 10-200 depending on total steps
- Weight decay: 0.01 to 0.1

### Architecture
- Depth: vary number of transformer layers (2–12)
- Width: hidden dim 64–1024, constrained by VRAM
- Heads: number and head dimension (try head_dim=64 or 128)
- Attention patterns: standard, sliding window, sparse
- Rotary embeddings (RoPE), ALiBi, no positional encoding

### Advanced Architecture
- Activation: ReLU² (x*max(x,0)), SwiGLU (needs 2/3 hidden scale), GELU
- Normalization: RMSNorm vs LayerNorm, pre-norm vs post-norm
- Value embeddings (additional value projection)
- Residual scaling (depth-dependent scaling)

### Optimizer
- AdamW betas (try (0.9, 0.95) vs (0.9, 0.999))
- Muon for matrix params (polar express orthogonalization)
- Gradient clipping: 1.0 (default), 0.5, 0.1

### Hardware Efficiency
- torch.compile: try default, reduce-overhead, max-autotune
- Mixed precision: bf16 if compute ≥ 8.0, else fp16
- Gradient accumulation for effective batch size
- Flash attention if available
```

### Image Classification

```markdown
### Learning Rate & Schedule
- LR range: 1e-4 to 1e-1 (SGD), 1e-5 to 1e-3 (AdamW)
- Cosine annealing, step decay, warmup + cosine
- Weight decay: 1e-4 to 1e-2
- Label smoothing: 0.0 to 0.2

### Architecture
- Depth: vary number of blocks/layers
- Width: channel multiplier (0.5× to 2×)
- Kernel sizes: 3×3 (default), 5×5, mixed
- Pooling: avg vs max, global avg pooling
- Attention in later stages (CBAM, SE blocks)

### Advanced Augmentation (on top of base transforms in prepare.py)
- ColorJitter (brightness, contrast, saturation, hue)
- Mixup (alpha 0.2–0.4)
- CutMix (alpha 0.2–1.0)
- RandAugment (N=2, M=9)
- Random erasing (probability 0.25)
Note: base transforms (RandomCrop, HorizontalFlip, Normalize) are in prepare.py — do not duplicate or remove them

### Optimizer
- SGD + momentum (0.9) vs AdamW
- Cosine annealing with warm restarts
- Gradient clipping

### Regularization
- Dropout: 0.0 to 0.5 (between blocks)
- Stochastic depth (drop path): 0.1 to 0.3
- BatchNorm momentum: default vs 0.01
```

### Object Detection

```markdown
### Backbone
- Channel widths, depth scaling
- Pretrained backbone weights (ImageNet)
- Feature pyramid neck configurations

### Anchor / Query Configuration
- Anchor sizes and aspect ratios (anchor-based)
- Number of queries (DETR-style)
- Positive/negative sampling ratios

### Training
- LR: backbone vs head (typically 10× lower for backbone)
- Mosaic augmentation, random scale jitter
- IoU threshold for positive assignment
- Loss weights (cls vs box vs obj)

### Data Augmentation (on top of base transforms)
- Mosaic (4-image combination)
- Random affine (scale, translate, shear)
- Color space augmentation
Note: base transforms in prepare.py must not be removed
```

### Tabular (Regression / Classification)

```markdown
### Architecture
- Number of hidden layers (1–6)
- Hidden dimensions (32–1024, try powers of 2)
- Skip connections between layers
- Batch normalization vs layer normalization
- Activation: ReLU, GELU, SiLU

### Regularization
- Dropout rate (0.1–0.5 per layer)
- Weight decay
- Early stopping patience

### Feature Handling
- Embedding dimensions for categorical features (4–64)
- Feature normalization strategy (standardize, min-max, quantile)
- Missing value handling

### Optimizer
- AdamW with varying LR (1e-4 to 1e-2)
- SGD + momentum
- LR schedule: cosine, reduce on plateau
```

### Time-Series / Sequence

```markdown
### Architecture
- RNN type: LSTM vs GRU
- Layers: 1–4
- Hidden size: 32–512
- Bidirectional (if not causal task)
- Small Transformer: depth 2–6, heads 2–8, positional encoding type

### Input Processing
- Sequence length / window size
- Feature scaling / normalization
- Lag features

### Training
- LR: 1e-4 to 1e-2
- Gradient clipping (important for RNNs)
- Teacher forcing ratio (sequence-to-sequence)
- Scheduled sampling

### Regularization
- Dropout on RNN outputs
- Variational dropout (same mask per timestep)
- Weight dropout on recurrent connections
```

### General (All Tasks)

```markdown
### Hardware Efficiency (apply to any task)
- torch.compile: default mode first, then reduce-overhead
- Mixed precision: bf16 if compute ≥ 8.0, else fp16
- Gradient accumulation: effective batch = batch_size × accum_steps
- gradient clipping values (0.1, 0.5, 1.0, none)
- Pin memory + persistent workers in DataLoader
```

---

## Generation Instructions

When writing `strategy.md` for a user's project:

1. Fill in all template placeholders (GPU, VRAM, metric, threshold, etc.) from Phase 1 interview
2. Include the task-specific research directions section that matches the detected task type
3. Always append the "General" section at the end of research directions
4. Do NOT include research directions for other task types — keep the file focused
5. Add the "What Has Been Tried" section as a placeholder — results.tsv is the authoritative record
6. Keep strategy.md under 150 lines — if it grows larger, the agent spends too much context on it
