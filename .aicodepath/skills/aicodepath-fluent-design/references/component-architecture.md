# Fluent 2 Component Architecture

> Source: `~/workspace/fluentui/packages/react-components/react-button/library/src/components/Button/`
> Verified: `assertSlots`, `@jsxImportSource`, `slot.always/optional`, `useCustomStyleHook_unstable`, `ForwardRefComponent`

---

## 1. The 5-File Pattern

Every Fluent v9 component follows a strict 5-file decomposition. This is enforced by conformance tests.

```
ComponentName/
├── ComponentName.tsx                    # Orchestrator (forwardRef, wires everything)
├── ComponentName.types.ts               # Props, Slots, State TypeScript types
├── useComponentName.ts                  # State hook (business logic, slot setup)
├── useComponentNameStyles.styles.ts     # Griffel styles (.styles.ts double extension)
└── renderComponentName.tsx              # Pure render (assertSlots + JSX pragma)
```

Also required:
```
index.ts                                 # Barrel export
ComponentName.test.tsx                   # isConformant + behavioral tests
```

The `.styles.ts` double extension is a Fluent naming convention — it signals this file contains only Griffel style definitions.

---

## 2. File 1: `ComponentName.types.ts`

Defines the TypeScript contract: slots, props, and state.

```typescript
import type { ComponentProps, ComponentState, Slot } from '@fluentui/react-utilities';

// Slots: what sub-elements are customizable
export type ButtonSlots = {
  root: NonNullable<Slot<'button', 'a'>>;  // always required (NonNullable)
  icon?: Slot<'span'>;                      // optional (?)
};

// Props: public API (extends ComponentProps which includes slot shorthand)
export type ButtonProps = ComponentProps<ButtonSlots> & {
  appearance?: 'secondary' | 'primary' | 'outline' | 'subtle' | 'transparent';
  size?: 'small' | 'medium' | 'large';
  iconPosition?: 'before' | 'after';
};

// State: internal shape passed between hook, styles, and render
export type ButtonState = ComponentState<ButtonSlots>
  & Required<Pick<ButtonProps, 'appearance' | 'size' | 'iconPosition'>>
  & {
    iconOnly: boolean;
  };
```

Key patterns:
- `NonNullable<Slot<...>>` for required slots (root is always required)
- `Slot<'span'>?` with `?` for optional slots (icon, prefix, suffix)
- `ComponentState` extends the slots with React-specific wiring

---

## 3. File 2: `useComponentName.ts` (State Hook)

Business logic layer: processes props, sets up slots, computes derived state.

```typescript
import { slot } from '@fluentui/react-utilities';
import type { ButtonProps, ButtonState } from './Button.types';

export const useButton_unstable = (
  props: ButtonProps,
  ref: React.Ref<HTMLButtonElement | HTMLAnchorElement>
): ButtonState => {
  const {
    appearance = 'secondary',
    size = 'medium',
    iconPosition = 'before',
    ...buttonProps
  } = props;

  return {
    // Required: list of HTML element types for each slot
    components: {
      root: 'button',
      icon: 'span',
    },
    // Required slot — always renders
    root: slot.always(
      getNativeElementProps('button', { ref, type: 'button', ...buttonProps }),
      { elementType: 'button' }
    ),
    // Optional slot — only renders if prop provided
    icon: slot.optional(props.icon, { elementType: 'span' }),
    // Derived state
    appearance,
    size,
    iconPosition,
    iconOnly: !props.children && !!props.icon,
  };
};
```

Key APIs:
- `slot.always(props, options)` — slot that always renders (typically `root`)
- `slot.optional(props, options)` — slot that renders only when the prop is provided
- `getNativeElementProps(tagName, props)` — filters HTML-valid props from merged props
- The hook is named with `_unstable` suffix during stabilization

---

## 4. File 3: `useComponentNameStyles.styles.ts` (Griffel Styles)

Note the mandatory `.styles.ts` double extension.

