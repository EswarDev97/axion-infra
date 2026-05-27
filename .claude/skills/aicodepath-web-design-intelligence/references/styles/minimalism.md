# Minimalism & Swiss Style — Light Scaffold

Maximum whitespace, restrained palette, perfect typography, grid precision. Source: `styles.csv`
row 2 ("Minimalism & Swiss Style"). Era/Origin: 1950s Swiss. Not "lazy" — minimalism requires
obsessive precision.

**Best for (source)**: Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools.
**Accessibility**: ✓ WCAG AAA (maximum). **Performance**: ⚡ Excellent. **Complexity**: Low.
**Framework Compatibility (source)**: Tailwind 10/10, Bootstrap 9/10, MUI 9/10.

---

## Raw CSS (source canonical)

Source `CSS/Technical Keywords`: `display: grid, gap: 2rem, font-family: sans-serif, color: #000 or #FFF, max-width: 1200px, clean borders, no box-shadow unless necessary`

Source `Design System Variables`: `--spacing: 2rem, --border-radius: 0px, --font-weight: 400-700, --shadow: none, --accent-color: single primary only`

Source `Primary Colors`: Monochromatic Black `#000000`, White `#FFFFFF`.
Source `Secondary Colors`: Neutral Beige `#F5F1E8`, Grey `#808080`, Taupe `#B38B6D`, plus one primary accent.

```css
:root {
  --min-bg: #FFFFFF;
  --min-fg: #000000;
  --min-neutral-beige: #F5F1E8;    /* Source canonical */
  --min-neutral-grey:  #808080;    /* Source canonical */
  --min-neutral-taupe: #B38B6D;    /* Source canonical */
  --min-accent: #2563EB;           /* Single accent — pick ONE and commit */

  --min-spacing: 2rem;             /* Source canonical base unit */
  --min-radius: 0;                 /* Source: --border-radius: 0px */
  --min-max-width: 1200px;         /* Source canonical */
}

.min-page {
  background: var(--min-bg);
  color: var(--min-fg);
  font-family: system-ui, -apple-system, "Helvetica Neue", sans-serif;
  max-width: var(--min-max-width);
  margin: 0 auto;
  padding: calc(var(--min-spacing) * 2) var(--min-spacing);
}

.min-grid {
  display: grid;
  gap: var(--min-spacing);
}

/* Hierarchy via size and weight alone — NO color, NO shadow, NO decoration */
.min-h1 {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0;
}

.min-h2 {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-top: calc(var(--min-spacing) * 2);
}

.min-body {
  font-size: 1.125rem;
  line-height: 1.7;
  max-width: 68ch;                 /* Readable line length */
  font-weight: 400;
}

/* Dark variant — simply invert, no shadow no decoration */
.dark {
  --min-bg: #000000;
  --min-fg: #FFFFFF;
  --min-neutral-beige: #1a1817;
  --min-neutral-grey:  #A0A0A0;
}

/* NO box-shadow by default — source says "no box-shadow unless necessary" */

/* Subtle hover — source says 200-250ms */
.min-link {
  color: var(--min-accent);
  text-decoration: underline;
  text-underline-offset: 0.25em;
  text-decoration-thickness: 1px;
  transition: opacity 200ms ease;
}
.min-link:hover { opacity: 0.7; }

@media (prefers-reduced-motion: reduce) {
  .min-link { transition: none; }
}
```

**Source implementation checklist** (from `styles.csv`):
- ☐ Grid-based layout 12-16 columns
- ☐ Typography hierarchy clear (via size/weight, NOT color or decoration)
- ☐ No unnecessary decorations
- ☐ WCAG AAA contrast verified (not AA — AAA is the Swiss standard)
- ☐ Mobile responsive grid

**The one rule that separates Swiss from "bland"**: obsessive precision. Every margin is on
the 8px grid. Every font-size is on the modular scale. Every color choice is deliberate. If
something isn't essential, remove it.

---

## Motion Pattern (motion/react)

Signature move: **fade-up reveals with long duration (600-800ms)** — minimal hover states.

```jsx
import { motion, useReducedMotion } from "motion/react"

export function MinimalSection({ children }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-page"
    >
      {children}
    </motion.section>
  )
}
```

`duration: 0.7` is at the upper end of source's `200-250ms` hover timing — for reveal
animations (not hover), longer is more deliberate and matches the Swiss pace. Use
`cubic-bezier(0.25, 0.1, 0.25, 1)` (default `ease`) rather than spring physics — springs
feel playful, Swiss feels measured.

---

## Do Not Use For (source)

- Creative portfolios (source: "Do Not Use For: Creative portfolios, entertainment, playful brands, artistic experiments")
- Entertainment products
- Playful/youth-oriented brands
- Artistic/experimental projects
- Anything where "personality" is the differentiator — minimalism is explicitly the absence of personality
