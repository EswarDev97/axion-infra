# Payment Management Module — Design Document

**Date**: 2026-07-23
**Status**: DESIGN APPROVED
**Trigger**: Feature request — user asked for a new "Payment Management" submenu under Payroll to track case-level payment records (client/finance billing, payment mode, transaction details).
**Scope**: Backend `complaint` service (new model/schema/service/api/migration), frontend sidebar navigation, new dashboard page, new client-side Excel export dependency, RBAC permission seeding.
**CR**: CR-2026-07-23-payment-management-module

---

## Section 1: Problem Statement

There is currently no way to track payment records tied to a client/vehicle case in this system. Users handling insurance-claim-adjacent cases need to record: who the case belongs to (client and, optionally, a financer), which vehicle it concerns, which executive is handling it, what stage the case is at, and — when the client bills the customer directly rather than the company — how and when payment was received (cash vs. bank transfer, with UTR and transaction timestamp for transfers).

Without this module, this data either isn't tracked in the system at all or is tracked outside it (spreadsheets, manual records), meaning there's no single source of truth, no audit trail, and no way to filter/export payment status across cases.

The user explicitly requested this be built by reusing existing entities wherever possible rather than duplicating data, and asked that `/aicodepath-brainstorm` be used to determine the right implementation approach before any code is written.

## Section 2: Exploration Findings

| Finding | Source | Impact on Design |
|---|---|---|
| `clients` table already has a `type` column (`CLIENT`/`FINANCER`, `String(20)`) added in a recent sprint | `backend/services/complaint/models/client.py`, `backend/services/complaint/schemas/client.py:15-16` | Client and Finance dropdowns both read from `clients`, filtered by `type` — no new client/financer table needed |
| No existing table tracks payment mode, UTR number, or transaction datetime | Read `backend/services/billing/models/invoice.py` (full file) and `quote.py` — `Invoice.paid_at` is only a timestamp flag, no payment-method detail | Confirms a genuinely new table is required; nothing to reuse for the payment-detail fields |
| `crm_leads` (HR service) is an unrelated business-development/sales-outreach concept — not a case/claim | `backend/services/hr/models/crm_lead.py` | Ruled out as the meaning of "Lead ID / Case ID" |
| `Complaint` (table `complaints`, complaint service) is the closest existing "case" entity — has vehicle_number, client, status, assigned executive | `backend/services/complaint/models/complaint.py` | User confirmed Case ID is an independent free-text field, NOT a link to `Complaint` — so no FK to `complaints` |
| Every sibling status-like column (`Complaint.status`, `Invoice.status`, `Client.type`) uses plain `String` + Python constants, not Postgres ENUM or `lkp_*` lookup tables | `complaint.py`, `invoice.py`, `client.py` | Chosen pattern for `case_status`/`billing_status`/`payment_mode`, overriding the written `lkp_*` guideline for consistency (see Constraints) |
| Cross-service references (e.g., an employee ID referenced from a non-HR service) are stored as bare `UUID` columns with no FK, with an explicit code comment explaining why | `Complaint.owner_employee_id` (complaint.py:154-158) | Reused verbatim for `executive_employee_id`; `client_id`/`finance_id` get real FKs since `clients` lives in the same service/DB |
| `AppSidebar.tsx` `menuItems` is a flat array (`{label, href, icon, permission?}`), no nesting/submenu exists anywhere in the app | `frontend/src/components/layout/AppSidebar.tsx` | New `children` array support must be added to the sidebar component itself — first of its kind in this codebase |
| Both modal-based (Complaints) and full-page (Invoices) create/edit patterns exist in the frontend | `frontend/src/app/(app)/dashboard/complaints/`, `frontend/src/app/(app)/dashboard/invoices/` | User chose modal, matching `ClientsPageClient.tsx`'s structure (closest analog: also has a type-filtered dropdown pattern) |
| No `.xlsx` export exists anywhere in the app; only Attendance has a server-generated CSV export | `frontend/src/components/attendance/AttendanceList.tsx`, `hrService.ts:309-330` | User chose real `.xlsx` via a new frontend dependency (SheetJS `xlsx` package), not the CSV precedent |
| Alembic migrations for all 12 microservices live in one shared chain at `backend/alembic/versions/`, despite each service having its own `models/` | `backend/alembic.ini`, existing migration files (e.g., `20260519_000000_crm_leads_module.py` for an HR-service model) | New migration file follows this shared-chain convention, not a per-service one |
| RBAC roles (`SUPER_ADMIN`, `HR_ADMIN`, `MANAGER`, `EMPLOYEE`) and the `roles`/`permissions`/`role_permissions` tables already exist and are seeded (prior session in this conversation) | `backend/services/auth/models/role.py`, `scripts/seed_roles.py` | New `payments:*` permissions can be seeded and attached to existing roles without any new RBAC infrastructure |

