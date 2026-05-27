#!/usr/bin/env python3
"""
Fixture: simulates failed tree-sitter/networkx/fastmcp import check.
"""
import sys
print("No module named 'tree_sitter_language_pack'", file=sys.stderr)
sys.exit(1)
