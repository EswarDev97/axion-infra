---
name: aicodepath-web-quality
description: >
  Use when auditing or improving web quality across any of these dimensions:
  performance, Core Web Vitals (LCP/INP/CLS), accessibility (WCAG 2.2), SEO,
  security/best-practices, or a full multi-dimension audit.
  Trigger on: "audit my site", "web quality", "quality review",
  "optimize performance", "fix LCP", "fix CLS", "fix INP", "Core Web Vitals",
  "a11y audit", "WCAG", "improve accessibility", "improve SEO", "fix meta tags",
  "structured data", "apply best practices", "security headers", "Lighthouse score".
  Make sure to invoke this skill whenever the user asks about web performance,
  accessibility compliance, or Lighthouse scores — even if they don't use those exact words.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, WebFetch, WebSearch, mcp__plugin_context7_context7__query-docs
argument-hint: "[dimension] [file or URL]  e.g. performance index.html, full-audit, a11y"
---

# Web Quality Skill

Comprehensive web quality review across 6 dimensions, encoding best practices from
150+ Lighthouse audits, WCAG 2.2, and Core Web Vitals guidance.

---

## Step 1 — Triage

Identify which dimension(s) to run based on the user's request:

| User says | Dimension |
|-----------|-----------|
| "audit", "quality review", "full audit", no qualifier | **Audit** (all dimensions) |
| "performance", "slow", "bundle size", "load time" | **Performance** |
| "LCP", "CLS", "INP", "Core Web Vitals", "CWV" | **Core Web Vitals** |
| "a11y", "accessibility", "WCAG", "screen reader" | **Accessibility** |
| "SEO", "search ranking", "meta tags", "structured data" | **SEO** |
| "best practices", "security", "CSP", "headers", "modernize" | **Best Practices** |

Read the relevant files to find the code being reviewed. If a URL is provided, use WebFetch.

---

## Step 2 — Run the Selected Dimension(s)

### Performance
**Budgets**: JS < 300 KB · CSS < 100 KB · Images < 500 KB · Total page < 1.5 MB
**Targets**: LCP < 2.5s · FCP < 1.8s · Speed Index < 3.4s

Check for:
- [ ] Images: AVIF/WebP format, `<picture>` with `srcset`, `loading="lazy"` on below-fold images, explicit `width`/`height`
- [ ] Fonts: `font-display: swap`, `<link rel="preconnect">` to font origins, variable fonts where possible
- [ ] JS: code splitting / dynamic `import()`, tree-shaking, no synchronous render-blocking scripts
- [ ] CSS: critical CSS inlined, non-critical loaded asynchronously, unused rules removed
- [ ] Third-party scripts: load with facades or lazy-load on interaction (`IntersectionObserver`)
- [ ] Runtime: no forced reflows in loops, `debounce`/`throttle` on scroll/resize, `requestAnimationFrame` for animations
- [ ] Caching: `Cache-Control` headers set, service worker for repeat visits

For detailed patterns, read `references/performance.md`.

---

### Core Web Vitals
**Targets**: LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1

**LCP** — Largest Contentful Paint:
- [ ] Hero image has `<link rel="preload" as="image">` in `<head>`
- [ ] Critical CSS for above-fold content is inlined
- [ ] Server/CDN response time (TTFB) < 800ms — use CDN + edge caching
- [ ] No render-blocking resources delaying first paint

**INP** — Interaction to Next Paint:
- [ ] No long tasks (> 50ms) on the main thread during interactions
- [ ] Event handlers are debounced; heavy work moved to Web Workers
- [ ] React: use `React.memo`, `useMemo`, `useCallback` to prevent unnecessary re-renders
- [ ] `scheduler.postTask()` or `requestIdleCallback` for non-urgent work

**CLS** — Cumulative Layout Shift:
- [ ] All `<img>` and `<video>` have explicit `width` and `height` attributes
- [ ] Space reserved for ads/iframes with `min-height` or `aspect-ratio`
- [ ] No content injected above the viewport after load
- [ ] Animations use `transform` and `opacity` only (no `top`/`left`/`width`/`height`)
- [ ] Font fallback metrics match web font to avoid FOUT shifts (`size-adjust`, `ascent-override`)

Framework-specific patterns: `next/image` (Next.js), `nuxt/image` (Nuxt), `<Image>` (Astro).
For deeper patterns, read `references/core-web-vitals.md`.

---

### Accessibility (WCAG 2.2)
**Target**: Lighthouse Accessibility = 100

**Perceivable**:
- [ ] All meaningful images have descriptive `alt`; decorative images use `alt=""`
- [ ] Color contrast ≥ 4.5:1 (normal text), ≥ 3:1 (large text / UI components)
- [ ] Videos have captions; audio has transcripts

**Operable**:
- [ ] All interactive elements reachable and usable by keyboard alone
- [ ] Focus visible via `:focus-visible` (never `outline: none` without replacement)
- [ ] Skip link at page top: `<a href="#main">Skip to main content</a>`
- [ ] Touch targets ≥ 24×24px minimum (44×44px recommended for mobile)
- [ ] No keyboard traps in modals (implement focus trap + `Escape` to close)

**Understandable**:
- [ ] `<html lang="en">` (or correct BCP 47 tag)
- [ ] Every form input has an explicit `<label for="...">` or `aria-label`
- [ ] Errors are identified in text and suggest a fix (`aria-describedby` linking to error message)
- [ ] `autocomplete` attributes on personal data fields

