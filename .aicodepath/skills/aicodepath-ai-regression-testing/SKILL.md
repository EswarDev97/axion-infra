---
name: aicodepath-ai-regression-testing
description: Test AI-written code for systematic blind spots — 7 AI-specific regression patterns and sandbox testing.
user-invocable: true
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
argument-hint: "pattern check | sandbox test | blind spot audit"
---

# AI Regression Testing

Testing patterns for AI-written code. When one AI writes AND reviews code, systematic blind spots emerge — the same model makes the same mistakes and misses the same issues consistently.

**Key principle**: "Test where bugs WERE found" — AI makes the same mistakes repeatedly. Build test suites around past failures.

---

## The 7 AI Blind Spot Patterns

### Pattern 1: Sandbox/Production Path Mismatch

**The most common AI regression.** AI writes code that works in the dev sandbox but uses different paths, configs, or environment variables in production.

```python
# ❌ AI-generated — works in sandbox, fails in production
def get_config():
    return json.load(open('config.json'))  # relative path — works only from project root

# ✅ Production-safe
def get_config():
    config_path = os.environ.get('CONFIG_PATH', '/etc/app/config.json')
    return json.load(open(config_path))
```

**Regression test**:
```python
def test_config_does_not_use_relative_path_SANDBOX_42():
    """Named after bug: sandbox path mismatch, ticket #42"""
    with patch.dict(os.environ, {'CONFIG_PATH': '/tmp/test-config.json'}):
        with open('/tmp/test-config.json', 'w') as f:
            json.dump({'key': 'value'}, f)
        config = get_config()
        assert config['key'] == 'value'
```

---

### Pattern 2: SELECT Clause Omission

AI generates SQL that selects wrong columns or misses columns needed by downstream code.

```python
# ❌ AI-generated — misses the 'role' column needed by the authorization check
query = "SELECT id, name, email FROM users WHERE id = %s"
user = db.execute(query, (user_id,)).fetchone()
# Later: user['role']  → KeyError!

# ✅ Explicit column list matching downstream usage
query = "SELECT id, name, email, role FROM users WHERE id = %s"
```

**Regression test**:
```python
def test_user_query_includes_role_column_SELECT_87():
    """Named after bug: missing role column, ticket #87"""
    user = fetch_user(test_user_id)
    assert 'role' in user, "User query must include 'role' for authorization"
    assert user['role'] in ('admin', 'user', 'viewer')
```

---

### Pattern 3: Error State Leakage

AI catches errors but doesn't clean up state, leaving partial data that corrupts subsequent operations.

```python
# ❌ AI-generated — partial state survives on error
def process_order(order):
    db.insert('orders', order)           # step 1: inserted
    payment = charge_card(order.total)   # step 2: FAILS
    # order row exists with no payment record — corrupted state

# ✅ Transaction wrapping
def process_order(order):
    with db.transaction():
        db.insert('orders', order)
        payment = charge_card(order.total)
        db.insert('payments', payment)
        # all or nothing
```

**Regression test**:
```python
def test_failed_payment_does_not_leave_orphan_order_LEAK_103():
    """Named after bug: orphan orders after payment failure, ticket #103"""
    with pytest.raises(PaymentError):
        process_order(order_with_bad_card)

    orphans = db.execute("SELECT count(*) FROM orders WHERE id = %s", (order_id,))
    assert orphans[0] == 0, "Failed payment must not leave orphan order"
```

---

### Pattern 4: Optimistic Update Without Rollback

AI updates state optimistically but provides no rollback path when downstream steps fail.

```python
# ❌ AI-generated — inventory decremented but order may fail
def place_order(item_id, quantity):
    decrement_inventory(item_id, quantity)  # optimistic update
    try:
        order = create_order(item_id, quantity)  # may fail
    except OrderError:
        pass  # inventory already decremented!

# ✅ With rollback
def place_order(item_id, quantity):
    decrement_inventory(item_id, quantity)
    try:
        order = create_order(item_id, quantity)
    except OrderError:
        increment_inventory(item_id, quantity)  # explicit rollback
        raise
```

**Regression test**:
```python
def test_failed_order_restores_inventory_ROLLBACK_156():
    """Named after bug: inventory leak on order failure, ticket #156"""
    initial_stock = get_inventory(item_id)
    with pytest.raises(OrderError):
        place_order(item_id, 5)
    assert get_inventory(item_id) == initial_stock, "Inventory must be restored on failure"
```

---

### Pattern 5: Type Cast Masking Null

AI casts values in ways that convert null/undefined to unexpected strings instead of handling them.

```javascript
// ❌ AI-generated — String(null) returns "null", not empty string
function displayUserName(user) {
    return String(user.middleName);  // "null" if middleName is null
}

// ✅ Explicit null handling
function displayUserName(user) {
    return user.middleName ?? '';
}
```

```python
# ❌ Python equivalent — str(None) returns "None"
label = str(record.get('category'))  # "None" if missing

# ✅ Explicit handling
label = record.get('category') or 'uncategorized'
```