## Section 3: Constraints Discovered

- **Guideline vs. codebase convention conflict**: `.aicodepath/guidelines/data-modeling-rules.json` and `architecture-rules.json` both mandate `lkp_*` lookup tables for any status/type/category column (`[ERROR] lookup-table-naming`, `[ERROR] no-enums-in-db`). However, every actual sibling module in this codebase (`Complaint.status`, `Invoice.status`, `Client.type`) uses a plain `String` column with app-level Python constants. The user explicitly chose to match existing modules over the written guideline, for consistency. This is a **known, accepted deviation** — documented here so it isn't mistaken for an oversight in review.
- **Cross-service FK limitation**: `employees` lives in the `hr` service's connection scope conceptually (though physically the same Postgres instance/DB, the app-layer treats services as independent — see `Complaint.owner_employee_id`'s comment). `executive_employee_id` cannot have a DB-level FK per this established precedent.
- **No API gateway**: the frontend calls each of the 12 FastAPI microservices directly per-service (e.g. `COMPLAINT_BASE = '/complaints'` in `complaintService.ts`). The new `paymentService.ts` follows the same direct-call pattern against the `complaint` service.
- **Server-side validation is mandatory**: per `anti-trust-client-validation` (security-rules.json), the conditional field requirements (Section "Design Specification" below) must be enforced in the backend Pydantic schema, not just the frontend form.
- **No mass assignment**: per `anti-mass-assignment`, the service layer must whitelist fields explicitly on create/update rather than passing the request body straight into the ORM constructor (matches the existing `ClientService.create` pattern).

## Section 4: Decision Log

| Decision | Options Considered | Rationale |
|---|---|---|
| Case ID / Lead ID is a free-text field, not an FK to `Complaint` | (a) FK to `complaints` — richer context, less duplicate entry; (b) free-text field, fully standalone | User chose (b) — Payment Management is intentionally decoupled from the Complaint/case workflow |
| `case_status`/`billing_status`/`payment_mode` are plain `String` + constants | (a) Follow written `lkp_*` guideline; (b) match existing `Complaint`/`Invoice`/`Client` convention | User chose (b) for consistency with the rest of the codebase; documented as an accepted guideline deviation |
| New table lives in the `complaint` service | (a) `complaint` service, next to `clients.py`; (b) `billing` service, next to `invoices.py` | User chose (a) — keeps Client/Finance dropdown queries in-process (same DB session), avoiding a cross-service lookup that placement in `billing` would require |
| Sidebar gets real parent/child nesting | (a) Flat new top-level item; (b) build submenu/expand-collapse nesting under Payroll | User explicitly asked for a submenu; chose (b) despite no existing precedent in the codebase |
| Payroll parent link becomes expand-only (no navigation) | (a) Payroll link still navigates to the placeholder page + expands; (b) Payroll becomes expand-only, placeholder unreachable from sidebar | User chose (b) — simpler interaction, avoids a confusing dual-purpose click target |
| Create/edit uses a modal, not full pages | (a) Modal, matching Complaints/Clients; (b) full pages `/new` + `/[id]/edit`, matching Invoices | User chose (a) — faster flow, proven pattern in this codebase for forms with conditional sections |
| Export is real `.xlsx` via a new frontend dependency | (a) Server CSV, matching Attendance precedent; (b) true `.xlsx` via a new library | User chose (b) — explicit "Export to Excel" requirement, not CSV |
| `.xlsx` is generated client-side (SheetJS `xlsx` npm package) | (a) Backend `openpyxl` endpoint, matching the CSV pattern's server-side approach; (b) frontend SheetJS from already-fetched list data | User chose (b) — no new backend endpoint needed |
| `client_id`/`finance_id` are real FKs; `executive_employee_id` is a bare UUID | (a) Bare UUID for all three (fully decoupled); (b) FK where possible (same-service `clients`), bare UUID only where required (cross-service `employees`) | User chose (b) — matches `Complaint.owner_employee_id`'s established precedent exactly, while gaining referential integrity where the DB can actually enforce it |
| Amount is required whenever `billing_status = CUSTOMER_BILLING` (both Cash and Transfer) | (a) Amount required for Transfer only, exactly as the literal spec text grouped it; (b) Amount required for both Cash and Transfer, UTR/transaction datetime Transfer-only | User chose (b) — real-world payment tracking needs an amount regardless of payment mode |
| Access restricted to `SUPER_ADMIN`, `HR_ADMIN`, `MANAGER` | (a) `SUPER_ADMIN` + `HR_ADMIN` only, matching Billing/Invoices sensitivity; (b) also include `MANAGER` | User chose (b) |

