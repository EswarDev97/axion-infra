import { makeResetStyles, makeStyles, mergeClasses, shorthands } from '@griffel/react';
import { tokens } from '@fluentui/tokens';
import type { ButtonSlots, ButtonState } from './Button.types';

// Static class names for external CSS targeting (.fui-Button { ... })
export const buttonClassNames: Record<keyof ButtonSlots, string> = {
  root: 'fui-Button',
  icon: 'fui-Button__icon',
};

// makeResetStyles: generates a SINGLE atomic CSS class (base reset layer)
// Use for default/base styles — avoids merging overhead
const useRootBaseClassName = makeResetStyles({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontFamily: tokens.fontFamilyBase,
  fontSize: tokens.fontSizeBase300,      // 14px
  fontWeight: tokens.fontWeightSemibold, // 600
  lineHeight: tokens.lineHeightBase300,  // 20px
  minWidth: '96px',
  minHeight: '32px',
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
  ':focus-visible': {
    outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`,
    outlineOffset: '2px',
  },
  // Required: respect reduced motion
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
});

// makeStyles: variant styles (returns object of class name functions)
const useRootStyles = makeStyles({
  // Appearance variants
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
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStrokeAccessible}`,
    },
  },
  subtle: {
    backgroundColor: tokens.colorTransparentBackground,
    border: 'none',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  transparent: {
    backgroundColor: tokens.colorTransparentBackground,
    border: 'none',
    color: tokens.colorNeutralForeground2,
    ':hover': {
      backgroundColor: tokens.colorTransparentBackgroundHover,
      color: tokens.colorNeutralForeground2Hover,
    },
  },

  // Size variants
  small: {
    fontSize: tokens.fontSizeBase200, // 12px
    minWidth: '64px',
    minHeight: '24px',
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
  },
  large: {
    fontSize: tokens.fontSizeBase400, // 16px
    minHeight: '40px',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
});

const useIconStyles = makeStyles({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px', // icon size
  },
  before: { marginRight: tokens.spacingHorizontalXS },
  after: { marginLeft: tokens.spacingHorizontalXS },
});

/**
 * useButtonStyles_unstable — Applies Griffel styles to ButtonState.
 * Mutates state.root.className and state.icon.className.
 */
export const useButtonStyles_unstable = (state: ButtonState): ButtonState => {
  const rootBaseClassName = useRootBaseClassName();
  const rootStyles = useRootStyles();
  const iconStyles = useIconStyles();

  // mergeClasses: consumer className MUST be last (highest priority override)
  state.root.className = mergeClasses(
    buttonClassNames.root,                                        // static class (external targeting)
    rootBaseClassName,                                            // base reset styles
    state.appearance !== 'secondary' && rootStyles[state.appearance], // appearance variant
    state.size !== 'medium' && rootStyles[state.size],            // size variant
    state.root.className,                                         // consumer override — always last
  );

  if (state.icon) {
    state.icon.className = mergeClasses(
      buttonClassNames.icon,
      iconStyles.base,
      state.iconPosition === 'before' ? iconStyles.before : iconStyles.after,
      state.icon.className,
    );
  }

  return state;
};
