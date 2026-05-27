-- ============================================================================
-- AICodePath Knowledge Base - Consolidated Schema
-- ============================================================================
-- SQLite with WAL mode, FTS5, and JSON1
-- Includes: Core tables, WebSocket events, Frontend-designer integration
-- Version: 3.0 (Consolidated with all migrations 2026-02-09)
-- ============================================================================

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Artifacts: All documentation, code, and design artifacts
CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identity
    artifact_type TEXT NOT NULL,  -- 'requirement', 'story', 'design', 'code', 'test', 'decision', 'plan'
    phase TEXT NOT NULL,          -- 'inception', 'construction', 'operations'
    stage TEXT,                   -- 'requirements-analysis', 'code-generation', etc.
    unit TEXT,                    -- Unit name if applicable

    -- Content
    title TEXT NOT NULL,
    content TEXT,                 -- Markdown content
    file_path TEXT,               -- Path to source file

    -- Metadata (flexible JSON)
    metadata JSON DEFAULT '{}',

    -- Change Request tracking
    cr_number TEXT NOT NULL DEFAULT 'CR-LEGACY',

    -- Tracking
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active', -- 'active', 'archived', 'superseded'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_phase ON artifacts(phase);
CREATE INDEX IF NOT EXISTS idx_artifacts_stage ON artifacts(stage);
CREATE INDEX IF NOT EXISTS idx_artifacts_unit ON artifacts(unit);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_file_path ON artifacts(file_path);
CREATE INDEX IF NOT EXISTS idx_artifacts_cr ON artifacts(cr_number);
CREATE INDEX IF NOT EXISTS idx_artifacts_cr_phase ON artifacts(cr_number, phase);