```typescript
import { makeResetStyles, makeStyles, mergeClasses, shorthands } from '@griffel/react';
import { tokens } from '@fluentui/tokens';
import type { ButtonSlots, ButtonState } from './Button.types';

// makeResetStyles: generates a SINGLE atomic CSS class (base reset layer)
// Use for default/base styles
const useRootBaseClassName = makeResetStyles({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontFamily: tokens.fontFamilyBase,
  fontSize: tokens.fontSizeBase300,
  fontWeight: tokens.fontWeightSemibold,
  lineHeight: tokens.lineHeightBase300,
  backgroundColor: tokens.colorNeutralBackground1,
  color: tokens.colorNeutralForeground1,
  borderRadius: tokens.borderRadiusMedium,
  border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
  ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
  ':hover': {
    backgroundColor: tokens.colorNeutralBackground1Hover,
    color: tokens.colorNeutralForeground1Hover,
  },
  ':active': {
    backgroundColor: tokens.colorNeutralBackground1Pressed,
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
});

// makeStyles: variant styles (returns object of class names)
const useRootStyles = makeStyles({
  primary: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    border: 'none',
    ':hover': { backgroundColor: tokens.colorBrandBackgroundHover },
    ':active': { backgroundColor: tokens.colorBrandBackgroundPressed },
  },
  outline: {
    backgroundColor: tokens.colorTransparentBackground,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  subtle: {
    backgroundColor: tokens.colorTransparentBackground,
    border: 'none',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  small: {
    fontSize: tokens.fontSizeBase200,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    minHeight: '24px',
  },
  large: {
    fontSize: tokens.fontSizeBase400,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    minHeight: '40px',
  },
});

// Static class names exported for external CSS targeting
export const buttonClassNames = {
  root: 'fui-Button',
  icon: 'fui-Button__icon',
};

// The styles hook — applied in orchestrator
export const useButtonStyles_unstable = (state: ButtonState): ButtonState => {
  const rootBaseClassName = useRootBaseClassName();
  const rootStyles = useRootStyles();

  state.root.className = mergeClasses(
    buttonClassNames.root,                          // static class (external targeting)
    rootBaseClassName,                              // base reset styles
    state.appearance && rootStyles[state.appearance], // appearance variant
    state.size !== 'medium' && rootStyles[state.size], // size variant
    state.root.className,                           // consumer className LAST (highest priority)
  );

  if (state.icon) {
    state.icon.className = mergeClasses(
      buttonClassNames.icon,
      state.icon.className,
    );
  }

  return state;
};
```

**Key patterns:**
- `makeResetStyles` for base — generates ONE class with full reset
- `makeStyles` for variants — generates per-slot class names
- `mergeClasses` to compose — consumer `className` MUST be last to allow overrides
- Static `buttonClassNames` exports enable external CSS targeting like `.fui-Button { ... }`
- `shorthands.padding/margin/border` for multi-value shorthand properties

---

## 5. File 4: `renderComponentName.tsx` (Pure Render)

The render function is a pure JSX function — no hooks allowed.

```typescript
/** @jsxRuntime automatic */
/** @jsxImportSource @fluentui/react-jsx-runtime */

import { assertSlots } from '@fluentui/react-utilities';
import type { ButtonSlots, ButtonState } from './Button.types';

export const renderButton_unstable = (state: ButtonState): JSX.Element => {
  // assertSlots narrows the state's slot types for type-safe JSX
  // This replaces deprecated getSlots — NEVER use getSlots
  assertSlots<ButtonSlots>(state);

  return (
    <state.root>
      {state.iconPosition !== 'after' && state.icon && <state.icon />}
      {state.root.children}
      {state.iconPosition === 'after' && state.icon && <state.icon />}
    </state.root>
  );
};
```

**Critical:** Both pragma lines are required in EVERY render file:
```typescript
/** @jsxRuntime automatic */
/** @jsxImportSource @fluentui/react-jsx-runtime */
```
The custom JSX factory handles slot prop spreading, ref forwarding, and `as` prop rendering. Missing it causes broken slot behavior that's hard to debug.

**assertSlots vs getSlots:**
- `assertSlots` — current API, provides TypeScript type narrowing
- `getSlots` — **deprecated**, removed in future versions
- Always use `assertSlots`

---

## 6. File 5: `ComponentName.tsx` (Orchestrator)

The public component that ties everything together.

```typescript
import * as React from 'react';
import type { ForwardRefComponent } from '@fluentui/react-utilities';
import { useCustomStyleHook_unstable } from '@fluentui/react-shared-contexts';
import { useButton_unstable } from './useButton';
import { useButtonStyles_unstable } from './useButtonStyles.styles';
import { renderButton_unstable } from './renderButton';
import type { ButtonProps } from './Button.types';

export const Button: ForwardRefComponent<ButtonProps> = React.forwardRef(
  (props, ref) => {
    const state = useButton_unstable(props, ref);    // 1. compute state
    useButtonStyles_unstable(state);                  // 2. apply styles (mutates state.*.className)
    useCustomStyleHook_unstable('useButtonStyles_unstable')(state); // 3. extension point
    return renderButton_unstable(state);              // 4. render
  }
) as ForwardRefComponent<ButtonProps>;

Button.displayName = 'Button';
```

**`useCustomStyleHook_unstable`**: This is the consumer extension point. It allows users to inject additional styles at the orchestrator level via a global registry, without forking the component. The name argument must match the styles hook name.

**`ForwardRefComponent<ButtonProps>`**: Fluent's typed wrapper for `React.forwardRef` that preserves the component's prop types.

---

## 7. Barrel Export (`index.ts`)

```typescript
export { Button } from './Button';
export type { ButtonProps, ButtonSlots, ButtonState } from './Button.types';
export { renderButton_unstable } from './renderButton';
export { useButton_unstable } from './useButton';
export { useButtonStyles_unstable, buttonClassNames } from './useButtonStyles.styles';
```

Always export types separately — consumers of `@fluentui/react-components` receive the public API but internal hooks are also exported for composition patterns.

