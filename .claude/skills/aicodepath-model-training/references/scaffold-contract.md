# Scaffold Contract: prepare.py ↔ train.py

This document defines the interface contract between the two scaffold files. `prepare.py` is immutable after generation. `train.py` must conform to this contract — violating it breaks metric extraction, inference, and the loop.

---

## prepare.py Exports

Every generated `prepare.py` MUST export these names:

```python
# Constants
TIME_BUDGET: int          # seconds per experiment (e.g. 300 = 5 min) — ALWAYS in seconds; timeout shell command uses this directly
EVAL_SIZE: int            # number of samples used for evaluation
# For NLP: MAX_SEQ_LEN: int
# For vision: INPUT_SIZE: tuple  e.g. (3, 224, 224)

# Data
def make_dataloader(split: str, batch_size: int, ...) -> DataLoader:
    """split: 'train' or 'val'"""

# Image tasks only — base augmentation (immutable, agent cannot remove)
def get_train_transforms() -> transforms.Compose:
    """Returns base augmentation pipeline: RandomCrop, HorizontalFlip, Normalize.
    train.py calls this and may compose additional transforms on top."""

# Evaluation — called by the loop to measure metric
def evaluate_<metric>(model: nn.Module, device: torch.device) -> float:
    """Returns the metric as a float. Lower or higher is better depends on task."""

# Inference — called in Phase 3
SAMPLE_INPUTS: list        # 3-5 representative inputs for qualitative check
def run_inference(model: nn.Module, device: torch.device, inp) -> any:
    """Run model on a single input. Return human-readable output."""
```

---

## train.py Contract

`train.py` MUST satisfy these requirements or the loop breaks.

### 1. Seeds (reproducibility)

```python
import random, math, sys
import numpy as np
import torch

random.seed(42)
np.random.seed(42)
torch.manual_seed(42)
torch.cuda.manual_seed_all(42)
```

Place these at the top of the file, before any other operations.

### 2. NaN/Explosion Guard

Inside the training loop, after computing loss:

```python
if math.isnan(loss.item()) or loss.item() > 100:
    print("FAIL")
    sys.exit(1)
```

Exit code 1 tells the loop this is a crash (revert immediately), not a bad metric (compare and discard).

### 3. Checkpoint

At end of training, save to `run_model.pt` in the project root:

```python
torch.save(model.state_dict(), "run_model.pt")
```

The loop promotes this to `.autoresearch/best_model.pt` on KEEP, and deletes it on DISCARD. Never save directly to `.autoresearch/best_model.pt` from train.py.

### 4. Mandatory Output Contract

The LAST lines of stdout MUST match this format exactly. The loop parses with `grep "^<metric>:"`.

```
---
<metric_name>:    <float_value>
training_seconds: <float_value>
peak_vram_mb:     <float_value>
num_steps:        <int_value>
```

Example for image classification with accuracy:

```
---
accuracy:         0.9234
training_seconds: 297.4
peak_vram_mb:     5821.0
num_steps:        1250
```

Example for language model with val_bpb:

```
---
val_bpb:          0.9934
training_seconds: 299.8
peak_vram_mb:     39204.0
num_steps:        480
```

**Why this format?** Parsing with `grep "^val_bpb:"` is reliable and fast. Any other format risks silent extraction failures — the loop would see an empty string, treat it as a crash, and revert a valid improvement.

### 5. TIME_BUDGET Respect

```python
from prepare import TIME_BUDGET
import time

start = time.time()
for step in range(max_steps):
    # ... training step ...
    if time.time() - start >= TIME_BUDGET:
        break
```

The shell `timeout` wrapper (2× TIME_BUDGET) is the hard kill. The soft check inside the loop ensures a clean exit and checkpoint save before the hard kill triggers.

### 6. Image Tasks — Augmentation

```python
from prepare import get_train_transforms

# Base augmentation from prepare.py (immutable)
base_transforms = get_train_transforms()

# Agent may compose additional transforms:
# train_transforms = transforms.Compose([base_transforms, AdditionalAugment()])
# But must always call get_train_transforms() — never replace it
```

---

## Default Architectures by Task Type

| Task Type | Default Scaffold Architecture |
|-----------|-------------------------------|
| Text pretraining | Small GPT (2-4 layers, 128-256 hidden, scaled to VRAM) |
| Text fine-tuning | Pretrained model + classification head |
| Image classification | ResNet-18 or small ViT (patch 16, 4-6 layers) |
| Object detection | DETR-small or YOLO-nano |
| Tabular regression | MLP (3 layers: input → 256 → 128 → 1) |
| Tabular classification | MLP (3 layers: input → 256 → 128 → num_classes) |
| Time-series | Small LSTM (2 layers, 128 hidden) |
| Custom | Minimal MLP baseline (2 layers) |

Scaffold should start conservatively small. The agent discovers optimal model sizes within the time budget. The baseline should never OOM.

---

## VRAM Budget Guidelines

Start at ~25% of available VRAM so the agent has room to scale up:

| Available VRAM | Baseline Budget |
|----------------|-----------------|
| 8 GB  (RTX 3070) | ~2 GB model |
| 16 GB (RTX 4080) | ~4 GB model |
| 24 GB (RTX 4090) | ~6 GB model |
| 40 GB (A100)     | ~10 GB model |
| 80 GB (H100)     | ~20 GB model |
