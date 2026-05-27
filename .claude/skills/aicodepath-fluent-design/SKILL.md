---
name: aicodepath-fluent-design
description: >
  Use when building with Fluent UI 2 / Fluent 2 design system. Trigger on:
  FluentProvider, makeStyles, Griffel, @fluentui/react-components, fluentui-apple,
  fluentui-android, Teams design, or any Fluent component name (Button, Dialog,
  DataGrid, Field, Tabs, Tree, Accordion). Covers 5-file pattern, Griffel CSS-in-JS,
  motion, WCAG 2.1 AA, iOS/Android.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "[component name | 'setup' | 'theme' | 'mobile' | task description]"
---

# Fluent UI 2 — Development Guide

Build applications with Microsoft Fluent 2 design system following official component patterns,
2-layer token architecture, Griffel CSS-in-JS, and WCAG 2.1 AA accessibility requirements.

## Quick Reference

| Task | Reference |
|------|-----------|
| Token architecture + theming | [design-tokens.md](references/design-tokens.md) |
| 5-file component pattern | [component-architecture.md](references/component-architecture.md) |
| All 46+ web components | [web-components.md](references/web-components.md) |
| iOS (12) + Android (5) components | [mobile-components.md](references/mobile-components.md) |
| Motion + presence animations | [motion-system.md](references/motion-system.md) |
| Forms + Field ARIA + positioning | [forms-and-validation.md](references/forms-and-validation.md) |
| Wait UX + content design | [ux-patterns.md](references/ux-patterns.md) |
| WCAG 2.1 AA + focus + ARIA | [accessibility.md](references/accessibility.md) |
| isConformant + API Extractor | [conformance-testing.md](references/conformance-testing.md) |
| Scaffold new component | `python scripts/scaffold_fluent_component.py <Name> --path ./src/components` |

---

## Compatibility Gate

**Before proceeding, confirm the target framework:**

```
Is the project using React (or PWA with React)?
  YES → Proceed with this skill
  NO  → See alternatives below
```

| Framework | Status | Alternative |
|-----------|--------|-------------|
| React (web) | ✅ Fully supported — 46+ components | Use this skill |
| PWA (React) | ✅ Fully supported — same React packages | Use this skill |
| Vue | ❌ No Fluent library | Use generic `aicodepath-ui-designer` |
| Svelte / Astro | ❌ No Fluent library | Use generic `aicodepath-ui-designer` |
| React Native | ❌ No React Native Fluent library | Use `aicodepath-mobile-architect` |
| Flutter | ❌ No Flutter Fluent library | Use `aicodepath-mobile-architect` |
| iOS (Swift/SwiftUI) | ✅ 12 components — `fluentui-apple` | See [mobile-components.md](references/mobile-components.md) |
| Android (Kotlin/Compose) | ✅ 5 components — `fluentui-android` | See [mobile-components.md](references/mobile-components.md) |
| Web Components (FAST) | ⚠ Release Candidate — not production | Defer to future stable release |

---

## Workflow Decision Tree

**What are you doing?**

**Ordering note:** Tokens before components — components internally consume alias tokens, so understanding the token layer first prevents misuse (e.g., importing global tokens inside a component with no FluentProvider to resolve them).

### Setting up a new Fluent project
→ **MANDATORY — READ ENTIRE FILE**: [design-tokens.md](references/design-tokens.md) (~353 lines)
→ Do NOT load motion-system.md or web-components.md for setup-only tasks
→ See `examples/provider-setup.tsx` for root FluentProvider wiring
→ Install: `npm install @fluentui/react-components @fluentui/tokens`

### Creating a new custom component
→ **MANDATORY — READ ENTIRE FILE**: [component-architecture.md](references/component-architecture.md) (~446 lines)
→ Do NOT load web-components.md unless selecting which existing component to extend
→ Scaffold: `python scripts/scaffold_fluent_component.py <ComponentName> --path ./src/components`
→ See `examples/button-component/` for the canonical 5-file reference implementation

### Selecting the right Fluent component for a use case
→ **MANDATORY — READ ENTIRE FILE**: [web-components.md](references/web-components.md) (~686 lines)
→ Do NOT load component-architecture.md unless implementing a custom component
→ See "Component Selection Guide" section below for the top 15 use cases

### Adding forms + input validation
→ **MANDATORY — READ ENTIRE FILE**: [forms-and-validation.md](references/forms-and-validation.md) (~307 lines)
→ Do NOT load web-components.md unless identifying which input component to use
→ See `examples/field-validation.tsx` for all 4 validation states

### Adding animations / transitions
→ **MANDATORY — READ ENTIRE FILE**: [motion-system.md](references/motion-system.md) (~259 lines)
→ Do NOT load forms-and-validation.md or web-components.md for animation-only tasks
→ See `examples/presence-motion.tsx` for enter/exit animation

### Building for iOS or Android
→ **MANDATORY — READ ENTIRE FILE**: [mobile-components.md](references/mobile-components.md) (~282 lines)
→ Do NOT load web-components.md — mobile uses separate libraries (fluentui-apple / fluentui-android)

