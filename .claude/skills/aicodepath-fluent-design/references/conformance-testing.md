# Fluent 2 Conformance Testing

> Source: `@fluentui/react-conformance` + `@fluentui/react-conformance-griffel`
> Verified from `~/workspace/fluentui/packages/react-components/react-button/library/src/`

---

## 1. What Conformance Tests Check

Every Fluent v9 component must pass `isConformant`. This enforces the 5-file pattern and runtime behavior:

| Check | What it Verifies |
|-------|-----------------|
| `displayName` set | `Component.displayName = 'ComponentName'` |
| `className` merging | Consumer `className` passed to root element |
| `ref` forwarding | `React.forwardRef` connects to root DOM element |
| No unexpected props | No undocumented props leak to DOM |
| Static class names | `buttonClassNames.root` / `buttonClassNames.icon` set on elements |
| Griffel slot application | Styles applied to correct slots |

---

## 2. isConformant Setup

### Basic Setup (every component)
```typescript
// Button.test.tsx
import * as React from 'react';
import { isConformant } from '../../testing/isConformant';
import { Button } from './Button';
import type { ButtonProps } from './Button.types';

isConformant<ButtonProps>({
  Component: Button as React.FunctionComponent<ButtonProps>,
  displayName: 'Button',
});
```

### With Static Class Names
When the component has slots with static class names, declare them in `testOptions`:
```typescript
isConformant<ButtonProps>({
  Component: Button as React.FunctionComponent<ButtonProps>,
  displayName: 'Button',
  testOptions: {
    'has-static-classnames': [
      {
        props: { icon: 'Icon Test' },  // props that render the slot
      },
    ],
  },
});
```

### Skipping Specific Tests
When a test doesn't apply to a component:
```typescript
isConformant<ButtonProps>({
  Component: Button,
  displayName: 'Button',
  disabledTests: [
    'component-handles-ref',  // skip if component doesn't accept ref
  ],
});
```

---

## 3. Behavioral Tests

Beyond conformance, write behavioral tests with React Testing Library:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

describe('Button', () => {
  it('renders as a button element by default', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button').tagName).toBe('BUTTON');
  });

  it('renders as an anchor when href is provided', () => {
    const { getByRole } = render(<Button href="/page">Go</Button>);
    expect(getByRole('link').tagName).toBe('A');
  });

  it('calls onClick handler when clicked', () => {
    const onClick = jest.fn();
    const { getByRole } = render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies appearance class to root', () => {
    const { getByRole } = render(<Button appearance="primary">Primary</Button>);
    expect(getByRole('button')).toHaveClass('fui-Button');
  });
});
```

---

## 4. Test Infrastructure

### Transform: @swc/jest (not Babel)
```json
// jest.config.js
{
  "transform": {
    "^.+\\.(ts|tsx)$": "@swc/jest"
  }
}
```
`@swc/jest` is significantly faster than `babel-jest`. Always use it in Fluent component packages.

### Griffel Snapshot Serializer
```typescript
import { serializer } from '@griffel/jest-serializer';

expect.addSnapshotSerializer(serializer);

it('applies base className', () => {
  const { getByRole } = render(<Button>Click</Button>);
  expect(getByRole('button')).toMatchSnapshot();
  // Snapshot shows: className="fui-Button f19n0e5 ..."
});
```

The Griffel serializer makes CSS-in-JS snapshots readable — shows actual CSS properties instead of hashed class names.

### Hook Tests
```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useButton_unstable } from './useButton';

it('sets iconOnly when icon present and no children', () => {
  const ref = React.createRef<HTMLButtonElement>();
  const { result } = renderHook(() =>
    useButton_unstable({ icon: <span /> }, ref)
  );
  expect(result.current.iconOnly).toBe(true);
});
```

### Web Components: Playwright
Web component packages (not React components) use Playwright integration tests instead of Jest/RTL:
```typescript
// playwright-based for @fluentui/web-components
test('fluent-button renders', async ({ page }) => {
  await page.goto('/button');
  const button = page.locator('fluent-button');
  await expect(button).toBeVisible();
});
```

---

## 5. API Extractor (Public API Contract)

Each package maintains an API contract file at `library/etc/react-<name>.api.md`.

### Stability Tiers
| Suffix | Stability | When to Use |
|--------|-----------|-------------|
| *(none)* | Stable public API | Production-ready exports |
| `_unstable` | Public but shape may change | Components in active stabilization |
| `_private` | Internal only | **Never import in consumer code** |

### Example API Contract
```markdown
// @public
export const Button: ForwardRefComponent<ButtonProps>;

// @public (undocumented)
export type ButtonProps = ComponentProps<ButtonSlots> & {
  appearance?: 'secondary' | 'primary' | 'outline' | 'subtle' | 'transparent';
};

// @internal  ← NEVER import this from consumer code
export const ButtonContextProvider: React.Provider<ButtonContextValue | undefined>;
```

The `_unstable` suffix means the hook's parameter/return shape may change in a minor version — it does NOT mean the component is unsafe to use.

---

## 6. Bundle Size Tracking

Each component has a bundle size fixture in `library/bundle-size/`:

```typescript
// Button.fixture.js
export { Button } from '@fluentui/react-button';
```

The Fluent CI pipeline runs `@fluentui/bundle-size` tooling to compare bundle impact of PRs. New components should add fixtures.

---

## 7. Versioning: Beachball

Fluent uses **beachball** for automated semver management:

```bash
# Create a change file for your PR
yarn change

# Beachball prompts for: patch | minor | major
# Stable packages: only patch or minor (no majors without migration guide)
```

`CHANGELOG.json` tracks machine-readable entries. `CHANGELOG.md` is human-readable.

---

## 8. Complete Test File Example

```typescript
// CustomCard.test.tsx
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isConformant } from '../../testing/isConformant';
import { CustomCard } from './CustomCard';
import type { CustomCardProps } from './CustomCard.types';

// 1. Conformance (always first)
isConformant<CustomCardProps>({
  Component: CustomCard,
  displayName: 'CustomCard',
  testOptions: {
    'has-static-classnames': [{ props: {} }],
  },
});

// 2. Behavioral tests
describe('CustomCard', () => {
  it('renders children', () => {
    render(<CustomCard>Card content</CustomCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<CustomCard className="custom">Content</CustomCard>);
    expect(container.firstChild).toHaveClass('fui-CustomCard', 'custom');
  });

  it('forwards ref to root element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CustomCard ref={ref}>Content</CustomCard>);
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('renders as a different element via as prop', () => {
    render(<CustomCard as="section">Content</CustomCard>);
    expect(screen.getByText('Content').closest('section')).toBeInTheDocument();
  });
});
```

---

## 9. Checklist Before Merging a Custom Component

- [ ] `isConformant` passes for all exports
- [ ] `Component.displayName` set
- [ ] Consumer `className` merges correctly (last in `mergeClasses`)
- [ ] `ref` forwarding to root DOM element
- [ ] Static class names exported (`fui-ComponentName`, `fui-ComponentName__slotName`)
- [ ] `_unstable` suffix on hook and styles exports during stabilization
- [ ] `@jsxImportSource @fluentui/react-jsx-runtime` in `render*.tsx`
- [ ] `assertSlots` used (not deprecated `getSlots`)
- [ ] `useCustomStyleHook_unstable` wired in orchestrator
- [ ] All alias tokens (never hardcoded hex)
- [ ] `prefers-reduced-motion` handled in Griffel styles
- [ ] `index.ts` exports types separately with `export type`
