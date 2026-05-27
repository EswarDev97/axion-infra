"""Python code parser using stdlib ast module."""
import ast
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class ClassEntity:
    """Represents a Python class."""

    def __init__(
        self,
        name: str,
        lineno: int,
        bases: List[str],
        methods: List[str],
        decorators: List[str],
        docstring: Optional[str] = None,
        is_abstract: bool = False
    ):
        self.name = name
        self.lineno = lineno
        self.bases = bases
        self.methods = methods
        self.decorators = decorators
        self.docstring = docstring
        self.is_abstract = is_abstract


class FunctionEntity:
    """Represents a Python function."""

    def __init__(
        self,
        name: str,
        lineno: int,
        args: List[str],
        decorators: List[str],
        is_async: bool = False,
        is_method: bool = False,
        parent_class: Optional[str] = None,
        docstring: Optional[str] = None
    ):
        self.name = name
        self.lineno = lineno
        self.args = args
        self.decorators = decorators
        self.is_async = is_async
        self.is_method = is_method
        self.parent_class = parent_class
        self.docstring = docstring


class ImportEntity:
    """Represents a Python import statement."""

    def __init__(
        self,
        module: str,
        names: List[str],
        aliases: Dict[str, str],
        lineno: int,
        is_from: bool = False
    ):
        self.module = module
        self.names = names
        self.aliases = aliases
        self.lineno = lineno
        self.is_from = is_from


