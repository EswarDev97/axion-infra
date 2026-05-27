# User Stories - Detailed Steps

## Purpose
**Convert requirements into user-centered stories with acceptance criteria**

User Stories focus on:
- Translating business requirements into user-centered narratives
- Defining clear acceptance criteria for each story
- Creating user personas that represent different stakeholder types
- Establishing shared understanding across teams
- Providing testable specifications for implementation
- Enabling story point estimation for sprint planning

## Prerequisites
- Workspace Detection must be complete
- Requirements Analysis recommended (can reference requirements if available)
- Workflow Planning must indicate User Stories stage should execute

## Intelligent Assessment Guidelines

**WHEN TO EXECUTE USER STORIES**: Use this enhanced assessment before proceeding:

### High Priority Execution (ALWAYS Execute)
- **New User Features**: Any new functionality users will directly interact with
- **User Experience Changes**: Modifications to existing user workflows or interfaces
- **Multi-Persona Systems**: Applications serving different types of users
- **Customer-Facing APIs**: Services that external users or systems will consume
- **Complex Business Logic**: Requirements with multiple scenarios or business rules
- **Sprint Planning Needed**: When story points and velocity tracking are required

### Skip Only For Simple Cases
- **Pure Refactoring**: Internal code improvements with zero user impact
- **Isolated Bug Fixes**: Simple, well-defined fixes with clear scope
- **Infrastructure Only**: Changes with no user-facing effects
- **Developer Tooling**: Build processes, CI/CD, or development environment changes

---

# PART 1: PLANNING

## Step 1: Validate User Stories Need (MANDATORY)

**CRITICAL**: Before proceeding with user stories, perform this assessment.

### Assessment Process
1. **Analyze Request Context**:
   - Review the original user request and requirements
   - Identify user-facing vs internal-only changes
   - Assess complexity and scope of the work

2. **Document Assessment Decision**:
   - Create `aicodepath-docs/inception/plans/user-stories-assessment.md`
   - Include reasoning for why user stories are valuable

## Step 2: Create Story Plan
- Assume the role of a product owner
- Generate a comprehensive plan with step-by-step execution checklist
- Each step and sub-step should have a checkbox []
- Focus on methodology and approach for converting requirements into user stories

## Step 3: Generate Context-Appropriate Questions

**See `common/question-format-guide.md` for question formatting rules**

- EMBED questions using [Answer]: tag format
- Focus on ANY ambiguities, missing information, or areas needing clarification
- **When in doubt, ask the question** - overconfidence leads to poor stories

**Question categories to evaluate**:
- **User Personas** - Ask about user types, roles, characteristics, and motivations
- **Story Granularity** - Ask about appropriate level of detail, story size
- **Story Format** - Ask about format preferences, template usage
- **Acceptance Criteria** - Ask about detail level, format, testing approach
- **Sprint Considerations** - Ask about story point estimation, sprint fit
- **Business Context** - Ask about business goals, success metrics

## Step 4: Include Mandatory Story Artifacts in Plan
- **ALWAYS** include these mandatory artifacts in the story plan:
  - [ ] Generate stories.md with user stories following INVEST criteria
  - [ ] Generate personas.md with user archetypes and characteristics
  - [ ] Ensure stories are Independent, Negotiable, Valuable, Estimable, Small, Testable
  - [ ] Include acceptance criteria for each story
  - [ ] Include story point estimates (if sprint planning will be used)
  - [ ] Map personas to relevant user stories

## Step 5: Store Story Plan
- Save the complete story plan with embedded questions in `aicodepath-docs/inception/plans/` directory
- Filename: `story-generation-plan.md`

## Step 6: Request User Input
- Ask user to fill in all [Answer]: tags directly in the story plan document
- Wait for user answers

## Step 7: ANALYZE ANSWERS (MANDATORY)
Before proceeding, you MUST carefully review all user answers for:
- **Vague or ambiguous responses**: "mix of", "somewhere between", "not sure"
- **Contradictory answers**: Responses that conflict with each other
- **Missing generation details**: Answers that lack specific guidance

## Step 8: MANDATORY Follow-up Questions
If the analysis reveals ANY ambiguous answers, you MUST:
- Create a separate clarification questions file
- DO NOT proceed to approval until ALL ambiguities are completely resolved

## Step 9: Wait for Explicit Approval of Plan
- Do not proceed until the user explicitly approves the story approach
- If user requests changes, update the plan and repeat the approval process

---

# PART 2: GENERATION

## Step 10: Load Story Generation Plan
- [ ] Read the complete story plan from `aicodepath-docs/inception/plans/story-generation-plan.md`
- [ ] Identify the next uncompleted step

## Step 11: Execute Current Step
- [ ] Perform exactly what the current step describes
- [ ] Generate story artifacts as specified in the plan
- [ ] Include story point estimates if sprint planning is enabled

## Step 12: Update Progress
- [ ] Mark the completed step as [x] in the story generation plan
- [ ] Update `aicodepath-docs/aicodepath-state.md` current status

## Step 13: Continue or Complete Generation
- [ ] If more steps remain, return to Step 10
- [ ] If all steps complete, verify stories are ready for next stage

## Step 14: Present Completion Message

```markdown
# User Stories Complete

User stories generation has created:
- [List key personas generated]
- [List user stories created with counts]
- [Story structure and compliance notes]
- [Story point totals if applicable]

> **REVIEW REQUIRED:**
> Please examine the user stories at: `aicodepath-docs/inception/user-stories/stories.md` and `aicodepath-docs/inception/user-stories/personas.md`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to the stories or personas
> **Approve & Continue** - Approve user stories and proceed to **[Sprint Planning/Workflow Planning]**
```

## Step 15: Wait for Explicit Approval
- Do not proceed until the user explicitly approves the generated stories

---

# CRITICAL RULES

## Planning Phase Rules
- **CONTEXT-APPROPRIATE QUESTIONS**: Only ask questions relevant to this specific context
- **MANDATORY ANSWER ANALYSIS**: Always analyze answers for ambiguities before proceeding
- **NO PROCEEDING WITH AMBIGUITY**: Must resolve all vague answers before generation

## Generation Phase Rules
- **NO HARDCODED LOGIC**: Only execute what's written in the story generation plan
- **FOLLOW PLAN EXACTLY**: Do not deviate from the step sequence
- **UPDATE CHECKBOXES**: Mark [x] immediately after completing each step
- **INCLUDE ESTIMATES**: Add story point estimates if sprint planning is enabled
