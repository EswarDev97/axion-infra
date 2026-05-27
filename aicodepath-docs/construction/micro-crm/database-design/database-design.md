# Micro CRM Module — Database Design

**Unit**: micro-crm  
**Phase**: CONSTRUCTION  
**Date**: 2026-05-19

## Tables

### crm_leads
| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | UUID | NO | PK, gen_random_uuid() |
| tenant_id | UUID | NO | FK → tenants.id |
| operating_office_name | VARCHAR(150) | NO | |
| location | VARCHAR(200) | NO | |
| date_contacted | DATE | NO | Cannot be future date |
| discussion_summary | DiscussionSummary (enum) | NO | See enum below |
| interest_level | InterestLevel (enum) | NO | HIGH / MEDIUM / LOW |
| demo_required | BOOLEAN | NO | default false |
| training_completed | BOOLEAN | NO | default false |
| next_followup_date | DATE | YES | Indexed |
| remarks | TEXT | YES | |
| created_by | UUID | YES | FK → users.id |
| updated_by | UUID | YES | FK → users.id |
| created_at | TIMESTAMPTZ | NO | default NOW() |
| updated_at | TIMESTAMPTZ | NO | default NOW() |

### crm_lead_contacts
| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | UUID | NO | PK |
| lead_id | UUID | NO | FK → crm_leads.id CASCADE |
| name | VARCHAR(100) | NO | |
| designation | VARCHAR(100) | NO | |
| mobile | VARCHAR(15) | NO | |
| email | VARCHAR(255) | NO | |
| created_at | TIMESTAMPTZ | NO | default NOW() |

## Enums

### DiscussionSummary
- INTRODUCE_AXION
- ESTABLISH_CREDIBILITY
- RO_APPROVAL_CIRCULATED
- EXPLAIN_EASY_PROCESS
- UNDERSTAND_PAIN_POINTS
- OFFER_TRAINING_DEMO
- OBTAIN_FIRST_CASE

### InterestLevel
- HIGH
- MEDIUM
- LOW

## Indexes
- ix_crm_leads_tenant_id
- ix_crm_leads_next_followup_date
- ix_crm_leads_interest_level
- ix_crm_lead_contacts_lead_id

## Migration
File: `backend/alembic/versions/20260519_000000_crm_leads_module.py`  
Revision: `20260519_000000`  
Depends on: `20260331_040000`
