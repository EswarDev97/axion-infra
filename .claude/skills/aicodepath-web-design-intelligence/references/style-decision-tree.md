# Style Decision Tree

The full decision flow for selecting a visual style. Extracted from SKILL.md Step 2 with
additional edge cases and fall-through logic.

---

## Full Decision Flow

```
START
│
├── 1. Compatibility Gate
│   │
│   ├── @fluentui/react-components in package.json?
│   │   YES → STOP. Defer to aicodepath-fluent-design.
│   │   NO  → continue
│   │
│   └── Microsoft Teams / Fluent context detected (FluentProvider, Griffel)?
│       YES → STOP. Defer to aicodepath-fluent-design.
│       NO  → continue
│
├── 2. Explicit Style Request
│   │
│   └── User said a specific style by name?
│       ("glassmorphism dashboard", "make it brutalist")
│       │
│       YES → Use that style.
│           │
│           ├── Validate against the domain. If poor fit (e.g., Neubrutalism for banking):
│           │   • Use it anyway (user preference wins)
│           │   • Warn about domain mismatch with severity
│           │   • Suggest the safer alternative for next time
│           │
│           └── Load references/styles/<style>.md scaffold
│
│       NO → continue
│
├── 3. Clear Domain + Intent
│   │
│   └── User's product type is clear?
│       ("build me a fintech landing page", "design a healthcare dashboard")
│       │
│       YES → Consult Domain→Style Mapping table in SKILL.md
│           │
│           ├── Domain present in table? → Use primary recommendation
│           │                               Present 1-2 alternatives
│           │
│           └── Domain NOT in table? → Run reasoning engine:
│                                       python3 scripts/search.py "<domain keywords>" \
│                                         --design-system -p "<Product Name>"
│
│       NO → continue to interview
│
├── 4. Two-Tier Interview
│   │
│   ├── Q1 — Domain & Purpose (always ask)
│   │   "What type of product is this for?"
│   │   Options: SaaS / E-commerce / Fintech / Healthcare / Portfolio /
│   │            Restaurant / Dashboard / Education / Gaming / Other
│   │
│   ├── Q2 — Visual Direction / Mood (always ask)
│   │   "What visual feel are you going for?"
│   │   Options:
│   │     A. Clean & Minimal       → Minimalism / Bento Grid / Swiss
│   │     B. Soft & Dimensional    → Glassmorphism / Neumorphism / Claymorphism
│   │     C. Bold & Raw            → Neubrutalism / Brutalism / Editorial / Memphis
│   │     D. Dark & Premium        → Dark Mode (OLED) / Cyberpunk / Gradient Mesh
│   │     E. Playful & Fun         → Claymorphism / Memphis / Y2K / Vaporwave
│   │     F. Tactile & Realistic   → Skeuomorphism (Modern) / 3D & Hyperrealism / HUD
│   │
│   └── Q3 — Specific Style (ONLY if user wants to drill in)
│       Offer the 3-4 styles for the chosen mood (see Q2 mapping above).
│       If user says "surprise me" or "you decide", skip Q3 and auto-pick
│       using Domain→Style Mapping.
│
└── 5. Assemble & Present
    │
    ├── Load scaffold from references/styles/<style>.md (if specific style picked)
    ├── Query data/colors.csv for industry-matched palette (10 roles)
    ├── Query data/typography.csv for mood-matched font pairing
    ├── Query data/landing.csv for section order pattern
    ├── Query data/ux-guidelines.csv for domain-specific anti-patterns
    ├── Reference references/motion-patterns.md for animation strategy
    └── Output using Design Brief format from SKILL.md Step 6
```

---

## Edge Case: User Says "Make It Look Modern"

"Modern" is ambiguous. Ask Q2 (mood) before picking:
- "Modern for SaaS" usually means **Glassmorphism** or **Bento Grid**
- "Modern for portfolio" usually means **Neubrutalism** or **Dark Mode Premium**
- "Modern for healthcare" usually means **Minimalism** (with accessible rules)
- "Modern for crypto/DeFi" usually means **Cyberpunk** or **Dark Mode Premium**

Never assume "modern = glassmorphism" — it's the most overused default for SaaS but wrong
for every other domain.

---

## Edge Case: User Says "Just Make It Look Better"

The user has an existing interface and wants polish. Before recommending a style:

1. **Ask what's NOT working**: "What feels off about the current design?"
   - "Feels dated" → likely wants a modern trend (Glass/Bento/Dark Mode)
   - "Too busy" → likely wants Minimalism
   - "Too generic" → likely wants Neubrutalism or Claymorphism
   - "Not professional enough" → likely wants Swiss Minimalism or Corporate Solid

2. **Read the existing code** to identify what's already in place — don't recommend a style
   that contradicts the existing framework choices.

3. **Offer 2-3 refinements** rather than a full style change unless the user explicitly asks
   for one. Style changes have high implementation cost.

---

## Edge Case: Domain Not in Mapping Table

The Domain→Style Mapping in SKILL.md covers ~30 common domains. For anything else:

```bash
# Let the reasoning engine (161 product categories) decide
python3 scripts/search.py "<describe the product in 3-5 words>" \
    --design-system -p "<Product Name>" -f markdown
```

Examples:
```bash
python3 scripts/search.py "autonomous drone fleet management" --design-system -p "AeroHive"
python3 scripts/search.py "medication reminder app for elderly" --design-system -p "PillPal"
python3 scripts/search.py "indie game studio portfolio" --design-system -p "PixelForge"
```

If the reasoning engine also returns no match, use the closest mood-based style from Q2 and
document the adaptation in the Design Brief.

---

## Edge Case: Multiple Domains (e.g., "SaaS + Fintech")

Rank the domains by which is more defining:
1. **Primary** — the user-facing product category
2. **Secondary** — the industry vertical

For "SaaS + Fintech" (a fintech SaaS):
- Primary (SaaS) suggests Glassmorphism or Bento Grid
- Secondary (Fintech) prefers Dark Mode Premium with navy/gold

**Resolution**: Use the secondary (Fintech Dark Premium) because trust is more important than
the SaaS archetype for financial products. Source `ui-reasoning.csv` row 1 (SaaS General) vs
row 91 (Personal Finance) shows the same pattern — finance overrides the generic SaaS default.

---

## Edge Case: Reasoning Engine Output Contradicts Domain Table

This happens. For example:
- Table says `Healthcare → Minimalism`
- Engine says `Healthcare App → Neumorphism + Accessible & Ethical`

**Resolution**:
1. Present both to the user with an honest comparison
2. Explain the trade-off: table = curated safe default; engine = research-backed nuanced
3. Let the user choose

When both fail to agree AND the user has no preference, default to the safer option for the
domain:
- Healthcare / legal / fintech → safer (table's Minimalism)
- Creative / gaming / entertainment → bolder (engine's nuanced pick)