## Section 5: Design Specification

### 5.1 Database Schema

New table `payments`, added via a new file in the shared Alembic chain `backend/alembic/versions/`, owned conceptually by the `complaint` service:

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    case_reference VARCHAR(100) NOT NULL,          -- free-text "Lead ID / Case ID"
    client_id UUID NOT NULL REFERENCES clients(id),
    finance_id UUID REFERENCES clients(id),          -- nullable: not every payment involves a financer
    vehicle_registration_number VARCHAR(50) NOT NULL,
    executive_employee_id UUID NOT NULL,              -- no FK: employees table is owned by hr service
    case_status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    billing_status VARCHAR(30) NOT NULL,
    payment_mode VARCHAR(20),                          -- nullable: only set when billing_status = CUSTOMER_BILLING
    utr_number VARCHAR(50),                             -- nullable: only when payment_mode = TRANSFER
    transaction_datetime TIMESTAMPTZ,                   -- nullable: only when payment_mode = TRANSFER
    amount NUMERIC(12,2),                                -- nullable: required when billing_status = CUSTOMER_BILLING
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_client ON payments(tenant_id, client_id);
CREATE INDEX idx_payments_case_status ON payments(tenant_id, case_status);
```

Soft-delete (`is_deleted`/`deleted_at`) matches `Invoice`'s convention, appropriate for financial records that should be retained for audit.

### 5.2 Status Values & Validation Matrix

**`case_status`**: `ASSIGNED` (default) | `SCHEDULED` | `COMPLETED` | `REPORT_SUBMITTED` | `INVOICE_GENERATED` | `PAYMENT_PENDING` | `PAYMENT_RECEIVED` | `CANCELLED` — free selection, no enforced state machine (spec doesn't define transition rules, unlike `Complaint.status`).

**`billing_status`**: `COMPANY_BILLING` | `CUSTOMER_BILLING`

**`payment_mode`**: `CASH` | `TRANSFER`

Server-side conditional validation (Pydantic `@model_validator` in `schemas/payment.py`):

| Condition | Required | Must be null |
|---|---|---|
| `billing_status = COMPANY_BILLING` | — | `payment_mode`, `utr_number`, `transaction_datetime`, `amount` |
| `billing_status = CUSTOMER_BILLING` | `payment_mode`, `amount` | — |
| `payment_mode = CASH` | `amount` (inherited from billing_status rule) | `utr_number`, `transaction_datetime` |
| `payment_mode = TRANSFER` | `amount`, `utr_number`, `transaction_datetime` | — |

`amount`: `Decimal`, `gt=0`, 2 decimal places (`Numeric(12,2)`, matches `Invoice.total_amount`).

### 5.3 Backend API

New files in `backend/services/complaint/`, mirroring the existing `clients.py` / `client_service.py` / `schemas/client.py` triad:

- `models/payment.py` — SQLAlchemy `Payment` model
- `schemas/payment.py` — `PaymentCreateRequest`, `PaymentUpdateRequest`, `PaymentResponse`, `PaymentListResponse` + cross-field `@model_validator`
- `services/payment_service.py` — CRUD with explicit field whitelisting (no mass assignment)
- `api/payments.py` — routes, registered in `api/__init__.py`'s aggregate router

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/api/v1/complaints/payments` | `payments:create` | Create |
| GET | `/api/v1/complaints/payments` | `payments:read` | List — paginated; filters: `search` (case_reference/vehicle_registration_number), `case_status`, `billing_status`, `client_id` |
| GET | `/api/v1/complaints/payments/{id}` | `payments:read` | Get one |
| PUT | `/api/v1/complaints/payments/{id}` | `payments:update` | Update |
| DELETE | `/api/v1/complaints/payments/{id}` | `payments:delete` | Soft delete |

