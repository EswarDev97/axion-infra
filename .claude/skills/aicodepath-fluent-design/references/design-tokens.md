# Fluent 2 Design Tokens

> Source: `@fluentui/tokens` v9.x · Verified from `~/workspace/fluentui/packages/tokens/src/`
> Token architecture: 2-layer (global → alias)

---

## 1. Two-Layer Architecture

Fluent 2 uses a strict 2-layer token system. **Components always use alias tokens — never globals.**

```
Layer 1: Global Tokens (raw values — context-agnostic)
  colorGrey14: '#242424'
  colorBrand80: '#0f6cbd'
  fontSizeBase300: '14px'
        │
        ▼  (mapped per theme in themes/webLight.ts, webDark.ts, etc.)
        │
Layer 2: Alias Tokens (semantic meaning — theme-aware CSS custom properties)
  colorNeutralForeground1: var(--colorNeutralForeground1)
  colorBrandBackground:    var(--colorBrandBackground)
  fontSizeBase300:         var(--fontSizeBase300)
```

**Why this matters**: Alias tokens automatically change value when the theme changes (light → dark → high contrast → branded). Components importing globals produce hardcoded values that never adapt.

```typescript
// ✅ Always import from the alias layer
import { tokens } from '@fluentui/tokens';
// or via umbrella:
import { tokens } from '@fluentui/react-components';

color: tokens.colorNeutralForeground1  // adapts to all themes

// ❌ Never import globals directly
import { colorGrey14 } from '@fluentui/tokens/global';
```

---

## 2. Token Categories

### Color Tokens

#### Neutral Backgrounds
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `colorNeutralBackground1` | white | grey[16] | Primary surface (page background) |
| `colorNeutralBackground2` | grey[98] | grey[12] | Secondary surface (card, panel) |
| `colorNeutralBackground3` | grey[96] | grey[8] | Tertiary surface (sidebar) |
| `colorNeutralBackground4` | grey[94] | grey[6] | Quaternary surface |
| `colorNeutralBackgroundInverted` | grey[16] | white | Inverted surfaces |
| `colorNeutralBackground1Hover` | grey[96] | grey[20] | Hover state on background 1 |
| `colorNeutralBackground1Pressed` | grey[94] | grey[24] | Pressed state |
| `colorNeutralBackground1Selected` | grey[92] | grey[22] | Selected state |

#### Neutral Foregrounds (Text & Icons)
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `colorNeutralForeground1` | grey[14] | white | Primary text |
| `colorNeutralForeground2` | grey[26] | grey[84] | Secondary text, placeholder |
| `colorNeutralForeground3` | grey[38] | grey[68] | Tertiary text, disabled label |
| `colorNeutralForegroundDisabled` | grey[74] | grey[44] | Disabled text |
| `colorNeutralForegroundOnBrand` | white | white | Text on brand-colored background |

#### Brand Tokens
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `colorBrandBackground` | brand[80] | brand[70] | Primary brand surface (buttons, links) |
| `colorBrandBackground2` | brand[160] | brand[20] | Subtle brand tint |
| `colorBrandForeground1` | brand[80] | brand[100] | Brand text on neutral background |
| `colorBrandStroke1` | brand[80] | brand[100] | Brand border |
| `colorBrandBackgroundHover` | brand[70] | brand[60] | Hover on brand background |
| `colorBrandBackgroundPressed` | brand[60] | brand[50] | Pressed on brand background |
| `colorBrandBackgroundSelected` | brand[60] | brand[60] | Selected brand state |

#### Status / Semantic Colors
Status colors follow a pattern: `colorStatus{Type}{Role}{N}` where:
- Type: `Danger`, `Warning`, `Success`, `Important`
- Role: `Background`, `Foreground`, `Stroke`, `Border`

```typescript
// Danger (red scale — cranberry)
tokens.colorStatusDangerBackground1   // subtle danger background
tokens.colorStatusDangerForeground1   // danger text
tokens.colorStatusDangerBorderActive  // danger border (form validation)

// Warning (yellow/orange scale)
tokens.colorStatusWarningBackground1
tokens.colorStatusWarningForeground1

// Success (green scale)
tokens.colorStatusSuccessBackground1
tokens.colorStatusSuccessForeground1

// Shadow (elevation)
tokens.colorNeutralShadowAmbient  // rgba(0,0,0,0.12) light / rgba(0,0,0,0.24) dark
tokens.colorNeutralShadowKey       // rgba(0,0,0,0.14) light / rgba(0,0,0,0.28) dark
```

