import * as React from 'react';
import { getNativeElementProps, slot } from '@fluentui/react-utilities';
import type { ButtonProps, ButtonState } from './Button.types';

/**
 * useButton_unstable — State hook for Button.
 * Processes props, sets up slots, computes derived state.
 * _unstable suffix indicates hook signature may change during stabilization.
 */
export const useButton_unstable = (
  props: ButtonProps,
  ref: React.Ref<HTMLButtonElement | HTMLAnchorElement>,
): ButtonState => {
  const {
    appearance = 'secondary',
    size = 'medium',
    iconPosition = 'before',
    ...buttonProps
  } = props;

  return {
    // Required: list of element types for each slot (used by assertSlots)
    components: {
      root: 'button',
      icon: 'span',
    },

    // slot.always: always renders (root is always required)
    root: slot.always(
      getNativeElementProps('button', { ref, type: 'button', ...buttonProps }),
      { elementType: 'button' },
    ),

    // slot.optional: only renders when the prop is provided
    icon: slot.optional(props.icon, { elementType: 'span' }),

    // Derived state
    appearance,
    size,
    iconPosition,
    iconOnly: !props.children && !!props.icon,
  };
};
