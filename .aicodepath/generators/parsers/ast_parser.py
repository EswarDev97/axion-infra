"""Tree-sitter multi-language code graph parser.

Parses source files into NodeInfo and EdgeInfo dataclasses that describe
entities (files, classes, functions, methods) and their relationships
(imports, calls, extends, implements, has_method, contains).

Supports 13 languages via tree-sitter-language-pack.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import tree_sitter_language_pack as tslp

# Support both package import and direct sys.path import (used by tests)
try:
    from .language_types import (
        CALL_TYPES,
        CLASS_TYPES,
        FUNCTION_TYPES,
        IMPORT_TYPES,
        LANGUAGE_EXTENSIONS,
        SUPPORTED_LANGUAGES,
    )
except ImportError:
    from language_types import (  # type: ignore[no-redef]
        CALL_TYPES,
        CLASS_TYPES,
        FUNCTION_TYPES,
        IMPORT_TYPES,
        LANGUAGE_EXTENSIONS,
        SUPPORTED_LANGUAGES,
    )

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class NodeInfo:
    repo_name: str
    package_name: Optional[str]
    entity_type: str        # 'class', 'function', 'method', 'interface', 'type', 'file'
    name: str
    qualified_name: str     # 'repo:package:file_path:ClassName.method_name'
    language: str
    file_path: str
    line_start: int
    line_end: int
    signature: Optional[str] = None
    body: Optional[str] = None
    documentation: Optional[str] = None
    exported: bool = False
    complexity: int = 0
    is_test: bool = False
    parent_name: Optional[str] = None


@dataclass
class EdgeInfo:
    from_qualified: str
    to_qualified: str
    to_name: str            # Fallback for unresolved
    relation_type: str      # 'imports', 'calls', 'extends', 'implements', 'has_method', 'contains'
    file_path: str
    line: int = 0


# ---------------------------------------------------------------------------
# Package manifest file names used for package detection
# ---------------------------------------------------------------------------

_PACKAGE_MANIFESTS = [
    "package.json",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml",
]

# Directories excluded by default in parse_directory
_DEFAULT_EXCLUDES = [
    # Version control
    ".git",
    # JavaScript / Node
    "node_modules",
    # Python
    "__pycache__",
    ".venv",
    "venv",
    ".eggs",
    ".mypy_cache",
    ".pytest_cache",
    ".tox",
    # Java / Kotlin / Scala
    ".gradle",
    ".idea",
    "target",
    # Build / distribution output
    "build",
    "dist",
    "out",
    # Ruby
    ".bundle",
    # .NET
    "obj",
    # Test coverage reports
    "coverage",
]

# Patterns for test detection (checked against entity name)
_TEST_NAME_PATTERNS = [
    re.compile(r"^test_"),        # test_foo   (Python)
    re.compile(r"^Test[A-Z_]"),   # TestFoo    (Go, Python class)
    re.compile(r"^Test$"),        # Test       (edge case)
    re.compile(r"_test$"),        # foo_test   (Go)
    re.compile(r"_spec$"),        # foo_spec   (Ruby)
    re.compile(r"\.test$"),       # foo.test
    re.compile(r"\.spec$"),       # foo.spec
]


def _is_test_name(name: str) -> bool:
    return any(p.search(name) for p in _TEST_NAME_PATTERNS)


# ---------------------------------------------------------------------------
# CodeGraphParser
# ---------------------------------------------------------------------------

class CodeGraphParser:
    """Multi-language code graph parser using tree-sitter.

    Usage::

        parser = CodeGraphParser(repo_name="my-repo")
        nodes, edges = parser.parse_file(Path("src/main.py"))
        all_nodes, all_edges = parser.parse_directory(Path("."))
    """

    def __init__(self, repo_name: str = "") -> None:
        self._parsers: dict[str, tslp.Parser] = {}  # type: ignore[attr-defined]
        self.repo_name = repo_name

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect_language(self, path: Path) -> Optional[str]:
        """Return the language identifier for *path* based on file extension."""
        return LANGUAGE_EXTENSIONS.get(path.suffix.lower())

    def detect_package(self, file_path: Path) -> Optional[str]:
        """Walk up from *file_path* to find the nearest package manifest and
        return the package name, or None if no manifest is found.
        """
        current = file_path.resolve().parent
        # Walk up to filesystem root
        while True:
            for manifest in _PACKAGE_MANIFESTS:
                candidate = current / manifest
                if candidate.exists():
                    name = self._read_package_name(candidate)
                    if name:
                        return name
            parent = current.parent
            if parent == current:
                break
            current = parent
        return None

    def parse_file(
        self,
        path: Path,
        _store_path: Optional[str] = None,
    ) -> tuple[list[NodeInfo], list[EdgeInfo]]:
        """Parse a single source file.

        Returns a tuple of (nodes, edges).  A NodeInfo with
        ``entity_type='file'`` is always the first node in the list.

        *_store_path* overrides the path string stored in NodeInfo/EdgeInfo
        (used by parse_directory to store relative paths).
        """
        language = self.detect_language(path)
        if language is None:
            return [], []

        try:
            source_bytes = path.read_bytes()
        except OSError:
            return [], []

        parser = self._get_parser(language)
        if parser is None:
            return [], []

        package_name = self.detect_package(path)
        file_path_str = _store_path if _store_path is not None else str(path)

        file_qname = self._make_qualified_name(
            package_name, file_path_str, None, None
        )

        # Create the file node before parsing so we can return a stub on error
        file_node = NodeInfo(
            repo_name=self.repo_name,
            package_name=package_name,
            entity_type="file",
            name=path.name,
            qualified_name=file_qname,
            language=language,
            file_path=file_path_str,
            line_start=1,
            line_end=source_bytes.count(b"\n") + 1,
        )

        nodes: list[NodeInfo] = [file_node]
        edges: list[EdgeInfo] = []

        try:
            tree = parser.parse(source_bytes)
            self._extract_from_tree(
                tree.root_node,
                language=language,
                source=source_bytes,
                file_path=file_path_str,
                package_name=package_name,
                file_qname=file_qname,
                nodes=nodes,
                edges=edges,
                current_class=None,
                current_class_qname=None,
                exported=False,
            )
        except Exception as exc:  # noqa: BLE001
            import logging as _logging
            _logging.getLogger(__name__).warning(
                "ast_parser: failed to parse %s: %s", path, exc
            )
            return [file_node], []

        return nodes, edges

    def parse_directory(
        self,
        root: Path,
        exclude_patterns: Optional[list[str]] = None,
    ) -> tuple[list[NodeInfo], list[EdgeInfo]]:
        """Recursively parse all supported source files under *root*.

        Directories listed in *exclude_patterns* (or the default list if
        None) are skipped.  Patterns are matched against directory names
        (not full paths).
        """
        if exclude_patterns is None:
            excludes = set(_DEFAULT_EXCLUDES)
        else:
            excludes = set(exclude_patterns)

        all_nodes: list[NodeInfo] = []
        all_edges: list[EdgeInfo] = []

        root_resolved = root.resolve()
        for path in self._iter_files(root, excludes):
            # Store relative paths so the stored file_path does not
            # include any parent directory names (e.g. pytest tmp dir names).
            try:
                rel = path.resolve().relative_to(root_resolved)
                store_path = str(rel)
            except ValueError:
                store_path = str(path)
            file_nodes, file_edges = self.parse_file(path, _store_path=store_path)
            all_nodes.extend(file_nodes)
            all_edges.extend(file_edges)

        return all_nodes, all_edges

    # ------------------------------------------------------------------
    # Internal helpers — parser cache and qualified names
    # ------------------------------------------------------------------

    def _get_parser(self, language: str) -> Optional[object]:
        if language not in self._parsers:
            try:
                self._parsers[language] = tslp.get_parser(language)
            except Exception:
                self._parsers[language] = None  # type: ignore[assignment]
        return self._parsers[language]

    def _make_qualified_name(
        self,
        package_name: Optional[str],
        file_path: str,
        class_name: Optional[str],
        member_name: Optional[str],
    ) -> str:
        """Build the canonical qualified name.

        Format: ``repo:package:file_path:ClassName.method_name``

        If there is no package the second segment is empty (``repo::file:name``).
        """
        repo = self.repo_name
        pkg = package_name or ""
        if class_name and member_name:
            entity = f"{class_name}.{member_name}"
        elif class_name:
            entity = class_name
        elif member_name:
            entity = member_name
        else:
            entity = file_path
        return f"{repo}:{pkg}:{file_path}:{entity}"

    @staticmethod
    def _read_package_name(manifest: Path) -> Optional[str]:
        """Extract the package/project name from a manifest file."""
        name = manifest.name
        try:
            text = manifest.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return None

        if name == "package.json":
            try:
                data = json.loads(text)
                return data.get("name") or None
            except json.JSONDecodeError:
                return None

        if name == "pyproject.toml":
            # Simple TOML extraction — avoid adding toml dependency
            m = re.search(r'^\s*name\s*=\s*["\']([^"\']+)["\']', text, re.M)
            return m.group(1) if m else None

        if name == "go.mod":
            m = re.search(r"^module\s+(\S+)", text, re.M)
            if m:
                # Return the last path segment as the package name
                return m.group(1).split("/")[-1]
            return None

        if name == "Cargo.toml":
            m = re.search(r'^\s*name\s*=\s*["\']([^"\']+)["\']', text, re.M)
            return m.group(1) if m else None

        return None

    @staticmethod
    def _iter_files(root: Path, excludes: set[str]):
        """Yield all supported source files under *root*, skipping excluded dirs."""
        for item in root.iterdir():
            if item.is_dir():
                if item.name not in excludes:
                    yield from CodeGraphParser._iter_files(item, excludes)
            elif item.is_file():
                if item.suffix.lower() in LANGUAGE_EXTENSIONS:
                    yield item

    # ------------------------------------------------------------------
    # AST extraction
    # ------------------------------------------------------------------

    def _extract_from_tree(
        self,
        node,
        *,
        language: str,
        source: bytes,
        file_path: str,
        package_name: Optional[str],
        file_qname: str,
        nodes: list[NodeInfo],
        edges: list[EdgeInfo],
        current_class: Optional[str],
        current_class_qname: Optional[str],
        current_func_qname: Optional[str] = None,
        exported: bool,
    ) -> None:
        """Recursively walk the tree-sitter AST, emitting NodeInfo / EdgeInfo."""
        node_type = node.type

        # ---- detect if this node is wrapped in an export statement ----
        if node_type in ("export_statement", "export_declaration"):
            # TS/JS: export class … / export function …
            inner_exported = True
            for child in node.children:
                if child.type not in ("export", "default", "export_statement"):
                    self._extract_from_tree(
                        child,
                        language=language,
                        source=source,
                        file_path=file_path,
                        package_name=package_name,
                        file_qname=file_qname,
                        nodes=nodes,
                        edges=edges,
                        current_class=current_class,
                        current_class_qname=current_class_qname,
                        current_func_qname=current_func_qname,
                        exported=inner_exported,
                    )
            return

        class_types = CLASS_TYPES.get(language, [])
        function_types = FUNCTION_TYPES.get(language, [])
        import_types = IMPORT_TYPES.get(language, [])
        call_types = CALL_TYPES.get(language, [])

        # ----------------------------------------------------------------
        # CLASS node
        # ----------------------------------------------------------------
        if node_type in class_types:
            class_name = self._get_name(node, language, "class")
            if not class_name:
                # Fall through to children
                self._recurse_children(
                    node, language=language, source=source,
                    file_path=file_path, package_name=package_name,
                    file_qname=file_qname, nodes=nodes, edges=edges,
                    current_class=current_class,
                    current_class_qname=current_class_qname,
                    exported=exported,
                )
                return

            is_test = _is_test_name(class_name)
            class_qname = self._make_qualified_name(
                package_name, file_path, class_name, None
            )
            doc = self._get_docstring(node, language, source)

            class_node = NodeInfo(
                repo_name=self.repo_name,
                package_name=package_name,
                entity_type="class",
                name=class_name,
                qualified_name=class_qname,
                language=language,
                file_path=file_path,
                line_start=node.start_point.row + 1,
                line_end=node.end_point.row + 1,
                documentation=doc,
                exported=exported,
                is_test=is_test,
            )
            nodes.append(class_node)

            # CONTAINS edge: file → class
            edges.append(EdgeInfo(
                from_qualified=file_qname,
                to_qualified=class_qname,
                to_name=class_name,
                relation_type="contains",
                file_path=file_path,
                line=node.start_point.row + 1,
            ))

            # EXTENDS / IMPLEMENTS edges
            bases = self._get_bases(node, language, source)
            for base_name in bases:
                base_qname = self._make_qualified_name(
                    None, "", None, base_name
                )
                edges.append(EdgeInfo(
                    from_qualified=class_qname,
                    to_qualified=base_qname,
                    to_name=base_name,
                    relation_type="extends",
                    file_path=file_path,
                    line=node.start_point.row + 1,
                ))

            # Recurse into class body with current_class set
            self._recurse_children(
                node, language=language, source=source,
                file_path=file_path, package_name=package_name,
                file_qname=file_qname, nodes=nodes, edges=edges,
                current_class=class_name,
                current_class_qname=class_qname,
                exported=False,
            )
            return

        # ----------------------------------------------------------------
        # FUNCTION / METHOD node
        # ----------------------------------------------------------------
        if node_type in function_types:
            func_name = self._get_name(node, language, "function")
            if not func_name:
                self._recurse_children(
                    node, language=language, source=source,
                    file_path=file_path, package_name=package_name,
                    file_qname=file_qname, nodes=nodes, edges=edges,
                    current_class=current_class,
                    current_class_qname=current_class_qname,
                    exported=exported,
                )
                return

            # Skip Ruby 'require'/'require_relative' (those are imports, not methods)
            if language == "ruby" and func_name in ("require", "require_relative"):
                return

            is_method = current_class is not None
            entity_type = "method" if is_method else "function"
            is_test = _is_test_name(func_name)
            params = self._get_params(node, language, source)
            ret_type = self._get_return_type(node, language, source)
            signature = self._build_signature(func_name, params, ret_type)
            doc = self._get_docstring(node, language, source)

            func_qname = self._make_qualified_name(
                package_name, file_path, current_class, func_name
            )

            func_node = NodeInfo(
                repo_name=self.repo_name,
                package_name=package_name,
                entity_type=entity_type,
                name=func_name,
                qualified_name=func_qname,
                language=language,
                file_path=file_path,
                line_start=node.start_point.row + 1,
                line_end=node.end_point.row + 1,
                signature=signature,
                documentation=doc,
                exported=exported,
                is_test=is_test,
                parent_name=current_class,
            )
            nodes.append(func_node)

            container_qname = current_class_qname or file_qname
            container_name = current_class or file_path

            if is_method:
                # HAS_METHOD edge: class → method
                edges.append(EdgeInfo(
                    from_qualified=current_class_qname,  # type: ignore[arg-type]
                    to_qualified=func_qname,
                    to_name=func_name,
                    relation_type="has_method",
                    file_path=file_path,
                    line=node.start_point.row + 1,
                ))
            else:
                # CONTAINS edge: file → function
                edges.append(EdgeInfo(
                    from_qualified=file_qname,
                    to_qualified=func_qname,
                    to_name=func_name,
                    relation_type="contains",
                    file_path=file_path,
                    line=node.start_point.row + 1,
                ))

            # Recurse into function body to find call edges, passing this
            # function's qualified name so call edges are attributed to it
            self._recurse_children(
                node, language=language, source=source,
                file_path=file_path, package_name=package_name,
                file_qname=file_qname, nodes=nodes, edges=edges,
                current_class=current_class,
                current_class_qname=current_class_qname,
                current_func_qname=func_qname,
                exported=False,
            )
            return

        # ----------------------------------------------------------------
        # IMPORT node
        # ----------------------------------------------------------------
        if node_type in import_types:
            # Special-case: Ruby uses 'call' for both require AND function calls
            if language == "ruby" and node_type == "call":
                imported = self._extract_import_ruby(node, source)
                if imported is None:
                    # It's a regular call, not an import
                    call_name = self._get_call_name(node, language, source)
                    if call_name:
                        caller_qname = current_func_qname or current_class_qname or file_qname
                        callee_qname = self._make_qualified_name(
                            None, "", None, call_name
                        )
                        edges.append(EdgeInfo(
                            from_qualified=caller_qname,
                            to_qualified=callee_qname,
                            to_name=call_name,
                            relation_type="calls",
                            file_path=file_path,
                            line=node.start_point.row + 1,
                        ))
                    return
                imported_name = imported
            else:
                imported_name = self._extract_import(node, language, source)

            if imported_name:
                caller_qname = file_qname
                callee_qname = self._make_qualified_name(
                    None, "", None, imported_name
                )
                edges.append(EdgeInfo(
                    from_qualified=caller_qname,
                    to_qualified=callee_qname,
                    to_name=imported_name,
                    relation_type="imports",
                    file_path=file_path,
                    line=node.start_point.row + 1,
                ))
            return

        # ----------------------------------------------------------------
        # CALL node  (only when we're inside a function/method context)
        # ----------------------------------------------------------------
        if node_type in call_types and current_class_qname is not None or (
            node_type in call_types and current_class is None
        ):
            # Only emit call edges when inside a function scope.
            # We detect this by checking if we're not at the top of a class body.
            # Since we only recurse into function bodies for call detection, this
            # is already handled by the recursion structure.
            call_name = self._get_call_name(node, language, source)
            if call_name:
                caller_qname = current_func_qname or current_class_qname or file_qname
                callee_qname = self._make_qualified_name(
                    None, "", None, call_name
                )
                edges.append(EdgeInfo(
                    from_qualified=caller_qname,
                    to_qualified=callee_qname,
                    to_name=call_name,
                    relation_type="calls",
                    file_path=file_path,
                    line=node.start_point.row + 1,
                ))
            # Don't recurse further into call expression children for more calls
            # (avoids deeply nested duplicate edges)
            return

        # ----------------------------------------------------------------
        # Default: recurse
        # ----------------------------------------------------------------
        self._recurse_children(
            node, language=language, source=source,
            file_path=file_path, package_name=package_name,
            file_qname=file_qname, nodes=nodes, edges=edges,
            current_class=current_class,
            current_class_qname=current_class_qname,
            current_func_qname=current_func_qname,
            exported=exported,
        )

    def _recurse_children(self, node, **kwargs) -> None:
        for child in node.children:
            self._extract_from_tree(child, **kwargs)

    # ------------------------------------------------------------------
    # Name extraction helpers
    # ------------------------------------------------------------------

    def _get_name(self, node, language: str, kind: str) -> Optional[str]:
        """Find the identifier name for a class or function node."""
        # C/C++ functions: look for function_declarator first
        if language in ("c", "cpp") and kind == "function":
            for child in node.children:
                if child.type == "function_declarator":
                    for gc in child.children:
                        if gc.type == "identifier":
                            return _decode(gc.text)
                    break

        # TypeScript/JS: class names use type_identifier
        # General: look for identifier or type_identifier children
        for child in node.children:
            if child.type in ("identifier", "type_identifier", "property_identifier"):
                return _decode(child.text)

        return None

    def _get_params(self, node, language: str, source: bytes) -> Optional[str]:
        """Return the raw text of the parameters node."""
        param_types = {
            "parameters", "formal_parameters", "parameter_list",
            "params", "arguments",
        }
        for child in node.children:
            if child.type in param_types:
                return _decode(child.text)
        return None

    def _get_return_type(self, node, language: str, source: bytes) -> Optional[str]:
        """Return the return type annotation text, if present."""
        # Python: look for '->' followed by 'type' child
        if language == "python":
            found_arrow = False
            for child in node.children:
                if child.type == "->":
                    found_arrow = True
                elif found_arrow and child.type == "type":
                    return _decode(child.text)
            return None

        # TypeScript/JS/Java/Kotlin/Swift: type_annotation child
        for child in node.children:
            if child.type in ("type_annotation", "return_type", "type"):
                text = _decode(child.text)
                # Strip leading ': ' for type_annotation
                if text.startswith(":"):
                    text = text[1:].strip()
                return text

        return None

    def _get_bases(self, node, language: str, source: bytes) -> list[str]:
        """Return list of base class / interface names."""
        bases: list[str] = []

        if language == "python":
            # Python class_definition: argument_list child holds bases
            for child in node.children:
                if child.type == "argument_list":
                    for gc in child.children:
                        if gc.type in ("identifier", "dotted_name", "attribute"):
                            bases.append(_decode(gc.text))
            return bases

        if language in ("javascript", "typescript", "tsx"):
            # class_heritage > extends_clause, implements_clause
            for child in node.children:
                if child.type == "class_heritage":
                    for clause in child.children:
                        if clause.type == "extends_clause":
                            for item in clause.children:
                                if item.type in ("identifier", "type_identifier"):
                                    bases.append(_decode(item.text))
                        elif clause.type == "implements_clause":
                            for item in clause.children:
                                if item.type in ("identifier", "type_identifier",
                                                 "type_reference"):
                                    bases.append(_decode(item.text))
            return bases

        if language == "java":
            # superclass child (extends) and super_interfaces (implements)
            for child in node.children:
                if child.type == "superclass":
                    for gc in child.children:
                        if gc.type in ("type_identifier", "identifier"):
                            bases.append(_decode(gc.text))
                elif child.type in ("super_interfaces", "interfaces"):
                    for gc in child.children:
                        if gc.type in ("type_identifier", "identifier"):
                            bases.append(_decode(gc.text))
            return bases

        if language in ("c", "cpp"):
            for child in node.children:
                if child.type == "base_class_clause":
                    for gc in child.children:
                        if gc.type in ("type_identifier", "identifier"):
                            bases.append(_decode(gc.text))
            return bases

        if language == "go":
            # Go uses embedded fields in struct body for interface composition
            # Not extracting here — too complex for now
            return bases

        return bases

    def _extract_import(self, node, language: str, source: bytes) -> Optional[str]:
        """Extract the import target name from an import node."""
        if language == "python":
            # import_statement: dotted_name children
            # import_from_statement: first dotted_name is module, then 'import', then names
            for child in node.children:
                if child.type in ("dotted_name", "relative_import"):
                    return _decode(child.text)
            # from X import Y → return X
            return None

        if language in ("javascript", "typescript", "tsx"):
            # import_statement: string child is the module path
            for child in node.children:
                if child.type == "string":
                    # Strip quotes
                    raw = _decode(child.text)
                    return raw.strip("'\"")
            return None

        if language == "go":
            # import_declaration may contain import_spec or import_spec_list
            # import_spec: optional alias + string
            return self._extract_import_go(node, source)

        if language == "rust":
            # use_declaration: text after 'use '
            text = _decode(node.text)
            # 'use std::io;' → 'std::io'
            m = re.match(r"use\s+([\w:*{},\s]+)", text)
            if m:
                # Return the first path segment
                raw = m.group(1).strip().rstrip(";")
                return raw.split("::")[0] if raw else None
            return None

        if language in ("c", "cpp"):
            # preproc_include: system_lib_string or string_literal child
            for child in node.children:
                if child.type in ("system_lib_string", "string_literal", "string"):
                    raw = _decode(child.text)
                    return raw.strip("<>\"'")
            return None

        if language == "java":
            # import_declaration: dotted_name or full text
            text = _decode(node.text)
            # 'import java.util.List;' → 'List'
            text = text.replace("import", "").strip().rstrip(";")
            # Return the last segment
            parts = text.split(".")
            if parts:
                last = parts[-1].strip()
                return last if last != "*" else parts[-2].strip() if len(parts) > 1 else None
            return None

        if language == "kotlin":
            # import_header: full dotted name
            text = _decode(node.text)
            text = text.replace("import", "").strip()
            parts = text.split(".")
            if parts:
                return parts[-1].strip()
            return None

        if language == "swift":
            # import_declaration: 'import' identifier
            for child in node.children:
                if child.type == "identifier":
                    return _decode(child.text)
            return None

        if language == "php":
            # namespace_use_declaration: use_clause > qualified_name
            for child in node.children:
                if child.type in ("use_clause", "namespace_use_clause"):
                    for gc in child.children:
                        if gc.type in ("qualified_name", "identifier", "name"):
                            text = _decode(gc.text)
                            return text.split("\\")[-1]
            return None

        return None

    def _extract_import_go(self, node, source: bytes) -> Optional[str]:
        """Extract first import path from a Go import_declaration."""
        for child in node.children:
            if child.type == "import_spec":
                for gc in child.children:
                    if gc.type in ("interpreted_string_literal", "raw_string_literal",
                                   "string"):
                        raw = _decode(gc.text).strip("\"'`")
                        # Return last path segment
                        return raw.split("/")[-1] if raw else None
            elif child.type == "import_spec_list":
                for gc in child.children:
                    if gc.type == "import_spec":
                        for ggc in gc.children:
                            if ggc.type in ("interpreted_string_literal",
                                            "raw_string_literal", "string"):
                                raw = _decode(ggc.text).strip("\"'`")
                                return raw.split("/")[-1] if raw else None
        return None

    def _extract_import_ruby(self, node, source: bytes) -> Optional[str]:
        """Return import target if node is a Ruby require/require_relative call.

        Returns None if the call is not a require.
        """
        # Ruby call node: method identifier + argument_list
        method_name = None
        arg_text = None
        for child in node.children:
            if child.type in ("identifier",) and method_name is None:
                method_name = _decode(child.text)
            elif child.type == "argument_list":
                for gc in child.children:
                    if gc.type in ("string", "string_literal"):
                        raw = _decode(gc.text)
                        arg_text = raw.strip("'\"")
                        break

        if method_name in ("require", "require_relative") and arg_text:
            return arg_text.split("/")[-1].replace(".rb", "")
        return None

    def _get_call_name(self, node, language: str, source: bytes) -> Optional[str]:
        """Extract the callee name from a call expression node."""
        # The first meaningful child of a call is the function reference
        for child in node.children:
            ctype = child.type
            if ctype in ("identifier",):
                return _decode(child.text)
            if ctype in ("member_expression", "attribute", "field_expression",
                         "selector_expression", "dot_expression"):
                # Return the rightmost identifier
                last_id = None
                for gc in child.children:
                    if gc.type in ("identifier", "property_identifier",
                                   "field_identifier", "type_identifier"):
                        last_id = _decode(gc.text)
                return last_id
            # Skip punctuation and keywords at the start
            if ctype not in ("new", "await", "(", ")", ",", ";", "arguments"):
                # Might be a qualified name for other languages
                if ctype in ("scoped_identifier", "qualified_identifier",
                             "type_identifier", "property_identifier"):
                    return _decode(child.text)
        return None

    # ------------------------------------------------------------------
    # Docstring helper
    # ------------------------------------------------------------------

    def _get_docstring(self, node, language: str, source: bytes) -> Optional[str]:
        """Extract leading docstring/comment from a class or function node."""
        if language == "python":
            # First statement in body may be a string literal (docstring)
            for child in node.children:
                if child.type == "block":
                    for stmt in child.children:
                        if stmt.type == "string":
                            raw = _decode(stmt.text)
                            return raw.strip('"""\'')
                    break
        return None

    def _build_signature(
        self,
        name: str,
        params: Optional[str],
        return_type: Optional[str],
    ) -> Optional[str]:
        """Construct a human-readable signature string."""
        if params is None:
            return name
        sig = f"{name}{params}"
        if return_type:
            sig += f" -> {return_type}"
        return sig


