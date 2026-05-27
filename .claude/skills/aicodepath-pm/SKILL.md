---
name: aicodepath-pm
description: >
  Use when doing any product management work: discovery, strategy, execution, market research,
  data analytics, go-to-market, marketing/growth, or PM toolkit tasks.
  Trigger on: "PRD", "user story", "job story", "sprint plan", "OKR", "OKRs", "quarterly planning", "roadmap",
  "brainstorm ideas", "customer interview", "assumptions", "product strategy",
  "value proposition", "lean canvas", "business model", "SWOT", "PESTLE",
  "persona", "market sizing", "competitor analysis", "customer journey map",
  "SQL query", "A/B test", "cohort analysis", "go-to-market", "GTM", "ICP",
  "growth loops", "north star metric", "positioning", "product name",
  "opportunity solution tree", "feature requests", "metrics dashboard",
  "release notes", "stakeholder map", "retrospective", "pre-mortem",
  "NDA", "privacy policy", "resume review".
  Invoke this skill whenever the user asks for any PM artifact, framework,
  analysis, or structured output — even if they don't use PM terminology.
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, WebFetch, WebSearch, mcp__plugin_context7_context7__query-docs
argument-hint: "[domain or artifact] [context]  e.g. PRD for auth feature, customer journey map, SWOT analysis"
---

# PM Skills

65 skills across 8 product management domains, encoding frameworks from Teresa Torres,
Marty Cagan, Dan Olsen, Alexander Osterwalder, Alberto Savoia, and Geoffrey Moore.

---

## Step 1 — Triage

Identify the domain from the user's request:

| User asks for | Domain |
|---------------|--------|
| Interview script, feature prioritization, OST, assumptions, experiments, metrics dashboard | **Discovery** |
| Product strategy, vision, value prop, lean canvas, BMC, SWOT, PESTLE, Porter's Five Forces, Ansoff, pricing, monetization | **Strategy** |
| PRD, user story, job story, OKR, roadmap, sprint plan, backlog, pre-mortem, retro, stakeholder map, release notes, test scenarios | **Execution** |
| Personas, market sizing, customer journey, competitor analysis, segmentation, sentiment analysis | **Market Research** |
| SQL query, cohort analysis, A/B test, retention curve, "why is X dropping", diagnostic metric questions | **Data Analytics** |
| GTM strategy, beachhead, ICP, growth loops, competitive battlecard | **Go-to-Market** |
| Marketing ideas, positioning, north star metric, product name, value prop statements | **Marketing & Growth** |
| Resume review, NDA, privacy policy, grammar check | **PM Toolkit** |

**Multi-domain**: If the request spans two domains (e.g., "SWOT + competitive analysis"), identify both domains and read both reference files before generating.

**Diagnostic framing**: "Why is retention dropping?" / "What's causing churn?" → Data Analytics, even without SQL or cohort keywords.

Read the appropriate reference file(s), then generate the artifact.

---

## Step 2 — Domain Quick Reference

### Discovery
Key skills: brainstorm ideas (new/existing), identify assumptions, prioritize assumptions,
brainstorm experiments, opportunity solution tree (OST), analyze feature requests,
interview script, summarize interview, feature prioritization, metrics dashboard.

Foundations: Teresa Torres (Continuous Discovery Habits, OST), Dan Olsen (Opportunity Score),
Alberto Savoia (pretotypes, XYZ hypothesis).

Read `references/discovery.md` for full templates.

---

### Strategy
Key skills: product strategy canvas, product vision, value proposition (JTBD template),
lean canvas, business model canvas, startup canvas, SWOT, PESTLE, Porter's Five Forces,
Ansoff matrix, monetization strategy, pricing strategy.

Foundations: Alexander Osterwalder (BMC, Value Proposition Canvas), Marty Cagan (INSPIRED),
Geoffrey Moore (Crossing the Chasm).

Read `references/strategy.md` for full templates.

---

