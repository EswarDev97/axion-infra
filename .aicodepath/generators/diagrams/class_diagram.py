"""Class/Component Diagram Generator - Generates class diagrams from OOP code."""
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple
import logging

from ..core.base_generator import BaseGenerator, DiagramOutput
from ..parsers.python_parser import PythonParser

logger = logging.getLogger(__name__)


class ClassEntity:
    """Represents a class or component."""

    def __init__(
        self,
        name: str,
        class_type: str = "class",
        stereotype: Optional[str] = None
    ):
        self.name = name
        self.class_type = class_type  # class, interface, abstract, component
        self.stereotype = stereotype  # <<interface>>, <<abstract>>, <<FunctionalComponent>>
        self.properties: List[Dict[str, str]] = []
        self.methods: List[Dict[str, str]] = []
        self.hooks: List[str] = []  # For React components
        self.state_vars: List[str] = []  # For React components
        self.inheritance: List[str] = []  # Parent classes
        self.implementations: List[str] = []  # Implemented interfaces
        self.compositions: List[Tuple[str, str]] = []  # (class_name, relationship_type)
        self.aggregations: List[Tuple[str, str]] = []  # (class_name, relationship_type)

    def add_property(self, name: str, prop_type: str, visibility: str = "+"):
        """Add a property to the class."""
        self.properties.append({
            'name': name,
            'type': prop_type,
            'visibility': visibility  # + public, - private, # protected
        })

    def add_method(self, name: str, return_type: str = "", visibility: str = "+", is_static: bool = False):
        """Add a method to the class."""
        self.methods.append({
            'name': name,
            'return_type': return_type,
            'visibility': visibility,
            'static': is_static
        })

    def add_hook(self, hook_name: str):
        """Add a React hook."""
        if hook_name not in self.hooks:
            self.hooks.append(hook_name)

    def add_state_var(self, var_name: str):
        """Add a state variable."""
        if var_name not in self.state_vars:
            self.state_vars.append(var_name)


