"""Calculate confidence scores for diagram generation."""
from typing import List, Dict, Any
from enum import Enum


class ParserType(str, Enum):
    """Types of parsers used for code analysis."""
    AST = "AST"  # Abstract Syntax Tree parser (highest confidence)
    TREE_SITTER = "tree-sitter"  # Tree-sitter parser (high confidence)
    REGEX = "regex"  # Regular expression parser (medium confidence)
    HEURISTIC = "heuristic"  # Heuristic-based parser (low confidence)
    NONE = "none"  # No parser used (lowest confidence)


class ConfidenceScorer:
    """Calculate confidence scores for diagram generation.

    Confidence is based on:
    - Parser type used (AST > tree-sitter > regex > heuristic)
    - Code coverage percentage
    - Relationship detection accuracy
    """

    # Parser quality weights (0.0 to 1.0)
    PARSER_WEIGHTS = {
        ParserType.AST: 1.0,
        ParserType.TREE_SITTER: 0.9,
        ParserType.REGEX: 0.6,
        ParserType.HEURISTIC: 0.4,
        ParserType.NONE: 0.1,
    }

    # Component weights for overall score
    PARSER_COMPONENT_WEIGHT = 0.5
    COVERAGE_COMPONENT_WEIGHT = 0.3
    ACCURACY_COMPONENT_WEIGHT = 0.2

    def __init__(self):
        """Initialize the confidence scorer."""
        pass

    def calculate(
        self,
        parser_types: List[str],
        code_coverage: float = 1.0,
        relationship_accuracy: float = 1.0
    ) -> float:
        """Calculate overall confidence score.

        Args:
            parser_types: List of parser type strings used
            code_coverage: Percentage of code analyzed (0.0 to 1.0)
            relationship_accuracy: Accuracy of relationship detection (0.0 to 1.0)

        Returns:
            float: Confidence score between 0.0 and 1.0

        Raises:
            ValueError: If any metric is outside valid range
        """
        # Validate inputs
        if not 0.0 <= code_coverage <= 1.0:
            raise ValueError(f"code_coverage must be between 0.0 and 1.0, got {code_coverage}")

        if not 0.0 <= relationship_accuracy <= 1.0:
            raise ValueError(
                f"relationship_accuracy must be between 0.0 and 1.0, got {relationship_accuracy}"
            )

        if not parser_types:
            parser_types = [ParserType.NONE.value]

        # Calculate parser score
        parser_score = self._calculate_parser_score(parser_types)

        # Calculate weighted overall score
        overall_score = (
            parser_score * self.PARSER_COMPONENT_WEIGHT +
            code_coverage * self.COVERAGE_COMPONENT_WEIGHT +
            relationship_accuracy * self.ACCURACY_COMPONENT_WEIGHT
        )

        # Ensure score is between 0.0 and 1.0
        return max(0.0, min(1.0, overall_score))

    def _calculate_parser_score(self, parser_types: List[str]) -> float:
        """Calculate score based on parser types used.

        Uses the highest quality parser if multiple types are used.

        Args:
            parser_types: List of parser type strings

        Returns:
            float: Parser quality score between 0.0 and 1.0
        """
        if not parser_types:
            return self.PARSER_WEIGHTS[ParserType.NONE]

        max_weight = 0.0

        for parser_type_str in parser_types:
            # Try to match parser type
            parser_type = self._parse_parser_type(parser_type_str)
            weight = self.PARSER_WEIGHTS.get(parser_type, self.PARSER_WEIGHTS[ParserType.NONE])
            max_weight = max(max_weight, weight)

        return max_weight

    def _parse_parser_type(self, parser_type_str: str) -> ParserType:
        """Parse parser type string to enum.

        Args:
            parser_type_str: Parser type string (case-insensitive)

        Returns:
            ParserType: Matched parser type or NONE if unknown
        """
        parser_type_str = parser_type_str.upper().replace("-", "_")

        try:
            return ParserType[parser_type_str]
        except KeyError:
            # Try partial matches
            if "AST" in parser_type_str:
                return ParserType.AST
            elif "TREE" in parser_type_str or "SITTER" in parser_type_str:
                return ParserType.TREE_SITTER
            elif "REGEX" in parser_type_str or "REGEXP" in parser_type_str:
                return ParserType.REGEX
            elif "HEURISTIC" in parser_type_str:
                return ParserType.HEURISTIC
            else:
                return ParserType.NONE

    def calculate_detailed(
        self,
        parser_types: List[str],
        code_coverage: float = 1.0,
        relationship_accuracy: float = 1.0
    ) -> Dict[str, Any]:
        """Calculate confidence score with detailed breakdown.

        Args:
            parser_types: List of parser type strings used
            code_coverage: Percentage of code analyzed (0.0 to 1.0)
            relationship_accuracy: Accuracy of relationship detection (0.0 to 1.0)

        Returns:
            Dict containing:
                - overall_score: Overall confidence score
                - parser_score: Parser quality score
                - coverage_score: Code coverage score
                - accuracy_score: Relationship accuracy score
                - breakdown: Component contributions to overall score
        """
        parser_score = self._calculate_parser_score(parser_types)

        overall_score = (
            parser_score * self.PARSER_COMPONENT_WEIGHT +
            code_coverage * self.COVERAGE_COMPONENT_WEIGHT +
            relationship_accuracy * self.ACCURACY_COMPONENT_WEIGHT
        )

        overall_score = max(0.0, min(1.0, overall_score))

        return {
            "overall_score": overall_score,
            "parser_score": parser_score,
            "coverage_score": code_coverage,
            "accuracy_score": relationship_accuracy,
            "breakdown": {
                "parser_contribution": parser_score * self.PARSER_COMPONENT_WEIGHT,
                "coverage_contribution": code_coverage * self.COVERAGE_COMPONENT_WEIGHT,
                "accuracy_contribution": relationship_accuracy * self.ACCURACY_COMPONENT_WEIGHT,
            },
            "weights": {
                "parser_weight": self.PARSER_COMPONENT_WEIGHT,
                "coverage_weight": self.COVERAGE_COMPONENT_WEIGHT,
                "accuracy_weight": self.ACCURACY_COMPONENT_WEIGHT,
            }
        }

    def get_confidence_label(self, score: float) -> str:
        """Get human-readable confidence label.

        Args:
            score: Confidence score between 0.0 and 1.0

        Returns:
            str: Confidence label (Very High, High, Medium, Low, Very Low)
        """
        if score >= 0.9:
            return "Very High"
        elif score >= 0.75:
            return "High"
        elif score >= 0.5:
            return "Medium"
        elif score >= 0.25:
            return "Low"
        else:
            return "Very Low"

    def get_recommendations(
        self,
        parser_types: List[str],
        code_coverage: float,
        relationship_accuracy: float
    ) -> List[str]:
        """Get recommendations for improving confidence score.

        Args:
            parser_types: List of parser type strings used
            code_coverage: Percentage of code analyzed (0.0 to 1.0)
            relationship_accuracy: Accuracy of relationship detection (0.0 to 1.0)

        Returns:
            List[str]: List of recommendations
        """
        recommendations = []

        parser_score = self._calculate_parser_score(parser_types)

        # Parser recommendations
        if parser_score < 0.7:
            recommendations.append(
                "Consider using AST-based parsers for more accurate code analysis"
            )

        # Coverage recommendations
        if code_coverage < 0.8:
            recommendations.append(
                f"Increase code coverage (currently {code_coverage:.1%}). "
                "Analyze more files or ensure all relevant code is included."
            )

        # Accuracy recommendations
        if relationship_accuracy < 0.7:
            recommendations.append(
                "Improve relationship detection accuracy. "
                "Consider using more sophisticated analysis techniques."
            )

        if not recommendations:
            recommendations.append("Confidence score is good. No major improvements needed.")

        return recommendations
