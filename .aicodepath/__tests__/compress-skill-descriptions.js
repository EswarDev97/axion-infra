#!/usr/bin/env node
// One-off: compress description: fields in 103 SKILL.md files.
// Run from worktree root: node .aicodepath/__tests__/compress-skill-descriptions.js
// Safe to re-run (idempotent for already-compressed skills).

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '../skills');

// Compressed descriptions: target ~100 bytes each, max 120 bytes.
// Keys are skill directory names (no path prefix).
// Skips keys not in this map (leaves description unchanged).
const COMPRESSED = {
  'aicodepath-acceptance':
    'Sprint acceptance gate — runs shell checks against design doc criteria, blocks checkpoint until all pass.',
  'aicodepath-agent-audit':
    'Evaluate agent quality — scores 6 dimensions, outputs letter grade and ranked improvements.',
  'aicodepath-agent-creator':
    'Create or improve an agent — spec validation, description crafting, tool selection, and registry integration.',
  'aicodepath-agent-eval':
    'Benchmark or compare AI agents — YAML task definitions, worktree isolation, judge types, and head-to-head metrics.',
  'aicodepath-ai-regression-testing':
    'Test AI-written code for systematic blind spots — 7 AI-specific regression patterns and sandbox testing.',
  'aicodepath-analyze':
    'Understand, explain, audit, or assess code — structured analysis with findings, patterns, and risks.',
  'aicodepath-autonomous-loops':
    'Taxonomy of 6 autonomous AI loop patterns with decision matrix — pick the right loop for multi-step tasks.',
  'aicodepath-benchmark':
    'Measure performance — 4 modes: Lighthouse, API latency, build time, before-after. Outputs comparison table.',
  'aicodepath-brainstorm':
    'Design before code — structured exploration for new features, components, APIs, or services before implementation.',
  'aicodepath-brownfield-readiness':
    'Audit brownfield codebase AI-readiness — scored report across regression safety, architecture health, and conventions.',
  'aicodepath-catalog':
    'Browse 107 agents and 103 skills — discovery with category filtering.',
  'aicodepath-checkpoint':
    'Create and manage session checkpoints — safe recovery and rollback before risky changes or large refactors.',
  'aicodepath-classify-component':
    'Classify component types before brainstorm or plan — loads guidelines and outputs phase-aware agent recommendations.',
  'aicodepath-claude-md-improver':
    'Audit and improve CLAUDE.md files, or capture session learnings for future sessions.',
  'aicodepath-code-graph':
    'Build or query the AST-based code graph — index, re-index, or trace call-graph relationships.',
  'aicodepath-codebase-onboarding':
    'Onboard to an unfamiliar codebase — stack detection, entry points, flow tracing, and convention cataloging.',
  'aicodepath-codebase-pattern-finder':
    'Find existing patterns in the codebase — implementations, tests, and integration examples with file:line references.',
  'aicodepath-command-creator':
    'Create AICodePath slash commands — optimized, agent-executable with proper structure and best practices.',
  'aicodepath-commit':
    'Commit at a batch boundary — stages work, updates active-worktree.json and Branch Lifecycle.',
  'aicodepath-composite-worker':
    'Run the full TDD→Implement→Review→Build→Commit cycle for one task — for swarm workers or parallel spawns.',
  'aicodepath-confidence-check':
    'Self-assess confidence across 5 dimensions before implementing — prevents wrong-direction work.',
  'aicodepath-context-budget':
    'Audit context window usage — token counts across skills, rules, agents, MCP, and guidelines with warning thresholds.',
  'aicodepath-cost-aware-llm':
    'Manage LLM API costs — model routing by complexity, token budgets, and prompt caching optimization.',
  'aicodepath-diagnostics':
    'Run AICodePath health check — diagnoses hooks, skills, DB, and MCP issues with fix guidance.',
  'aicodepath-docker-slim':
    'Reduce Docker image sizes — bloat analysis, Dockerfile optimization, distroless/Alpine migration.',
  'aicodepath-dx-optimizer':
    'Optimize developer experience — build times, HMR latency, test speed, IDE responsiveness, and monorepo tooling.',
  'aicodepath-edd':
    'Define AI/agent evals — EDD with capability vs regression evals, grader types, and pass@k metrics.',
  'aicodepath-efficiency-mode':
    'Activate token budgeting during CONSTRUCTION — reduces context when window is large or task is complex.',
  'aicodepath-git':
    'Git operations beyond commits — branch management, conflict resolution, history, and safe destructive ops.',
  'aicodepath-harness-eval':
    "Audit any agentic harness against Nate Jones' 12 production primitives, or design a new harness from scratch.",
  'aicodepath-help':
    'Contextual help for AICodePath — diagnose hooks not firing, identify the right skill, or interpret guideline violations.',
  'aicodepath-hook-audit':
    'Evaluate hook quality — scores protocol compliance, error handling, and integration across 6 dimensions.',
  'aicodepath-hook-creator':
    'Create or improve a hook — event selection, handler implementation, protocol compliance, and test generation.',
  'aicodepath-implement':
    'Write code after design approval — orchestrates full TDD implementation sequence with quality gates.',
  'aicodepath-init':
    'Initialize AICodePath — creates symlinks, generates settings.json, sets up DB and MCP config.',
  'aicodepath-interconnection-diagram':
    'Generate interactive HTML diagram of all AICodePath components — skills, agents, hooks, guidelines with edge discovery.',
  'aicodepath-knowledge':
    'Record phase transitions, architecture decisions, GICL sessions, and lessons in the knowledge base.',
  'aicodepath-learn':
    'Extract learning signals and propose preference rules — distinguishes style preferences from one-off corrections.',
  'aicodepath-mcp-builder':
    'Build or improve MCP servers in TypeScript or Python — connects LLMs to external services.',
  'aicodepath-mental-model':
    'Build mental models of code changes — logical chunks with dependency ordering for diffs, PRs, and brownfield code.',
  'aicodepath-model-training':
    'Autonomous ML experiment loop — proposes changes, runs training, auto-keeps improvements and reverts regressions.',
  'aicodepath-orchestrate':
    'Execute approved implementation plans — parallel tasks with dependency-aware scheduling during CONSTRUCTION.',
  'aicodepath-orchestration-mode':
    'Activate parallel tool execution for complex multi-step work — resource-aware task planning.',
  'aicodepath-pause':
    'Create handoff documents for seamless agent session transfers — quality scoring, staleness detection, and chaining.',
  'aicodepath-preferences':
    'View, approve, reject, and manage learned coding preferences — diagnose why Claude applies unexpected styles.',
  'aicodepath-prompt-engg':
    'Debug and improve LLM prompt templates — fixes wrong field values, missing keys, and cross-provider inconsistency.',
  'aicodepath-pytorch-patterns':
    'PyTorch reference patterns — device-agnostic code, mixed precision, reproducibility, and checkpointing.',
  'aicodepath-release':
    'Package a release — automates CHANGELOG, version bumping, GitHub tag and Release publishing.',
  'aicodepath-requirements':
    'Transform vague requests into approved PRDs with 90/100 clarity score before design begins.',
  'aicodepath-research-mode':
    'Deep multi-hop research during PRE-FLIGHT and debugging — evidence management before drawing conclusions.',
  'aicodepath-resume':
    'Resume a previous AICodePath session — checks handoffs for AIDLC workflow state, falls back to checkpoint DB.',
  'aicodepath-review':
    '4-perspective code or plan review — A-D grading with APPROVE/REQUEST_CHANGES, covering quality, security, and scope creep.',
  'aicodepath-rewind':
    'Restore session to a previous checkpoint — for failed directions, GICL regression, or hard-to-reverse changes.',
  'aicodepath-rules-distill':
    'Codify recurring patterns into enforceable JSON guideline rules with mandatory false-positive testing.',
  'aicodepath-search-first':
    'Enforce ranked search before building — codebase, Context7, registry, then WebSearch with ≥80% match gate.',
  'aicodepath-skill-audit':
    'Score any SKILL.md across 8 dimensions (120 pts) — letter grade, knowledge delta ratio, and ranked improvements.',
  'aicodepath-skill-creator':
    'Create or update skills — from scratch or optimization, with evals, benchmarking, and trigger accuracy tuning.',
  'aicodepath-skill-improver':
    'Improve skills below Grade A — autonomous quality optimization for skills that fail audit or miss triggers.',
  'aicodepath-skill-testing':
    'Apply TDD to skill development — Red-Green-Refactor for behavioral instructions.',
  'aicodepath-solid-principles':
    'Analyze code for SOLID violations — severity-ranked findings and language-specific remediation.',
  'aicodepath-status':
    'Check current workflow phase, quality gate state, and blockers — recommends the right next action.',
  'aicodepath-statusline':
    'Configure the Claude Code terminal statusline — phase, context usage, cost, duration, and custom fields.',
  'aicodepath-subagent-dev':
    'Dispatch approved implementation tasks to fresh subagents in parallel — two-stage review on results.',
  'aicodepath-tdd':
    'Implement via Red-Green-Refactor — write a failing test first, then minimal code, then refactor.',
  'aicodepath-test':
    'Write comprehensive test suites — happy path, edge cases, error paths, and integration scenarios.',
  'aicodepath-validate-guidelines':
    'Validate code against AICodePath guidelines — interpret violations, suppress false positives, fix blocked edits.',
  'aicodepath-verify':
    'Verify work before claiming done — runs verification commands and shows evidence before any commit.',
  'aicodepath-visual-memory':
    'Generate and manage architectural diagrams — ER, class, C4, sequence diagrams for visual codebase understanding.',
  'aicodepath-work':
    'Execute implementation tasks — auto-detects solo/parallel/swarm mode from pending task count.',
  'aicodepath-write-design':
    'Synthesize brainstorm into a structured design document — captures decisions, rationale, constraints, and alternatives.',
  'aicodepath-write-plan':
    'Create a TDD-first implementation plan with bite-sized tasks after design approval.',
  'celery-worker':
    'Configure Celery workers — task queues, routing, retry strategies, concurrency, and Redis/RabbitMQ brokers.',
  'messaging':
    'Design message queues and event-driven architecture — RabbitMQ, Kafka, Redis Pub/Sub, and AWS SQS.',
  'sql-query-optimization':
    'Investigate slow queries, N+1 problems, and missing indexes — EXPLAIN analysis, index strategy, and rewriting.',
  'using-aicodepath':
    'Establish AIDLC workflow, skill activation rules, and discipline enforcement — injected at session start.',
};

let updated = 0;
let skipped = 0;
let errors = 0;

const skillDirs = fs.readdirSync(SKILLS_DIR)
  .filter(d => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')))
  .sort();

for (const skill of skillDirs) {
  const newDesc = COMPRESSED[skill];
  if (!newDesc) {
    skipped++;
    continue;
  }

  const filePath = path.join(SKILLS_DIR, skill, 'SKILL.md');
  const original = fs.readFileSync(filePath, 'utf8');

  // Replace the description line in the YAML frontmatter (first match only)
  const replaced = original.replace(/^description:.*$/m, `description: ${newDesc}`);

  if (replaced === original) {
    console.log(`  WARN: no change in ${skill} — pattern may not match`);
    errors++;
    continue;
  }

  fs.writeFileSync(filePath, replaced, 'utf8');
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped (no entry), ${errors} errors\n`);
