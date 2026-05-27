# Neumorphism (Soft UI) — Build Scaffold

Soft shadows creating raised/recessed elements from a flat surface. Tactile, calming,
minimalist — a reimagining of skeuomorphism with modern subtlety.

**Best for (source row 2)**: Health/wellness apps, meditation platforms, fitness trackers, minimal interaction UIs, smart home controls, music players, settings panels.
**Avoid for (source row 2)**: Complex apps, data-heavy dashboards, any interface that requires high-contrast.

> **⚠ HIGH accessibility warning**: Neumorphism's defining dual-shadow technique naturally produces low-contrast surfaces (source row 2 explicitly flags "⚠ Low contrast"). Every implementation MUST manually verify 4.5:1 contrast for body text against the surface color — this is the #1 reason neumorphic UIs fail accessibility audits.

> **Healthcare nuance** (reconciling with reasoning engine row 8): The `ui-reasoning.csv`
> recommends `Neumorphism + Accessible & Ethical` for Healthcare App. This is viable **only**
> when paired with: (1) text no lighter than `#2d3748` (7.1:1 on `#e0e5ec`), (2) explicit
> focus rings `focus-visible:ring-4` with 3:1 contrast, (3) bold typography ≥16px, and
> (4) a11y-reviewed touch targets ≥48×48px. Pure neumorphism alone fails WCAG in healthcare
> — the "Accessible & Ethical" pairing is what makes the combo viable.

---

## Raw CSS

```css
:root {
  --neu-bg: #e0e5ec;
  --neu-shadow-dark: #b8bec7;
  --neu-shadow-light: #ffffff;
  --neu-text: #2d3748;  /* Must hit 4.5:1 against --neu-bg */
}

.neu-surface {
  background: var(--neu-bg);
}

/* Raised element — light from top-left, shadow to bottom-right */
.neu-raised {
  background: var(--neu-bg);
  border-radius: 16px;
  box-shadow:
    8px 8px 16px var(--neu-shadow-dark),
    -8px -8px 16px var(--neu-shadow-light);
  transition: box-shadow 0.3s ease, transform 0.15s ease;
}

/* Pressed/recessed element — inset shadows */
.neu-pressed,
.neu-raised:active {
  box-shadow:
    inset 8px 8px 16px var(--neu-shadow-dark),
    inset -8px -8px 16px var(--neu-shadow-light);
  transform: scale(0.98);
}

.neu-raised:hover {
  box-shadow:
    10px 10px 20px var(--neu-shadow-dark),
    -10px -10px 20px var(--neu-shadow-light);
}

/* Dark variant */
.dark {
  --neu-bg: #2d3748;
  --neu-shadow-dark: #1a202c;
  --neu-shadow-light: #4a5568;
  --neu-text: #e2e8f0;
}

@media (prefers-reduced-motion: reduce) {
  .neu-raised { transition: none; }
  .neu-raised:active { transform: none; }
}
```

The shadows MUST match the background color's lightness offsets exactly — approximately
+12% light, -12% dark. Using arbitrary shadow colors destroys the effect.

---

## Tailwind Config Override

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'neu-bg': '#e0e5ec',
        'neu-bg-dark': '#2d3748',
      },
      boxShadow: {
        neu: '8px 8px 16px #b8bec7, -8px -8px 16px #ffffff',
        'neu-hover': '10px 10px 20px #b8bec7, -10px -10px 20px #ffffff',
        'neu-pressed': 'inset 8px 8px 16px #b8bec7, inset -8px -8px 16px #ffffff',
        'neu-dark': '8px 8px 16px #1a202c, -8px -8px 16px #4a5568',
        'neu-dark-pressed': 'inset 8px 8px 16px #1a202c, inset -8px -8px 16px #4a5568',
      },
    },
  },
}
```

Usage:
```jsx
<button className="bg-neu-bg shadow-neu rounded-2xl px-6 py-4
                   hover:shadow-neu-hover active:shadow-neu-pressed
                   transition-shadow motion-reduce:transition-none">
