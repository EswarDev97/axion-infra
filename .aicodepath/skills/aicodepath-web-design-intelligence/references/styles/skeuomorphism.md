# Skeuomorphism (Modern) — Build Scaffold

Realistic textures and materials adapted for modern sensibilities. Refined, tactile affordances
that mimic real-world objects — NOT the pre-iOS-7 leather-and-felt skeuomorphism. Think
subtle paper grain, subtle glass depth, and realistic motion, not literal bookshelves.

**Best for**: AR/VR interfaces, music apps (vinyl, knobs), productivity tools (calendars, planners, calculators), nostalgic/premium products, reading apps, meditation timers.
**Avoid for**: Mass-market SaaS, enterprise tools, dense data dashboards, anything that must feel "flat and fast".

> **Source constraints** (styles.csv row 13):
> - Source marks classical skeuomorphism as "❌ Poor Performance" and "✗ Low Mobile-Friendly"
>   — that's why this scaffold is titled "Modern" and keeps textures subtle (1.5% opacity grain,
>   not literal wood/leather images)
> - Source CSS recipe: `background: complex gradient (8-12 stops), box-shadow: realistic
>   multi-layer, background-image: texture overlay (noise, grain), filter: drop-shadow,
>   transform: scale on press (300-500ms)` — this scaffold follows all five cues
> - Source best-for matches: "legacy apps, gaming, immersive storytelling, premium products,
>   luxury, realistic simulations, education"
> - Source avoid list: "Modern enterprise, critical accessibility, low-performance, web
>   (use Flat/Modern)" — the "(Modern)" suffix in this scaffold's name signals a refined,
>   web-friendly variant that trades literal realism for tactile hints

---

## Raw CSS

```css
:root {
  /* Surface colors — warm, paper-like */
  --skeu-paper: #f5f0e8;
  --skeu-paper-dark: #e8dfd1;
  --skeu-leather: #3d2817;
  --skeu-metal: #c0c0c0;
  --skeu-text: #2a2218;

  /* Ambient light from top-left, shadow to bottom-right */
  --skeu-light: rgba(255, 255, 255, 0.8);
  --skeu-shadow: rgba(0, 0, 0, 0.15);
  --skeu-shadow-deep: rgba(0, 0, 0, 0.25);
}

/* Paper surface — subtle grain via layered gradients */
.skeu-paper {
  background:
    /* subtle fiber texture */
    repeating-linear-gradient(
      90deg,
      transparent 0 2px,
      rgba(0, 0, 0, 0.015) 2px 3px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0 2px,
      rgba(0, 0, 0, 0.015) 2px 3px
    ),
    /* warm vignette */
    radial-gradient(ellipse at top left, #faf6ed, var(--skeu-paper) 70%);
  color: var(--skeu-text);
}

/* Raised card — layered shadow/highlight for dimensional lift */
.skeu-card {
  background: var(--skeu-paper);
  border-radius: 12px;
  padding: 2rem;
  box-shadow:
    /* ambient */
    0 1px 2px var(--skeu-shadow),
    /* key light highlight at top */
    inset 0 1px 0 var(--skeu-light),
    /* core lift */
    0 4px 8px var(--skeu-shadow),
    /* deep ambient */
    0 16px 32px var(--skeu-shadow-deep);
  position: relative;
}

/* Paper edge curl — a subtle top edge highlight to sell the "page" feel */
.skeu-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--skeu-light), transparent);
  border-radius: 12px 12px 0 0;
  pointer-events: none;
}

/* Inset element — pressed-in pocket */
.skeu-inset {
  background: var(--skeu-paper-dark);
  border-radius: 8px;
  box-shadow:
    inset 0 2px 4px var(--skeu-shadow),
    inset 0 -1px 0 var(--skeu-light);
}

/* Metal knob (music/productivity apps) */
.skeu-knob {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, #f0f0f0, #a0a0a0 70%, #808080);
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.6),
    inset 0 -2px 4px rgba(0, 0, 0, 0.3),
    0 4px 8px rgba(0, 0, 0, 0.2),
    0 8px 16px rgba(0, 0, 0, 0.15);
}

/* Dark variant — subtle wood/leather-ish base instead of pure black */
.dark {
  --skeu-paper: #2a2218;
  --skeu-paper-dark: #1a1510;
  --skeu-text: #e8dfd1;
  --skeu-light: rgba(255, 255, 255, 0.1);
  --skeu-shadow: rgba(0, 0, 0, 0.4);
  --skeu-shadow-deep: rgba(0, 0, 0, 0.6);
}

@media (prefers-reduced-motion: reduce) {
  .skeu-card,
  .skeu-knob { transition: none !important; }
}
```

