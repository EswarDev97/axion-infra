import * as React from 'react';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  webHighContrastTheme,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
  },
  section: {
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    background: tokens.colorNeutralBackground1,
  },
});

/**
 * ProviderSetup — Demonstrates FluentProvider configuration.
 *
 * FluentProvider is MANDATORY at the app root.
 * Without it, tokens won't resolve → blank/broken styles.
 *
 * Required props:
 * - theme: the theme object (webLightTheme, webDarkTheme, etc.)
 * - dir: 'ltr' | 'rtl' — for correct directional layout
 * - lang: BCP 47 language tag — for correct font rendering
 *
 * Nested providers enable scoped theme overrides (e.g., dark panel in light app).
 */

// Root app setup (the standard pattern)
export const AppRoot: React.FC = () => {
  return (
    <FluentProvider theme={webLightTheme} dir="ltr" lang="en-US">
      <YourApp />
    </FluentProvider>
  );
};

// Scoped dark override inside a light app
export const ScopedThemeOverride: React.FC = () => {
  return (
    <FluentProvider theme={webLightTheme} dir="ltr" lang="en-US">
      <MainContent />
      {/* Only affects children — rest of app stays light */}
      <FluentProvider theme={webDarkTheme}>
        <SidePanel />
      </FluentProvider>
    </FluentProvider>
  );
};

// Available built-in themes
export const ThemeShowcase: React.FC = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'hc'>('light');

  const themeMap = {
    light: webLightTheme,
    dark: webDarkTheme,
    hc: webHighContrastTheme,
  };

  return (
    <FluentProvider theme={themeMap[theme]} dir="ltr" lang="en-US">
      <InnerContent onThemeChange={setTheme} currentTheme={theme} />
    </FluentProvider>
  );
};

// Placeholder components for illustration
const YourApp: React.FC = () => <div>Your app here</div>;
const MainContent: React.FC = () => <div>Main light content</div>;
const SidePanel: React.FC = () => <div>Dark side panel</div>;
const InnerContent: React.FC<{
  onThemeChange: (t: 'light' | 'dark' | 'hc') => void;
  currentTheme: string;
}> = ({ onThemeChange, currentTheme }) => {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <p>Current theme: {currentTheme}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={() => onThemeChange('light')} appearance={currentTheme === 'light' ? 'primary' : 'secondary'}>Light</Button>
        <Button onClick={() => onThemeChange('dark')} appearance={currentTheme === 'dark' ? 'primary' : 'secondary'}>Dark</Button>
        <Button onClick={() => onThemeChange('hc')} appearance={currentTheme === 'hc' ? 'primary' : 'secondary'}>High contrast</Button>
      </div>
    </div>
  );
};
