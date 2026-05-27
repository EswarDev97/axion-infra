# T0a Spike: Behavioral Test Format for PM Discovery Gate

**Date**: 2026-04-03
**Conclusion**: Candidate A — node CLI via @anthropic-ai/sdk Messages API

## Candidates Evaluated

### Candidate A: node CLI + @anthropic-ai/sdk
**Approach**: Write `__tests__/pm-gate-behavioral.test.js` that loads SKILL.md/inception.md content
as system prompt, calls `client.messages.create()` with adversarial user messages, and asserts
on response text.

**Viability check**:
- `node -e "require('@anthropic-ai/sdk')"` → exits 0 (SDK available globally)
- `typeof Anthropic` → `function` (class loads correctly)
- `ANTHROPIC_API_KEY` → set
- `package.json` (`aicodepath/package.json`) → `"@anthropic-ai/sdk": "^0.39.0"` listed
- Existing `__tests__/` files → pure Node module tests, no Agent invocation (as expected)

**Verdict**: VIABLE. Tests are runnable via `node .aicodepath/__tests__/pm-gate-behavioral.test.js`

### Candidate B: /aicodepath-skill-testing (Claude Code session)
**Approach**: Structured pressure-scenario documents (`TEST:/TRIGGER:/EXPECTED:` blocks)
invoked via the `/aicodepath-skill-testing` skill inside a Claude Code session.

**Verdict**: Manual only — requires live Claude Code session, not automatable as a CI check.

## Decision

**Format selected**: Candidate A

**Test pattern** (matches ADR-005 canonical format via Messages API):
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 512,
  system: skillContent,  // SKILL.md body or inception.md section
  messages: [{ role: 'user', content: adversarialPrompt }]
});

const text = response.content[0].text;
assert(text.includes(expectedString), `Expected: ${expectedString}`);
```

## T7 DoD Update

T7 DoD is now: `node .aicodepath/__tests__/pm-gate-behavioral.test.js` exits 0 with all 6
scenarios PASS. Each scenario uses Haiku model with relevant SKILL.md/inception.md content
as system prompt and asserts on specific response strings.
