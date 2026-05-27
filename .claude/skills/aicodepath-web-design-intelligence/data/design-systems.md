# Design Systems Database

## Visual Styles

### Glassmorphism
- **Description**: Frosted-glass panels with blur, transparency, and layered backgrounds
- **CSS**: `backdrop-filter: blur(12px); background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);`
- **Best for**: SaaS dashboards, fintech, modern landing pages, music/media apps
- **Don't**: Use on busy backgrounds without sufficient blur; skip the border (elements vanish)
- **Dark variant**: `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);`

### Neumorphism (Soft UI)
- **Description**: Soft shadows creating raised/recessed elements from a flat surface
- **CSS**: `background: #e0e5ec; border-radius: 16px; box-shadow: 8px 8px 16px #b8bec7, -8px -8px 16px #ffffff;`
- **Inset variant**: `box-shadow: inset 8px 8px 16px #b8bec7, inset -8px -8px 16px #ffffff;`
- **Best for**: Wellness apps, smart home controls, music players, settings panels
- **Don't**: Use for text-heavy interfaces; avoid low-contrast text on neumorphic surfaces
- **Accessibility warning**: Requires careful contrast management — severity HIGH

### Claymorphism
- **Description**: Soft, inflated 3D elements with pastel colors and dual shadows
- **CSS**: `background: #f4c8db; border-radius: 24px; box-shadow: 8px 8px 0 #e0a8c0, inset -4px -4px 0 rgba(255,255,255,0.4); border: 2px solid rgba(255,255,255,0.3);`
- **Best for**: Children's apps, gamified UIs, creative tools, playful landing pages
- **Don't**: Use for enterprise/B2B products; avoid in fintech or healthcare

### Neubrutalism
- **Description**: Bold borders, hard shadows, raw typography, high contrast
- **CSS**: `background: #ffe156; border: 3px solid #000; border-radius: 0; box-shadow: 6px 6px 0 #000; font-weight: 900;`
- **Best for**: Creative agencies, portfolio sites, indie products, personal brands
- **Don't**: Use for conservative industries (banking, legal, healthcare)

### Brutalism
- **Description**: Raw, unpolished aesthetic; monospace fonts, minimal decoration, visible grid
- **CSS**: `font-family: "Space Mono", monospace; border: 2px solid currentColor; background: transparent;`
- **Best for**: Experimental art, developer tools, cultural institutions, editorial
- **Don't**: Use for mass-market consumer products

### Minimalism (Swiss)
- **Description**: Maximum whitespace, restrained palette, perfect typography, grid precision
- **CSS**: `max-width: 680px; margin: 0 auto; line-height: 1.7; letter-spacing: -0.02em;`
- **Best for**: Editorial, luxury brands, portfolios, documentation, blogs
- **Don't**: Confuse with "lazy" — minimalism requires obsessive precision

### Bento Grid
- **Description**: Asymmetric grid cards inspired by Japanese bento boxes; mixed sizes, clean borders
- **CSS**: `display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; grid-auto-rows: minmax(180px, auto);`
- **Best for**: Feature showcases, dashboards, product pages, about pages
- **Don't**: Make all cards same size (defeats the purpose)

