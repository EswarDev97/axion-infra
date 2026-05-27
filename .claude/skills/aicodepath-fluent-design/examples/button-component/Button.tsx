import * as React from 'react';
import type { ForwardRefComponent } from '@fluentui/react-utilities';
import { useCustomStyleHook_unstable } from '@fluentui/react-shared-contexts';
import { useButton_unstable } from './useButton';
import { useButtonStyles_unstable } from './useButtonStyles.styles';
import { renderButton_unstable } from './renderButton';
import type { ButtonProps } from './Button.types';

/**
 * Button — Orchestrator component.
 *
 * The 4-step orchestration pattern (mandatory order):
 * 1. useHook_unstable(props, ref)        — compute state
 * 2. useStyles_unstable(state)           — apply styles (mutates state.*.className)
 * 3. useCustomStyleHook_unstable(name)   — consumer extension point
 * 4. renderComponent_unstable(state)     — pure render
 *
 * ForwardRefComponent<ButtonProps>: Fluent's typed wrapper for React.forwardRef
 * that preserves component prop types for consumers.
 */
export const Button: ForwardRefComponent<ButtonProps> = React.forwardRef(
  (props, ref) => {
    const state = useButton_unstable(props, ref);      // 1. compute state
    useButtonStyles_unstable(state);                    // 2. apply styles
    useCustomStyleHook_unstable('useButtonStyles_unstable')(state); // 3. extension point
    return renderButton_unstable(state);               // 4. render
  },
) as ForwardRefComponent<ButtonProps>;

Button.displayName = 'Button';
