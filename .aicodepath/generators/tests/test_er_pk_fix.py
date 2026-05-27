#!/usr/bin/env python3
"""Test case to verify PK attribute generation in ER diagrams."""

import sys
from pathlib import Path

# Add generator package to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from generators.diagrams.er_diagram import ERDiagramGenerator


def test_single_line_pk():
    """Test PK detection in single-line Column definition."""
    generator = ERDiagramGenerator()

    # Create test file content
    test_code = """
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True)
"""

    # Write test file
    test_file = Path(__file__).parent / "test_user_model.py"
    test_file.write_text(test_code)

    try:
        # Generate ER diagram
        result = generator.generate([str(test_file)])

        print("Generated Mermaid Code:")
        print(result.mermaid_code)
        print()

        # Verify PK is present
        assert 'PK' in result.mermaid_code, "❌ PK attribute not found in generated diagram"
        assert 'id PK' in result.mermaid_code or 'id pk' in result.mermaid_code.lower(), "❌ Primary key not properly formatted"

        print("✅ Single-line PK test PASSED")
        print(f"   Confidence Score: {result.confidence_score:.2%}")

    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()


def test_multiline_pk():
    """Test PK detection in multi-line Column definition."""
    generator = ERDiagramGenerator()

    # Create test file content with multi-line Column definition
    test_code = """
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Product(Base):
    __tablename__ = 'products'

    id = Column(
        Integer,
        primary_key=True
    )
    name = Column(
        String(100),
        nullable=False
    )
    category_id = Column(
        Integer,
        ForeignKey('categories.id'),
        nullable=False
    )
"""

    # Write test file
    test_file = Path(__file__).parent / "test_product_model.py"
    test_file.write_text(test_code)

    try:
        # Generate ER diagram
        result = generator.generate([str(test_file)])

        print("Generated Mermaid Code:")
        print(result.mermaid_code)
        print()

        # Verify PK and FK are present
        assert 'PK' in result.mermaid_code, "❌ PK attribute not found in multi-line definition"
        assert 'FK' in result.mermaid_code, "❌ FK attribute not found in multi-line definition"
        assert 'id PK' in result.mermaid_code or 'id pk' in result.mermaid_code.lower(), "❌ Primary key not properly formatted in multi-line"

        print("✅ Multi-line PK test PASSED")
        print(f"   Confidence Score: {result.confidence_score:.2%}")
        print(f"   Entities: {result.metadata.get('entities', 0)}")
        print(f"   Relationships: {result.metadata.get('relationships', 0)}")

    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()


def test_complex_model():
    """Test complete ER diagram with PKs, FKs, and constraints."""
    generator = ERDiagramGenerator()

    # Create test file with complex model
    test_code = """
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Tenant(Base):
    __tablename__ = 'tenants'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    domain = Column(String(50), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_active = Column(Boolean, nullable=False, default=True)

class User(Base):
    __tablename__ = 'users'

    id = Column(
        Integer,
        primary_key=True
    )
    tenant_id = Column(
        Integer,
        ForeignKey('tenants.id'),
        nullable=False
    )
    email = Column(
        String(255),
        nullable=False,
        unique=True
    )
    username = Column(String(50), nullable=False)
"""

    # Write test file
    test_file = Path(__file__).parent / "test_complex_model.py"
    test_file.write_text(test_code)

    try:
        # Generate ER diagram
        result = generator.generate([str(test_file)])

        print("Generated Mermaid Code:")
        print(result.mermaid_code)
        print()

        # Verify all constraints are present
        assert 'PK' in result.mermaid_code, "❌ PK attributes not found"
        assert 'FK' in result.mermaid_code, "❌ FK attributes not found"
        assert 'UNIQUE' in result.mermaid_code, "❌ UNIQUE constraints not found"
        assert 'NOT NULL' in result.mermaid_code, "❌ NOT NULL constraints not found"

        # Verify entities
        assert 'Tenant' in result.mermaid_code, "❌ Tenant entity not found"
        assert 'User' in result.mermaid_code, "❌ User entity not found"

        # Verify metadata
        assert result.metadata.get('entities', 0) == 2, f"❌ Expected 2 entities, got {result.metadata.get('entities', 0)}"

        print("✅ Complex model test PASSED")
        print(f"   Confidence Score: {result.confidence_score:.2%}")
        print(f"   Entities: {result.metadata.get('entities', 0)}")
        print(f"   Relationships: {result.metadata.get('relationships', 0)}")

    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()


if __name__ == "__main__":
    print("=" * 60)
    print("Testing ER Diagram PK Attribute Generation")
    print("=" * 60)
    print()

    try:
        print("Test 1: Single-line Column definition")
        print("-" * 60)
        test_single_line_pk()
        print()

        print("Test 2: Multi-line Column definition")
        print("-" * 60)
        test_multiline_pk()
        print()

        print("Test 3: Complex model with multiple constraints")
        print("-" * 60)
        test_complex_model()
        print()

        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)

    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 60)
        sys.exit(1)
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 60)
        sys.exit(1)
