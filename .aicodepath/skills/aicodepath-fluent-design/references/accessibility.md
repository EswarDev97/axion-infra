# Fluent 2 Accessibility (WCAG 2.1 AA)

> Baseline: WCAG 2.1 AA — mandatory for all Fluent 2 components
> Sources: fluent2.microsoft.design + `@fluentui/react-tabster` + ARIA patterns from monorepo

---

## 1. Color Contrast Requirements

| Text Type | Minimum Ratio | Examples |
|-----------|--------------|---------|
| Standard text (default) | **4.5:1** | Body text, labels, buttons |
| Large text (≥18.5px bold OR ≥24px regular) | **3:1** | Headings, display text |
| Interactive components and icons | **3:1** | Icon buttons, toggle controls |
| Disabled text | Exempt | Contrast not required for disabled elements |

### Key Token Pairs (verified WCAG AA)
```typescript
// Text on background — all theme-safe
tokens.colorNeutralForeground1 on tokens.colorNeutralBackground1   // 4.5:1+
tokens.colorNeutralForeground1 on tokens.colorNeutralBackground2   // 4.5:1+
tokens.colorNeutralForegroundOnBrand on tokens.colorBrandBackground // 4.5:1+

// Status colors — use only via alias tokens
tokens.colorStatusDangerForeground1   // red — on neutral backgrounds
tokens.colorStatusWarningForeground1  // yellow — check: may fail on white; prefer on tinted backgrounds
tokens.colorStatusSuccessForeground1  // green — on neutral backgrounds
```

**Never rely on color alone** — always pair with text, icon, or additional visual indicator.

---

## 2. Focus Management

### Focus Order
- Follows a "Z" pattern (left to right, top to bottom)
- Never "lost" after closing temporary UI (dialogs, drawers, popovers)
- Must always return to the trigger element when overlay closes

### Focus Trapping
| Component | Behavior |
|-----------|---------|
| Dialog (Modal) | Traps focus — Tab cycles within; Esc closes |
| Dialog (Alert) | Traps focus — only footer buttons can dismiss |
| Drawer (Overlay) | Traps focus — same as Modal |
| Drawer (Inline) | Does NOT trap focus |
| Popover with `trapFocus` | Traps focus; sets `aria-hidden=true` on parent |

