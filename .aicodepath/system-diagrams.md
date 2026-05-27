# AICodePath System Diagrams

**Version:** v2.5.1 (2026-02-27)

All diagrams use Mermaid syntax.

---

## 1. AIDLC Phase Flow

```mermaid
flowchart LR
    S([Session Start]) --> PF[PRE-FLIGHT\nValidate env\nGather requirements]
    PF --> INC[INCEPTION\nBrainstorm design\nWrite plan]
    INC --> CON[CONSTRUCTION\nTDD implementation\nGICL quality loop]
    CON --> OPS[OPERATIONS\nVerify & deploy\nDebug & maintain]
    OPS -.->|new feature| INC
    OPS -.->|bug| CON
```

---

## 2. 8-Step Skill Chain

```mermaid
flowchart TD
    K[/aicodepath-knowledge\nLoad planning·tasks·knowledge/]
    B[/aicodepath-brainstorm\nDesign — HARD-GATE/]
    P[/aicodepath-write-plan\nTDD-first plan/]
    C[/aicodepath-confidence-check\nScore ≥70%/]
    T[/aicodepath-tdd\nRed-Green-Refactor/]
    G[/aicodepath-gicl-start\nQuality loop score ≥90/]
    V[/aicodepath-verify\nEvidence required/]
    CH[/aicodepath-checkpoint\nSave progress/]

    K --> B --> P --> C --> T --> G --> V --> CH
```

---

## 3. Hook Execution on Write

```mermaid
sequenceDiagram
    participant C as Claude
    participant H1 as schema-context-hook
    participant H2 as guideline-validator
    participant H3 as duplication-checker
    participant FS as File System

    C->>H1: PreToolUse Write (file_path, content)
    H1-->>C: additionalContext (schema)
    C->>H2: PreToolUse Write (file_path, content)
    alt violation found (error)
        H2-->>C: decision: block, exit 2
    else warning
        H2-->>C: systemMessage, exit 1
    else pass
        H2-->>C: exit 0
    end
    C->>H3: PreToolUse Write
    H3-->>C: exit 0|1
    C->>FS: Write file

    FS-->>C: PostToolUse Write
    C->>C: auto-artifact-creator
    C->>C: gicl-iteration-hook (score)
    C->>C: visual-memory-generator
    C->>C: skill-suggesters
```

---

## 4. GICL Score Calculation

```mermaid
pie title GICL Score Weights
    "Tests" : 35
    "Duplication" : 20
    "Guidelines" : 20
    "Architecture" : 15
    "Authenticity" : 10
```

```mermaid
flowchart TD
    Start([Write completes]) --> Check{Active GICL\nsession?}
    Check -->|Yes| Full[Full mode\n5 dimensions]
    Check -->|No| Lite{File size?}
    Lite -->|≤100 LOC| LiteMode[Lite mode\nGuidelines only]
    Lite -->|>100 LOC| Pass[Pass-through\nstart GICL session]
    Full --> Score{Score ≥ 90?}
    Score -->|Yes| Done([Complete])
    Score -->|No| Iter{Max iterations\nor stalled?}
    Iter -->|Yes| Stop([Stop])
    Iter -->|No| Full
```

---

## 5. Component Architecture

```mermaid
graph TB
    subgraph ClaudeCode["Claude Code"]
        CC[Claude LLM]
    end

    subgraph Hooks["Hooks (.aicodepath/hooks/)"]
        SSH[session-start-hook]
        GV[guideline-validator]
        SCH[schema-context-hook]
        GIH[gicl-iteration-hook]
        PRA[plan-role-activator]
    end

    subgraph Libs["Core Libs (.aicodepath/lib/)"]
        FF[feature-flags]
        PC[pricing-calculator]
        GSM[gicl-session-manager]
        GSC[gicl-score-calculator]
        PR[path-resolver]
    end

    subgraph Data["Data Layer"]
        DB[(SQLite DB)]
        KF[knowledge files\nplanning·tasks·knowledge]
        CP[checkpoints/]
        SCF[.claude/rules/\nschema-context.md]
    end

    subgraph Dashboard["Dashboard (port 3899)"]
        API[API Server]
        WS[WebSocket]
        UI[React/Vite UI]
    end

    CC --> Hooks
    Hooks --> Libs
    Libs --> Data
    Libs --> Dashboard
    WS -.->|real-time| UI
```

---

## 6. Agent Activation Flow

```mermaid
flowchart LR
    V[Guideline violation] --> AS[agent-suggester.js]
    AS --> CN[CATEGORY_NORMALIZATION\n50+ entries]
    CN --> DM[DOMAIN_MAPPING\n95 entries]
    DM --> AR[agent-registry.js\nsingleton cache]
    AR --> A[Suggested Agent\nadditionalContext]
```

---

## 7. Feature Flag Priority

```mermaid
flowchart TD
    Q{isEnabled\nfeature-name} --> CLI{CLI override?}
    CLI -->|Yes| R1[Return override]
    CLI -->|No| CFG{config.json\nfeatures.flags?}
    CFG -->|Yes| R2[Return config value]
    CFG -->|No| ENV{Env var set?}
    ENV -->|Yes| R3[Return env value]
    ENV -->|No| R4[Return default]
```

---

## 8. DB Entity Overview

```mermaid
erDiagram
    gicl_sessions {
        text id PK
        text phase
        text unit_name
        integer target_score
        real total_cost_usd
    }
    gicl_iterations {
        integer id PK
        text session_id FK
        integer score
        real cost_usd
        integer input_tokens
    }
    reflexion_patterns {
        integer id PK
        text error_pattern
        text resolution
        integer helpful_count
    }
    ai_sessions {
        text id PK
        text adapter_id
        text project_path
    }
    ai_messages {
        integer id PK
        text session_id FK
        text role
        text content
    }
    cost_summary {
        integer id PK
        text period
        real total_cost_usd
    }

    gicl_sessions ||--o{ gicl_iterations : has
    ai_sessions ||--o{ ai_messages : contains
```

---

## 9. Dashboard Data Flow

```mermaid
sequenceDiagram
    participant B as Browser (3899)
    participant V as Vite Dev Server
    participant A as API Server (3888)
    participant DB as SQLite
    participant WS as WebSocket

    B->>V: HTTP request
    V->>A: Proxy /api/*
    A->>DB: Query
    DB-->>A: Results
    A-->>B: JSON response

    Note over WS,B: Real-time events
    WS-->>B: gicl_iteration_complete
    WS-->>B: agent_update
    WS-->>B: cost_update
```
