#!/usr/bin/env python3
"""
scaffold_fluent_component.py — Scaffold a Fluent v9 5-file component.

Generates 7 files following the mandatory Fluent v9 pattern:
  ComponentName.tsx               Orchestrator (forwardRef, wires everything)
  ComponentName.types.ts          Props, Slots, State TypeScript types
  useComponentName.ts             State hook (business logic, slot setup)
  useComponentNameStyles.styles.ts Griffel styles (.styles.ts double extension)
  renderComponentName.tsx         Pure render (assertSlots + JSX pragma)
  index.ts                        Barrel export
  ComponentName.test.tsx          isConformant + behavioral tests

Usage:
  python3 scaffold_fluent_component.py Button --path ./src/components
  python3 scaffold_fluent_component.py MyCard --path ./src/components
"""

import argparse
import os
import sys
import textwrap


def pascal_to_camel(name: str) -> str:
    return name[0].lower() + name[1:]


def generate_types(name: str) -> str:
    camel = pascal_to_camel(name)
    return textwrap.dedent(f"""\
        import type {{ ComponentProps, ComponentState, Slot }} from '@fluentui/react-utilities';

        // Slots: which sub-elements are customizable
        export type {name}Slots = {{
          root: NonNullable<Slot<'div'>>;  // required — always renders
          // icon?: Slot<'span'>;          // optional — uncomment if needed
        }};

        // Props: public API (ComponentProps includes slot shorthand)
        export type {name}Props = ComponentProps<{name}Slots> & {{
          // Add custom props here
        }};

        // State: internal shape passed between hook, styles, and render
        export type {name}State = ComponentState<{name}Slots>;
        // & Required<Pick<{name}Props, 'someProp'>>  // uncomment for required state props
    """)


def generate_hook(name: str) -> str:
    camel = pascal_to_camel(name)
    return textwrap.dedent(f"""\
        import * as React from 'react';
        import {{ getNativeElementProps, slot }} from '@fluentui/react-utilities';
        import type {{ {name}Props, {name}State }} from './{name}.types';

        /**
         * use{name}_unstable — State hook for {name}.
         * Processes props, sets up slots, computes derived state.
         */
        export const use{name}_unstable = (
          props: {name}Props,
          ref: React.Ref<HTMLDivElement>,
        ): {name}State => {{
          return {{
            // Required: list of element types for each slot
            components: {{
              root: 'div',
            }},

            // slot.always: always renders (root is always required)
            root: slot.always(
              getNativeElementProps('div', {{ ref, ...props }}),
              {{ elementType: 'div' }},
            ),

            // slot.optional: only renders when the prop is provided
            // icon: slot.optional(props.icon, {{ elementType: 'span' }}),
          }};
        }};
    """)


def generate_styles(name: str) -> str:
    camel = pascal_to_camel(name)
    return textwrap.dedent(f"""\
        import {{ makeResetStyles, makeStyles, mergeClasses }} from '@griffel/react';
        import {{ tokens }} from '@fluentui/tokens';
        import type {{ {name}Slots, {name}State }} from './{name}.types';

        // Static class names for external CSS targeting (.fui-{name} {{ ... }})
        export const {camel}ClassNames: Record<keyof {name}Slots, string> = {{
          root: 'fui-{name}',
        }};

        // makeResetStyles: single atomic CSS class for base/default styles
        const useRootBaseClassName = makeResetStyles({{
          display: 'block',
          boxSizing: 'border-box',
          color: tokens.colorNeutralForeground1,
          fontFamily: tokens.fontFamilyBase,
          fontSize: tokens.fontSizeBase300,
          lineHeight: tokens.lineHeightBase300,
          '@media (prefers-reduced-motion: reduce)': {{
            transition: 'none',
          }},
        }});

        // makeStyles: variant class names (add variants here)
        const useRootStyles = makeStyles({{
          // example: large: {{ fontSize: tokens.fontSizeBase400 }},
        }});

        /**
         * use{name}Styles_unstable — Applies Griffel styles to {name}State.
         * Mutates state.root.className (and other slots).
         */
        export const use{name}Styles_unstable = (state: {name}State): {name}State => {{
          const rootBaseClassName = useRootBaseClassName();
          // const rootStyles = useRootStyles();

          // consumer className MUST be last (highest priority override)
          state.root.className = mergeClasses(
            {camel}ClassNames.root,     // static class (external targeting)
            rootBaseClassName,          // base reset styles
            // rootStyles.someVariant,  // variant styles
            state.root.className,       // consumer override — always last
          );

          return state;
        }};
    """)


def generate_render(name: str) -> str:
    camel = pascal_to_camel(name)
    return textwrap.dedent(f"""\
        /** @jsxRuntime automatic */
        /** @jsxImportSource @fluentui/react-jsx-runtime */

        // Both pragma lines are REQUIRED in every render*.tsx file.
        // The custom JSX factory handles slot prop spreading, ref forwarding, and `as` prop.

        import {{ assertSlots }} from '@fluentui/react-utilities';
        import type {{ {name}Slots, {name}State }} from './{name}.types';

        /**
         * render{name}_unstable — Pure render function for {name}.
         * No hooks allowed here. Only assertSlots + JSX.
         *
         * assertSlots replaces deprecated getSlots — provides TypeScript type narrowing.
         * NEVER use getSlots (removed in v10).
         */
        export const render{name}_unstable = (state: {name}State): JSX.Element => {{
          assertSlots<{name}Slots>(state);

          return (
            <state.root>
              {{state.root.children}}
            </state.root>
          );
        }};
    """)


