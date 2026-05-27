"""Abstract base class for all diagram generators."""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DiagramOutput(BaseModel):
    """Output from diagram generation."""
    mermaid_code: str = Field(..., description="Generated Mermaid diagram code")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata about the diagram")
    warnings: List[str] = Field(default_factory=list, description="Warnings encountered during generation")
    errors: List[str] = Field(default_factory=list, description="Errors encountered during generation")
    source_files: List[str] = Field(default_factory=list, description="Source files analyzed")


class AnalyzedFile(BaseModel):
    """Represents an analyzed source file."""
    model_config = {"arbitrary_types_allowed": True}

    path: str = Field(..., description="File path")
    language: str = Field(..., description="Detected programming language")
    content: str = Field(..., description="File content")
    parsed_data: Optional[Any] = Field(None, description="Parsed AST or structure data")
    parser_type: str = Field(..., description="Type of parser used (AST, regex, etc.)")


class BaseGenerator(ABC):
    """Abstract base class for all diagram generators.

    This class provides common functionality for analyzing files,
    calculating confidence scores, and generating diagrams.
    """

    def __init__(self):
        """Initialize the generator."""
        self._analyzed_files: List[AnalyzedFile] = []
        self._warnings: List[str] = []
        self._errors: List[str] = []

    @property
    @abstractmethod
    def diagram_type(self) -> str:
        """Return the type of diagram this generator produces.

        Returns:
            str: Diagram type (e.g., 'class', 'sequence', 'erd', 'c4')
        """
        pass

    @property
    @abstractmethod
    def supported_extensions(self) -> List[str]:
        """Return list of file extensions this generator supports.

        Returns:
            List[str]: List of file extensions (e.g., ['.py', '.ts', '.js'])
        """
        pass

    @abstractmethod
    def generate(self, source_files: List[str], options: Optional[Dict[str, Any]] = None) -> DiagramOutput:
        """Generate a diagram from source files.

        Args:
            source_files: List of file paths to analyze
            options: Optional generation options

        Returns:
            DiagramOutput: Generated diagram with metadata

        Raises:
            ValueError: If source files are invalid or unsupported
            FileNotFoundError: If source files don't exist
        """
        pass

    def analyze_files(self, file_paths: List[str]) -> List[AnalyzedFile]:
        """Read and prepare files for analysis.

        Args:
            file_paths: List of file paths to analyze

        Returns:
            List[AnalyzedFile]: List of analyzed file objects

        Raises:
            FileNotFoundError: If any file doesn't exist
            ValueError: If file type is not supported
        """
        from .file_analyzer import FileAnalyzer

        analyzer = FileAnalyzer()
        analyzed_files = []

        for file_path in file_paths:
            path = Path(file_path)

            # Check if file exists
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            # Check if file extension is supported
            if path.suffix not in self.supported_extensions:
                self._warnings.append(
                    f"Skipping unsupported file type: {file_path} "
                    f"(supported: {', '.join(self.supported_extensions)})"
                )
                continue

            # Read file content first (needed for SQL dialect sniffing)
            try:
                content = path.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                self._warnings.append(f"Could not read file as UTF-8: {file_path}")
                continue

            # Detect language, passing content for SQL dump sniffing
            try:
                language = analyzer.detect_language(str(path), content=content)
            except ValueError as e:
                self._errors.append(str(e))
                continue
            if not language:
                self._warnings.append(f"Could not detect language for: {file_path}")
                continue

            # Get parser and parse content
            parser = analyzer.get_parser(language)
            parsed_data = None
            parser_type = "none"

            if parser:
                try:
                    parsed_data = parser.parse(content)
                    parser_type = parser.parser_type
                except ValueError as e:
                    self._errors.append(str(e))
                except Exception as e:
                    self._warnings.append(f"Unexpected error parsing {file_path}: {str(e)}")

            analyzed_file = AnalyzedFile(
                path=str(path),
                language=language,
                content=content,
                parsed_data=parsed_data,
                parser_type=parser_type
            )
            analyzed_files.append(analyzed_file)

        self._analyzed_files = analyzed_files
        return analyzed_files

    def calculate_confidence(
        self,
        parser_types: List[str],
        code_coverage: float = 1.0,
        relationship_accuracy: float = 1.0
    ) -> float:
        """Calculate confidence score for the generated diagram.

        Args:
            parser_types: List of parser types used (e.g., ['AST', 'regex'])
            code_coverage: Percentage of code analyzed (0.0 to 1.0)
            relationship_accuracy: Accuracy of relationship detection (0.0 to 1.0)

        Returns:
            float: Confidence score between 0.0 and 1.0
        """
        from .confidence_scorer import ConfidenceScorer

        scorer = ConfidenceScorer()
        return scorer.calculate(
            parser_types=parser_types,
            code_coverage=code_coverage,
            relationship_accuracy=relationship_accuracy
        )

    def _is_supported_file(self, file_path: str) -> bool:
        """Check if a file is supported by this generator.

        Args:
            file_path: Path to the file

        Returns:
            bool: True if file is supported
        """
        path = Path(file_path)
        return path.suffix in self.supported_extensions

    def _add_error(self, message: str) -> None:
        """Add an error message.

        Args:
            message: Error message to add
        """
        self._errors.append(message)

    def _get_errors(self) -> List[str]:
        """Get all accumulated errors.

        Returns:
            List[str]: List of error messages
        """
        return self._errors.copy()

    def _add_warning(self, message: str) -> None:
        """Add a warning message.

        Args:
            message: Warning message to add
        """
        self._warnings.append(message)

    def _get_warnings(self) -> List[str]:
        """Get all accumulated warnings.

        Returns:
            List[str]: List of warning messages
        """
        return self._warnings.copy()

    def _clear_warnings(self) -> None:
        """Clear all accumulated warnings."""
        self._warnings.clear()
