-- Migration 023: Link units to plan/design artifacts (additive only)
-- Purpose:  Adds two FK columns on units (plan_artifact_id, design_artifact_id)
--           plus 4 indexes that the sprint-history library and
--           v_requirements_traceability view will pivot on.
-- Date:     2026-04-19
-- Sprint:   Opus 4.7 Alignment & Sprint Persistence (CR-2026-04-18)
-- Plan:     aicodepath-docs/plan/2026-04-18-opus-4-7-alignment-plan.md Batch 2 Task 5
-- Safe:     ALTER TABLE ADD COLUMN is idempotent; init-db.js catches duplicate-column
--           errors and continues. CREATE INDEX uses IF NOT EXISTS.
-- Invariant: Additive only. No ALTER ... DROP, no RENAME, no MODIFY, no column
--            reorder. Existing 7 units columns remain untouched (T7 verifies).

ALTER TABLE units ADD COLUMN plan_artifact_id INTEGER REFERENCES artifacts(id);
ALTER TABLE units ADD COLUMN design_artifact_id INTEGER REFERENCES artifacts(id);

CREATE INDEX IF NOT EXISTS idx_artifacts_cr_number ON artifacts(cr_number);
CREATE INDEX IF NOT EXISTS idx_artifacts_cr_type ON artifacts(cr_number, artifact_type);
CREATE INDEX IF NOT EXISTS idx_units_plan_artifact ON units(plan_artifact_id);
CREATE INDEX IF NOT EXISTS idx_units_design_artifact ON units(design_artifact_id);