class PythonParser:
    """Parser for Python code using the standard library ast module."""

    def __init__(self):
        self.confidence = 0.95  # Python AST parsing is highly reliable
        self.parser_type = "AST"

    def parse(self, content: str) -> Optional[ast.AST]:
        """
        Parse Python source code string into AST.

        Args:
            content: Python source code as string

        Returns:
            AST tree or None if parsing fails
        """
        try:
            tree = ast.parse(content)
            return tree
        except SyntaxError as e:
            logger.error(f"Syntax error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing Python code: {e}")
            return None

    def parse_file(self, file_path: str) -> Optional[ast.AST]:
        """
        Parse Python file into AST.

        Args:
            file_path: Path to the Python file

        Returns:
            AST tree or None if parsing fails
        """
        try:
            path = Path(file_path)
            if not path.exists():
                logger.error(f"File not found: {file_path}")
                return None

            if not path.suffix == '.py':
                logger.warning(f"Not a Python file: {file_path}")
                return None

            with open(path, 'r', encoding='utf-8') as f:
                source = f.read()

            tree = ast.parse(source, filename=str(path))
            return tree

        except SyntaxError as e:
            logger.error(f"Syntax error in {file_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return None

    def extract_classes(self, ast_tree: ast.AST) -> List[ClassEntity]:
        """
        Extract ClassEntity objects from AST.

        Args:
            ast_tree: Parsed AST tree

        Returns:
            List of ClassEntity objects
        """
        classes = []

        try:
            for node in ast.walk(ast_tree):
                if isinstance(node, ast.ClassDef):
                    # Extract base classes
                    bases = []
                    for base in node.bases:
                        if isinstance(base, ast.Name):
                            bases.append(base.id)
                        elif isinstance(base, ast.Attribute):
                            bases.append(self._get_attribute_name(base))

                    # Extract methods
                    methods = []
                    for item in node.body:
                        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            methods.append(item.name)

                    # Extract decorators
                    decorators = self.find_decorators(node)

                    # Extract docstring
                    docstring = ast.get_docstring(node)

                    # Check if abstract
                    is_abstract = any(
                        dec in ['abstractmethod', 'abc.abstractmethod', 'ABCMeta']
                        for dec in decorators
                    ) or 'ABC' in bases

                    classes.append(ClassEntity(
                        name=node.name,
                        lineno=node.lineno,
                        bases=bases,
                        methods=methods,
                        decorators=decorators,
                        docstring=docstring,
                        is_abstract=is_abstract
                    ))

        except Exception as e:
            logger.error(f"Error extracting classes: {e}")

        return classes

    def extract_functions(self, ast_tree: ast.AST) -> List[FunctionEntity]:
        """
        Extract FunctionEntity objects from AST.

        Args:
            ast_tree: Parsed AST tree

        Returns:
            List of FunctionEntity objects
        """
        functions = []

        try:
            # Track current class context
            class_stack = []

            for node in ast.walk(ast_tree):
                # Track class context
                if isinstance(node, ast.ClassDef):
                    class_stack.append(node.name)

                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    # Extract arguments
                    args = []
                    if node.args:
                        args.extend([arg.arg for arg in node.args.args])
                        if node.args.vararg:
                            args.append(f"*{node.args.vararg.arg}")
                        if node.args.kwarg:
                            args.append(f"**{node.args.kwarg.arg}")

                    # Extract decorators
                    decorators = self.find_decorators(node)

                    # Check if it's a method (inside a class)
                    is_method = len(class_stack) > 0
                    parent_class = class_stack[-1] if is_method else None

                    # Extract docstring
                    docstring = ast.get_docstring(node)

                    functions.append(FunctionEntity(
                        name=node.name,
                        lineno=node.lineno,
                        args=args,
                        decorators=decorators,
                        is_async=isinstance(node, ast.AsyncFunctionDef),
                        is_method=is_method,
                        parent_class=parent_class,
                        docstring=docstring
                    ))

        except Exception as e:
            logger.error(f"Error extracting functions: {e}")

        return functions

    def extract_imports(self, ast_tree: ast.AST) -> List[ImportEntity]:
        """
        Extract import relationships from AST.

        Args:
            ast_tree: Parsed AST tree

        Returns:
            List of ImportEntity objects
        """
        imports = []

        try:
            for node in ast.walk(ast_tree):
                if isinstance(node, ast.Import):
                    # import module [as alias]
                    for alias in node.names:
                        imports.append(ImportEntity(
                            module=alias.name,
                            names=[alias.name],
                            aliases={alias.name: alias.asname} if alias.asname else {},
                            lineno=node.lineno,
                            is_from=False
                        ))

                elif isinstance(node, ast.ImportFrom):
                    # from module import name [as alias]
                    module = node.module or ''
                    names = [alias.name for alias in node.names]
                    aliases = {
                        alias.name: alias.asname
                        for alias in node.names
                        if alias.asname
                    }

                    imports.append(ImportEntity(
                        module=module,
                        names=names,
                        aliases=aliases,
                        lineno=node.lineno,
                        is_from=True
                    ))

        except Exception as e:
            logger.error(f"Error extracting imports: {e}")

        return imports

    def find_decorators(self, node: ast.AST) -> List[str]:
        """
        Get decorator names from a class or function node.

        Args:
            node: AST node (ClassDef or FunctionDef)

        Returns:
            List of decorator names
        """
        decorators = []

        try:
            if not hasattr(node, 'decorator_list'):
                return decorators

            for decorator in node.decorator_list:
                if isinstance(decorator, ast.Name):
                    decorators.append(decorator.id)
                elif isinstance(decorator, ast.Attribute):
                    decorators.append(self._get_attribute_name(decorator))
                elif isinstance(decorator, ast.Call):
                    # Decorator with arguments: @decorator(args)
                    if isinstance(decorator.func, ast.Name):
                        decorators.append(decorator.func.id)
                    elif isinstance(decorator.func, ast.Attribute):
                        decorators.append(self._get_attribute_name(decorator.func))

        except Exception as e:
            logger.error(f"Error finding decorators: {e}")

        return decorators

    def _get_attribute_name(self, node: ast.Attribute) -> str:
        """
        Get full attribute name from ast.Attribute node.

        Args:
            node: ast.Attribute node

        Returns:
            Full attribute name (e.g., 'module.Class')
        """
        parts = []
        current = node

        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value

        if isinstance(current, ast.Name):
            parts.append(current.id)

        return '.'.join(reversed(parts))

    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze a Python file and return comprehensive metadata.

        Args:
            file_path: Path to the Python file

        Returns:
            Dictionary with classes, functions, imports, and metrics
        """
        result = {
            'file': file_path,
            'classes': [],
            'functions': [],
            'imports': [],
            'metrics': {
                'total_classes': 0,
                'total_functions': 0,
                'total_methods': 0,
                'total_imports': 0,
                'lines_of_code': 0
            },
            'confidence': self.confidence
        }

        try:
            tree = self.parse_file(file_path)
            if not tree:
                result['confidence'] = 0.0
                return result

            # Extract entities
            classes = self.extract_classes(tree)
            functions = self.extract_functions(tree)
            imports = self.extract_imports(tree)

            result['classes'] = [vars(c) for c in classes]
            result['functions'] = [vars(f) for f in functions]
            result['imports'] = [vars(i) for i in imports]

            # Calculate metrics
            result['metrics']['total_classes'] = len(classes)
            result['metrics']['total_functions'] = len([f for f in functions if not f.is_method])
            result['metrics']['total_methods'] = len([f for f in functions if f.is_method])
            result['metrics']['total_imports'] = len(imports)

            # Count lines of code
            with open(file_path, 'r', encoding='utf-8') as f:
                result['metrics']['lines_of_code'] = sum(1 for line in f if line.strip())

        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {e}")
            result['error'] = str(e)
            result['confidence'] = 0.5

        return result
