# Bento Grid — Light Scaffold

Apple-inspired modular card grid with varied card sizes. Clean, content-first hierarchy that
maximizes scannability. Source: `styles.csv` row 54 ("Bento Grids").

**Best for (source)**: Product features, dashboards, personal sites, marketing summaries, galleries.
**Accessibility**: ✓ WCAG AA (source). **Performance**: ⚡ Excellent. **Complexity**: Low.
**Framework Compatibility (source)**: CSS Grid 10/10, Tailwind 10/10.

> **Naming note**: `styles.csv` has two related rows — "Bento Box Grid" (row 40) and "Bento
> Grids" (row 54). The row 54 "Bento Grids" entry is the more refined Apple-style variant; row
> 40 is the older playful take. Prefer row 54 canonical values (used below).

---

## Raw CSS (source canonical)

Source `CSS/Technical Keywords`: `display: grid, grid-template-columns: repeat(auto-fit, minmax(...)), gap: 1rem, border-radius: 20px, background: #FFF, box-shadow: subtle`

Source `Design System Variables`: `--grid-gap: 20px, --card-radius: 24px, --card-bg: #FFFFFF, --page-bg: #F5F5F7, --shadow: soft`

```css
:root {
  --bento-page-bg: #F5F5F7;    /* Source canonical — Apple off-white */
  --bento-card-bg: #FFFFFF;
  --bento-text:    #1D1D1F;    /* Source canonical */
  --bento-gap:     20px;
  --bento-radius:  24px;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  grid-auto-rows: minmax(180px, auto);
  gap: var(--bento-gap);
  padding: var(--bento-gap);
  background: var(--bento-page-bg);
}

.bento-card {
  background: var(--bento-card-bg);
  color: var(--bento-text);
  border-radius: var(--bento-radius);
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.bento-card:hover {
  transform: scale(1.02);      /* Source: Hover scale (1.02) */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 16px 32px rgba(0, 0, 0, 0.08);
}

/* Span variants — the defining "bento" feel comes from varied sizes */
.bento-card--wide   { grid-column: span 2; }
.bento-card--tall   { grid-row: span 2; }
.bento-card--hero   { grid-column: span 2; grid-row: span 2; }

.dark {
  --bento-page-bg: #0A0A0A;
  --bento-card-bg: #1C1C1E;
  --bento-text:    #F5F5F7;
}

@media (prefers-reduced-motion: reduce) {
  .bento-card { transition: none; }
  .bento-card:hover { transform: none; }
}
```

**Source implementation checklist** (from `styles.csv`):
- ☐ Grid layout (CSS Grid) — NOT flexbox
- ☐ Rounded corners 16-24px
- ☐ Varied card spans (1x1, 2x1, 2x2)
- ☐ Content fits card size
- ☐ Responsive re-flow
- ☐ Apple-like aesthetic (subtle shadows, clean whites)

---

## Motion Pattern (motion/react)

Signature move: **staggered card entrances with layout animations**.

```jsx
import { motion, useReducedMotion } from "motion/react"

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const card = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
}

export function BentoSection({ items }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.div
      className="bento-grid"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          layout                                  // Auto-animate on filter/sort
          variants={prefersReduced ? undefined : card}
          whileHover={prefersReduced ? undefined : { scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`bento-card ${item.span || ""}`}
        >
          {item.content}
        </motion.div>
      ))}
    </motion.div>
  )
}
```

`layout` is key — when the grid reorders (filter, sort, add/remove), Motion smoothly animates
the position changes instead of jump-cutting. This is the core "bento experience" on interaction.

---

## Do Not Use For (source)

- Dense data tables (defeats the airy grid feel)
- Long-form reading content
- Interfaces where all cards must be the same size (that's just a grid, not a bento)
