# Fluent 2 Motion System

> Source: `@fluentui/react-motion` · Verified from `~/workspace/fluentui/packages/react-components/react-motion/`
> Built on: Web Animations API (not CSS transitions)

---

## 1. Overview

The Fluent motion system is built on the **Web Animations API** — not CSS transitions or keyframe stylesheets. This provides programmatic control over timing, iteration, and playback.

Three primitive types:
1. **Presence Motion** — enter/exit with React mount/unmount control
2. **Motion Component** — non-presence continuous animations
3. **Atom Functions** — reusable pre-built motion building blocks

---

## 2. Motion Tokens

Import from `@fluentui/react-motion`:

### Duration Tokens
| Token | Value | Use Case |
|-------|-------|---------|
| `motionTokens.durationUltraFast` | 50ms | Micro-interactions (badge appearance) |
| `motionTokens.durationFast` | 100ms | Quick state transitions |
| `motionTokens.durationNormal` | **200ms** | **Standard (default)** |
| `motionTokens.durationGentle` | 250ms | Gentle transitions |
| `motionTokens.durationSlow` | 300ms | Deliberate transitions |
| `motionTokens.durationSlower` | 400ms | Emphasized entrance/exit |

### Easing Curve Tokens
| Token | CSS Equivalent | When to Use |
|-------|---------------|-------------|
| `motionTokens.curveDecelerateMid` | ease-out | **Entering elements** (decelerates into place) |
| `motionTokens.curveAccelerateMid` | ease-in | **Exiting elements** (accelerates away) |
| `motionTokens.curveEasyEase` | ease-in-out | **Movement within screen** |
| `motionTokens.curveLinear` | linear | **Rotations only** |

**Rule:** Always match easing to direction:
- Element entering screen → `curveDecelerateMid` (ease-out)
- Element leaving screen → `curveAccelerateMid` (ease-in)
- Element moving within screen → `curveEasyEase` (ease-in-out)

---

## 3. Presence Motion (Enter/Exit with Mounting)

`createPresenceComponent` creates a wrapper that mounts/unmounts children and animates the transition.

```typescript
import { createPresenceComponent, motionTokens } from '@fluentui/react-motion';

const FadeIn = createPresenceComponent({
  enter: {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    duration: motionTokens.durationNormal,  // 200ms
    easing: motionTokens.curveDecelerateMid,  // ease-out (entering)
  },
  exit: {
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    duration: motionTokens.durationFast,  // 100ms
    easing: motionTokens.curveAccelerateMid,  // ease-in (exiting)
  },
});

// Usage
<FadeIn visible={isVisible} unmountOnExit>
  <div>Content</div>
</FadeIn>
```

**Props:**
| Prop | Default | Description |
|------|---------|-------------|
| `visible` | required | Controls enter/exit transition |
| `unmountOnExit` | false | Unmount from DOM after exit completes |
| `appear` | false | Animate on initial mount (not just subsequent `visible` changes) |

---

## 4. Motion Component (Continuous Animations)

`createMotionComponent` creates animations that are not tied to mount/unmount.

```typescript
import { createMotionComponent, motionTokens } from '@fluentui/react-motion';

const Pulse = createMotionComponent({
  keyframes: [
    { transform: 'scale(1)' },
    { transform: 'scale(1.05)' },
  ],
  duration: motionTokens.durationSlow,  // 300ms
  iterations: Infinity,
  direction: 'alternate',  // bounces back and forth
});

// Usage — wraps a child element
<Pulse>
  <Badge>New</Badge>
</Pulse>
```

---

## 5. Atom Functions (Pre-Built Motion Building Blocks)

Pre-built atoms for common motion patterns. Compose them into presence components via `createPresenceComponentVariant`.

```typescript
import {
  createPresenceComponentVariant,
  fadeIn,
  fadeOut,
  scaleUpEnter,
  scaleDownExit,
} from '@fluentui/react-motion';

// Compose: use fadeIn for enter, scaleDownExit for exit
const ScaleFade = createPresenceComponentVariant(fadeIn, {
  exit: scaleDownExit,
});

// Usage
<ScaleFade visible={isOpen} unmountOnExit>
  <Panel />
</ScaleFade>
```

