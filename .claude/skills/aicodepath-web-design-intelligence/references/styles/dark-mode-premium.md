# Dark Mode Premium — Light Scaffold

Rich dark backgrounds with luminous accents. Source canonical name: **"Dark Mode (OLED)"**
(`styles.csv` row 8). "Premium" is the human-friendly alias used in this skill's
Domain→Style Mapping.

**Best for (source)**: Night-mode apps, coding platforms, entertainment, eye-strain prevention, OLED devices, low-light environments.
**Mode support (source)**: Light ✗ No | Dark ✓ Only (this is a dark-exclusive style).
**Accessibility**: ✓ WCAG AAA. **Performance**: ⚡ Excellent. **Complexity**: Low.
**Framework Compatibility (source)**: Tailwind 10/10, MUI 10/10, Chakra 10/10.

---

## Raw CSS (source canonical)

Source `CSS/Technical Keywords`: `background: #000000 or #121212, color: #FFFFFF or #E0E0E0, text-shadow: 0 0 10px neon-color (sparingly), filter: brightness(0.8) if needed, color-scheme: dark`

Source `Design System Variables`: `--bg-black: #000000, --bg-dark-grey: #121212, --text-primary: #FFFFFF, --accent-neon: neon colors, --glow-effect: minimal, --oled-optimized: true`

```css
:root.dark,
.dark-mode-premium {
  --dmp-bg-deep:    #000000;       /* Source canonical — pure black for OLED */
  --dmp-bg-surface: #121212;       /* Source canonical — elevated surface */
  --dmp-bg-midnight:#0A0E27;       /* Source canonical — midnight blue variant */
  --dmp-text:       #FFFFFF;
  --dmp-text-muted: #E0E0E0;

  /* Neon accents from source ("vibrant neon accents green, blue, gold, purple") */
  --dmp-neon-cyan:   #00FFE0;
  --dmp-neon-blue:   #3B82F6;
  --dmp-neon-gold:   #FFD700;
  --dmp-neon-purple: #B794F4;
  --dmp-neon-green:  #10B981;

  color-scheme: dark;              /* Source canonical — signals to browser */
}

body {
  background: var(--dmp-bg-surface);   /* NOT pure white or pure black */
  color: var(--dmp-text);
}

.dmp-card {
  background: var(--dmp-bg-deep);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
}

/* Luminous headline — use text-shadow sparingly (source: "sparingly") */
.dmp-headline-glow {
  color: var(--dmp-text);
  text-shadow: 0 0 10px var(--dmp-neon-cyan);    /* Source canonical: 0 0 10px neon */
}

/* Gradient accent for CTAs */
.dmp-cta {
  background: linear-gradient(135deg, var(--dmp-neon-purple), var(--dmp-neon-blue));
  color: var(--dmp-bg-deep);
  font-weight: 600;
  padding: 0.875rem 2rem;
  border-radius: 12px;
  box-shadow: 0 0 24px rgba(183, 148, 244, 0.35);  /* Outer luminous glow */
}
```

**Source implementation checklist** (from `styles.csv`):
- ☐ Deep black `#000000` or `#121212` (NEVER pure white background)
- ☐ Vibrant neon accents used (green/blue/gold/purple)
- ☐ Text contrast 7:1+ (AAA, not just AA)
- ☐ Minimal glow effects (source: "sparingly")
- ☐ OLED power optimization (pure black reduces battery draw on OLED panels)
- ☐ No white (`#FFFFFF`) background

**Critical**: This style is **dark-exclusive** per source. Do NOT attempt a light-mode variant
— it defeats the purpose. If the product needs both modes, pick a different style (Glassmorphism
or Bento Grid both support light/dark).

---

## Motion Pattern (motion/react)

Signature move: **luminous glow pulses + gradient shifts + smooth scroll reveals**.

```jsx
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"

export function DMPHero({ title, subtitle }) {
  const prefersReduced = useReducedMotion()
  const { scrollY } = useScroll()
  const glowOpacity = useTransform(scrollY, [0, 400], [1, 0.3])

  return (
    <section className="dmp-card min-h-screen flex items-center px-8">
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <motion.h1
          className="dmp-headline-glow text-6xl font-bold leading-none"
          style={prefersReduced ? undefined : { opacity: glowOpacity }}
        >
          {title}
        </motion.h1>
        <p className="text-[color:var(--dmp-text-muted)] text-xl mt-4 max-w-2xl">
          {subtitle}
        </p>
        <motion.a
          href="#"
          className="dmp-cta inline-block mt-8"
          whileHover={prefersReduced ? undefined : {
            scale: 1.03,
            boxShadow: "0 0 40px rgba(183, 148, 244, 0.6)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          Launch App
        </motion.a>
      </motion.div>
    </section>
  )
}
```

`useScroll` + `useTransform` create the subtle scroll-linked glow fade. Combined with the
gradient CTA's hover glow amplification, the motion reinforces the "premium, luminous" feel.

---

## Do Not Use For (source)

- Light-mode-required products (source marks Light Mode ✗ No)
- Healthcare, legal, government — too atmospheric for trust-critical domains  
- Products targeting older users or users with vision impairments (glow effects can
  exacerbate astigmatism and halos)
