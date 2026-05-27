---
name: aicodepath-web-design-intelligence
description: >
  Use when building, styling, designing, creating, improving, reviewing, or fixing any web
  interface — landing pages, dashboards, SaaS products, portfolios, e-commerce, mobile web,
  React components, HTML/CSS layouts, or any frontend UI work. Generates production-grade,
  visually stunning design systems with industry-specific color palettes (160), typography
  pairings (73), 34 landing page patterns, 99 UX guidelines, 161 reasoning rules, modern
  motion patterns (motion/react), and 84+ design styles. Triggers on explicit style mentions
  (glassmorphism, neumorphism, neubrutalism, claymorphism, skeuomorphism, bento grid, brutalism,
  minimalism, dark mode premium, cyberpunk, editorial) AND on casual requests like "make it
  look better", "style this page", "design a cool website", "I need a landing page", or
  "build me a dashboard". Use this skill whenever the user requests ANY web UI work, even if
  they don't explicitly ask for design help. Complements aicodepath-frontend-design-review
  (which reviews existing code) and defers to aicodepath-fluent-design when the project uses
  Microsoft Fluent UI.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "[product description | style name | 'audit' | 'review']"
---

# Web Design Intelligence

A comprehensive design intelligence system that generates complete, tailored design systems
and guides implementation of state-of-the-art web interfaces. Combines **84 visual styles**
(49 general + 8 landing + 10 dashboard + 17 mobile-specific), **160 industry color palettes**,
**73 typography pairings**, **34 landing page patterns**, **161 reasoning rules**, and
**99 UX guidelines** — all CSV-backed and queryable via a BM25 search engine — into
actionable, shippable design decisions: specific hex codes, Google Fonts URLs with CSS
imports, CSS patterns, motion/react animation code, and anti-pattern warnings.

> **Source counts verified by row-counting the bundled CSVs** (2026-04-10): `styles.csv` 84 rows,
> `colors.csv` 160 rows, `typography.csv` 73 rows, `landing.csv` 34 rows, `ui-reasoning.csv` 161
> rules, `ux-guidelines.csv` 99 rules, `products.csv` 161 products, 16 stack-specific guideline
> CSVs (~54 rows each = ~810 rules total).

---

## Compatibility Gate — Defer to Fluent UI When Detected

<HARD-GATE>
Before running any design step, check whether the project uses Microsoft Fluent UI. If any
of these signals are present, STOP and defer to `aicodepath-fluent-design`:

1. `@fluentui/react-components` appears in `package.json` dependencies
2. `FluentProvider`, `makeStyles`, or `tokens` imported from `@fluentui/*`
3. Files matching `*.styles.ts` with Griffel imports

Reason: Fluent UI has its own 2-layer token system, 5-file component pattern, and Griffel
CSS-in-JS that this skill does not understand. Generating glassmorphism CSS for a Fluent
project will produce broken styling that cannot override Fluent's alias tokens.

How to check quickly:
```bash
grep -l "@fluentui/react-components" package.json 2>/dev/null && echo "FLUENT_DETECTED"
```
</HARD-GATE>

---

## When This Skill Activates

Any request involving UI structure, visual design, styling, interaction patterns, component
creation, page layouts, or user experience quality:

- Building new pages, components, or full applications
- Styling or restyling existing interfaces
- Design system creation or consultation
- Color, typography, or layout decisions
- Animation and interaction design
- Design reviews and audits of visual direction (not code review — that's
  `aicodepath-frontend-design-review`)
- Requests mentioning specific styles (glassmorphism, neumorphism, neubrutalism, claymorphism,
  skeuomorphism, brutalism, bento grid, dark mode premium, cyberpunk, editorial, etc.)
- Casual requests: "make it look better", "style this page", "design a cool website"

---

## Workflow

### Step 1 — Analyze & Classify the Request

Extract from the user's message:
- **Product type**: SaaS, e-commerce, fintech, healthcare, restaurant, portfolio, dashboard, etc.
- **Scope**: Full page, single component, design system, or design audit
- **Explicit style preference**: Did the user mention a specific style?
- **Constraints**: Dark mode, accessibility level, existing brand colors, framework
- **Target audience**: Developers, consumers, enterprise, creative professionals

### Step 2 — Style Decision Tree