-- Full-text search on artifacts
CREATE VIRTUAL TABLE IF NOT EXISTS artifacts_fts USING fts5(
    title,
    content,
    cr_number,
    content=artifacts,
    content_rowid=id,
    tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS artifacts_ai AFTER INSERT ON artifacts BEGIN
    INSERT INTO artifacts_fts(rowid, title, content, cr_number)
    VALUES (NEW.id, NEW.title, NEW.content, NEW.cr_number);
END;

CREATE TRIGGER IF NOT EXISTS artifacts_ad AFTER DELETE ON artifacts BEGIN
    INSERT INTO artifacts_fts(artifacts_fts, rowid, title, content, cr_number)
    VALUES ('delete', OLD.id, OLD.title, OLD.content, OLD.cr_number);
END;

CREATE TRIGGER IF NOT EXISTS artifacts_au AFTER UPDATE ON artifacts BEGIN
    INSERT INTO artifacts_fts(artifacts_fts, rowid, title, content, cr_number)
    VALUES ('delete', OLD.id, OLD.title, OLD.content, OLD.cr_number);
    INSERT INTO artifacts_fts(rowid, title, content, cr_number)
    VALUES (NEW.id, NEW.title, NEW.content, NEW.cr_number);
END;

-- ============================================================================
-- WEBSOCKET EVENTS (Real-Time Streaming System)
-- ============================================================================

-- Store history of all WebSocket events for replay and audit trail
CREATE TABLE IF NOT EXISTS websocket_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,        -- 'agent:logs', 'agent:status', 'agent:progress', 'agent:artifact'
    event_type TEXT NOT NULL,     -- 'log', 'status_change', 'progress_update', 'artifact_created'
    data JSON NOT NULL,           -- Event payload (structured JSON)
    session_id TEXT,              -- Optional session grouping for multi-agent scenarios
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient channel-based queries with time filtering
CREATE INDEX IF NOT EXISTS idx_websocket_events_channel_time ON websocket_events(channel, created_at);

-- Track current agent state (singleton table, always 1 row)
CREATE TABLE IF NOT EXISTS agent_status (
    id INTEGER PRIMARY KEY,
    session_id TEXT UNIQUE,       -- Current active session ID
    status TEXT NOT NULL,         -- 'idle', 'running', 'paused', 'crashed'
    current_task TEXT,            -- What agent is currently working on
    progress_percentage INTEGER DEFAULT 0,  -- 0-100
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize with default idle status (only if table is empty)
INSERT OR IGNORE INTO agent_status (id, session_id, status, current_task, progress_percentage)
VALUES (1, NULL, 'idle', NULL, 0);

-- ============================================================================
-- FRONTEND-DESIGNER INTEGRATION
-- ============================================================================

-- User Expertise Profile
-- Stores user expertise levels and preferences across disciplines
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    project_type TEXT NOT NULL, -- 'fullstack', 'frontend', 'backend', 'mobile', 'data-ml', 'devops'
    relevant_disciplines TEXT NOT NULL, -- JSON array: ["frontend", "database", "devops"]
    expertise_json TEXT NOT NULL, -- JSON: {"frontend": "beginner", "database": "intermediate"}
    preferences_json TEXT, -- JSON: {"designSystem": "tailwind", "createDesignSystem": true}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profile_session ON user_profile(session_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_project_type ON user_profile(project_type);

-- Design System Documentation
-- Stores design system tokens and component libraries
CREATE TABLE IF NOT EXISTS design_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'custom', 'tailwind', 'material-ui', 'ant-design', 'bootstrap', 'chakra-ui'
    tokens_json TEXT NOT NULL, -- JSON: Design tokens (colors, typography, spacing, etc.)
    components_json TEXT, -- JSON: Component library documentation
    documentation_path TEXT, -- Path to design docs (e.g., docs/design/tokens.md)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_design_systems_project ON design_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_design_systems_type ON design_systems(type);

-- Design Violations History
-- Tracks design system violations found during reviews
CREATE TABLE IF NOT EXISTS design_violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    component_file TEXT NOT NULL, -- Path to component file
    violation_type TEXT NOT NULL, -- 'design-token', 'accessibility', 'component-pattern', 'responsive'
    severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
    category TEXT NOT NULL, -- Specific sub-category: 'color', 'spacing', 'aria-label', etc.
    message TEXT NOT NULL, -- Human-readable violation message
    line_number INTEGER, -- Line number where violation occurs
    expected_value TEXT, -- Expected value (e.g., "px-4 py-2")
    found_value TEXT, -- Actual value found (e.g., "px-3 py-2")
    suggestion TEXT, -- Suggested fix
    was_fixed BOOLEAN DEFAULT 0, -- Whether the violation was fixed
    fixed_at DATETIME, -- When the fix was applied
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_design_violations_session ON design_violations(session_id);
CREATE INDEX IF NOT EXISTS idx_design_violations_severity ON design_violations(severity);
CREATE INDEX IF NOT EXISTS idx_design_violations_type ON design_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_design_violations_fixed ON design_violations(was_fixed);

-- Frontend-Designer Session Log
-- Tracks frontend-designer skill usage and effectiveness
CREATE TABLE IF NOT EXISTS frontend_designer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    mode TEXT NOT NULL, -- 'guided', 'validation', 'manual'
    design_system_id INTEGER, -- Reference to design_systems.id
    components_scanned INTEGER DEFAULT 0, -- Number of components scanned
    violations_found INTEGER DEFAULT 0, -- Total violations found
    violations_fixed INTEGER DEFAULT 0, -- Violations that were fixed
    violations_skipped INTEGER DEFAULT 0, -- Violations user chose to skip
    duration_seconds INTEGER, -- How long the session took
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (design_system_id) REFERENCES design_systems(id)
);

CREATE INDEX IF NOT EXISTS idx_frontend_designer_sessions_session ON frontend_designer_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_frontend_designer_sessions_mode ON frontend_designer_sessions(mode);

-- Triggers for Automatic Timestamp Updates
CREATE TRIGGER IF NOT EXISTS update_user_profile_timestamp
    AFTER UPDATE ON user_profile
    FOR EACH ROW
    BEGIN
        UPDATE user_profile SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_design_systems_timestamp
    AFTER UPDATE ON design_systems
    FOR EACH ROW
    BEGIN
        UPDATE design_systems SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- ============================================================================
-- TRACEABILITY LINKS
-- ============================================================================

-- Links between artifacts (implements, derived_from, tests, blocks, etc.)
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    link_type TEXT NOT NULL,      -- 'implements', 'derived_from', 'tests', 'blocks', 'relates_to'
    description TEXT,
    confidence REAL DEFAULT 1.0,  -- 0.0-1.0 confidence in the link
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system',

    FOREIGN KEY (source_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    UNIQUE(source_id, target_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
CREATE INDEX IF NOT EXISTS idx_links_type ON links(link_type);

-- ============================================================================
-- DECISIONS LOG
-- ============================================================================

-- Architectural and design decisions
CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artifact_id INTEGER,          -- Related artifact (optional)

    -- Decision details
    title TEXT NOT NULL,
    decision TEXT NOT NULL,
    rationale TEXT,
    alternatives JSON,            -- Array of alternative options considered
    consequences TEXT,

    -- Classification
    category TEXT,                -- 'architecture', 'technology', 'design', 'process'
    scope TEXT,                   -- 'project', 'unit', 'component'
    impact TEXT,                  -- 'high', 'medium', 'low'

    -- Tracking
    status TEXT DEFAULT 'accepted', -- 'proposed', 'accepted', 'deprecated', 'superseded'
    decided_by TEXT,
    decided_at TEXT DEFAULT (datetime('now')),
    superseded_by INTEGER,

    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL,
    FOREIGN KEY (superseded_by) REFERENCES decisions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_decisions_artifact ON decisions(artifact_id);
CREATE INDEX IF NOT EXISTS idx_decisions_category ON decisions(category);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- FTS for decisions
CREATE VIRTUAL TABLE IF NOT EXISTS decisions_fts USING fts5(
    title,
    decision,
    rationale,
    content=decisions,
    content_rowid=id,
    tokenize='porter unicode61'
);

-- ============================================================================
-- SESSION STATE
-- ============================================================================

-- Current session state for multi-context continuity
CREATE TABLE IF NOT EXISTS session_state (
    key TEXT PRIMARY KEY,
    value JSON NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Session history for resumption
CREATE TABLE IF NOT EXISTS session_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    phase TEXT,
    stage TEXT,
    unit TEXT,
    action TEXT,
    details JSON,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_session_history_session ON session_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_timestamp ON session_history(timestamp);

-- ============================================================================
-- CODE ENTITIES
-- ============================================================================

-- Code entities for cross-referencing
CREATE TABLE IF NOT EXISTS code_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identity
    entity_type TEXT NOT NULL,    -- 'class', 'function', 'interface', 'type', 'table', 'index', 'module', 'method', 'endpoint', etc.
    name TEXT NOT NULL,
    qualified_name TEXT,          -- Full path (e.g., 'src/services/UserService.ts:UserService')
    language TEXT,                -- 'typescript', 'python', 'sql', 'javascript', 'unknown'

    -- Location
    file_path TEXT NOT NULL,
    line_start INTEGER,
    line_end INTEGER,

    -- Content
    signature TEXT,               -- Function signature, class declaration, etc.
    body TEXT,                    -- Full body content (for fingerprinting)
    documentation TEXT,           -- JSDoc, docstring, etc.

    -- Fingerprints (for duplication detection)
    entity_hash TEXT,             -- SHA-256 of normalized content (exact duplication)
    token_hash TEXT,              -- JSON array of tokens (near duplication via Jaccard)
    structural_hash TEXT,         -- Control flow signature hash (structural clones)
    file_hash TEXT,               -- Hash of file content (for incremental indexing)

    -- Analysis
    complexity INTEGER,           -- Cyclomatic complexity
    dependencies JSON,            -- Array of dependencies
    exported BOOLEAN DEFAULT 0,   -- Is exported/public
    is_test BOOLEAN DEFAULT 0,    -- Is a test entity (test_*, *_test, *Test*, *_spec)

    -- Metadata
    metadata JSON,                -- Flexible metadata (decorators, params, etc.)

    -- Change Request tracking
    cr_number TEXT NOT NULL DEFAULT 'CR-LEGACY',

    -- Tracking
    artifact_id INTEGER,          -- Link to artifact (if generated)
    indexed_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_code_entities_type ON code_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_code_entities_name ON code_entities(name);
CREATE INDEX IF NOT EXISTS idx_code_entities_file ON code_entities(file_path);
CREATE INDEX IF NOT EXISTS idx_code_entities_language ON code_entities(language);
CREATE INDEX IF NOT EXISTS idx_code_entities_entity_hash ON code_entities(entity_hash);
CREATE INDEX IF NOT EXISTS idx_code_entities_structural_hash ON code_entities(structural_hash);
CREATE INDEX IF NOT EXISTS idx_code_entities_exported ON code_entities(exported);
CREATE INDEX IF NOT EXISTS idx_code_entities_cr ON code_entities(cr_number);
CREATE INDEX IF NOT EXISTS idx_code_entities_cr_type ON code_entities(cr_number, entity_type);

-- FTS for code entities
CREATE VIRTUAL TABLE IF NOT EXISTS code_entities_fts USING fts5(
    name,
    qualified_name,
    documentation,
    cr_number,
    content=code_entities,
    content_rowid=id,
    tokenize='porter unicode61'
);

-- Code entities FTS triggers
CREATE TRIGGER IF NOT EXISTS code_entities_ai AFTER INSERT ON code_entities BEGIN
    INSERT INTO code_entities_fts(rowid, name, qualified_name, documentation, cr_number)
    VALUES (new.id, new.name, new.qualified_name, new.documentation, new.cr_number);
END;

CREATE TRIGGER IF NOT EXISTS code_entities_ad AFTER DELETE ON code_entities BEGIN
    INSERT INTO code_entities_fts(code_entities_fts, rowid, name, qualified_name, documentation, cr_number)
    VALUES ('delete', old.id, old.name, old.qualified_name, old.documentation, old.cr_number);
END;

CREATE TRIGGER IF NOT EXISTS code_entities_au AFTER UPDATE ON code_entities BEGIN
    INSERT INTO code_entities_fts(code_entities_fts, rowid, name, qualified_name, documentation, cr_number)
    VALUES ('delete', old.id, old.name, old.qualified_name, old.documentation, old.cr_number);
    INSERT INTO code_entities_fts(rowid, name, qualified_name, documentation, cr_number)
    VALUES (new.id, new.name, new.qualified_name, new.documentation, new.cr_number);
END;

-- ============================================================================
-- CODE RELATIONS (for indexer)
-- ============================================================================

-- Relations between code entities (imports, extends, implements, etc.)
CREATE TABLE IF NOT EXISTS code_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity_id INTEGER,
    to_entity_id INTEGER,
    from_entity_name TEXT,         -- Name when entity not yet in DB
    to_entity_name TEXT,           -- Name when entity not yet in DB
    relation_type TEXT NOT NULL,   -- 'imports', 'extends', 'implements', 'calls', 'references', 'has_method', 'has_index'
    metadata JSON,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (from_entity_id) REFERENCES code_entities(id) ON DELETE CASCADE,
    FOREIGN KEY (to_entity_id) REFERENCES code_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_code_relations_from ON code_relations(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_code_relations_to ON code_relations(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_code_relations_type ON code_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_code_relations_from_name ON code_relations(from_entity_name);
CREATE INDEX IF NOT EXISTS idx_code_relations_to_name ON code_relations(to_entity_name);

-- ============================================================================
-- DUPLICATION FINDINGS (for indexer)
-- ============================================================================

-- Store duplication detection results
CREATE TABLE IF NOT EXISTS duplication_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER,
    duplicate_entity_id INTEGER,
    entity_name TEXT,              -- For reference when entity not in DB
    duplicate_entity_name TEXT,
    file_path TEXT,
    duplicate_file_path TEXT,
    similarity_score INTEGER,      -- 0-100 (100 = exact duplicate)
    duplication_type TEXT,         -- 'exact', 'near', 'structural'
    status TEXT DEFAULT 'detected', -- 'detected', 'reviewed', 'resolved', 'accepted'
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (entity_id) REFERENCES code_entities(id) ON DELETE CASCADE,
    FOREIGN KEY (duplicate_entity_id) REFERENCES code_entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_duplication_entity ON duplication_findings(entity_id);
CREATE INDEX IF NOT EXISTS idx_duplication_duplicate ON duplication_findings(duplicate_entity_id);
CREATE INDEX IF NOT EXISTS idx_duplication_type ON duplication_findings(duplication_type);
CREATE INDEX IF NOT EXISTS idx_duplication_score ON duplication_findings(similarity_score);
CREATE INDEX IF NOT EXISTS idx_duplication_status ON duplication_findings(status);
CREATE INDEX IF NOT EXISTS idx_duplication_file ON duplication_findings(file_path);

-- ============================================================================
-- VALIDATION RESULTS
-- ============================================================================

-- Store validation and quality check results
CREATE TABLE IF NOT EXISTS validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Target
    artifact_id INTEGER,
    file_path TEXT,

    -- Validation type
    validation_type TEXT NOT NULL, -- 'guideline', 'authenticity', 'duplication', 'security'

    -- Results
    score INTEGER,
    status TEXT,                  -- 'PASS', 'REVIEW', 'FAIL'
    violations JSON,              -- Array of violations

    -- Tracking
    validated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_validations_artifact ON validations(artifact_id);
CREATE INDEX IF NOT EXISTS idx_validations_type ON validations(validation_type);
CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(status);

-- ============================================================================
-- WORKFLOW STATE
-- ============================================================================

-- Track workflow execution state
CREATE TABLE IF NOT EXISTS workflow_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Context
    cr_number TEXT,
    phase TEXT NOT NULL,
    stage TEXT NOT NULL,
    unit TEXT,

    -- State
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped', 'blocked'
    started_at TEXT,
    completed_at TEXT,

    -- Progress
    steps_total INTEGER DEFAULT 0,
    steps_completed INTEGER DEFAULT 0,

    -- Artifacts produced
    artifacts_created JSON,       -- Array of artifact IDs

    -- Notes
    notes TEXT,
    blockers JSON
);

CREATE INDEX IF NOT EXISTS idx_workflow_phase ON workflow_state(phase);
CREATE INDEX IF NOT EXISTS idx_workflow_stage ON workflow_state(stage);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_state(status);
CREATE INDEX IF NOT EXISTS idx_workflow_state_unit ON workflow_state(unit);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Requirements traceability view
CREATE VIEW IF NOT EXISTS v_requirements_traceability AS
SELECT
    r.id AS requirement_id,
    r.title AS requirement_title,
    s.id AS story_id,
    s.title AS story_title,
    d.id AS design_id,
    d.title AS design_title,
    c.id AS code_id,
    c.title AS code_title,
    t.id AS test_id,
    t.title AS test_title
FROM artifacts r
LEFT JOIN links l1 ON r.id = l1.source_id AND l1.link_type = 'derived_from'
LEFT JOIN artifacts s ON l1.target_id = s.id AND s.artifact_type = 'story'
LEFT JOIN links l2 ON s.id = l2.source_id AND l2.link_type = 'implements'
LEFT JOIN artifacts d ON l2.target_id = d.id AND d.artifact_type = 'design'
LEFT JOIN links l3 ON d.id = l3.source_id AND l3.link_type = 'implements'
LEFT JOIN artifacts c ON l3.target_id = c.id AND c.artifact_type = 'code'
LEFT JOIN links l4 ON c.id = l4.source_id AND l4.link_type = 'tests'
LEFT JOIN artifacts t ON l4.target_id = t.id AND t.artifact_type = 'test'
WHERE r.artifact_type = 'requirement';

-- Recent decisions view
CREATE VIEW IF NOT EXISTS v_recent_decisions AS
SELECT
    d.*,
    a.title AS artifact_title,
    a.file_path AS artifact_path
FROM decisions d
LEFT JOIN artifacts a ON d.artifact_id = a.id
ORDER BY d.decided_at DESC
LIMIT 50;

-- Workflow progress view
CREATE VIEW IF NOT EXISTS v_workflow_progress AS
SELECT
    phase,
    COUNT(*) AS total_stages,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
    ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 1) AS completion_percent
FROM workflow_state
GROUP BY phase;

-- Frontend-Designer: User expertise summary
CREATE VIEW IF NOT EXISTS v_user_expertise_summary AS
SELECT
    session_id,
    project_type,
    json_each.key AS discipline,
    json_each.value AS expertise_level,
    created_at,
    updated_at
FROM user_profile, json_each(user_profile.expertise_json);

-- Frontend-Designer: Violation summary by session
CREATE VIEW IF NOT EXISTS v_violation_summary AS
SELECT
    session_id,
    COUNT(*) as total_violations,
    SUM(CASE WHEN was_fixed = 1 THEN 1 ELSE 0 END) as fixed_violations,
    SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
    SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_count,
    SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_count,
    SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_count
FROM design_violations
GROUP BY session_id;

-- Frontend-Designer: Session effectiveness
CREATE VIEW IF NOT EXISTS v_session_effectiveness AS
SELECT
    session_id,
    mode,
    components_scanned,
    violations_found,
    violations_fixed,
    violations_skipped,
    ROUND(
        CASE
            WHEN violations_found > 0 THEN
                CAST(violations_fixed AS REAL) / violations_found * 100
            ELSE 0
        END,
        2
    ) as fix_rate_percent,
    duration_seconds,
    created_at
FROM frontend_designer_sessions;

-- ============================================================================
-- COMPATIBILITY VIEWS
-- ============================================================================

-- Audit log view: Backwards compatibility for code expecting 'audit_log' table
-- The 'decisions' table serves as the audit trail for all architectural decisions
CREATE VIEW IF NOT EXISTS audit_log AS
SELECT
    id,
    title,
    decision AS action,
    rationale,
    category AS decision_type,
    impact AS impact_level,
    status,
    decided_by AS decision_maker,
    decided_at AS timestamp,
    artifact_id,
    scope
FROM decisions;

-- ============================================================================
-- AGENT SYSTEM & CONTEXT MANAGEMENT
-- ============================================================================

-- Context usage tracking
-- Tracks token usage per agent invocation for context optimization
CREATE TABLE IF NOT EXISTS context_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    model_name TEXT,              -- 'claude-sonnet-4', 'gpt-4', etc.
    threshold_status TEXT NOT NULL, -- 'safe', 'warning', 'critical', 'exceeded'
    compaction_triggered BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_context_usage_agent ON context_usage(agent_name);
CREATE INDEX IF NOT EXISTS idx_context_usage_status ON context_usage(threshold_status);
CREATE INDEX IF NOT EXISTS idx_context_usage_timestamp ON context_usage(timestamp);

-- Agent execution history
-- Tracks all agent invocations for analytics and debugging
CREATE TABLE IF NOT EXISTS agent_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    task_description TEXT,
    output_path TEXT,
    tokens_used INTEGER,
    duration_ms INTEGER,
    status TEXT NOT NULL,         -- 'success', 'failure', 'timeout'
    error_message TEXT,
    metadata JSON,                -- Additional execution metadata
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_name ON agent_executions(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_timestamp ON agent_executions(timestamp);

-- GICL feature tracking
-- Tracks feature completion progress for requirements-driven loop
CREATE TABLE IF NOT EXISTS gicl_feature_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_name TEXT NOT NULL,
    design_doc_path TEXT,         -- Path to LLD/HLD/PRD with success criteria
    total_criteria INTEGER DEFAULT 0,
    completed_criteria INTEGER DEFAULT 0,
    progress_percentage REAL DEFAULT 0.0,
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'complete', 'blocked'
    blocker_description TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gicl_feature_name ON gicl_feature_tracking(feature_name);
CREATE INDEX IF NOT EXISTS idx_gicl_feature_status ON gicl_feature_tracking(status);

-- GICL suggestions
-- Agent suggestions based on quality gates and incomplete requirements
CREATE TABLE IF NOT EXISTS gicl_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER,
    suggestion_type TEXT NOT NULL, -- 'quality_gate', 'missing_requirement'
    requirement_text TEXT,        -- The incomplete requirement
    violation_message TEXT,       -- Quality gate violation message
    severity TEXT,                -- 'critical', 'high', 'medium', 'low'
    suggested_agents TEXT NOT NULL, -- JSON array of agent names
    file_path TEXT,               -- Related file
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'dismissed', 'completed'
    accepted_agent TEXT,          -- Which agent was actually invoked
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feature_id) REFERENCES gicl_feature_tracking(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gicl_suggestions_feature ON gicl_suggestions(feature_id);
CREATE INDEX IF NOT EXISTS idx_gicl_suggestions_type ON gicl_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_gicl_suggestions_status ON gicl_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_gicl_suggestions_severity ON gicl_suggestions(severity);

-- ============================================================================
-- GICL SESSION & ITERATION TRACKING (Migration 009)
-- ============================================================================
-- aicodepath: allow-duplication (same DDL as migration 009 - intentional)

CREATE TABLE IF NOT EXISTS gicl_sessions (
    id TEXT PRIMARY KEY,
    unit_name TEXT,
    target_file TEXT,
    description TEXT,
    complexity TEXT DEFAULT 'moderate',
    max_iterations INTEGER DEFAULT 7,
    current_iteration INTEGER DEFAULT 0,
    status TEXT DEFAULT 'initialized',
    stop_reason TEXT,
    final_score REAL,
    config JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    total_cost_usd REAL DEFAULT 0.0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gicl_iterations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    iteration_number INTEGER NOT NULL,
    test_score REAL,
    guideline_score REAL,
    architecture_score REAL,
    duplication_score REAL,
    authenticity_score REAL,
    final_score REAL NOT NULL,
    violations_count INTEGER DEFAULT 0,
    incomplete_requirements_count INTEGER DEFAULT 0,
    violations JSON,
    suggestions JSON,
    fix_plan TEXT,
    file_path TEXT,
    duration_ms INTEGER,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    model_id TEXT,
    cost_usd REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gicl_sessions(id) ON DELETE CASCADE,
    UNIQUE(session_id, iteration_number)
);

CREATE INDEX IF NOT EXISTS idx_gicl_sessions_status ON gicl_sessions(status);
CREATE INDEX IF NOT EXISTS idx_gicl_sessions_created ON gicl_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_gicl_sessions_target ON gicl_sessions(target_file);
CREATE INDEX IF NOT EXISTS idx_gicl_iterations_session ON gicl_iterations(session_id);
CREATE INDEX IF NOT EXISTS idx_gicl_iterations_score ON gicl_iterations(final_score);


-- ============================================================================
-- ============================================================================
-- MULTI-AGENT ORCHESTRATION (Migration 004)
-- ============================================================================

-- Unit definition (smallest schedulable work item)
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, ready, in_progress, completed, failed, blocked
  priority INTEGER DEFAULT 0,
  estimated_effort INTEGER, -- in minutes
  actual_effort INTEGER,
  assigned_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

-- Unit dependencies (DAG edges)
CREATE TABLE IF NOT EXISTS unit_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL,
  depends_on_unit_id INTEGER NOT NULL,
  dependency_type TEXT DEFAULT 'blocks', -- blocks (hard), soft (advisory)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_unit_id) REFERENCES units(id) ON DELETE CASCADE,
  UNIQUE(unit_id, depends_on_unit_id)
);

-- Orchestration runs (tracks parallel execution attempts)
CREATE TABLE IF NOT EXISTS orchestration_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'initializing', -- initializing, running, paused, completed, failed
  max_concurrency INTEGER DEFAULT 3,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  total_units INTEGER DEFAULT 0,
  completed_units INTEGER DEFAULT 0,
  failed_units INTEGER DEFAULT 0
);

-- Unit execution log (one record per unit × run × agent)
CREATE TABLE IF NOT EXISTS unit_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL,
  orchestration_run_id INTEGER NOT NULL,
  agent_index INTEGER,
  agent_name TEXT,
  status TEXT DEFAULT 'running', -- running, completed, failed
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  exit_code INTEGER,
  error_message TEXT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (orchestration_run_id) REFERENCES orchestration_runs(id) ON DELETE CASCADE
);

-- Indexes for orchestration
CREATE INDEX IF NOT EXISTS idx_units_session ON units(session_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_name ON units(name);
CREATE INDEX IF NOT EXISTS idx_units_priority ON units(priority DESC);
CREATE INDEX IF NOT EXISTS idx_unit_deps_unit ON unit_dependencies(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_deps_depends ON unit_dependencies(depends_on_unit_id);
CREATE INDEX IF NOT EXISTS idx_orch_runs_session ON orchestration_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_orch_runs_status ON orchestration_runs(status);
CREATE INDEX IF NOT EXISTS idx_unit_exec_unit ON unit_executions(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_exec_run ON unit_executions(orchestration_run_id);
CREATE INDEX IF NOT EXISTS idx_unit_exec_status ON unit_executions(status);

-- ============================================================================
-- ENHANCED CHECKPOINTS (Migration 005)
-- ============================================================================

-- File snapshots for checkpoints
CREATE TABLE IF NOT EXISTS checkpoint_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checkpoint_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'create', 'modify', 'delete'
    content_before BLOB,
    content_after BLOB,
    hash_before TEXT,
    hash_after TEXT,
    diff_patch TEXT,
    file_size_before INTEGER DEFAULT 0,
    file_size_after INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(checkpoint_id, file_path)
);

-- Conversation history for checkpoints
CREATE TABLE IF NOT EXISTS checkpoint_conversation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checkpoint_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    tool_calls TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
);

-- Rollback history
CREATE TABLE IF NOT EXISTS rollback_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checkpoint_id TEXT NOT NULL,
    rollback_type TEXT NOT NULL, -- 'code', 'conversation', 'both'
    files_reverted INTEGER DEFAULT 0,
    conversation_turns_reverted INTEGER DEFAULT 0,
    initiated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT DEFAULT 'in_progress',
    error_message TEXT
);

-- Checkpoint indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_files_checkpoint ON checkpoint_files(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_files_path ON checkpoint_files(file_path);
CREATE INDEX IF NOT EXISTS idx_checkpoint_files_operation ON checkpoint_files(operation);
CREATE INDEX IF NOT EXISTS idx_checkpoint_conv_checkpoint ON checkpoint_conversation(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_conv_turn ON checkpoint_conversation(checkpoint_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_rollback_checkpoint ON rollback_history(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_rollback_status ON rollback_history(status);

-- ============================================================================
-- SWARM TEAM ORCHESTRATION (Migration 006)
-- ============================================================================

-- Swarm team definitions
CREATE TABLE IF NOT EXISTS swarm_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_name TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  pattern TEXT NOT NULL,             -- parallel|pipeline|swarm|review
  phase TEXT,
  status TEXT DEFAULT 'forming',     -- forming|active|disbanding|disbanded
  lead_agent TEXT,
  max_teammates INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  disbanded_at TEXT,
  metadata JSON DEFAULT '{}'
);

-- Swarm team members
CREATE TABLE IF NOT EXISTS swarm_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES swarm_teams(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  teammate_name TEXT,
  role TEXT,                         -- lead|specialist|reviewer
  status TEXT DEFAULT 'spawning',    -- spawning|active|idle|shutdown
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  joined_at TEXT DEFAULT (datetime('now')),
  left_at TEXT
);

-- Task mapping between AICodePath units and Claude Code tasks
CREATE TABLE IF NOT EXISTS swarm_task_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL REFERENCES swarm_teams(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  task_id TEXT NOT NULL,
  assigned_member_id INTEGER REFERENCES swarm_team_members(id),
  status TEXT DEFAULT 'pending',
  synced_at TEXT DEFAULT (datetime('now'))
);

-- Swarm indexes
CREATE INDEX IF NOT EXISTS idx_swarm_teams_session ON swarm_teams(session_id);
CREATE INDEX IF NOT EXISTS idx_swarm_teams_status ON swarm_teams(status);
CREATE INDEX IF NOT EXISTS idx_swarm_members_team ON swarm_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_swarm_members_status ON swarm_team_members(status);
CREATE INDEX IF NOT EXISTS idx_swarm_tasks_team ON swarm_task_mapping(team_id);
CREATE INDEX IF NOT EXISTS idx_swarm_tasks_unit ON swarm_task_mapping(unit_id);
CREATE INDEX IF NOT EXISTS idx_swarm_tasks_status ON swarm_task_mapping(status);

-- Insert default session state
INSERT OR IGNORE INTO session_state (key, value) VALUES
    ('current_phase', '"inception"'),
    ('current_stage', '""'),
    ('current_unit', '""'),
    ('workflow_started', 'false'),
    ('last_activity', '"' || datetime('now') || '"');

-- Mark schema version (for future migrations tracking)
INSERT OR IGNORE INTO session_state (key, value) VALUES
    ('schema_version', '"2.1"'),
    ('schema_consolidated_at', '"2026-02-03"');

-- ============================================================================
-- VISUAL MEMORY SYSTEM
-- ============================================================================

-- Visual Diagrams - Stores Mermaid diagrams for codebase visualization
CREATE TABLE IF NOT EXISTS visual_diagrams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identity
    diagram_type TEXT NOT NULL,       -- 'class', 'er', 'flowchart', 'sequence', 'journey', 'state', 'c4', 'c4-context', 'c4-container', 'c4-component', 'c4-deployment', 'gantt'
    name TEXT NOT NULL,               -- Human-readable name
    scope TEXT NOT NULL,              -- 'global', 'unit'
    unit_name TEXT,                   -- Unit name if scope='unit'

    -- Content
    title TEXT NOT NULL,
    description TEXT,
    mermaid_content TEXT NOT NULL,    -- The actual Mermaid diagram code

    -- Generation metadata
    generation_method TEXT NOT NULL,  -- 'static-ast', 'static-schema', 'static-pattern', 'llm', 'manual'
    confidence REAL DEFAULT 1.0,      -- 0.0-1.0 confidence score
    source_files JSON,                -- Array of files used to generate this diagram
    source_hashes JSON,               -- Hash of each source file for staleness detection

    -- Sync strategy
    sync_strategy TEXT DEFAULT 'lazy', -- 'eager', 'lazy', 'manual'
    is_stale BOOLEAN DEFAULT 0,       -- Marked stale when source files change
    last_validated_at TEXT,           -- Last time staleness was checked

    -- Prioritization
    priority INTEGER DEFAULT 50,      -- 0-100, higher = more important
    relevance_tags JSON,              -- Tags for relevance matching (e.g., ["auth", "database"])

    -- File path (for file-based storage)
    file_path TEXT,                   -- Path relative to .aicodepath-docs/memory/

    -- Tracking
    cr_number TEXT DEFAULT 'CR-VISUAL-MEMORY',
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',     -- 'active', 'archived', 'superseded'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system'
);

-- Indexes for visual_diagrams
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_type ON visual_diagrams(diagram_type);
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_scope ON visual_diagrams(scope);
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_unit ON visual_diagrams(unit_name);
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_status ON visual_diagrams(status);
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_stale ON visual_diagrams(is_stale);
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_sync ON visual_diagrams(sync_strategy);
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_priority ON visual_diagrams(priority DESC);
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_file_path ON visual_diagrams(file_path);

-- Unique constraint to prevent duplicate diagrams (Migration 007)
CREATE UNIQUE INDEX IF NOT EXISTS idx_visual_diagrams_unique
ON visual_diagrams(name, diagram_type, scope);

-- Additional composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_visual_diagrams_type_scope
ON visual_diagrams(diagram_type, scope);

-- FTS for visual_diagrams (searchable by title, description, content)
CREATE VIRTUAL TABLE IF NOT EXISTS visual_diagrams_fts USING fts5(
    title,
    description,
    mermaid_content,
    content=visual_diagrams,
    content_rowid=id,
    tokenize='porter unicode61'
);


-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS visual_diagrams_ai AFTER INSERT ON visual_diagrams BEGIN
    INSERT INTO visual_diagrams_fts(rowid, title, description, mermaid_content)
    VALUES (NEW.id, NEW.title, NEW.description, NEW.mermaid_content);
END;

CREATE TRIGGER IF NOT EXISTS visual_diagrams_ad AFTER DELETE ON visual_diagrams BEGIN
    INSERT INTO visual_diagrams_fts(visual_diagrams_fts, rowid, title, description, mermaid_content)
    VALUES ('delete', OLD.id, OLD.title, OLD.description, OLD.mermaid_content);
END;

CREATE TRIGGER IF NOT EXISTS visual_diagrams_au AFTER UPDATE ON visual_diagrams BEGIN
    INSERT INTO visual_diagrams_fts(visual_diagrams_fts, rowid, title, description, mermaid_content)
    VALUES ('delete', OLD.id, OLD.title, OLD.description, OLD.mermaid_content);
    INSERT INTO visual_diagrams_fts(rowid, title, description, mermaid_content)
    VALUES (NEW.id, NEW.title, NEW.description, NEW.mermaid_content);
END;

-- Diagram Entity Links - Traceability between diagrams and code entities
CREATE TABLE IF NOT EXISTS diagram_entity_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- References
    diagram_id INTEGER NOT NULL,
    entity_id INTEGER,                -- Reference to code_entities.id (optional)
    entity_type TEXT NOT NULL,        -- 'class', 'function', 'table', 'file', 'module', etc.
    entity_name TEXT NOT NULL,        -- Name of the entity
    entity_file_path TEXT,            -- File path of the entity

    -- Link metadata
    link_type TEXT DEFAULT 'depicts', -- 'depicts', 'references', 'derived_from'
    position_in_diagram TEXT,         -- Optional: Where in the diagram (for navigation)

    -- Tracking
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (diagram_id) REFERENCES visual_diagrams(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES code_entities(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_diagram_entity_links_diagram ON diagram_entity_links(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_entity_links_entity ON diagram_entity_links(entity_id);
CREATE INDEX IF NOT EXISTS idx_diagram_entity_links_type ON diagram_entity_links(entity_type);
CREATE INDEX IF NOT EXISTS idx_diagram_entity_links_file ON diagram_entity_links(entity_file_path);

-- Diagram History - Version history for diagrams
CREATE TABLE IF NOT EXISTS diagram_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Reference
    diagram_id INTEGER NOT NULL,
    version INTEGER NOT NULL,

    -- Snapshot
    mermaid_content TEXT NOT NULL,    -- Previous Mermaid content
    source_files JSON,                -- Source files at that version
    source_hashes JSON,               -- Source hashes at that version

    -- Change metadata
    change_reason TEXT,               -- Why the diagram was updated
    changed_files JSON,               -- Which files triggered the update

    -- Tracking
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system',

    FOREIGN KEY (diagram_id) REFERENCES visual_diagrams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_diagram_history_diagram ON diagram_history(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_history_version ON diagram_history(diagram_id, version);
CREATE INDEX IF NOT EXISTS idx_diagram_history_created ON diagram_history(created_at);

-- Update trigger for visual_diagrams timestamp
CREATE TRIGGER IF NOT EXISTS update_visual_diagrams_timestamp
    AFTER UPDATE ON visual_diagrams
    FOR EACH ROW
    BEGIN
        UPDATE visual_diagrams SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

-- NULL prevention triggers for mermaid_content (consolidated from migration 011)
CREATE TRIGGER IF NOT EXISTS prevent_null_mermaid_insert
BEFORE INSERT ON visual_diagrams
FOR EACH ROW
WHEN NEW.mermaid_content IS NULL OR NEW.mermaid_content = ''
BEGIN
  SELECT RAISE(ABORT, 'INSERT blocked: mermaid_content cannot be NULL or empty');
END;

CREATE TRIGGER IF NOT EXISTS prevent_null_mermaid_update
BEFORE UPDATE ON visual_diagrams
FOR EACH ROW
WHEN NEW.mermaid_content IS NULL OR NEW.mermaid_content = ''
BEGIN
  SELECT RAISE(ABORT, 'UPDATE blocked: mermaid_content cannot be NULL or empty');
END;

-- View: Active diagrams by type and priority
CREATE VIEW IF NOT EXISTS v_active_diagrams AS
SELECT
    id,
    diagram_type,
    name,
    scope,
    unit_name,
    title,
    priority,
    sync_strategy,
    is_stale,
    confidence,
    file_path,
    updated_at
FROM visual_diagrams
WHERE status = 'active'
ORDER BY priority DESC, updated_at DESC;

-- View: Diagrams needing sync (stale eager diagrams)
CREATE VIEW IF NOT EXISTS v_diagrams_needing_sync AS
SELECT
    vd.*
FROM visual_diagrams vd
WHERE vd.status = 'active'
  AND vd.is_stale = 1
  AND vd.sync_strategy = 'eager'
ORDER BY vd.priority DESC;

-- View: Diagram entity coverage (which entities are documented)
CREATE VIEW IF NOT EXISTS v_diagram_entity_coverage AS
SELECT
    del.entity_type,
    del.entity_file_path,
    COUNT(DISTINCT del.diagram_id) as diagram_count,
    GROUP_CONCAT(DISTINCT vd.diagram_type) as diagram_types
FROM diagram_entity_links del
JOIN visual_diagrams vd ON del.diagram_id = vd.id
WHERE vd.status = 'active'
GROUP BY del.entity_type, del.entity_file_path;

-- ============================================================================
-- PART 1: Add Constraints to Prevent Future Duplicates
-- ============================================================================

-- Unique constraint: Prevent duplicate (phase, stage, cr_number) combinations
-- Note: COALESCE handles NULL cr_number values
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_state_unique
ON workflow_state(phase, stage, COALESCE(cr_number, 'N/A'));

-- ============================================================================
-- PART 2: Validation Triggers for Data Integrity
-- ============================================================================

-- Validate phase values on insert
CREATE TRIGGER IF NOT EXISTS validate_workflow_phase_insert
BEFORE INSERT ON workflow_state
FOR EACH ROW
WHEN NEW.phase NOT IN ('pre-flight', 'inception', 'construction', 'operations', 'maintenance', 'review')
BEGIN
  SELECT RAISE(ABORT, 'Invalid phase value: must be one of (pre-flight, inception, construction, operations, maintenance, review)');
END;

-- Validate phase values on update
CREATE TRIGGER IF NOT EXISTS validate_workflow_phase_update
BEFORE UPDATE OF phase ON workflow_state
FOR EACH ROW
WHEN NEW.phase NOT IN ('pre-flight', 'inception', 'construction', 'operations', 'maintenance', 'review')
BEGIN
  SELECT RAISE(ABORT, 'Invalid phase value: must be one of (pre-flight, inception, construction, operations, maintenance, review)');
END;

-- Validate status values on insert
CREATE TRIGGER IF NOT EXISTS validate_workflow_status_insert
BEFORE INSERT ON workflow_state
FOR EACH ROW
WHEN NEW.status NOT IN ('pending', 'ready', 'in_progress', 'completed', 'skipped', 'blocked')
BEGIN
  SELECT RAISE(ABORT, 'Invalid status value: must be one of (pending, ready, in_progress, completed, skipped, blocked)');
END;

-- Validate status values on update
CREATE TRIGGER IF NOT EXISTS validate_workflow_status_update
BEFORE UPDATE OF status ON workflow_state
FOR EACH ROW
WHEN NEW.status NOT IN ('pending', 'ready', 'in_progress', 'completed', 'skipped', 'blocked')
BEGIN
  SELECT RAISE(ABORT, 'Invalid status value: must be one of (pending, ready, in_progress, completed, skipped, blocked)');
END;


-- Migration 011: Prevent NULL/empty mermaid_content
-- Adds triggers to enforce data quality at database level

BEGIN TRANSACTION;

-- Update any existing NULL/empty values with placeholder
UPDATE visual_diagrams
SET mermaid_content = diagram_type || char(10) || '  %% Placeholder - content was NULL/empty'
WHERE status = 'active'
  AND (mermaid_content IS NULL OR mermaid_content = '');

-- Trigger: Prevent INSERT with NULL/empty mermaid_content
CREATE TRIGGER IF NOT EXISTS prevent_null_mermaid_insert
BEFORE INSERT ON visual_diagrams
FOR EACH ROW
WHEN NEW.mermaid_content IS NULL OR NEW.mermaid_content = ''
BEGIN
  SELECT RAISE(ABORT, 'INSERT blocked: mermaid_content cannot be NULL or empty');
END;

-- Trigger: Prevent UPDATE to NULL/empty mermaid_content
CREATE TRIGGER IF NOT EXISTS prevent_null_mermaid_update
BEFORE UPDATE ON visual_diagrams
FOR EACH ROW
WHEN NEW.mermaid_content IS NULL OR NEW.mermaid_content = ''
BEGIN
  SELECT RAISE(ABORT, 'UPDATE blocked: mermaid_content cannot be NULL or empty');
END;

COMMIT;


-- Migration 012: GICL Cost Tracking
-- Cost tracking columns are now part of the CREATE TABLE definitions above.
-- These indexes support cost-related queries.

-- Create index for cost queries on iterations
CREATE INDEX IF NOT EXISTS idx_gicl_iterations_cost
  ON gicl_iterations(session_id, cost_usd);

-- Create index for session cost queries
CREATE INDEX IF NOT EXISTS idx_gicl_sessions_cost
  ON gicl_sessions(status, total_cost_usd);

-- New table: cost_summary (for dashboard period aggregates)
CREATE TABLE IF NOT EXISTS cost_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,           -- 'hourly', 'daily', 'weekly', 'monthly'
    period_start TEXT NOT NULL,     -- ISO 8601 timestamp
    period_end TEXT NOT NULL,
    total_cost_usd REAL NOT NULL DEFAULT 0.0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    iteration_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_cost_summary_period
  ON cost_summary(period, period_start DESC);

-- Migration 013: AI Conversation Adapters
-- Creates tables for storing unified AI tool session data across multiple adapters.

-- AI tool sessions (unified across all adapters)
CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY,
  adapter_id TEXT NOT NULL,
  adapter_name TEXT NOT NULL,
  adapter_icon TEXT NOT NULL,
  name TEXT,
  slug TEXT,
  project_root TEXT NOT NULL,
  file_path TEXT,
  worktree_name TEXT,
  worktree_path TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0.0,
  message_count INTEGER DEFAULT 0,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_offset INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_adapter ON ai_sessions(adapter_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_updated ON ai_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_active ON ai_sessions(is_active, updated_at DESC);

-- AI messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  timestamp DATETIME NOT NULL,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  line_number INTEGER,
  FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_messages_timestamp ON ai_messages(timestamp DESC);

-- Tool uses extracted from messages
CREATE TABLE IF NOT EXISTS ai_tool_uses (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_json TEXT,
  result_json TEXT,
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (message_id) REFERENCES ai_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_uses_session ON ai_tool_uses(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_tool_uses_tool ON ai_tool_uses(tool_name);

-- Usage statistics (denormalized for fast queries)
CREATE TABLE IF NOT EXISTS ai_usage_stats (
  session_id TEXT PRIMARY KEY,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cache_read_tokens INTEGER DEFAULT 0,
  total_cache_write_tokens INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0.0,
  message_count INTEGER DEFAULT 0,
  last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE
);

-- Trigger to auto-update usage stats on message insert
CREATE TRIGGER IF NOT EXISTS update_usage_stats_on_insert
AFTER INSERT ON ai_messages
BEGIN
  INSERT INTO ai_usage_stats (
    session_id,
    total_input_tokens,
    total_output_tokens,
    total_cache_read_tokens,
    total_cache_write_tokens,
    message_count
  ) VALUES (
    NEW.session_id,
    NEW.input_tokens,
    NEW.output_tokens,
    NEW.cache_read_tokens,
    NEW.cache_write_tokens,
    1
  )
  ON CONFLICT(session_id) DO UPDATE SET
    total_input_tokens = total_input_tokens + NEW.input_tokens,
    total_output_tokens = total_output_tokens + NEW.output_tokens,
    total_cache_read_tokens = total_cache_read_tokens + NEW.cache_read_tokens,
    total_cache_write_tokens = total_cache_write_tokens + NEW.cache_write_tokens,
    message_count = message_count + 1,
    last_updated_at = CURRENT_TIMESTAMP;
END;

-- Migration 014: Cross-Conversation Search (FTS5 indexes)
-- P3 Feature 1: Full-text search across all AI conversation sessions
-- Depends on: migration 013 (ai_sessions, ai_messages, ai_tool_uses tables)

-- ============================================================
-- FTS5 Index: ai_messages (content, role, model)
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS ai_messages_fts USING fts5(
  content,              -- Message text content
  role,                 -- 'user' or 'assistant'
  model,                -- Model name for filtering
  session_id UNINDEXED, -- Link to parent session (not searchable, used for filtering)
  content=ai_messages,
  content_rowid=rowid,
  tokenize='porter unicode61 remove_diacritics 1'
);

-- Triggers to keep ai_messages_fts in sync with ai_messages
CREATE TRIGGER IF NOT EXISTS ai_messages_ai AFTER INSERT ON ai_messages BEGIN
  INSERT INTO ai_messages_fts(rowid, content, role, model, session_id)
  VALUES (NEW.rowid, NEW.content, NEW.role, NEW.model, NEW.session_id);
END;

CREATE TRIGGER IF NOT EXISTS ai_messages_ad AFTER DELETE ON ai_messages BEGIN
  INSERT INTO ai_messages_fts(ai_messages_fts, rowid, content, role, model, session_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.role, OLD.model, OLD.session_id);
END;

CREATE TRIGGER IF NOT EXISTS ai_messages_au AFTER UPDATE ON ai_messages BEGIN
  INSERT INTO ai_messages_fts(ai_messages_fts, rowid, content, role, model, session_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.role, OLD.model, OLD.session_id);
  INSERT INTO ai_messages_fts(rowid, content, role, model, session_id)
  VALUES (NEW.rowid, NEW.content, NEW.role, NEW.model, NEW.session_id);
END;

-- ============================================================
-- FTS5 Index: ai_sessions (name, slug)
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS ai_sessions_fts USING fts5(
  name,                 -- Session name
  slug,                 -- URL-safe slug
  adapter_id UNINDEXED, -- Adapter ID (for filtering, not searchable)
  content=ai_sessions,
  content_rowid=rowid,
  tokenize='porter unicode61'
);

-- Triggers to keep ai_sessions_fts in sync with ai_sessions
CREATE TRIGGER IF NOT EXISTS ai_sessions_ai AFTER INSERT ON ai_sessions BEGIN
  INSERT INTO ai_sessions_fts(rowid, name, slug, adapter_id)
  VALUES (NEW.rowid, NEW.name, NEW.slug, NEW.adapter_id);
END;

CREATE TRIGGER IF NOT EXISTS ai_sessions_ad AFTER DELETE ON ai_sessions BEGIN
  INSERT INTO ai_sessions_fts(ai_sessions_fts, rowid, name, slug, adapter_id)
  VALUES ('delete', OLD.rowid, OLD.name, OLD.slug, OLD.adapter_id);
END;

CREATE TRIGGER IF NOT EXISTS ai_sessions_au AFTER UPDATE ON ai_sessions BEGIN
  INSERT INTO ai_sessions_fts(ai_sessions_fts, rowid, name, slug, adapter_id)
  VALUES ('delete', OLD.rowid, OLD.name, OLD.slug, OLD.adapter_id);
  INSERT INTO ai_sessions_fts(rowid, name, slug, adapter_id)
  VALUES (NEW.rowid, NEW.name, NEW.slug, NEW.adapter_id);
END;

-- ============================================================
-- FTS5 Index: ai_tool_uses (tool_name, result_json)
-- ============================================================

CREATE VIRTUAL TABLE IF NOT EXISTS ai_tool_uses_fts USING fts5(
  tool_name,            -- Tool name (e.g., 'Read', 'Write', 'Bash')
  result_json,          -- Tool output text
  message_id UNINDEXED, -- Link to parent message
  content=ai_tool_uses,
  content_rowid=rowid,
  tokenize='porter unicode61'
);

-- Triggers to keep ai_tool_uses_fts in sync with ai_tool_uses
CREATE TRIGGER IF NOT EXISTS ai_tool_uses_ai AFTER INSERT ON ai_tool_uses BEGIN
  INSERT INTO ai_tool_uses_fts(rowid, tool_name, result_json, message_id)
  VALUES (NEW.rowid, NEW.tool_name, NEW.result_json, NEW.message_id);
END;

CREATE TRIGGER IF NOT EXISTS ai_tool_uses_ad AFTER DELETE ON ai_tool_uses BEGIN
  INSERT INTO ai_tool_uses_fts(ai_tool_uses_fts, rowid, tool_name, result_json, message_id)
  VALUES ('delete', OLD.rowid, OLD.tool_name, OLD.result_json, OLD.message_id);
END;

CREATE TRIGGER IF NOT EXISTS ai_tool_uses_au AFTER UPDATE ON ai_tool_uses BEGIN
  INSERT INTO ai_tool_uses_fts(ai_tool_uses_fts, rowid, tool_name, result_json, message_id)
  VALUES ('delete', OLD.rowid, OLD.tool_name, OLD.result_json, OLD.message_id);
  INSERT INTO ai_tool_uses_fts(rowid, tool_name, result_json, message_id)
  VALUES (NEW.rowid, NEW.tool_name, NEW.result_json, NEW.message_id);
END;

-- ============================================================
-- Search History Table
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  use_regex BOOLEAN DEFAULT 0,
  case_sensitive BOOLEAN DEFAULT 0,
  adapter_filter TEXT,
  result_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_search_history_searched_at
ON ai_search_history(searched_at DESC);

-- ============================================================
-- Populate FTS indexes from existing data (if tables already have rows)
-- ============================================================

INSERT OR IGNORE INTO ai_messages_fts(rowid, content, role, model, session_id)
SELECT rowid, content, role, model, session_id FROM ai_messages;

INSERT OR IGNORE INTO ai_sessions_fts(rowid, name, slug, adapter_id)
SELECT rowid, name, slug, adapter_id FROM ai_sessions;

INSERT OR IGNORE INTO ai_tool_uses_fts(rowid, tool_name, result_json, message_id)
SELECT rowid, tool_name, result_json, message_id FROM ai_tool_uses;

-- ============================================================================
-- PART 3: Data Migration - Sync Phase to CONSTRUCTION
-- ============================================================================
-- Note: This section is commented out by default for safety
-- Run manually on existing databases after backup:
--   1. Create backup: cp aicodepath.db aicodepath.db.backup
--   2. Enable migration: Remove comment blocks below
--   3. Apply: sqlite3 aicodepath.db < 008_fix_workflow_duplicates.sql
-- ============================================================================

/*
-- Update workflow_state phase from inception to construction
UPDATE workflow_state
SET phase = 'construction'
WHERE phase = 'inception';

-- Update session_state current phase
INSERT OR REPLACE INTO session_state (key, value)
VALUES ('current_phase', '"construction"');

-- Update last checkpoint phase if exists
UPDATE session_state
SET value = '"construction"'
WHERE key = 'last_checkpoint_phase' AND value = '"inception"';
*/

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Check for duplicates (should return empty)
-- SELECT phase, stage, cr_number, COUNT(*) as count
-- FROM workflow_state
-- GROUP BY phase, stage, COALESCE(cr_number, 'N/A')
-- HAVING COUNT(*) > 1;

-- Check phase distribution
-- SELECT phase, COUNT(*) as count
-- FROM workflow_state
-- GROUP BY phase
-- ORDER BY phase;

-- Check current phase in session
-- SELECT value FROM session_state WHERE key = 'current_phase';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To remove constraints (not recommended):
-- DROP INDEX IF EXISTS idx_workflow_state_unique;
-- DROP TRIGGER IF EXISTS validate_workflow_phase_insert;
-- DROP TRIGGER IF EXISTS validate_workflow_phase_update;
-- DROP TRIGGER IF EXISTS validate_workflow_status_insert;
-- DROP TRIGGER IF EXISTS validate_workflow_status_update;

-- To revert phase (only if backup exists):
-- Restore from backup: mv aicodepath.db.backup aicodepath.db
