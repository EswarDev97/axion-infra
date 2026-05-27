# Question Format Guide

## MANDATORY: All Questions Must Use This Format

### Rule: Never Ask Questions in Chat
**CRITICAL**: You must NEVER ask questions directly in the chat. ALL questions must be placed in dedicated question files.

### Question File Format

#### File Naming Convention
- Use descriptive names: `{phase-name}-questions.md`
- Examples:
  - `classification-questions.md`
  - `requirements-questions.md`
  - `story-planning-questions.md`
  - `design-questions.md`
  - `sprint-questions.md`
  - `database-questions.md`
  - `ai-implementation-questions.md`

#### Question Structure
Every question must include meaningful options plus "Other" as the last option:

```markdown
## Question [Number]
[Clear, specific question text]

A) [First meaningful option]
B) [Second meaningful option]
[...additional options as needed...]
X) Other (please describe after [Answer]: tag below)

[Answer]:
```

**CRITICAL**:
- "Other" is MANDATORY as the LAST option for every question
- Only include meaningful options - don't make up options to fill slots
- Use as many or as few options as make sense (minimum 2 + Other)

### Complete Example

```markdown
# Requirements Clarification Questions

Please answer the following questions to help clarify the requirements.

## Question 1
What is the primary user authentication method?

A) Username and password
B) Social media login (Google, Facebook)
C) Single Sign-On (SSO)
D) Multi-factor authentication
E) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2
Will this be a web or mobile application?

A) Web application
B) Mobile application
C) Both web and mobile
D) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 3
What database type is preferred?

A) Relational (PostgreSQL, MySQL)
B) NoSQL Document (MongoDB, DynamoDB)
C) NoSQL Key-Value (Redis)
D) Graph Database (Neo4j)
E) Other (please describe after [Answer]: tag below)

[Answer]:
```

### User Response Format
Users will answer by filling in the letter choice after [Answer]: tag:

```markdown
## Question 1
What is the primary user authentication method?

A) Username and password
B) Social media login (Google, Facebook)
C) Single Sign-On (SSO)
D) Multi-factor authentication

[Answer]: C
```

### Reading User Responses
After user confirms completion:
1. Read the question file
2. Extract answers after [Answer]: tags
3. Validate all questions are answered
4. Proceed with analysis based on responses

### Multiple Choice Guidelines

#### Option Count
- Minimum: 2 meaningful options + "Other" (A, B, C)
- Typical: 3-4 meaningful options + "Other" (A, B, C, D, E)
- Maximum: 5 meaningful options + "Other" (A, B, C, D, E, F)
- **CRITICAL**: Don't make up options just to fill slots - only include meaningful choices

#### Option Quality
- Make options mutually exclusive
- Cover the most common scenarios
- Only include meaningful, realistic options
- **ALWAYS include "Other" as the LAST option** (MANDATORY)
- Be specific and clear
- **Don't make up options to fill A, B, C, D slots**

#### Good Example:
```markdown
## Question 5
What AI model will be used for the chatbot?

A) Claude (Anthropic) - Best for reasoning and safety
B) GPT-4 (OpenAI) - Strong general purpose
C) Gemini (Google) - Good for multimodal
D) Open source (Llama, Mistral) - Self-hosted
E) Other (please describe after [Answer]: tag below)

[Answer]:
```

#### Bad Example (Avoid):
```markdown
## Question 5
What AI will you use?

A) Yes
B) No
C) Maybe

[Answer]:
```

### Workflow Integration

#### Step 1: Create Question File
```markdown
Create aicodepath-docs/{phase-name}-questions.md with all questions
```

#### Step 2: Inform User
```
"I've created {phase-name}-questions.md with [X] questions.
Please answer each question by filling in the letter choice after the [Answer]: tag.
If none of the options match your needs, choose the last option (Other) and describe your preference. Let me know when you're done."
```

#### Step 3: Wait for Confirmation
Wait for user to say "done", "completed", "finished", or similar.

#### Step 4: Read and Analyze
```
Read aicodepath-docs/{phase-name}-questions.md
Extract all answers
Validate completeness
Proceed with analysis
```

### Error Handling

#### Missing Answers
If any [Answer]: tag is empty:
```
"I noticed Question [X] is not answered. Please provide an answer using one of the letter choices
for all questions before proceeding."
```

#### Invalid Answers
If answer is not a valid letter choice:
```
"Question [X] has an invalid answer '[answer]'.
Please use only the letter choices provided in the question."
```

#### Ambiguous Answers
If user provides explanation instead of letter:
```
"For Question [X], please provide the letter choice that best matches your answer.
If none match, choose 'Other' and add your description after the [Answer]: tag."
```

### Contradiction and Ambiguity Detection

**MANDATORY**: After reading user responses, you MUST check for contradictions and ambiguities.

#### Detecting Contradictions
Look for logically inconsistent answers:
- Scope mismatch: "Bug fix" but "Entire codebase affected"
- Risk mismatch: "Low risk" but "Breaking changes"
- Timeline mismatch: "Quick fix" but "Multiple subsystems"
- Impact mismatch: "Single component" but "Significant architecture changes"

#### Detecting Ambiguities
Look for unclear or borderline responses:
- Answers that could fit multiple classifications
- Responses that lack specificity
- Conflicting indicators across multiple questions

#### Creating Clarification Questions
If contradictions or ambiguities detected:

1. **Create clarification file**: `{phase-name}-clarification-questions.md`
2. **Explain the issue**: Clearly state what contradiction/ambiguity was detected
3. **Ask targeted questions**: Use multiple choice format to resolve the issue
4. **Reference original questions**: Show which questions had conflicting answers

**Example**:
```markdown
# [Phase Name] Clarification Questions

I detected contradictions in your responses that need clarification:

## Contradiction 1: [Brief Description]
You indicated "[Answer A]" (Q[X]:[Letter]) but also "[Answer B]" (Q[Y]:[Letter]).
These responses are contradictory because [explanation].

### Clarification Question 1
[Specific question to resolve contradiction]

A) [Option that resolves toward first answer]
B) [Option that resolves toward second answer]
C) [Option that provides middle ground]
D) [Option that reframes the question]

[Answer]:
```

### Best Practices

1. **Be Specific**: Questions should be clear and unambiguous
2. **Be Comprehensive**: Cover all necessary information
3. **Be Concise**: Keep questions focused on one topic
4. **Be Practical**: Options should be realistic and actionable
5. **Be Consistent**: Use same format throughout all question files

## Summary

**Remember**:
- Always create question files
- Always use multiple choice format
- **Always include "Other" as the LAST option (MANDATORY)**
- Only include meaningful options - don't make up options to fill slots
- Always use [Answer]: tags
- Always wait for user completion
- Always validate responses for contradictions
- Always create clarification files if needed
- Always resolve contradictions before proceeding
- Never ask questions in chat
- Never make up options just to have A, B, C, D
- Never proceed without answers
- Never proceed with unresolved contradictions