### Dark Mode Premium
- **Description**: Rich dark backgrounds (#0a0a0a to #1a1a2e) with luminous accents
- **CSS**: `background: #0f0f11; color: #e4e4e7; --accent: #818cf8;`
- **Best for**: Fintech, developer tools, SaaS, gaming, media
- **Don't**: Use pure black (#000) — use very dark grays; ensure sufficient contrast for body text

### Skeuomorphism (Modern)
- **Description**: Realistic textures and materials adapted for modern sensibilities
- **Best for**: AR/VR interfaces, productivity tools, music apps, nostalgic products
- **Don't**: Go full pre-iOS-7 leather texture — keep it refined

### Material Design 3
- **Description**: Google's design system with dynamic color, tonal surfaces, and motion
- **CSS**: Surface tones from `#1C1B1F` (dark) to `#FFFBFE` (light), `border-radius: 16px`, elevation via tonal shift not shadow
- **Best for**: Android apps, cross-platform products, enterprise tools
- **Don't**: Mix with iOS-specific patterns in the same interface

### Art Deco / Geometric
- **Description**: Bold geometric shapes, gold accents, symmetrical layouts, decorative borders
- **Best for**: Luxury brands, fashion, hotels, events, high-end restaurants
- **Accent colors**: Gold (#C9A84C), champagne (#F7E7CE), obsidian (#0B0B0B)

### Y2K / Retro-Futurism
- **Description**: Chrome gradients, bubble fonts, iridescent colors, nostalgic digital aesthetics
- **Best for**: Fashion brands targeting Gen Z, music, creative agencies, pop culture
- **Palette**: Hot pink (#FF69B4), electric blue (#00D4FF), chrome silver (#C0C0C0)

### Cyberpunk / Neon
- **Description**: Dark backgrounds with neon glows, scanline effects, monospace type
- **CSS**: `text-shadow: 0 0 10px #0ff, 0 0 40px #0ff; background: #0a001a;`
- **Best for**: Gaming, VR/AR, creative tech, nightlife, music
- **Palette**: Neon cyan (#00FFE0), magenta (#FF00FF), dark (#0a001a)

### Editorial / Magazine
- **Description**: Large typography, asymmetric layouts, strong hierarchy, image-led design
- **Best for**: News, blogs, fashion, cultural institutions, creative agencies
- **Typography**: Display serif + clean sans-serif body

### Organic / Biomorphic
- **Description**: Flowing shapes, natural curves, earth tones, inspired by nature
- **CSS**: `border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;` (blob shapes)
- **Best for**: Wellness, sustainability, food/agriculture, natural products

---

## Industry Color Palettes

### SaaS (General)
primary: #2563EB, secondary: #3B82F6, cta: #F97316, background: #F8FAFC, text: #1E293B, border: #E2E8F0

### SaaS (Dark)
primary: #818CF8, secondary: #6366F1, cta: #F59E0B, background: #0F172A, text: #E2E8F0, border: #1E293B

### E-commerce (Fashion)
primary: #059669, secondary: #10B981, cta: #F97316, background: #ECFDF5, text: #064E3B, border: #A7F3D0

### E-commerce (Luxury)
primary: #1C1917, secondary: #44403C, cta: #CA8A04, background: #FAFAF9, text: #0C0A09, border: #D6D3D1

### E-commerce (General)
primary: #7C3AED, secondary: #8B5CF6, cta: #EF4444, background: #FAF5FF, text: #1E1B4B, border: #DDD6FE

### Fintech / Crypto
primary: #6366F1, secondary: #818CF8, cta: #F59E0B, background: #0F172A, text: #F8FAFC, border: #334155

### Fintech (Banking)
primary: #1E40AF, secondary: #3B82F6, cta: #059669, background: #F0F9FF, text: #1E3A5F, border: #BFDBFE

### Healthcare
primary: #0891B2, secondary: #22D3EE, cta: #059669, background: #ECFEFF, text: #164E63, border: #A5F3FC

### Healthcare (Dark)
primary: #06B6D4, secondary: #22D3EE, cta: #10B981, background: #0C1222, text: #E0F2FE, border: #1E3A5F

### Restaurant / Food
primary: #DC2626, secondary: #F87171, cta: #F59E0B, background: #FEF2F2, text: #7F1D1D, border: #FECACA

### Restaurant (Premium)
primary: #78350F, secondary: #A16207, cta: #B45309, background: #FFFBEB, text: #451A03, border: #FDE68A

### Fitness / Wellness
primary: #7C3AED, secondary: #A78BFA, cta: #EC4899, background: #F5F3FF, text: #2E1065, border: #DDD6FE

### Education / EdTech
primary: #2563EB, secondary: #60A5FA, cta: #F97316, background: #EFF6FF, text: #1E3A5F, border: #BFDBFE

### Real Estate
primary: #065F46, secondary: #059669, cta: #D97706, background: #F0FDF4, text: #064E3B, border: #BBF7D0

### Travel / Hospitality
primary: #0369A1, secondary: #38BDF8, cta: #F97316, background: #F0F9FF, text: #0C4A6E, border: #BAE6FD

### Gaming
primary: #DC2626, secondary: #F87171, cta: #FBBF24, background: #0F0F14, text: #F4F4F5, border: #27272A

### Developer Tools
primary: #10B981, secondary: #34D399, cta: #F59E0B, background: #0F172A, text: #E2E8F0, border: #1E293B

### Legal / Law
primary: #1E3A5F, secondary: #3B82F6, cta: #B45309, background: #F8FAFC, text: #0F172A, border: #CBD5E1

### Automotive
primary: #18181B, secondary: #3F3F46, cta: #EF4444, background: #FAFAFA, text: #18181B, border: #D4D4D8

### Music / Entertainment
primary: #7C3AED, secondary: #C084FC, cta: #EC4899, background: #09090B, text: #FAFAFA, border: #27272A

### Non-Profit / NGO
primary: #059669, secondary: #34D399, cta: #F59E0B, background: #F0FDF4, text: #064E3B, border: #A7F3D0

### Insurance
primary: #1D4ED8, secondary: #3B82F6, cta: #F97316, background: #EFF6FF, text: #1E3A5F, border: #BFDBFE

### AI / ML Product
primary: #8B5CF6, secondary: #A78BFA, cta: #06B6D4, background: #0F0B1E, text: #E8E4F0, border: #2D2250

### Logistics / Supply Chain
primary: #0D9488, secondary: #2DD4BF, cta: #F59E0B, background: #F0FDFA, text: #134E4A, border: #99F6E4

### Marketplace
primary: #E11D48, secondary: #FB7185, cta: #2563EB, background: #FFF1F2, text: #4C0519, border: #FECDD3

### Portfolio (Creative)
primary: #18181B, secondary: #A1A1AA, cta: #FBBF24, background: #FAFAFA, text: #09090B, border: #E4E4E7

### Portfolio (Developer)
primary: #10B981, secondary: #6EE7B7, cta: #F59E0B, background: #09090B, text: #F4F4F5, border: #1C1C1E

### Social Media
primary: #8B5CF6, secondary: #C084FC, cta: #EC4899, background: #FAF5FF, text: #2E1065, border: #E9D5FF

### Productivity / Task Management
primary: #2563EB, secondary: #60A5FA, cta: #10B981, background: #FFFFFF, text: #1E293B, border: #E2E8F0

### Construction / Industrial
primary: #D97706, secondary: #FBBF24, cta: #18181B, background: #FFFBEB, text: #451A03, border: #FDE68A

### Beauty / Cosmetics
primary: #BE185D, secondary: #F472B6, cta: #A855F7, background: #FDF2F8, text: #831843, border: #FBCFE8

### Agriculture / Farming
primary: #15803D, secondary: #4ADE80, cta: #CA8A04, background: #F0FDF4, text: #14532D, border: #BBF7D0

### Pet / Veterinary
primary: #EA580C, secondary: #FB923C, cta: #2563EB, background: #FFF7ED, text: #7C2D12, border: #FED7AA

---

## Typography Pairings

### Classic Elegant
- Heading: Playfair Display | Body: Inter
- Mood: luxury, elegant, refined
- Best for: luxury, fashion, spa, editorial
- URL: https://fonts.google.com/share?selection.family=Playfair+Display|Inter

### Tech Startup
- Heading: Space Grotesk | Body: DM Sans
- Mood: modern, innovative, clean
- Best for: tech startups, SaaS
- URL: https://fonts.google.com/share?selection.family=Space+Grotesk|DM+Sans

### Developer Mono
- Heading: JetBrains Mono | Body: IBM Plex Sans
- Mood: technical, precise, focused
- Best for: developer tools, code editors, technical docs
- URL: https://fonts.google.com/share?selection.family=JetBrains+Mono|IBM+Plex+Sans

### Bold Editorial
- Heading: Clash Display | Body: Satoshi
- Mood: bold, contemporary, editorial
- Best for: creative agencies, magazines, portfolios
- Note: Available from fontshare.com (free)

### Friendly Rounded
- Heading: Nunito | Body: Open Sans
- Mood: approachable, friendly, warm
- Best for: education, children's apps, non-profit, community
- URL: https://fonts.google.com/share?selection.family=Nunito|Open+Sans

### Medical Professional
- Heading: Plus Jakarta Sans | Body: Source Sans 3
- Mood: clean, trustworthy, professional
- Best for: healthcare, medical, pharma, insurance
- URL: https://fonts.google.com/share?selection.family=Plus+Jakarta+Sans|Source+Sans+3

### Fintech Confidence
- Heading: Outfit | Body: Inter
- Mood: confident, modern, trustworthy
- Best for: fintech, banking, investment, crypto
- URL: https://fonts.google.com/share?selection.family=Outfit|Inter

### Creative Portfolio
- Heading: Syne | Body: Work Sans
- Mood: artistic, expressive, unique
- Best for: creative portfolios, art, design studios
- URL: https://fonts.google.com/share?selection.family=Syne|Work+Sans

### Brutalist Raw
- Heading: Space Mono | Body: Space Grotesk
- Mood: raw, technical, deliberate
- Best for: brutalist design, experimental, developer
- URL: https://fonts.google.com/share?selection.family=Space+Mono|Space+Grotesk

### Luxury Modern
- Heading: Cormorant Garamond | Body: Montserrat
- Mood: refined, luxurious, sophisticated
- Best for: luxury brands, hotels, fine dining, fashion
- URL: https://fonts.google.com/share?selection.family=Cormorant+Garamond|Montserrat

### Gaming Bold
- Heading: Orbitron | Body: Rajdhani
- Mood: futuristic, bold, energetic
- Best for: gaming, esports, sci-fi, tech
- URL: https://fonts.google.com/share?selection.family=Orbitron|Rajdhani

### Organic Warm
- Heading: Fraunces | Body: Commissioner
- Mood: warm, organic, artisanal
- Best for: food, sustainability, wellness, handmade
- URL: https://fonts.google.com/share?selection.family=Fraunces|Commissioner

### Corporate Solid
- Heading: Lexend | Body: Noto Sans
- Mood: reliable, clear, enterprise
- Best for: enterprise SaaS, consulting, B2B, legal
- URL: https://fonts.google.com/share?selection.family=Lexend|Noto+Sans

### Playful Display
- Heading: Fredoka | Body: Quicksand
- Mood: playful, fun, youthful
- Best for: children's products, gaming casual, social apps
- URL: https://fonts.google.com/share?selection.family=Fredoka|Quicksand

### Geometric Modern
- Heading: Manrope | Body: DM Sans
- Mood: geometric, precise, modern
- Best for: SaaS, dashboards, productivity tools
- URL: https://fonts.google.com/share?selection.family=Manrope|DM+Sans

### Art Deco Luxe
- Heading: Poiret One | Body: Raleway
- Mood: glamorous, decorative, retro-elegant
- Best for: events, luxury real estate, fashion, nightlife
- URL: https://fonts.google.com/share?selection.family=Poiret+One|Raleway

### News / Media
- Heading: Merriweather | Body: Source Sans 3
- Mood: authoritative, readable, classic
- Best for: news, blogs, publishing, journalism
- URL: https://fonts.google.com/share?selection.family=Merriweather|Source+Sans+3

### E-commerce Clean
- Heading: Poppins | Body: Lato
- Mood: clean, versatile, commercial
- Best for: e-commerce, marketplace, retail
- URL: https://fonts.google.com/share?selection.family=Poppins|Lato

### Architectural / Real Estate
- Heading: DM Serif Display | Body: Karla
- Mood: sophisticated, grounded, confident
- Best for: real estate, architecture, interior design
- URL: https://fonts.google.com/share?selection.family=DM+Serif+Display|Karla

### Music / Nightlife
- Heading: Bebas Neue | Body: Barlow
- Mood: dramatic, bold, high-energy
- Best for: music, events, nightlife, festivals
- URL: https://fonts.google.com/share?selection.family=Bebas+Neue|Barlow

---

## Landing Page Patterns

### Hero + Features + CTA (SaaS Standard)
- Section order: Hero → Logos/Social Proof → Features (3-col or bento) → Testimonials → Pricing → Final CTA
- CTA placement: Above fold in hero, repeated after testimonials and at footer
- Conversion tip: Single clear CTA verb. "Start free" beats "Sign up"

### Before-After Transformation
- Section order: Pain Point → Transformation Visual → Solution → Results/Metrics → CTA
- Best for: fitness, coaching, consulting, productivity tools
- CTA placement: After the transformation reveal

### Product-Led Visual
- Section order: Product Screenshot Hero → Feature Deep-Dive → Integration Logos → Testimonials → Pricing
- Best for: developer tools, design tools, SaaS with strong UI
- Conversion tip: Animate the product screenshot — show it in action

### Menu-First Visual (Restaurant)
- Section order: Hero (food photo) → Menu Highlights → About/Story → Gallery → Reservation CTA
- CTA placement: Sticky reservation button
- Conversion tip: Use real photography, never stock

### Portfolio Showcase
- Section order: Name/Title Hero → Selected Work Grid → About → Skills/Services → Contact
- Best for: designers, developers, freelancers, studios
- Conversion tip: Let work speak — minimal text, maximum visual impact

### Trust-First (Enterprise)
- Section order: Value Prop → Client Logos → Case Studies → Security/Compliance → Demo CTA
- Best for: enterprise SaaS, B2B, security products
- Conversion tip: Lead with outcomes and social proof, not features

---

## UX Anti-Patterns by Industry

### SaaS
- Cluttered hero with multiple CTAs — Severity: HIGH — Users need one clear action
- Feature overload on landing page — Severity: MEDIUM — Show 3-5 key features, not everything
- No social proof above the fold — Severity: HIGH — Logos or testimonials build trust early

### Fintech
- Light backgrounds — Severity: MEDIUM — Dark themes convey seriousness and trust
- Overly playful typography — Severity: HIGH — Users need to trust you with money
- Hiding fee information — Severity: HIGH — Transparency builds trust in finance

### Healthcare
- Red as primary color — Severity: HIGH — Triggers anxiety and danger associations
- Dense text without hierarchy — Severity: HIGH — Medical info needs clear scanning
- Missing accessibility — Severity: CRITICAL — Healthcare must be accessible to all abilities

### Restaurant
- Stock food photography — Severity: HIGH — Kills authenticity and trust
- Tiny menu text — Severity: HIGH — Menu is the #1 content; make it readable
- Autoplay music/video — Severity: MEDIUM — Disrupts user experience

### E-commerce
- Checkout with more than 3 steps — Severity: HIGH — Each step loses ~10% of customers
- No trust badges near payment — Severity: HIGH — SSL, guarantees, reviews near checkout
- Missing product search — Severity: HIGH — Users who search convert 2-3x higher

### Portfolio
- Entry animations that block content — Severity: HIGH — Visitors want to see work, not wait
- No clear contact method — Severity: HIGH — The whole point is to get hired
- Inconsistent project presentation — Severity: MEDIUM — Use same format for each project

### Dashboard
- Information overload on first view — Severity: HIGH — Progressive disclosure is essential
- Poor data hierarchy — Severity: HIGH — Most important metrics must be immediately visible
- Missing empty states — Severity: MEDIUM — Show users what to do when there's no data

---

## Accessibility Quick Reference

### Contrast Minimums (WCAG 2.1)
- Normal text: 4.5:1 ratio (AA) or 7:1 (AAA)
- Large text (18px+ bold or 24px+): 3:1 ratio (AA)
- UI components and graphical objects: 3:1 ratio
- Tool: Use oklch color space for perceptually uniform contrast

### Motion Safety
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Touch Targets
- Minimum: 44×44px (WCAG) / 48×48dp (Material)
- Minimum gap between targets: 8px
- Don't rely on hover for primary interactions

### Focus Management
- Visible focus indicator on all interactive elements
- `outline: 2px solid var(--color-primary); outline-offset: 2px;`
- Tab order follows visual reading order
- Skip-to-content link for keyboard users

### Color Independence
- Never use color alone to convey meaning
- Error states: color + icon + text
- Charts: use patterns/textures in addition to color
- Links: underline or other non-color indicator

---

## shadcn/ui + 21st.dev Component Patterns

When building React components, follow these patterns inspired by shadcn/ui and 21st.dev:

### Component Architecture
- Single-file components with Tailwind CSS
- Radix UI primitives for accessibility (Dialog, Dropdown, Tooltip)
- CSS variables for theming via `className` and `cn()` utility
- Compound component pattern for complex UI (Tabs, Accordion)

### Recommended Component Libraries
- **shadcn/ui**: Install via `npx shadcn@latest add [component]`
- **21st.dev**: Browse at 21st.dev for animated, production-ready components
- **Radix UI**: Unstyled primitives for accessible components
- **Lucide React**: Icon library (consistent, tree-shakable)

### Common Pattern: Animated Card
```jsx
import { motion } from "motion/react"

export function AnimatedCard({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
      className="rounded-2xl border bg-card p-6"
    >
      {children}
    </motion.div>
  )
}
```

### Common Pattern: Staggered List
```jsx
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.li key={i} variants={item}>{i}</motion.li>
  ))}
</motion.ul>
```

### Common Pattern: Scroll-Triggered Section
```jsx
import { motion, useScroll, useTransform } from "motion/react"

function ParallaxSection() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  
  return (
    <motion.section style={{ y }}>
      {/* content */}
    </motion.section>
  )
}
```
