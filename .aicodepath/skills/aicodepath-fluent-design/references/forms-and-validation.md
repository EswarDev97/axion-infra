# Fluent 2 Forms & Validation

> Source: `@fluentui/react-field` + `@fluentui/react-positioning`
> Verified from `~/workspace/fluentui/packages/react-components/react-field/`

---

## 1. The Field Component (Mandatory for All Form Controls)

`<Field>` is the wrapper component that auto-wires all ARIA attributes. **Every form control must be wrapped in Field.**

### What Field Auto-Wires

| Field prop | What it connects |
|------------|-----------------|
| `label` | `htmlFor` → input `id` |
| `hint` | `aria-describedby` |
| `validationMessage` | `aria-describedby` + `aria-invalid="true"` (on error state) |
| `required` | `aria-required="true"` |

Without `<Field>`, none of these ARIA relationships are established. Screen readers cannot associate labels, hints, or validation messages with inputs.

### Supported Input Components
Checkbox, Combobox, Input, RadioGroup, Select, Slider, SpinButton, Switch, Textarea

### Basic Usage

```typescript
import { Field, Input, Label } from '@fluentui/react-components';

<Field
  label="Email address"
  hint="We'll never share your email"
  required
>
  <Input type="email" />
</Field>
```

### Layout Variants
```typescript
// Vertical (default) — label above input
<Field label="Name">
  <Input />
</Field>

// Horizontal — label beside input
<Field label="Name" orientation="horizontal">
  <Input />
</Field>
```

---

## 2. Validation States

Four states, each with a corresponding icon and color:

| State | Icon | Color | Trigger |
|-------|------|-------|---------|
| `'none'` | none | neutral | Default |
| `'success'` | checkmark | green | Valid input |
| `'warning'` | warning triangle | yellow | Valid but needs attention |
| `'error'` | error circle | red | Invalid input; sets `aria-invalid="true"` |

```typescript
// ✅ All four validation states
<Field
  label="Username"
  validationState="error"
  validationMessage="Username already taken"
>
  <Input />
</Field>

<Field
  label="Password"
  validationState="warning"
  validationMessage="Password is weak — consider adding numbers and symbols"
>
  <Input type="password" />
</Field>

<Field
  label="Email"
  validationState="success"
  validationMessage="Email is available"
>
  <Input type="email" />
</Field>
```

### Custom Validation Icon

```typescript
<Field
  label="Age"
  validationState="error"
  validationMessage="Must be 18 or older"
  validationMessageIcon={<ErrorCircle16Regular />}
>
  <Input type="number" />
</Field>
```

---

## 3. useFieldControlProps_unstable (Advanced)

Used inside custom input components to receive ARIA props from a parent `<Field>`:

```typescript
import { useFieldControlProps_unstable } from '@fluentui/react-field';

// Inside a custom input component:
const { id, 'aria-labelledby': ariaLabelledBy, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy } =
  useFieldControlProps_unstable({ id: props.id });
```

This allows custom components to participate in the Field ARIA system.

---

## 4. Form Layout Patterns

### Simple Form
```typescript
<form onSubmit={handleSubmit}>
  <Field label="First name" required>
    <Input />
  </Field>
  <Field label="Last name" required>
    <Input />
  </Field>
  <Field label="Email" required>
    <Input type="email" />
  </Field>
  <Button type="submit" appearance="primary">Create account</Button>
</form>
```

### Dialog Form
When using a form inside a Dialog, place `<form>` between `<DialogSurface>` and `<DialogBody>`:

```typescript
<Dialog>
  <DialogTrigger>
    <Button>Open form</Button>
  </DialogTrigger>
  <DialogSurface>
    <form onSubmit={handleSubmit}>
      <DialogBody>
        <DialogTitle>Create project</DialogTitle>
        <DialogContent>
          <Field label="Project name" required>
            <Input />
          </Field>
        </DialogContent>
        <DialogActions>
          <DialogTrigger>
            <Button appearance="secondary">Cancel</Button>
          </DialogTrigger>
          <Button type="submit" appearance="primary">Create</Button>
        </DialogActions>
      </DialogBody>
    </form>
  </DialogSurface>
</Dialog>
```