**Regression test**:
```javascript
test('displayUserName does not show literal null string CAST_201', () => {
    const user = { firstName: 'Alice', middleName: null, lastName: 'Smith' };
    const result = displayUserName(user);
    expect(result).not.toContain('null');
    expect(result).toBe('');
});
```

---

### Pattern 6: Off-by-One in Pagination

AI calculates page offsets incorrectly, especially mixing 0-based and 1-based indexing.

```python
# ❌ AI-generated — page 1 returns offset 1, skipping first record
def get_page(page_number, page_size=20):
    offset = page_number * page_size  # page 1 → offset 20, misses first 20!
    return db.query(f"SELECT * FROM items LIMIT {page_size} OFFSET {offset}")

# ✅ Correct — page 1 starts at offset 0
def get_page(page_number, page_size=20):
    offset = (page_number - 1) * page_size  # page 1 → offset 0
    return db.query(f"SELECT * FROM items LIMIT {page_size} OFFSET {offset}")
```

**Regression test**:
```python
def test_page_one_returns_first_records_PAGINATION_234():
    """Named after bug: first page skipped records, ticket #234"""
    # Insert 25 known records
    all_records = insert_test_records(25)

    page_1 = get_page(page_number=1, page_size=10)
    assert len(page_1) == 10
    assert page_1[0]['id'] == all_records[0]['id'], "Page 1 must start at first record"

    page_2 = get_page(page_number=2, page_size=10)
    assert page_2[0]['id'] == all_records[10]['id'], "Page 2 must start at 11th record"
```

---

### Pattern 7: Silent Catch-and-Continue

AI writes broad exception handlers that swallow critical errors, making failures invisible.

```python
# ❌ AI-generated — silently swallows ALL errors
def sync_user_data(user_id):
    try:
        data = fetch_from_api(user_id)
        update_local_db(data)
    except Exception:
        pass  # "handled"

# ✅ Specific exceptions, proper logging
def sync_user_data(user_id):
    try:
        data = fetch_from_api(user_id)
        update_local_db(data)
    except ConnectionError:
        logger.warning(f"API unreachable for user {user_id}, will retry")
        schedule_retry(user_id)
    except ValidationError as e:
        logger.error(f"Invalid data for user {user_id}: {e}")
        raise  # don't continue with bad data
```

**Regression test**:
```python
def test_sync_does_not_swallow_validation_errors_SILENT_267():
    """Named after bug: corrupt data from silenced validation, ticket #267"""
    with patch('module.fetch_from_api', side_effect=ValidationError("bad data")):
        with pytest.raises(ValidationError):
            sync_user_data(user_id)
```

---

## Sandbox-Mode Testing

Test in an environment that mirrors production constraints:

| Check | Sandbox Test |
|-------|-------------|
| File paths | Set `CWD` to a non-project directory; verify all paths are absolute or env-configured |
| Permissions | Run with restricted user; verify no root-only operations |
| Network | Block external calls; verify graceful handling |
| Env vars | Clear all env vars; verify defaults are safe |
| DB constraints | Enable all foreign keys, unique constraints, NOT NULL |

```bash
# Run tests with production-like constraints
env -i HOME=/tmp PATH=/usr/bin:/bin \
    DB_HOST=localhost DB_PORT=5432 \
    python -m pytest tests/ -v
```

---

## Regression Test Naming Convention

Name tests after the bug they catch. This creates institutional knowledge:

```
test_<what_it_does>_<BUG_ID>()
test_user_sync_does_not_leak_partial_state_GH_1234()
test_pagination_returns_first_page_correctly_JIRA_5678()
```

**Why**: When a regression test fails in CI, the name immediately tells you which historical bug is resurfacing and where to find the original investigation.

---

## Deterministic Judges Over LLM Judges

For regression tests, always prefer deterministic verification:

| Prefer | Over | Why |
|--------|------|-----|
| `assert result == expected` | LLM checking "is this correct?" | Deterministic, fast, free |
| `grep -c 'pattern' output.txt` | LLM summarizing output | Reproducible |
| `pytest exit code` | LLM reading test output | Binary pass/fail |
| JSON schema validation | LLM checking structure | Precise, documented |

LLM-as-judge is acceptable for subjective quality (prose, UX copy) but never for regression tests where the expected output is known.

---

## NEVER

<HARD-GATE>
- **NEVER** use LLM-as-judge for regression tests where the expected output is deterministic — LLM judges are non-deterministic and can have the exact same blind spots as the AI that wrote the code. Use grep, regex, pytest assertions instead.
- **NEVER** name regression tests generically (`test_sync_works`) — name them after the bug they catch (`test_sync_does_not_leak_state_GH_1234`). Generic names lose the institutional knowledge of what failure they guard against.
- **NEVER** use `except Exception: pass` in AI-generated code without reviewing which exceptions are actually expected — this is the #1 AI blind spot. Require specific exception types and explicit handling for each.
- **NEVER** trust AI code that works in sandbox without verifying production path behavior — sandbox/production mismatch is the most common AI regression pattern. Test with production-like constraints (env vars, permissions, network restrictions).
- **NEVER** assume AI won't make the same mistake twice — it will. Build regression test suites around past failures and run them on every change.
</HARD-GATE>