```
User specified a style explicitly? (e.g. "glassmorphism dashboard")
  → YES: Use that style. Validate fit against the domain. If it's a poor fit,
         use it anyway but warn about potential issues.
  → NO: Continue ↓

User's intent is clear and specific? (e.g. "build me a fintech landing page")
  → YES: Auto-recommend the best style for that domain using the Domain→Style Mapping
         below. Present the recommendation with 1-2 alternatives.
  → NO: Continue ↓

Request is ambiguous or broad? (e.g. "design a cool website")
  → YES: Run the two-tier interview in Step 2b.
```

### Step 2b — Two-Tier Interview (when needed)

Run the interview only when Step 2 leaves direction ambiguous. Keep questions focused — skip
the whole interview if the user's message already contains enough signals.

**Question 1 — Domain & Purpose**
> "What type of product is this for?"
> Options: SaaS / E-commerce / Fintech / Healthcare / Portfolio / Restaurant / Dashboard /
> Education / Gaming / Other

**Question 2 — Visual Direction (Mood)**
> "What visual feel are you going for?"
> Options:
> - **Clean & Minimal** — restrained, functional, whitespace-driven
> - **Soft & Dimensional** — layered, tactile, gentle depth
> - **Bold & Raw** — high-contrast, expressive, attention-grabbing
> - **Dark & Premium** — rich backgrounds, luminous accents, data-forward
> - **Playful & Fun** — approachable, colorful, friendly
> - **Tactile & Realistic** — 3D affordances, textures, skeuomorphic cues

**Question 3 — Specific Style** (only if the user wants to drill in)

Offer styles that match the chosen mood. This guarantees every major trend is reachable:

| Mood | Offered Styles |
|------|---------------|
| Clean & Minimal | Minimalism / Swiss, Bento Grid, Exaggerated Minimalism |
| Soft & Dimensional | **Glassmorphism**, **Neumorphism**, **Claymorphism**, Soft UI Evolution |
| Bold & Raw | **Neubrutalism**, Brutalism, Editorial / Magazine, Memphis |
| Dark & Premium | Dark Mode Premium, Cyberpunk / Neon, Gradient Mesh / Aurora |
| Playful & Fun | Claymorphism, Memphis, Y2K, Vaporwave |
| Tactile & Realistic | **Skeuomorphism (Modern)**, 3D & Hyperrealism, HUD / Sci-Fi FUI |

All five trend styles the user most commonly asks about — **Glassmorphism, Neumorphism,
Neubrutalism, Claymorphism, and Skeuomorphism** — are reachable from this interview. If the
user picks a style, load the corresponding scaffold from `references/styles/<style>.md`.

If the user says "just go ahead" or "surprise me", skip Q3 and auto-recommend from the
Domain→Style Mapping.

### Step 3 — Domain→Style Mapping & Recommendation

Use this mapping to select the primary recommended style. Always present with 1-2 alternatives
so the user can steer.

