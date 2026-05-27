# aicodepath-fluent-design

## Purpose

`aicodepath-fluent-design` provides comprehensive guidance for implementing Microsoft Fluent UI v9 (React) and the Fluent 2 design system in web and mobile projects. It enforces the 5-file component pattern, Griffel CSS-in-JS, 2-layer token architecture, Field ARIA auto-wiring, motion system primitives, and platform-specific mobile component selection — producing code that passes the Compatibility Gate and adheres to all `fluent-design-rules.json` guidelines.

---

## Trigger Conditions

Invoke this skill when:

- Building or reviewing a React UI that uses `@fluentui/react-components`
- Designing a new Fluent v9 custom component (5-file pattern required)
- Setting up FluentProvider, brand themes, or dark/high-contrast mode support
- Working with Griffel styles (`makeStyles`, `makeResetStyles`, `mergeClasses`)
- Implementing form validation with the `Field` component and ARIA wiring
- Adding enter/exit animations using `@fluentui/react-motion`
- Selecting iOS or Android Fluent native components (fluentui-apple / fluentui-android)
- Guideline validator fires `fluent-no-hardcoded-hex`, `fluent-no-get-slots`, or `fluent-jsx-pragma-required`
- Scaffolding a new Fluent component via `scripts/scaffold_fluent_component.py`

---

## Compatibility Gate

Before writing any Fluent code, verify:

| Check | Required |
|-------|----------|
| `@fluentui/react-components` v9.x installed | Yes |
| `@griffel/react` available (bundled in `react-components`) | Yes |
| `FluentProvider` wraps app root with `theme`, `dir`, `lang` | Yes |
| TypeScript 4.7+ (for `exactOptionalPropertyTypes`) | Recommended |
| React 17+ (for automatic JSX runtime) | Required |

---

## 7 Core Principles

1. **Alias tokens only** — import from `@fluentui/tokens` (alias layer), never `@fluentui/tokens/global` (raw hex)
2. **FluentProvider at root** — injects theme as CSS custom properties; nested providers enable scoped overrides
3. **5-file pattern** — every custom component: types → hook → styles → render → orchestrator
4. **Griffel CSS-in-JS** — `makeResetStyles` for base class, `makeStyles` for variants, `mergeClasses` with consumer className last
5. **assertSlots not getSlots** — `assertSlots<Slots>(state)` provides TypeScript narrowing; `getSlots` removed in v10
6. **JSX pragma in render files** — `/** @jsxRuntime automatic */` + `/** @jsxImportSource @fluentui/react-jsx-runtime */` required in all `render*.tsx`
7. **Field wraps all form inputs** — auto-wires label→htmlFor, hint→aria-describedby, validationMessage→aria-invalid

---

## Reference Files

| File | Contents |
|------|----------|
| `references/design-tokens.md` | 2-layer token architecture, BrandVariants (16 shades), createLightTheme/createDarkTheme, FluentProvider CSS injection |
| `references/component-architecture.md` | 5-file pattern detail, slot system (slot.always/slot.optional), Griffel API summary, static class names |
| `references/web-components.md` | All 46 web components with when-to-use, variants, accessibility notes, Component Decision Guide |
| `references/mobile-components.md` | iOS 12 (fluentui-apple) + Android 5 (fluentui-android) catalog, platform gap table, touch targets |
| `references/motion-system.md` | createPresenceComponent, createMotionComponent, atom functions, motionTokens, easing rules, reduced motion |
| `references/forms-and-validation.md` | Field ARIA wiring, 4 validation states, useFieldControlProps_unstable, usePositioning, form layout patterns |
| `references/ux-patterns.md` | Wait UX thresholds (<1s/1–3s/>3s/AI), onboarding 5 goals, AI handoff CTAs, content design rules |
| `references/accessibility.md` | WCAG 2.1 AA contrast, focus management, ARIA roles, live regions, high contrast mode, testing checklist |
| `references/conformance-testing.md` | isConformant setup, behavioral tests, @swc/jest, @griffel/jest-serializer, API Extractor stability tiers |

---

## Examples

| Path | Demonstrates |
|------|-------------|
| `examples/button-component/` | Full 5-file pattern (types + hook + styles + render + orchestrator) |
| `examples/accordion-component/` | Basic, exclusive, controlled accordion patterns |
| `examples/tabs-component/` | Horizontal, vertical, overflow tab patterns |
| `examples/data-grid-component/` | Basic, sortable, selectable DataGrid |
| `examples/dialog-drawer-component/` | Confirmation dialog, form dialog, overlay drawer, inline drawer |
| `examples/menu-popover-component/` | Menu with submenu, controlled popover, tooltip (label vs description) |
| `examples/tree-component/` | Static tree, flat structure (useHeadlessFlatTree), tree with actions |
| `examples/provider-setup.tsx` | AppRoot, scoped theme overrides, high-contrast support |
| `examples/custom-theme.tsx` | BrandVariants 16 shades, createLightTheme + createDarkTheme |
| `examples/field-validation.tsx` | All 4 validation states across all 7 input types |
| `examples/presence-motion.tsx` | Fade, SlideFromTop, ScaleFade, Pulse motion primitives |
| `examples/conformance-test.tsx` | Conformance checklist + behavioral test template |

---

## Scaffold Script

```bash
# Generate 7-file Fluent v9 component scaffold
python3 .aicodepath/skills/aicodepath-fluent-design/scripts/scaffold_fluent_component.py \
  ComponentName --path ./src/components

# Output: ComponentName/{types.ts, hook.ts, styles.ts, render.tsx, orchestrator.tsx, index.ts, test.tsx}
```

---

## Guideline Rules

Enforced by `guidelines/fluent-design-rules.json` via the guideline-validator hook:

| Rule ID | Severity | What It Catches |
|---------|----------|----------------|
| `fluent-no-hardcoded-hex` | error | `color: '#hex'` in `.styles.ts` / `.tsx` — use alias tokens |
| `fluent-no-global-token-import` | error | `from '@fluentui/tokens/global'` — use alias layer |
| `fluent-provider-required` | warning | `createRoot().render` without FluentProvider check |
| `fluent-jsx-pragma-required` | error | `render*.tsx` missing `@jsxImportSource @fluentui/react-jsx-runtime` |
| `fluent-no-get-slots` | error | `getSlots<` — deprecated, use `assertSlots<Slots>(state)` |
| `fluent-no-inline-styles` | warning | `style={{` on Fluent components — use `makeStyles` instead |

---

## Integration Points

| Surface | Behaviour |
|---------|-----------|
| `guidelines/fluent-design-rules.json` | 6 rules enforced by guideline-validator hook on Write/Edit |
| `using-aicodepath` trigger table | Listed under Implementation (CONSTRUCTION) frontend triggers |
| `agent-taxonomy.md` | Maps `frontend` component type → `aicodepath-ui-designer` + `aicodepath-frontend-architect`; `mobile` → `aicodepath-mobile-architect` |
| `aicodepath-ui-designer` agent | Enhanced with Fluent 2 domain: 2-layer tokens, FluentProvider, Griffel, elevation, Wait UX |
| `aicodepath-frontend-architect` agent | Enhanced with Fluent v9 5-file pattern, slot APIs, assertSlots, Field ARIA, usePositioning |
| `aicodepath-mobile-architect` agent | Enhanced with fluentui-apple (iOS 12), fluentui-android (Android 5), platform gap, touch targets |
