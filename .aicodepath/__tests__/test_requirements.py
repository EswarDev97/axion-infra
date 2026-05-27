"""Tests for .aicodepath/generators/requirements.txt completeness and correctness."""

import re
from pathlib import Path

import pytest

REQUIREMENTS_PATH = Path(__file__).resolve().parent.parent / "generators" / "requirements.txt"

# Valid pip requirement: package_name>=version (with optional extras/markers)
PIP_REQ_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+(\[[a-zA-Z0-9_,-]+\])?(>=|<=|==|~=|!=|>|<)[0-9]+(\.[0-9]+)*$")

EXPECTED_PACKAGES = [
    "pydantic",
    "pydantic-settings",
    "tree-sitter-language-pack",
    "networkx",
    "fastmcp",
]


def _parse_requirements() -> dict[str, str]:
    """Parse requirements.txt into {package_name: full_line} dict."""
    result = {}
    text = REQUIREMENTS_PATH.read_text()
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        # Extract package name (everything before the version specifier)
        match = re.match(r"^([a-zA-Z0-9_-]+)", stripped)
        if match:
            result[match.group(1).lower()] = stripped
    return result


class TestRequirementsTxt:
    """Validate that requirements.txt contains all needed dependencies."""

    def test_file_exists(self):
        assert REQUIREMENTS_PATH.exists(), f"requirements.txt not found at {REQUIREMENTS_PATH}"

    @pytest.mark.parametrize("package", EXPECTED_PACKAGES)
    def test_package_present(self, package):
        reqs = _parse_requirements()
        assert package.lower() in reqs, (
            f"Package '{package}' not found in requirements.txt. "
            f"Found: {list(reqs.keys())}"
        )

    def test_fastmcp_version_gte_3(self):
        reqs = _parse_requirements()
        assert "fastmcp" in reqs, "fastmcp not in requirements.txt"
        line = reqs["fastmcp"]
        # Must specify >=3.x.x, not 2.x
        match = re.search(r">=(\d+)", line)
        assert match, f"fastmcp line has no >= version spec: {line}"
        major = int(match.group(1))
        assert major >= 3, f"fastmcp major version must be >=3, got >={major} in: {line}"

    @pytest.mark.parametrize("package", EXPECTED_PACKAGES)
    def test_valid_pip_format(self, package):
        reqs = _parse_requirements()
        if package.lower() not in reqs:
            pytest.skip(f"{package} not yet in requirements.txt")
        line = reqs[package.lower()]
        assert PIP_REQ_PATTERN.match(line), (
            f"'{line}' is not valid pip requirement format (expected package>=version)"
        )
