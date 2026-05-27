import * as React from 'react';
import {
  BrandVariants,
  FluentProvider,
  Theme,
  createDarkTheme,
  createLightTheme,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

/**
 * custom-theme.tsx — Custom brand theme with 16-shade palette.
 *
 * createLightTheme / createDarkTheme accept a BrandVariants object:
 * - 16 shades at indices 10 (lightest) through 160 (darkest)
 * - Shade 80 becomes the primary brand color (colorBrandBackground)
 * - Used for: buttons, selected states, links, focus indicators
 *
 * The token names stay the same — only the resolved CSS custom property
 * values change. Components using tokens.colorBrandBackground automatically
 * pick up the custom brand color.
 */

// Define a custom brand palette — 16 shades from lightest (10) to darkest (160)
// Replace these with your product's actual brand color scale
const myBrand: BrandVariants = {
  10:  '#f0f9ff',  // lightest tint
  20:  '#d6eeff',
  30:  '#acd8fd',
  40:  '#7bbdf9',
  50:  '#50a1f4',
  60:  '#2985e8',
  70:  '#1170d6',
  80:  '#0f6cbd',  // PRIMARY — maps to colorBrandBackground
  90:  '#0a5ba8',
  100: '#074b91',
  110: '#053d7a',
  120: '#032f63',
  130: '#02234d',
  140: '#011839',
  150: '#010f27',
  160: '#000818',  // darkest shade
};

// Create both themes from the same brand palette
export const myLightTheme: Theme = createLightTheme(myBrand);
export const myDarkTheme: Theme = createDarkTheme(myBrand);

// Usage
export const CustomThemeApp: React.FC = () => {
  const [isDark, setIsDark] = React.useState(false);

  return (
    <FluentProvider
      theme={isDark ? myDarkTheme : myLightTheme}
      dir="ltr"
      lang="en-US"
    >
      <CustomThemeDemo isDark={isDark} onToggle={() => setIsDark(d => !d)} />
    </FluentProvider>
  );
};

const useStyles = makeStyles({
  root: {
    padding: tokens.spacingVerticalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    background: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
  },
  swatch: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  colorBox: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusSmall,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
  },
});

const CustomThemeDemo: React.FC<{ isDark: boolean; onToggle: () => void }> = ({ isDark, onToggle }) => {
  const styles = useStyles();

  // All buttons automatically use the custom brand color via tokens.colorBrandBackground
  return (
    <div className={styles.root}>
      <h2>Custom brand theme</h2>
      <p>
        The brand palette's shade 80 ({myBrand[80]}) is now
        tokens.colorBrandBackground — used automatically by primary buttons,
        selected states, links, and focus indicators.
      </p>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button appearance="primary">Primary button</Button>
        <Button appearance="outline">Outline button</Button>
        <Button appearance="subtle">Subtle button</Button>
      </div>

      <Button appearance="secondary" onClick={onToggle}>
        Switch to {isDark ? 'light' : 'dark'} theme
      </Button>
    </div>
  );
};