### Execution
Key skills: PRD (8-section), user stories (3 C's + INVEST), job stories, WWAS format,
OKRs, outcome roadmap, sprint plan, pre-mortem (Tigers/Paper Tigers/Elephants),
retrospective (Start/Stop/Continue or 4Ls), stakeholder map, release notes, test scenarios.

**Prioritization framework selector:**

| When to use | Framework |
|-------------|-----------|
| Pre-PMF or team < 10, no usage data | ICE (fast, opinion-based) |
| Have cohort data or usage logs | RICE (Reach must come from real data, not estimates) |
| Hard deadline, need stakeholder scoping | MoSCoW (forces Must/Won't trade-offs) |
| Uncover hygiene vs. delight features | Kano (survey-based, reveals what users won't say) |
| Large org, teams disagree on "impact" | Weighted scoring — align on weights before evaluating |

**OKR rule**: Key Results must be outcome metrics ("Increase DAU 25%"), never feature outputs ("Ship dashboard"). Output deliverables belong in Initiatives. Teams that write output KRs hit targets while impact flatlines.

Foundations: Marty Cagan, Teresa Torres (product trio), standard agile practices.

Read `references/execution.md` for full templates.

---

### Market Research
Key skills: user personas (3 detailed, JTBD-based), market segments (3-5),
user segmentation (behavioral), customer journey map (7 stages: Awareness → Advocacy),
market sizing (TAM/SAM/SOM top-down + bottom-up), competitor analysis (5 competitors),
sentiment analysis.

Foundations: Clayton Christensen (JTBD), Geoffrey Moore (beachhead), Jobs-to-be-Done theory.

Read `references/market-research.md` for full templates.

---

### Data Analytics
Key skills: SQL query generation (BigQuery/PostgreSQL/MySQL/Snowflake),
cohort analysis (retention curves, feature adoption), A/B test analysis
(statistical significance, sample size, ship/extend/stop recommendation).

**Diagnostic questions** ("why is X dropping?"): ask for the metric name and time window, then generate a structured analysis framework before any SQL — raw queries without context answer the wrong question.

Read `references/data-analytics.md` for full templates.

---

### Go-to-Market
Key skills: GTM strategy (channels/messaging/success metrics/timeline),
beachhead segment identification, ideal customer profile (ICP),
growth loops (Viral/Usage/Collaboration/UGC/Referral), GTM motions (7 types),
competitive battlecard.

Foundations: Geoffrey Moore (beachhead), product-led growth principles.

Read `references/go-to-market.md` for full templates.

---

### Marketing & Growth
Key skills: marketing ideas (5 creative, cost-effective), positioning ideas (5 unique),
segment-specific value prop statements, product naming (5 names + rationale),
North Star Metric + input metrics (Attention/Transaction/Productivity game classification).

Foundations: Sean Ellis (NSM), Al Ries & Jack Trout (positioning).

Read `references/marketing-growth.md` for full templates.

---

### PM Toolkit
Key skills: PM resume review (10 best practices, XYZ+S formula), NDA drafting,
privacy policy (GDPR/CCPA), grammar and logic check.

Read `references/toolkit.md` for full templates.

---

## Step 3 — Generate the Artifact

Use the template from the reference file(s) adapted to the user's context ($ARGUMENTS).
Lead with the artifact. Use concrete, specific content — trigger the Hard Gate if key context is missing.

---

## Hard Gate

<HARD-GATE>
Do NOT produce a PM artifact without understanding the user's context.
If $ARGUMENTS is missing or too vague (e.g. just "user story" with no product/feature context),
ask one clarifying question before generating. One question, not five.
</HARD-GATE>

---

## NEVER

- **NEVER write OKR Key Results as feature outputs** ("Ship dashboard", "Launch redesign") — KRs must measure user behavior change; outputs belong in Initiatives. Output KRs let teams hit targets while impact flatlines.
- **NEVER use ICE scoring when cohort data or usage logs exist** — ICE is for pre-PMF or teams under 10; using it with available data substitutes expensive opinion-guessing for what RICE would quantify.
- **NEVER apply MoSCoW without a hard deadline or scope constraint** — without a forcing function, every stakeholder marks their feature "Must"; the framework only works when something genuinely must be cut.
- **NEVER generate personas from internal brainstorming alone** — JTBD personas require real interview evidence; assumption-based personas optimize for imaginary users and produce roadmaps that don't convert.
- **NEVER finalize a PRD without defining success metrics and instrumentation** — if the analytics dashboard isn't set up before launch, the team ships blind and cannot learn from the release.
- **NEVER triage a multi-domain request to a single reference file** — "SWOT + competitor analysis" spans Strategy and Market Research; using only one reference produces a half-complete artifact.
- **NEVER create GTM channel strategy before ICP is defined** — channels are derived from where the ICP spends attention; choosing channels first leads to spray-and-pray spending with no attribution.
- **NEVER include placeholder text** ("[Your metric here]", "[Insert goal]") — placeholders signal missing context; invoke the Hard Gate and ask one specific question instead of generating hollow artifacts.

---

## Reference Files

| File | Load when |
|------|-----------|
| `references/discovery.md` | Interview scripts, OST, assumptions, ideation, metrics dashboard |
| `references/strategy.md` | Canvases, SWOT, Porter's, Ansoff, pricing, monetization |
| `references/execution.md` | PRD, user stories, OKRs, sprint plan, roadmap, retro, stakeholder map |
| `references/market-research.md` | Personas, market sizing, customer journey, competitor analysis |
| `references/data-analytics.md` | SQL, cohort analysis, A/B tests, diagnostic metric questions |
| `references/go-to-market.md` | GTM strategy, ICP, growth loops, battlecard |
| `references/marketing-growth.md` | Positioning, naming, NSM, value prop statements |
| `references/toolkit.md` | Resume review, NDA, privacy policy, grammar check |
