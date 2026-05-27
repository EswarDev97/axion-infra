# aicodepath-fastapi-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When building FastAPI applications — enforces async patterns, Pydantic v2 models, dependency injection, and production deployment. Triggered by: `fastapi` in requirements, FastAPI imports, FastAPI questions.

## What It Does

- Enforces `async def` for all I/O-bound endpoints
- Implements Pydantic v2 models for all request/response schemas
- Wires dependency injection with `Annotated[type, Depends()]` (FastAPI 0.95+)
- Uses `lifespan` context manager (not deprecated `@app.on_event`)
- Configures Alembic migrations and `pydantic-settings` typed config
- Writes `httpx.AsyncClient` + `pytest-asyncio` async tests

## Key Standards

- `guidelines/python-rules.json` — type hints, PEP 8, Ruff
- `guidelines/api-design-rules.json` — REST conventions, versioning
- Pydantic v2 patterns exclusively (`.model_dump()`, not `.dict()`)

## Collaborates With

- `aicodepath-python-expert` — Python patterns and async best practices
- `aicodepath-api-designer` — API contract design and OpenAPI specs
- `aicodepath-database-architect` — SQLAlchemy 2.0 async ORM patterns
- `aicodepath-backend-architect` — Service architecture and deployment