**Available atoms:**
| Atom | Direction | Purpose |
|------|-----------|---------|
| `fadeIn` | enter | Opacity 0 → 1 |
| `fadeOut` | exit | Opacity 1 → 0 |
| `scaleUpEnter` | enter | Scale 0.8 → 1 + fade in |
| `scaleDownExit` | exit | Scale 1 → 0.8 + fade out |
| `slideInFromTop` | enter | Slide down from above |
| `slideOutToBottom` | exit | Slide down away |
| `slideInFromLeft` | enter | Slide in from left |
| `slideOutToRight` | exit | Slide out to right |

---

## 6. Reduced Motion (Required)

All motion in Fluent 2 must respect `prefers-reduced-motion`. Two approaches:

### In Griffel Styles
```typescript
import { makeStyles } from '@griffel/react';

const useStyles = makeStyles({
  animated: {
    transition: `opacity ${motionTokens.durationNormal} ${motionTokens.curveEasyEase}`,
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});
```

### With createPresenceComponent (Automatic)
`createPresenceComponent` and `createMotionComponent` automatically respect `prefers-reduced-motion` — they skip animations when the user has enabled "Reduce Motion" in OS settings. No extra work needed.

---

## 7. Common Patterns

### Panel Slide In
```typescript
const SlideFromRight = createPresenceComponent({
  enter: {
    keyframes: [
      { transform: 'translateX(100%)' },
      { transform: 'translateX(0)' },
    ],
    duration: motionTokens.durationGentle,  // 250ms
    easing: motionTokens.curveDecelerateMid,
  },
  exit: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(100%)' },
    ],
    duration: motionTokens.durationFast,  // 100ms
    easing: motionTokens.curveAccelerateMid,
  },
});
```

### Dialog Entrance
```typescript
const DialogEntrance = createPresenceComponent({
  enter: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.95)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    duration: motionTokens.durationNormal,
    easing: motionTokens.curveDecelerateMid,
  },
  exit: {
    keyframes: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.95)' },
    ],
    duration: motionTokens.durationFast,
    easing: motionTokens.curveAccelerateMid,
  },
});
```

### Notification Toast
```typescript
const ToastEntrance = createPresenceComponent({
  enter: {
    keyframes: [
      { opacity: 0, transform: 'translateY(-16px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    duration: motionTokens.durationNormal,
    easing: motionTokens.curveDecelerateMid,
  },
  exit: {
    keyframes: [
      { opacity: 1, maxHeight: '200px', marginBottom: '8px' },
      { opacity: 0, maxHeight: '0px', marginBottom: '0px' },
    ],
    duration: motionTokens.durationSlow,
    easing: motionTokens.curveAccelerateMid,
  },
});
```

---

## 8. Four Design Principles

| Principle | Description |
|-----------|-------------|
| **Functional** | Motion serves a purpose; no decoration |
| **Natural** | Follows physical laws (inertia, gravity) |
| **Consistent** | Unified across Microsoft products |
| **Appealing** | Memorable and delightful |

---

## 9. Anti-Patterns

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|--------------------|
| `transition: 'all 0.3s'` without reduced-motion | Ignores OS accessibility setting | Add `@media (prefers-reduced-motion: reduce) { transition: none }` |
| Custom CSS `@keyframes` instead of Web Animations API | Misses programmatic control and reduced-motion handling | Use `createPresenceComponent` |
| Enter duration longer than exit | Exit should be shorter (feels snappy) | Enter: `durationNormal` (200ms); Exit: `durationFast` (100ms) |
| Using `ease-in` for entering elements | Starts slow, feels sluggish | Use `curveDecelerateMid` (ease-out) for entering |
| Using `ease-out` for exiting elements | Decelerates on exit, feels sticky | Use `curveAccelerateMid` (ease-in) for exiting |
| `curveLinear` for non-rotation animations | Linear feels mechanical | Linear for rotations only |
