# Guidelines — Specialized Rules

Covers: `ai-implementation-rules.json`, `mobile-design-rules.json`, `search-rules.json`, `writing-style-rules.json`, `project-preferences.json`

---

## ai-implementation-rules.json

**File:** `.aicodepath/guidelines/ai-implementation-rules.json`
**Description:** AI/ML implementation rules for model selection, prompts, RAG, and agent patterns.

**Classification signals:** `llm`, `ai`, `model`, `prompt`, `rag`, `embedding`, `vector`, `agent`, `gemini`, `openai`, `anthropic`, `ml`, `inference`

**Applied to:** Files matching `*prompt*`, `*ai*`, `*llm*` (component type: `ai`)

### prompts
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `prompt-injection-prevention` | error | Sanitize user input before including in AI prompts — no raw `${userInput}` in prompt strings |

**Design check:** Does the design include user-supplied content directly in AI prompts without sanitization? Use structured input formats or redact untrusted input before passing to the model.

### model_selection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `justify-model-choice` | info | Document why this model was chosen over alternatives |
| `cost-aware-model` | info | Document token cost estimates for the selected model |

**Design check:** Does the design justify model selection (capability vs cost vs latency)? High-frequency operations must include cost analysis.

### data_privacy
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-pii-in-prompts` | error | Do not send PII (names, emails, phone numbers, IDs) to external AI model APIs |

**Design check:** If PII must be processed, either anonymize/redact before sending, or use a self-hosted model.

### output_validation
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `validate-ai-output` | warning | AI model outputs must be validated before use in business logic |

**Design check:** AI outputs can be malformed, hallucinated, or unexpected. Always validate/parse before storing or acting on them.

---

## mobile-design-rules.json

**File:** `.aicodepath/guidelines/mobile-design-rules.json`
**Description:** Mobile design rules for platform selection, offline support, performance, and accessibility.

**Classification signals:** `mobile`, `ios`, `android`, `react native`, `flutter`, `swift`, `kotlin`, `app`, `offline`, `push notification`

**Applied to:** `*service*`, `*domain*`, `*business*`, `*analytics*`, `*.ts`, `*.js`, `*.swift`, `*.kt`

### platform
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `shared-business-logic` | warning | Business logic must be platform-agnostic — no `UIKit`/`android.` imports in service/domain files |

**Design check:** Separate business logic from platform-specific APIs using the adapter pattern. Platform deps belong in adapters only.

### security
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-sensitive-logs` | error | Never log auth tokens, passwords, API keys, or credentials — applies to JS, TS, Swift, Kotlin |

**Pattern detected:** `console.log` / `logger.*` calls containing token, password, api_key, jwt, credential, secret, refresh_token, session_id.

### analytics
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `privacy-aware-analytics` | error | Do not send PII (email, phone, Aadhaar, SSN) in analytics events |

**Design check:** Analytics must use anonymous identifiers only. Strip all PII from event payloads before sending.

---

## search-rules.json

**File:** `.aicodepath/guidelines/search-rules.json`
**Description:** Search design rules for full-text search, vector search, indexing, and query optimization.

**Applied to:** `*query*`, `*search*`

### queries
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `wildcard-query-caution` | warning | Avoid leading wildcards (`*term`) — extremely slow; use ngrams or reverse index instead |

**Guidance:** Leading wildcards require full index scans in most search engines. Use edge ngrams (Elasticsearch) or reverse-indexed terms for prefix matching.

### cache_warming
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `fielddata-awareness` | warning | Avoid enabling `fielddata: true` on text fields — causes heap pressure |

**Guidance:** Fielddata loads inverted index into JVM heap memory. Use `keyword` sub-fields for aggregations/sorting instead.

---

## writing-style-rules.json

**File:** `.aicodepath/guidelines/writing-style-rules.json`
**Description:** Rules for clear, concise technical writing — avoids AI-generated patterns in documentation and code comments.

**Applied to:** All files (`languages: ["*"]`); double-negative rule targets `**/*.md`, `**/*.txt` only.

