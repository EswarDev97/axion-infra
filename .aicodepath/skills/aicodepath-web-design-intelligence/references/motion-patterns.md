# Motion & Animation Patterns

## Animation Philosophy

Motion in UI serves three purposes:
1. **Orientation** — Help users understand spatial relationships and hierarchy
2. **Feedback** — Confirm actions and show state changes
3. **Delight** — Create memorable, polished experiences (use sparingly)

### Timing Tokens
- **Instant**: 100ms — button states, toggles
- **Fast**: 200ms — tooltips, small reveals
- **Normal**: 300ms — modals, panels, page transitions
- **Slow**: 500ms — complex orchestrations, hero animations
- **Entrance stagger**: 50-100ms between items

### Easing Functions
- **Standard**: `cubic-bezier(0.4, 0, 0.2, 1)` — most transitions
- **Enter**: `cubic-bezier(0, 0, 0.2, 1)` — elements appearing
- **Exit**: `cubic-bezier(0.4, 0, 1, 1)` — elements leaving
- **Spring (natural)**: `type: "spring", stiffness: 300, damping: 30`
- **Spring (bouncy)**: `type: "spring", stiffness: 400, damping: 15`
- **Spring (gentle)**: `type: "spring", stiffness: 200, damping: 40`

---

## Motion Library (React) Patterns

### Page Load — Staggered Fade Up
```jsx
import { motion } from "motion/react"

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}
const childVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  }
}
```

### Hover — Lift Card
```jsx
<motion.div
  whileHover={{
    y: -6,
    boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)",
    transition: { type: "spring", stiffness: 400, damping: 25 }
  }}
/>
```

### Hover — Magnetic Button
```jsx
function MagneticButton({ children }) {
  const ref = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  
  const handleMouse = (e) => {
    const { left, top, width, height } = ref.current.getBoundingClientRect()
    setPosition({
      x: (e.clientX - left - width / 2) * 0.3,
      y: (e.clientY - top - height / 2) * 0.3
    })
  }
  
  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => setPosition({ x: 0, y: 0 })}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.button>
  )
}
```

### Scroll — Reveal on Enter
```jsx
<motion.div
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
/>
```

### Scroll — Parallax Background
```jsx
import { useScroll, useTransform } from "motion/react"

function ParallaxHero() {
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 500], [0, -150])
  const textY = useTransform(scrollY, [0, 500], [0, 100])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])
  
  return (
    <section className="relative h-screen overflow-hidden">
      <motion.div style={{ y: bgY }} className="absolute inset-0 bg-cover" />
      <motion.div style={{ y: textY, opacity }} className="relative z-10">
        <h1>Hero Text</h1>
      </motion.div>
    </section>
  )
}
```

### Enter/Exit — AnimatePresence
```jsx
import { AnimatePresence, motion } from "motion/react"

<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    />
  )}
</AnimatePresence>
```

### Layout Animation — Shared Layout
```jsx
<motion.div layout layoutId="highlight" className="absolute inset-0 bg-primary rounded-lg" />
```

### Gesture — Drag to Dismiss
```jsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (info.offset.y > 100) onDismiss()
  }}
/>
```

### Number Counter Animation
```jsx
import { useMotionValue, useTransform, animate } from "motion/react"

function Counter({ target }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, v => Math.round(v))
  
  useEffect(() => {
    const controls = animate(count, target, { duration: 2 })
    return controls.stop
  }, [target])
  
  return <motion.span>{rounded}</motion.span>
}
```

---

## CSS-Only Animation Patterns (for HTML artifacts)

### Fade-Up on Load
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-up {
  animation: fadeUp 0.6s ease-out forwards;
  opacity: 0;
}
.animate-fade-up:nth-child(1) { animation-delay: 0s; }
.animate-fade-up:nth-child(2) { animation-delay: 0.1s; }
.animate-fade-up:nth-child(3) { animation-delay: 0.2s; }
```

### Glassmorphism Hover Glow
```css
.glass-card {
  backdrop-filter: blur(12px);
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16px;
  transition: all 0.3s ease;
}
.glass-card:hover {
  background: rgba(255,255,255,0.15);
  box-shadow: 0 8px 32px rgba(99,102,241,0.15);
  transform: translateY(-2px);
}
```

### Shimmer Loading
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

### Smooth Scroll Reveal (Intersection Observer)
```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible')
      observer.unobserve(entry.target)
    }
  })
}, { threshold: 0.15 })

document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
```
```css
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Gradient Border Animation
```css
.gradient-border {
  position: relative;
  border-radius: 16px;
  padding: 2px;
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  background-size: 300% 300%;
  animation: gradientShift 4s ease infinite;
}
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

### Pulse CTA Button
```css
.cta-pulse {
  position: relative;
}
.cta-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 0 rgba(var(--cta-rgb), 0.4);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--cta-rgb), 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(var(--cta-rgb), 0); }
}
```

---

## Reduced Motion Compliance

Always wrap motion in a reduced-motion check:

**React (Motion library)**:
```jsx
import { useReducedMotion } from "motion/react"

function Component() {
  const prefersReduced = useReducedMotion()
  return (
    <motion.div
      animate={{ y: prefersReduced ? 0 : 20 }}
      transition={prefersReduced ? { duration: 0 } : { type: "spring" }}
    />
  )
}
```

**CSS**:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up { animation: none; opacity: 1; transform: none; }
  .glass-card { transition: none; }
}
```

## Performance Rules
- Use `transform` and `opacity` for animations (GPU-composited, no layout thrashing)
- Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`
- Use `will-change: transform` sparingly and only on elements about to animate
- Limit simultaneous animations to 10-15 elements
- Use `contain: content` on animated containers for layout isolation
- Lazy-load below-fold animated sections