### Spacing Tokens (base unit: 4px)
| Token | Value | Usage |
|-------|-------|-------|
| `spacingHorizontalNone` | 0px | |
| `spacingHorizontalXXS` | 2px | Tight inline spacing |
| `spacingHorizontalXS` | 4px | Icon-to-text gap |
| `spacingHorizontalSNudge` | 6px | Small nudge |
| `spacingHorizontalS` | 8px | Inner padding (small) |
| `spacingHorizontalMNudge` | 10px | Medium nudge |
| `spacingHorizontalM` | 12px | Inner padding (medium) |
| `spacingHorizontalL` | 16px | Inner padding (large) |
| `spacingHorizontalXL` | 20px | Section spacing |
| `spacingHorizontalXXL` | 24px | Large section spacing |
| `spacingHorizontalXXXL` | 32px | Page-level spacing |
| `spacingVertical*` | Same values | Vertical equivalents |

### Typography Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `fontSizeBase100` | 10px | Caption 2 |
| `fontSizeBase200` | 12px | Caption 1 |
| `fontSizeBase300` | 14px | **Body 1 (default)** |
| `fontSizeBase400` | 16px | Subtitle 2 |
| `fontSizeBase500` | 20px | Subtitle 1 |
| `fontSizeBase600` | 24px | Title 3 |
| `fontSizeHero700` | 28px | Title 2 |
| `fontSizeHero800` | 32px | Title 1 |
| `fontSizeHero900` | 40px | Large Title |
| `fontSizeHero1000` | 68px | Display |
| `fontWeightRegular` | 400 | Body text |
| `fontWeightMedium` | 500 | Emphasis |
| `fontWeightSemibold` | 600 | Headings, labels |
| `fontWeightBold` | 700 | Strong emphasis |
| `lineHeightBase300` | 20px | Body 1 line height |
| `fontFamilyBase` | `'Segoe UI', ...system-ui fallbacks` | Primary font |
| `fontFamilyMonospace` | `'Courier New', monospace` | Code font |

### Shadow (Elevation) Tokens
| Token | Use Case |
|-------|----------|
| `shadow2` | Cards, FABs when pressed |
| `shadow4` | Cards, grid/list items |
| `shadow8` | FABs, raised cards, app bars |
| `shadow16` | Callouts, hover cards |
| `shadow28` | Bottom sheets, side navigation, tab bars |
| `shadow64` | Pop-up dialogs, modals |

```typescript
// Usage in Griffel
boxShadow: tokens.shadow4
```

### Stroke (Border) Tokens
| Token | Web Value | Usage |
|-------|-----------|-------|
| `strokeWidthThin` | 1px | Default border |
| `strokeWidthThick` | 2px | Focus indicator |
| `strokeWidthThicker` | 3px | Emphasis border |
| `strokeWidthThickest` | 4px | Prominent border |
| `borderRadiusNone` | 0px | Navigation bars |
| `borderRadiusSmall` | 2px | Badges, small components |
| `borderRadiusMedium` | 4px | **Buttons, inputs (default)** |
| `borderRadiusLarge` | 8px | Large buttons |
| `borderRadiusXLarge` | 12px | Bottom sheets, popovers |
| `borderRadiusCircular` | 9999px | Circular avatars, pills |

### Duration Tokens (from `@fluentui/react-motion`)
| Token | Value | Usage |
|-------|-------|-------|
| `motionTokens.durationUltraFast` | 50ms | Micro-interactions |
| `motionTokens.durationFast` | 100ms | Quick transitions |
| `motionTokens.durationNormal` | 200ms | **Standard (default)** |
| `motionTokens.durationGentle` | 250ms | Gentle transitions |
| `motionTokens.durationSlow` | 300ms | Deliberate transitions |
| `motionTokens.durationSlower` | 400ms | Emphasized transitions |

### Easing Curve Tokens
| Token | CSS Equivalent | Usage |
|-------|---------------|-------|
| `motionTokens.curveDecelerateMid` | ease-out | **Entering elements** |
| `motionTokens.curveAccelerateMid` | ease-in | **Exiting elements** |
| `motionTokens.curveEasyEase` | ease-in-out | **Movement within screen** |
| `motionTokens.curveLinear` | linear | Rotations only |

---

## 3. Theme Factory Functions

### Built-in Themes
```typescript
import {
  webLightTheme,
  webDarkTheme,
  webHighContrastTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
} from '@fluentui/react-components';
```

### Creating a Custom Brand Theme
Fluent's `createLightTheme` and `createDarkTheme` accept a `BrandVariants` object with 16 shades at indices 10–160:

