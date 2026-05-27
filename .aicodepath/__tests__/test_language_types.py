"""Tests for generators.parsers.language_types module."""

import sys
import os
import pytest

# Ensure the .aicodepath package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from generators.parsers.language_types import (
    CLASS_TYPES,
    FUNCTION_TYPES,
    IMPORT_TYPES,
    CALL_TYPES,
    SUPPORTED_LANGUAGES,
    LANGUAGE_EXTENSIONS,
)

EXPECTED_LANGUAGES = sorted([
    "python", "javascript", "typescript", "tsx", "go", "rust",
    "java", "c", "cpp", "ruby", "kotlin", "swift", "php",
])


class TestSupportedLanguages:
    def test_supported_languages_count(self):
        assert len(SUPPORTED_LANGUAGES) == 13

    def test_supported_languages_contents(self):
        assert sorted(SUPPORTED_LANGUAGES) == EXPECTED_LANGUAGES

    def test_c_sharp_not_in_supported(self):
        assert "c_sharp" not in SUPPORTED_LANGUAGES
        assert "csharp" not in SUPPORTED_LANGUAGES


class TestLanguageExtensions:
    REQUIRED_EXTENSIONS = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "tsx",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
        ".c": "c",
        ".cpp": "cpp",
        ".h": "c",
        ".hpp": "cpp",
        ".rb": "ruby",
        ".kt": "kotlin",
        ".swift": "swift",
        ".php": "php",
    }

    def test_all_required_extensions_present(self):
        for ext, lang in self.REQUIRED_EXTENSIONS.items():
            assert ext in LANGUAGE_EXTENSIONS, f"Missing extension {ext}"
            assert LANGUAGE_EXTENSIONS[ext] == lang, (
                f"Extension {ext} maps to {LANGUAGE_EXTENSIONS[ext]}, expected {lang}"
            )

    def test_all_extension_values_are_supported_languages(self):
        for ext, lang in LANGUAGE_EXTENSIONS.items():
            assert lang in SUPPORTED_LANGUAGES, (
                f"Extension {ext} maps to unsupported language {lang}"
            )


class TestClassTypes:
    def test_has_all_13_languages(self):
        assert sorted(CLASS_TYPES.keys()) == EXPECTED_LANGUAGES

    def test_values_are_nonempty_string_lists(self):
        for lang, types in CLASS_TYPES.items():
            assert isinstance(types, list), f"{lang}: expected list"
            assert len(types) > 0, f"{lang}: empty list"
            for t in types:
                assert isinstance(t, str), f"{lang}: {t} is not a string"

    def test_c_sharp_not_present(self):
        assert "c_sharp" not in CLASS_TYPES


class TestFunctionTypes:
    def test_has_all_13_languages(self):
        assert sorted(FUNCTION_TYPES.keys()) == EXPECTED_LANGUAGES

    def test_values_are_nonempty_string_lists(self):
        for lang, types in FUNCTION_TYPES.items():
            assert isinstance(types, list), f"{lang}: expected list"
            assert len(types) > 0, f"{lang}: empty list"
            for t in types:
                assert isinstance(t, str), f"{lang}: {t} is not a string"

    def test_c_sharp_not_present(self):
        assert "c_sharp" not in FUNCTION_TYPES


class TestImportTypes:
    def test_has_all_13_languages(self):
        assert sorted(IMPORT_TYPES.keys()) == EXPECTED_LANGUAGES

    def test_values_are_nonempty_string_lists(self):
        for lang, types in IMPORT_TYPES.items():
            assert isinstance(types, list), f"{lang}: expected list"
            assert len(types) > 0, f"{lang}: empty list"
            for t in types:
                assert isinstance(t, str), f"{lang}: {t} is not a string"

    def test_c_sharp_not_present(self):
        assert "c_sharp" not in IMPORT_TYPES


class TestCallTypes:
    def test_has_all_13_languages(self):
        assert sorted(CALL_TYPES.keys()) == EXPECTED_LANGUAGES

    def test_values_are_nonempty_string_lists(self):
        for lang, types in CALL_TYPES.items():
            assert isinstance(types, list), f"{lang}: expected list"
            assert len(types) > 0, f"{lang}: empty list"
            for t in types:
                assert isinstance(t, str), f"{lang}: {t} is not a string"

    def test_c_sharp_not_present(self):
        assert "c_sharp" not in CALL_TYPES
