# Fluent 2 Web Components Reference

> Source: `@fluentui/react-components` v9.73.7 · 46+ components
> Library: `@fluentui/react-components`
> Storybook: https://react.fluentui.dev

---

## Component Index

| Component | Category | Primary Use |
|-----------|----------|-------------|
| Accordion | Layout | Collapsible content sections |
| Avatar | Display | Represent a person or group |
| AvatarGroup | Display | Multiple avatars in compact form |
| Badge | Display | Status/description indicator |
| Breadcrumb | Navigation | Hierarchical navigation |
| Button | Input | Trigger a single action |
| Card | Layout | Content + action container |
| Carousel | Display | Cycle through content |
| Checkbox | Input | Multi-option selection |
| Combobox | Input | Select or type from long list |
| DataGrid | Display | Tabular sortable/selectable data |
| Dialog | Overlay | Focused action/confirmation |
| Divider | Layout | Visual content separation |
| Drawer | Overlay | Supplemental side panel |
| Dropdown | Input | Select from a list |
| Field | Input | Form component wrapper |
| FluentProvider | Provider | Theme/style provider |
| Icon | Display | Semantic visual symbol |
| Image | Display | Photo/illustration display |
| InfoLabel | Display | Label + supplemental popover |
| Input | Input | Short free-form text entry |
| Label | Display | Name a form component |
| Link | Navigation | Navigation text |
| List | Display | Scannable vertical items |
| Menu | Overlay | Hidden action list |
| MessageBar | Feedback | Status communication |
| Nav | Navigation | Primary site/app navigation |
| Persona | Display | Person identity + status |
| Popover | Overlay | Non-essential contextual info |
| ProgressBar | Feedback | Progress indication |
| RadioGroup | Input | Single-option selection |
| Rating | Input | User sentiment input/display |
| SearchBox | Input | Search and filter |
| Select | Input | Single option from list (native) |
| Skeleton | Feedback | Loading placeholder |
| Slider | Input | Range value selection |
| SpinButton | Input | Precise incremental input |
| Spinner | Feedback | Indeterminate loading |
| Switch | Input | Immediate binary toggle |
| TabList | Navigation | Category switching |
| Tag | Display | User-selected value representation |
| TagPicker | Input | Multi-select with tags |
| Text | Display | Typed text display |
| Toolbar | Action | Quick access to frequent actions |
| Tooltip | Overlay | Supplemental plain-text context |
| Tree | Display | Hierarchical nested data |

Import everything from the umbrella package:
```typescript
import { Button, Input, Dialog } from '@fluentui/react-components';
// ❌ Never from individual packages — tree-shaking is already handled
```

---

## Accordion

**When to use:** FAQ layouts, grouped settings, collapsible content areas.
**When NOT:** Required task information — reduces discoverability.

**Key behaviors:**
- Opening one item closes others by default (configurable for multi-open)
- Avoid multi-open when content requires cross-referencing between panels

**Accessibility:** `aria-expanded` + `active={true}` on open items.

**Content:** Brief, scannable headers; sentence-case; no periods.

---

## Avatar

**When to use:** Represent a person or entity with optional status.

**Variants:**
- Circular: individual people
- Square: teams, organizations

**Features:** Presence badges (availability status), activity rings (active collaboration like Teams calls).

**Accessibility:** Presence badges on avatars ≤32px are difficult for visually impaired users — always add text status + tooltips. Add `tabindex` for keyboard navigation on interactive avatars.

---

## AvatarGroup

**Variants:**
| Variant | Description |
|---------|-------------|
| Spread | No overlap (default) |
| Stack | Overlap for space efficiency |
| Pie | Circular container for 2–3 avatars; no activity rings or presence badges |

**Overflow:** When >5 entities, 5th slot shows overflow avatar with total count.

---

## Badge

**Purpose:** Visual indicator of status or description using text, color, and icons.

**Rules:**
- Use semantic colors intentionally; no excessive color mixing
- Maintain consistent sizing within a single context
- 1–2 words max; sentence-case; avoid labels prone to truncation

**Accessibility:** Icon-only badges require `aria-label`.

---

## Breadcrumb

