---
name: aicodepath-benchmark
description: Measure performance — 4 modes: Lighthouse, API latency, build time, before-after. Outputs comparison table.
user-invocable: true
allowed-tools: [Bash, Read, Glob]
argument-hint: "page | api | build | before-after"
---

# AICodePath Benchmark

Structured performance measurement for 4 contexts: page load, API latency, build time, and before/after change comparison. Every run produces a standard output table for tracking regressions.

---

## Mode 1: Page Performance (Lighthouse / CWV)

**Trigger**: "benchmark this page", "check Core Web Vitals", "page speed"

### Tools

| Stack | Command |
|-------|---------|
| Lighthouse CLI | `npx lighthouse <url> --output=json --quiet` |
| Playwright | `page.goto(url); await page.evaluate(() => performance.timing)` |
| WebPageTest | Use `mcp__playwright__browser_navigate` + `browser_console_messages` |

### Metrics to capture

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP (Largest Contentful Paint) | ≤2.5s | 2.5–4.0s | >4.0s |
| FID / INP (Interaction to Next Paint) | ≤200ms | 200–500ms | >500ms |
| CLS (Cumulative Layout Shift) | ≤0.1 | 0.1–0.25 | >0.25 |
| TTFB (Time to First Byte) | ≤800ms | 800–1800ms | >1800ms |

### Run 3 times and take the median. Single runs are noisy.

---

## Mode 2: API Latency / Throughput

**Trigger**: "benchmark API", "measure endpoint latency", "load test"

### Tools

| Tool | Command | Use for |
|------|---------|---------|
| `wrk` | `wrk -t4 -c100 -d30s http://localhost:3000/api/users` | Throughput (req/s) |
| `hey` | `hey -n 1000 -c 50 http://localhost:3000/api/users` | p50/p95/p99 latency |
| `ab` | `ab -n 1000 -c 50 http://localhost:3000/api/users` | Quick baseline |
| Bash `time` | `time curl -s http://localhost:3000/api/users > /dev/null` | Single request latency |

### Metrics to capture

```
p50 latency  (median — typical user)
p95 latency  (95th percentile — most users)
p99 latency  (worst 1%)
Throughput   (req/s)
Error rate   (%)
```

---

## Mode 3: Build Time

**Trigger**: "how long does the build take", "benchmark build", "slow CI"

```bash
# TypeScript/Node
time npx tsc --noEmit
time npm run build

# Python
time python -m pytest --collect-only -q

# Go
time go build ./...

# Rust
time cargo build --release

# Java/Kotlin
time ./gradlew build
```

Capture: real time, user time, sys time. Run 3 times; report median.

---

## Mode 4: Before-After Comparison

**Trigger**: "compare performance before and after", "did my change help"

### Protocol

1. **Baseline** — run benchmark on `main` branch (or current state), record results
2. **Apply change** — switch to feature branch / apply optimization
3. **After** — run identical benchmark, record results
4. **Compare** — compute delta and verdict

---

## Standard Output Table

Every benchmark run produces this table:

```markdown
## Benchmark Results — <date>

**Target**: <URL / endpoint / command>
**Mode**: page | api | build | before-after
**Runs**: 3 (median reported)

| Metric | Before | After | Delta | Verdict |
|--------|--------|-------|-------|---------|
| LCP | 3.2s | 1.8s | -1.4s (-44%) | ✅ Pass |
| TTFB | 820ms | 340ms | -480ms (-59%) | ✅ Pass |
| Build time | 45s | 31s | -14s (-31%) | ✅ Pass |
| p95 latency | 180ms | 95ms | -85ms (-47%) | ✅ Pass |
| Throughput | 420 req/s | 610 req/s | +190 (+45%) | ✅ Pass |

**Summary**: All metrics improved. Change is safe to merge.
```

### Verdict thresholds

| Verdict | Condition |
|---------|-----------|
| ✅ Pass | Improvement ≥5%, or regression <2% |
| ⚠️ Warn | Regression 2–10% |
| ❌ Fail | Regression >10% |

---

## Baseline Storage

Write baseline to `aicodepath-docs/benchmarks/<target>-baseline.md` after first measurement.
Compare future runs against this file to detect regressions across sessions.

```bash
mkdir -p aicodepath-docs/benchmarks
# Write baseline after first run
```

---

## Integration

- Run before and after performance-sensitive changes
- Gate PRs with `❌ Fail` verdict — do not merge performance regressions without discussion
- Use `/aicodepath-web-quality` for a broader web quality audit (a11y, SEO, best practices + CWV)
