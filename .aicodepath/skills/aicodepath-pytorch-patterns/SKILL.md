---
name: aicodepath-pytorch-patterns
description: PyTorch reference patterns — device-agnostic code, mixed precision, reproducibility, and checkpointing.
user-invocable: false
allowed-tools: []
argument-hint: ""
---

# PyTorch Patterns Reference

Idiomatic PyTorch patterns for training, inference, and deployment. Referenced by `aicodepath-model-training` and `aicodepath-data-scientist` agents for PyTorch-specific guidance.

---

## Device-Agnostic Code

Never hardcode `.cuda()`. Use a device variable everywhere:

```python
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = MyModel().to(device)
data = data.to(device)
labels = labels.to(device)
```

For multi-GPU, use `torch.device(f'cuda:{rank}')` with `DistributedDataParallel`.

---

## Reproducibility

Seed ALL random number generators. A single unseeded source breaks reproducibility:

```python
import torch
import numpy as np
import random

def seed_everything(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

seed_everything(42)
```

For DataLoader with `num_workers > 0`, seed each worker:

```python
def worker_init_fn(worker_id):
    np.random.seed(np.random.get_state()[1][0] + worker_id)

loader = DataLoader(dataset, num_workers=4, worker_init_fn=worker_init_fn)
```

**Note**: `cudnn.deterministic = True` reduces performance by ~10-15%. Use only when reproducibility matters (experiments, debugging). Disable for production training.

---

## Mixed Precision Training

Use `torch.amp` for 1.5-3x speedup on Ampere+ GPUs:

```python
scaler = torch.amp.GradScaler('cuda')

for batch in dataloader:
    optimizer.zero_grad(set_to_none=True)

    with torch.amp.autocast('cuda'):
        output = model(batch['input'].to(device))
        loss = criterion(output, batch['target'].to(device))

    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

**Key rules**:
- Only wrap the forward pass and loss in `autocast` — not the backward pass
- Use `GradScaler` to prevent underflow in float16 gradients
- Loss computation must be inside `autocast`
- Gradient clipping goes between `scaler.unscale_()` and `scaler.step()`

```python
scaler.unscale_(optimizer)
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
scaler.step(optimizer)
scaler.update()
```

---

## Checkpointing

Save FULL training state — not just the model:

```python
def save_checkpoint(path, model, optimizer, scheduler, scaler, epoch, loss):
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'scheduler_state_dict': scheduler.state_dict(),
        'scaler_state_dict': scaler.state_dict(),
        'loss': loss,
        'rng_state': torch.random.get_rng_state(),
        'cuda_rng_state': torch.cuda.get_rng_state_all(),
    }, path)

def load_checkpoint(path, model, optimizer, scheduler, scaler):
    ckpt = torch.load(path, weights_only=False)
    model.load_state_dict(ckpt['model_state_dict'])
    optimizer.load_state_dict(ckpt['optimizer_state_dict'])
    scheduler.load_state_dict(ckpt['scheduler_state_dict'])
    scaler.load_state_dict(ckpt['scaler_state_dict'])
    torch.random.set_rng_state(ckpt['rng_state'])
    torch.cuda.set_rng_state_all(ckpt['cuda_rng_state'])
    return ckpt['epoch'], ckpt['loss']
```

**Checkpoint frequency**: Every N epochs or every M minutes. Keep last 3 checkpoints + best checkpoint (by validation loss).

---

## DataLoader Tuning

```python
loader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,                # True for training, False for val/test
    num_workers=4,               # 2-4x CPU cores; benchmark to find sweet spot
    pin_memory=True,             # Always True when training on GPU
    persistent_workers=True,     # Avoid re-spawning workers each epoch
    prefetch_factor=2,           # Prefetch 2 batches per worker
    drop_last=True,              # Avoid small final batches (training only)
    worker_init_fn=worker_init_fn,
)
```

**`num_workers` heuristic**: Start with `min(4, os.cpu_count())`. Benchmark with 0, 2, 4, 8. More workers = more RAM. Set to 0 for debugging.

**Custom collate** for variable-length sequences:

```python
def collate_fn(batch):
    inputs = torch.nn.utils.rnn.pad_sequence(
        [item['input'] for item in batch], batch_first=True
    )
    targets = torch.stack([item['target'] for item in batch])
    lengths = torch.tensor([len(item['input']) for item in batch])
    return {'input': inputs, 'target': targets, 'lengths': lengths}