| Domain | Primary Recommendation | Alternatives | Reasoning |
|--------|----------------------|--------------|-----------|
| SaaS (General) | Glassmorphism | Minimalism, Bento Grid | Glass panels convey modernity; trust via clean layering |
| SaaS (Enterprise) | Minimalism (Swiss) | Material Design 3, Flat | Enterprise expects clarity and professionalism |
| Fintech / Crypto | Dark Mode Premium | Glassmorphism, Cyberpunk | Dark backgrounds convey seriousness; luminous data |
| Fintech (Banking) | Minimalism | Material Design 3 | Banks need maximum trust and readability |
| Healthcare | Minimalism + Accessible & Ethical | Neumorphism (paired w/ Accessible) | Calm, anxiety-reducing; never red-primary. Neumorphism works only when paired with strict WCAG AA text contrast |
| E-commerce (Fashion) | Editorial/Magazine | Minimalism, Art Deco | Fashion needs editorial storytelling |
| E-commerce (General) | Bento Grid | Flat, Material 3 | Product-focused grid maximizes browsing |
| E-commerce (Luxury) | Liquid Glass + Glassmorphism | Editorial, Dark Premium | Premium transparency layered over vibrant product imagery — per reasoning engine row 4 |
| Restaurant / Food | Organic / Warm | Skeuomorphism (Modern), Neubrutalism | Warmth, authenticity; real photography |
| Portfolio (Creative) | Neubrutalism | Brutalism, Editorial | Stand out; bold personality |
| Portfolio (Developer) | Dark Mode Premium | Brutalism, Minimalism | Terminal-inspired; code-forward |
| Dashboard / Analytics | Bento Grid | Dark Premium, Glassmorphism | Asymmetric cards organize data hierarchies |
| Developer Tools | Dark Mode Premium | Brutalism, Bento Grid | Dark theme is industry standard |
| Education / EdTech | Claymorphism | Friendly Flat, Material 3 | Approachable and playful for learners |
| Children's Apps | Claymorphism | Organic, Playful Flat | Soft, fun, safe-feeling |
| Gaming | Cyberpunk / Neon | Dark Premium, Neubrutalism | High energy, immersive |
| Wellness / Fitness | Neumorphism | Organic, Minimalism | Soft, calming, tactile |
| Real Estate | Minimalism | Editorial, Organic | Let property images breathe |
| AI / ML Product | Dark Mode Premium | Glassmorphism, Cyberpunk | Technical sophistication; data-forward |
| Legal / Law | Minimalism (Swiss) | Flat, Corporate Solid | Maximum professionalism |
| Beauty / Cosmetics / Spa | Soft UI Evolution + Neumorphism | Glassmorphism, Art Deco | Soft pastels (Pink/Sage/Cream) + gold accents — per reasoning engine row 32 |
| Music / Entertainment | Dark Mode Premium | Cyberpunk, Glassmorphism | Immersive dark canvas |

This is a curated subset. **For exhaustive coverage of 161 product categories**, query the
reasoning engine — it contains industry-specific style+palette+typography combinations
verified against accessibility and conversion research that may differ from the simpler
mapping above:
```bash
python3 scripts/search.py "<domain keywords>" --design-system -p "<Product Name>"
```

When the table above and the reasoning engine disagree, prefer the reasoning engine output
— the curated table is a lightweight fallback, the reasoning engine has 161 industry-specific
rules with nuanced style combinations.

### Step 4 — Assemble the Design System

Once the style is determined, read `data/design-systems.md` and cross-reference to assemble:

1. **Style Direction** — Selected style's CSS patterns and implementation rules
2. **Color Palette** — Industry-matched 6-role palette (primary, secondary, CTA, background, text, border)
3. **Typography** — Heading + body font pairing with Google Fonts URL
4. **Animation Strategy** — Motion patterns from `references/motion-patterns.md` matching the style
5. **Layout Pattern** — Page structure and section ordering from `data/landing.csv`
6. **Anti-Patterns** — Industry-specific design mistakes to avoid (from `data/ux-guidelines.csv`)

**If the user picked a specific style in Step 2b, also load the per-style build scaffold:**

| Style | Scaffold |
|-------|----------|
| Glassmorphism | `references/styles/glassmorphism.md` — full-depth |
| Neumorphism | `references/styles/neumorphism.md` — full-depth |
| Neubrutalism | `references/styles/neubrutalism.md` — full-depth |
| Claymorphism | `references/styles/claymorphism.md` — full-depth |
| Skeuomorphism (Modern) | `references/styles/skeuomorphism.md` — full-depth (authored fresh) |
| Bento Grid | `references/styles/bento-grid.md` — light |
| Dark Mode Premium | `references/styles/dark-mode-premium.md` — light |
| Minimalism | `references/styles/minimalism.md` — light |

Full-depth scaffolds contain: raw CSS, Tailwind config overrides, shadcn CSS-variable theme,
motion/react animation pattern, working React component example, dark variant, and a11y gotchas.
Light scaffolds contain: CSS snippet + motion pattern only.

### Step 4a — Style ↔ Animation Pairing

| Style | Motion Character |
|-------|------------------|
| Glassmorphism | Subtle hover lift, blur-in transitions, parallax depth |
| Neumorphism | Gentle press/depress on click, soft fade-ins |
| Neubrutalism | Snappy transforms, hard stops (no easing), playful bounces |
| Claymorphism | Bouncy spring physics, playful scale on hover |
| **Skeuomorphism (Modern)** | **Realistic page-flips, inertia scroll, material-feel bounce** |
| Minimalism | Fade-up reveals with long duration (600-800ms), minimal hover states |
| Bento Grid | Staggered card entrances, layout animations on filter/sort |
| Dark Mode Premium | Luminous glow effects, gradient shifts, smooth scroll reveals |
| Cyberpunk | Glitch effects, neon pulse, scan-line overlays |
| Editorial | Elegant text reveals, parallax images, page-turn transitions |