No server-side export endpoint — export is generated client-side (see 5.4).

**Supporting change**: `GET /api/v1/complaints/clients` gains an optional `type` query param (`CLIENT` | `FINANCER`) — needed for the Client/Finance dropdowns and not currently supported by `list_clients`.

**New permissions** seeded via `scripts/seed_payment_permissions.py` (idempotent, same pattern as `scripts/seed_roles.py`): `payments:create`, `payments:read`, `payments:update`, `payments:delete` — attached to `SUPER_ADMIN` (already has `*`), `HR_ADMIN`, `MANAGER`.

### 5.4 Frontend

**Sidebar** (`frontend/src/components/layout/AppSidebar.tsx`):
- `menuItems` entries gain an optional `children?: { label, href, icon?, permission? }[]`
- `Payroll` entry becomes `{ label: 'Payroll', icon, children: [{ label: 'Payment Management', href: '/dashboard/payments', permission: 'payments:read' }] }` — no `href` on the parent (expand-only)
- New local `expandedItems` state (`Set<string>` of labels), toggled on parent click; chevron icon rotates on expand/collapse
- Active-state check extended: if any child's `href` matches `pathname`, auto-expand that parent and highlight the child

**Pages**:
- `frontend/src/app/(app)/dashboard/payments/page.tsx` → `PaymentsPageClient.tsx`, structured like `ClientsPageClient.tsx` (table + search input + modal form)
- List columns: Case Reference, Client, Vehicle Reg. No., Executive, Case Status (badge), Billing Status (badge), Amount, Actions
- Pagination: `page`/`limit`/`pages`, same shape as `clientService.list()`
- Search: filters by `case_reference` / `vehicle_registration_number`
- "Export to Excel": builds `.xlsx` client-side from the currently filtered list using the new `xlsx` (SheetJS) npm package

