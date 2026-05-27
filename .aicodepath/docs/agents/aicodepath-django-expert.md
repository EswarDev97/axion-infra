# aicodepath-django-expert

**Pack**: lang | **Model**: sonnet | **Phase**: construction

## When to Use

When writing Django code — enforces Django 4+ async views, ORM optimization, DRF patterns, and security best practices. Triggered by: `manage.py` or `django` in requirements, Django questions.

## What It Does

- Enforces zero N+1 queries via `select_related`/`prefetch_related` + `assertNumQueries`
- Implements async views (`async def`) for ASGI deployments
- Validates all API input through DRF serializers
- Enforces custom User model, database indexes, secrets via env vars
- Runs `python manage.py check --deploy` before any release
- Writes pytest-django tests with factory_boy fixtures

## Key Standards

- `guidelines/python-rules.json` — PEP 8, type hints, Ruff
- `guidelines/security-rules.json` — Django security checklist
- `django-upgrade` for LTS migration compatibility

## Collaborates With

- `aicodepath-python-expert` — Python patterns and type hints
- `aicodepath-database-architect` — Schema design and migrations
- `aicodepath-backend-architect` — Service architecture
- `aicodepath-security-engineer` — Security hardening
