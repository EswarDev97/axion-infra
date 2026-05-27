"""
Pydantic models for validated diagram data structures.
Ensures type safety and validation throughout the generation pipeline.
"""
from .code_entities import (
    CodeEntity,
    ClassEntity,
    FunctionEntity,
    MethodEntity,
    MethodVisibility,
    TableEntity,
    ColumnEntity,
    ComponentEntity,
    HookUsage
)
from .relationships import (
    Relationship,
    RelationshipType,
    Cardinality,
    InheritanceRelation,
    CompositionRelation,
    DependencyRelation,
    AssociationRelation,
    ForeignKeyRelation,
    RealizationRelation
)
from .diagram_output import (
    DiagramOutput,
    DiagramMetadata,
    DiagramType,
    GenerationMethod,
    ValidationResult,
    DiagramCollection
)

__all__ = [
    # Code Entities
    'CodeEntity',
    'ClassEntity',
    'FunctionEntity',
    'MethodEntity',
    'MethodVisibility',
    'TableEntity',
    'ColumnEntity',
    'ComponentEntity',
    'HookUsage',

    # Relationships
    'Relationship',
    'RelationshipType',
    'Cardinality',
    'InheritanceRelation',
    'CompositionRelation',
    'DependencyRelation',
    'AssociationRelation',
    'ForeignKeyRelation',
    'RealizationRelation',

    # Diagram Output
    'DiagramOutput',
    'DiagramMetadata',
    'DiagramType',
    'GenerationMethod',
    'ValidationResult',
    'DiagramCollection'
]
