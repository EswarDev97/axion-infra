# Accessibility (WCAG 2.2) — Deep Reference

## WCAG 2.2 Quick Reference

### New Criteria (2.2 additions, commonly missed)

| SC | Name | Requirement |
|----|------|-------------|
| 2.4.11 AA | Focus Not Obscured | Focused element not fully hidden by sticky headers/footers |
| 2.4.12 AAA | Focus Not Obscured (Enhanced) | Focused element not partially hidden |
| 2.5.7 AA | Dragging Movements | Single-pointer alternative for all drag interactions |
| 2.5.8 AA | Target Size (Minimum) | Interactive targets ≥ 24×24 CSS pixels |
| 3.2.6 AA | Consistent Help | Help mechanisms in consistent location across pages |
| 3.3.7 A | Redundant Entry | Don't ask for same info twice in same process |
| 3.3.8 AA | Accessible Authentication | No cognitive test without alternative (e.g., CAPTCHA) |
| 3.3.9 AAA | Accessible Authentication (Enhanced) | No cognitive test at all |

---

## Copy-Paste Patterns

### Skip Link

```html
<!-- First element in <body> -->
<a class="skip-link" href="#main-content">Skip to main content</a>

<style>
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 9999;
}
.skip-link:focus { top: 0; }
</style>

<main id="main-content" tabindex="-1">...</main>
```

### Modal Focus Trap

```js
function trapFocus(modal) {
  const focusable = modal.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Close on Escape
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  first.focus(); // Set initial focus
}
```

```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-desc">Are you sure you want to delete this item?</p>
  <button>Cancel</button>
  <button>Confirm</button>
</div>
```

### Form with Accessible Error Handling

```html
<div>
  <label for="email">Email address</label>
  <input type="email" id="email" name="email"
         autocomplete="email"
         aria-required="true"
         aria-describedby="email-error"
         aria-invalid="true">
  <span id="email-error" role="alert">
    Enter a valid email address (e.g., name@example.com)
  </span>
</div>
```

### ARIA Tabs

```html
<div role="tablist" aria-label="Product information">
  <button role="tab" aria-selected="true"  aria-controls="panel-1" id="tab-1">Details</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2" tabindex="-1">Reviews</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>...</div>

<script>
document.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(document.activeElement);
  let next;
  if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
  if (e.key === 'ArrowLeft')  next = (index - 1 + tabs.length) % tabs.length;
  if (next !== undefined) { tabs[next].focus(); tabs[next].click(); }
});
</script>
```

### Live Regions (Dynamic Announcements)

```html
<!-- Status messages (polite — doesn't interrupt) -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  Form submitted successfully.
</div>

<!-- Urgent alerts (assertive — interrupts) -->
<div role="alert" aria-live="assertive" aria-atomic="true" class="sr-only">
  Error: Payment failed. Please try again.
</div>

<style>
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
</style>
```

### Dragging Movement Alternative (WCAG 2.5.7)

```html
<!-- Provide up/down buttons alongside drag-to-reorder -->
<ul id="sortable-list">
  <li>
    Item 1
    <button aria-label="Move Item 1 up" onclick="moveUp(this)">↑</button>
    <button aria-label="Move Item 1 down" onclick="moveDown(this)">↓</button>
  </li>
</ul>
```

### Focus Not Obscured Fix (WCAG 2.4.11)

```css
/* When sticky header is 64px tall, offset anchor scroll targets */
:target, :focus {
  scroll-margin-top: 80px; /* sticky header height + buffer */
}
```

---

## Target Size (WCAG 2.5.8)

```css
/* Minimum 24×24px, recommended 44×44px for mobile */
button, a, [role="button"] {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* If visual size must stay small, use padding to expand hit area */
.icon-btn {
  padding: 10px; /* adds invisible click area around 24px icon */
}
```

---

## Testing Tools

| Tool | Use for |
|------|---------|
| `axe DevTools` (browser ext) | Automated WCAG checks in browser |
| `WAVE` (browser ext) | Visual accessibility feedback |
| Lighthouse (DevTools) | Automated a11y score |
| NVDA + Firefox | Screen reader testing (Windows) |
| VoiceOver + Safari | Screen reader testing (macOS/iOS) |
| TalkBack | Screen reader testing (Android) |
| Colour Contrast Analyser | Manual contrast ratio checks |
| `npx axe-core-cli https://url` | CI automated checks |
