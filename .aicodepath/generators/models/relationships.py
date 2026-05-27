"""Pydantic models for entity relationships."""
from enum import Enum
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class RelationshipType(str, Enum):
    """Types of relationships between code entities."""

    INHERITANCE = "inheritance"
    COMPOSITION = "composition"
    AGGREGATION = "aggregation"
    DEPENDENCY = "dependency"
    ASSOCIATION = "association"
    REALIZATION = "realization"  # Interface implementation
    IMPORT = "import"
    FOREIGN_KEY = "foreign_key"
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_ONE = "many_to_one"
    MANY_TO_MANY = "many_to_many"


class Cardinality(str, Enum):
    """Cardinality types for relationships."""

    ONE_TO_ONE = "1:1"
    ONE_TO_MANY = "1:N"
    MANY_TO_ONE = "N:1"
    MANY_TO_MANY = "N:M"
    ZERO_OR_ONE = "0..1"
    ZERO_OR_MANY = "0..*"
    ONE_OR_MANY = "1..*"


class Relationship(BaseModel):
    """Base model for relationships between entities."""

    source: str = Field(..., description="Name of the source entity")
    target: str = Field(..., description="Name of the target entity")
    relationship_type: RelationshipType = Field(..., description="Type of relationship")
    label: Optional[str] = Field(None, description="Optional label for the relationship")
    bidirectional: bool = Field(False, description="Whether relationship is bidirectional")
    metadata: dict = Field(
        default_factory=dict,
        description="Additional metadata about the relationship"
    )
    source_file: Optional[str] = Field(None, description="File containing source entity")
    target_file: Optional[str] = Field(None, description="File containing target entity")
    line_number: Optional[int] = Field(None, description="Line number where relationship is defined")


class InheritanceRelation(Relationship):
    """Model for class inheritance relationships."""

    relationship_type: RelationshipType = Field(
        default=RelationshipType.INHERITANCE,
        description="Type is always inheritance"
    )
    is_abstract: bool = Field(False, description="Whether parent is abstract")
    override_methods: List[str] = Field(
        default_factory=list,
        description="Methods overridden in child class"
    )


class CompositionRelation(Relationship):
    """Model for has-a relationships with cardinality."""

    relationship_type: RelationshipType = Field(
        default=RelationshipType.COMPOSITION,
        description="Type is composition or aggregation"
    )
    cardinality: Cardinality = Field(
        Cardinality.ONE_TO_ONE,
        description="Cardinality of the relationship"
    )
    is_strong: bool = Field(
        True,
        description="True for composition (strong), False for aggregation (weak)"
    )
    container_field: Optional[str] = Field(
        None,
        description="Field name in container that holds the component"
    )


class DependencyRelation(Relationship):
    """Model for uses/imports/depends-on relationships."""

    relationship_type: RelationshipType = Field(
        default=RelationshipType.DEPENDENCY,
        description="Type is dependency or import"
    )
    dependency_kind: str = Field(
        "uses",
        description="Kind of dependency: uses, imports, calls, instantiates"
    )
    is_circular: bool = Field(False, description="Whether this creates a circular dependency")
    weight: int = Field(
        1,
        description="Strength of dependency (higher = more coupled)"
    )


class AssociationRelation(Relationship):
    """Model for generic associations between entities."""

    relationship_type: RelationshipType = Field(
        default=RelationshipType.ASSOCIATION,
        description="Type is association"
    )
    role_source: Optional[str] = Field(None, description="Role name at source end")
    role_target: Optional[str] = Field(None, description="Role name at target end")
    cardinality_source: Optional[Cardinality] = Field(
        None,
        description="Cardinality at source end"
    )
    cardinality_target: Optional[Cardinality] = Field(
        None,
        description="Cardinality at target end"
    )


class ForeignKeyRelation(Relationship):
    """Model for database foreign key relationships."""

    relationship_type: RelationshipType = Field(
        default=RelationshipType.FOREIGN_KEY,
        description="Type is foreign key"
    )
    source_column: str = Field(..., description="Foreign key column in source table")
    target_column: str = Field(..., description="Referenced column in target table")
    on_delete: Optional[str] = Field(None, description="ON DELETE action")
    on_update: Optional[str] = Field(None, description="ON UPDATE action")
    constraint_name: Optional[str] = Field(None, description="Foreign key constraint name")


class RealizationRelation(Relationship):
    """Model for interface implementation relationships."""

    relationship_type: RelationshipType = Field(
        default=RelationshipType.REALIZATION,
        description="Type is realization (interface implementation)"
    )
    interface_methods: List[str] = Field(
        default_factory=list,
        description="Methods defined in the interface"
    )
    implemented_methods: List[str] = Field(
        default_factory=list,
        description="Methods implemented in the class"
    )