**Implementation principles:**
- **Layered shadows** — ambient + key light + deep ambient, never a single flat shadow
- **Subtle texture** — use `repeating-linear-gradient` or low-opacity PNG overlays, never literal wood/leather images
- **Warm color temperature** — pure cool greys feel digital; add a hint of warmth (`#f5f0e8` instead of `#f5f5f5`)
- **Material-specific gradients** — paper = soft/matte, metal = radial with bright hotspot, glass = mostly transparent
- **Refined, not literal** — a paper card has a subtle fiber texture and edge highlight, NOT a Comic Sans "handwriting" vibe

---

## Tailwind Config Override

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'skeu-paper': '#f5f0e8',
        'skeu-paper-dark': '#e8dfd1',
        'skeu-leather': '#3d2817',
        'skeu-metal': '#c0c0c0',
        'skeu-ink': '#2a2218',
      },
      boxShadow: {
        'skeu-card':
          '0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 8px rgba(0,0,0,0.15), 0 16px 32px rgba(0,0,0,0.25)',
        'skeu-inset':
          'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 -1px 0 rgba(255,255,255,0.8)',
        'skeu-pressed':
          'inset 0 3px 6px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(255,255,255,0.4)',
      },
      backgroundImage: {
        'skeu-paper-grain':
          "repeating-linear-gradient(90deg, transparent 0 2px, rgba(0,0,0,0.015) 2px 3px), repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.015) 2px 3px), radial-gradient(ellipse at top left, #faf6ed, #f5f0e8 70%)",
      },
      transitionTimingFunction: {
        'skeu-material': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // ease-out-quad
      },
    },
  },
}
```

Usage:
```jsx
<article className="bg-skeu-paper bg-skeu-paper-grain text-skeu-ink
                    rounded-xl shadow-skeu-card p-8
                    transition-all duration-300 ease-skeu-material">
```

---

## shadcn CSS-Variable Theme

```css
@layer base {
  :root {
    --background: 40 38% 93%;           /* paper #f5f0e8 */
    --foreground: 35 25% 13%;           /* ink #2a2218 */

    --card: 40 38% 93%;
    --card-foreground: 35 25% 13%;

    --primary: 22 47% 17%;              /* leather dark */
    --primary-foreground: 40 38% 93%;
    --secondary: 40 25% 87%;            /* paper darker */
    --accent: 35 45% 45%;               /* warm brass */

    --border: 35 20% 80%;
    --radius: 0.75rem;                  /* 12px — refined, not hard */
  }

  .dark {
    --background: 35 25% 13%;
    --foreground: 40 38% 93%;
    --card: 35 25% 13%;
    --primary: 40 38% 93%;
    --accent: 35 45% 55%;
    --border: 35 15% 25%;
  }
}

@layer utilities {
  .skeu-card {
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      0 4px 8px rgba(0, 0, 0, 0.15),
      0 16px 32px rgba(0, 0, 0, 0.25);
  }
}
```

---

## Motion Pattern (motion/react)

Signature moves: **page-flip transitions**, **inertia scroll**, **material-feel bounce on release**.

```jsx
import { motion, useReducedMotion } from "motion/react"

// Page flip — use rotateY with perspective
export function PageFlip({ children, flipped }) {
  const prefersReduced = useReducedMotion()
  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        animate={{ rotateY: prefersReduced ? 0 : flipped ? 180 : 0 }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 16,  // moderate damping — feels like turning a page
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="skeu-card"
      >
        {children}
      </motion.div>
    </div>
  )
}