**Robust**:
- [ ] Valid semantic HTML5 (headings in order, lists for list content, `<button>` not `<div>`)
- [ ] Prefer native HTML over ARIA when possible
- [ ] Custom widgets implement full ARIA pattern (name + role + value)

**WCAG 2.2 additions** (commonly missed):
- [ ] 2.4.11 Focus Not Obscured — sticky headers use `scroll-margin-top` on targets
- [ ] 2.5.7 Dragging Movements — offer click/tap alternative to any drag interaction
- [ ] 2.5.8 Target Size — 24×24px minimum (CSS `min-width`/`min-height`)
- [ ] 3.3.7 Redundant Entry — don't ask for same data twice in same session
- [ ] 3.3.8 Accessible Authentication — no cognitive tests (CAPTCHA) without alternatives

For copy-paste code patterns (modal, skip links, ARIA tabs, live regions), read `references/accessibility.md`.

---

### SEO
**Target**: Lighthouse SEO ≥ 95

**Technical**:
- [ ] `robots.txt` present and allows desired crawling
- [ ] `<link rel="canonical">` on every page
- [ ] XML sitemap at `/sitemap.xml` with `<lastmod>`, ≤ 50,000 URLs
- [ ] HTTPS everywhere; no mixed content

**On-page**:
- [ ] `<title>` 50–60 chars, primary keyword first, unique per page
- [ ] `<meta name="description">` 150–160 chars, compelling, unique per page
- [ ] Single `<h1>`, logical `h2`→`h3`→... hierarchy
- [ ] Links have descriptive text (no "click here")
- [ ] Images have descriptive filenames and `alt` text

**Structured Data (JSON-LD)**:
- [ ] Organization / WebSite on homepage
- [ ] Article / BlogPosting on articles
- [ ] Product + Review on product pages
- [ ] FAQPage for FAQ sections
- [ ] BreadcrumbList for navigation trail

**Mobile**:
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Base font ≥ 16px; tap targets ≥ 48px
- [ ] No horizontal scrolling on mobile

**International**: `<link rel="alternate" hreflang="...">` for multi-language sites.

For URL structure rules and full sitemap template, read `references/seo.md`.

---

### Best Practices (Security + Code Quality)
**Target**: Lighthouse Best Practices ≥ 95

**Security (Critical)**:
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] `Content-Security-Policy` with nonces for inline scripts (no `unsafe-inline`)
- [ ] `X-Frame-Options: DENY` (or `SAMEORIGIN`)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] No `innerHTML` with user data — use `textContent` or DOMPurify
- [ ] Cookies: `Secure; HttpOnly; SameSite=Strict`
- [ ] `npm audit` clean (no high/critical vulnerabilities)

**Browser Compatibility**:
- [ ] HTML5 doctype, UTF-8 charset first in `<head>`, viewport meta present
- [ ] Feature detection with `if ('feature' in navigator)` or `@supports` — not UA sniffing
- [ ] Passive event listeners: `addEventListener('scroll', fn, { passive: true })`

**Deprecated patterns to remove**:
- `document.write()` → DOM API
- Synchronous XHR → `fetch()` / `async/await`
- Application Cache → Service Worker
- Non-passive scroll/touch listeners

**Code Quality**:
- [ ] No `console.error` / `console.warn` in production builds
- [ ] Source maps not exposed publicly (`//# sourceMappingURL` removed from prod)
- [ ] Event delegation for dynamic lists (one listener on parent, not per-item)
- [ ] Proper cleanup: `removeEventListener` or `AbortController` on unmount

For security header configuration examples, read `references/best-practices.md`.

---

> For functional browser testing of a running app (clicking elements, verifying forms, checking console output), use `/aicodepath-webapp-testing`.

---

## Step 3 — Full Audit Mode

When running all dimensions, produce a **severity-ranked report**:

```
## Web Quality Audit Report

### Critical (fix before deploy)
- [issue] — [file:line or element] — [fix]

### High (significant user impact)
- ...

### Medium (notable but not blocking)
- ...

### Low (polish improvements)
- ...

### Lighthouse Score Targets
| Category       | Target | Status |
|----------------|--------|--------|
| Performance    | ≥ 90   | ...    |
| Accessibility  | 100    | ...    |
| Best Practices | ≥ 95   | ...    |
| SEO            | ≥ 95   | ...    |

### Pre-Deploy Checklist
- [ ] All Critical issues resolved
- [ ] All High issues resolved or documented with timeline
- [ ] Lighthouse run in private/incognito window (no extensions)
- [ ] Tested on real mobile device or throttled DevTools
- [ ] Verified with screen reader (NVDA/VoiceOver)
```

---

## Hard Gate

<HARD-GATE>
Do NOT report "passing", "no issues found", or claim a score is met without:
1. Reading the actual code (or fetching the URL)
2. Showing specific evidence — code snippets, file:line references, or tool output
3. Every checklist item backed by what you found, not what you assumed
</HARD-GATE>

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/performance.md` | Detailed perf patterns, service worker strategies, bundle analysis |
| `references/core-web-vitals.md` | LCP/INP/CLS deep-dive, framework-specific patterns |
| `references/accessibility.md` | WCAG 2.2 quick ref, copy-paste ARIA patterns, testing tools |
| `references/seo.md` | JSON-LD templates, sitemap XML, URL rules |
| `references/best-practices.md` | CSP nonce setup, security header configs, cookie patterns |
