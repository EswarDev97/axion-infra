# Fluent 2 Mobile Components Reference

> Sources: fluent2.microsoft.design/components/ios and /android
> iOS Library: `fluentui-apple` (Swift/SwiftUI) — 12 components
> Android Library: `fluentui-android` (Kotlin/Jetpack Compose) — 5 components

**⚠ Active Development Warning:** Both libraries are being upgraded to Fluent 2 design language and token systems. APIs may change. Plan for updates in production use.

---

## Platform Overview

### Component Availability Matrix

| Component | iOS | Android |
|-----------|-----|---------|
| Activity Indicator / Progress Indicator | ✅ | ✅ (unified) |
| Avatar | ✅ | ✅ |
| Avatar Group | ✅ | ✅ |
| Button | ✅ | ✅ |
| Card Nudge | ✅ | ❌ |
| Heads-up Display (HUD) | ✅ | ❌ |
| Navigation Bar | ✅ | ❌ |
| Progress Bar | ✅ | ✅ (part of Progress Indicator) |
| Segmented Control | ✅ | ❌ |
| Shimmer | ✅ | ✅ |
| Text Field | ✅ | ❌ |
| Tooltip | ✅ | ❌ |

**Platform gap:** Android has 5 components vs iOS's 12. Missing on Android: Card Nudge, HUD, Navigation Bar, Segmented Control, Text Field, Tooltip. Always verify component availability before design.

---

## iOS Components (12)

### Activity Indicator
**Type:** Indeterminate loading spinner (equivalent to web Spinner)

**When to use:**
- Loading states lasting more than 1 second
- Short-duration background processes

**When NOT:** Extended loading → use determinate Progress Bar. UI structure can load gradually → use Shimmer.

**Layout rules:**
- Center at page top for pull-to-refresh
- Position at list bottom for pagination
- **Never block UI** — content must remain interactive
- Never overlap with background UI elements

**Accessibility:** Include `animating` label for VoiceOver to communicate ongoing process. For processes >3 seconds: pair with HUD that includes descriptive text.

---

### Avatar
**Variants:** Circular (individuals), Square/Rounded (teams/organizations)

**Features:** Presence badges (availability), activity rings (active collaboration)

**Accessibility:** Presence badges on avatars ≤32px may be difficult for visually impaired — always pair with textual status.

---

### Avatar Group
**Variants:** Spread (no overlap), Stack (overlapping for space efficiency)

**Overflow:** Shows `+N` count when avatars exceed available space.

---

### Button
**Standard iOS button with Fluent design tokens.**

**Content rules:** Active language ("Save", "Submit", "Continue"). Single verbs; add nouns only for clarity.

**Content capitalization:** **Title-case** on iOS/macOS (every word except articles/conjunctions). Sentence-case on web/Android.

---

### Card Nudge
**Purpose:** Short in-app discovery messages for feature promotion or onboarding.

*iOS-only — no Android equivalent.*

---

### Heads-up Display (HUD)
**Purpose:** Progress indicator with optional text. Pairs with Activity Indicator for operations >3 seconds.

*iOS-only — no Android equivalent.*

---

### Navigation Bar
**Purpose:** Displays current screen info and available actions at the top of a screen.

*iOS-only — no Android equivalent.*

---

### Progress Bar
**Purpose:** Communicates background task progress (determinate or indeterminate).

---

### Segmented Control
**Purpose:** Single-option selection across mutually exclusive segments (equivalent to TabList on web).

*iOS-only — no Android equivalent.*

---

### Shimmer
**Purpose:** Gradually loads layouts showing structural outline of content without blocking UI.

**When to use:** Short-to-medium loading states where layout structure is known.
**When NOT:** Extended processes — prolonged shimmer suggests an error.

**Layout rules:**
- Mirror the final content structure exactly
- Only core/consistent parts of UI
  - ✅ Persona loader: avatar + title + subtitle
  - ❌ NOT: presence badges, timestamps, every possible detail

**Accessibility:** Respects system "Reduce Motion" setting. Add `animating` label while shimmer displays for VoiceOver.

---

### Text Field
**Purpose:** Short free-form text entry (single line). Equivalent to web Input.

*iOS-only — no Android equivalent.*

---

### Tooltip
**Purpose:** Contextual supplemental information on tap/long press.

*iOS-only — no Android equivalent.*

---

## Android Components (5)

### Avatar

**Variants:**
| Type | Shape |
|------|-------|
| Standard | Circular (individual persons) |
| Group | Square/rounded (teams, organizations) |

**Features:**
- **Presence Badges:** Availability/status (Available, Busy, Away)
- **Activity Rings:** Active collaboration indicators
- **Cutouts:** Dynamic info (reactions, mentions) — **available at 40px and 56px ONLY**