**When to use:** Always combine with other navigation (top/sidebar nav). For hierarchy, not browsing history.

**Rules:**
- 30–50% of surface width; items truncate at 30 characters (tooltip at 80 chars)
- `disabledFocusable` prop for hierarchy steps with no landing page
- At 400% zoom: show only the final level

**Accessibility:** Wrap in `<nav aria-label>`, use `<ol>`, add `aria-current="page"` to last item.

---

## Button

**Variants:**
| Variant | Use Case |
|---------|---------|
| Standard | Single action |
| Split | Dominant action + additional options |
| Menu | Toggles multiple options (no primary action) |
| Compound | Title + descriptive subtitle |
| Toggle | Two-state on/off — use `ToggleButton` with `checked` prop |

**Layout rules:**
- Only **one primary button** per layout
- Primary button at top-left (top-right in RTL)

**Content rules:**
- Active voice; verb + noun; sentence-case; no punctuation
- Creation: "New [item]"; Addition: "Add [items]"
- Completion: "Done" / "Finish" / "Close" / "Cancel"
- Multi-step: "Next" (not "Continue"), "Previous" (not "Back")
- Never use "OK" to dismiss errors — use "Close"

**Accessibility:** 4.5:1 contrast for text; 3:1 for icons. Tooltips on disabled buttons explaining why.

---

## Card

**Purpose:** Container holding information and actions related to a single concept.

**`focusMode` prop:**
| Mode | Behavior |
|------|----------|
| `off` | Actions focusable; card container has no focus |
| `no-tab` | Traps focus; Tab cycles actions, Esc exits |
| `tab-exit` | Traps focus; Tab and Esc both exit |
| `tab-only` | Focusable without trapping |

**Accessibility:** `aria-label`, `aria-describedby`, `aria-labelledby` for selectable cards.

---

## Carousel

**Purpose:** Cycle through content (articles, products, images) without leaving the page.

**Variants:** Steps (chevrons + step indicators), Image Gallery (thumbnails)

**Rules:**
- Auto-play: mandatory pause controls
- At ≤600px: snaps to full-screen; images maintain aspect ratio
- Must accommodate 400% zoom

---

## Checkbox

**When to use:** Multiple selections from a group.
**When NOT:** Single-option (use RadioGroup/Dropdown) or immediate-effect toggles (use Switch).

**Variants:** Single, Group (max 7 options), Indeterminate (partial parent selection)

**Accessibility:** Associate groups with descriptive labels; use Field component for built-in labels.

---

## Combobox

**When to use:** Long option lists requiring filtering or freeform text entry.

**Combobox vs Dropdown vs Select:**
- Combobox: long lists + filtering/freeform
- Dropdown: short lists, no freeform, custom styling
- Select: mobile context or standard form data submission

**Key props:**
- `multiselect={true}` — multiple selections
- `freeform={true}` — allow custom entries
- `text` — string for keyboard type-ahead on complex JSX options
- `inlinePopup={true}` — Safari/VoiceOver compatibility

---

## DataGrid

**When to use:** Tabular data with sorting, selection, or column customization.

**Key features:** Column sorting, row selection (single/multi), virtualization via react-window, keyboard navigation.

```typescript
import { DataGrid, DataGridHeader, DataGridBody, DataGridRow, DataGridCell } from '@fluentui/react-components';
```

See `examples/data-grid-component/` for full implementation with sorting and selection.

---

## Dialog

**Variants:**
| Type | Dismissal |
|------|-----------|
| Modal | Click outside, Esc, footer button, close button |
| Non-modal | Close button, Esc, footer button only |
| Alert | Footer buttons only |

**Rules:**
- Include `<Form>` between `<DialogSurface>` and `<DialogBody>` for form submissions
- Headers/footers fixed; body scrolls
- Never nest dialogs

**Accessibility:** Focus enters first interactive element; modal/alert trap keyboard focus; return focus to trigger on close.

---

## Divider

**Variants:** Block (full width, strict distinction), Inset (not full width, closer relationship)

**Spacing:** Minimum 12px top/bottom (default/text), 8px (icons).

**Accessibility:** Use `aria-hidden` for purely visual dividers.

---

