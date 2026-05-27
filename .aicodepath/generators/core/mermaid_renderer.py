"""Utility class for building Mermaid diagram syntax."""
from typing import List, Dict, Optional, Any
from enum import Enum


class NodeShape(str, Enum):
    """Mermaid node shapes."""
    RECTANGLE = "rectangle"
    ROUNDED = "rounded"
    STADIUM = "stadium"
    SUBROUTINE = "subroutine"
    CYLINDRICAL = "cylindrical"
    CIRCLE = "circle"
    ASYMMETRIC = "asymmetric"
    RHOMBUS = "rhombus"
    HEXAGON = "hexagon"
    PARALLELOGRAM = "parallelogram"
    TRAPEZOID = "trapezoid"


class EdgeStyle(str, Enum):
    """Mermaid edge styles."""
    SOLID = "solid"
    DOTTED = "dotted"
    THICK = "thick"


class DiagramType(str, Enum):
    """Supported Mermaid diagram types."""
    FLOWCHART = "flowchart"
    SEQUENCE = "sequenceDiagram"
    CLASS = "classDiagram"
    ERD = "erDiagram"
    STATE = "stateDiagram-v2"
    GANTT = "gantt"
    PIE = "pie"
    C4 = "C4Context"


class MermaidRenderer:
    """Utility class for building Mermaid diagram syntax.

    This class provides a fluent API for constructing Mermaid diagrams
    with proper syntax and formatting.
    """

    # Shape syntax mapping
    SHAPE_SYNTAX = {
        NodeShape.RECTANGLE: ("[", "]"),
        NodeShape.ROUNDED: ("(", ")"),
        NodeShape.STADIUM: ("([", "])"),
        NodeShape.SUBROUTINE: ("[[", "]]"),
        NodeShape.CYLINDRICAL: ("[(", ")]"),
        NodeShape.CIRCLE: ("((", "))"),
        NodeShape.ASYMMETRIC: (">", "]"),
        NodeShape.RHOMBUS: ("{", "}"),
        NodeShape.HEXAGON: ("{{", "}}"),
        NodeShape.PARALLELOGRAM: ("[/", "/]"),
        NodeShape.TRAPEZOID: ("[\\", "\\]"),
    }

    def __init__(self):
        """Initialize the renderer."""
        self._lines: List[str] = []
        self._diagram_type: Optional[str] = None
        self._indentation: int = 0
        self._indent_size: int = 4

    def start_diagram(self, diagram_type: DiagramType, direction: Optional[str] = None) -> 'MermaidRenderer':
        """Start a diagram definition.

        Args:
            diagram_type: Type of diagram to create
            direction: Optional direction for flowcharts (TD, LR, etc.)

        Returns:
            Self for method chaining
        """
        self._diagram_type = diagram_type.value

        if diagram_type == DiagramType.FLOWCHART and direction:
            self._lines.append(f"{diagram_type.value} {direction}")
        else:
            self._lines.append(diagram_type.value)

        self._indentation += 1
        return self

    def add_node(
        self,
        node_id: str,
        label: str,
        shape: NodeShape = NodeShape.RECTANGLE
    ) -> 'MermaidRenderer':
        """Add a node to the diagram.

        Args:
            node_id: Unique identifier for the node
            label: Display label for the node
            shape: Shape of the node

        Returns:
            Self for method chaining
        """
        open_shape, close_shape = self.SHAPE_SYNTAX[shape]
        line = f"{self._indent()}{node_id}{open_shape}\"{label}\"{close_shape}"
        self._lines.append(line)
        return self

    def add_edge(
        self,
        from_id: str,
        to_id: str,
        label: Optional[str] = None,
        style: EdgeStyle = EdgeStyle.SOLID
    ) -> 'MermaidRenderer':
        """Add an edge between nodes.

        Args:
            from_id: Source node ID
            to_id: Target node ID
            label: Optional edge label
            style: Style of the edge

        Returns:
            Self for method chaining
        """
        arrow = self._get_arrow_syntax(style)

        if label:
            line = f"{self._indent()}{from_id} {arrow}|{label}| {to_id}"
        else:
            line = f"{self._indent()}{from_id} {arrow} {to_id}"

        self._lines.append(line)
        return self

    def add_class(
        self,
        name: str,
        attributes: Optional[List[str]] = None,
        methods: Optional[List[str]] = None
    ) -> 'MermaidRenderer':
        """Add a class to a class diagram.

        Args:
            name: Class name
            attributes: List of attribute definitions
            methods: List of method definitions

        Returns:
            Self for method chaining
        """
        self._lines.append(f"{self._indent()}class {name} {{")
        self._indentation += 1

        if attributes:
            for attr in attributes:
                self._lines.append(f"{self._indent()}{attr}")

        if methods:
            for method in methods:
                self._lines.append(f"{self._indent()}{method}")

        self._indentation -= 1
        self._lines.append(f"{self._indent()}}}")
        return self

    def add_class_relationship(
        self,
        class1: str,
        class2: str,
        relationship: str,
        label: Optional[str] = None
    ) -> 'MermaidRenderer':
        """Add a relationship between classes.

        Args:
            class1: First class name
            class2: Second class name
            relationship: Relationship type (<|--, *--, o--, etc.)
            label: Optional relationship label

        Returns:
            Self for method chaining
        """
        if label:
            line = f"{self._indent()}{class1} {relationship} {class2} : {label}"
        else:
            line = f"{self._indent()}{class1} {relationship} {class2}"

        self._lines.append(line)
        return self

    def add_entity(self, name: str, columns: List[Dict[str, str]]) -> 'MermaidRenderer':
        """Add an entity to an ERD.

        Args:
            name: Entity name
            columns: List of column definitions with 'type' and 'name' keys

        Returns:
            Self for method chaining
        """
        self._lines.append(f"{self._indent()}{name} {{")
        self._indentation += 1

        for col in columns:
            col_type = col.get('type', 'string')
            col_name = col.get('name', 'unknown')
            col_key = col.get('key', '')

            key_suffix = f" {col_key}" if col_key else ""
            self._lines.append(f"{self._indent()}{col_type} {col_name}{key_suffix}")

        self._indentation -= 1
        self._lines.append(f"{self._indent()}}}")
        return self

    def add_relationship(
        self,
        entity1: str,
        entity2: str,
        cardinality: str,
        label: Optional[str] = None
    ) -> 'MermaidRenderer':
        """Add a relationship between entities in an ERD.

        Args:
            entity1: First entity name
            entity2: Second entity name
            cardinality: Relationship cardinality (||--||, }o--o{, etc.)
            label: Optional relationship label

        Returns:
            Self for method chaining
        """
        if label:
            line = f"{self._indent()}{entity1} {cardinality} {entity2} : {label}"
        else:
            line = f"{self._indent()}{entity1} {cardinality} {entity2}"

        self._lines.append(line)
        return self

    def add_note(self, text: str, for_entity: Optional[str] = None) -> 'MermaidRenderer':
        """Add a note to the diagram.

        Args:
            text: Note text
            for_entity: Optional entity/class the note is for

        Returns:
            Self for method chaining
        """
        if for_entity:
            self._lines.append(f"{self._indent()}note for {for_entity} \"{text}\"")
        else:
            self._lines.append(f"{self._indent()}note \"{text}\"")
        return self

    def add_raw_line(self, line: str) -> 'MermaidRenderer':
        """Add a raw Mermaid syntax line.

        Args:
            line: Raw Mermaid syntax to add

        Returns:
            Self for method chaining
        """
        self._lines.append(f"{self._indent()}{line}")
        return self

    def add_subgraph(self, title: str) -> 'MermaidRenderer':
        """Start a subgraph.

        Args:
            title: Subgraph title

        Returns:
            Self for method chaining
        """
        self._lines.append(f"{self._indent()}subgraph {title}")
        self._indentation += 1
        return self

    def end_subgraph(self) -> 'MermaidRenderer':
        """End the current subgraph.

        Returns:
            Self for method chaining
        """
        self._indentation -= 1
        self._lines.append(f"{self._indent()}end")
        return self

    def render(self) -> str:
        """Render the final Mermaid diagram string.

        Returns:
            str: Complete Mermaid diagram code
        """
        return "\n".join(self._lines)

    def clear(self) -> 'MermaidRenderer':
        """Clear all content and reset the renderer.

        Returns:
            Self for method chaining
        """
        self._lines.clear()
        self._diagram_type = None
        self._indentation = 0
        return self

    def _indent(self) -> str:
        """Get current indentation string.

        Returns:
            str: Spaces for indentation
        """
        return " " * (self._indentation * self._indent_size)

    def _get_arrow_syntax(self, style: EdgeStyle) -> str:
        """Get arrow syntax for edge style.

        Args:
            style: Edge style

        Returns:
            str: Arrow syntax
        """
        if style == EdgeStyle.SOLID:
            return "-->"
        elif style == EdgeStyle.DOTTED:
            return "-.->"
        elif style == EdgeStyle.THICK:
            return "==>"
        else:
            return "-->"
