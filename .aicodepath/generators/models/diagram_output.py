"""Pydantic models for diagram output and metadata."""
from enum import Enum
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DiagramType(str, Enum):
    """Types of diagrams that can be generated."""

    CLASS_DIAGRAM = "class_diagram"
    SEQUENCE_DIAGRAM = "sequence_diagram"
    ER_DIAGRAM = "er_diagram"
    COMPONENT_DIAGRAM = "component_diagram"
    FLOWCHART = "flowchart"
    STATE_DIAGRAM = "state_diagram"
    ARCHITECTURE_DIAGRAM = "architecture_diagram"
    DEPENDENCY_GRAPH = "dependency_graph"


class GenerationMethod(str, Enum):
    """Method used to generate the diagram."""

    AST_PARSING = "ast_parsing"
    REGEX_PARSING = "regex_parsing"
    STATIC_ANALYSIS = "static_analysis"
    HYBRID = "hybrid"
    MANUAL = "manual"
    LLM_ASSISTED = "llm_assisted"


class DiagramMetadata(BaseModel):
    """Metadata about diagram generation."""

    generation_method: GenerationMethod = Field(
        ...,
        description="Method used to generate the diagram"
    )
    confidence: float = Field(
        1.0,
        ge=0.0,
        le=1.0,
        description="Confidence score of diagram accuracy (0-1)"
    )
    source_files: List[str] = Field(
        default_factory=list,
        description="List of source files analyzed"
    )
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="When the diagram was generated"
    )
    parser_used: Optional[str] = Field(
        None,
        description="Parser/tool used (e.g., 'ast', 'tree-sitter', 'jedi')"
    )
    language: Optional[str] = Field(
        None,
        description="Programming language analyzed"
    )
    version: str = Field(
        "1.0",
        description="Diagram generator version"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Warnings or issues during generation"
    )
    statistics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional statistics about the analysis"
    )


class ValidationResult(BaseModel):
    """Result of diagram validation."""

    is_valid: bool = Field(..., description="Whether diagram is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    syntax_check: bool = Field(True, description="Whether Mermaid syntax is valid")


class DiagramOutput(BaseModel):
    """Complete diagram output with content and metadata."""

    diagram_type: DiagramType = Field(..., description="Type of diagram")
    title: str = Field(..., description="Diagram title")
    description: Optional[str] = Field(None, description="Diagram description")
    mermaid_content: str = Field(..., description="Mermaid diagram syntax content")
    entities_count: int = Field(0, ge=0, description="Number of entities in diagram")
    relationships_count: int = Field(0, ge=0, description="Number of relationships in diagram")
    metadata: DiagramMetadata = Field(..., description="Generation metadata")
    validation: Optional[ValidationResult] = Field(
        None,
        description="Validation result if validated"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for categorization"
    )
    custom_properties: Dict[str, Any] = Field(
        default_factory=dict,
        description="Custom properties for specific diagram types"
    )

    def to_markdown(self) -> str:
        """Convert diagram to markdown format."""
        md = f"# {self.title}\n\n"
        if self.description:
            md += f"{self.description}\n\n"
        md += f"**Type:** {self.diagram_type.value}\n"
        md += f"**Entities:** {self.entities_count}\n"
        md += f"**Relationships:** {self.relationships_count}\n"
        md += f"**Generated:** {self.metadata.timestamp.isoformat()}\n"
        md += f"**Method:** {self.metadata.generation_method.value}\n"
        md += f"**Confidence:** {self.metadata.confidence:.2%}\n\n"
        md += "```mermaid\n"
        md += self.mermaid_content
        md += "\n```\n"
        return md

    def to_html(self, include_script: bool = True) -> str:
        """Convert diagram to HTML with Mermaid rendering."""
        html = f"<div class='diagram-container'>\n"
        html += f"  <h1>{self.title}</h1>\n"
        if self.description:
            html += f"  <p>{self.description}</p>\n"
        html += f"  <div class='mermaid'>\n{self.mermaid_content}\n  </div>\n"
        html += "</div>\n"

        if include_script:
            html = """
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script>mermaid.initialize({startOnLoad:true});</script>
</head>
<body>
""" + html + "\n</body>\n</html>"

        return html


class DiagramCollection(BaseModel):
    """Collection of multiple related diagrams."""

    name: str = Field(..., description="Collection name")
    description: Optional[str] = Field(None, description="Collection description")
    diagrams: List[DiagramOutput] = Field(
        default_factory=list,
        description="List of diagrams in collection"
    )
    created_at: datetime = Field(
        default_factory=datetime.now,
        description="When collection was created"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Tags for categorization"
    )

    def add_diagram(self, diagram: DiagramOutput) -> None:
        """Add a diagram to the collection."""
        self.diagrams.append(diagram)

    def get_by_type(self, diagram_type: DiagramType) -> List[DiagramOutput]:
        """Get all diagrams of a specific type."""
        return [d for d in self.diagrams if d.diagram_type == diagram_type]

    def total_entities(self) -> int:
        """Get total number of entities across all diagrams."""
        return sum(d.entities_count for d in self.diagrams)

    def total_relationships(self) -> int:
        """Get total number of relationships across all diagrams."""
        return sum(d.relationships_count for d in self.diagrams)
