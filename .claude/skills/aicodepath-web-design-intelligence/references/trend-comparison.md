# Trend Style Comparison — 5 Major 2020s Trends

Side-by-side comparison of the five style trends most commonly requested by users, grounded
in `styles.csv` source rows and cross-checked against two external design trend articles.

| | Glassmorphism | Neumorphism | Neubrutalism | Claymorphism | Skeuomorphism (Modern) |
|---|---|---|---|---|---|
| **`styles.csv` row** | 3 | 2 | 38 | 9 | 13 |
| **Era** | 2020s Modern | 2020s Modern | 2020s Modern | 2020s Modern | 2007–2012 iOS (modernized) |
| **Mood** | Soft & Dimensional | Soft & Dimensional | Bold & Raw | Playful & Fun | Tactile & Realistic |
| **Defining element** | Backdrop blur + transparency | Dual light/dark shadows on flat surface | Hard borders + hard shadows + saturated color | Inflated 3D + inner/outer shadows + pastels | Layered shadows + textures + material metaphors |
| **Core CSS (source)** | `backdrop-filter: blur(15px); background: rgba(255,255,255,0.15)` | `box-shadow: -5px -5px 15px, 5px 5px 15px` (dual) | `border: 3px solid black; box-shadow: 5px 5px 0 black` | `border: 3-4px solid; box-shadow: inset -2px -2px 8px, 4px 4px 8px` | `background: complex gradient (8-12 stops); box-shadow: realistic multi-layer` |
| **Border radius (source)** | 16px | 12-16px | **0px** (never round) | 16-24px | 8-16px (refined, never hard) |
| **Primary colors (source)** | Translucent white `rgba(255,255,255,0.1-0.3)` | Soft pastels: `#C8E0F4`, `#F5E0E8`, `#E8E8E8` | `#FFEB3B` yellow, `#FF5252` red, `#2196F3` blue, `#000000` borders | Pastel: `#FDBCB4` peach, `#ADD8E6` baby blue, `#98FF98` mint, `#E6E6FA` lilac | Rich realistic: wood, leather, metal + warm `#f5f0e8` paper |
| **Light mode (source)** | ✓ Full | ✓ Full | ✓ Full | ✓ Full | ◐ Partial |
| **Dark mode (source)** | ✓ Full | ◐ Partial | ✓ Full | ◐ Partial | ◐ Partial |
| **Performance (source)** | ⚠ Good (backdrop-filter heavy) | ⚡ Good | ⚡ Excellent | ⚡ Good | ❌ Poor (textures + multi-layer) |
| **Accessibility (source)** | ⚠ Must ensure 4.5:1 | ⚠ Low contrast naturally | ✓ WCAG AAA (high contrast by default) | ⚠ Must ensure 4.5:1 | ⚠ Textures reduce readability |
| **Complexity (source)** | Medium | Medium | **Low** | Medium | **High** |
| **Framework score (source)** | Tailwind 9/10, MUI 8/10 | Tailwind 8/10, CSS-in-JS 9/10 | Tailwind 10/10, Bootstrap 8/10 | Tailwind 9/10, CSS-in-JS 9/10 | CSS-in-JS 7/10, Custom 8/10 |
| **Best for (source)** | Modern SaaS, financial dashboards, high-end corporate, lifestyle apps, modal overlays | Health/wellness apps, meditation platforms, fitness trackers, minimal interaction UIs | Gen Z brands, startups, creative agencies, Figma-style apps, Notion-style, tech blogs | Educational apps, children's apps, SaaS platforms, creative tools, fun-focused, onboarding | Legacy apps, gaming, immersive storytelling, premium products, luxury, realistic simulations, education |
| **Avoid for (source)** | Low-contrast backgrounds, critical accessibility, performance-limited | Complex apps, data-heavy dashboards, critical accessibility, high-contrast required | Luxury brands, finance, healthcare, conservative industries | Formal corporate, professional services, data-critical, serious/medical, legal, finance | Modern enterprise, critical accessibility, low-performance, web (use Flat/Modern) |