**Critical constraint:** Cutouts and presence badges are **NEVER shown simultaneously** — choose one based on use case priority.

**Accessibility:** Presence badges on avatars ≤32px may be difficult for visually impaired — always pair with textual status.

---

### Avatar Group

**Variants:**
| Variant | Description | Best For |
|---------|-------------|---------|
| Avatar Pile | Individual avatars with spacing | Ample horizontal room |
| Avatar Stack | Condensed overlapping | Space-constrained scenarios |

**Overflow:** Shows `+N` count; overflow avatar supports tap to reveal full list (popup menu).

**Feature constraints:** Neither Pile nor Stack supports presence badges (key difference from standalone Avatar).

---

### Button

**Types:**
| Type | Description |
|------|-------------|
| Standard Button | Same elevation as page; single action |
| Floating Action Button (FAB) | Elevated; persistent at bottom-right; primary screen action |
| Extended FAB | FAB with icon + text label; collapses on scroll down, expands at bottom or scroll-up |
| Menu FAB | Bundles related actions; primary icon changes to reflect most logical action |

**Layout rules:**
- One primary button per layout
- Do NOT overload with high-emphasis buttons in information-rich scenarios
- Extended FABs: scrolling screens only — use filled buttons for static layouts
- FABs: briefly disappear/reappear on tab change (establishes contextual relationship)

**Accessibility:**
- FABs should be high in TalkBack focus order
- Icon-only FABs need brief TalkBack action descriptions
- Button text labels must match first word(s) of visible label

---

### Progress Indicator

**Variants:**
| Type | Description |
|------|-------------|
| Circular | Animates along a circular track |
| Linear | Animates along a linear track |

**Behavior modes:**
| Mode | When to Use |
|------|-------------|
| Determinate | **Recommended** — shows completed and remaining portions |
| Indeterminate | Only for brief operations when duration cannot be determined |

**Critical rule:** If data becomes available during execution, **transition from indeterminate to determinate** mid-operation. Extended indeterminate cycling may suggest system malfunction.

**Accessibility:** Add `animating` label when indicator appears to inform TalkBack users.

---

### Shimmer

**Purpose:** Loading placeholder showing structural outline of content.

**When to use:** Short-to-medium loading states.
**When NOT:** Extended processes — prolonged shimmer suggests an error.

**Layout rules:**
- Mirror the final content structure exactly
- Keep it simple — only core/consistent parts of UI

**Behavior:** Indeterminate sweeping highlight animation.

**Accessibility:** **Respects system "Remove Animations" setting** — will NOT animate if user disabled system animations. Add `animating` label for TalkBack.

---

## Cross-Platform Comparison

| Component | Web | iOS | Android | Key Differences |
|-----------|-----|-----|---------|-----------------|
| Loading indicator | Spinner + ProgressBar (separate) | Activity Indicator + Shimmer | Progress Indicator (unified circular+linear) + Shimmer | iOS pairs with HUD (3s+); Android transitions indeterminate→determinate |
| Avatar | ✅ | ✅ | ✅ | Android: cutouts/presence mutually exclusive; cutouts 40px/56px only |
| Avatar Group | ✅ spread/stack/pie | ✅ spread/stack | ✅ pile/stack | Android: no presence badges in groups; web has pie variant |
| Button | ✅ (standard types) | ✅ | ✅ + FAB variants | Android adds FAB/Extended FAB/Menu FAB with scroll behaviors |
| Shimmer/Skeleton | Skeleton (web) | Shimmer | Shimmer | Android explicitly respects "Remove Animations" system setting |
| Segmented control | TabList (equivalent) | Segmented Control | ❌ (no component) | Use TabList on web; no Android equivalent |
| Navigation bar | Nav / Breadcrumb | Navigation Bar | ❌ | iOS-specific component |

---

## Platform-Specific Patterns

### Touch Targets
| Platform | Unit | Minimum |
|----------|------|---------|
| iOS | pt | 44×44pt |
| Android | dp | 48×48dp |
| Web | px | 44×44px |

### Capitalization
| Platform | Rule |
|----------|------|
| iOS / macOS | **Title-case** (each word except articles/conjunctions) |
| Android / Web / Windows | **Sentence-case** (first word + proper nouns only) |

### Font Families
| Platform | Typeface |
|----------|----------|
| Web | Segoe UI (system font fallbacks) |
| iOS | San Francisco Pro |
| Android | Roboto |

---

## Implementation Resources

| Platform | Repository |
|----------|------------|
| iOS (Swift/SwiftUI) | https://github.com/microsoft/fluentui-apple |
| Android (Kotlin/Compose) | https://github.com/microsoft/fluentui-android |
| Web (React) | https://github.com/microsoft/fluentui |