<HARD-GATE>
Before implementing any Fluent mobile component, verify it exists for the target platform:
- iOS (fluentui-apple): 12 components — Activity Indicator, Avatar, Avatar Group, Button, Card Nudge, HUD, Navigation Bar, Progress Bar, Segmented Control, Shimmer, Text Field, Tooltip
- Android (fluentui-android): 5 components — Avatar, Avatar Group, Button, Progress Indicator, Shimmer
Designing around an iOS-only component (Card Nudge, HUD, Segmented Control, Text Field, Tooltip) on Android wastes implementation work — no Fluent equivalent exists.
</HARD-GATE>

### Theming / branding
→ **MANDATORY — READ ENTIRE FILE**: [design-tokens.md](references/design-tokens.md) (~353 lines)
→ Do NOT load component-architecture.md for theming-only changes
→ See `examples/custom-theme.tsx` for custom 16-shade brand ramp

### Reviewing accessibility
→ **MANDATORY — READ ENTIRE FILE**: [accessibility.md](references/accessibility.md) (~300 lines)
→ Do NOT load motion-system.md unless specifically checking reduced-motion compliance
→ Check contrast ratios (4.5:1 standard, 3:1 large text/UI components)

### Writing tests for a Fluent component
→ **MANDATORY — READ ENTIRE FILE**: [conformance-testing.md](references/conformance-testing.md) (~276 lines)
→ Do NOT load component-architecture.md unless building a new testable component
→ See `examples/conformance-test.tsx` for isConformant setup

---

## 7 Core Principles

**Follow all 7 — they are non-negotiable for Fluent 2 compliance.**

### 1. Always use alias tokens
```typescript
// ✅ Correct — semantic alias token
color: tokens.colorNeutralForeground1

// ❌ Wrong — hardcoded hex
color: '#242424'

// ❌ Wrong — global token direct import
import { colorGrey14 } from '@fluentui/tokens/global';
```
Alias tokens automatically adapt to light/dark/high-contrast themes. Global tokens are raw values — they never change with the theme.

### 2. FluentProvider is mandatory at the app root
```typescript
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

// ✅ Correct
<FluentProvider theme={webLightTheme} dir="ltr" lang="en-US">
  <App />
</FluentProvider>

// ❌ Wrong — missing FluentProvider, tokens won't resolve
<App />
```
FluentProvider injects theme as CSS custom properties. Without it, all token references produce blank values.

### 3. 5-file component pattern for all custom components
Every custom Fluent component must follow the 5-file decomposition:
```
ComponentName.tsx            # Orchestrator (forwardRef)
ComponentName.types.ts       # Props, Slots, State types
useComponentName.ts          # State hook (business logic, slots)
useComponentNameStyles.styles.ts  # Griffel styles (.styles.ts double extension)
renderComponentName.tsx      # Pure render (assertSlots + JSX pragma)
```
See [component-architecture.md](references/component-architecture.md) for full implementation.

### 4. JSX pragma in all render files
```typescript
// ✅ Required in every render*.tsx file
/** @jsxRuntime automatic */
/** @jsxImportSource @fluentui/react-jsx-runtime */
```
This pragma activates the custom JSX factory that handles slot prop spreading and ref forwarding correctly. Missing it causes silently incorrect slot behavior.

<HARD-GATE>
Do NOT create any render*.tsx file without both pragma lines at the top:
  /** @jsxRuntime automatic */
  /** @jsxImportSource @fluentui/react-jsx-runtime */
Missing this pragma produces no compile error and no runtime error — slots silently misbehave.
</HARD-GATE>

### 5. Wrap all form inputs in `<Field>`
```typescript
// ✅ Correct — Field auto-wires all ARIA
<Field label="Email" hint="We'll never share this" validationState="error"
       validationMessage="Invalid format" required>
  <Input type="email" />
</Field>

// ❌ Wrong — missing ARIA wiring
<Input type="email" aria-label="Email" />
```
Field automatically connects: `label → htmlFor`, `hint → aria-describedby`, `validationMessage → aria-describedby + aria-invalid`.

<HARD-GATE>
Do NOT implement Input, Textarea, Combobox, Dropdown, Checkbox, RadioGroup, or Slider without wrapping in <Field>.
Bare inputs lose all ARIA wiring: label→htmlFor, hint→aria-describedby, validation→aria-invalid are all absent.
</HARD-GATE>

### 6. Griffel for styles — never inline styles
```typescript
// ✅ Correct — Griffel makeStyles
const useStyles = makeStyles({
  container: { color: tokens.colorNeutralForeground1 }
});

// ❌ Wrong — inline styles on Fluent components
<Button style={{ color: '#242424' }}>

// ❌ Wrong — inline styles anywhere
<div style={{ padding: '16px' }}>
```
Use `makeStyles` for variants, `makeResetStyles` for base resets. Griffel generates atomic CSS with zero runtime overhead.

### 7. Respect `prefers-reduced-motion`
```typescript
// ✅ In Griffel styles
const useStyles = makeStyles({
  animated: {
    transition: 'all 0.2s',
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

// ✅ In motion components — motionTokens auto-respect reduced-motion
// createPresenceComponent / createMotionComponent handle this automatically
```

