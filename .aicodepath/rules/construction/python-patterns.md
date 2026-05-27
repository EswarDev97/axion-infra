# Python Patterns

Reference guide for idiomatic Python patterns used in construction-phase development.

## PEP 8 Essentials

- 4-space indentation, snake_case for variables/functions, PascalCase for classes
- Max line length 88 (Black default) or 79 (PEP 8 strict)
- Two blank lines between top-level definitions; one inside a class

## Type Hints

Annotate public function signatures; use `from __future__ import annotations` for forward refs:

```python
from typing import Optional

def find_user(user_id: int, active_only: bool = True) -> Optional[User]:
    ...
```

## Async / Await

Use `async def` for I/O-bound operations; never block the event loop:

```python
async def fetch_profile(user_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/users/{user_id}")
        response.raise_for_status()
        return response.json()
```

## Context Managers

Prefer `with` for resource lifecycle (files, DB connections, locks):

```python
with open("data.csv", "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)
```

## Dataclasses

Use `@dataclass` for value objects; `frozen=True` for immutable records:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: int  # cents
    currency: str = "USD"
```

## Protocol (Structural Typing)

Use `Protocol` for duck-typed interfaces without forcing inheritance:

```python
from typing import Protocol

class Readable(Protocol):
    def read(self, n: int = -1) -> bytes: ...
```
