# Neubrutalism — Build Scaffold

Bold borders, hard drop shadows, raw typography, saturated colors, high contrast. Raw and
honest visual language that rejects polish in favor of expressiveness.

**Best for**: Creative portfolios, indie products, Gen Z brands, developer tools, startups wanting to stand out, Figma-adjacent products.
**Avoid for**: Banking, legal, healthcare, insurance, or any domain where users need to trust you with serious stakes.

---

## Raw CSS

```css
:root {
  /* Source canonical palette (styles.csv row 38) */
  --nb-yellow: #FFEB3B;       /* Canonical yellow (or #FFDB58 mustard variant) */
  --nb-red:    #FF5252;       /* Canonical red (or #FF6B6B coral variant) */
  --nb-blue:   #2196F3;       /* Canonical blue */
  --nb-cyan:   #4ECDC4;       /* Canonical cyan */

  --nb-bg: var(--nb-yellow);
  --nb-fg: #000000;
  --nb-accent: var(--nb-red);
  --nb-shadow: #000000;
  --nb-border-width: 3px;     /* Source: --border-width: 3px */
  --nb-shadow-offset: 4px;    /* Source: --shadow-offset: 4px */
}

.nb-card {
  background: var(--nb-bg);
  color: var(--nb-fg);
  border: var(--nb-border-width) solid var(--nb-fg);
  border-radius: 0;                    /* NEVER round corners */
  box-shadow: var(--nb-shadow-offset) var(--nb-shadow-offset) 0 var(--nb-shadow);
  font-weight: 900;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.nb-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: calc(var(--nb-shadow-offset) + 2px) calc(var(--nb-shadow-offset) + 2px) 0 var(--nb-shadow);
}

.nb-card:active {
  transform: translate(var(--nb-shadow-offset), var(--nb-shadow-offset));
  box-shadow: 0 0 0 var(--nb-shadow);
}

/* Dark variant — invert ground, keep the shadow color as the new foreground */
.dark {
  --nb-bg: #1a1a1a;
  --nb-fg: #ffe156;
  --nb-shadow: #ffe156;
}

@media (prefers-reduced-motion: reduce) {
  .nb-card { transition: none; }
  .nb-card:hover,
  .nb-card:active { transform: none; }
}
```

**Critical rules:**
- `border-radius: 0` — rounded corners ruin the aesthetic
- Shadows are HARD (no blur) — `box-shadow: 6px 6px 0 #000` (no third blur argument)
- Borders are chunky — 3px minimum, 4-6px on hero elements
- No gradients, no soft transitions — everything is snappy

---

## Tailwind Config Override

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Source canonical (styles.csv row 38)
        'nb-yellow': '#FFEB3B',
        'nb-yellow-alt': '#FFDB58',   // mustard variant
        'nb-red': '#FF5252',
        'nb-red-alt': '#FF6B6B',       // coral variant
        'nb-blue': '#2196F3',
        'nb-cyan': '#4ECDC4',
      },
      boxShadow: {
        // Source canonical: --shadow-offset: 4px
        'nb': '4px 4px 0 #000',
        'nb-md': '5px 5px 0 #000',
        'nb-lg': '6px 6px 0 #000',
        'nb-yellow': '4px 4px 0 #FFEB3B',
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
      },
      fontWeight: {
        'brutal': '900',
      },
    },
  },
}
```

Usage:
```jsx
<button className="bg-nb-yellow border-3 border-black shadow-nb rounded-none
                   font-brutal px-6 py-3 text-black uppercase tracking-wide
                   hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-nb-lg
                   active:translate-x-[6px] active:translate-y-[6px] active:shadow-none
                   transition-all duration-100
                   motion-reduce:transition-none motion-reduce:hover:transform-none">
```

---

## shadcn CSS-Variable Theme

```css
@layer base {
  :root {
    --background: 53 100% 67%;         /* yellow #ffe156 */
    --foreground: 0 0% 0%;             /* pure black */

    --primary: 0 100% 71%;             /* coral */
    --primary-foreground: 0 0% 0%;
    --accent: 170 65% 55%;             /* cyan */
    --accent-foreground: 0 0% 0%;

    --border: 0 0% 0%;
    --nb-shadow: 0 0% 0%;
    --radius: 0;                       /* ZERO — no rounded corners */
  }

  .dark {
    --background: 0 0% 10%;
    --foreground: 53 100% 67%;
    --border: 53 100% 67%;
    --nb-shadow: 53 100% 67%;
  }
}