// Material button — weight and inertia
export function MaterialButton({ children, onClick }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.button
      onClick={onClick}
      whileTap={prefersReduced ? undefined : { y: 2, scale: 0.99 }}
      transition={{
        type: "spring",
        stiffness: 600,
        damping: 30,
      }}
      className="bg-skeu-paper bg-skeu-paper-grain text-skeu-ink
                 rounded-xl shadow-skeu-card px-6 py-3 font-medium
                 active:shadow-skeu-pressed"
    >
      {children}
    </motion.button>
  )
}
```

The spring physics here are intentionally **grounded** — higher damping than claymorphism,
no overshoot. Real materials have weight; digital skeuomorphism should feel the same.

---

## Working React Component Example — Pomodoro Timer

```jsx
import { motion, useReducedMotion } from "motion/react"
import { useState } from "react"

export function SkeuomorphicPomodoro() {
  const prefersReduced = useReducedMotion()
  const [running, setRunning] = useState(false)

  return (
    <div className="bg-skeu-paper bg-skeu-paper-grain min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-skeu-paper bg-skeu-paper-grain shadow-skeu-card
                   rounded-xl p-8 max-w-sm w-full text-skeu-ink"
      >
        <h2 className="text-xl font-serif mb-6 text-center">Focus Timer</h2>

        {/* Inset display pocket */}
        <div className="bg-skeu-paper-dark rounded-lg shadow-skeu-inset
                        p-8 mb-6 text-center">
          <div className="text-6xl font-mono font-light tabular-nums tracking-tight">
            25:00
          </div>
          <div className="text-sm opacity-60 mt-2 uppercase tracking-wider">
            {running ? 'Working' : 'Paused'}
          </div>
        </div>

        {/* Metal start knob */}
        <div className="flex justify-center mb-6">
          <motion.button
            onClick={() => setRunning(!running)}
            whileTap={prefersReduced ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="skeu-knob hover:brightness-110 focus-visible:ring-4
                       focus-visible:ring-skeu-leather focus-visible:ring-offset-4
                       focus-visible:ring-offset-skeu-paper"
            aria-label={running ? "Pause timer" : "Start timer"}
          >
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <span className="text-2xl text-skeu-ink/70">
                {running ? '❚❚' : '▶'}
              </span>
            </div>
          </motion.button>
        </div>

        {/* Settings buttons */}
        <div className="flex gap-3">
          {['25m', '15m', '5m'].map(label => (
            <motion.button
              key={label}
              whileTap={prefersReduced ? undefined : { y: 2, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              className="flex-1 bg-skeu-paper bg-skeu-paper-grain
                         shadow-skeu-card rounded-lg py-3 text-sm font-medium
                         active:shadow-skeu-pressed"
            >
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
```

---

## Accessibility Gotchas

- **Texture backgrounds can drop text contrast** — a paper grain overlay at 1.5% opacity is safe, but heavier textures (3%+) start to reduce contrast. Test the final rendered contrast ratio, not the base color pair.
- **Layered shadows don't replace focus indicators** — the visual "rise" on hover is decorative. Always add an explicit `focus-visible:ring-4` with sufficient contrast against both light and dark backgrounds.
- **Metal and glass gradients can fail at screen-reader level** — a knob is an interactive control. Ensure `role="button"` (or use `<button>`) and an `aria-label` that describes the action, not the appearance.
- **Reduced motion is critical** — page-flip animations with rotateY are disorienting for motion-sensitive users. The `prefersReduced ? 0 : flipped ? 180 : 0` pattern in the scaffold is mandatory.
- **Semantic HTML matters more here** — skeuomorphism uses a lot of visual metaphors (paper = card, knob = button). Don't let the metaphor leak into the markup: a knob should still be `<button>`, not `<div role="slider">`.

---

## Do Not Use For

- Mass-market SaaS (too "handmade" for B2B)
- Dense data dashboards (no room for texture + elevation layers)
- Products needing to feel "fast and modern" (skeuomorphism reads deliberate, not snappy)
- Interfaces with many small controls (texture layers don't scale down well)

## Style Pairing Notes

Skeuomorphism (Modern) pairs naturally with:
- **Editorial typography** — serif headings (`Playfair Display`, `Cormorant Garamond`) reinforce the tactile feel
- **Warm color palettes** — cream, sepia, brass, leather — never cool greys
- **Monospace tabular numerals** for timers, calculators — echoes vintage display hardware