---

## Platform Selection Matrix

| | Web | PWA | iOS | Android |
|--|-----|-----|-----|---------|
| **Component count** | 46+ | 46+ | 12 | 5 |
| **Token system** | CSS custom properties | CSS custom properties | Swift tokens | Kotlin tokens |
| **Library** | `@fluentui/react-components` | `@fluentui/react-components` | `fluentui-apple` | `fluentui-android` |
| **Touch targets** | 44×44px | 44×44px | 44×44pt | 48×48dp |
| **Offline support** | Service worker | ✅ Native PWA | Platform cache | Platform cache |
| **Push notifications** | Push API | ✅ Native PWA | APNs | FCM |
| **Distribution** | CDN / npm | App store or self-hosted | App Store | Google Play |
| **Capitalization** | Sentence-case | Sentence-case | **Title-case** | Sentence-case |
| **When to choose** | Default for web | Web + native installs | Teams iOS feature | Teams Android feature |

---

## Component Selection Guide

Top 15 use cases mapped to the right Fluent component:

| Use Case | Component | Notes |
|----------|-----------|-------|
| Single action button | `Button` | One primary button per layout |
| Binary on/off (immediate effect) | `Switch` | No submit step required |
| Multi-option selection | `Checkbox` in `Field` | Use `RadioGroup` for ≤5 mutually exclusive options |
| Single option from long list | `Combobox` or `Dropdown` | Combobox when filtering needed |
| Short text input | `Input` in `Field` | Always wrap in `Field` |
| Long text input | `Textarea` in `Field` | Always wrap in `Field` |
| Confirmation / destructive action | `Dialog` (modal) | Alert variant for destructive; non-modal for guidance |
| Side panel with supplemental content | `Drawer` | Overlay (blocking) vs Inline (non-blocking) |
| Tabbed categories | `TabList` + `Tab` | One always active; use Overflow for many tabs |
| Tabular data with sort/select | `DataGrid` | See `examples/data-grid-component/` |
| Hierarchical nested data | `Tree` | Use flat structure for dynamic data (`useHeadlessFlatTree`) |
| Context menu / action list | `Menu` | Support submenus via nested `MenuList` |
| Supplemental context on hover | `Tooltip` | Plain text only; use `Popover` for rich/interactive content |
| Progress communication | `Spinner` (<3s) or `ProgressBar` (>3s) | See Wait UX thresholds |
| Form field with validation | `Field` wrapping any input | All validation states auto-wire ARIA |

---

## Anti-Patterns

**These patterns fail conformance tests or violate Fluent design standards:**

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|-----------------|
| `color: '#0f6cbd'` | Hardcoded hex breaks dark/HC themes | `color: tokens.colorBrandBackground` |
| `import { colorGrey14 } from '@fluentui/tokens/global'` | Global token import — bypasses theming | Import from `@fluentui/tokens` (alias layer) |
| Missing `<FluentProvider>` wrapper | Tokens don't resolve → blank/broken styles | Always wrap app root with `FluentProvider` |
| `render*.tsx` without `@jsxImportSource` pragma | Slot prop spreading broken | Add `/** @jsxImportSource @fluentui/react-jsx-runtime */` |
| `<Input>` without `<Field>` wrapper | Missing ARIA: no label→htmlFor, no aria-invalid | Always wrap form controls in `<Field>` |
| `style={{ color: tokens.colorNeutralForeground1 }}` | Inline styles override slot className — can't be overridden downstream | Use `makeStyles` in `.styles.ts` file |
| Using `getSlots` in render functions | `getSlots` is deprecated — removed in v10 | Use `assertSlots` (provides type narrowing) |
| Importing from individual packages: `import { Button } from '@fluentui/react-button'` | Tree-shaking already handled by umbrella | Import from `@fluentui/react-components` |
| Multiple primary buttons in one layout | Destroys visual hierarchy | One primary button per layout section |
| Semantic color (red/green/yellow) for decoration | Confuses users relying on color for meaning | Semantic colors for status only |

---

## Troubleshooting

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| All tokens render blank / styles absent | `FluentProvider` not wrapping the component tree | Wrap app root: `<FluentProvider theme={webLightTheme}>` |
| Slot props not forwarding / ref broken silently | Missing JSX pragma in render*.tsx | Add both pragma lines to top of every render*.tsx |
| ARIA label / describedby absent; screen reader silent | Input not wrapped in `<Field>` | Replace bare `<Input>` with `<Field label="..."><Input /></Field>` |
| Theme not switching in dark or high-contrast mode | Hardcoded hex or global token import | Replace with `tokens.colorXxx` alias from `@fluentui/tokens` |
| `getSlots` TypeScript error or missing export | Deprecated API removed in v10 | Replace `getSlots(state)` with `assertSlots(state)` |
| Segmented Control / Card Nudge / HUD missing on Android | Component is iOS-only — Android has 5 components only | Check mobile-components.md; build equivalent from `Button` variants |

**If none of the above matches:** Read the reference file for the failing feature area (Workflow Decision Tree above maps task → file).
