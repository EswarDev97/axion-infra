---
name: aicodepath-error-recovery
pack: quality
model: sonnet
---

## When to Use

When an implementation hits a repeated or semantically complex error — performs semantic diagnosis beyond surface-level error messages to find root cause and apply self-healing. Triggered after GICL score regression, 3+ identical errors, or when "it keeps failing" with the same message. Includes PyTorch/ML runtime error patterns.

## Triggers

`it keeps failing`, `same error again`, `GICL regression`, `repeated error`, `semantic error`, `root cause`, `CUDA error`, `tensor shape`, `RuntimeError torch`, `gradient`, `DataLoader`, `PyTorch error`

## Key Capabilities

- Classify surface errors (TypeError, AssertionError, ECONNREFUSED) into semantic root causes (timing, wrong contract, missing init, environment mismatch)
- Check `reflexion-learner.findSimilar()` before diagnosis — apply prior resolutions directly if found
- Trace bad values backwards from the throw site to origin; produce 3-line trace: location → source → contract failure
- Apply minimal fix at the contract violation point only — no refactoring or scope creep
- Record every resolution in `reflexion-learner.js` to prevent re-investigation in future sessions
- PyTorch/ML error table: tensor shape mismatches, CUDA OOM, gradient/detach errors, DataLoader collation issues, cuDNN incompatibility

## Domain Keywords

`semantic-error`, `repeated-error`, `gicl-regression`, `pytorch-error`, `cuda-error`, `tensor-shape`

## Collaborates With

- `aicodepath-ci-fixer` — Build and compilation error handoff
- `aicodepath-code-reviewer` — Error pattern review in changed code
- `aicodepath-test-engineer` — Regression test creation for fixes
