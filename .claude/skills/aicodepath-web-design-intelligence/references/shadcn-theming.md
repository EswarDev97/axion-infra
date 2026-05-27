# shadcn/ui + Tailwind Theming Pattern

Canonical shadcn theming pattern as used in production at **21st.dev** — a component registry
built on shadcn/ui and verified via source inspection on 2026-04-10.

**Source files referenced** (from `/home/faizal/workspace/21st/`):
- `apps/web/tailwind.config.js` (lines 8-260) — Tailwind config with shadcn extensions
- `apps/web/app/globals.css` (lines 234-318) — CSS variable definitions for `:root` and `.dark`
- `apps/web/components/ui/button.tsx` (line 13) — live usage of gradient HSL variables

---

## Why HSL Variables Instead of Hex?

Shadcn uses `hsl(var(--name))` with **space-separated HSL values** (no `hsl()` wrapper in the
variable definition, no commas). The pattern enables:
- **Opacity modulation**: `bg-primary/50` works because Tailwind appends the alpha to `hsl(...)`
- **Runtime theme switching**: change CSS variables, and every `hsl(var(--primary))` reference updates without re-compiling
- **One source of truth**: `--primary` is defined once and consumed everywhere

**Canonical format** (21st `globals.css:242`):
```css
:root {
  --primary: 210 83% 53%;              /* space-separated HSL — no commas, no hsl() wrapper */
}

/* Consumed as */
.button {
  background: hsl(var(--primary));      /* hsl() wraps the variable */
  background: hsl(var(--primary) / 0.5); /* Opacity via slash syntax */
}
```

---

## Full Variable Catalog (from 21st `globals.css:234-318`)

```css
@layer base {
  :root {
    /* Page surface */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;

    /* Card surface */
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;

    /* Popover / floating surface */
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;

    /* Primary brand */
    --primary: 210 83% 53%;
    --primary-foreground: 0 0% 98%;

    /* Gradient tokens — verified in 21st button.tsx:13 */
    --primary-gradient-start: 210 83% 53%;
    --primary-gradient-end: 217 77% 49%;
    --mono-gradient-start: 0 0% 0%;
    --mono-gradient-end: 0 0% 45%;

    /* Secondary / muted / accent */
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;

    /* Semantic — destructive */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 100%;

    /* UI chrome */
    --border: 240 5.9% 90%;
    --input: 240 4.9% 83.9%;
    --ring: 240 5% 64.9%;
    --kbd: 240 4.8% 95.9%;            /* Keyboard shortcut badge */
    --alpha-300: 240 5% 84%;          /* Alpha overlay */

    /* Charts — 5 series, for Chart component */
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;

    /* Layout */
    --radius: 0.5rem;

    /* Sidebar — separate token set for shell chrome */
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;

    /* Decorative gradients */
    --border-gradient-start: rgba(255, 255, 255, 0.01);
    --border-gradient-mid: rgba(0, 0, 0, 0.5);
    --border-gradient-end: rgba(255, 255, 255, 0.01);
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 240 4.8% 95.9%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    /* ... full dark override — every :root token has a .dark counterpart */
    --border-gradient-mid: rgba(255, 255, 255, 0.8);
  }
}
```

---

## Tailwind Config Pattern (from 21st `tailwind.config.js:8-260`)

```js
// tailwind.config.js
module.exports = {
  darkMode: ["class"],                // Class-based (.dark on <html>) — NOT media query
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          accent: "hsl(var(--sidebar-accent))",
          // ... 6 total sidebar variables
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",                      // All radii derive from --radius
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Geist", "Geist Fallback", "sans-serif"],
        mono: ["var(--font-geist-mono)"],
      },
      boxShadow: {
        base: "0 0 0 1px hsl(var(--alpha-300)), 0 1px 2px hsl(var(--alpha-300))",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-custom": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.9" },
        },
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" },
        },
        "success-ring": {
          "0%": { outline: "2px solid hsl(var(--primary))" },
          "100%": { outline: "2px solid transparent" },
        },
        "spin-around": {
          "0%": { transform: "translateZ(0) rotate(0)" },
          "100%": { transform: "translateZ(0) rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-custom 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite",
        "success-ring": "success-ring 850ms ease-out forwards",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),               // Shadcn dependency
    require("@tailwindcss/typography"),
  ],
}
```

---

## Gradient Variable Usage (verified in 21st `button.tsx:13`)

```jsx
// button.tsx CVA variant (line 13)
default:
  "from-[hsl(var(--primary-gradient-start))] to-[hsl(var(--primary-gradient-end))] " +
  "border-[hsl(var(--primary-gradient-start))] " +
  "focus-visible:outline-[hsl(var(--primary-gradient-start))]"
```

The `[hsl(...)]` arbitrary-value syntax is how Tailwind consumes CSS variables that aren't
mapped in `tailwind.config.js`. For tokens you'll use frequently, add them to the colors
extension; for one-off decorative tokens, the arbitrary-value syntax keeps the config lean.

---

## Dark Mode Toggle Pattern

21st uses **class-based** dark mode (`darkMode: ["class"]`), which means:

```jsx
// Toggle by adding/removing .dark on <html>
document.documentElement.classList.toggle("dark")
```

Prefer this over `darkMode: "media"` because:
1. User can override system preference
2. Server-side rendering with saved user preference (e.g., from cookie) is straightforward
3. Testing light/dark in Storybook is trivial (toggle the class)

---

## Adding a New Style (e.g., Glassmorphism) to Shadcn Theme

When grafting a trend style onto shadcn, extend — don't replace:

```css
@layer base {
  :root {
    /* Keep all shadcn defaults */
    --background: 230 35% 96%;          /* Override background for the trend */
    --foreground: 224 71% 4%;

    /* Add style-specific extensions */
    --glass-bg: 0 0% 100% / 0.15;
    --glass-border: 0 0% 100% / 0.2;
  }
}

@layer utilities {
  /* Add style-specific utility classes */
  .glass {
    backdrop-filter: blur(15px);
    background: hsl(var(--glass-bg));
    border: 1px solid hsl(var(--glass-border));
  }
}
```

The key insight: **shadcn's `bg-primary`, `text-foreground`, `border-border` utilities keep
working** after you add a style overlay. You gain the style without losing shadcn's semantic
layer. This is why every per-style scaffold in `references/styles/` extends shadcn rather than
inventing a parallel system.
