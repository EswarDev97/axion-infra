# Fluent 2 UX Patterns

> Source: fluent2.microsoft.design — Accessibility, Content Design, Onboarding, Wait UX, Handoffs
> Fetched: 2026-04-03

---

## 1. Wait UX (Loading States)

### Three Core Principles
1. **Communicate clearly and honestly** — users must always know what's happening
2. **Optimize perceived performance** — micro-interactions and skeletons reduce perceived wait time
3. **Maintain context** — keep users in the same view when possible

### Timing Thresholds

| Wait Duration | Recommended Pattern |
|---|---|
| **< 1 second** | Show nothing |
| **1–3 seconds** | Spinner |
| **> 3 seconds** | ProgressBar or descriptive content string |
| AI chat responses | Show indicator immediately (even if <1 second) |

### Visual Pattern Decision Matrix

| Pattern | Best For | When NOT |
|---------|---------|---------|
| Spinner | Short, indeterminate waits (<3s) | Extended operations or known duration |
| ProgressBar | Longer waits with measurable progress | Unknown duration (use Spinner) |
| Skeleton Screen | Content rendering with **known layout structure** | Unknown structure (use Spinner) |
| Toast (Progress) | Long back-end processes; allows parallel work | Foreground blocking operations |
| Pulsing dot / Morse code | AI/Copilot scenarios only | Non-AI content |

### Loading Content Rules
- **In-progress:** `-ing` verb + ellipsis → `"Uploading file …"`
- **Completed:** Past tense → `"File uploaded"`
- **Non-breaking space** before ellipsis for screen reader compatibility: `"Loading\u00a0…"` not `"Loading ..."`
- Max one phrase or sentence fragment — short and direct
- Non-AI: include estimated times ("This may take 2–3 minutes")
- AI: indicate process is active, not a time estimate

### Spinner Content
- `-ing` verb + "…"; 3 words or fewer
- `"Connecting to data …"` ✅ — specific
- `"Loading …"` ❌ — too generic
- `"Working on it …"` ❌ — not specific enough
- If specificity not possible: `"Getting things ready …"` (never bare "Loading" or "Authenticating")
- Space before ellipsis: `"Saving …"` not `"Saving..."` (use `\u00a0` for non-breaking space)

### Accessibility for Loading States
- `aria-live="assertive"` for error/warning updates
- `aria-live="polite"` for info/success updates
- `role="status"` to announce state changes to screen readers
- `aria-busy="true"` on container when multiple Skeleton elements update at different times

---

## 2. Onboarding Patterns

### Five Research-Backed Principles (Required for Microsoft products)
| Principle | Description |
|-----------|-------------|
| **Relevant** | Present within context of a closely related task |
| **Non-distracting** | Never a barrier to the user's primary goal |
| **Optional** | Allow exit and return later |
| **Benefit-focused** | Lead with the benefit, not the feature |
| **Coherent** | Use standard Fluent components for predictable expectations |

### Five Onboarding Goals and Patterns

| Goal | When | Recommended Patterns |
|------|------|---------------------|
| **Welcome** | First visit | Simple welcome screen, banner, or modal (show once only) |
| **Orient** | First use of feature | Empty states, teaching popovers (in brand color) |
| **Notify** | New capability available | Banners, empty states, teaching popovers, toasts |
| **Explain** | Context-relevant education | Empty states with short messages, inline text |
| **Take action** | Setup required | FRE flow, setup wizard (carousel), multi-step Drawer |

### Onboarding Content Rules
- Write for action, not explanation — active voice, strong verbs
- Break steps into digestible progressive actions
- Set expectations: "This takes 2–3 minutes" or "3 quick steps"
- Nonjudgmental help language: "Need help?" not "Stuck?"
- Lead with the benefit: "Start collaborating in real time" not "We added a collaboration feature"

---

## 3. AI Handoffs (Copilot Workflow Transitions)

### Three Foundational Principles
1. **Guide Seamlessly** — communicate when a task should be completed elsewhere
2. **Maintain Context** — carry forward relevant context, discard what is no longer needed
3. **Unify Experiences** — clear CTAs keep users in control across endpoints

### User Intent Levels
| Intent Level | Description | Copilot Behavior |
|---|---|---|
| Strong intent | Goal-oriented, clear prompt | Confidently suggest/trigger next step |
| Semi-formed intent | Hints at goal, lacks specificity | Guide with clarifying suggestions |
| Loose intent | Brainstorming, no endpoint | Communicate possibilities |

