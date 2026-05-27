"""File type detection and parser selection for code analysis."""
from pathlib import Path
from typing import Optional, Dict, Any, Protocol
import mimetypes
import re


def sniff_sql_content(content: str) -> Optional[str]:
    """Detect SQL dump dialect from file content.

    Reads the first 50 lines and matches against known dump signatures.

    Args:
        content: SQL file content as a string

    Returns:
        Optional[str]: 'pgdump', 'mysqldump', 'sqlite_dump', or None if plain SQL

    Raises:
        ValueError: If the content is empty, truncated, or a data-only dump
    """
    if not content or not content.strip():
        raise ValueError("Dump file is empty")

    lines = content.splitlines()
    if len(lines) < 3:
        raise ValueError("Dump file appears truncated (< 3 lines)")

    header = '\n'.join(lines[:50])

    # PostgreSQL detection
    if re.search(r'--\s*PostgreSQL database dump', header, re.IGNORECASE) or \
       re.search(r'pg_dump', header[:200], re.IGNORECASE):
        if not re.search(r'CREATE\s+TABLE', content, re.IGNORECASE):
            raise ValueError(
                "Recognized as pgdump dump but no CREATE TABLE statements found "
                "— file may be data-only (use --schema-only flag)"
            )
        return 'pgdump'

    # MySQL detection
    if re.search(r'--\s*MySQL dump', header, re.IGNORECASE) or \
       re.search(r'/\*!40', header):
        if not re.search(r'CREATE\s+TABLE', content, re.IGNORECASE):
            raise ValueError(
                "Recognized as mysqldump dump but no CREATE TABLE statements found "
                "— file may be data-only (use --schema-only flag)"
            )
        return 'mysqldump'

    # SQLite detection
    if re.search(r'PRAGMA\s+foreign_keys\s*=\s*OFF', header, re.IGNORECASE) or \
       re.search(r'BEGIN\s+TRANSACTION\s*;', header, re.IGNORECASE):
        if not re.search(r'CREATE\s+TABLE', content, re.IGNORECASE):
            raise ValueError(
                "Recognized as sqlite_dump dump but no CREATE TABLE statements found "
                "— file may be data-only (use --schema-only flag)"
            )
        return 'sqlite_dump'

    return None


class CodeParser(Protocol):
    """Protocol for code parsers."""

    parser_type: str

    def parse(self, content: str) -> Dict[str, Any]:
        """Parse code content and return structured data."""
        return {}


