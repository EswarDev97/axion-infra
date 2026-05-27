#!/usr/bin/env bash
#
# Integrate all validators with validation-recorder.js
# Adds DB persistence to all validation hooks
#

set -e

HOOKS_DIR=".aicodepath/hooks"

echo "Integrating validators with validation-recorder..."
echo "=================================================="
echo ""

# List of validators and their validation types
declare -A VALIDATORS
VALIDATORS[api-validator.js]="api"
VALIDATORS[architecture-validator.js]="architecture"
VALIDATORS[data-validator.js]="data"
VALIDATORS[devops-validator.js]="devops"
VALIDATORS[duplication-checker.js]="duplication"
VALIDATORS[iac-validator.js]="iac"
VALIDATORS[pre-commit-validator.js]="pre-commit"

for validator in "${!VALIDATORS[@]}"; do
  validation_type="${VALIDATORS[$validator]}"
  filepath="$HOOKS_DIR/$validator"

  echo "Processing: $validator (type: $validation_type)"

  if [[ ! -f "$filepath" ]]; then
    echo "  ⚠️  File not found, skipping"
    continue
  fi

  # Check if already integrated
  if grep -q "ValidationRecorder" "$filepath"; then
    echo "  ✅ Already integrated"
    continue
  fi

  # Backup original
  cp "$filepath" "$filepath.backup"

  # Add require at top (after existing requires)
  sed -i "/^const.*require.*path-resolver/a\\const ValidationRecorder = require('../lib/validation-recorder');" "$filepath"

  echo "  ✅ Added ValidationRecorder require"
  echo "  ⚠️  Manual integration of recording logic still needed"
  echo ""
done

echo "=================================================="
echo "Integration complete!"
echo ""
echo "Next steps:"
echo "1. Each validator needs custom recording logic based on its return format"
echo "2. Test each validator to ensure DB writes work"
echo "3. Remove .backup files after verification"
