/** @jsxRuntime automatic */
/** @jsxImportSource @fluentui/react-jsx-runtime */

// Both pragma lines are REQUIRED in every render*.tsx file.
// The custom JSX factory handles: slot prop spreading, ref forwarding, `as` prop rendering.
// Missing it causes silently broken slot behavior.

import { assertSlots } from '@fluentui/react-utilities';
import type { ButtonSlots, ButtonState } from './Button.types';

/**
 * renderButton_unstable — Pure render function for Button.
 * No hooks allowed here — only assertSlots + JSX.
 *
 * assertSlots replaces deprecated getSlots — provides TypeScript type narrowing.
 * NEVER use getSlots (removed in v10).
 */
export const renderButton_unstable = (state: ButtonState): JSX.Element => {
  // assertSlots narrows the state's slot types for type-safe JSX usage
  assertSlots<ButtonSlots>(state);

  return (
    <state.root>
      {state.iconPosition !== 'after' && state.icon && <state.icon />}
      {state.root.children}
      {state.iconPosition === 'after' && state.icon && <state.icon />}
    </state.root>
  );
};
