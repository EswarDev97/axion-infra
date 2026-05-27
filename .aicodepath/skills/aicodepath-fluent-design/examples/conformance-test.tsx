/**
 * conformance-test.tsx — Template for Fluent component conformance tests.
 *
 * isConformant is an internal Fluent test utility from @fluentui/react-conformance.
 * It enforces the 5-file pattern runtime requirements:
 * - displayName set (Component.displayName = 'Name')
 * - className merging (consumer className flows to root element)
 * - ref forwarding (React.forwardRef connects to root DOM element)
 * - No unexpected props leaking to DOM
 * - Static class names on slots (fui-ComponentName, fui-ComponentName__slotName)
 *
 * This pattern is used in the Fluent monorepo — not a public npm package.
 * For external components, adapt the checklist to your test framework.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// isConformant is internal to the Fluent monorepo — shown here as a pattern reference
// import { isConformant } from '@fluentui/react-conformance';

// For external Fluent-style components, manually verify these conformance rules:

/**
 * CONFORMANCE CHECKLIST (verify each manually if not using isConformant):
 *
 * 1. displayName set
 *    - MyComponent.displayName = 'MyComponent'
 *    - Verify: MyComponent.displayName === 'MyComponent'
 *
 * 2. className merging
 *    - Consumer <MyComponent className="custom" /> should add 'custom' to root element
 *    - Verify: root element has both 'fui-MyComponent' and 'custom'
 *
 * 3. ref forwarding
 *    - const ref = React.createRef<HTMLDivElement>()
 *    - render(<MyComponent ref={ref} />)
 *    - Verify: ref.current.tagName === 'DIV'
 *
 * 4. Static class names
 *    - root element has 'fui-MyComponent'
 *    - icon slot (if present) has 'fui-MyComponent__icon'
 *
 * 5. @jsxImportSource pragma in renderMyComponent.tsx
 * 6. assertSlots used (not getSlots)
 * 7. useCustomStyleHook_unstable wired in orchestrator
 * 8. All alias tokens (no hardcoded hex)
 */

// Example: Adapting for a custom Fluent-style component

// Imaginary CustomCard component for illustration
const CustomCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { title: string }
>(({ title, className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={['fui-CustomCard', className].filter(Boolean).join(' ')}
      {...props}
    >
      <span className="fui-CustomCard__title">{title}</span>
      {children}
    </div>
  );
});
CustomCard.displayName = 'CustomCard';

// Behavioral tests (standard React Testing Library)
describe('CustomCard', () => {
  it('renders with correct displayName', () => {
    expect(CustomCard.displayName).toBe('CustomCard');
  });

  it('applies static class name to root', () => {
    const { container } = render(<CustomCard title="Test">Content</CustomCard>);
    expect(container.firstChild).toHaveClass('fui-CustomCard');
  });

  it('merges consumer className with static class', () => {
    const { container } = render(
      <CustomCard title="Test" className="custom-class">Content</CustomCard>
    );
    expect(container.firstChild).toHaveClass('fui-CustomCard', 'custom-class');
  });

  it('forwards ref to root DOM element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CustomCard ref={ref} title="Test">Content</CustomCard>);
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('renders title in title slot', () => {
    render(<CustomCard title="My Title">Content</CustomCard>);
    const titleEl = document.querySelector('.fui-CustomCard__title');
    expect(titleEl?.textContent).toBe('My Title');
  });

  it('renders children', () => {
    render(<CustomCard title="Test">Card content</CustomCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });
});

// If using the actual isConformant from @fluentui/react-conformance (monorepo only):
/*
isConformant({
  Component: CustomCard,
  displayName: 'CustomCard',
  testOptions: {
    'has-static-classnames': [{ props: { title: 'Test' } }],
  },
  // Skip tests that don't apply
  disabledTests: [],
});
*/