def generate_orchestrator(name: str) -> str:
    camel = pascal_to_camel(name)
    return textwrap.dedent(f"""\
        import * as React from 'react';
        import type {{ ForwardRefComponent }} from '@fluentui/react-utilities';
        import {{ useCustomStyleHook_unstable }} from '@fluentui/react-shared-contexts';
        import {{ use{name}_unstable }} from './use{name}';
        import {{ use{name}Styles_unstable }} from './use{name}Styles.styles';
        import {{ render{name}_unstable }} from './render{name}';
        import type {{ {name}Props }} from './{name}.types';

        /**
         * {name} — Orchestrator component.
         *
         * Mandatory 4-step order:
         * 1. useHook_unstable(props, ref)        — compute state
         * 2. useStyles_unstable(state)           — apply styles
         * 3. useCustomStyleHook_unstable(name)   — consumer extension point
         * 4. renderComponent_unstable(state)     — pure render
         */
        export const {name}: ForwardRefComponent<{name}Props> = React.forwardRef(
          (props, ref) => {{
            const state = use{name}_unstable(props, ref);
            use{name}Styles_unstable(state);
            useCustomStyleHook_unstable('use{name}Styles_unstable')(state);
            return render{name}_unstable(state);
          }},
        ) as ForwardRefComponent<{name}Props>;

        {name}.displayName = '{name}';
    """)


def generate_index(name: str) -> str:
    camel = pascal_to_camel(name)
    return textwrap.dedent(f"""\
        export {{ {name} }} from './{name}';
        export type {{ {name}Props, {name}Slots, {name}State }} from './{name}.types';
        export {{ render{name}_unstable }} from './render{name}';
        export {{ use{name}_unstable }} from './use{name}';
        export {{ use{name}Styles_unstable, {camel}ClassNames }} from './use{name}Styles.styles';
    """)


def generate_test(name: str) -> str:
    camel = pascal_to_camel(name)
    return textwrap.dedent(f"""\
        import * as React from 'react';
        import {{ render, screen }} from '@testing-library/react';
        import {{ FluentProvider, webLightTheme }} from '@fluentui/react-components';
        import {{ {name} }} from './{name}';

        // Wrap renders with FluentProvider so tokens resolve
        const renderWithProvider = (ui: React.ReactElement) =>
          render(<FluentProvider theme={{webLightTheme}}>{{ui}}</FluentProvider>);

        // Conformance checklist (manual — isConformant is Fluent-monorepo-internal):
        // [x] displayName set
        // [ ] className merging verified
        // [ ] ref forwarding verified
        // [ ] Static class name 'fui-{name}' on root

        describe('{name}', () => {{
          it('sets correct displayName', () => {{
            expect({name}.displayName).toBe('{name}');
          }});

          it('renders children', () => {{
            renderWithProvider(<{name}>Test content</{name}>);
            expect(screen.getByText('Test content')).toBeInTheDocument();
          }});

          it('applies static class name to root', () => {{
            const {{ container }} = renderWithProvider(<{name}>Content</{name}>);
            expect(container.firstChild).toHaveClass('fui-{name}');
          }});

          it('merges consumer className', () => {{
            const {{ container }} = renderWithProvider(
              <{name} className="custom">Content</{name}>
            );
            expect(container.firstChild).toHaveClass('fui-{name}', 'custom');
          }});

          it('forwards ref to root element', () => {{
            const ref = React.createRef<HTMLDivElement>();
            renderWithProvider(<{name} ref={{ref}}>Content</{name}>);
            expect(ref.current?.tagName).toBe('DIV');
          }});
        }});
    """)


def scaffold(name: str, output_path: str) -> None:
    component_dir = os.path.join(output_path, name)
    os.makedirs(component_dir, exist_ok=True)

    camel = pascal_to_camel(name)

    files = {
        f"{name}.types.ts": generate_types(name),
        f"use{name}.ts": generate_hook(name),
        f"use{name}Styles.styles.ts": generate_styles(name),
        f"render{name}.tsx": generate_render(name),
        f"{name}.tsx": generate_orchestrator(name),
        f"index.ts": generate_index(name),
        f"{name}.test.tsx": generate_test(name),
    }

    for filename, content in files.items():
        filepath = os.path.join(component_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  created: {filepath}")

    print(f"\n✓ Scaffolded {name} ({len(files)} files) → {component_dir}")
    print(f"\nNext steps:")
    print(f"  1. Edit {name}.types.ts — define your slots and props")
    print(f"  2. Edit use{name}.ts — add business logic and slot setup")
    print(f"  3. Edit use{name}Styles.styles.ts — add Griffel variant styles")
    print(f"  4. Edit render{name}.tsx — update JSX structure for your slots")
    print(f"  5. Run: node .aicodepath/bin/aicodepath.js init")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scaffold a Fluent v9 5-file component",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
            Examples:
              python3 scaffold_fluent_component.py Button --path ./src/components
              python3 scaffold_fluent_component.py MyCard --path ./src/ui
        """),
    )
    parser.add_argument(
        "name",
        help="Component name in PascalCase (e.g., Button, MyCard, StatusBadge)",
    )
    parser.add_argument(
        "--path",
        default="./src/components",
        help="Output directory (default: ./src/components)",
    )

    args = parser.parse_args()

    if not args.name[0].isupper():
        print(f"Error: Component name must be PascalCase (got '{args.name}')")
        sys.exit(1)

    print(f"Scaffolding Fluent v9 component: {args.name}")
    print(f"Output path: {args.path}\n")

    scaffold(args.name, args.path)


if __name__ == "__main__":
    main()