# ---------------------------------------------------------------------------
# DBWriter — persist parsed nodes/edges into the code_entities/code_relations
# SQLite tables.  Uses a file_hash to skip re-indexing unchanged files.
# ---------------------------------------------------------------------------

class DBWriter:
    """Write NodeInfo / EdgeInfo records into the SQLite knowledge base.

    Usage::

        writer = DBWriter(db_path="aicodepath-docs/aicodepath.db")
        indexed = writer.index_file(Path("src/main.py"), nodes, edges)
    """

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None

    # ------------------------------------------------------------------
    # Connection
    # ------------------------------------------------------------------

    def _get_conn(self) -> sqlite3.Connection:
        """Lazy-connect and enable WAL mode for concurrent access."""
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path)
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA foreign_keys=ON")
        return self._conn

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def index_file(
        self,
        path: Path,
        nodes: list["NodeInfo"],
        edges: list["EdgeInfo"],
    ) -> bool:
        """Persist nodes and edges for *path*.

        Returns True if the file was indexed, False if skipped because the
        file content has not changed since the last index run.
        """
        try:
            content = path.read_bytes()
        except OSError:
            return False

        file_hash = hashlib.sha256(content).hexdigest()
        file_path_str = str(path)

        conn = self._get_conn()

        # Check whether a matching hash already exists for this file
        row = conn.execute(
            "SELECT file_hash FROM code_entities WHERE file_path = ? LIMIT 1",
            (file_path_str,),
        ).fetchone()

        if row is not None and row[0] == file_hash:
            # File is unchanged — skip
            return False

        # Clear stale rows then insert fresh
        self.clear_file(file_path_str)
        self._insert_nodes(conn, nodes, file_hash)
        self._insert_edges(conn, edges)
        conn.commit()
        return True

    def clear_file(self, file_path: str) -> None:
        """Delete all code_entities and code_relations rows for *file_path*."""
        conn = self._get_conn()
        conn.execute(
            "DELETE FROM code_entities WHERE file_path = ?",
            (file_path,),
        )
        # Relations are keyed by qualified name which encodes the file path;
        # delete any relation whose from_entity_name starts with the qualified
        # prefix for this file.  A simpler and safe approach is to delete rows
        # where the file_path segment appears in the qualified name.  Because
        # qualified names are structured as "repo:pkg:file_path:entity" we can
        # do an exact substring match.
        conn.execute(
            "DELETE FROM code_relations WHERE from_entity_name LIKE ?",
            (f"%:{file_path}:%",),
        )
        conn.commit()

    def reindex_file(self, path: Path, parser: "CodeGraphParser") -> bool:
        """Force a full re-parse and re-index of *path*.

        Clears existing rows, re-parses the file with *parser*, then
        inserts the fresh results.  Returns True if successfully indexed.
        """
        file_path_str = str(path)
        self.clear_file(file_path_str)

        nodes, edges = parser.parse_file(path)
        if not nodes:
            return False

        try:
            content = path.read_bytes()
        except OSError:
            return False

        file_hash = hashlib.sha256(content).hexdigest()
        conn = self._get_conn()
        self._insert_nodes(conn, nodes, file_hash)
        self._insert_edges(conn, edges)
        conn.commit()
        return True

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _insert_nodes(
        conn: sqlite3.Connection,
        nodes: list["NodeInfo"],
        file_hash: str,
    ) -> None:
        """INSERT all NodeInfo records into code_entities."""
        sql = """
            INSERT INTO code_entities (
                entity_type, name, qualified_name, language,
                file_path, line_start, line_end,
                signature, body, documentation,
                exported, is_test, complexity,
                repo_name, package_name,
                file_hash, cr_number
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, 'CR-GRAPH'
            )
        """
        rows = [
            (
                n.entity_type,
                n.name,
                n.qualified_name,
                n.language,
                n.file_path,
                n.line_start,
                n.line_end,
                n.signature,
                n.body,
                n.documentation,
                1 if n.exported else 0,
                1 if n.is_test else 0,
                n.complexity,
                n.repo_name,
                n.package_name,
                file_hash,
            )
            for n in nodes
        ]
        conn.executemany(sql, rows)

    @staticmethod
    def _insert_edges(
        conn: sqlite3.Connection,
        edges: list["EdgeInfo"],
    ) -> None:
        """INSERT all EdgeInfo records into code_relations."""
        sql = """
            INSERT INTO code_relations (
                from_entity_name,
                to_entity_name,
                to_entity_id,
                relation_type,
                metadata
            ) VALUES (?, ?, NULL, ?, NULL)
        """
        rows = [
            (
                e.from_qualified,
                e.to_name,
                e.relation_type,
            )
            for e in edges
        ]
        conn.executemany(sql, rows)


