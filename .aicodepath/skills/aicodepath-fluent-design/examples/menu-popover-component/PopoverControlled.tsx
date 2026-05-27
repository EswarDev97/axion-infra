import * as React from 'react';
import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalM,
    maxWidth: '300px',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'flex-end',
  },
});

/**
 * PopoverControlled — Controlled popover with custom positioning.
 *
 * vs Tooltip: Tooltip for unstructured plain text only.
 * vs Dialog: Dialog for complex layouts that block the page.
 * Popover: non-essential contextual info with structured or interactive content.
 *
 * positioning prop: position ('above'|'below'|'before'|'after') + align ('start'|'center'|'end')
 *
 * Accessibility:
 * - Do not nest popovers
 * - trapFocus sets aria-hidden=true on parent (use for interactive popovers)
 * - Never put essential task content in a popover
 */
export const PopoverControlled: React.FC = () => {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(e, data) => setOpen(data.open)}
      positioning={{ position: 'above', align: 'start' }}
      trapFocus  // traps focus inside for interactive content
    >
      <PopoverTrigger disableButtonEnhancement>
        <Button appearance="outline">More info</Button>
      </PopoverTrigger>

      <PopoverSurface>
        <div className={styles.surface}>
          <Text weight="semibold">About design tokens</Text>
          <Text>
            Fluent 2 uses a 2-layer token system. Components always reference
            alias tokens — never global tokens — so they adapt automatically
            to light, dark, and high-contrast themes.
          </Text>
          <div className={styles.actions}>
            <Button
              appearance="subtle"
              size="small"
              onClick={() => setOpen(false)}
            >
              Dismiss
            </Button>
            <Button appearance="primary" size="small">
              Learn more
            </Button>
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
