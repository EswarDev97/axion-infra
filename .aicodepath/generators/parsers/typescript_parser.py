"""TypeScript/TSX parser using tree-sitter."""
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import logging

try:
    from tree_sitter import Language, Parser, Node
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False
    Logger = None
    Parser = None
    Node = None

logger = logging.getLogger(__name__)


class ClassEntity:
    """Represents a TypeScript class."""

    def __init__(
        self,
        name: str,
        line: int,
        is_exported: bool = False,
        extends: Optional[str] = None,
        implements: List[str] = None,
        methods: List[str] = None,
        properties: List[str] = None
    ):
        self.name = name
        self.line = line
        self.is_exported = is_exported
        self.extends = extends
        self.implements = implements or []
        self.methods = methods or []
        self.properties = properties or []


class InterfaceEntity:
    """Represents a TypeScript interface."""

    def __init__(
        self,
        name: str,
        line: int,
        is_exported: bool = False,
        extends: List[str] = None,
        properties: List[Dict[str, str]] = None
    ):
        self.name = name
        self.line = line
        self.is_exported = is_exported
        self.extends = extends or []
        self.properties = properties or []


class ComponentEntity:
    """Represents a React component."""

    def __init__(
        self,
        name: str,
        line: int,
        is_exported: bool = False,
        props_type: Optional[str] = None,
        is_functional: bool = True,
        hooks_used: List[str] = None
    ):
        self.name = name
        self.line = line
        self.is_exported = is_exported
        self.props_type = props_type
        self.is_functional = is_functional
        self.hooks_used = hooks_used or []


