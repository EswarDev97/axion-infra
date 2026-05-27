# PRE-FLIGHT PHASE

**Purpose**: Verify environment readiness before starting any workflow

**Focus**: Ensure all required plugins, MCP servers, and capabilities are available

---

## Pre-Flight Check (ALWAYS EXECUTE FIRST)

**MANDATORY**: Execute before any other stage, including Workspace Detection.

1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update pre-flight "Pre-Flight Check" in_progress
   ```
2. **Load Pre-Flight Rules**: Load `common/pre-flight-check.md`
3. **Execute Pre-Flight Checks**:
   - Verify all required plugins are installed (per pre-flight configuration)
   - Verify both MCP servers are available with required capabilities
   - Check environment configuration
3. **Handle Failures**:
   - IF checks fail: List missing required items and reference mandatory plugin management (no install/enable commands)
   - Wait for user to fix issues
   - Re-run checks after fixes
4. **Handle Success**:
   - IF all checks pass: Proceed to Workspace Detection
   - Log pre-flight results in audit.md
5. **DB Integration**: Mark stage complete
   ```bash
   node .aicodepath/lib/kb-writer.js update pre-flight "Pre-Flight Check" completed
   ```

**Pre-Flight Completion Message**:
```markdown
# Pre-Flight Check Complete

**Environment Status**: [READY/NOT READY]

**Plugins**: [X]/10 installed
**MCP Servers**: [X]/2 available

[If NOT READY: List missing items and reference mandatory plugin management]
[If READY: Proceeding to Workspace Detection...]
```
