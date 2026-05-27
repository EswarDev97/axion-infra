"""Pydantic models for code entities."""
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class CodeEntity(BaseModel):
    """Base class for all code entities."""

    name: str = Field(..., description="Name of the code entity")
    file_path: str = Field(..., description="Path to the file containing this entity")
    line_number: Optional[int] = Field(None, description="Line number where entity is defined")
    docstring: Optional[str] = Field(None, description="Documentation string for the entity")


class ClassEntity(CodeEntity):
    """Model for class definitions."""

    attributes: List[str] = Field(default_factory=list, description="List of class attributes")
    methods: List[str] = Field(default_factory=list, description="List of method names")
    decorators: List[str] = Field(default_factory=list, description="Class decorators")
    base_classes: List[str] = Field(default_factory=list, description="Parent classes")
    is_abstract: bool = Field(False, description="Whether class is abstract")
    namespace: Optional[str] = Field(None, description="Namespace or module path")


class FunctionEntity(CodeEntity):
    """Model for function definitions."""

    parameters: List[str] = Field(default_factory=list, description="Function parameters")
    return_type: Optional[str] = Field(None, description="Return type annotation")
    is_async: bool = Field(False, description="Whether function is async")
    decorators: List[str] = Field(default_factory=list, description="Function decorators")
    is_generator: bool = Field(False, description="Whether function is a generator")
    complexity: Optional[int] = Field(None, description="Cyclomatic complexity score")


class MethodVisibility(str, Enum):
    """Visibility levels for class methods."""

    PUBLIC = "public"
    PRIVATE = "private"
    PROTECTED = "protected"


class MethodEntity(FunctionEntity):
    """Model for class method definitions."""

    visibility: MethodVisibility = Field(
        MethodVisibility.PUBLIC,
        description="Method visibility level"
    )
    is_static: bool = Field(False, description="Whether method is static")
    is_class_method: bool = Field(False, description="Whether method is a class method")
    is_property: bool = Field(False, description="Whether method is a property")
    parent_class: Optional[str] = Field(None, description="Name of parent class")


class ColumnEntity(BaseModel):
    """Model for database column definitions."""

    name: str = Field(..., description="Column name")
    data_type: str = Field(..., description="Column data type")
    nullable: bool = Field(True, description="Whether column allows NULL")
    default: Optional[str] = Field(None, description="Default value")
    constraints: List[str] = Field(default_factory=list, description="Column constraints")
    is_primary_key: bool = Field(False, description="Whether column is primary key")
    is_foreign_key: bool = Field(False, description="Whether column is foreign key")
    foreign_key_reference: Optional[str] = Field(
        None,
        description="Referenced table.column for foreign keys"
    )
    is_unique: bool = Field(False, description="Whether column has unique constraint")
    is_indexed: bool = Field(False, description="Whether column is indexed")


class TableEntity(BaseModel):
    """Model for database table definitions."""

    name: str = Field(..., description="Table name")
    schema: Optional[str] = Field(None, description="Database schema name")
    columns: List[ColumnEntity] = Field(default_factory=list, description="Table columns")
    primary_key: List[str] = Field(default_factory=list, description="Primary key column names")
    foreign_keys: List[dict] = Field(
        default_factory=list,
        description="Foreign key definitions with column and reference"
    )
    indexes: List[dict] = Field(default_factory=list, description="Index definitions")
    unique_constraints: List[List[str]] = Field(
        default_factory=list,
        description="Unique constraint column groups"
    )
    file_path: Optional[str] = Field(None, description="Path to migration/schema file")
    line_number: Optional[int] = Field(None, description="Line number in file")


class HookUsage(BaseModel):
    """Model for React hook usage."""

    hook_name: str = Field(..., description="Name of the hook (e.g., useState, useEffect)")
    dependencies: List[str] = Field(
        default_factory=list,
        description="Dependencies array for hooks like useEffect, useMemo"
    )
    line_number: Optional[int] = Field(None, description="Line number where hook is used")
    arguments: List[str] = Field(
        default_factory=list,
        description="Arguments passed to the hook"
    )


class ComponentEntity(CodeEntity):
    """Model for React/UI component definitions."""

    props: List[str] = Field(default_factory=list, description="Component prop names")
    prop_types: dict = Field(
        default_factory=dict,
        description="Prop types mapping (prop_name -> type)"
    )
    hooks: List[HookUsage] = Field(default_factory=list, description="React hooks used")
    children: List[str] = Field(
        default_factory=list,
        description="Child component names"
    )
    state_variables: List[str] = Field(
        default_factory=list,
        description="State variable names from useState"
    )
    is_functional: bool = Field(True, description="Whether component is functional")
    is_class_based: bool = Field(False, description="Whether component is class-based")
    exports_default: bool = Field(False, description="Whether component is default export")
    imports: List[str] = Field(
        default_factory=list,
        description="Imported modules and components"
    )