### Step 5 — Apply Design Intelligence

When generating actual code, enforce these principles:

**Color Implementation**
- Use CSS custom properties: `--color-primary`, `--color-secondary`, etc.
- Include dark mode variants via `prefers-color-scheme` or class toggle
- Ensure WCAG AA contrast (4.5:1 for text, 3:1 for large text)
- Never hardcode raw hex values in component code — always reference tokens

**Typography Implementation**
- Load fonts via Google Fonts `<link>` or `@import`
- Use a modular type scale (1.25 or 1.333 ratio)
- Set heading font for h1-h3, body font for everything else
- Include `font-display: swap` for performance

**Animation Implementation** — Motion library for React
```bash
npm install motion    # The current package (replaces framer-motion)
```
```jsx
import { motion } from "motion/react"   // Current import path
```

> The `framer-motion` package is deprecated. Use `motion` with `motion/react` imports.
> Verified via Context7 (motion.dev/docs/react-installation).

- Respect `prefers-reduced-motion` — always include a reduced-motion fallback
- Focus on entrance animations, scroll-triggered reveals, hover micro-interactions
- Use spring physics for natural feel: `transition={{ type: "spring", stiffness: 300, damping: 30 }}`

For full animation patterns, read `references/motion-patterns.md`.

**Layout Implementation**
- Mobile-first responsive design
- CSS Grid for page layouts, Flexbox for component internals
- Use `clamp()` for fluid typography and spacing
- Generous whitespace — padding of 1.5rem–4rem between sections

**Component Quality**
- Semantic HTML (`<main>`, `<section>`, `<nav>`, `<article>`)
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus-visible styles
- Loading and error states

### Step 6 — Present the Design Brief

When generating from the reasoning engine (`scripts/search.py --design-system`), the
bundled Python output uses **10 color roles**, not 6. Match that format for consistency:

```
## Design System: <Product Name>

### Pattern
- **Name:** <Landing pattern from landing.csv>
- **Conversion Focus:** <What to emphasize>
- **CTA Placement:** <Where CTAs go>
- **Color Strategy:** <How colors support conversion>
- **Sections:** <Section order>

### Style
- **Name:** <Style from styles.csv>
- **Mode Support:** Light ✓ | Dark ✓/◐/✗
- **Keywords:** <from source styles.csv row>
- **Best For:** <industries from source>
- **Performance:** <source rating> | **Accessibility:** <source rating>

### Colors (10 roles — matches source schema)
| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary        | #hex | --color-primary         |
| On Primary     | #hex | --color-on-primary      |
| Secondary      | #hex | --color-secondary       |
| Accent / CTA   | #hex | --color-accent          |
| Background     | #hex | --color-background      |
| Foreground     | #hex | --color-foreground      |
| Muted          | #hex | --color-muted           |
| Border         | #hex | --color-border          |
| Destructive    | #hex | --color-destructive     |
| Ring           | #hex | --color-ring            |

### Typography
- **Heading:** <font from typography.csv>
- **Body:** <font>
- **Google Fonts:** <share URL>
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=<Font+Name>:wght@300;400;500;600;700&display=swap');
```

### Key Effects
<from styles.csv "Effects & Animation" column>

### Animation Strategy (motion/react)
[2-3 specific motion patterns from references/motion-patterns.md]

### Avoid (Anti-patterns)
- <from styles.csv "Do Not Use For" + ui-reasoning.csv anti-patterns>

