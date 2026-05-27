import * as React from 'react';
import {
  Button,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  InlineDrawer,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '400px',
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  drawer: {
    // InlineDrawer renders in document flow — no Portal
    borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
  },
  main: {
    flex: 1,
    padding: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
});

/**
 * DrawerInline — Non-blocking inline drawer (side panel).
 *
 * InlineDrawer: renders in document flow (no Portal).
 * Both the drawer and main content remain interactive simultaneously.
 * Use for: navigation panels, filter panels, detail panes.
 *
 * vs OverlayDrawer: OverlayDrawer uses a Portal + backdrop; InlineDrawer does not.
 */
export const DrawerInline: React.FC = () => {
  const styles = useStyles();
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className={styles.root}>
      <InlineDrawer
        className={styles.drawer}
        open={isOpen}
        position="start"  // left side
      >
        <DrawerHeader>
          <DrawerHeaderTitle>Navigation</DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <nav>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li>Dashboard</li>
              <li>Projects</li>
              <li>Settings</li>
            </ul>
          </nav>
        </DrawerBody>
      </InlineDrawer>

      <main className={styles.main}>
        <Button
          appearance="subtle"
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
        >
          {isOpen ? 'Collapse navigation' : 'Expand navigation'}
        </Button>
        <p>Main content area. Remains fully interactive when InlineDrawer is open.</p>
        <p>This contrasts with OverlayDrawer which blocks this area.</p>
      </main>
    </div>
  );
};
