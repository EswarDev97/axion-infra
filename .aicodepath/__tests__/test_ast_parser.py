"""Tests for CodeGraphParser — tree-sitter multi-language parser.

Tests parse_file, detect_language, detect_package, parse_directory,
qualified_name format, and edge type correctness.
"""
import os
import sys
import tempfile
import textwrap
from pathlib import Path

import pytest

# Add the .aicodepath/generators/parsers directory to the path
_PARSERS_DIR = str(Path(__file__).resolve().parent.parent / "generators" / "parsers")
sys.path.insert(0, _PARSERS_DIR)

from ast_parser import CodeGraphParser, EdgeInfo, NodeInfo


# ---------------------------------------------------------------------------
# Fixtures: temporary source trees
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_project(tmp_path):
    """Create a mini project with Python + TypeScript files and a package.json."""
    # package.json at root
    (tmp_path / "package.json").write_text('{"name": "test-pkg"}')

    # Python file
    py_dir = tmp_path / "src"
    py_dir.mkdir()
    (py_dir / "example.py").write_text(textwrap.dedent("""\
        import os
        from pathlib import Path

        class Animal(BaseClass):
            \"\"\"An animal.\"\"\"
            def speak(self, loud: bool) -> str:
                result = make_sound(loud)
                return result

        def helper():
            pass
    """))

    # TypeScript file
    ts_dir = tmp_path / "src"
    (ts_dir / "utils.ts").write_text(textwrap.dedent("""\
        import { join } from 'path';

        export class Formatter extends BaseFormatter {
            format(input: string): string {
                return clean(input);
            }
        }

        export function topLevel(): void {
            console.log('hi');
        }
    """))

    # A test file
    test_dir = tmp_path / "tests"
    test_dir.mkdir()
    (test_dir / "test_example.py").write_text(textwrap.dedent("""\
        def test_animal_speak():
            pass

        class TestAnimal:
            def test_method(self):
                pass
    """))

    return tmp_path


@pytest.fixture
def parser(tmp_project):
    return CodeGraphParser(repo_name="test-repo")


# ---------------------------------------------------------------------------
# detect_language
# ---------------------------------------------------------------------------

class TestDetectLanguage:
    def test_python(self):
        p = CodeGraphParser()
        assert p.detect_language(Path("foo.py")) == "python"

    def test_typescript(self):
        p = CodeGraphParser()
        assert p.detect_language(Path("bar.ts")) == "typescript"

    def test_tsx(self):
        p = CodeGraphParser()
        assert p.detect_language(Path("comp.tsx")) == "tsx"

    def test_unknown(self):
        p = CodeGraphParser()
        assert p.detect_language(Path("readme.md")) is None

    def test_javascript(self):
        p = CodeGraphParser()
        assert p.detect_language(Path("app.js")) == "javascript"
        assert p.detect_language(Path("app.jsx")) == "javascript"

    def test_go(self):
        p = CodeGraphParser()
        assert p.detect_language(Path("main.go")) == "go"


# ---------------------------------------------------------------------------
# detect_package
# ---------------------------------------------------------------------------

class TestDetectPackage:
    def test_finds_package_json(self, tmp_project):
        p = CodeGraphParser()
        pkg = p.detect_package(tmp_project / "src" / "example.py")
        assert pkg == "test-pkg"

    def test_no_package(self, tmp_path):
        p = CodeGraphParser()
        f = tmp_path / "solo.py"
        f.write_text("x = 1")
        assert p.detect_package(f) is None

    def test_pyproject_toml(self, tmp_path):
        (tmp_path / "pyproject.toml").write_text(
            '[project]\nname = "my-py-pkg"\n'
        )
        f = tmp_path / "mod.py"
        f.write_text("x = 1")
        p = CodeGraphParser()
        pkg = p.detect_package(f)
        assert pkg == "my-py-pkg"


# ---------------------------------------------------------------------------
# parse_file — Python
# ---------------------------------------------------------------------------

