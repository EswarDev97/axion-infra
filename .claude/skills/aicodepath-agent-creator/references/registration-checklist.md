# Agent Registration Checklist

4-step process to wire a new agent into the AICodePath system after creating its `.md` file.
Complete all steps — a partially registered agent will not be auto-suggested or symlinked.

---

## Step 1: DOMAIN_MAPPING in agent-suggester.js

**File**: `.aicodepath/hooks/lib/agent-suggester.js`

**Location**: Find the `DOMAIN_MAPPING` object starting around line 22. It maps domain keyword strings to arrays of agent name strings (without the `aicodepath-` prefix).

```javascript
const DOMAIN_MAPPING = {
  // ... existing entries ...

  // Add your new entries in the relevant section, or create a new section:
  'your-keyword': ['your-agent-name'],           // single agent
  'another-keyword': ['your-agent-name', 'other-agent'],  // multiple agents
};
```

**How to find the right keyword**: Look at the category names in the guidelines JSON files at `.aicodepath/guidelines/*.json`. The `category` field in each rule is what gets surfaced as a violation keyword.

```bash
# Find all unique categories across guideline files
grep -r '"category"' .aicodepath/guidelines/ | \
  grep -oP '"category":\s*"\K[^"]+' | sort -u
```

**What to add**:
- At least 2–3 keyword entries that route to your agent
- Your agent as the sole or primary value for niche keywords
- Your agent alongside generalists for shared keywords

**Example — adding `aicodepath-graphql-specialist`**:
```javascript
// In the API Design section:
'graphql': ['graphql-specialist', 'api-designer'],
'resolver': ['graphql-specialist'],
'dataloader': ['graphql-specialist'],
'schema': ['database-architect', 'graphql-specialist'],  // add to existing
```

Note: Use the agent name WITHOUT the `aicodepath-` prefix in DOMAIN_MAPPING values. The suggester prepends the prefix when resolving.

---

## Step 2: VIOLATION_TYPE_MAPPING (if applicable)

**File**: `.aicodepath/hooks/lib/agent-suggester.js`

**Location**: Find the `VIOLATION_TYPE_MAPPING` object starting around line 239. It maps broad violation category strings to agent arrays.

```javascript
const VIOLATION_TYPE_MAPPING = {
  'guideline': ['code-reviewer'],
  'architecture': ['architect', 'backend-architect'],
  'security': ['security-engineer'],
  'authenticity': ['code-reviewer', 'backend-architect'],
  'duplication': ['refactoring-expert'],
  // ...
};
```

**When to add here vs when to skip**:

| Situation | Add to VIOLATION_TYPE_MAPPING? |
|-----------|-------------------------------|
| Your agent maps to a NEW broad violation type not already in the mapping | YES — add the new type + agent |
| Your agent handles an existing violation type better than current entries | YES — add your agent alongside existing |
| Your agent is domain-specific (e.g., GraphQL) but violations map to existing types (e.g., `api`) | NO — DOMAIN_MAPPING in Step 1 is sufficient |
| Your agent is a general-purpose reviewer that applies to all violations | YES — add to `'guideline'` array |

**Example — adding a new violation type**:
```javascript
'graphql': ['graphql-specialist'],       // new violation type for GraphQL-specific rule failures
'data-modeling': ['database-architect'], // if adding a data modeling violation type
```

**Example — extending an existing type**:
```javascript
'api': ['api-designer', 'graphql-specialist'],  // add graphql-specialist alongside api-designer
```

---

## Step 3: agent-taxonomy.md

**File**: `.aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md`

**Purpose**: This table is read by the `aicodepath-classify-component` skill (Step 5) to generate phase-aware agent recommendations for a given component type. Every new agent must have at least one row here.

**Table format**:
```markdown
| Component Type | Agent | Phase | When to Invoke |
|---|---|---|---|
| your-type | aicodepath-your-agent-name | your-phase | Brief trigger description |
```

**Valid Component Types**:
| Type | Use for |
|------|---------|
| `database` | DB schema, migrations, query design, ORMs |
| `api` | REST, GraphQL, gRPC endpoint design |
| `service` | Business logic services, domain layers, refactoring |
| `test` | Test strategy, coverage, TDD workflows |
| `devops` | CI/CD pipelines, containers, infrastructure |
| `ai` | ML models, MLOps, data pipelines |
| `frontend` | React/Vue/Angular components, state, bundle |
| `mobile` | iOS, Android, React Native, Flutter |
| `observability` | Logging, metrics, alerting, SLOs |
| `security` | Auth, authorization, threat modeling, compliance |
| `all` | Cross-cutting concerns that apply to any component type |

**Valid Phases** (comma-separate if multiple apply):
| Phase | When the agent is relevant |
|-------|---------------------------|
| `design` | Before code is written — architecture, schema, API contracts |
| `plan` | Task planning, requirements review, DoD definition |
| `construction` | During implementation — code generation, review, testing |