### ai_anti_patterns
| Rule ID | Severity | What it flags |
|---------|----------|--------------|
| `no-puffery-words` | warning | pivotal, crucial, groundbreaking, revolutionary, cutting-edge, robust, seamless, holistic, scalable, synergy, leverage, empower |
| `no-delve-explore` | info | delve, dive deep, explore, unpack, dissect, embark |
| `no-realm-landscape` | info | realm, landscape, arena, sphere, domain of, tapestry, fabric of |
| `no-ensure-comprehensive` | info | "ensure that", "comprehensive the", "meticulous all" and similar patterns |
| `no-firstly-moreover` | info | firstly, secondly, furthermore, moreover, additionally, consequently, henceforth |
| `no-it-is-important` | warning | "it is important to", "it's crucial that", "this is essential to" |
| `no-in-order-to` | info | "in order to", "for the purpose of", "with the aim of", "so as to" |
| `no-basically-essentially` | info | basically, essentially, fundamentally, literally, actually, really, very |
| `no-as-such-thus` | info | as such, thus, hence, therefore, accordingly, in conclusion, to summarize |
| `no-utilize-leverage` | info | utilize, leverage, facilitate, implement (prefer: use, help, add, build) |

### clarity
| Rule ID | Severity | What it flags |
|---------|----------|--------------|
| `prefer-active-voice` | info | Passive voice: "was created by", "were processed by" |
| `avoid-double-negatives` | warning | Double negatives in `.md`/`.txt` files: "not uncommon", "not invalid" |
| `avoid-noun-strings` | info | 4+ consecutive nouns: hard to parse |
| `be-specific` | info | Vague quantifiers: several, many, some, various, numerous |

### technical_writing
| Rule ID | Severity | What it flags |
|---------|----------|--------------|
| `comment-why-not-what` | info | Comments that describe WHAT code does (redundant); explain WHY instead |
| `no-obvious-comments` | info | "// This function", "// The class", "// The loop" |
| `jsdoc-description-first` | warning | JSDoc that starts with `@param` before the description |
| `readme-no-fluff` | info | READMEs starting with "This project is/provides/offers" |
| `avoid-weasel-words` | info | "may be", "might cause", "could result", "possibly lead" |

**Common replacements:**

| Instead of | Use |
|------------|-----|
| in order to | to |
| utilize / leverage | use |
| facilitate | help, enable |
| implement | add, build, create |
| functionality | feature, capability |
| prior to / subsequent to | before / after |
| it is necessary that | must |
| in the majority of cases | usually |
| due to the fact that | because |
| at this point in time | now |

---

## project-preferences.json

**File:** `.aicodepath/guidelines/project-preferences.json`
**Description:** Project-specific preference rules (v2.0 schema). Populated by `/aicodepath-learn` (auto-learned) or manually authored. Runtime file lives at `aicodepath-docs/preferences/project-preferences.json`; this guidelines copy (`aicodepath-docs/guidelines/project-preferences.json`) is used for pattern-based code checks only.

**Current state:** Empty `rules` array — no rules learned or authored yet.

**v2.0 Schema fields:**

| Field | Level | Required | Values / Notes |
|-------|-------|----------|----------------|
| `version` | file | yes | `"2.0"` |
| `repo` | file | yes | Git repo name |
| `created_at` | file + rule | yes | ISO 8601 |
| `updated_at` | file + rule | yes | Updated on every write |
| `source` | rule | yes | `"manual"` \| `"learned"` |
| `title` | rule | yes | Human-readable label |
| `rule` | rule | yes | Enforceable statement |
| `applies_to` | rule | yes | Glob path or `"*"` |
| `category` | rule | yes | `frontend` \| `backend` \| `database` \| `devops` \| `testing` \| `workflow` \| `framework` |
| `severity` | rule | yes | `"error"` \| `"warning"` \| `"info"` |
| `confidence` | rule | yes | `0.0–1.0` |
| `enabled` | rule | yes | Toggle without deletion |
| `expires_when` | rule | no | Prose condition or `null` (permanent) |
| `source_note` | rule | yes | Evidence / session reference |

**How it works:**
- `source: "learned"` rules are proposed by `/aicodepath-learn` from repeated GICL patterns and require user approval
- `source: "manual"` rules are human-authored and always enabled
- Rules are written to `rules[]` and evaluated by the guideline-validator hook on every Write/Edit
- Workaround rules (non-null `expires_when`) are surfaced separately by `/aicodepath-preferences list`

**To view or manage preferences:**
```bash
/aicodepath-preferences
```

This skill lets you approve, reject, toggle, or export rules interactively.