class TestParseFilePython:
    def test_returns_nodes_and_edges(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        assert isinstance(nodes, list)
        assert isinstance(edges, list)
        assert len(nodes) > 0

    def test_file_node_present(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        file_nodes = [n for n in nodes if n.entity_type == "file"]
        assert len(file_nodes) == 1
        assert file_nodes[0].language == "python"

    def test_class_extracted(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        classes = [n for n in nodes if n.entity_type == "class"]
        assert len(classes) == 1
        assert classes[0].name == "Animal"

    def test_method_extracted(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        methods = [n for n in nodes if n.entity_type == "method"]
        assert len(methods) == 1
        assert methods[0].name == "speak"
        assert methods[0].parent_name == "Animal"

    def test_function_extracted(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        funcs = [n for n in nodes if n.entity_type == "function"]
        assert len(funcs) == 1
        assert funcs[0].name == "helper"

    def test_import_edges(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        import_edges = [e for e in edges if e.relation_type == "imports"]
        imported_names = {e.to_name for e in import_edges}
        assert "os" in imported_names
        assert "Path" in imported_names or "pathlib" in imported_names

    def test_call_edges(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        call_edges = [e for e in edges if e.relation_type == "calls"]
        called_names = {e.to_name for e in call_edges}
        assert "make_sound" in called_names

    def test_extends_edge(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        ext_edges = [e for e in edges if e.relation_type == "extends"]
        assert len(ext_edges) >= 1
        assert ext_edges[0].to_name == "BaseClass"

    def test_contains_edges(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        contains = [e for e in edges if e.relation_type == "contains"]
        # file contains class, file contains function
        from_quals = {e.from_qualified for e in contains}
        to_names = {e.to_name for e in contains}
        assert "Animal" in to_names or any("Animal" in q for q in {e.to_qualified for e in contains})

    def test_has_method_edge(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        hm_edges = [e for e in edges if e.relation_type == "has_method"]
        assert len(hm_edges) >= 1
        assert hm_edges[0].to_name == "speak"

    def test_qualified_name_format(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        cls = [n for n in nodes if n.entity_type == "class"][0]
        # Format: repo:package:file_path:name
        assert cls.qualified_name.startswith("test-repo:")
        assert "Animal" in cls.qualified_name
        # Should have package from package.json
        parts = cls.qualified_name.split(":")
        assert len(parts) == 4  # repo:package:file:name

    def test_method_signature(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        methods = [n for n in nodes if n.entity_type == "method"]
        assert methods[0].signature is not None
        assert "self" in methods[0].signature or "loud" in methods[0].signature


# ---------------------------------------------------------------------------
# parse_file — TypeScript
# ---------------------------------------------------------------------------

class TestParseFileTypeScript:
    def test_class_extracted(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "utils.ts")
        classes = [n for n in nodes if n.entity_type == "class"]
        assert len(classes) == 1
        assert classes[0].name == "Formatter"

    def test_exported_flag(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "utils.ts")
        classes = [n for n in nodes if n.entity_type == "class"]
        assert classes[0].exported is True

    def test_function_extracted(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "utils.ts")
        funcs = [n for n in nodes if n.entity_type == "function"]
        assert len(funcs) == 1
        assert funcs[0].name == "topLevel"
        assert funcs[0].exported is True

    def test_import_edge(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "utils.ts")
        import_edges = [e for e in edges if e.relation_type == "imports"]
        assert len(import_edges) >= 1
        imported_names = {e.to_name for e in import_edges}
        assert "path" in imported_names or "join" in imported_names

    def test_extends_edge(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "utils.ts")
        ext_edges = [e for e in edges if e.relation_type == "extends"]
        assert len(ext_edges) >= 1
        assert ext_edges[0].to_name == "BaseFormatter"

    def test_method_in_class(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "utils.ts")
        methods = [n for n in nodes if n.entity_type == "method"]
        assert len(methods) == 1
        assert methods[0].name == "format"
        assert methods[0].parent_name == "Formatter"


# ---------------------------------------------------------------------------
# Test detection
# ---------------------------------------------------------------------------

class TestTestDetection:
    def test_test_file_functions_marked(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "tests" / "test_example.py")
        funcs = [n for n in nodes if n.entity_type == "function"]
        test_funcs = [n for n in funcs if n.is_test]
        assert len(test_funcs) >= 1
        assert any(n.name == "test_animal_speak" for n in test_funcs)

    def test_test_class_marked(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "tests" / "test_example.py")
        classes = [n for n in nodes if n.entity_type == "class"]
        assert len(classes) == 1
        assert classes[0].is_test is True


# ---------------------------------------------------------------------------
# parse_directory
# ---------------------------------------------------------------------------

class TestParseDirectory:
    def test_parses_multiple_files(self, parser, tmp_project):
        nodes, edges = parser.parse_directory(tmp_project)
        file_nodes = [n for n in nodes if n.entity_type == "file"]
        # At least example.py, utils.ts, test_example.py
        assert len(file_nodes) >= 3

    def test_excludes_node_modules(self, parser, tmp_project):
        nm = tmp_project / "node_modules" / "dep"
        nm.mkdir(parents=True)
        (nm / "index.js").write_text("function x() {}")
        nodes, edges = parser.parse_directory(tmp_project)
        file_paths = {n.file_path for n in nodes if n.entity_type == "file"}
        assert not any("node_modules" in p for p in file_paths)

    def test_all_node_types_have_repo(self, parser, tmp_project):
        nodes, edges = parser.parse_directory(tmp_project)
        for n in nodes:
            assert n.repo_name == "test-repo"


# ---------------------------------------------------------------------------
# Parse error handling
# ---------------------------------------------------------------------------

class TestParseErrorHandling:
    def test_syntax_error_file_returns_stub(self, tmp_path):
        """A file with corrupt/malformed content returns ([file_node], []) not an exception."""
        parser_instance = CodeGraphParser(repo_name="test")
        corrupt = tmp_path / "corrupt.py"
        corrupt.write_bytes(b'\xff\xfe invalid \x00\x01 \xff')  # invalid bytes
        nodes, edges = parser_instance.parse_file(corrupt)
        assert len(nodes) == 1, "Should return exactly 1 node (file stub)"
        assert nodes[0].entity_type == "file", "The stub node must be a file node"
        assert edges == [], "No edges on parse error"


# ---------------------------------------------------------------------------
# Edge data integrity
# ---------------------------------------------------------------------------

class TestEdgeInfo:
    def test_edge_has_file_path(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        for e in edges:
            assert e.file_path != ""

    def test_edge_has_from_qualified(self, parser, tmp_project):
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        for e in edges:
            assert e.from_qualified != ""

    def test_edge_relation_types_valid(self, parser, tmp_project):
        valid_types = {"imports", "calls", "extends", "implements", "has_method", "contains"}
        nodes, edges = parser.parse_file(tmp_project / "src" / "example.py")
        for e in edges:
            assert e.relation_type in valid_types, f"Invalid edge type: {e.relation_type}"