class TypeScriptParser:
    """Parser for TypeScript/TSX code using tree-sitter."""

    def __init__(self):
        self.confidence = 0.85  # TypeScript parsing with tree-sitter
        self.parser = None
        self._initialize_parser()

    def _initialize_parser(self):
        """Initialize tree-sitter parser with TypeScript grammar."""
        if not TREE_SITTER_AVAILABLE:
            logger.warning("tree-sitter not available. TypeScript parsing will be limited.")
            self.confidence = 0.0
            return

        try:
            # Try to load pre-built TypeScript grammar
            # Note: In production, you'd need to build the grammar first
            # This is a placeholder - actual implementation would need:
            # 1. Clone tree-sitter-typescript
            # 2. Build the grammar using tree-sitter CLI
            # 3. Load the compiled grammar

            # For now, we'll set up the structure
            self.parser = Parser()
            logger.info("TypeScript parser initialized (grammar needs to be built)")

        except Exception as e:
            logger.error(f"Failed to initialize TypeScript parser: {e}")
            self.confidence = 0.0

    def parse_file(self, file_path: str) -> Optional[Any]:
        """
        Parse TypeScript/TSX file.

        Args:
            file_path: Path to the TypeScript file

        Returns:
            Tree-sitter tree or None if parsing fails
        """
        if not self.parser:
            logger.error("Parser not initialized")
            return None

        try:
            path = Path(file_path)
            if not path.exists():
                logger.error(f"File not found: {file_path}")
                return None

            if path.suffix not in ['.ts', '.tsx', '.js', '.jsx']:
                logger.warning(f"Not a TypeScript/JavaScript file: {file_path}")
                return None

            with open(path, 'r', encoding='utf-8') as f:
                source = f.read()

            tree = self.parser.parse(bytes(source, 'utf8'))
            return tree

        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return None

    def extract_classes(self, tree: Any) -> List[ClassEntity]:
        """
        Extract class definitions from tree.

        Args:
            tree: Tree-sitter parse tree

        Returns:
            List of ClassEntity objects
        """
        classes = []

        if not tree:
            return classes

        try:
            # Query for class declarations
            # (class_declaration name: (type_identifier) @name)
            root_node = tree.root_node

            for node in self._traverse_tree(root_node):
                if node.type == 'class_declaration':
                    class_entity = self._extract_class_info(node)
                    if class_entity:
                        classes.append(class_entity)

        except Exception as e:
            logger.error(f"Error extracting classes: {e}")

        return classes

    def extract_interfaces(self, tree: Any) -> List[InterfaceEntity]:
        """
        Extract TypeScript interfaces from tree.

        Args:
            tree: Tree-sitter parse tree

        Returns:
            List of InterfaceEntity objects
        """
        interfaces = []

        if not tree:
            return interfaces

        try:
            root_node = tree.root_node

            for node in self._traverse_tree(root_node):
                if node.type == 'interface_declaration':
                    interface_entity = self._extract_interface_info(node)
                    if interface_entity:
                        interfaces.append(interface_entity)

        except Exception as e:
            logger.error(f"Error extracting interfaces: {e}")

        return interfaces

    def extract_react_components(self, tree: Any) -> List[ComponentEntity]:
        """
        Extract React functional components from tree.

        This finds:
        1. Function declarations that return JSX
        2. Arrow functions assigned to const that return JSX

        Tree-sitter query pattern:
        ```
        (function_declaration
          name: (identifier) @component_name
          body: (statement_block
            (return_statement
              (jsx_element)))) @component

        (lexical_declaration
          (variable_declarator
            name: (identifier) @component_name
            value: (arrow_function
              body: (jsx_element)))) @component
        ```

        Args:
            tree: Tree-sitter parse tree

        Returns:
            List of ComponentEntity objects
        """
        components = []

        if not tree:
            return components

        try:
            root_node = tree.root_node

            for node in self._traverse_tree(root_node):
                # Function declaration that returns JSX
                if node.type == 'function_declaration':
                    if self._returns_jsx(node):
                        component = self._extract_component_info(node, is_arrow=False)
                        if component:
                            components.append(component)

                # Arrow function assigned to const
                elif node.type == 'lexical_declaration':
                    component = self._extract_arrow_component(node)
                    if component:
                        components.append(component)

        except Exception as e:
            logger.error(f"Error extracting React components: {e}")

        return components

    def extract_hooks(self, tree: Any) -> Dict[str, List[str]]:
        """
        Find hook usage in the tree.

        Args:
            tree: Tree-sitter parse tree

        Returns:
            Dictionary mapping component names to list of hooks used
        """
        hooks_by_component = {}

        if not tree:
            return hooks_by_component

        try:
            # Common React hooks
            react_hooks = {
                'useState', 'useEffect', 'useContext', 'useReducer',
                'useCallback', 'useMemo', 'useRef', 'useImperativeHandle',
                'useLayoutEffect', 'useDebugValue', 'useTransition',
                'useDeferredValue', 'useId', 'useInsertionEffect'
            }

            root_node = tree.root_node
            current_component = None

            for node in self._traverse_tree(root_node):
                # Track current component
                if node.type in ['function_declaration', 'lexical_declaration']:
                    name = self._get_node_name(node)
                    if name and name[0].isupper():  # Component names are capitalized
                        current_component = name
                        hooks_by_component[current_component] = []

                # Look for hook calls
                if node.type == 'call_expression':
                    callee_name = self._get_callee_name(node)
                    if callee_name in react_hooks and current_component:
                        hooks_by_component[current_component].append(callee_name)

        except Exception as e:
            logger.error(f"Error extracting hooks: {e}")

        return hooks_by_component

    def extract_props(self, tree: Any) -> Dict[str, List[Dict[str, str]]]:
        """
        Extract prop types from interfaces.

        Args:
            tree: Tree-sitter parse tree

        Returns:
            Dictionary mapping interface names to list of properties
        """
        props_by_interface = {}

        try:
            interfaces = self.extract_interfaces(tree)

            for interface in interfaces:
                if 'Props' in interface.name or 'Properties' in interface.name:
                    props_by_interface[interface.name] = interface.properties

        except Exception as e:
            logger.error(f"Error extracting props: {e}")

        return props_by_interface

    def _traverse_tree(self, node: Any) -> List[Any]:
        """Traverse tree-sitter tree and yield all nodes."""
        if not node:
            return

        yield node

        for child in node.children:
            yield from self._traverse_tree(child)

    def _extract_class_info(self, node: Any) -> Optional[ClassEntity]:
        """Extract class information from class declaration node."""
        try:
            name = None
            is_exported = False
            extends = None
            implements = []
            methods = []
            properties = []

            # Find name
            for child in node.children:
                if child.type == 'type_identifier':
                    name = child.text.decode('utf-8')
                elif child.type == 'class_heritage':
                    # Extract extends and implements
                    pass
                elif child.type == 'class_body':
                    # Extract methods and properties
                    for body_child in child.children:
                        if body_child.type == 'method_definition':
                            method_name = self._get_node_name(body_child)
                            if method_name:
                                methods.append(method_name)
                        elif body_child.type == 'field_definition':
                            prop_name = self._get_node_name(body_child)
                            if prop_name:
                                properties.append(prop_name)

            # Check if exported
            parent = node.parent
            if parent and parent.type == 'export_statement':
                is_exported = True

            if name:
                return ClassEntity(
                    name=name,
                    line=node.start_point[0] + 1,
                    is_exported=is_exported,
                    extends=extends,
                    implements=implements,
                    methods=methods,
                    properties=properties
                )

        except Exception as e:
            logger.error(f"Error extracting class info: {e}")

        return None

    def _extract_interface_info(self, node: Any) -> Optional[InterfaceEntity]:
        """Extract interface information from interface declaration node."""
        try:
            name = None
            is_exported = False
            extends = []
            properties = []

            for child in node.children:
                if child.type == 'type_identifier':
                    name = child.text.decode('utf-8')
                elif child.type == 'object_type':
                    # Extract properties
                    for prop in child.children:
                        if prop.type == 'property_signature':
                            prop_name = self._get_node_name(prop)
                            prop_type = self._get_property_type(prop)
                            if prop_name:
                                properties.append({
                                    'name': prop_name,
                                    'type': prop_type or 'any'
                                })

            # Check if exported
            parent = node.parent
            if parent and parent.type == 'export_statement':
                is_exported = True

            if name:
                return InterfaceEntity(
                    name=name,
                    line=node.start_point[0] + 1,
                    is_exported=is_exported,
                    extends=extends,
                    properties=properties
                )

        except Exception as e:
            logger.error(f"Error extracting interface info: {e}")

        return None

    def _extract_component_info(self, node: Any, is_arrow: bool = False) -> Optional[ComponentEntity]:
        """Extract component information from function node."""
        try:
            name = self._get_node_name(node)
            if not name or not name[0].isupper():  # Component names are capitalized
                return None

            is_exported = False
            parent = node.parent
            if parent and 'export' in parent.type:
                is_exported = True

            # Extract props type from parameters
            props_type = self._get_props_type(node)

            # Extract hooks used
            hooks_used = self._get_hooks_in_function(node)

            return ComponentEntity(
                name=name,
                line=node.start_point[0] + 1,
                is_exported=is_exported,
                props_type=props_type,
                is_functional=True,
                hooks_used=hooks_used
            )

        except Exception as e:
            logger.error(f"Error extracting component info: {e}")

        return None

    def _extract_arrow_component(self, node: Any) -> Optional[ComponentEntity]:
        """Extract component from arrow function assigned to const."""
        try:
            for child in node.children:
                if child.type == 'variable_declarator':
                    name_node = None
                    value_node = None

                    for subchild in child.children:
                        if subchild.type == 'identifier':
                            name_node = subchild
                        elif subchild.type == 'arrow_function':
                            value_node = subchild

                    if name_node and value_node:
                        name = name_node.text.decode('utf-8')
                        if name[0].isupper() and self._returns_jsx(value_node):
                            return self._extract_component_info(value_node, is_arrow=True)

        except Exception as e:
            logger.error(f"Error extracting arrow component: {e}")

        return None

    def _returns_jsx(self, node: Any) -> bool:
        """Check if function returns JSX."""
        try:
            for child in self._traverse_tree(node):
                if child.type in ['jsx_element', 'jsx_self_closing_element', 'jsx_fragment']:
                    return True
        except Exception:
            pass

        return False

    def _get_node_name(self, node: Any) -> Optional[str]:
        """Get name from various node types."""
        try:
            for child in node.children:
                if child.type in ['identifier', 'type_identifier', 'property_identifier']:
                    return child.text.decode('utf-8')
        except Exception:
            pass

        return None

    def _get_callee_name(self, node: Any) -> Optional[str]:
        """Get function name from call expression."""
        try:
            for child in node.children:
                if child.type == 'identifier':
                    return child.text.decode('utf-8')
        except Exception:
            pass

        return None

    def _get_props_type(self, node: Any) -> Optional[str]:
        """Extract props type annotation from function parameters."""
        try:
            for child in node.children:
                if child.type == 'formal_parameters':
                    for param in child.children:
                        if param.type == 'required_parameter':
                            for subparam in param.children:
                                if subparam.type == 'type_annotation':
                                    return subparam.text.decode('utf-8')
        except Exception:
            pass

        return None

    def _get_property_type(self, node: Any) -> Optional[str]:
        """Extract property type from property signature."""
        try:
            for child in node.children:
                if child.type == 'type_annotation':
                    for type_child in child.children:
                        if type_child.type != ':':
                            return type_child.text.decode('utf-8')
        except Exception:
            pass

        return None

    def _get_hooks_in_function(self, node: Any) -> List[str]:
        """Get list of hooks used in function."""
        hooks = []
        react_hooks = {
            'useState', 'useEffect', 'useContext', 'useReducer',
            'useCallback', 'useMemo', 'useRef'
        }

        try:
            for child in self._traverse_tree(node):
                if child.type == 'call_expression':
                    callee_name = self._get_callee_name(child)
                    if callee_name in react_hooks:
                        hooks.append(callee_name)
        except Exception:
            pass

        return hooks

    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a TypeScript file and return comprehensive metadata.

        Args:
            file_path: Path to the TypeScript file

        Returns:
            Dictionary with classes, interfaces, components, and metrics
        """
        result = {
            'file': file_path,
            'classes': [],
            'interfaces': [],
            'components': [],
            'hooks_usage': {},
            'metrics': {
                'total_classes': 0,
                'total_interfaces': 0,
                'total_components': 0,
                'lines_of_code': 0
            },
            'confidence': self.confidence
        }

        try:
            tree = self.parse_file(file_path)
            if not tree:
                result['confidence'] = 0.0
                return result

            # Extract entities
            classes = self.extract_classes(tree)
            interfaces = self.extract_interfaces(tree)
            components = self.extract_react_components(tree)
            hooks_usage = self.extract_hooks(tree)

            result['classes'] = [vars(c) for c in classes]
            result['interfaces'] = [vars(i) for i in interfaces]
            result['components'] = [vars(c) for c in components]
            result['hooks_usage'] = hooks_usage

            # Calculate metrics
            result['metrics']['total_classes'] = len(classes)
            result['metrics']['total_interfaces'] = len(interfaces)
            result['metrics']['total_components'] = len(components)

            # Count lines of code
            with open(file_path, 'r', encoding='utf-8') as f:
                result['metrics']['lines_of_code'] = sum(1 for line in f if line.strip())

        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {e}")
            result['error'] = str(e)
            result['confidence'] = 0.5

        return result