### Focus Indicator
- Focus: no color change to background; **thicker stroke** (2px `strokeWidthThick`)
- Components use `@fluentui/react-tabster` (wraps Microsoft's tabster library)

### Keyboard Navigation Patterns
| Component | Keys |
|-----------|------|
| Menu | Arrow keys (navigate), Enter (activate), Escape (close) |
| Tree | Arrow keys (navigate/expand), Enter (activate), Home/End |
| DataGrid | Arrow keys (cell navigation), Space (select row), Enter (activate) |
| TabList | Arrow keys (tab switching), Enter/Space (activate) |
| Combobox | Arrow keys (list navigation), Enter (select), Escape (close) |
| Dialog | Tab (cycle interactive), Escape (close modal) |
| SpinButton | Arrow Up/Down, Page Up/Down, Home, End |

---

## 3. ARIA Patterns by Component

| Component | ARIA Role | Key Attributes |
|-----------|-----------|---------------|
| Dialog | `dialog` | `aria-modal`, `aria-labelledby`, `aria-describedby` |
| Alert Dialog | `alertdialog` | `aria-modal`, `aria-labelledby` |
| Menu | `menu` | `aria-orientation`, `aria-haspopup` |
| MenuItem | `menuitem` | `aria-disabled` |
| Tree | `tree` | `aria-label` required |
| TreeItem | `treeitem` | `aria-expanded`, `aria-level`, `aria-setsize`, `aria-posinset` |
| DataGrid | `grid` | `aria-rowcount`, `aria-colcount` |
| Tooltip | `tooltip` | `aria-describedby` on trigger |
| Combobox | `combobox` | `aria-expanded`, `aria-autocomplete`, `aria-controls` |
| Listbox | `listbox` | `aria-multiselectable`, `aria-required` |
| Tab | `tab` | `aria-selected`, `aria-controls` |
| TabPanel | `tabpanel` | `aria-labelledby` |
| Breadcrumb | via `<nav>` | `aria-label`, `aria-current="page"` on last item |
| Toolbar | `toolbar` | `aria-label` (required when multiple toolbars) |

### Field ARIA (Auto-Wired by `<Field>`)
- `label` prop → `htmlFor` on input
- `hint` prop → `aria-describedby` on input
- `validationMessage` prop → `aria-describedby` + `aria-invalid="true"` (on error)
- `required` prop → `aria-required="true"`

**Never manually wire these** — use `<Field>` and they're automatic.

---

## 4. Semantic HTML Requirements

### Use the `as` Prop for Correct Semantics
```typescript
// ✅ Correct semantic HTML
<Text as="h1">Page Title</Text>
<Text as="p">Body paragraph</Text>
<Text as="code">const x = 1;</Text>

// ❌ Wrong — default span for all
<Text>Page Title</Text>  // renders <span>, not heading
```

### Heading Hierarchy
- Use heading elements in logical order — no skipped levels
- No overuse of large headings for visual effect
- Use `as="h1"`, `as="h2"`, etc. on `<Text>` component

### Landmark Regions
```typescript
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Breadcrumb">...</nav>  // second nav needs distinct label
<main>...</main>
<aside aria-label="Sidebar">...</aside>
```

---

## 5. Image and Icon Accessibility

### Images
```typescript
// Informative image
<Image alt="Bar chart showing Q4 revenue increase of 23%" />

// Decorative image (ignored by screen readers)
<Image role="presentation" alt="" />
<Image alt="" />
```

Alt text rules:
- 1–2 sentences; describe image + context; indicate function if representing an action
- For charts/graphs: describe the conclusion, not the visual

### Icons
```typescript
// Icon-only button — must have aria-label
<Button icon={<DeleteIcon />} aria-label="Delete item" appearance="subtle" />

// Icon with adjacent text — icon is decorative
<Button icon={<SaveIcon />}>Save</Button>  // icon auto-hidden from SR

// Standalone icon
<ArrowLeft16Regular aria-label="Previous page" />
<ArrowRight16Regular aria-hidden="true" />  // decorative
```

All icon-only interactive elements (buttons, tabs, toolbar items) require `aria-label` and a `<Tooltip>`.

---

## 6. Live Regions for Dynamic Content

```typescript
// Error/Warning — announce immediately (assertive)
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>

// Info/Success — announce when idle (polite)
<div aria-live="polite" role="status">
  {successMessage}
</div>

// MessageBar uses this automatically based on intent prop
<MessageBar intent="error">  // aria-live="assertive"
<MessageBar intent="success">  // aria-live="polite"
```

---

## 7. Responsive and Zoom Accessibility

### Zoom Requirements
- Content must reflow without horizontal scrolling at **400% zoom**
- At 400% zoom: Breadcrumb shows only the final level; Drawer header/footer become non-sticky
- Design for text zoom up to **200%** without content clipping

### Breakpoints
| Class | Range | Notes |
|-------|-------|-------|
| small | 320–479px | Minimum supported width |
| medium | 480–639px | Nav becomes overlay drawer at 640px |
| large | 640–1023px | |
| x-large | 1024–1365px | |
| xx-large | 1366–1919px | |
| xxx-large | 1920px+ | |

---

## 8. Reduced Motion

All Fluent components respect `prefers-reduced-motion`. Explicitly handle in Griffel:

```typescript
import { makeStyles } from '@griffel/react';
import { motionTokens } from '@fluentui/react-motion';

const useStyles = makeStyles({
  animated: {
    transition: `all ${motionTokens.durationNormal} ${motionTokens.curveEasyEase}`,
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});
```

`createPresenceComponent` and `createMotionComponent` handle this automatically — no extra code needed.

---

## 9. Component-Specific Accessibility Notes

### Avatar / AvatarGroup
- Presence badges on avatars ≤32px may be difficult for visually impaired users
- Always accompany small avatars with textual status representation
- Interactive avatars need `tabindex` for keyboard navigation

### Accordion
- `aria-expanded` on trigger; `active={true}` on open items

### Breadcrumb
- Wrap in `<nav aria-label="Breadcrumb">`
- Use `<ol>` for the list
- Add `aria-current="page"` to the last (current) item
- Use `disabledFocusable` for steps without a landing page

### Button (Disabled)
- Add tooltip explaining why button is disabled
- Use `disabled` or `disabledFocusable` prop (latter keeps focus for tooltip)

### Tree
- `aria-label` is required on the `<Tree>` element
- Badges and quick actions must have tooltips
- Quick actions must also be available via toolbar or menu (WAI-ARIA conformance)

### Toolbar
- When multiple toolbars exist on a page, label each with `aria-label`
- All icon-only buttons need `aria-label` + visible tooltip

### Carousel
- Auto-play requires mandatory pause controls
- Must accommodate 400% zoom

### List (with Selection)
- `listbox` + `option` roles when items are selectable
- `list` role (default) when no selection

---

## 10. Testing Checklist

### Automated Checks
- [ ] Color contrast ≥4.5:1 (standard text), ≥3:1 (large text / UI components)
- [ ] All form inputs have associated labels
- [ ] All images have alt text or `role="presentation"`
- [ ] `aria-live` regions present for dynamic content

### Keyboard Navigation
- [ ] All interactive elements reachable by Tab
- [ ] Focus indicator visible on all focusable elements
- [ ] Dialogs trap focus; return focus to trigger on close
- [ ] Arrow key navigation works within menus, trees, data grids, tab lists
- [ ] Escape closes overlays (dialogs, drawers, menus, popovers)

### Screen Reader (NVDA / JAWS / VoiceOver)
- [ ] All interactive elements announce their role, name, and state
- [ ] Error messages announced immediately on validation
- [ ] Dynamic content updates announced via `aria-live`
- [ ] Complex widgets (Tree, DataGrid, Menu) navigate correctly

### Zoom and Responsive
- [ ] Content reflows without horizontal scroll at 400% zoom
- [ ] Text zoom to 200% without clipping
- [ ] Minimum 320px width supported
- [ ] Touch targets ≥44×44px on web

---

## 11. High Contrast Mode

Fluent 2 tokens include a `webHighContrastTheme` variant. Key rules:

```typescript
import { webHighContrastTheme } from '@fluentui/react-components';

<FluentProvider theme={webHighContrastTheme}>
  <App />
</FluentProvider>
```

- Never use `background-image` or gradient as the only visual distinction
- Windows high contrast overrides `border-color` and `background-color` — always test
- Icon-only interfaces are especially impacted — ensure text alternatives exist
