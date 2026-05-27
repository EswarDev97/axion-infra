#!/usr/bin/env python3
"""
Mock AST parser fixture for graph-bridge tests.
Simulates ast_parser.py responses for different CLI args.
"""
import sys
import json

args = sys.argv[1:]

if '--index' in args:
    print(json.dumps({"indexed": 1, "skipped": 0, "entities": 5, "relations": 3, "resolved": 2}))
    sys.exit(0)
elif '--reindex' in args:
    print(json.dumps({"indexed": 1, "skipped": 0, "entities": 2, "relations": 1, "resolved": 1}))
    sys.exit(0)
elif '--diff-reindex' in args:
    print(json.dumps({"indexed": 0, "skipped": 0, "entities": 0, "relations": 0, "resolved": 0}))
    sys.exit(0)
else:
    sys.exit(1)