## Drawer

**Variants:**
- **Inline:** Non-blocking; both areas remain interactive
- **Overlay:** Modal; covers and disables main content

**Rules:**
- Multi-step: max 2–3 steps; escalate complex workflows to dedicated surfaces
- Sizes: small (default), medium, large, full width
- Primary buttons in footer align to the left
- Header/footer elevate during scroll; become non-sticky at 400% zoom

---

## Dropdown

**When to use over Combobox:** Custom styling or complex option presentation.
**When to use Select instead:** Mobile context (better native accessibility) or form data submission.

**Key props:** `multiselect`, `text` (keyboard type-ahead), `inlinePopup` (iOS VoiceOver)

---

## Field

**Purpose:** Wraps form inputs to auto-wire all ARIA attributes.

**Works with:** Checkbox, Combobox, Input, RadioGroup, Select, Slider, SpinButton, Switch, Textarea

**ARIA auto-wiring:**
- `label` → `htmlFor`
- `hint` → `aria-describedby`
- `validationMessage` → `aria-describedby` + `aria-invalid`
- `required` → `aria-required`

```typescript
// ✅ Always wrap form controls in Field
<Field label="Email" hint="We'll never share this" validationState="error"
       validationMessage="Invalid format" required>
  <Input type="email" />
</Field>
```

**Validation states:** `'none'` | `'success'` | `'warning'` | `'error'`

**Content rules:**
- Labels: sentence-case, brief phrases, no ending punctuation
- Placeholder: supplementary hints only; no periods
- Validation messages: brief; punctuation only for multiple sentences

**Never use placeholder as label substitute** — placeholder requires `aria-label`.

---

## FluentProvider

**Purpose:** Injects theme as CSS custom properties; required at app root.

```typescript
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

<FluentProvider theme={webLightTheme} dir="ltr" lang="en-US">
  <App />
</FluentProvider>
```

See [design-tokens.md](design-tokens.md) for theming details.

---

## Icon

**Usage:** From `@fluentui/react-icons` package. Named for shape/object, not function.

**Themes:** Regular (wayfinding/action), Filled (selected states).

**Accessibility:** All icon-only interactive elements need `aria-label`.

---

## Image

**Key props:**
- `shadow` — adds elevation (use sparingly)
- `alt` — accessibility text
- `role="presentation"` — for decorative images

**Alt text:** 1–2 sentences; describe image + context; indicate function if representing an action.

---

## InfoLabel

**When to use:** Pairs a label with an info button opening a popover for supplemental, non-critical info.
**When NOT:** Critical information should be persistently visible.

**Content:** 1–2 short sentences; one optional link; capitalize first word; end sentences with periods.

**Accessibility:** `aria-label` auto-combines visible label + "more information".

---

## Input

**When to use:** Short, free-form text entry (single line). Use Textarea for longer text.

**Always pair with a visible label.** Never use placeholder as label substitute.

---

## Label

**Variants:** Disabled (exempt from contrast requirements), Wrapping (never truncates)

**Content:** Brief phrases; sentence-case; no colons or ending punctuation (unless a question).

---

## Link

**Variants:** Default, Subtle (body copy color — use with caution), Inverted, On-brand

**Rules:**
- Navigation only — not for actions
- Link text must be meaningful out of context — never "click here"
- New tab: add visual cue (open icon) + `aria-label` warning

---

## List

**Selection modes:**
- Single Action: click/Enter/Space
- Multiple Actions: hover or Right Arrow
- Selection as Primary: click anywhere or Space/Enter
- Selection as Secondary: click/Enter for primary; Space toggles selection

**Accessibility:** `listbox` + `option` roles for selection; `list` role when no selection.

---

## Menu

**Variants:** Default (buttons), Checkbox (multi-select filtering), Radio (single-select settings)

**Architecture:** `MenuTrigger` → `MenuPopover` → `MenuList` → `MenuItem`/`MenuItemCheckbox`/`MenuItemRadio`

**Rules:**
- Frequent actions first, dangerous actions last
- 300px max width; labels wrap
- Follow WAI-ARIA menu pattern; keyboard: Arrow keys, Enter, Escape, Tab

---

