import type { ComponentProps, ComponentState, Slot } from '@fluentui/react-utilities';

// Slots: which sub-elements are customizable
export type ButtonSlots = {
  root: NonNullable<Slot<'button', 'a'>>;  // required — always renders
  icon?: Slot<'span'>;                      // optional — renders only when icon prop provided
};

// Props: public API (ComponentProps includes slot shorthand)
export type ButtonProps = ComponentProps<ButtonSlots> & {
  /** Controls visual weight of the button */
  appearance?: 'secondary' | 'primary' | 'outline' | 'subtle' | 'transparent';
  /** Controls button size */
  size?: 'small' | 'medium' | 'large';
  /** Position of the icon relative to label */
  iconPosition?: 'before' | 'after';
};

// State: internal shape passed between hook, styles, and render
export type ButtonState = ComponentState<ButtonSlots>
  & Required<Pick<ButtonProps, 'appearance' | 'size' | 'iconPosition'>>
  & {
    /** True when icon is present and no children text */
    iconOnly: boolean;
  };