```

---

## Weight Initialization

Use `model.apply()` for consistent initialization:

```python
def init_weights(m):
    if isinstance(m, nn.Linear):
        nn.init.kaiming_normal_(m.weight, mode='fan_in', nonlinearity='relu')
        if m.bias is not None:
            nn.init.zeros_(m.bias)
    elif isinstance(m, nn.Conv2d):
        nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
    elif isinstance(m, (nn.BatchNorm2d, nn.LayerNorm)):
        nn.init.ones_(m.weight)
        nn.init.zeros_(m.bias)

model.apply(init_weights)
```

**Guidelines**:
- **ReLU/LeakyReLU** → Kaiming (He) initialization
- **Sigmoid/Tanh** → Xavier (Glorot) initialization
- **Transformers** → Use the model's built-in `_init_weights` method

---

## Anti-Patterns

### 1. Forgetting eval mode during inference

```python
# ❌ Wrong — dropout and batchnorm still active
output = model(test_input)

# ✅ Correct
model.eval()
with torch.no_grad():
    output = model(test_input)
model.train()  # restore training mode
```

### 2. In-place operations breaking autograd

```python
# ❌ Breaks gradient computation
x.add_(1)
x[:, 0] = 0

# ✅ Creates new tensor, preserves graph
x = x + 1
x = torch.cat([torch.zeros_like(x[:, :1]), x[:, 1:]], dim=1)
```

### 3. Repeated .cuda() calls

```python
# ❌ Redundant and hides device management
for batch in loader:
    x = batch['input'].cuda()
    y = batch['target'].cuda()

# ✅ Single device variable
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
for batch in loader:
    x = batch['input'].to(device)
    y = batch['target'].to(device)
```

### 4. Not zeroing gradients properly

```python
# ❌ Slower — sets grads to zero tensors
optimizer.zero_grad()

# ✅ Faster — sets grads to None (avoids memset)
optimizer.zero_grad(set_to_none=True)
```

### 5. Accumulating computation history

```python
# ❌ Keeps full computation graph in memory — OOM on long loops
total_loss = 0
for batch in loader:
    loss = model(batch)
    total_loss += loss  # loss carries the graph!

# ✅ Detach the scalar value
total_loss = 0
for batch in loader:
    loss = model(batch)
    total_loss += loss.item()  # .item() returns a Python float
```

---

## Quick Reference

| Task | Pattern |
|------|---------|
| Move to GPU | `x.to(device)` — never `.cuda()` |
| Inference | `model.eval()` + `torch.no_grad()` |
| Zero grads | `optimizer.zero_grad(set_to_none=True)` |
| Mixed precision | `autocast` + `GradScaler` |
| Save checkpoint | model + optimizer + scheduler + scaler + epoch + rng state |
| DataLoader | `pin_memory=True`, `persistent_workers=True` |
| Init weights | `model.apply(init_fn)` — Kaiming for ReLU |
| Logging scalars | `.item()` or `.detach()` — never raw tensors |

---

## NEVER

<HARD-GATE>
- **NEVER** hardcode `.cuda()` — use `.to(device)` with a device variable. Hardcoded CUDA calls break CPU-only environments, tests, and multi-GPU setups.
- **NEVER** save only `model.state_dict()` as a checkpoint — you lose optimizer momentum, scheduler state, and RNG state. Training cannot resume correctly from a model-only checkpoint.
- **NEVER** use in-place operations (`.add_()`, `.mul_()`, `x[:] = ...`) in differentiable code paths — they silently break autograd by modifying tensors that may be needed for gradient computation.
- **NEVER** log raw tensor values without `.item()` or `.detach()` — this keeps the full computation graph alive and causes memory leaks in training loops.
- **NEVER** skip `model.eval()` during inference — batch normalization and dropout behave differently in training vs eval mode, producing incorrect and non-deterministic results.
</HARD-GATE>