## MessageBar

**Variants and stacking order (most to least critical):**
`Error` → `Warning` → `Success` → `Info`

**Rules:**
- Error/Warning must include a button or link
- Content never truncates; reflows vertically
- Dismissed warnings/errors reappear until resolved

**Placement:**
- Page-level: below command bar, above main content
- Container-level: top of container, below title/header

**Accessibility:**
- Error/Warning: `aria-live="assertive"`
- Info/Success: `aria-live="polite"`

---

## Nav

**Default width:** 260px. At 640px screen width, becomes an overlay drawer.

**Rules:**
- NavCategory items are accordions only — not links
- Secondary actions: 1 per node; use overflow menu for multiple
- Secondary actions must always be in DOM (not injected on hover)

---

## Persona

**Purpose:** Avatar + presence badge + up to 4 lines of text.

`presenceOnly` prop removes avatar; `text` wraps when container is too small.

---

## Popover

**When to use:** Non-essential contextual info with structured content or interactive elements.
**vs Dialog:** Dialog for complex layouts that block the page.
**vs Tooltip:** Tooltip for unstructured plain text only.

**Accessibility:** Do not nest popovers. `trapFocus` prop sets `aria-hidden=true` on parent.

---

## ProgressBar

**Variants:** Static (fixed %), Determinate (known progress — preferred), Indeterminate (unknown)

**Rules:**
- Switch to determinate if progress data becomes available mid-task
- Combine related sub-steps into one bar (prevent apparent rewind)

**Content:**
- Label: short, sentence-case, no period
- Status text: `-ing` verb + ellipsis, nonbreaking space before `…`

---

## RadioGroup

**When to use:** Short list (≤5 options) or when seeing all options at once matters.
**When NOT:** Space-constrained (use Dropdown); multi-select (use Checkboxes); binary immediate (use Switch).

**Content:** Concise fragments; text wraps — never truncate with ellipsis. Include "None" option if no selection is valid.

---

## Rating

**Types:** Rating Display, Rating (interactive), Rating Display Compact

**Sizes:** Small, Medium, Large, **XLarge (use for user input)**

**Accessibility:** 3:1 contrast ratio (foreground-to-background and selected-to-unselected).

---

## SearchBox

**Behaviors:** Clear button appears only when field has content.

**Results ordering:** Recent topics (on focus) → Suggested results (as user types) → Related topics.

---

## Select

**Use instead of Dropdown when:** Mobile context or form data submission.
**Use instead of Combobox when:** Freeform text or filtering not needed.

---

## Skeleton

**When to use:** Tasks over 1 second with a **known layout structure**.
**When NOT:** Structure is unknown (use Spinner); long processes (may look broken).

**Animation:** Wave (preferred), Pulse

**Accessibility:** `aria-busy="true"` when multiple skeletons update at different times.

---

## Slider

**When to use:** Imprecise/approximate values (volume, brightness).
**When NOT:** Precise numerical values (use Input); very small/large ranges.

**Types:** Default (any value), Step (discrete snapping)

**Accessibility:** Always use a label, even if visually hidden.

---

## SpinButton

**When to use:** Precise incremental changes within a set range (dates, font sizes).
**When NOT:** Large ranges (use Input); imprecise values (use Slider).

**Keyboard:** Arrow keys, Page Up/Down, Home, End.

**Content:** Include unit in placeholder (e.g., "0 cm", "12 pt").

---

## Spinner

**When to use:** Processing states over 1 second where duration is unknown.

**Rules:** Center over loading section. For processes >3 seconds, include a label.

**Content:** "-ing" verb + "…"; 3 words or fewer; nonbreaking space before ellipsis.

```
"Connecting to data …" ✅
"Loading …"           ❌ (too generic)
```

---

## Switch

**When to use:** Immediate binary on/off with no submission step.
**When NOT:** Submission step required (use Checkbox); indeterminate state needed.

**Content:**
- Noun or short noun phrase
- If ambiguous, add verbs describing the **positive (enabled) state**
- Never "Turn on" / "Turn off"; never phrase as a question

---

## TabList

**When to use:** Closely related, frequently accessed categories within the same page.
**When NOT:** Navigation beyond closely related categories (use Link); actions (use Button).