```

---

## shadcn CSS-Variable Theme

```css
@layer base {
  :root {
    --background: 215 20% 90%;         /* #e0e5ec-ish */
    --foreground: 220 26% 23%;         /* 7.1:1 contrast */

    --neu-shadow-dark: 218 16% 75%;
    --neu-shadow-light: 0 0% 100%;

    --primary: 262 83% 58%;
    --primary-foreground: 210 20% 98%;
    --radius: 1rem;
  }

  .dark {
    --background: 217 19% 27%;
    --foreground: 210 20% 92%;

    --neu-shadow-dark: 220 26% 14%;
    --neu-shadow-light: 218 17% 35%;
  }
}

@layer utilities {
  .neu-raised {
    box-shadow:
      8px 8px 16px hsl(var(--neu-shadow-dark)),
      -8px -8px 16px hsl(var(--neu-shadow-light));
  }
  .neu-pressed {
    box-shadow:
      inset 8px 8px 16px hsl(var(--neu-shadow-dark)),
      inset -8px -8px 16px hsl(var(--neu-shadow-light));
  }
}
```

---

## Motion Pattern (motion/react)

```jsx
import { motion, useReducedMotion } from "motion/react"

export function NeuButton({ children, onClick }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.button
      onClick={onClick}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-neu-bg shadow-neu rounded-2xl px-8 py-4 text-foreground
                 active:shadow-neu-pressed"
    >
      {children}
    </motion.button>
  )
}
```

Signature move: **gentle press/depress on click** via `whileTap` + shadow swap.
The motion is subtle — no bouncing, no elaborate transforms. Neumorphism is quiet.

---

## Working React Component Example

```jsx
import { motion, useReducedMotion } from "motion/react"

export function NeumorphicMeditationCard() {
  const prefersReduced = useReducedMotion()
  return (
    <div className="bg-neu-bg min-h-screen p-8 flex items-center justify-center">
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-neu-bg shadow-neu rounded-3xl p-8 max-w-sm"
      >
        <div className="bg-neu-bg shadow-neu-pressed rounded-full w-20 h-20
                        mx-auto flex items-center justify-center mb-6">
          <span className="text-3xl">🧘</span>
        </div>
        <h2 className="text-2xl font-semibold text-center text-slate-800">Breathe</h2>
        <p className="text-slate-600 text-center mt-2 leading-relaxed">
          5 minutes to center yourself
        </p>
        <motion.button
          whileTap={prefersReduced ? undefined : { scale: 0.96 }}
          className="bg-neu-bg shadow-neu rounded-2xl px-8 py-4
                     text-slate-800 font-medium w-full mt-6
                     active:shadow-neu-pressed"
        >
          Start Session
        </motion.button>
      </motion.div>
    </div>
  )
}
```

Note the text color: `text-slate-800` on `#e0e5ec` background = **7.1:1 contrast**, well
above WCAG AA. If you drop to `text-slate-500` you hit ~3.8:1 — FAIL.

---

## Accessibility Gotchas (CRITICAL)

- **Contrast is the make-or-break constraint.** On a `#e0e5ec` background, you must use text no lighter than `#2d3748` (slate-800). Lighter greys look "soft" but fail WCAG AA.
- **Focus indicators disappear on soft surfaces.** The default browser focus ring is lost against low-contrast backgrounds. Always add a visible `focus-visible:ring-2 focus-visible:ring-offset-2` with a strong contrasting color.
- **Icons need real contrast too.** Icon-only buttons with neumorphic styling hide their affordance. Add `aria-label` and ensure the icon color itself hits 3:1 against the surface.
- **Pressed states must be visually + programmatically distinct.** Use `aria-pressed` for toggle buttons — the visual shadow swap alone is not enough for screen readers.
- **No text on pressed surfaces without verification.** Inset shadows darken the effective contrast region. Re-test body text contrast against the pressed state.

---

## Do Not Use For

- Complex apps with dense interaction (source row 2)
- Data-heavy dashboards (source row 2 — too much text, contrast fails)
- B2B enterprise (too soft, reads as "unfinished")
- Any interface where the user must scan text quickly
- Fintech, banking, legal — contrast-critical domains with legal/regulatory risk

**Conditional use (requires Accessible & Ethical pairing)**: Healthcare, meditation, wellness
— these are approved by `ui-reasoning.csv` rows 8, 99 when paired with strict accessibility
rules. See the "Healthcare nuance" callout above.
