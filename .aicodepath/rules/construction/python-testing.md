# Python Testing

Reference guide for testing Python code with pytest.

## Fixtures

Define reusable setup in `conftest.py`; use function scope by default:

```python
# conftest.py
import pytest

@pytest.fixture
def sample_user():
    return {"id": 1, "name": "Alice", "email": "alice@example.com"}
```

## Parametrize

Use `@pytest.mark.parametrize` to avoid test duplication:

```python
@pytest.mark.parametrize("input,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("", ""),
])
def test_upper(input, expected):
    assert input.upper() == expected
```

## Mocking

Use `unittest.mock.patch` or `pytest-mock`'s `mocker` fixture:

```python
def test_send_email(mocker):
    mock_send = mocker.patch("myapp.mail.smtp_send")
    send_welcome_email("alice@example.com")
    mock_send.assert_called_once_with(to="alice@example.com", subject="Welcome")
```

## conftest Layout

Place fixtures in `conftest.py` at the nearest ancestor; root-level for global fixtures.
Never import from test files — use fixtures to share state.

## pytest-cov Coverage

```bash
pytest --cov=src --cov-report=term-missing --cov-fail-under=80
```

## Async Tests

```python
import pytest

@pytest.mark.asyncio
async def test_fetch_profile(httpx_mock):
    httpx_mock.add_response(json={"id": 1})
    result = await fetch_profile("1")
    assert result["id"] == 1
```