**Rules:**
- Horizontal tabs do not scroll/wrap — use overflow menu button with `role="tab"` for overflow
- One tab always active on first render (usually first)
- Consistent label format across all tabs (text-only or text+icon, not mixed)

---

## Tag

**Types:** Tag (display + optional dismiss), Interaction Tag (dismiss + additional actions)

**Rules:** Do not truncate tag content. Non-dismissible tags signal read-only state.

---

## TagPicker

**Behaviors:** Typing filters dropdown; Enter selects first/closest match; Backspace removes last tag.

**Accessibility:** `aria-label` on `TagPickerInput`.

---

## Text

**Preset components:**
```typescript
import { Caption2, Caption1, Body1, Body1Strong, Subtitle2, Subtitle1,
         Title3, Title2, Title1, LargeTitle, Display } from '@fluentui/react-components';
```

**Key props:**
- `font`: `'base'` (Segoe UI, default) or `'monospace'` (code)
- `as`: emit correct semantic HTML (default: `<span>`)

**Accessibility:** Use `as` prop for correct semantics. Don't use bold/italic alone to convey meaning.

---

## Toolbar

**Rules:**
- Never wraps onto a second line — use overflow utility
- Group actions logically with dividers/whitespace
- Separate destructive/status-affecting actions from others

**Accessibility:** Multiple toolbars: label each with `aria-label`. All icon-only buttons need `aria-label` + tooltip.

---

## Tooltip

**When to use:** Supplemental, non-essential plain text near a target.
**vs Popover:** Popover for rich/formatted/interactive content.

**Accessibility:** Connect to target with `id` + `aria-describedby`.

**Content:**
- Unlabeled components: simple descriptive noun phrase; no end punctuation
- Disabled components: explain what would enable it
- End punctuation only if tooltip contains a complete sentence

---

## Tree

**When to use:** Hierarchical, nested data (folder structures, nested categories).
**vs Accordion:** Accordion for show/hide without hierarchy.
**vs Nav:** Nav for simpler one-level navigation; Tree for deeper hierarchy.

**Item types:** Branch (parent node), Leaf (child-only, no children)

**Interaction modes:** Expand-only, Navigation, Multiselect

**Indentation:** 24px (medium), 12px (small). Leaf gets additional 24px (no chevron).

**Rules:**
- Truncation optional — only if items still distinguishable; always show full label in tooltip
- Quick actions: 1–2 per node; must also be available via toolbar or menu (WAI-ARIA conformance)

**Dynamic data:** Use `useHeadlessFlatTree` hook for flat-structure management with dynamic data.

**Accessibility:** `aria-label` on tree element; badges/quick actions must have tooltips.

---

## Component Decision Guide

| Use Case | Component | Key Rule |
|----------|-----------|---------|
| Single action | `Button` | One primary per layout |
| Binary on/off (immediate) | `Switch` | No submit step |
| Multi-option selection | `Checkbox` in `Field` | |
| Single from ≤5 options | `RadioGroup` | |
| Single from long list | `Combobox` or `Dropdown` | Combobox when filtering needed |
| Short text | `Input` in `Field` | Always wrap in Field |
| Long text | `Textarea` in `Field` | Always wrap in Field |
| Confirmation / destructive | `Dialog` (modal) | Alert variant for destructive |
| Side panel | `Drawer` | Overlay (blocking) vs Inline |
| Tabbed categories | `TabList` + `Tab` | One always active |
| Tabular data | `DataGrid` | Sort, select, virtualize |
| Hierarchical data | `Tree` | `useHeadlessFlatTree` for dynamic |
| Context menu | `Menu` | Submenus via nested MenuList |
| Supplemental hover text | `Tooltip` | Plain text only |
| Rich hover content | `Popover` | Interactive content |
| Loading <3s | `Spinner` | Include label if >3s |
| Loading >3s | `ProgressBar` | Determinate preferred |
| Known-layout loading | `Skeleton` | Mirror final structure |
| Status message | `MessageBar` | Error=assertive, Info=polite |
| Form validation | `Field` | All validation states auto-wire ARIA |
