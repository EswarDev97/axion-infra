"""Quick test to verify Pydantic models work correctly."""
from code_entities import ClassEntity, FunctionEntity, MethodEntity, MethodVisibility
from relationships import InheritanceRelation, RelationshipType, Cardinality, CompositionRelation
from diagram_output import DiagramOutput, DiagramMetadata, DiagramType, GenerationMethod


def test_code_entities():
    """Test code entity models."""
    # Test ClassEntity
    cls = ClassEntity(
        name="MyClass",
        file_path="/path/to/file.py",
        line_number=10,
        attributes=["attr1", "attr2"],
        methods=["method1", "method2"],
        base_classes=["BaseClass"]
    )
    print(f"✓ ClassEntity created: {cls.name}")

    # Test FunctionEntity
    func = FunctionEntity(
        name="my_function",
        file_path="/path/to/file.py",
        line_number=20,
        parameters=["arg1", "arg2"],
        return_type="str",
        is_async=True
    )
    print(f"✓ FunctionEntity created: {func.name}")

    # Test MethodEntity
    method = MethodEntity(
        name="my_method",
        file_path="/path/to/file.py",
        line_number=30,
        parameters=["self", "arg1"],
        visibility=MethodVisibility.PRIVATE,
        is_static=False
    )
    print(f"✓ MethodEntity created: {method.name}")


def test_relationships():
    """Test relationship models."""
    # Test InheritanceRelation
    inheritance = InheritanceRelation(
        source="ChildClass",
        target="ParentClass",
        is_abstract=False
    )
    print(f"✓ InheritanceRelation created: {inheritance.source} -> {inheritance.target}")

    # Test CompositionRelation
    composition = CompositionRelation(
        source="Container",
        target="Component",
        cardinality=Cardinality.ONE_TO_MANY,
        is_strong=True
    )
    print(f"✓ CompositionRelation created: {composition.source} -> {composition.target}")


def test_diagram_output():
    """Test diagram output models."""
    # Create metadata
    metadata = DiagramMetadata(
        generation_method=GenerationMethod.AST_PARSING,
        confidence=0.95,
        source_files=["/path/to/file1.py", "/path/to/file2.py"],
        parser_used="ast"
    )
    print(f"✓ DiagramMetadata created: {metadata.generation_method}")

    # Create diagram output
    diagram = DiagramOutput(
        diagram_type=DiagramType.CLASS_DIAGRAM,
        title="My Class Diagram",
        description="A test diagram",
        mermaid_content="classDiagram\n  Class1 --|> Class2",
        entities_count=2,
        relationships_count=1,
        metadata=metadata
    )
    print(f"✓ DiagramOutput created: {diagram.title}")

    # Test to_markdown
    markdown = diagram.to_markdown()
    print(f"✓ Markdown conversion successful, length: {len(markdown)} chars")


if __name__ == "__main__":
    print("Testing Pydantic models...\n")
    test_code_entities()
    print()
    test_relationships()
    print()
    test_diagram_output()
    print("\n✓ All tests passed!")
