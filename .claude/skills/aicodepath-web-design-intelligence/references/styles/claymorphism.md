# Claymorphism — Build Scaffold

Soft, inflated 3D elements with pastel colors and dual shadows. Playful and approachable —
evolves neumorphism by adding saturation, inner highlights, and puffy "squishy" volume.

**Best for**: Education / EdTech, children's apps, gamified UIs, creative tools, playful landing pages, onboarding flows.
**Avoid for**: Fintech, banking, legal, healthcare, enterprise B2B — claymorphism reads as "unserious".

---

## Raw CSS

```css
:root {
  /* Source canonical palette (styles.csv row 9): pastel peach, baby blue, mint, lilac */
  --clay-canvas: #F4F1FA;              /* NEVER pure white — per mobile row 82 */
  --clay-peach: #FDBCB4;
  --clay-baby-blue: #ADD8E6;
  --clay-mint: #98FF98;
  --clay-lilac: #E6E6FA;
  --clay-accent: #7C3AED;              /* Vivid violet accent from mobile row 82 */

  --clay-surface: var(--clay-peach);
  --clay-shadow-outer: rgba(0, 0, 0, 0.08);
  --clay-shadow-inner-light: rgba(255, 255, 255, 0.5);
  --clay-shadow-inner-dark: rgba(0, 0, 0, 0.05);
  --clay-border: rgba(255, 255, 255, 0.4);
}

body {
  background: var(--clay-canvas);      /* Cool lavender-white, NEVER pure white */
}

.clay-card {
  background: var(--clay-surface);
  border: 3px solid var(--clay-border);            /* Source: 3-4px (styles.csv row 9) */
  border-radius: 20px;                              /* Source: 16-24px range */
  box-shadow:
    4px 4px 8px var(--clay-shadow-outer),           /* Source canonical: 4px 4px 8px */
    inset -2px -2px 8px var(--clay-shadow-inner-dark),
    inset 2px 2px 8px var(--clay-shadow-inner-light);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);  /* Source canonical spring */
}

.clay-card:hover {
  transform: scale(1.03) translateY(-2px);
}

.clay-card:active {
  transform: scale(0.98);
}

/* Dark variant */
.dark {
  --clay-bg: #2d1b3d;
  --clay-surface: #4a2d5a;
  --clay-shadow-outer: #2d1b3d;
  --clay-shadow-inner-light: rgba(255, 255, 255, 0.1);
  --clay-shadow-inner-dark: rgba(0, 0, 0, 0.3);
  --clay-border: rgba(255, 255, 255, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .clay-card { transition: none; }
  .clay-card:hover,
  .clay-card:active { transform: none; }
}
```

**Critical elements:**
- **Triple shadow**: hard outer drop + inner light (top-left) + inner dark (bottom-right)
- **Large border-radius** (24px+) — claymorphism requires generous curves
- **Pastel saturation** — not washed-out, not neon; think candy
- **Semi-transparent border** adds the final "inflated" outline

---

## Tailwind Config Override

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'clay-pink': '#f4c8db',
        'clay-pink-shadow': '#e0a8c0',
        'clay-mint': '#c8f4d9',
        'clay-mint-shadow': '#a0dbb5',
        'clay-lavender': '#d4c8f4',
        'clay-lavender-shadow': '#b0a0dc',
        'clay-peach': '#ffd4b8',
        'clay-peach-shadow': '#e8b090',
      },
      boxShadow: {
        'clay-pink': '8px 8px 0 #e0a8c0, inset -4px -4px 0 rgba(0,0,0,0.05), inset 4px 4px 0 rgba(255,255,255,0.4)',
        'clay-mint': '8px 8px 0 #a0dbb5, inset -4px -4px 0 rgba(0,0,0,0.05), inset 4px 4px 0 rgba(255,255,255,0.4)',
        'clay-lavender': '8px 8px 0 #b0a0dc, inset -4px -4px 0 rgba(0,0,0,0.05), inset 4px 4px 0 rgba(255,255,255,0.4)',
      },
      borderRadius: {
        'clay': '24px',
        'clay-lg': '32px',
      },
      transitionTimingFunction: {
        'clay-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
}
```

Usage:
```jsx
<div className="bg-clay-pink border-2 border-white/30 rounded-clay shadow-clay-pink
                p-6 transition-transform duration-300 ease-clay-spring
                hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98]
                motion-reduce:transition-none motion-reduce:hover:transform-none">
