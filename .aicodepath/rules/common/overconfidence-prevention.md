# Overconfidence Prevention Guide

## Problem Statement

AICodePath can exhibit overconfidence by not asking enough clarifying questions, even for complex project intent statements. This leads to assumptions being made instead of gathering proper requirements.

## Root Cause Analysis

The overconfidence issue is caused by directives that encourage skipping questions:

1. **Functional Design**: "Skip entire categories if not applicable"
2. **User Stories**: "Use categories as inspiration, NOT as mandatory checklist"
3. **Requirements Analysis**: Patterns encouraging minimal questioning
4. **NFR Requirements**: "Only if" conditions that discourage thorough analysis
5. **Database Design**: Assumptions about schema without validation
6. **AI Implementation**: Assumptions about model choice without cost analysis

These directives tell the AI to avoid asking questions rather than encouraging comprehensive requirements gathering.

## Solution Implemented

### Updated Question Generation Philosophy

**OLD APPROACH**: "Only ask questions if absolutely necessary"
**NEW APPROACH**: "When in doubt, ask the question - overconfidence leads to poor outcomes"

### Key Changes Made

#### 1. Requirements Analysis Stage
- Changed from "only if needed" to "ALWAYS create questions unless exceptionally clear"
- Added comprehensive evaluation areas (functional, non-functional, business context, technical context)
- Emphasized proactive questioning approach

#### 2. User Stories Stage
- Removed "skip entire categories" directive
- Added comprehensive question categories to evaluate
- Enhanced answer analysis requirements
- Strengthened follow-up question mandates

#### 3. Functional Design Stage
- Replaced "only if" conditions with comprehensive evaluation
- Added more question categories (data flow, integration points, error handling)
- Strengthened ambiguity detection and resolution requirements

#### 4. NFR Requirements Stage
- Expanded question categories beyond basic NFRs
- Added reliability, maintainability, and usability considerations
- Enhanced answer analysis for technical ambiguities

#### 5. Database Design Stage (NEW)
- Always ask about data volume and growth projections
- Clarify audit and compliance requirements
- Question performance expectations and SLAs
- Verify backup and recovery requirements

#### 6. AI Implementation Stage (NEW)
- Always ask about budget constraints for model selection
- Clarify latency requirements
- Question data privacy and compliance needs
- Verify expected usage patterns for cost estimation

#### 7. Sprint Planning Stage (NEW)
- Always ask about team velocity history
- Clarify sprint duration preferences
- Question definition of done
- Verify stakeholder availability

### New Guiding Principles

1. **Default to Asking**: When there's any ambiguity, ask clarifying questions
2. **Comprehensive Coverage**: Evaluate ALL relevant categories, don't skip areas
3. **Thorough Analysis**: Carefully analyze ALL user responses for ambiguities
4. **Mandatory Follow-up**: Create follow-up questions for ANY unclear responses
5. **No Proceeding with Ambiguity**: Don't move forward until ALL ambiguities are resolved
6. **Cost Awareness**: Always clarify budget and cost constraints for AI and database decisions

## Implementation Guidelines

### For Question Generation
- Evaluate ALL question categories, don't skip any
- Ask questions wherever clarification would improve quality
- Include comprehensive question categories in each stage
- Default to inclusion rather than exclusion of questions
- Include cost and budget questions for AI and database stages

### For Answer Analysis
- Look for vague responses: "depends", "maybe", "not sure", "mix of", "somewhere between"
- Detect undefined terms and references to external concepts
- Identify contradictory or incomplete answers
- Create follow-up questions for ANY ambiguities
- Flag responses that could lead to cost overruns

### For Follow-up Questions
- Create separate clarification files when ambiguities are detected
- Ask specific questions to resolve each ambiguity
- Don't proceed until ALL unclear responses are clarified
- Be thorough - better to over-clarify than under-clarify

## Quality Assurance

### Red Flags to Watch For
- Stages completing without asking any questions on complex projects
- Proceeding with vague or ambiguous user responses
- Skipping entire question categories without justification
- Making assumptions instead of asking for clarification
- Not asking about budget/cost for AI and database decisions
- Assuming sprint velocity without historical data

### Success Indicators
- Appropriate number of clarifying questions for project complexity
- Thorough analysis of user responses with follow-up when needed
- Clear, unambiguous requirements before proceeding to implementation
- Reduced need for changes during later stages due to better upfront clarification
- Cost estimates validated with user before implementation
- Sprint commitments aligned with team capacity

## Maintenance

This guide should be referenced when:
- Adding new stages to AICodePath
- Updating existing stage instructions
- Reviewing AICodePath performance for overconfidence issues
- Training team members on AICodePath question generation principles

## Key Takeaway

**It's better to ask too many questions than to make incorrect assumptions.** The cost of asking clarifying questions upfront is far less than the cost of implementing the wrong solution based on assumptions.

This is especially critical for:
- **AI Implementation**: Wrong model choice can blow budget
- **Database Design**: Schema changes are expensive post-deployment
- **Sprint Planning**: Over-commitment leads to burnout and missed deadlines
