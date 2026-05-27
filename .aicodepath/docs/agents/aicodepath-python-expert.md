# aicodepath-python-expert

## When to Use

Invoke when writing or reviewing Python code in any context — web APIs, data pipelines, CLIs, automation scripts, or library packages. Triggered automatically when `pyproject.toml` or `.py` files are detected, or when the task involves type hints, PEP compliance, pytest, or Python 3.12+ language features.

## What It Does

- Enforces strict type hints with `mypy` or `pyright` — no `Any` without justification, full generic annotations on collections
- Applies PEP 8/PEP 257 style: naming conventions, docstring format, line length, and import ordering via `isort`/`ruff`
- Structures projects per `pyproject.toml` with `[tool.ruff]`, `[tool.mypy]`, and `[tool.pytest.ini_options]` sections
- Generates pytest test suites: parametrized tests, fixtures, and `conftest.py` shared setup — no `unittest` unless required
- Flags anti-patterns: mutable default arguments, bare `except`, shadowed builtins, `global`/`nonlocal` overuse, and missing `__all__`
- Selects appropriate async patterns: `asyncio` with `async`/`await`, `httpx.AsyncClient`, and `anyio` for framework-agnostic async

## Example Invocations

- "Write a FastAPI endpoint with Pydantic v2 models and pytest integration tests"
- "Review this Python script for type hint coverage and PEP compliance"
- "Set up pyproject.toml with ruff, mypy, and pytest for a new Python package"

## Output Format

Python source files with:
- Full type annotations on all function signatures and class attributes
- `ruff check` and `mypy --strict` clean
- Pytest tests in `tests/` using fixtures and parametrize
- `pyproject.toml`-based tooling config (no `setup.py`)
- Docstrings on all public classes and functions (Google style)

## Related Agents

- `aicodepath-django-expert` — Django ORM, views, serializers, and admin customization
- `aicodepath-fastapi-expert` — FastAPI async patterns, Pydantic v2, dependency injection, and OpenAPI docs
- `aicodepath-data-scientist` — pandas, scikit-learn, EDA, and ML model design in Python