### React Hook Form Integration
```typescript
import { useForm, Controller } from 'react-hook-form';

const { control, handleSubmit, formState: { errors } } = useForm();

<form onSubmit={handleSubmit(onSubmit)}>
  <Controller
    name="email"
    control={control}
    rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
    render={({ field }) => (
      <Field
        label="Email"
        required
        validationState={errors.email ? 'error' : 'none'}
        validationMessage={errors.email?.message}
      >
        <Input type="email" {...field} />
      </Field>
    )}
  />
  <Button type="submit" appearance="primary">Submit</Button>
</form>
```

---

## 5. Positioning System

The positioning system (`@fluentui/react-positioning`) wraps `@floating-ui/dom` with Fluent-specific vocabulary. Used by Popover, Tooltip, Menu, Combobox, Dropdown, TagPicker.

### Position Vocabulary

Fluent uses directional terms rather than CSS physical properties:

| Fluent Term | Meaning |
|-------------|---------|
| `'above'` | CSS `top` |
| `'below'` | CSS `bottom` |
| `'before'` | CSS `left` (start in LTR) |
| `'after'` | CSS `right` (end in LTR) |

This supports RTL layouts automatically.

### usePositioning Hook

```typescript
import { usePositioning } from '@fluentui/react-positioning';

const { targetRef, containerRef } = usePositioning({
  position: 'below',               // 'above' | 'below' | 'before' | 'after'
  align: 'start',                  // 'start' | 'center' | 'end'
  offset: { crossAxis: 0, mainAxis: 8 },  // gap from target
  flipBoundary: 'clippingAncestors',
  overflowBoundary: 'clippingAncestors',
  autoSize: 'width',               // match trigger width
});

// Attach refs to trigger and floating element
<button ref={targetRef}>Open</button>
<div ref={containerRef}>Floating content</div>
```

### Popover with Custom Positioning
```typescript
<Popover
  positioning={{
    position: 'above',
    align: 'end',
    offset: { mainAxis: 4 },
  }}
>
  <PopoverTrigger>
    <Button>Open</Button>
  </PopoverTrigger>
  <PopoverSurface>Content</PopoverSurface>
</Popover>
```

---

## 6. Content Rules for Form Elements

### Labels
- Sentence-case (first word + proper nouns only)
- Brief phrases; no ending punctuation
- No colons (Field adds visual separation)
- Never use placeholder as substitute for label

### Hint Text (below label)
- Accepted formats, constraints, supplementary context
- Bullets for multiple requirements
- No ending punctuation for single fragments

### Validation Messages
- Brief; punctuation only for multiple sentences
- Error: state what is wrong and what to do
- Warning: state the concern and why it matters
- Success: confirm what is correct (optional)

### Placeholder Text
- Supplementary hints only — not required information
- No periods
- Placeholder must have `aria-label` if no other label exists
- **Never** use placeholder as the only label

### Required Fields
- Mark with `required` prop on `<Field>` (adds asterisk and `aria-required`)
- State "Required fields are marked with *" at the top of form

---

## 7. Accessibility Checklist for Forms

- [ ] Every input wrapped in `<Field>`
- [ ] Every `<Field>` has a `label` (never placeholder-only)
- [ ] Required fields use `required` prop on `<Field>`
- [ ] Error states use `validationState="error"` (auto-sets `aria-invalid`)
- [ ] Error messages describe what is wrong and how to fix it
- [ ] Form submittable by keyboard (Enter in text fields, Tab to button)
- [ ] Focus returns to errored field or first error after failed submission
- [ ] Inline error messages are associated via `aria-describedby` (automatic via Field)
- [ ] No color-only error indication — always include icon + message

---

## 8. Anti-Patterns

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|--------------------|
| `<Input aria-label="Email" />` without `<Field>` | Missing label→htmlFor, hint→describedby, error→aria-invalid | Wrap in `<Field label="Email">` |
| Placeholder as sole label | Disappears on input; screen readers can miss it | Use `label` prop on `<Field>` |
| `style={{ border: '1px solid red' }}` for errors | Color-only; no programmatic meaning | Use `validationState="error"` |
| Manual `aria-invalid` on input | Redundant; Field handles this automatically | Use `validationState="error"` on Field |
| Multiple primary buttons in a form | Destroys visual hierarchy | One primary submit button per form |
| Generic validation messages ("Invalid input") | Not helpful; user doesn't know what to fix | Be specific: "Password must be at least 8 characters" |
