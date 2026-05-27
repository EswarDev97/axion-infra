# Code Validation Prompt Template

You are validating code before it is written to a file.

## File Information

**File Path**: $FILE_PATH
**Tool**: $TOOL_NAME

## Code Content

```
$FILE_CONTENT
```

## Your Task

Validate the code for:

1. **Security Issues**: SQL injection, XSS, command injection, hardcoded secrets
2. **Code Quality**: Following best practices, proper error handling
3. **Mock Implementations**: Detect stub/placeholder/mock code
4. **Logic Errors**: Obvious bugs or incorrect logic
5. **Standards Compliance**: Follows project guidelines

## Decision Criteria

- **allow**: Code passes validation
- **deny**: Code has critical issues that must be fixed
- **ask**: Code has warnings that need user review

## Response Format

Decision: [allow|deny|ask]
Reason: [List the issues found or confirmation that code is good]
Issues: [Specific problems if any]