### Pre-Delivery Checklist
<see Step 7 below — this is auto-generated by the Python script>
```

**Important**: This 10-role color schema is what the Python reasoning engine outputs and
what shadcn-style CSS variables expect. Using only 6 roles (primary/secondary/CTA/bg/text/
border) is a **simplified human-friendly view** — for implementation, map to all 10.

### Step 7 — Pre-Delivery Checklist

Before delivering any UI code, validate against:
- [ ] Contrast ratio ≥ 4.5:1 for body text
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] No horizontal scroll on mobile viewports
- [ ] `prefers-reduced-motion` respected
- [ ] Font loading optimized (`font-display: swap`)
- [ ] Images use `loading="lazy"` below fold
- [ ] Interactive elements have focus styles
- [ ] Color not used as the only indicator of state
- [ ] CTA visible above the fold
- [ ] Consistent spacing rhythm (4/8px base grid)
- [ ] Dark mode supported or explicitly scoped out
- [ ] Using `motion` package with `motion/react` imports (not deprecated `framer-motion`)

---

## Reference File Loading Triggers

Load only the files relevant to the current task to keep context lean.

| Trigger | File to Read |
|---------|--------------|
| Implementing animations | `references/motion-patterns.md` |
| User picked Glassmorphism | `references/styles/glassmorphism.md` |
| User picked Neumorphism | `references/styles/neumorphism.md` |
| User picked Neubrutalism | `references/styles/neubrutalism.md` |
| User picked Claymorphism | `references/styles/claymorphism.md` |
| User picked Skeuomorphism | `references/styles/skeuomorphism.md` |
| User picked Bento Grid | `references/styles/bento-grid.md` |
| User picked Dark Mode Premium | `references/styles/dark-mode-premium.md` |
| User picked Minimalism | `references/styles/minimalism.md` |
| Comparing 2+ trend styles | `references/trend-comparison.md` |
| Using shadcn/ui + Tailwind | `references/shadcn-theming.md` |
| Decision flow still unclear | `references/style-decision-tree.md` |
| Need stack-specific guidance | `data/stacks/<stack>.csv` (16 stacks, ~54 rules each) |
| Web a11y rules for React components | `data/app-interface.csv` (30 web-focused rules: focus/forms/performance/semantic HTML) |
| Industry not in table above | `python3 scripts/search.py "<query>" --design-system` |
| Chart type selection | `data/charts.csv` (25 types mapped to D3/Recharts/ApexCharts/Plotly/Chart.js) |
| 99 UX rules severity reference | `data/ux-guidelines.csv` (4 Critical + 32 High + 58 Medium + 9 Low) |

---

## Search Engine (Advanced)

For deeper queries, the Python BM25 search engine handles:

```bash
# Full design system generation (verified working — tested 2026-04-10)
python3 scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"

# Markdown format (cleaner for docs)
python3 scripts/search.py "fintech banking" --design-system -f markdown

# Persist to design-system/ directory for cross-session retrieval
python3 scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp"

# Page-specific override file (hierarchical master + page pattern)
python3 scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp" --page "checkout"

# Domain-specific search (available domains from --help output:
# style, color, chart, landing, product, ux, typography, icons, react, web, google-fonts)
python3 scripts/search.py "glassmorphism" --domain style
python3 scripts/search.py "elegant serif" --domain typography
python3 scripts/search.py "dashboard" --domain chart

# Stack-specific guidelines (16 stacks: react, nextjs, vue, svelte, astro, swiftui,
# react-native, flutter, nuxtjs, nuxt-ui, html-tailwind, shadcn, jetpack-compose,
# threejs, angular, laravel)
python3 scripts/search.py "form validation" --stack react
python3 scripts/search.py "responsive layout" --stack html-tailwind

