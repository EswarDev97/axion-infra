---
name: aicodepath-webapp-testing
description: >
  Use when testing, verifying, or debugging a running web application in the browser.
  Navigates pages, clicks elements, fills forms, captures screenshots, and checks
  console output using Playwright MCP tools (primary) or Python Playwright scripts (fallback).
  Trigger on: "test the UI", "verify this page works", "click the button", "check the form",
  "take a screenshot", "browser test", "playwright", "check console logs", "test the webapp",
  "verify frontend behavior", "automate the browser", "does the login work".
  Make sure to invoke this skill whenever the user wants to verify behavior in a live browser,
  even if they don't use the word "test".
user-invocable: true
allowed-tools: Bash, Read, Write, Glob, mcp__playwright__browser_navigate, mcp__playwright__browser_click, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_fill_form, mcp__playwright__browser_console_messages, mcp__playwright__browser_evaluate, mcp__playwright__browser_wait_for, mcp__playwright__browser_type, mcp__playwright__browser_press_key, mcp__playwright__browser_select_option, mcp__playwright__browser_hover, mcp__playwright__browser_drag, mcp__playwright__browser_network_requests
argument-hint: "<URL or description of what to test>"
---

# Web Application Testing

Functional browser testing for running web apps — verify behavior, capture evidence, debug UI issues.

> For static code-level quality audits (Lighthouse, Core Web Vitals, a11y, SEO), use `/aicodepath-web-quality` on the same app.

---

## Before You Start: Define Success

Before the first click, answer this question: **What would prove this works?**

Write down the expected outcome as a specific, observable change — "the cart count changes from 0 to 1", "the success banner appears", "no console errors fire". This is your assertion. Without it, you're exploring, not verifying.

Also ask: **Is this a fresh verification or a continuation?**
- Fresh → re-navigate to the starting URL to reset browser state (cookies, localStorage, JS globals carry over between tests)
- Continuation → confirm you're in the expected state before acting

**Who is the user in this test — anonymous visitor or authenticated user?** If authenticated, establish that state explicitly (log in first, or confirm prior login succeeded) before navigating to the page under test. Never assume an existing session is valid.

Treat each test as starting in a new incognito window. If you wouldn't assume a logged-in user, don't assume leftover page state either.

---

## Decision Tree

```
User task → Is the app already running?
    ├─ No → Start the server first (see Server Lifecycle below)
    └─ Yes → Is it static HTML (local file)?
        ├─ Yes (MCP path) → Serve via HTTP first:
        │                    python3 -m http.server <port> --directory <dir> &
        │                    Then navigate to http://localhost:<port>/<file>
        │                    (MCP blocks file:// — only http/https/data allowed)
        ├─ Yes (Python fallback) → file:// URLs work natively, no server needed
        └─ No (dynamic webapp) → MCP Playwright available?
            ├─ Yes (default) → Reconnaissance-Then-Action via MCP tools ↓
            └─ No → Python Playwright fallback ↓
```

---

## MCP Playwright Workflow (Primary)

### Step 1 — Navigate & Wait
```
browser_navigate  → the URL
browser_wait_for  → "networkidle"
```
Wait for `networkidle` before inspecting the DOM — it signals no in-flight requests, so the JS framework has finished its initial render. If networkidle times out (app has background polling), fall back: `browser_wait_for` on a specific element instead. See When Stuck.

### Step 2 — Reconnaissance
Before acting, always understand the page state:
```
browser_snapshot          → DOM structure + accessible element tree
browser_take_screenshot   → visual reference (save relative filename, e.g. before.png)
browser_console_messages  → capture JS errors/warnings before interacting
```
Snapshot before you act. If the snapshot shows a loading spinner or empty container, wait longer — the app hasn't finished rendering.

### Step 3 — Identify Selectors
From the snapshot, identify target elements. Prefer in this order:
1. `role=` + accessible name — most resilient to UI changes
2. `text=` visible text
3. `id=` or CSS selector — last resort

