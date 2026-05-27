# Glassmorphism — Build Scaffold

Frosted-glass panels with blur, transparency, and layered backgrounds. Modern, layered feel
that conveys sophistication through depth without visual clutter.

**Best for**: SaaS dashboards, fintech (with dark base), beauty/cosmetics, modern landing pages, music/media apps.
**Avoid for**: High-accessibility contexts, enterprise tools where clarity trumps mood, busy photographic backgrounds without heavy blur.

---

## Raw CSS

```css
.glass-card {
  backdrop-filter: blur(15px);              /* Source canonical: 10-20px range, 15px default */
  -webkit-backdrop-filter: blur(15px);      /* Safari */
  background: rgba(255, 255, 255, 0.15);    /* Source: 10-30% opacity range */
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 48px rgba(99, 102, 241, 0.15);
  transform: translateY(-2px);
}

/* Dark variant — reduce alpha, deepen shadow */
.dark .glass-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

@media (prefers-reduced-motion: reduce) {
  .glass-card { transition: none; }
  .glass-card:hover { transform: none; }
}
```

The border is critical — without it, glass panels visually vanish against similar
backgrounds. Always include at least a 1px semi-transparent border.

---

## Tailwind Config Override

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      backdropBlur: {
        xs: '2px',
        glass: '15px',        // Source canonical default
        'glass-heavy': '20px', // Top of source recommended range
      },
      backgroundColor: {
        'glass-light': 'rgba(255, 255, 255, 0.15)',
        'glass-light-hover': 'rgba(255, 255, 255, 0.2)',
        'glass-dark': 'rgba(255, 255, 255, 0.05)',
        'glass-dark-hover': 'rgba(255, 255, 255, 0.1)',
      },
      borderColor: {
        'glass-light': 'rgba(255, 255, 255, 0.2)',
        'glass-dark': 'rgba(255, 255, 255, 0.08)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-hover': '0 12px 48px rgba(99, 102, 241, 0.15)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
    },
  },
}
```

Usage:
```jsx
<div className="backdrop-blur-glass bg-glass-light border border-glass-light
                rounded-2xl shadow-glass p-6 transition-all
                hover:bg-glass-light-hover hover:shadow-glass-hover hover:-translate-y-0.5
                motion-reduce:transition-none motion-reduce:hover:transform-none">
```

---

## shadcn CSS-Variable Theme

Add to `globals.css`:

```css
@layer base {
  :root {
    --background: 230 35% 96%;          /* soft lavender base */
    --foreground: 224 71% 4%;

    --glass-bg: 0 0% 100% / 0.15;       /* white at 15% */
    --glass-border: 0 0% 100% / 0.2;
    --glass-shadow: 224 71% 4% / 0.1;

    --primary: 235 75% 60%;
    --primary-foreground: 210 20% 98%;
    --accent: 291 64% 60%;
    --accent-foreground: 210 20% 98%;
    --radius: 1rem;
  }

  .dark {
    --background: 224 71% 4%;
    --foreground: 210 20% 98%;

    --glass-bg: 0 0% 100% / 0.05;
    --glass-border: 0 0% 100% / 0.08;
    --glass-shadow: 0 0% 0% / 0.4;

    --primary: 235 85% 70%;
    --accent: 291 70% 70%;
  }
}

@layer utilities {
  .glass {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background: hsl(var(--glass-bg));
    border: 1px solid hsl(var(--glass-border));
    box-shadow: 0 8px 32px hsl(var(--glass-shadow));
  }
}
```

---

## Motion Pattern (motion/react)

```jsx
import { motion, useReducedMotion } from "motion/react"

export function GlassCard({ children, delay = 0 }) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={prefersReduced ? undefined : {
        y: -4,
        boxShadow: "0 20px 48px rgba(99,102,241,0.2)",
      }}
      className="glass rounded-2xl p-6"
    >
      {children}
    </motion.div>
  )
}
```

Signature moves: **blur-in on enter**, **subtle lift on hover**, **parallax depth** on scroll.
Use `filter: "blur(8px)"` in `initial` for a distinctive entrance that reinforces the glass metaphor.

---

## Working React Component Example

```jsx
import { motion, useReducedMotion } from "motion/react"

export function GlassmorphicDashboard() {
  const prefersReduced = useReducedMotion()
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }
  const card = {
    hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
    show: {
      opacity: 1, y: 0, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200
                    dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950 p-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
      >
        {['Revenue', 'Users', 'Retention'].map(label => (
          <motion.article
            key={label}
            variants={prefersReduced ? undefined : card}
            className="glass rounded-2xl p-6 text-foreground"
          >
            <h3 className="text-sm font-medium opacity-80">{label}</h3>
            <p className="text-3xl font-bold mt-2">$—</p>
          </motion.article>
        ))}
      </motion.div>
    </div>
  )
}
```

---

## Accessibility Gotchas (HIGH priority)

- **Contrast over vibrant backgrounds fails silently.** Frosted glass over a photo looks great visually but body text on the glass can drop below 4.5:1 when the background shifts. Always test contrast against the *actual worst-case* background, not a mockup.
- **`backdrop-filter` has no fallback on older browsers.** Use `@supports (backdrop-filter: blur(12px))` to provide a solid background for unsupported browsers — otherwise the card becomes fully transparent.
- **Safari requires the `-webkit-` prefix.** Omitting it produces a flat, blurless card on iOS.
- **Performance**: `backdrop-filter` is GPU-intensive on older mobile devices. Limit to 3-5 glass elements per viewport.
- **Respect `prefers-reduced-motion`** — the blur-in effect is a motion cue and must degrade gracefully.

---

## Do Not Use For

- Healthcare (need maximum clarity, not ambient depth)
- Legal / banking (too ambient, not authoritative enough)
- High-density data tables (reduces readability)
- Body text over photographic backgrounds without contrast guard