# JSON output for programmatic consumption
python3 scripts/search.py "ecommerce luxury" --design-system --json
```

**Reasoning engine caveat**: The BM25 engine sometimes returns surprising matches. A query
for "fintech banking dark theme" may return "Accessible & Ethical" style with a purple
palette rather than the expected "Dark Mode Premium" with navy/gold — because the ranking
prioritizes keyword matches ("banking" → financial rules) over style semantics. When the
engine output contradicts the Domain→Style Mapping table in this skill, present BOTH to
the user and let them choose. The engine is more exhaustive; the table is more intuitive.

**Persist pattern** (master + page overrides): With `--persist`, the script writes
`design-system/MASTER.md` (global source of truth) and optionally
`design-system/pages/<page>.md` (page-specific overrides). When building a specific page,
check for a matching `pages/<page>.md` first — its rules override the master. This lets a
product have a consistent design system while letting individual pages break the rules
intentionally.

**Python resolution**: On systems where `python3` is not on PATH, use
`lib/platform-utils.js → findPython()` to locate the interpreter. Never hardcode `python3`
in skill-invoked commands — use the helper from AICodePath core.

---

## Design Style Reference

The skill covers these major style families (see `data/design-systems.md` for full details):

- **Glass & Transparency**: Glassmorphism, Frosted Glass, Acrylic UI
- **Soft & Dimensional**: Neumorphism, Claymorphism, Soft UI
- **Bold & Raw**: Neubrutalism, Brutalism, Anti-Design
- **Minimal & Clean**: Minimalism, Flat Design, Swiss Style
- **Rich & Textured**: Skeuomorphism (Modern), Material Design 3, Art Deco
- **Dark & Immersive**: Dark Mode Premium, Cyberpunk, Noir
- **Organic & Natural**: Biomorphic, Organic, Earth Tones
- **Retro & Nostalgic**: Y2K, Vaporwave, Retro-Futurism, Pixel Art
- **Data & Dashboard**: Bento Grid, Card-Based, Metro, Dashboard-First
- **Luxury & Editorial**: Editorial, Magazine, Luxury Minimal, Fashion-Forward

---

## AICodePath Integration

This skill is a **design generator** — it recommends and scaffolds design direction. Related
AICodePath surfaces handle adjacent concerns:

| Surface | Relationship |
|---------|--------------|
| `aicodepath-brainstorm` | Delegates the "what should this look like" branch here when UI design is in scope |
| `aicodepath-classify-component` | Routes `ui-design` component types to this skill + the `ui-designer`/`ux-designer` agents |
| `aicodepath-frontend-design-review` | Runs **after** this skill during GICL — validates implementation against the design brief this skill produced |
| `aicodepath-fluent-design` | **Takes precedence** when Fluent UI is detected — see Compatibility Gate above |
| `aicodepath-ui-designer` agent | Can call `scripts/search.py` programmatically to retrieve palette/font data for token generation |
| `aicodepath-ux-designer` agent | Reads wireframe anti-patterns from `data/ux-guidelines.csv` during journey mapping |
| `aicodepath-write-plan` | Reference the chosen style + palette in the design doc so implementation tasks inherit the visual contract |

**Path resolution**: When invoking `scripts/search.py` or reading `data/*.csv` programmatically
from other skills or hooks, use `lib/path-resolver.js` to locate this skill's directory —
never hardcode absolute paths.

---

## Rules

- Always give specific hex codes, never just color names
- Always include a Google Fonts link for typography recommendations
- Always include at least 2 anti-patterns with severity levels
- If the industry is not in the data, find the closest match and note the adaptation
- If multiple styles could work, present the top recommendation with brief alternatives
- Every suggestion must be immediately implementable — specific values, not vague direction
- Never use overplayed defaults: Inter font alone, purple-on-white gradients, generic card layouts
- Match animation complexity to the design direction — minimal styles get subtle motion, maximalist styles get elaborate sequences
- Always implement dark mode support or mention how to add it
- Prioritize performance — no unnecessary animations, optimized assets, minimal DOM
- Use `motion` package (`import { motion } from "motion/react"`) — the `framer-motion` package is deprecated
- When the user picks a specific style in Step 2b, **always** load the matching `references/styles/<style>.md` scaffold before generating code

## NEVER

- **NEVER** proceed if the Compatibility Gate detects Fluent UI — defer to `aicodepath-fluent-design`. Generating non-Fluent CSS inside a Fluent project produces styling that cannot override Fluent's alias tokens and will be silently broken.
- **NEVER** use raw hex values directly in component code — always reference CSS custom properties. Raw hex values make dark mode and theming impossible to add later without a full refactor.
- **NEVER** recommend `framer-motion` imports — the package is deprecated. Use `motion` with `motion/react` imports. Recommending `framer-motion` sends users to an unmaintained dependency.
- **NEVER** ship a design brief without the Pre-Delivery Checklist validation — visible contrast failures and missing `prefers-reduced-motion` are the most common a11y regressions in AI-generated UI code, and both are trivially preventable if checked.
- **NEVER** use red as a primary color for healthcare products regardless of domain table confusion — red triggers anxiety and danger associations in medical contexts. This is a HARD anti-pattern; override any conflicting user preference and explain why.