---

## Cross-Check Against External Trend Articles

Two external 2025 design trend articles were consulted during research:

1. **cccreative.design blog** — "Neumorphism, Glassmorphism, Neubrutalism differences"
2. **Medium Design Bootcamp** — "Glassmorphism vs Claymorphism vs Skeuomorphism 2025"

**Findings that match `styles.csv`:**
- All three trends (Neumorphism/Glassmorphism/Neubrutalism) covered by cccreative match
  source descriptions exactly: soft shadows for Neumorphism, frosted glass for Glassmorphism,
  bold borders for Neubrutalism.
- Medium article on Claymorphism confirms "soft inflated shapes, dual shadows, pastel colors,
  extensively rounded corners" — matches `styles.csv` row 9.
- Medium article on Skeuomorphism confirms "realistic textures, detailed shadows/highlights,
  physical affordances, icons depicting physical counterparts" — matches `styles.csv` row 13.

**Findings that extend `styles.csv`:**
- Medium article explicitly flags **hybrid approaches** as viable for 2025 — e.g.,
  "Glassmorphism + Claymorphism on children's educational tools", "Skeuomorphism + Bento Grid
  for productivity dashboards". Source `ui-reasoning.csv` row 1 already uses hybrid pairings
  (`Glassmorphism + Flat Design`), so this is consistent.
- cccreative notes that **Neubrutalism is naturally accessible** because of its high contrast
  and bold boundaries — `styles.csv` row 38 confirms (`✓ WCAG AAA`).

**No external findings contradict source data.** External articles are directionally
consistent with `styles.csv`, but the source CSV is more precise (exact hex codes, CSS recipes,
design system variables) and should be the primary reference.

---

## Selection Framework (cccreative article)

> "Calm/minimal → Neumorphism; sleek/modern → Glassmorphism; bold/attention-grabbing → Neubrutalism."

Extended to all 5 trends:

| Mood | Trend | Use when |
|------|-------|----------|
| Calm & minimal | **Neumorphism** | Wellness, meditation, minimal controls, smart-home UIs |
| Sleek & modern | **Glassmorphism** | SaaS, fintech dashboards, lifestyle apps, modal overlays |
| Bold & attention-grabbing | **Neubrutalism** | Gen Z brands, indie products, creative agencies |
| Playful & engaging | **Claymorphism** | Education, children's apps, onboarding, casual games |
| Nostalgic & tactile | **Skeuomorphism (Modern)** | Music apps, productivity tools (calendars, timers, calculators), premium reading apps |

---

## Hybrid Patterns That Work (from `ui-reasoning.csv`)

| Product | Hybrid | Why |
|---------|--------|-----|
| SaaS (General) | `Glassmorphism + Flat Design` | Glass panels over flat base keeps depth while staying readable |
| Healthcare App | `Neumorphism + Accessible & Ethical` | Neumorphism soft feel only works in healthcare when paired with strict WCAG rules |
| Educational App | `Claymorphism + Micro-interactions` | Playful base + targeted motion rewards |
| NFT/Web3 | `Cyberpunk + Glassmorphism` | Dark neon base with translucent data panels |
| Mental Health | `Neumorphism + Accessible & Ethical` | Calm feel + a11y strictness for sensitive audience |
| E-commerce Luxury | `Liquid Glass + Glassmorphism` | Premium transparency layered over vibrant product imagery |
| Beauty/Spa | `Soft UI Evolution + Neumorphism` | Soft pastels match the wellness vibe |

**Rule of thumb**: If a pure trend style feels risky for a serious domain (healthcare, finance,
legal), pair it with `Accessible & Ethical` (`styles.csv` row 9) to add the WCAG AAA guardrails.
The reasoning engine does this automatically for sensitive domains.