# ---------------------------------------------------------------------------
# Entity resolution
# ---------------------------------------------------------------------------

def resolve_entities(db_path: str) -> dict:
    """Resolution pass: update code_relations.to_entity_id by matching
    to_entity_name against code_entities.qualified_name.

    Strategy:
    1. Load all code_entities into a lookup dict:
       {qualified_name: id} for exact matches, plus a list for suffix scanning.
    2. For each code_relations row where to_entity_id IS NULL AND
       to_entity_name IS NOT NULL:
       a. Exact match: lookup[to_entity_name] -> id
       b. Suffix match: find any qualified_name ending with ':' + to_entity_name
       c. If matched: UPDATE code_relations SET to_entity_id = ? WHERE id = ?
    3. Return stats dict with keys 'total', 'resolved', 'unresolved'.

    External deps (stdlib, npm packages) that have no matching entity will
    remain with to_entity_id = NULL — that is correct and expected.

    Args:
        db_path: Path to the SQLite database file, or ':memory:' for testing.

    Returns:
        dict with keys 'total', 'resolved', 'unresolved'.
    """
    conn = sqlite3.connect(db_path)
    try:
        # ------------------------------------------------------------------
        # Step 1: build lookup from code_entities
        # ------------------------------------------------------------------
        # Primary lookup: qualified_name -> id (for exact matches)
        # Suffix list: [(qualified_name, id), ...] for suffix scanning
        exact_lookup: dict = {}
        suffix_list: list = []

        rows = conn.execute(
            "SELECT id, qualified_name FROM code_entities WHERE qualified_name IS NOT NULL"
        ).fetchall()
        for eid, qname in rows:
            exact_lookup[qname] = eid
            suffix_list.append((qname, eid))

        # ------------------------------------------------------------------
        # Step 2: process unresolved relations
        # ------------------------------------------------------------------
        unresolved_rows = conn.execute(
            "SELECT id, to_entity_name FROM code_relations "
            "WHERE to_entity_id IS NULL AND to_entity_name IS NOT NULL"
        ).fetchall()

        total = len(unresolved_rows)
        resolved = 0

        for rel_id, to_name in unresolved_rows:
            matched_id = None

            # a. Exact match
            if to_name in exact_lookup:
                matched_id = exact_lookup[to_name]
            else:
                # b. Suffix match against all qualified-name separators:
                #    ':' matches class/file nodes  (e.g. ':GraphEngine')
                #    '.' matches method nodes       (e.g. '.parse_file')
                #    '/' matches path segments      (e.g. '/utils')
                for sep in (':', '.', '/'):
                    suffix = sep + to_name
                    for qname, eid in suffix_list:
                        if qname.endswith(suffix):
                            matched_id = eid
                            break
                    if matched_id is not None:
                        break

            if matched_id is not None:
                conn.execute(
                    "UPDATE code_relations SET to_entity_id = ? WHERE id = ?",
                    (matched_id, rel_id)
                )
                resolved += 1

        conn.commit()

        return {
            "total": total,
            "resolved": resolved,
            "unresolved": total - resolved,
        }
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _decode(b: Optional[bytes]) -> str:
    """Decode bytes to str, returning empty string on None."""
    if b is None:
        return ""
    if isinstance(b, bytes):
        return b.decode("utf-8", errors="replace")
    return str(b)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    import argparse
    import subprocess as _subprocess
    import json as _json
    import sys as _sys

    def _ensure_tables(db_path: str) -> None:
        """Create code_entities and code_relations tables if absent.

        Uses only the columns referenced by DBWriter so the CLI works with a
        fresh SQLite file without needing the full schema.sql applied.
        """
        import sqlite3 as _sqlite3
        conn = _sqlite3.connect(db_path)
        try:
            # Create tables (no-op if they already exist)
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS code_entities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    qualified_name TEXT,
                    language TEXT,
                    file_path TEXT NOT NULL,
                    line_start INTEGER,
                    line_end INTEGER,
                    signature TEXT,
                    body TEXT,
                    documentation TEXT,
                    entity_hash TEXT,
                    token_hash TEXT,
                    structural_hash TEXT,
                    file_hash TEXT,
                    complexity INTEGER,
                    dependencies JSON,
                    exported BOOLEAN DEFAULT 0,
                    is_test BOOLEAN DEFAULT 0,
                    metadata JSON,
                    cr_number TEXT NOT NULL DEFAULT 'CR-LEGACY',
                    artifact_id INTEGER,
                    repo_name TEXT,
                    package_name TEXT,
                    indexed_at TEXT DEFAULT (datetime('now')),
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_code_entities_file
                    ON code_entities(file_path);

                CREATE TABLE IF NOT EXISTS code_relations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    from_entity_id INTEGER,
                    to_entity_id INTEGER,
                    from_entity_name TEXT,
                    to_entity_name TEXT,
                    relation_type TEXT NOT NULL,
                    metadata JSON,
                    created_at TEXT DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_code_relations_from_name
                    ON code_relations(from_entity_name);
                CREATE INDEX IF NOT EXISTS idx_code_relations_to_name
                    ON code_relations(to_entity_name);
            """)

            # Upgrade existing tables that predate repo_name/package_name/is_test columns.
            # ALTER TABLE ADD COLUMN fails with "duplicate column name"
            # if the column already exists — catch and ignore that error.
            for col_sql in [
                "ALTER TABLE code_entities ADD COLUMN repo_name TEXT",
                "ALTER TABLE code_entities ADD COLUMN package_name TEXT",
                "ALTER TABLE code_entities ADD COLUMN is_test BOOLEAN DEFAULT 0",
            ]:
                try:
                    conn.execute(col_sql)
                except _sqlite3.OperationalError:
                    pass  # Column already exists

            # Create indexes for the (possibly just-added) columns
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_code_entities_repo"
                " ON code_entities(repo_name)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_code_entities_package"
                " ON code_entities(package_name)"
            )

            conn.commit()
        finally:
            conn.close()

    def _count_db_rows(db_path: str) -> tuple[int, int]:
        """Return (entity_count, relation_count) from the DB."""
        import sqlite3 as _sqlite3
        try:
            conn = _sqlite3.connect(db_path)
            entities = conn.execute(
                "SELECT COUNT(*) FROM code_entities"
            ).fetchone()[0]
            relations = conn.execute(
                "SELECT COUNT(*) FROM code_relations"
            ).fetchone()[0]
            conn.close()
            return entities, relations
        except Exception:
            return 0, 0

    cli = argparse.ArgumentParser(description='Code graph AST indexer')
    cli.add_argument('--index', nargs='?', const='.', metavar='PATH')
    cli.add_argument('--reindex', metavar='FILE')
    cli.add_argument('--diff-reindex', action='store_true')
    cli.add_argument('--db-path', default='aicodepath-docs/aicodepath.db')
    args = cli.parse_args()

    # Require exactly one mode
    if not any([args.index is not None, args.reindex, args.diff_reindex]):
        cli.print_usage(_sys.stderr)
        _sys.stderr.write("error: one of --index, --reindex, --diff-reindex is required\n")
        _sys.exit(1)

    db_path = args.db_path
    _ensure_tables(db_path)

    indexed = 0
    skipped = 0

    # ------------------------------------------------------------------
    # --index mode: walk directory, index all source files, resolve
    # ------------------------------------------------------------------
    if args.index is not None:
        index_path = Path(args.index)
        if not index_path.exists():
            _sys.stderr.write(f"error: path not found: {index_path}\n")
            _sys.exit(1)

        parser = CodeGraphParser(repo_name=index_path.name)
        writer = DBWriter(db_path=db_path)

        if index_path.is_file():
            nodes, edges = parser.parse_file(index_path)
            if nodes:
                result = writer.index_file(index_path, nodes, edges)
                if result:
                    indexed += 1
                else:
                    skipped += 1
        else:
            # Walk directory
            excludes = set(_DEFAULT_EXCLUDES)
            for fpath in CodeGraphParser._iter_files(index_path, excludes):
                nodes, edges = parser.parse_file(fpath)
                if nodes:
                    result = writer.index_file(fpath, nodes, edges)
                    if result:
                        indexed += 1
                    else:
                        skipped += 1

        resolve_stats = resolve_entities(db_path)
        entities, relations = _count_db_rows(db_path)
        print(_json.dumps({
            "indexed": indexed,
            "skipped": skipped,
            "entities": entities,
            "relations": relations,
            "resolved": resolve_stats.get("resolved", 0),
        }))
        _sys.exit(0)

    # ------------------------------------------------------------------
    # --reindex mode: clear + re-index single file, resolve
    # ------------------------------------------------------------------
    if args.reindex:
        reindex_path = Path(args.reindex)
        if not reindex_path.exists():
            _sys.stderr.write(f"error: file not found: {reindex_path}\n")
            _sys.exit(1)

        parser = CodeGraphParser(repo_name=reindex_path.parent.name)
        writer = DBWriter(db_path=db_path)

        success = writer.reindex_file(reindex_path, parser)
        if success:
            indexed = 1
        else:
            skipped = 1

        resolve_stats = resolve_entities(db_path)
        entities, relations = _count_db_rows(db_path)
        print(_json.dumps({
            "indexed": indexed,
            "skipped": skipped,
            "entities": entities,
            "relations": relations,
            "resolved": resolve_stats.get("resolved", 0),
        }))
        _sys.exit(0)

    # ------------------------------------------------------------------
    # --diff-reindex mode: git diff --name-only HEAD~1, reindex changed
    # ------------------------------------------------------------------
    if args.diff_reindex:
        git_result = _subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1"],
            capture_output=True,
            text=True,
        )
        if git_result.returncode != 0:
            _sys.stderr.write(
                f"warning: git diff failed (may be at initial commit): "
                f"{git_result.stderr.strip()}\n"
            )
            changed_files: list[str] = []
        else:
            changed_files = [
                line.strip()
                for line in git_result.stdout.splitlines()
                if line.strip()
            ]

        # Filter to supported source extensions
        supported_exts = set(LANGUAGE_EXTENSIONS.keys())
        parser = CodeGraphParser()
        writer = DBWriter(db_path=db_path)

        for rel_path in changed_files:
            fpath = Path(rel_path)
            if fpath.suffix.lower() not in supported_exts:
                continue
            if not fpath.exists():
                continue
            success = writer.reindex_file(fpath, parser)
            if success:
                indexed += 1
            else:
                skipped += 1

        resolve_stats = resolve_entities(db_path)
        entities, relations = _count_db_rows(db_path)
        print(_json.dumps({
            "indexed": indexed,
            "skipped": skipped,
            "entities": entities,
            "relations": relations,
            "resolved": resolve_stats.get("resolved", 0),
        }))
        _sys.exit(0)
