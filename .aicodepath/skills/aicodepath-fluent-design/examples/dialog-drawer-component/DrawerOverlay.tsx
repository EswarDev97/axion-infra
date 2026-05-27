import * as React from 'react';
import {
  Button,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
  },
  footer: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    // Primary button in footer aligns to the left
    justifyContent: 'flex-start',
  },
});

/**
 * DrawerOverlay — Modal overlay drawer from the right edge.
 *
 * OverlayDrawer: blocks and covers main content (modal).
 * InlineDrawer: non-blocking; both drawer and main content remain interactive.
 *
 * Key props:
 * - position: 'start' | 'end' | 'bottom' (default: 'end' = right)
 * - size: 'small' | 'medium' | 'large' | 'full' (default: 'small')
 * - open/onOpenChange: controlled open state
 *
 * Accessibility: Focus enters drawer when opened; returns to trigger on close.
 */
export const DrawerOverlay: React.FC = () => {
  const styles = useStyles();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button appearance="primary" onClick={() => setIsOpen(true)}>
        Open settings
      </Button>

      <OverlayDrawer
        position="end"   // slides in from the right
        size="medium"
        open={isOpen}
        onOpenChange={(_, data) => setIsOpen(data.open)}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                onClick={() => setIsOpen(false)}
                aria-label="Close settings"
              />
            }
          >
            Settings
          </DrawerHeaderTitle>
        </DrawerHeader>

        <DrawerBody className={styles.body}>
          <p>Configure your preferences here.</p>
          <p>Overlay drawers block and disable the main content area.</p>
          <p>Use InlineDrawer when main content should remain interactive.</p>
        </DrawerBody>

        <DrawerFooter className={styles.footer}>
          {/* Primary button in footer aligns left */}
          <Button appearance="primary" onClick={() => setIsOpen(false)}>
            Save changes
          </Button>
          <Button appearance="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </OverlayDrawer>
    </>
  );
};