class ClassDiagramGenerator(BaseGenerator):
    """Generator for Class/Component diagrams.

    Supports:
    - Python classes (OOP)
    - TypeScript classes and interfaces
    - React functional components with hooks

    Target confidence: 85-90%
    """

    def __init__(self):
        super().__init__()
        self.classes: Dict[str, ClassEntity] = {}
        self.python_parser = PythonParser()

    @property
    def diagram_type(self) -> str:
        """Return the type of diagram this generator produces."""
        return "class"

    @property
    def supported_extensions(self) -> List[str]:
        """Return list of file extensions this generator supports."""
        return ['.py', '.ts', '.tsx', '.js', '.jsx']

    def generate(self, source_files: List[str], options: Optional[Dict[str, Any]] = None) -> DiagramOutput:
        """Generate a class diagram from source files.

        Args:
            source_files: List of file paths to analyze
            options: Optional generation options:
                - show_private: bool - Show private methods/properties
                - show_relationships: bool - Show inheritance/composition
                - react_components: bool - Parse React components

        Returns:
            DiagramOutput: Generated class diagram in Mermaid format
        """
        options = options or {}
        self._clear_warnings()
        self.classes.clear()

        # Analyze all source files
        analyzed_files = self.analyze_files(source_files)

        if not analyzed_files:
            self._add_warning("No valid source files found")
            return DiagramOutput(
                mermaid_code="classDiagram\n    %% No classes found",
                confidence_score=0.0,
                metadata={'classes': 0, 'relationships': 0},
                warnings=self._get_warnings(),
                source_files=source_files
            )

        # Parse files based on type
        parser_types_used = set()

        for analyzed_file in analyzed_files:
            file_path = analyzed_file.path

            if file_path.endswith('.py'):
                self._parse_python_classes(analyzed_file)
                parser_types_used.add('AST')

            elif file_path.endswith(('.ts', '.tsx')):
                if options.get('react_components', True) and file_path.endswith('.tsx'):
                    self._parse_react_components(analyzed_file.content)
                    parser_types_used.add('regex')
                else:
                    self._parse_typescript_classes(analyzed_file.content)
                    parser_types_used.add('regex')

            elif file_path.endswith(('.js', '.jsx')):
                if options.get('react_components', True):
                    self._parse_react_components(analyzed_file.content)
                    parser_types_used.add('regex')

        # Detect relationships
        self._detect_inheritance()
        self._detect_composition()

        # Calculate confidence
        total_files = len(analyzed_files)
        code_coverage = len([f for f in analyzed_files if f.parsed_data or f.language in ['typescript', 'javascript']]) / max(total_files, 1)

        # Relationship accuracy based on detected relationships
        relationship_accuracy = self._calculate_relationship_accuracy()

        confidence = self.calculate_confidence(
            parser_types=list(parser_types_used),
            code_coverage=code_coverage,
            relationship_accuracy=relationship_accuracy
        )

        # Generate Mermaid diagram
        mermaid_code = self._build_mermaid(options)

        return DiagramOutput(
            mermaid_code=mermaid_code,
            confidence_score=confidence,
            metadata={
                'classes': len(self.classes),
                'relationships': sum(len(c.inheritance) + len(c.compositions) + len(c.aggregations) for c in self.classes.values()),
                'parser_types': list(parser_types_used)
            },
            warnings=self._get_warnings(),
            source_files=source_files
        )

    def _parse_python_classes(self, analyzed_file) -> None:
        """Parse Python classes using PythonParser."""
        if not analyzed_file.parsed_data:
            self._add_warning(f"Could not parse Python file: {analyzed_file.path}")
            return

        content = analyzed_file.content

        # Use regex for comprehensive class extraction
        class_pattern = re.compile(
            r'class\s+(\w+)\s*(?:\(([^)]*)\))?:',
            re.MULTILINE
        )

        for match in class_pattern.finditer(content):
            class_name = match.group(1)
            bases_str = match.group(2) or ""

            # Determine class type and stereotype
            is_abstract = 'ABC' in bases_str or 'Abstract' in class_name
            stereotype = '<<abstract>>' if is_abstract else None

            class_entity = ClassEntity(
                name=class_name,
                class_type='abstract' if is_abstract else 'class',
                stereotype=stereotype
            )

            # Parse inheritance
            if bases_str:
                bases = [b.strip() for b in bases_str.split(',')]
                class_entity.inheritance.extend(bases)

            # Extract class body
            class_start = match.end()
            class_content = self._extract_class_body(content, class_start)

            # Parse methods and properties
            self._parse_python_methods(class_entity, class_content)
            self._parse_python_properties(class_entity, class_content)

            self.classes[class_name] = class_entity

    def _extract_class_body(self, content: str, start_pos: int) -> str:
        """Extract the body of a class definition."""
        lines = content[start_pos:].split('\n')
        class_lines = []
        indent_level = None

        for line in lines:
            if not line.strip():
                continue

            current_indent = len(line) - len(line.lstrip())

            if indent_level is None:
                if line.strip():
                    indent_level = current_indent
                    class_lines.append(line)
            elif current_indent >= indent_level:
                class_lines.append(line)
            else:
                break

        return '\n'.join(class_lines)

    def _parse_python_methods(self, class_entity: ClassEntity, class_content: str) -> None:
        """Parse methods from Python class body."""
        # Pattern for method definitions
        method_pattern = re.compile(
            r'^\s+(def\s+(\w+)\s*\([^)]*\)\s*(?:->\s*([^:]+))?:)',
            re.MULTILINE
        )

        for match in method_pattern.finditer(class_content):
            method_name = match.group(2)
            return_type = match.group(3).strip() if match.group(3) else ""

            # Determine visibility
            if method_name.startswith('__') and not method_name.endswith('__'):
                visibility = '-'  # private
            elif method_name.startswith('_'):
                visibility = '#'  # protected
            else:
                visibility = '+'  # public

            # Check if static
            is_static = '@staticmethod' in class_content or '@classmethod' in class_content

            class_entity.add_method(
                name=method_name,
                return_type=return_type,
                visibility=visibility,
                is_static=is_static
            )

    def _parse_python_properties(self, class_entity: ClassEntity, class_content: str) -> None:
        """Parse properties from Python class body."""
        # Pattern for property definitions (self.property_name)
        property_pattern = re.compile(
            r'self\.(\w+)\s*(?::\s*([^\s=]+))?\s*=',
            re.MULTILINE
        )

        seen_properties = set()

        for match in property_pattern.finditer(class_content):
            prop_name = match.group(1)
            prop_type = match.group(2) or "Any"

            if prop_name in seen_properties:
                continue

            seen_properties.add(prop_name)

            # Determine visibility
            if prop_name.startswith('__'):
                visibility = '-'
            elif prop_name.startswith('_'):
                visibility = '#'
            else:
                visibility = '+'

            class_entity.add_property(
                name=prop_name,
                prop_type=prop_type,
                visibility=visibility
            )

    def _parse_typescript_classes(self, content: str) -> None:
        """Parse TypeScript classes and interfaces."""
        # Pattern for class definitions
        class_pattern = re.compile(
            r'(?:export\s+)?(?:abstract\s+)?(class|interface)\s+(\w+)(?:\s+extends\s+([^\s{]+))?(?:\s+implements\s+([^{]+))?\s*{',
            re.MULTILINE
        )

        for match in class_pattern.finditer(content):
            class_type = match.group(1)  # class or interface
            class_name = match.group(2)
            extends = match.group(3)
            implements = match.group(4)

            stereotype = '<<interface>>' if class_type == 'interface' else None

            class_entity = ClassEntity(
                name=class_name,
                class_type=class_type,
                stereotype=stereotype
            )

            # Parse inheritance
            if extends:
                class_entity.inheritance.append(extends.strip())

            # Parse implementations
            if implements:
                impls = [i.strip() for i in implements.split(',')]
                class_entity.implementations.extend(impls)

            # Extract class body
            class_start = match.end()
            class_content = self._extract_ts_class_body(content, class_start)

            # Parse members
            self._parse_typescript_members(class_entity, class_content)

            self.classes[class_name] = class_entity

    def _extract_ts_class_body(self, content: str, start_pos: int) -> str:
        """Extract TypeScript class body."""
        brace_count = 1
        end_pos = start_pos

        for i, char in enumerate(content[start_pos:], start=start_pos):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_pos = i
                    break

        return content[start_pos:end_pos]

    def _parse_typescript_members(self, class_entity: ClassEntity, class_content: str) -> None:
        """Parse TypeScript class members."""
        # Pattern for properties
        prop_pattern = re.compile(
            r'(public|private|protected)?\s*(\w+)\s*:\s*([^;=\n]+)',
            re.MULTILINE
        )

        # Pattern for methods
        method_pattern = re.compile(
            r'(public|private|protected)?\s*(static\s+)?(\w+)\s*\([^)]*\)\s*:\s*([^{;\n]+)',
            re.MULTILINE
        )

        for match in prop_pattern.finditer(class_content):
            visibility_str = match.group(1) or 'public'
            prop_name = match.group(2)
            prop_type = match.group(3).strip()

            # Skip methods
            if '(' in prop_type:
                continue

            visibility = self._ts_visibility_to_uml(visibility_str)

            class_entity.add_property(
                name=prop_name,
                prop_type=prop_type,
                visibility=visibility
            )

        for match in method_pattern.finditer(class_content):
            visibility_str = match.group(1) or 'public'
            is_static = match.group(2) is not None
            method_name = match.group(3)
            return_type = match.group(4).strip()

            visibility = self._ts_visibility_to_uml(visibility_str)

            class_entity.add_method(
                name=method_name,
                return_type=return_type,
                visibility=visibility,
                is_static=is_static
            )

    def _ts_visibility_to_uml(self, ts_visibility: str) -> str:
        """Convert TypeScript visibility to UML notation."""
        mapping = {
            'public': '+',
            'private': '-',
            'protected': '#'
        }
        return mapping.get(ts_visibility, '+')

    def _parse_react_components(self, content: str) -> None:
        """Parse React functional components with hooks."""
        # Pattern for functional components
        component_pattern = re.compile(
            r'(?:export\s+)?(?:const|function)\s+(\w+)\s*(?::\s*React\.FC(?:<[^>]+>)?)?\s*=?\s*\([^)]*\)\s*(?::\s*\w+)?\s*(?:=>)?\s*{',
            re.MULTILINE
        )

        for match in component_pattern.finditer(content):
            component_name = match.group(1)

            # Check if it's a component (starts with uppercase)
            if not component_name[0].isupper():
                continue

            component = ClassEntity(
                name=component_name,
                class_type='component',
                stereotype='<<FunctionalComponent>>'
            )

            # Extract component body
            component_start = match.end()
            component_content = self._extract_ts_class_body(content, component_start - 1)  # Include opening brace

            # Parse props (parameters)
            self._parse_react_props(component, content[match.start():match.end()])

            # Parse hooks
            self._parse_react_hooks(component, component_content)

            # Parse state variables
            self._parse_react_state(component, component_content)

            self.classes[component_name] = component

    def _parse_react_props(self, component: ClassEntity, signature: str) -> None:
        """Parse React component props from function signature."""
        # Extract props from function parameters
        props_match = re.search(r'\(\s*(?:{([^}]+)}|(\w+))\s*(?::\s*([^)]+))?\s*\)', signature)

        if props_match:
            destructured_props = props_match.group(1)
            named_props = props_match.group(2)
            props_type = props_match.group(3)

            if destructured_props:
                # Parse destructured props
                props = [p.strip() for p in destructured_props.split(',')]
                for prop in props:
                    prop_name = prop.split(':')[0].strip()
                    component.add_property(
                        name=prop_name,
                        prop_type='any',
                        visibility='+'
                    )

            elif named_props and props_type:
                component.add_property(
                    name=named_props,
                    prop_type=props_type.strip(),
                    visibility='+'
                )

    def _parse_react_hooks(self, component: ClassEntity, component_content: str) -> None:
        """Parse React hooks usage."""
        hook_pattern = re.compile(r'(use\w+)\s*\(')

        for match in hook_pattern.finditer(component_content):
            hook_name = match.group(1)
            component.add_hook(hook_name)

    def _parse_react_state(self, component: ClassEntity, component_content: str) -> None:
        """Parse state variables from useState hooks."""
        state_pattern = re.compile(r'const\s*\[(\w+),\s*set\w+\]\s*=\s*useState')

        for match in state_pattern.finditer(component_content):
            state_var = match.group(1)
            component.add_state_var(state_var)

    def _detect_inheritance(self) -> None:
        """Detect inheritance relationships between classes."""
        # Already parsed during class extraction
        pass

    def _detect_composition(self) -> None:
        """Detect composition and aggregation relationships."""
        for class_name, class_entity in self.classes.items():
            # Check properties for composition relationships
            for prop in class_entity.properties:
                prop_type = prop['type']

                # If property type matches another class, it's composition
                if prop_type in self.classes:
                    class_entity.compositions.append((prop_type, 'contains'))

    def _calculate_relationship_accuracy(self) -> float:
        """Calculate accuracy of relationship detection."""
        if not self.classes:
            return 0.0

        total_classes = len(self.classes)
        classes_with_relationships = 0

        for class_entity in self.classes.values():
            if class_entity.inheritance or class_entity.compositions or class_entity.aggregations:
                classes_with_relationships += 1

        # If no relationships found, assume standalone classes (still valid)
        if classes_with_relationships == 0:
            return 0.7

        return min(classes_with_relationships / total_classes * 1.2, 1.0)

    def _build_mermaid(self, options: Dict[str, Any]) -> str:
        """Generate Mermaid classDiagram syntax.

        Example output for React component:
        ```mermaid
        classDiagram
            class TenantTable {
                <<FunctionalComponent>>
                +tenants: Tenant[]
                +onEdit: function
                --state--
                selectedId: number
                --hooks--
                useState()
                useCallback()
            }
        ```
        """
        lines = ["classDiagram"]

        show_private = options.get('show_private', False)

        # Add class definitions
        for class_name, class_entity in sorted(self.classes.items()):
            # Class declaration
            lines.append(f"    class {class_name} {{")

            # Add stereotype
            if class_entity.stereotype:
                lines.append(f"        {class_entity.stereotype}")

            # Add properties
            for prop in class_entity.properties:
                visibility = prop['visibility']
                if not show_private and visibility == '-':
                    continue

                prop_name = prop['name']
                prop_type = prop['type']
                lines.append(f"        {visibility}{prop_name}: {prop_type}")

            # Add state section for React components
            if class_entity.state_vars:
                lines.append("        --state--")
                for state_var in class_entity.state_vars:
                    lines.append(f"        {state_var}: any")

            # Add methods
            for method in class_entity.methods:
                visibility = method['visibility']
                if not show_private and visibility == '-':
                    continue

                method_name = method['name']
                return_type = method['return_type']
                static_marker = '$ ' if method.get('static') else ''

                if return_type:
                    lines.append(f"        {static_marker}{visibility}{method_name}(): {return_type}")
                else:
                    lines.append(f"        {static_marker}{visibility}{method_name}()")

            # Add hooks section for React components
            if class_entity.hooks:
                lines.append("        --hooks--")
                for hook in class_entity.hooks:
                    lines.append(f"        {hook}()")

            lines.append("    }")

        # Add relationships
        if options.get('show_relationships', True):
            for class_name, class_entity in self.classes.items():
                # Inheritance
                for parent in class_entity.inheritance:
                    if parent in self.classes:
                        lines.append(f"    {parent} <|-- {class_name}")

                # Implementations
                for interface in class_entity.implementations:
                    if interface in self.classes:
                        lines.append(f"    {interface} <|.. {class_name}")

                # Composition
                for composed_class, rel_type in class_entity.compositions:
                    lines.append(f"    {class_name} *-- {composed_class}")

                # Aggregation
                for aggregated_class, rel_type in class_entity.aggregations:
                    lines.append(f"    {class_name} o-- {aggregated_class}")

        return '\n'.join(lines)