### Standard CTA Labels
| CTA | When to Use |
|-----|-------------|
| **Create** / **Create in [app]** | Building something new from existing content |
| **Open in …** | Accessing existing content without transformation |
| **Continue in [app]** | Moving to deeper-functionality app |
| **Try in [app]** | Experimenting; loose intent flows |

### System Message Pattern
Format: `"Copilot [past-tense verb] [an object] [in/from] [AppName]."`

Rules:
- Third person, full sentence, period at end
- Conversational, one line
- Example: `"Copilot created a summary in Word."`

---

## 4. Content Design

### Three Foundational Questions
1. **Who is your audience?** (Be specific — "developers" not "users")
2. **What do they want to accomplish?** (Their goal, not yours)
3. **How might they feel?** (Empathize — anxious, confident, impatient)

### Writing Style
- **Simple:** Short sentences, plain language, fragments are acceptable
- **Get to the point:** Prune every excess word
- **Human:** Informal, conversational, one-on-one

### Grammar & Voice
| Aspect | Rule |
|--------|------|
| Tense | Present tense (default) |
| Voice | Active voice — direct and person-focused |
| Person | Second person (you/your) as default |

### Platform Capitalization
| Platform | Rule |
|----------|------|
| Windows / Android / Web | **Sentence-case** (first word + proper nouns only) |
| iOS / macOS | **Title-case** (each word except articles/conjunctions) |

### Punctuation Rules
- Always use question marks for questions
- Use periods only after full sentences
- **Avoid periods** in UI elements: headers, buttons, labels, bullet lists
- Avoid exclamation points except genuinely celebratory moments

### Link and Navigation Text
- Write short, descriptive link text — **never "Click here"** or "Learn more" (without context)
- Avoid directional terms (above, below, left, right) — they don't localize and assume sightedness

---

## 5. Empty States

Empty states communicate when a section has no content and guide users to take action.

### Three Types
| Type | When | Content Pattern |
|------|------|----------------|
| **First-time** | User hasn't created content yet | Benefit-focused + CTA |
| **Error** | Something went wrong | What happened + how to fix |
| **No results** | Search/filter returned nothing | Suggest alternatives or clear filters |

### Content Rules
- Lead with the benefit or situation
- One clear CTA (primary action)
- Keep text brief — headline + 1-2 sentence explanation maximum
- Illustration optional — use brand-appropriate illustration, not stock photos

---

## 6. Error Messages

### Four Requirements
1. State what happened (not just "Error")
2. Explain why it happened (if known)
3. Tell the user what to do next
4. Offer a way out (link, button, or dismiss)

### Tone
- Empathetic, not blaming ("Something went wrong" not "You made an error")
- Specific, not generic ("Connection timed out" not "Network error")
- Actionable, not passive ("Try again" not "Please wait")

### Never
- Use "Error" or a code as the title alone
- Include technical details in the primary message (put in expandable "Details")
- Use exclamation points (even for critical errors)

---

## 7. Notifications and MessageBar

### Notification Types (stacking order, most to least critical)
`Error` → `Warning` → `Success` → `Info`

### Placement Rules
- Page-level: below command bar, above main content
- Container-level: top of container, below title/header
- Never above side navigation

### Content Rules
- **Title** (optional): short bold phrase, no period
- **Body** (required): 1–2 concise sentences; builds on (never repeats) title
- **Success messages:** Never say "success" or "successfully" — state what changed: "File saved" not "File saved successfully"
- Error/Warning must include a button or link to take action

---

## 8. Dialog Content Guidelines

### When to Use Dialog vs Alternatives
| Scenario | Use |
|----------|-----|
| Destructive action confirmation | Dialog (Alert variant) |
| Complex form requiring full attention | Dialog (Modal) |
| Non-blocking guidance | Dialog (Non-modal) or Popover |
| Supplemental info on hover | Tooltip or Popover |
| Persistent side content | Drawer |

### Content Rules
- **Title:** Verb + noun; sentence-case; describes consequence, not component ("Delete project?" not "Confirmation")
- **Body:** Lead with consequences; 1-2 sentences
- **Primary action:** Matches the consequence ("Delete project" not "OK")
- **Cancel:** Always present; returns user to previous state unchanged

### Anti-Patterns
- Generic titles like "Error" or "Warning" — be specific
- Double negatives in choices ("Don't cancel" vs "Cancel")
- More than 2 actions in footer (primary + cancel only)
- Never nest dialogs
