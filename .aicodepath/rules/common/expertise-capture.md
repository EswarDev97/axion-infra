# User Expertise Capture

## Overview

AICodePath captures user expertise during pre-flight checks to provide contextual, adaptive guidance throughout the development workflow. The system asks only relevant questions based on project type and remembers user expertise across sessions.

## Philosophy

**Progressive Disclosure**: Ask what's needed, when it's needed. Don't overwhelm with a massive questionnaire.

**Context-Aware**: Project type determines which disciplines are relevant. Frontend-only projects don't need backend questions.

**Non-Intrusive**: Expert users can skip auto-invoke features. Beginners get guided support.

**Persistent**: Expertise profiles are stored in the knowledge base and survive context resets.

## Project Type Detection

The system automatically detects project type from file structure:

| Project Type | Indicators |
|--------------|------------|
| **Full-stack** | Has frontend (React/Vue/Angular) AND backend (Express/NestJS) |
| **Frontend** | Has frontend framework only |
| **Backend** | Has backend framework only (Express, Django, Rails) |
| **Mobile** | React Native or Flutter |
| **Data/ML** | Has database/schema but no backend |
| **DevOps** | Has Docker/K8s/Terraform but no backend |
| **Other** | None of the above |

## Relevant Disciplines by Project Type

| Project Type | Disciplines |
|--------------|-------------|
| Full-stack | frontend, backend, database, devops |
| Frontend | frontend, design-system |
| Backend | backend, database, api-design |
| Mobile | mobile, ui-ux |
| Data/ML | data-engineering, machine-learning, database |
| DevOps | devops, infrastructure, cicd |
| Other | general |

## Expertise Levels

| Level | Definition | Workflow Behavior |
|-------|------------|-------------------|
| **Beginner** | <1 year experience, learning basics | Guided mode - explanations, create design system |
| **Intermediate** | 1-3 years, comfortable with patterns | Validation mode - efficient checks |
| **Expert** | 3+ years, deep knowledge | Manual mode - on-demand only |

## Frontend-Designer Invocation Modes

Based on frontend expertise level:

| Expertise | Mode | Behavior | Auto-Invoke |
|-----------|------|----------|-------------|
| Beginner | Guided | Teach and explain each issue | Yes |
| Intermediate | Validation | Efficient review, ask before fixes | Yes |
| Expert | Manual | Only when requested | No |

## Sample Question Flow

### Full-Stack Project

```
Detected project type: FULLSTACK

I'll ask a few questions about your expertise to provide better guidance.

Question 1: What is your FRONTEND expertise level?
  A) Beginner - Learning the basics, need detailed guidance
  B) Intermediate - Comfortable with standard patterns, want to improve
  C) Expert - Deep knowledge, build complex features independently

Question 2: What is your BACKEND expertise level?
  A) Beginner - Learning API design and server-side concepts
  B) Intermediate - Can build REST APIs, understand patterns
  C) Expert - Architecture design, scalability, security expert

Question 3: What is your DATABASE expertise level?
  A) Beginner - Learning SQL and basic schema design
  B) Intermediate - Can design schemas, write queries, optimize
  C) Expert - Advanced modeling, performance tuning

Question 4: What is your DEVOPS expertise level?
  A) Beginner - Learning Docker and basic CI/CD
  B) Intermediate - Can set up pipelines, manage deployments
  C) Expert - Infrastructure as code, orchestration, monitoring
```

### Frontend-Only Project

```
Detected project type: FRONTEND

I'll ask a few questions about your expertise to provide better guidance.

Question 1: What is your FRONTEND expertise level?
  A) Beginner - Learning the basics, need detailed guidance
  B) Intermediate - Comfortable with standard patterns, want to improve
  C) Expert - Deep knowledge, build complex features independently

Question 2: Do you have an existing design system?
  A) Yes, I have one - I have a design system to follow
  B) No, help me create one - Need guidance setting up design tokens
  C) No, use a popular one - Use Material UI, Tailwind, etc.
```

## Knowledge Base Storage

User expertise profiles are stored in the `user_profile` table:

```sql
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  project_type TEXT NOT NULL,
  relevant_disciplines TEXT NOT NULL,  -- JSON array
  expertise_json TEXT NOT NULL,         -- JSON: {"frontend": "beginner"}
  preferences_json TEXT,                -- JSON: {"designSystem": "tailwind"}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id)
);
```

## Updating Expertise

Profiles are considered stale after 30 days by default. When a profile is stale:

1. System prompts to update expertise
2. Previous values shown as defaults
3. User can update or keep existing values

To manually update expertise:

```bash
# Delete existing profile (optional)
node lib/kb-query.js execute "DELETE FROM user_profile WHERE session_id = 'current'"

# Re-run pre-flight check
node hooks/pre-flight-check.js
```

## API Reference

### UserExpertiseManager Class

```javascript
const UserExpertiseManager = require('../lib/user-expertise-manager');

const manager = new UserExpertiseManager(dbPath);

// Load profile
const profile = manager.loadProfile(sessionId);

// Save profile
manager.saveProfile(profile);

// Detect project type
const projectType = manager.detectProjectType(context);

// Get relevant disciplines
const disciplines = manager.getRelevantDisciplines(projectType);

// Capture expertise interactively
const expertise = await manager.captureExpertise(projectType, askFn);

// Get invocation mode
const mode = manager.getInvocationMode(profile, 'frontend');
```

## Related Files

- `lib/user-expertise-manager.js` - Main implementation
- `hooks/pre-flight-check.js` - Pre-flight integration
- `db/schema-additions.sql` - Database schema
- `docs/plan/2026-01-28-frontend-designer-integration.md` - Full implementation plan