**Modal form** (inline in `PaymentsPageClient.tsx`, matching `ClientsPageClient.tsx`'s inline-form convention): Case Reference (text), Client (dropdown via `clientService.list({ type: 'CLIENT' })`), Finance (dropdown via `clientService.list({ type: 'FINANCER' })`, optional), Vehicle Reg. No. (text), Executive (dropdown via `employeeService.list()`), Case Status (select), Billing Status (select) → conditionally reveals Payment Mode (radio) → conditionally reveals UTR Number + Transaction Date&Time (Transfer only) and Amount (both Cash and Transfer), matching the 5.2 validation matrix exactly (client-side mirror of the server validation — not a substitute for it).

**New service**: `frontend/src/services/complaint/paymentService.ts`, structured identically to `clientService.ts`.

## Section 6: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sidebar nesting is new UI behavior with no existing precedent — could introduce a regression in the flat-list rendering for all other menu items | Low | Medium — visual/nav regression across the whole app | Keep `children`-less items rendering through the exact same `<Link>` path as today; only branch into new rendering when `children` is present |
| Guideline deviation (`String` instead of `lkp_*`) may be flagged by an automated guideline-compliance check in `/aicodepath-validate-guidelines` or similar | High (by design) | Low — known, accepted, documented in Section 4 | This design doc itself is the record; reference it if the deviation is questioned later |
| `xlsx` (SheetJS) is a new frontend dependency — supply-chain/bundle-size consideration | Low | Low | Use the actively-maintained `xlsx` (SheetJS Community Edition) package; scope import to the payments page only (dynamic import) to avoid bloating the main bundle |
| Client-side-only export means very large payment lists could be slow/memory-heavy to export in-browser | Low (no stated scale requirement) | Low | Acceptable for now; revisit with server-side export if list sizes grow significantly |
| `finance_id` FK to `clients` where `type != FINANCER` is not enforced at the DB level (type is just a `String` column, no CHECK constraint per the no-CHECK-with-inline-values guideline) | Medium | Low — a payment could reference a client with the wrong `type` | Enforce at the Pydantic/service layer: validate the referenced client's `type` matches the expected role (`CLIENT` for `client_id`, `FINANCER` for `finance_id`) before insert/update |

## Section 7: Files Impact Summary

### New files:
- `backend/alembic/versions/20260723_000000_payment_management_module.py` — schema migration for `payments` table
- `backend/services/complaint/models/payment.py` — `Payment` SQLAlchemy model
- `backend/services/complaint/schemas/payment.py` — request/response schemas + conditional validators
- `backend/services/complaint/services/payment_service.py` — CRUD service
- `backend/services/complaint/api/payments.py` — API routes
- `scripts/seed_payment_permissions.py` — idempotent permission seed script
- `frontend/src/services/complaint/paymentService.ts` — frontend API client
- `frontend/src/app/(app)/dashboard/payments/page.tsx` — route wrapper
- `frontend/src/app/(app)/dashboard/payments/PaymentsPageClient.tsx` — list + modal form

### Modified files:
- `backend/services/complaint/api/__init__.py` — register the new `payments` router
- `backend/services/complaint/api/clients.py`, `services/client_service.py`, `schemas/client.py` — add optional `type` filter param to `list_clients`
- `frontend/src/components/layout/AppSidebar.tsx` — add `children` support, restructure `Payroll` entry
- `frontend/package.json` — add `xlsx` dependency

### Unchanged (referenced but not modified):
- `backend/services/complaint/models/client.py` — `Client.type` reused as-is for dropdown filtering
- `backend/services/complaint/models/complaint.py` — `Complaint.owner_employee_id` pattern referenced as precedent, not modified
- `backend/services/hr/models/employee.py` — `Employee` reused as-is for the Executive dropdown
- `backend/services/auth/models/role.py`, `scripts/seed_roles.py` — existing RBAC infra reused for new `payments:*` permissions

## Section 8: Acceptance Criteria

| Criterion | Verification | Pass |
|---|---|---|
| `payments` table exists with all specified columns, FKs, and indexes | `psql -h localhost -p 5434 -U axionpcs -d axionpcs_db -c "\d payments"` shows all columns from Section 5.1 including `idx_payments_tenant`, `idx_payments_client`, `idx_payments_case_status` | [ ] |
| Backend CRUD API is live and permission-gated | `curl -X POST http://localhost:8107/api/v1/complaints/payments` without auth returns 401; with a `payments:create`-less token returns 403; with a valid HR_ADMIN token and valid body returns 201 | [ ] |
| Conditional validation is enforced server-side (not just client-side) | `POST /payments` with `billing_status=CUSTOMER_BILLING` and `payment_mode=TRANSFER` but no `utr_number` returns 422 | [ ] |
| Client/Finance dropdowns only show correctly-typed clients | `GET /api/v1/complaints/clients?type=FINANCER` returns only rows where `type='FINANCER'` | [ ] |
| Sidebar shows Payroll as an expandable parent containing "Payment Management", and other menu items are visually unaffected | Manual check: load `/dashboard`, click "Payroll" — expands to show "Payment Management" link; all other sidebar items render/navigate exactly as before | [ ] |
| Payments list page supports create, edit, delete, search, and pagination | Manual check: navigate to `/dashboard/payments`, create a payment via the modal, see it in the list, edit it, search for it by case reference, delete it | [ ] |
| Export to Excel produces a valid `.xlsx` file with the current filtered list | Manual check: click "Export to Excel" on `/dashboard/payments`, resulting file opens in Excel/LibreOffice with correct columns and rows | [ ] |
| Access is restricted to SUPER_ADMIN, HR_ADMIN, MANAGER | Manual check: log in as an EMPLOYEE-only user — "Payment Management" sidebar link is hidden and direct API calls return 403 | [ ] |

---

*Design synthesized from an approved `/aicodepath-brainstorm` conversation on 2026-07-23. All 4 design sections (schema, validation, API, frontend) were presented individually and explicitly approved via user selection before this document was written.*