@layer utilities {
  .nb-shadow { box-shadow: 6px 6px 0 hsl(var(--nb-shadow)); }
  .nb-shadow-lg { box-shadow: 8px 8px 0 hsl(var(--nb-shadow)); }
}
```

Note `--radius: 0` — this single change cascades through shadcn components and eliminates
every rounded corner. Do not override back to a non-zero value.

---

## Motion Pattern (motion/react)

```jsx
import { motion, useReducedMotion } from "motion/react"

export function NBButton({ children, onClick }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.button
      onClick={onClick}
      whileHover={prefersReduced ? undefined : { x: -2, y: -2 }}
      whileTap={prefersReduced ? undefined : { x: 6, y: 6 }}
      transition={{ duration: 0, ease: "linear" }}  // HARD stop, no easing
      className="bg-nb-yellow border-3 border-black shadow-nb
                 font-brutal uppercase tracking-wider px-8 py-4"
    >
      {children}
    </motion.button>
  )
}
```

Signature move: **hard-stop transforms with no easing** (`duration: 0` or `type: "tween", ease: "linear"`).
Neubrutalism rejects smoothness — movements are instant and decisive. Spring physics are
acceptable for playful variants but never use `easeInOut` or long durations.

---

## Working React Component Example

```jsx
import { motion, useReducedMotion } from "motion/react"

export function NBHero() {
  const prefersReduced = useReducedMotion()
  return (
    <section className="bg-nb-yellow min-h-screen p-8 flex items-center">
      <motion.div
        initial={prefersReduced ? false : { x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: "linear" }}
        className="max-w-3xl"
      >
        <h1 className="font-brutal text-7xl text-black uppercase leading-none">
          Build<br />loud.<br />Ship louder.
        </h1>
        <p className="font-bold text-2xl text-black mt-8 border-3 border-black
                      bg-white p-4 inline-block shadow-nb">
          No corporate mush. No beige dashboards. Just raw, honest products.
        </p>
        <div className="mt-8 flex gap-4">
          <motion.a
            href="#"
            whileHover={prefersReduced ? undefined : { x: -2, y: -2 }}
            whileTap={prefersReduced ? undefined : { x: 6, y: 6 }}
            transition={{ duration: 0, ease: "linear" }}
            className="bg-nb-pink border-3 border-black shadow-nb-lg
                       font-brutal uppercase px-8 py-4 text-black"
          >
            Get Started →
          </motion.a>
          <motion.a
            href="#"
            whileHover={prefersReduced ? undefined : { x: -2, y: -2 }}
            whileTap={prefersReduced ? undefined : { x: 6, y: 6 }}
            transition={{ duration: 0, ease: "linear" }}
            className="bg-white border-3 border-black shadow-nb-lg
                       font-brutal uppercase px-8 py-4 text-black"
          >
            Read Docs
          </motion.a>
        </div>
      </motion.div>
    </section>
  )
}
```

---

## Accessibility Gotchas

- **Saturated colors can still fail contrast.** `#ffe156` yellow + `#000000` black = 19.5:1 — excellent. But pastel variants (`#fff9c4` + `#666`) drop below 4.5:1. Verify every color pair.
- **Neubrutalism is naturally accessible because of high contrast and bold boundaries** — that's its one underappreciated strength. Do not undermine this by softening.
- **Focus rings need to compete with heavy borders.** Use a colored double-outline: `focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-nb-pink`.
- **Keyboard users need visible hover/active states.** The transform-on-hover is decorative — also implement `focus-visible:translate-x-[-2px]` so keyboard navigation shows the same feedback.
- **Screen reader users won't feel the "brutalist mood".** All decorative borders, shadows, and font weight changes are invisible to assistive tech. Ensure semantic HTML carries the actual meaning.

---

## Do Not Use For

- Banking, fintech (serious), insurance, legal, healthcare — users need to trust you
- Enterprise B2B SaaS targeting IT buyers
- Anything that needs to feel "calm" or "premium"
- Large bodies of text (the chunky typography fatigues after ~3 paragraphs)
