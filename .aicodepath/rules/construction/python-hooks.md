# Python Hook Automation

Per-file post-edit quality checks for Python files.

## Commands

| Tool | Command | Purpose |
|------|---------|---------|
| Format | `ruff format .` | Fast Black-compatible formatter |
| Type check | `mypy src/` | Static type verification |
| Lint | `ruff check .` | Fast flake8/pylint replacement |

## CI Mode

```bash
ruff format --check .    # format check without modifying
ruff check .             # lint errors fail CI
mypy src/ --strict       # strict type checking
```

## ruff Configuration (pyproject.toml)

```toml
[tool.ruff]
line-length = 88
select = ["E", "F", "W", "I", "N", "UP"]

[tool.mypy]
strict = true
ignore_missing_imports = true
```

## Pre-commit Integration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.0
    hooks:
      - id: ruff
      - id: ruff-format
```