### Step 4 — Execute Actions
```
browser_click          → buttons, links, checkboxes
browser_fill_form      → fill multiple form fields at once
browser_type           → single input field
browser_press_key      → Enter, Tab, Escape, arrow keys
browser_select_option  → dropdowns
browser_hover          → hover states, tooltips
browser_drag           → drag-and-drop interactions
```

### Step 5 — Assert Against Your Pre-Stated Success Condition
After each action, verify the result matches what you defined in "Before You Start":
```
browser_snapshot          → confirm DOM changed as expected
browser_take_screenshot   → visual proof (filename relative to .playwright-mcp/)
browser_console_messages  → check for new JS errors after interaction
browser_network_requests  → verify API calls were made (if needed)
```

To save a screenshot to a specific path:
```bash
# MCP writes to .playwright-mcp/<filename>.png
cp .playwright-mcp/screenshot.png /path/to/outputs/screenshot.png
```

---

## NEVER

**NEVER navigate to a `file://` URL with MCP Playwright** — MCP blocks the protocol entirely (only http/https/data allowed). The tool call silently fails or errors. Serve static HTML via `python3 -m http.server` first.

**NEVER pass an absolute path to `browser_take_screenshot`** — MCP restricts all screenshot writes to `.playwright-mcp/`. Absolute paths are silently rejected. Always use a relative filename, then copy with bash:
```bash
cp .playwright-mcp/before.png /your/target/path/before.png
```

**NEVER inspect the DOM immediately after `browser_navigate`** — React/Vue/Svelte update the DOM asynchronously after load. Skipping `browser_wait_for "networkidle"` returns stale or empty results, making valid selectors appear missing.

**NEVER reuse browser state between unrelated tests** — cookies, localStorage, and JS globals persist across MCP tool calls in the same session. A failed login attempt from test A can surface as `[WARNING] Login failed` in test B's console output, corrupting your evidence. Re-navigate to reset.

**NEVER act on a selector from a stale snapshot** — after navigation or a route change, the DOM is rebuilt. Selectors that existed before may point to detached nodes. Always re-snapshot after navigation.

**NEVER skip the console check before acting** — errors often surface silently. A background JS exception from a failed API call won't break the visible UI but will appear in console output. Capturing it before you interact separates pre-existing errors from errors your action caused.

---

## Server Lifecycle

### Server already running
Skip this section — proceed to the decision tree.

### Serve a static HTML file (MCP path)
MCP Playwright blocks `file://` — serve local files over HTTP instead:
```bash
python3 -m http.server 8765 --directory /path/to/dir &
# Navigate to: http://localhost:8765/your-file.html
```

### Managed lifecycle with with_server.py (Python fallback path)
Use the bundled helper when you need programmatic server management:
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_test.py
```

Multiple servers (e.g. backend + frontend):
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_test.py
```

The helper starts each server, polls the port until ready, runs your command, then cleans up. **Do not read the source unless absolutely necessary** — it pollutes the context window.

---

## Python Fallback

Use when MCP Playwright tools are unavailable. Supports `file://` URLs natively — no HTTP server needed for static HTML.

```bash
pip install playwright && playwright install chromium
```

Use the bundled examples as black-box starting points:

| File | Use when |
|------|----------|
| `examples/element_discovery.py` | Enumerate buttons, links, inputs on a page |
| `examples/console_logging.py` | Capture JS console output during interaction |
| `examples/static_html_automation.py` | Test a local HTML file via `file://` URL |

Run `--help` first. Do not read source unless you need to adapt the script.

---

## When Stuck

| Problem | Solution |
|---------|----------|
| `browser_wait_for "networkidle"` times out | App has background polling — use `browser_wait_for "domcontentloaded"` or wait for a specific element to appear instead |
| Selector not found after navigation | Re-snapshot — the DOM rebuilt; your old selector reference is stale |
| Screenshot appears blank | Page hasn't rendered — increase wait or check console for JS errors blocking render |
| Console shows errors from previous test | Browser state bleed — re-navigate to starting URL before asserting |
| MCP tool call silently does nothing | Check URL protocol — MCP blocks `file://`; serve via HTTP |