---

## 8. Slot System

Slots allow consumers to customize sub-elements of a component.

### Defining Slots (in types.ts)
```typescript
type CardSlots = {
  root: NonNullable<Slot<'div'>>;      // required — always renders
  header?: Slot<'div'>;               // optional — renders when prop provided
  footer?: Slot<'div'>;               // optional
  floatingAction?: Slot<'div'>;       // optional
};
```

### Setting Up Slots (in useHook.ts)
```typescript
root: slot.always(props.root ?? {}, { elementType: 'div' }),
header: slot.optional(props.header, { elementType: 'div' }),
footer: slot.optional(props.footer, { elementType: 'div' }),
```

### Consumer Usage
```tsx
// Simple shorthand — children of the slot element
<Card header="My Title" footer={<CardFooter />}>
  Content
</Card>

// Full slot props — any HTML attribute on the slot element
<Card
  header={{ children: 'My Title', className: 'custom-header', onClick: handleClick }}
  footer={{ style: { padding: '16px' }, children: <CardFooter /> }}
>
  Content
</Card>

// Replace slot element type
<Button icon={{ as: 'img', src: '/icon.svg', alt: '' }} />
```

---

## 9. Griffel API Summary

```typescript
import { makeStyles, makeResetStyles, mergeClasses, shorthands } from '@griffel/react';

// makeStyles: variant class names (input: slot → CSS object)
const useStyles = makeStyles({
  root: { display: 'flex', color: tokens.colorNeutralForeground1 },
  primary: { backgroundColor: tokens.colorBrandBackground },
  disabled: { cursor: 'not-allowed', opacity: 0.4 },
});

// makeResetStyles: single class for base/reset styles (no merging overhead)
const useRootBaseClass = makeResetStyles({
  boxSizing: 'border-box',
  margin: '0',
  padding: '0',
});

// mergeClasses: compose multiple Griffel classes
const className = mergeClasses(
  baseClass,           // from makeResetStyles
  styles.root,         // from makeStyles
  isDisabled && styles.disabled,  // conditional
  props.className,     // consumer override (ALWAYS LAST)
);

// shorthands: multi-value properties
shorthands.padding('4px', '8px')         // top-right → padding: '4px' '8px'
shorthands.margin(tokens.spacingVerticalS, tokens.spacingHorizontalM)
shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke1)
shorthands.borderRadius(tokens.borderRadiusMedium)
shorthands.overflow('hidden')
```

**Key properties of Griffel:**
- **Atomic CSS**: each property becomes one atomic rule (max reuse)
- **Zero runtime**: styles extracted at build time (build-time optimization)
- **Token-safe**: TypeScript catches token typos
- **No conflicts**: scoped class name hashing

---

## 10. Complete Minimal Example

A minimal custom Fluent component following all patterns:

```typescript
// Badge.types.ts
import type { ComponentProps, ComponentState, Slot } from '@fluentui/react-utilities';

export type BadgeSlots = {
  root: NonNullable<Slot<'span'>>;
  icon?: Slot<'span'>;
};
export type BadgeProps = ComponentProps<BadgeSlots> & {
  color?: 'brand' | 'danger' | 'warning' | 'success';
  size?: 'small' | 'medium' | 'large';
};
export type BadgeState = ComponentState<BadgeSlots>
  & Required<Pick<BadgeProps, 'color' | 'size'>>;

// useBadge.ts
export const useBadge_unstable = (props: BadgeProps, ref: React.Ref<HTMLSpanElement>): BadgeState => {
  const { color = 'brand', size = 'medium', ...rest } = props;
  return {
    components: { root: 'span', icon: 'span' },
    root: slot.always(getNativeElementProps('span', { ref, ...rest }), { elementType: 'span' }),
    icon: slot.optional(props.icon, { elementType: 'span' }),
    color, size,
  };
};

// useBadgeStyles.styles.ts
export const badgeClassNames = { root: 'fui-Badge', icon: 'fui-Badge__icon' };
export const useBadgeStyles_unstable = (state: BadgeState): BadgeState => {
  // ... makeResetStyles + makeStyles + mergeClasses
  return state;
};

// renderBadge.tsx
/** @jsxRuntime automatic */
/** @jsxImportSource @fluentui/react-jsx-runtime */
import { assertSlots } from '@fluentui/react-utilities';
export const renderBadge_unstable = (state: BadgeState): JSX.Element => {
  assertSlots<BadgeSlots>(state);
  return <state.root>{state.icon && <state.icon />}{state.root.children}</state.root>;
};

// Badge.tsx
export const Badge: ForwardRefComponent<BadgeProps> = React.forwardRef((props, ref) => {
  const state = useBadge_unstable(props, ref);
  useBadgeStyles_unstable(state);
  useCustomStyleHook_unstable('useBadgeStyles_unstable')(state);
  return renderBadge_unstable(state);
}) as ForwardRefComponent<BadgeProps>;
Badge.displayName = 'Badge';
```