```typescript
import { createLightTheme, createDarkTheme, BrandVariants } from '@fluentui/react-components';

// Brand palette: 16 shades, index 10 (lightest) to 160 (darkest)
// Shade 80 becomes the primary brand color (colorBrandBackground)
const myBrand: BrandVariants = {
  10:  '#f3f9fd',
  20:  '#daedfb',
  30:  '#b8dcf8',
  40:  '#88c3f0',
  50:  '#62aae6',
  60:  '#3d91db',
  70:  '#1f78ce',
  80:  '#0f6cbd',  // ← primary brand (buttons, selected states)
  90:  '#0a5ba8',
  100: '#074b91',
  110: '#053d7a',
  120: '#032f63',
  130: '#02234d',
  140: '#011839',
  150: '#010f27',
  160: '#000818',
};

const myLightTheme = createLightTheme(myBrand);
const myDarkTheme = createDarkTheme(myBrand);

// Usage
<FluentProvider theme={myLightTheme}>
  <App />
</FluentProvider>
```

---

## 4. FluentProvider: CSS Custom Property Injection

FluentProvider converts the theme object into CSS custom properties injected into a `<div>`:

```html
<!-- FluentProvider renders this -->
<div class="fui-FluentProvider" style="
  --colorNeutralForeground1: #242424;
  --colorBrandBackground: #0f6cbd;
  --fontSizeBase300: 14px;
  ...
">
  <!-- App content -->
</div>
```

Components reference these custom properties via the `tokens` object, which contains `var(--tokenName)` references.

### Root Setup
```typescript
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

function App() {
  return (
    <FluentProvider theme={webLightTheme} dir="ltr" lang="en-US">
      <YourApp />
    </FluentProvider>
  );
}
```

### Nested Provider (Scoped Theme Override)
Create a dark panel inside a light app:
```typescript
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';

function App() {
  return (
    <FluentProvider theme={webLightTheme}>
      <main>
        <LightContent />
        {/* Scoped dark override — only affects children */}
        <FluentProvider theme={webDarkTheme}>
          <SidePanel />
        </FluentProvider>
      </main>
    </FluentProvider>
  );
}
```

---

## 5. Token Naming Conventions

Alias token names follow the pattern:
`color{Category}{Role}{Variant}{N}`

- **Category**: `Neutral`, `Brand`, `Status{Type}`
- **Role**: `Background`, `Foreground`, `Stroke`, `Border`, `Shadow`
- **Variant**: `Hover`, `Pressed`, `Selected`, `Disabled`, `Inverted`, `OnBrand`
- **N**: `1`, `2`, `3`, `4` (from darkest to lighter usage in the context)

Examples:
- `colorNeutralBackground1` — primary neutral surface
- `colorNeutralForeground2` — secondary text
- `colorBrandBackground` — primary brand fill
- `colorBrandBackgroundHover` — hover on brand fill
- `colorStatusDangerBorderActive` — active danger border (error form field)

---

## 6. Common Token Quick Reference

Most-used tokens for everyday component styling:

```typescript
// Text
tokens.colorNeutralForeground1      // Primary text
tokens.colorNeutralForeground2      // Secondary / placeholder
tokens.colorNeutralForegroundDisabled // Disabled text

// Surfaces
tokens.colorNeutralBackground1      // Page background
tokens.colorNeutralBackground2      // Card / panel background

// Brand
tokens.colorBrandBackground         // Primary button background
tokens.colorBrandForeground1        // Brand-colored text / links
tokens.colorNeutralForegroundOnBrand // Text ON brand-colored surfaces

// Borders
tokens.colorNeutralStroke1          // Default border
tokens.colorNeutralStrokeAccessible // Accessible contrast border

// Status
tokens.colorStatusDangerForeground1 // Error text / icon
tokens.colorStatusWarningForeground1 // Warning text / icon
tokens.colorStatusSuccessForeground1 // Success text / icon

// Spacing (most common)
tokens.spacingHorizontalM           // 12px — default inline padding
tokens.spacingHorizontalL           // 16px — larger padding
tokens.spacingVerticalS             // 8px — vertical padding
tokens.spacingVerticalM             // 12px — vertical padding

// Typography
tokens.fontSizeBase300              // 14px — body default
tokens.fontWeightSemibold           // 600 — headings
tokens.lineHeightBase300            // 20px — body line height

// Elevation
tokens.shadow4                      // Card shadow
tokens.shadow8                      // FAB / raised card shadow
```