class FileAnalyzer:
    """Detect file types and select appropriate parsers.

    This class handles language detection based on file extensions
    and MIME types, and provides the appropriate parser for each language.
    """

    # Language detection mappings
    EXTENSION_TO_LANGUAGE = {
        # Python
        '.py': 'python',
        '.pyw': 'python',
        '.pyi': 'python',

        # JavaScript/TypeScript
        '.js': 'javascript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.mts': 'typescript',
        '.cts': 'typescript',

        # Java
        '.java': 'java',

        # C/C++
        '.c': 'c',
        '.h': 'c',
        '.cpp': 'cpp',
        '.cc': 'cpp',
        '.cxx': 'cpp',
        '.hpp': 'cpp',
        '.hh': 'cpp',
        '.hxx': 'cpp',

        # C#
        '.cs': 'csharp',

        # Go
        '.go': 'go',

        # Rust
        '.rs': 'rust',

        # Ruby
        '.rb': 'ruby',

        # PHP
        '.php': 'php',

        # Swift
        '.swift': 'swift',

        # Kotlin
        '.kt': 'kotlin',
        '.kts': 'kotlin',

        # SQL
        '.sql': 'sql',

        # Shell
        '.sh': 'shell',
        '.bash': 'shell',
        '.zsh': 'shell',

        # YAML
        '.yml': 'yaml',
        '.yaml': 'yaml',

        # JSON
        '.json': 'json',

        # XML
        '.xml': 'xml',

        # Markdown
        '.md': 'markdown',
        '.markdown': 'markdown',

        # GraphQL
        '.graphql': 'graphql',
        '.gql': 'graphql',

        # Terraform
        '.tf': 'terraform',
        '.tfvars': 'terraform',

        # Docker
        'Dockerfile': 'dockerfile',
        '.dockerfile': 'dockerfile',
    }

    # Supported languages for diagram generation
    DIAGRAM_SUPPORTED_LANGUAGES = {
        'python', 'javascript', 'typescript', 'java', 'cpp', 'csharp',
        'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql'
    }

    def __init__(self):
        """Initialize the file analyzer."""
        # Initialize mimetypes
        mimetypes.init()

    def detect_language(self, file_path: str, content: str = None) -> Optional[str]:
        """Detect programming language from file path.

        For .sql files, optionally sniffs content to identify dump dialects.

        Args:
            file_path: Path to the file
            content: Optional file content for SQL dialect sniffing

        Returns:
            Optional[str]: Detected language name or None if unknown
        """
        path = Path(file_path)

        # Check exact filename match (e.g., Dockerfile)
        if path.name in self.EXTENSION_TO_LANGUAGE:
            return self.EXTENSION_TO_LANGUAGE[path.name]

        # Check file extension
        extension = path.suffix.lower()
        if extension in self.EXTENSION_TO_LANGUAGE:
            language = self.EXTENSION_TO_LANGUAGE[extension]

            # For SQL files, attempt dump dialect sniffing
            if language == 'sql' and content is not None:
                try:
                    dialect = sniff_sql_content(content)
                    if dialect is not None:
                        return dialect
                except ValueError:
                    # Let ValueError propagate — it means corrupt/empty/data-only
                    raise

            return language

        # Try MIME type detection as fallback
        mime_type, _ = mimetypes.guess_type(str(path))
        if mime_type:
            language = self._mime_to_language(mime_type)
            if language:
                return language

        return None

    def get_parser(self, language: str) -> Optional[CodeParser]:
        """Get appropriate parser for the language.

        Args:
            language: Programming language name

        Returns:
            Optional[CodeParser]: Parser instance or None if not available
        """
        language = language.lower()

        # Import parsers dynamically to avoid circular dependencies
        if language == 'python':
            return self._get_python_parser()
        elif language in ('javascript', 'typescript'):
            return self._get_javascript_parser()
        elif language == 'java':
            return self._get_java_parser()
        elif language in ('c', 'cpp'):
            return self._get_cpp_parser()
        elif language == 'csharp':
            return self._get_csharp_parser()
        elif language == 'go':
            return self._get_go_parser()
        elif language == 'rust':
            return self._get_rust_parser()
        elif language == 'sql':
            return self._get_sql_parser()
        elif language == 'pgdump':
            return self._get_dump_parser('postgresql')
        elif language == 'mysqldump':
            return self._get_dump_parser('mysql')
        elif language == 'sqlite_dump':
            return self._get_dump_parser('sqlite')
        else:
            return None

    def is_supported(self, file_path: str) -> bool:
        """Check if a file can be analyzed.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file type is supported
        """
        language = self.detect_language(file_path)
        return language is not None and language in self.DIAGRAM_SUPPORTED_LANGUAGES

    def get_supported_extensions(self) -> list[str]:
        """Get list of all supported file extensions.

        Returns:
            list[str]: List of supported file extensions
        """
        return [
            ext for ext, lang in self.EXTENSION_TO_LANGUAGE.items()
            if lang in self.DIAGRAM_SUPPORTED_LANGUAGES
        ]

    def _mime_to_language(self, mime_type: str) -> Optional[str]:
        """Convert MIME type to language name.

        Args:
            mime_type: MIME type string

        Returns:
            Optional[str]: Language name or None
        """
        mime_to_lang = {
            'text/x-python': 'python',
            'application/x-python': 'python',
            'text/javascript': 'javascript',
            'application/javascript': 'javascript',
            'application/x-javascript': 'javascript',
            'text/typescript': 'typescript',
            'application/typescript': 'typescript',
            'text/x-java': 'java',
            'text/x-c': 'c',
            'text/x-c++': 'cpp',
            'text/x-csharp': 'csharp',
            'text/x-go': 'go',
            'text/x-rust': 'rust',
            'text/x-ruby': 'ruby',
            'application/x-php': 'php',
            'text/x-sql': 'sql',
        }

        return mime_to_lang.get(mime_type)

    def _get_python_parser(self) -> Optional[CodeParser]:
        """Get Python parser.

        Returns:
            Optional[CodeParser]: Python parser or None
        """
        try:
            from ..parsers.python_parser import PythonParser
            return PythonParser()
        except ImportError:
            return None

    def _get_javascript_parser(self) -> Optional[CodeParser]:
        """Get JavaScript/TypeScript parser.

        Returns:
            Optional[CodeParser]: JavaScript parser or None
        """
        try:
            from ..parsers.javascript_parser import JavaScriptParser
            return JavaScriptParser()
        except ImportError:
            return None

    def _get_java_parser(self) -> Optional[CodeParser]:
        """Get Java parser.

        Returns:
            Optional[CodeParser]: Java parser or None
        """
        try:
            from ..parsers.java_parser import JavaParser
            return JavaParser()
        except ImportError:
            return None

    def _get_cpp_parser(self) -> Optional[CodeParser]:
        """Get C/C++ parser.

        Returns:
            Optional[CodeParser]: C++ parser or None
        """
        try:
            from ..parsers.cpp_parser import CppParser
            return CppParser()
        except ImportError:
            return None

    def _get_csharp_parser(self) -> Optional[CodeParser]:
        """Get C# parser.

        Returns:
            Optional[CodeParser]: C# parser or None
        """
        try:
            from ..parsers.csharp_parser import CSharpParser
            return CSharpParser()
        except ImportError:
            return None

    def _get_go_parser(self) -> Optional[CodeParser]:
        """Get Go parser.

        Returns:
            Optional[CodeParser]: Go parser or None
        """
        try:
            from ..parsers.go_parser import GoParser
            return GoParser()
        except ImportError:
            return None

    def _get_rust_parser(self) -> Optional[CodeParser]:
        """Get Rust parser.

        Returns:
            Optional[CodeParser]: Rust parser or None
        """
        try:
            from ..parsers.rust_parser import RustParser
            return RustParser()
        except ImportError:
            return None

    def _get_sql_parser(self) -> Optional[CodeParser]:
        """Get SQL parser.

        Returns:
            Optional[CodeParser]: SQL parser or None
        """
        try:
            from ..parsers.sql_parser import SQLParser
            return SQLParser()
        except ImportError:
            return None

    def _get_dump_parser(self, dialect: str) -> Optional[CodeParser]:
        """Get DumpParser for the specified dialect.

        Args:
            dialect: 'postgresql', 'mysql', or 'sqlite'

        Returns:
            Optional[CodeParser]: DumpParser instance or None
        """
        try:
            from ..parsers.dump_parser import DumpParser
            return DumpParser(dialect)
        except ImportError:
            return None
