# Workspace Detection

**Purpose**: Determine workspace state and check for existing AICodePath projects

## Step 1: Check for Existing AICodePath Project

Check if `aicodepath-docs/aicodepath-state.md` exists:
- **If exists**: Resume from last phase (load context from previous phases)
- **If not exists**: Continue with new project assessment

## Step 2: Scan Workspace for Existing Code

**Determine if workspace has existing code:**
- Scan workspace for source code files (.java, .py, .js, .ts, etc.)
- Check for build files (pom.xml, package.json, build.gradle, etc.)
- Look for project structure indicators

**Record findings:**
```markdown
## Workspace State
- **Existing Code**: [Yes/No]
- **Programming Languages**: [List if found]
- **Build System**: [Maven/Gradle/npm/etc. if found]
- **Project Structure**: [Monolith/Microservices/Library/Empty]
- **Database Detected**: [Yes/No - Type if found]
- **AI Components Detected**: [Yes/No - Type if found]
```

## Step 3: Determine Next Phase

**IF workspace is empty (no existing code)**:
- Set flag: `brownfield = false`
- Next phase: Requirements Analysis

**IF workspace has existing code**:
- Set flag: `brownfield = true`
- Check for existing reverse engineering artifacts in `aicodepath-docs/inception/reverse-engineering/`
- **IF reverse engineering artifacts exist**: Load them, skip to Requirements Analysis
- **IF no reverse engineering artifacts**: Next phase is Reverse Engineering

## Step 4: Create Initial State File

Create `aicodepath-docs/aicodepath-state.md`:

```markdown
# AICodePath State Tracking

## Project Information
- **Project Type**: [Greenfield/Brownfield]
- **Start Date**: [ISO timestamp]
- **Current Stage**: INCEPTION - Workspace Detection

## Workspace State
- **Existing Code**: [Yes/No]
- **Reverse Engineering Needed**: [Yes/No]
- **Database Components**: [Yes/No]
- **AI Components**: [Yes/No]

## Stage Progress
[Will be populated as workflow progresses]
```

## Step 5: Present Completion Message

**For Brownfield Projects:**
```markdown
# Workspace Detection Complete

Workspace analysis findings:
- **Project Type**: Brownfield project
- [AI-generated summary of workspace findings in bullet points]
- **Database Detected**: [Yes/No - details]
- **AI Components Detected**: [Yes/No - details]
- **Next Step**: Proceeding to **Reverse Engineering** to analyze existing codebase...
```

**For Greenfield Projects:**
```markdown
# Workspace Detection Complete

Workspace analysis findings:
- **Project Type**: Greenfield project
- **Next Step**: Proceeding to **Requirements Analysis**...
```

## Step 6: Automatically Proceed

- **No user approval required** - this is informational only
- Automatically proceed to next phase:
  - **Brownfield**: Reverse Engineering (if no existing artifacts) or Requirements Analysis (if artifacts exist)
  - **Greenfield**: Requirements Analysis
