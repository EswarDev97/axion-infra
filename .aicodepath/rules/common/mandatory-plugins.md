# Mandatory Plugin Management

**Purpose**: Keep the required plugin list accurate and enforceable in the pre-flight check.

## Source of Truth

- Required plugins: `hooks/pre-flight-check.js` `REQUIRED_PLUGINS`
- Optional plugins: `hooks/pre-flight-check.js` `OPTIONAL_PLUGINS`

## Add or Promote a Mandatory Plugin

1. Add the plugin (id + purpose) to `hooks/pre-flight-check.js` `REQUIRED_PLUGINS`.
2. If it was optional, remove it from `OPTIONAL_PLUGINS`.
3. Update plugin tables in `README.md` and `rules/common/pre-flight-check.md`.
4. Ensure `rules/core-workflow.md` does not hardcode outdated plugin counts.

## When Pre-Flight Blocks on Missing Plugins

- Capture the missing plugin IDs from the pre-flight output.
- Resolve availability via your standard plugin provisioning process.
- Re-run pre-flight to confirm the environment is ready.
