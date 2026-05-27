"""
Typer CLI interface for AICodePath Visual Memory Generators.
Provides commands for generating various diagram types with JSON output.
"""
import json
import sys
from pathlib import Path
from typing import Optional, List
from enum import Enum

import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

app = typer.Typer(
    name="aicodepath-generators",
    help="AST/tree-sitter-powered diagram generators for high-confidence code visualization",
    add_completion=False,
)

console = Console()


class DiagramType(str, Enum):
    """Supported diagram types."""
    ER = "er"
    CLASS = "class"
    FLOWCHART = "flowchart"
    SEQUENCE = "sequence"
    JOURNEY = "journey"
    C4 = "c4"
    LAYERED = "layered"


class ScopeType(str, Enum):
    """Analysis scope types."""
    FILE = "file"
    MODULE = "module"
    UNIT = "unit"
    FEATURE = "feature"
    PACKAGE = "package"


def output_result(success: bool, data: dict = None, error: str = None):
    """Output standardized JSON result for Node.js bridge integration."""
    result = {
        "success": success,
        "timestamp": None,  # Could add datetime.now().isoformat()
    }

    if success and data:
        result["data"] = data
    elif not success and error:
        result["error"] = error

    print(json.dumps(result, indent=2))


@app.command()
def generate(
    diagram_type: DiagramType = typer.Option(
        ..., "--type", "-t", help="Type of diagram to generate"
    ),
    scope: ScopeType = typer.Option(
        ScopeType.FILE, "--scope", "-s", help="Analysis scope"
    ),
    unit: Optional[str] = typer.Option(
        None, "--unit", "-u", help="Unit name (sprint/feature/module identifier)"
    ),
    files: List[str] = typer.Option(
        [], "--files", "-f", help="Files to analyze (can specify multiple)"
    ),
    output: Optional[Path] = typer.Option(
        None, "--output", "-o", help="Output file path (default: stdout)"
    ),
    format: str = typer.Option(
        "mermaid", "--format", help="Output format (mermaid, plantuml, json)"
    ),
):
    """
    Generate diagrams from code using AST/tree-sitter analysis.

    Example usage:
        python -m generators generate --type er --files models.py --output diagram.mmd
        python -m generators generate --type class --scope module --unit auth
    """
    try:
        # Validate inputs
        if not files and scope == ScopeType.FILE:
            output_result(False, error="--files required when scope is 'file'")
            raise typer.Exit(1)

        # Placeholder for actual generation logic
        result_data = {
            "diagram_type": diagram_type.value,
            "scope": scope.value,
            "unit": unit,
            "files": files,
            "format": format,
            "diagram": f"# Placeholder {diagram_type.value} diagram\n# TODO: Implement generator",
        }

        # Write to file or stdout
        if output:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(result_data["diagram"])
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def er(
    files: List[str] = typer.Argument(..., help="SQL/migration files to analyze"),
    output: Optional[Path] = typer.Option(None, "--output", "-o"),
    include_indexes: bool = typer.Option(True, "--indexes/--no-indexes"),
    include_constraints: bool = typer.Option(True, "--constraints/--no-constraints"),
):
    """Generate Entity-Relationship diagram from SQL/migrations."""
    try:
        from .diagrams.er_diagram import ERDiagramGenerator

        generator = ERDiagramGenerator()
        result = generator.generate(
            source_files=files,
            options={
                "show_indexes": include_indexes,
                "show_foreign_keys": include_constraints,
            }
        )

        result_data = {
            "diagram_type": "er",
            "files": files,
            "options": {
                "include_indexes": include_indexes,
                "include_constraints": include_constraints,
            },
            "diagram": result.mermaid_code,
            "confidence": result.confidence_score,
            "metadata": result.metadata,
            "warnings": result.warnings,
        }

        if output:
            output.write_text(result.mermaid_code)
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def class_diagram(
    files: List[str] = typer.Argument(..., help="Source files to analyze"),
    output: Optional[Path] = typer.Option(None, "--output", "-o"),
    include_private: bool = typer.Option(False, "--private/--no-private"),
    max_depth: int = typer.Option(2, "--depth", help="Inheritance depth to show"),
):
    """Generate UML class diagram from source code."""
    try:
        from .diagrams.class_diagram import ClassDiagramGenerator

        generator = ClassDiagramGenerator()
        result = generator.generate(
            source_files=list(files),
            options={
                "show_private": include_private,
                "max_depth": max_depth,
                "react_components": True,
            }
        )

        result_data = {
            "diagram_type": "class",
            "files": list(files),
            "options": {
                "include_private": include_private,
                "max_depth": max_depth,
            },
            "diagram": result.mermaid_code,
            "confidence": result.confidence_score,
            "metadata": result.metadata,
            "warnings": result.warnings,
        }

        if output:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(result.mermaid_code)
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def flowchart(
    files: List[str] = typer.Argument(..., help="Source files to analyze"),
    function: Optional[str] = typer.Option(None, "--function", "-fn"),
    output: Optional[Path] = typer.Option(None, "--output", "-o"),
    orientation: str = typer.Option("TD", "--orientation", help="TD, LR, BT, RL"),
):
    """Generate flowchart from function/method logic."""
    try:
        result_data = {
            "diagram_type": "flowchart",
            "files": files,
            "function": function,
            "options": {
                "orientation": orientation,
            },
            "diagram": f"flowchart {orientation}\n    %% TODO: Implement flowchart parser",
        }

        if output:
            output.write_text(result_data["diagram"])
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def sequence(
    files: List[str] = typer.Argument(..., help="Source files to analyze"),
    entry_point: str = typer.Option(..., "--entry", "-e", help="Entry function/endpoint"),
    output: Optional[Path] = typer.Option(None, "--output", "-o"),
    max_depth: int = typer.Option(5, "--depth", help="Call depth to trace"),
):
    """Generate sequence diagram from function call traces."""
    try:
        result_data = {
            "diagram_type": "sequence",
            "files": files,
            "entry_point": entry_point,
            "options": {
                "max_depth": max_depth,
            },
            "diagram": "sequenceDiagram\n    %% TODO: Implement sequence parser",
        }

        if output:
            output.write_text(result_data["diagram"])
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def journey(
    files: List[str] = typer.Argument(..., help="Source files to analyze"),
    flow: str = typer.Option(..., "--flow", "-f", help="User journey/flow name"),
    output: Optional[Path] = typer.Option(None, "--output", "-o"),
):
    """Generate user journey diagram."""
    try:
        result_data = {
            "diagram_type": "journey",
            "files": files,
            "flow": flow,
            "diagram": "journey\n    %% TODO: Implement journey parser",
        }

        if output:
            output.write_text(result_data["diagram"])
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def c4(
    scope: str = typer.Argument(..., help="system, container, component, or code"),
    unit: str = typer.Option(..., "--unit", "-u", help="Unit to diagram"),
    output: Optional[Path] = typer.Option(None, "--output", "-o"),
):
    """Generate C4 architecture diagram."""
    try:
        result_data = {
            "diagram_type": "c4",
            "scope": scope,
            "unit": unit,
            "diagram": f"C4{scope.capitalize()}\n    %% TODO: Implement C4 parser",
        }

        if output:
            output.write_text(result_data["diagram"])
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def layered(
    files: List[str] = typer.Argument(..., help="Source files to analyze"),
    output: Optional[Path] = typer.Option(None, "--output", "-o"),
    show_dependencies: bool = typer.Option(True, "--deps/--no-deps"),
):
    """Generate layered architecture diagram."""
    try:
        result_data = {
            "diagram_type": "layered",
            "files": files,
            "options": {
                "show_dependencies": show_dependencies,
            },
            "diagram": "graph TB\n    %% TODO: Implement layered architecture parser",
        }

        if output:
            output.write_text(result_data["diagram"])
            result_data["output_path"] = str(output)

        output_result(True, data=result_data)

    except Exception as e:
        output_result(False, error=str(e))
        raise typer.Exit(1)


@app.command()
def version():
    """Show version information."""
    from . import __version__

    output_result(True, data={
        "version": __version__,
        "python_version": sys.version.split()[0],
    })


if __name__ == "__main__":
    app()