```

---

## shadcn CSS-Variable Theme

```css
@layer base {
  :root {
    --background: 335 100% 97%;        /* #fef3f8 */
    --foreground: 335 40% 25%;

    --primary: 335 72% 68%;            /* clay pink surface */
    --primary-shadow: 335 55% 65%;
    --primary-foreground: 335 40% 20%;

    --secondary: 155 65% 80%;          /* clay mint */
    --secondary-shadow: 155 45% 67%;

    --accent: 270 60% 82%;             /* clay lavender */
    --accent-shadow: 270 45% 75%;

    --radius: 1.5rem;                  /* 24px — claymorphism requires this */
  }

  .dark {
    --background: 278 40% 17%;
    --foreground: 335 20% 95%;

    --primary: 335 35% 45%;
    --primary-shadow: 335 35% 20%;
    --secondary: 155 30% 40%;
    --accent: 270 30% 50%;
  }
}

@layer utilities {
  .clay {
    box-shadow:
      8px 8px 0 hsl(var(--primary-shadow)),
      inset -4px -4px 0 rgba(0, 0, 0, 0.05),
      inset 4px 4px 0 rgba(255, 255, 255, 0.4);
  }
}
```

---

## Motion Pattern (motion/react)

```jsx
import { motion, useReducedMotion } from "motion/react"

export function ClayButton({ children, onClick }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.button
      onClick={onClick}
      whileHover={prefersReduced ? undefined : { scale: 1.05, y: -2 }}
      whileTap={prefersReduced ? undefined : { scale: 0.95, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 12,          // LOW damping → bouncy
      }}
      className="bg-clay-pink rounded-clay shadow-clay-pink border-2 border-white/30
                 px-8 py-4 font-bold text-pink-900"
    >
      {children}
    </motion.button>
  )
}
```

Signature move: **bouncy spring physics** with low damping (10-15 range) for overshoot.
Claymorphism motion is playful — it should feel like squeezing a stress ball.

---

## Working React Component Example

```jsx
import { motion, useReducedMotion } from "motion/react"

export function ClaymorphicLessonCard() {
  const prefersReduced = useReducedMotion()
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } }
  }
  const card = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    show: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 14 }
    }
  }

  const lessons = [
    { title: "Counting", emoji: "🔢", color: "bg-clay-pink shadow-clay-pink" },
    { title: "Shapes",   emoji: "🔷", color: "bg-clay-mint shadow-clay-mint" },
    { title: "Colors",   emoji: "🎨", color: "bg-clay-lavender shadow-clay-lavender" },
  ]

  return (
    <div className="bg-[#fef3f8] min-h-screen p-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
      >
        {lessons.map(lesson => (
          <motion.div
            key={lesson.title}
            variants={prefersReduced ? undefined : card}
            whileHover={prefersReduced ? undefined : { y: -4, scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
            className={`${lesson.color} rounded-clay-lg border-2 border-white/30 p-8 text-center`}
          >
            <div className="text-6xl mb-4">{lesson.emoji}</div>
            <h3 className="text-2xl font-bold text-pink-900">{lesson.title}</h3>
            <p className="text-pink-800 mt-2">Let's learn!</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
```

---

## Accessibility Gotchas

- **Pastel on pastel fails contrast.** `text-pink-700` on `bg-clay-pink` = ~3.2:1 — FAIL. Use `text-pink-900` or darker to hit 4.5:1.
- **The inflated look hides focus rings.** Use `focus-visible:ring-4 focus-visible:ring-primary-shadow focus-visible:ring-offset-4` — claymorphism needs thick, high-contrast focus indicators.
- **Children's apps need larger touch targets than standard** — 56×56px minimum, not 44×44px. Small kids have less precise tap accuracy.
- **Screen readers don't feel "playful"** — Emojis as the only content in icon boxes need `aria-label` and the title text should be the primary semantic signal.
- **Respect `prefers-reduced-motion`** — bouncy spring animations are the core aesthetic but also the most disruptive for motion-sensitive users. The scaffold's `prefersReduced ? undefined : ...` pattern is mandatory.

---

## Do Not Use For

- Any serious/professional domain (fintech, legal, healthcare, banking, enterprise)
- Dense data tables or dashboards
- Long-form reading content
- Products targeting senior users (the pastel + bouncy combo reads as toys)
