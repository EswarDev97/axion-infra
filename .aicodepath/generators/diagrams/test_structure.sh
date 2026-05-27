#!/bin/bash

echo "=== Diagram Generators Structure Test ==="
echo ""

# Check all required files exist
files=(
    "__init__.py"
    "er_diagram.py"
    "class_diagram.py"
    "flowchart.py"
    "sequence_diagram.py"
    "user_journey.py"
    "c4_diagram.py"
    "layered_architecture.py"
    "README.md"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
        all_exist=false
    fi
done

echo ""

# Check syntax of Python files
echo "=== Python Syntax Check ==="
for file in *.py; do
    if python3 -m py_compile "$file" 2>/dev/null; then
        echo "✓ $file syntax OK"
    else
        echo "✗ $file syntax error"
        all_exist=false
    fi
done

echo ""

if [ "$all_exist" = true ]; then
    echo "✓ All structure tests passed!"
    exit 0
else
    echo "✗ Some tests failed"
    exit 1
fi
