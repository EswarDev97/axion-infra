"""Per-language AST node type dictionaries for 13 supported languages.

Maps tree-sitter AST node type strings to semantic categories (class, function,
import, call) for each language supported by tree-sitter-language-pack on this
platform. Note: c_sharp is excluded (not available in tree-sitter-language-pack).
"""

SUPPORTED_LANGUAGES: list[str] = [
    "python",
    "javascript",
    "typescript",
    "tsx",
    "go",
    "rust",
    "java",
    "c",
    "cpp",
    "ruby",
    "kotlin",
    "swift",
    "php",
]

LANGUAGE_EXTENSIONS: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".jsx": "javascript",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".hxx": "cpp",
    ".rb": "ruby",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".swift": "swift",
    ".php": "php",
}

CLASS_TYPES: dict[str, list[str]] = {
    "python": ["class_definition"],
    "javascript": ["class_declaration", "class"],
    "typescript": ["class_declaration", "class"],
    "tsx": ["class_declaration", "class"],
    "go": ["type_declaration"],
    "rust": ["struct_item", "enum_item", "impl_item"],
    "java": ["class_declaration", "interface_declaration", "enum_declaration"],
    "c": ["struct_specifier", "type_definition"],
    "cpp": ["class_specifier", "struct_specifier"],
    "ruby": ["class", "module"],
    "kotlin": ["class_declaration", "object_declaration"],
    "swift": ["class_declaration", "struct_declaration", "protocol_declaration"],
    "php": ["class_declaration", "interface_declaration"],
}

FUNCTION_TYPES: dict[str, list[str]] = {
    "python": ["function_definition"],
    "javascript": ["function_declaration", "method_definition", "arrow_function"],
    "typescript": ["function_declaration", "method_definition", "arrow_function"],
    "tsx": ["function_declaration", "method_definition", "arrow_function"],
    "go": ["function_declaration", "method_declaration"],
    "rust": ["function_item"],
    "java": ["method_declaration", "constructor_declaration"],
    "c": ["function_definition"],
    "cpp": ["function_definition"],
    "ruby": ["method", "singleton_method"],
    "kotlin": ["function_declaration"],
    "swift": ["function_declaration"],
    "php": ["function_definition", "method_declaration"],
}

IMPORT_TYPES: dict[str, list[str]] = {
    "python": ["import_statement", "import_from_statement"],
    "javascript": ["import_statement"],
    "typescript": ["import_statement"],
    "tsx": ["import_statement"],
    "go": ["import_declaration"],
    "rust": ["use_declaration"],
    "java": ["import_declaration"],
    "c": ["preproc_include"],
    "cpp": ["preproc_include"],
    "ruby": ["call"],
    "kotlin": ["import_header"],
    "swift": ["import_declaration"],
    "php": ["namespace_use_declaration"],
}

CALL_TYPES: dict[str, list[str]] = {
    "python": ["call"],
    "javascript": ["call_expression", "new_expression"],
    "typescript": ["call_expression", "new_expression"],
    "tsx": ["call_expression", "new_expression"],
    "go": ["call_expression"],
    "rust": ["call_expression", "macro_invocation"],
    "java": ["method_invocation", "object_creation_expression"],
    "c": ["call_expression"],
    "cpp": ["call_expression"],
    "ruby": ["call", "method_call"],
    "kotlin": ["call_expression"],
    "swift": ["call_expression"],
    "php": ["function_call_expression", "member_call_expression"],
}