**Example rows**:
```markdown
| api | aicodepath-graphql-specialist | design, construction | GraphQL schema design and N+1 resolver review |
| database | aicodepath-graphql-specialist | construction | DataLoader and projection strategy for GraphQL data fetching |
```

**When to use `all`**:
Only for agents that genuinely apply to every component type (e.g., a cost-tracking agent, a documentation agent). Prefer a specific type — it gives developers more targeted suggestions.

---

## Step 4: Individual Doc File — docs/agents/&lt;name&gt;.md

**File**: `.aicodepath/docs/agents/<name>.md`

**Purpose**: Required wiring point checked by `agent-wiring-check.js` (2 pts out of 18). Without it the agent scores at most 16/18 and is flagged as unwired. This is NOT optional documentation — it is a hard wiring requirement.

**Format**:
```markdown
# aicodepath-<name>

**Pack**: <pack-value> | **Model**: <model> | **Tools**: <comma-separated tools>

## When to Use

<One paragraph: trigger conditions for delegating to this agent>

## Triggers

- <Specific scenario 1>
- <Specific scenario 2>

## Key Capabilities

- <Core competency 1>
- <Core competency 2>

## Domain Keywords

`keyword1`, `keyword2`, `keyword3`

## Collaborates With

- **aicodepath-<other>** — <when and why>
```

---

## Step 5: plugin_pack Frontmatter Field

**File**: The agent's `.aicodepath/agents/<name>.md` frontmatter

**Purpose**: Declares which distribution pack the agent belongs to. Required for audit D4 compliance (steps 7–9, +3 pts total).

**What to set**:

| Value | Use when |
|-------|----------|
| `core` | Agent is always needed across all projects |
| `lang` | Agent is a language or framework specialist |
| `infra` | Agent handles CI/CD, containers, or infrastructure |
| `quality` | Agent handles security, compliance, performance, or QA |
| `data-ai` | Agent handles data science, ML, or AI pipelines |
| `design` | Agent handles API design, DB schema, frontend, or UX |
| `planning` | Agent handles planning, orchestration, or ideation |
| `specialists` | Agent is a niche-domain specialist (default for new agents) |
| `null` | Agent is standalone, not distributed in any pack |

**After setting**, if the value is non-null:
1. Add the agent name to the `.agents` array in `.aicodepath/.claude-plugin/packs/<pack>/plugin.json`
2. Confirm the pack appears in `.aicodepath/.claude-plugin/marketplace.json` plugins list

```yaml
# In agent frontmatter:
plugin_pack: specialists
```

---

## Verification Commands

After completing all steps, verify registration:

```bash
# 1. Verify agent appears in the agent list (requires symlink via init)
node .aicodepath/bin/aicodepath.js agent list

# 2. Regenerate symlinks (creates .claude/agents/<name>.md symlink)
node .aicodepath/bin/aicodepath.js init

# 3. Verify symlink was created
ls -la .claude/agents/ | grep your-agent-name

# 4. Verify DOMAIN_MAPPING entries (should print your agent name)
node -e "
const s = require('./.aicodepath/hooks/lib/agent-suggester');
const entries = Object.entries(s.DOMAIN_MAPPING).filter(([k,v]) => v.includes('your-agent-name'));
console.log('DOMAIN_MAPPING entries:', entries.map(([k]) => k).join(', '));
"

# 5. Verify taxonomy row exists
grep 'your-agent-name' .aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md

# 6. Verify individual doc file exists
ls .aicodepath/docs/agents/your-agent-name.md

# 7. Run full wiring check (must score 18/18)
node .aicodepath/bin/aicodepath.js agent audit your-agent-name --check-wiring
```

---

## Common Registration Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Missing DOMAIN_MAPPING entries | Agent never suggested during violations | Add at least 2 relevant keywords |
| Agent name with `aicodepath-` prefix in DOMAIN_MAPPING | Agent not resolved (registry can't find it) | Use name WITHOUT prefix in mapping values |
| Missing taxonomy row | classify-component never suggests agent | Add row with correct type + phase |
| Wrong taxonomy phase | Agent suggested at wrong time | Review phase column; separate with comma if multi-phase |
| Symlink not created | `agent list` doesn't show agent | Run `node .aicodepath/bin/aicodepath.js init` |
| docs/agents/&lt;name&gt;.md missing | Wiring score capped at 16/18; pre-commit blocks commit | Create the individual doc file per Step 4 format |
| Appended to a group doc (e.g. quality-agents.md) instead of individual file | `agent-wiring-check.js` checks exact path `docs/agents/<name>.md` — group doc doesn't satisfy it | Create `docs/agents/<name>.md` as a separate file |
