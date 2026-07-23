# Implementation Plan: Payment Management Module

**Goal**: Add a role-gated Payment Management CRUD module (backend + frontend) under a new Payroll sidebar submenu, tracking case-level payment records with client/finance references and conditional billing details.
**Design doc**: `aicodepath-docs/design/2026-07-23-payment-management-module-design.md`
**Estimated tasks**: 14
**Tech stack**: FastAPI + SQLAlchemy (async) + Alembic + Pydantic v2 (backend, `complaint` service), Next.js App Router + TypeScript + Tailwind (frontend), `xlsx` (SheetJS) new dependency

## Architecture Notes
- New `payments` table lives in the shared Alembic chain, owned by the `complaint` service (same DB session as `clients` — enables a real FK on `client_id`/`finance_id`).
- `executive_employee_id` is a bare UUID, no FK — mirrors `Complaint.owner_employee_id`'s established cross-service-reference precedent (employees live in the `hr` service).
- `case_status`/`billing_status`/`payment_mode` are plain `String` columns + Python constants — matches `Complaint.status`/`Invoice.status`/`Client.type`, a deliberate, documented deviation from the written `lkp_*` lookup-table guideline (see design doc Section 3 "Constraints Discovered").
- Conditional field requirements (billing_status → payment_mode → amount/UTR/transaction_datetime) are enforced server-side via a Pydantic `@model_validator`, never client-only.
- `payments.py` endpoints use `require_permission("payments:*")` — this is the **first** use of that dependency inside the `complaint` service (its sibling `clients.py` currently only checks `get_current_user`); confirmed with the user this stricter gating is intentional, matching the SUPER_ADMIN/HR_ADMIN/MANAGER access decision.
- Excel export is 100% client-side (SheetJS `xlsx` package, dynamically imported), built from the currently-fetched/filtered payment list — no new backend export endpoint.
- Sidebar gains its first-ever submenu/nesting behavior; `Payroll` becomes expand-only (no direct link), containing a single child `Payment Management`.

## Recommended Agents
> Populated from `/aicodepath-classify-component` (invoked during brainstorm with this same topic — component types: database, api, service, frontend, security, test).

### Design Phase
- ⟶ **aicodepath-database-architect** — Schema and migration decisions
- ⟶ **aicodepath-architect** — Component boundaries, system design
- ⟶ **aicodepath-security-engineer** — Threat modeling, auth design
- ⟶ **aicodepath-api-designer** — API contract and versioning
- ⟶ **aicodepath-frontend-architect** — Component hierarchy, state
- ⟶ **aicodepath-codebase-pattern-finder** — Brownfield pattern discovery

### Plan Phase
- ⟶ **aicodepath-security-engineer** — Threat modeling, auth design
- ⟶ **aicodepath-plan-critic** — Plan quality gate — clarity, feasibility, value
- ⟶ **aicodepath-plan-analyst** — Effort estimation, risk, task sequencing
- ⟶ **aicodepath-test-engineer** — TDD strategy, coverage

### Construction Phase
- ⟶ **aicodepath-database-architect** / **aicodepath-orm-selector** — migration + model tasks
- ⟶ **aicodepath-backend-architect** — service boundary, API implementation
- ⟶ **aicodepath-api-designer** — endpoint/permission wiring
- ⟶ **aicodepath-fastapi-expert** — async patterns, Pydantic v2 validators
- ⟶ **aicodepath-security-engineer** — permission-gating review
- ⟶ **aicodepath-frontend-architect** / **aicodepath-nextjs-expert** — sidebar + page components
- ⟶ **aicodepath-react-expert** — form/conditional-rendering logic
- ⟶ **aicodepath-test-engineer** / **aicodepath-qa** — test coverage
- ⟶ **aicodepath-code-simplifier** — post-write clarity pass (all tasks, after code is written)

## Tasks

| Task | Agent | Content | DoD | Depends | Batch | Status |
|------|-------|---------|-----|---------|-------|--------|
| T1 | aicodepath-database-architect | Add `payments` table Alembic migration | `alembic upgrade heads` (DATABASE_URL=local dev DB) exits 0; `\d payments` shows all Section 5.1 columns + 3 indexes | — | 1 | TODO |
| T2 | aicodepath-backend-architect | Add `type` query filter to `list_clients` (schema + service + api) | `GET /api/v1/complaints/clients?type=FINANCER` returns only `type='FINANCER'` rows | — | 1 | TODO |
| T3 | aicodepath-security-engineer | Seed `payments:*` RBAC permissions | `scripts/seed_payment_permissions.py` run twice is idempotent; `role_permissions` has 4 new rows for `HR_ADMIN` and `MANAGER` each | — | 1 | TODO |
| T4 | aicodepath-database-architect | `Payment` SQLAlchemy model | `from services.complaint.models.payment import Payment` succeeds; model columns match T1 migration exactly | T1 | 2 | TODO |
| T5 | aicodepath-fastapi-expert | `Payment` Pydantic schemas + conditional `@model_validator` | `pytest backend/tests/unit/complaint/test_payment_schemas.py` exits 0, all 4 validation-matrix cases covered | T4 | 2 | TODO |
| T6 | aicodepath-backend-architect | `PaymentService` CRUD | `pytest backend/tests/unit/complaint/test_payment_service.py` exits 0 | T5 | 2 | TODO |
| T7a | aicodepath-api-designer | `payments` API router (routes only, no permission gating yet) | `pytest backend/tests/unit/complaint/test_payments_api.py::test_create_payment_success` exits 0 | T6 | 2 | TODO |
| T7b | aicodepath-security-engineer | Add `require_permission` gating to all 5 `payments` endpoints | `pytest backend/tests/unit/complaint/test_payments_api.py::test_create_payment_forbidden_without_permission` exits 0; unauthenticated request returns 401, authenticated-but-unpermitted returns 403 | T7a | 2 | TODO |
| T8 | aicodepath-backend-architect | Register `payments` router in `api/__init__.py` | `GET /api/v1/complaints/payments` (with valid HR_ADMIN auth) returns 200, not 404 | T7b | 2 | TODO |
| T9 | aicodepath-nextjs-expert | Frontend `paymentService.ts` | `npx vitest run frontend/tests/services/paymentService.test.ts` exits 0 | T8 | 3 | TODO |
| T10 | aicodepath-frontend-architect | Add `type` param to frontend `clientService.list()` + install `xlsx` dependency | `npx vitest run frontend/tests/services/clientService.test.ts` exits 0; `frontend/package.json` has `xlsx` in dependencies | T2 | 3 | TODO |
| T11 | aicodepath-frontend-architect | `AppSidebar.tsx` submenu support (`children`, expand state, Payroll restructure) | `npx vitest run frontend/tests/components/layout/AppSidebar.test.tsx` exits 0; all existing (non-Payroll) menu items still render as plain links | — | 3 | TODO |
| T12 | aicodepath-react-expert | `PaymentsPageClient.tsx` — list, search, pagination | `npx vitest run frontend/tests/pages/paymentsPage.test.tsx::list rendering` exits 0 | T9 | 4 | TODO |
| T13 | aicodepath-react-expert | `PaymentsPageClient.tsx` — modal form with full conditional-field logic | `npx vitest run frontend/tests/pages/paymentsPage.test.tsx::conditional form fields` exits 0, all 4 validation-matrix branches covered in UI | T12 | 4 | TODO |
| T14 | aicodepath-react-expert | `PaymentsPageClient.tsx` — Excel export button | `npx vitest run frontend/tests/pages/paymentsPage.test.tsx::export` exits 0 (mocked `xlsx.writeFile` called with expected rows); run `/aicodepath-verify` and `/aicodepath-acceptance` (sprint close) | T13, T11 | 4 | TODO |

---

### Task T1: Add `payments` table Alembic migration

**Why**: Every backend task in Batch 2 depends on this table existing.
**Agent**: aicodepath-database-architect

**Steps**:
1. Write failing verification: run `PGPASSWORD=axionpcs_secret psql -h localhost -p 5434 -U axionpcs -d axionpcs_db -c "\d payments"` — confirm it currently errors with `did not find any relation named "payments"`
2. Create `backend/alembic/versions/20260723_000000_payment_management_module.py` with `down_revision` pointing to the current head. Run `DATABASE_URL="postgresql://axionpcs:axionpcs_secret@localhost:5434/axionpcs_db" alembic heads` from `backend/` first — this is the single shared migration chain across all 12 microservices (not per-service), so there is one authoritative set of head(s) to check. If more than one head is returned (branched history from an earlier sprint), pick the head whose migration is most recently dated / most directly related to `clients`/`invoices` (the `20260603_000000_client_type` chain), since `payments` depends on `clients` existing.
3. Migration `upgrade()`: create `payments` table exactly per design doc Section 5.1 (all columns, FKs to `tenants`/`clients`/`users`, 3 indexes). `downgrade()`: drop the table.
4. Run `DATABASE_URL="postgresql://axionpcs:axionpcs_secret@localhost:5434/axionpcs_db" alembic upgrade heads` from `backend/`
5. Verify: `psql ... -c "\d payments"` now shows all columns and indexes
6. Commit: `git commit -m "feat(complaint): add payments table migration"`

**Done when**: `\d payments` output matches the design doc schema exactly, migration is at head, `alembic downgrade -1` then `alembic upgrade heads` round-trips cleanly.

---

### Task T2: Add `type` filter to `list_clients`

**Why**: Payment form's Client/Finance dropdowns need to filter `clients` by `type`; no such filter exists today.
**Agent**: aicodepath-backend-architect

**Steps**:
1. Write failing test in `backend/tests/unit/complaint/test_client_service.py` (new file — no test file exists yet for `client_service.py`): `test_list_clients_filters_by_type` — create two clients (`type=CLIENT`, `type=FINANCER`), call `service.list(tenant_id, type_filter="FINANCER")`, assert only the FINANCER one returns
2. Run `pytest backend/tests/unit/complaint/test_client_service.py -k filters_by_type` — verify it fails (method doesn't accept `type_filter` yet)
3. Implement: add `type: Optional[str] = Query(None)` to `list_clients` in `backend/services/complaint/api/clients.py`, thread through `ClientService.list()` in `backend/services/complaint/services/client_service.py` (add `type_filter` param, `.where(Client.type == type_filter)` when set)
4. Run `pytest backend/tests/unit/complaint/test_client_service.py` — verify it passes
5. Manual check: `curl "http://localhost:8107/api/v1/complaints/clients?type=FINANCER"` (with valid auth) returns only FINANCER rows
6. Commit: `git commit -m "feat(complaint): add type filter to client list endpoint"`

**Done when**: `pytest backend/tests/unit/complaint/test_client_service.py` exits 0; manual curl check confirms filtering works.

---

### Task T3: Seed `payments:*` RBAC permissions

**Why**: `payments.py` (T7b) needs these permission rows to exist before `require_permission("payments:create")` etc. can succeed for any role.
**Agent**: aicodepath-security-engineer

**Steps**:
1. TDD exception (documented, not a gap): this is a one-off idempotent data seed script, not application logic under test — same category as the existing `scripts/seed_roles.py`, which also has no test file. In place of a unit test, step 6 below is the executable "red/green" check: run it once (red — permissions don't exist yet), verify, then re-run (green — idempotent, no duplicates).
2. Create `scripts/seed_payment_permissions.py`, copying the idempotent structure of `scripts/seed_roles.py` exactly (existence checks before insert, `ON CONFLICT DO NOTHING` on `role_permissions`)
3. Define permissions: `payments:create`, `payments:read`, `payments:update`, `payments:delete` (module=`payments`, matching the `{module}:{action}:{scope}` convention — no scope suffix needed since these are tenant-wide, not self/team-scoped)
4. Assign all 4 to `HR_ADMIN` and `MANAGER` roles (both already exist from the earlier `seed_roles.py` run in this session)
5. Run the script against the local dev DB (via `docker cp` + `docker exec` into `axionpcs-auth-service`, same procedure used for `seed_roles.py` earlier in this session)
6. Verify: `psql ... -c "SELECT code FROM permissions WHERE module='payments'"` returns 4 rows; `SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON rp.role_id=r.id JOIN permissions p ON rp.permission_id=p.id WHERE p.module='payments' AND r.code IN ('HR_ADMIN','MANAGER')` returns 8
7. Commit: `git commit -m "feat(auth): seed payments RBAC permissions"`

**Done when**: verification queries in step 6 return the expected counts; re-running the script produces no duplicate rows.

---

### Task T4: `Payment` SQLAlchemy model

**Why**: Schemas, service, and API all import this model.
**Agent**: aicodepath-database-architect
**Depends**: T1

**Steps**:
1. Write failing test in `backend/tests/unit/complaint/test_models.py` (append to existing file, following its `TestComplaintCategoryModel`-style class pattern): `TestPaymentModel::test_payment_creation` — instantiate `Payment` with all required fields, `db_session.add`/`commit`/`refresh`, assert `id is not None` and `case_status == "ASSIGNED"` (default)
2. Run `pytest backend/tests/unit/complaint/test_models.py -k TestPaymentModel` — verify it fails (`ImportError: no module named services.complaint.models.payment`)
3. Implement `backend/services/complaint/models/payment.py`: SQLAlchemy `Payment` class mapping every column from T1's migration exactly (types, nullability, defaults, FKs) — follow `backend/services/complaint/models/client.py`'s style (Mapped[...] annotations, `func.now()` server defaults)
4. Run `pytest backend/tests/unit/complaint/test_models.py -k TestPaymentModel` — verify it passes
5. Commit: `git commit -m "feat(complaint): add Payment model"`

**Done when**: test passes; model's column set is byte-for-byte consistent with the live `payments` table (spot-check with `\d payments` from T1).

---

### Task T5: `Payment` Pydantic schemas + conditional validator

**Why**: API layer needs typed request/response schemas with the billing/payment-mode validation matrix enforced server-side (per `anti-trust-client-validation`).
**Agent**: aicodepath-fastapi-expert
**Depends**: T4

**Steps**:
1. Write failing tests in `backend/tests/unit/complaint/test_payment_schemas.py` (new file): 4 cases from the design doc's validation matrix —
   - `test_company_billing_rejects_payment_mode` (billing_status=COMPANY_BILLING + payment_mode set → raises `ValidationError`)
   - `test_customer_billing_requires_payment_mode` (billing_status=CUSTOMER_BILLING, no payment_mode → raises)
   - `test_cash_requires_amount_but_not_utr` (payment_mode=CASH, amount=None → raises; payment_mode=CASH, amount=100, utr_number="X" → raises, since CASH forbids UTR)
   - `test_transfer_requires_utr_and_datetime_and_amount` (payment_mode=TRANSFER, missing any of utr_number/transaction_datetime/amount → raises)
2. Run `pytest backend/tests/unit/complaint/test_payment_schemas.py` — verify all 4 fail (`ImportError`)
3. Implement `backend/services/complaint/schemas/payment.py`: `PaymentCreateRequest`, `PaymentUpdateRequest`, `PaymentResponse`, `PaymentListResponse` (follow `schemas/client.py`'s `ConfigDict(populate_by_name=True, from_attributes=True)` + camelCase alias convention exactly). Add a `@model_validator(mode="after")` implementing the exact matrix from design doc Section 5.2.
4. Run `pytest backend/tests/unit/complaint/test_payment_schemas.py` — verify all 4 pass
5. Commit: `git commit -m "feat(complaint): add Payment schemas with conditional validation"`

**Done when**: all 4 tests pass; `amount` field rejects non-positive values and >2 decimal places (add a 5th quick test case for this).

---

### Task T6: `PaymentService` CRUD

**Why**: API layer needs a service to call; keeps business logic out of route handlers (`controller-no-db` guideline).
**Agent**: aicodepath-backend-architect
**Depends**: T5

**Steps**:
1. Write failing tests in `backend/tests/unit/complaint/test_payment_service.py` (new file, mirror `client_service.py`'s implicit test shape): `test_create_payment`, `test_list_payments_filters_by_case_status`, `test_update_payment`, `test_soft_delete_payment_excluded_from_list`
2. Run `pytest backend/tests/unit/complaint/test_payment_service.py` — verify all fail (`ImportError`)
3. Implement `backend/services/complaint/services/payment_service.py`: `PaymentService` class with `create`/`get_by_id`/`update`/`delete` (soft delete: set `is_deleted=True`, `deleted_at=now()`, per design doc — do NOT hard-delete)/`list` (paginated, filters: search on `case_reference`/`vehicle_registration_number`, `case_status`, `billing_status`, `client_id`; always excludes `is_deleted=True` rows). Explicit field whitelisting on create/update — construct the `Payment(...)` object with named kwargs from the validated schema, never `**request.dict()` (per `anti-mass-assignment`).
4. Run `pytest backend/tests/unit/complaint/test_payment_service.py` — verify all pass
5. Commit: `git commit -m "feat(complaint): add PaymentService CRUD"`

**Done when**: all 4 tests pass; soft-deleted payments never appear in `list()` results.

---

### Task T7a: `payments` API router (routes, no permission gating yet)

**Why**: Split from T7b (Pattern C pipeline: gating validates/gates on the route implementation) so route logic and security gating are reviewed as clearly separable concerns.
**Agent**: aicodepath-api-designer
**Depends**: T6

**Steps**:
1. Write failing test in `backend/tests/unit/complaint/test_payments_api.py` (new file): `test_create_payment_success` — POST valid payload with a stub/mocked authenticated user, assert 201 and response shape matches `PaymentResponse`
2. Run test — verify it fails (404, route doesn't exist)
3. Implement `backend/services/complaint/api/payments.py`: 5 routes (POST/GET list/GET one/PUT/DELETE) at `/payments`, using `get_current_user` only for now (matches `clients.py`'s current baseline — permission gating added in T7b), following `api/clients.py`'s exact structure (`ApiResponse` wrapper, `x_request_id` header handling)
4. Run test — verify it passes
5. Commit: `git commit -m "feat(complaint): add payments API routes"`

**Done when**: `test_create_payment_success` passes; all 5 routes exist and call the correct `PaymentService` methods (verify by reading, not just testing happy path).

---

### Task T7b: Add `require_permission` gating to `payments` endpoints

**Why**: Per the user's explicit decision, Payment Management must be restricted to SUPER_ADMIN/HR_ADMIN/MANAGER — stricter than sibling `clients.py`. This is the first use of `require_permission` inside the `complaint` service.
**Agent**: aicodepath-security-engineer
**Depends**: T7a

**Steps**:
1. Write failing tests in `test_payments_api.py`: `test_create_payment_forbidden_without_permission` (authenticated user with no `payments:create` permission → 403), `test_create_payment_unauthenticated` (no auth token → 401)
2. Run tests — verify both fail (currently any authenticated user succeeds, per T7a's baseline)
3. Implement: replace `Depends(get_current_user)` with `Depends(require_permission("payments:create"))` / `"payments:read"` / `"payments:update"` / `"payments:delete"` on the 5 routes (list+get use `payments:read`), importing from `shared.dependencies` exactly as `backend/services/auth/api/roles.py` does
4. Run tests — verify they pass; re-run T7a's `test_create_payment_success` to confirm it still passes when the mocked user DOES have the permission
5. Commit: `git commit -m "feat(complaint): gate payments API with require_permission"`

**Done when**: 401/403 tests pass; a SUPER_ADMIN-role test user succeeds on all 5 routes (SUPER_ADMIN bypasses checks per `require_permission`'s own logic).

---

### Task T8: Register `payments` router

**Why**: Routes are unreachable until mounted on the service's aggregate router.
**Agent**: aicodepath-backend-architect
**Depends**: T7b

**Steps**:
1. Write failing verification: `curl http://localhost:8107/api/v1/complaints/payments` currently returns 404
2. Add `from .payments import router as payments_router` and `router.include_router(payments_router)` to `backend/services/complaint/api/__init__.py`
3. Confirm `axionpcs-complaint-service` container hot-reloads (it runs `uvicorn --reload` per this session's earlier findings) — check `docker logs axionpcs-complaint-service --tail 15` for a clean reload with no import errors
4. Verify: `curl` with a valid HR_ADMIN bearer token now returns 200 (or 401/403 as appropriate, not 404)
5. Run full backend test suite for this service: `pytest backend/tests/unit/complaint/ -v`
6. **Sprint-close step for Batch 2**: run `/aicodepath-verify` — batch quality gate must pass
7. Commit: `git commit -m "feat(complaint): register payments router"`

**Done when**: `curl .../payments` no longer 404s; full `backend/tests/unit/complaint/` suite passes; `/aicodepath-verify` reports clean.

---

### Task T9: Frontend `paymentService.ts`

**Why**: Frontend pages need a typed API client; nothing else in the frontend can be built until this exists.
**Agent**: aicodepath-nextjs-expert
**Depends**: T8

**Steps**:
1. Write failing test `frontend/tests/services/paymentService.test.ts` (mirror `frontend/tests/services/taskService.test.ts`'s MSW-mock structure): test `list`, `create`, `update`, `delete` each hit the expected URL/method and return typed data
2. Run `npx vitest run frontend/tests/services/paymentService.test.ts` — verify it fails (module doesn't exist)
3. Implement `frontend/src/services/complaint/paymentService.ts`: `Payment`, `PaymentCreateRequest`, `PaymentUpdateRequest`, `PaymentListResponse` interfaces + `paymentService` object (`list`/`getById`/`create`/`update`/`delete`), structured identically to `frontend/src/services/complaint/clientService.ts`
4. Run test — verify it passes
5. Commit: `git commit -m "feat(frontend): add paymentService"`

**Done when**: test passes; type shapes match backend `PaymentResponse`/`PaymentCreateRequest` field-for-field (camelCase aliases).

---

### Task T10: Add `type` param to frontend `clientService.list()` + install `xlsx`

**Why**: Payment form's Client/Finance dropdowns call `clientService.list({ type: ... })`; `xlsx` is needed for T14's export.
**Agent**: aicodepath-frontend-architect
**Depends**: T2

**Steps**:
1. Write failing test in `frontend/tests/services/clientService.test.ts` (new file, mirror `taskService.test.ts` pattern): `test_list_passes_type_query_param` — call `clientService.list({ type: 'FINANCER' })`, assert the mocked request URL includes `type=FINANCER`
2. Run test — verify it fails (`list` doesn't accept `type` param yet)
3. Implement: add `type?: 'CLIENT' | 'FINANCER'` to the `list` params type in `frontend/src/services/complaint/clientService.ts`
4. Run `cd frontend && npm install xlsx` — adds to `package.json` dependencies
5. Run test — verify it passes
6. Commit: `git commit -m "feat(frontend): add type filter to clientService, install xlsx"`

**Done when**: test passes; `frontend/package.json` has `"xlsx"` under `dependencies`.

---

### Task T11: `AppSidebar.tsx` submenu support

**Why**: First-ever nested-menu UI in this app; needed before the Payment Management link can appear anywhere.
**Agent**: aicodepath-frontend-architect

**Steps**:
1. Write failing test `frontend/tests/components/layout/AppSidebar.test.tsx` (new file): render `AppSidebar`, assert (a) all pre-existing flat items (e.g. "Employees") still render as direct `<Link>`s, (b) "Payroll" renders as a non-link expandable row, (c) clicking "Payroll" reveals "Payment Management" as a child link to `/dashboard/payments`
2. Run `npx vitest run frontend/tests/components/layout/AppSidebar.test.tsx` — verify it fails
3. Implement: add optional `children?: {label, href, icon?, permission?}[]` to the `menuItems` item shape; restructure the `Payroll` entry to have `children: [{label: 'Payment Management', href: '/dashboard/payments', permission: 'payments:read'}]` and no `href`; add `expandedItems` state (`useState<Set<string>>`), render items with `children` as a clickable-to-expand `<button>` + nested `<ul>` instead of a `<Link>`; auto-expand if `pathname` matches a child's `href`
4. Run test — verify it passes
5. Run full existing test suite touching this file (if any others reference `AppSidebar`) to catch regressions
6. Commit: `git commit -m "feat(frontend): add submenu support to AppSidebar, nest Payment Management under Payroll"`

**Done when**: test passes; manually verified in dev server that every other sidebar item's click/navigate behavior is unchanged.

---

### Task T12: `PaymentsPageClient.tsx` — list, search, pagination

**Why**: Base page structure other tasks (form, export) build on top of.
**Agent**: aicodepath-react-expert
**Depends**: T9

**Steps**:
1. Write failing test `frontend/tests/pages/paymentsPage.test.tsx` (new file, mirror `frontend/tests/pages/leavePage.test.tsx`'s structure) — describe block "list rendering": mocks `paymentService.list`, renders `PaymentsPageClient`, asserts table shows returned rows' Case Reference/Client/Vehicle Reg/Executive/Case Status/Billing Status/Amount columns; typing in search input + pressing Enter re-calls `paymentService.list` with the search term
2. Run `npx vitest run frontend/tests/pages/paymentsPage.test.tsx -t "list rendering"` — verify it fails
3. Implement `frontend/src/app/(app)/dashboard/payments/page.tsx` (thin server wrapper) and `frontend/src/app/(app)/dashboard/payments/PaymentsPageClient.tsx` (list + search + pagination only, no modal yet — structure mirrors `ClientsPageClient.tsx`)
4. Run test — verify it passes
5. Commit: `git commit -m "feat(frontend): add payments list page with search and pagination"`

**Done when**: the "list rendering" test block passes; navigating to `/dashboard/payments` in the dev server shows a working, empty-safe table.

---

### Task T13: `PaymentsPageClient.tsx` — modal form with conditional fields

**Why**: Core CRUD create/edit functionality; the most complex UI logic in this plan (billing_status → payment_mode → amount/UTR/datetime cascade).
**Agent**: aicodepath-react-expert
**Depends**: T12

**Steps**:
1. Write failing tests in `paymentsPage.test.tsx`, describe block "conditional form fields": (a) selecting Billing Status=Company Billing hides Payment Mode/UTR/Amount fields, (b) selecting Customer Billing reveals Payment Mode radio, (c) selecting Cash reveals Amount but not UTR/Transaction Date, (d) selecting Transfer reveals UTR + Transaction Date&Time + Amount; also test Client dropdown only calls `clientService.list({type: 'CLIENT'})` and Finance dropdown only calls with `{type: 'FINANCER'}`
2. Run tests — verify all fail
3. Implement the modal form inside `PaymentsPageClient.tsx` (inline, matching `ClientsPageClient.tsx`'s inline-form convention): all fields per design doc Section 5.4, conditional rendering driven by local form state, calling `paymentService.create`/`update` on submit
4. Run tests — verify all pass
5. Commit: `git commit -m "feat(frontend): add payment create/edit modal with conditional fields"`

**Done when**: all 4 conditional-rendering test cases pass; manually verified in dev server that the full Company Billing / Customer Billing+Cash / Customer Billing+Transfer paths all submit successfully and match the backend's T5 validation matrix (no 422s on valid submissions).

---

### Task T14: `PaymentsPageClient.tsx` — Excel export

**Why**: Final required feature from the original spec; last task in the plan.
**Agent**: aicodepath-react-expert
**Depends**: T13, T11

**Steps**:
1. Write failing test in `paymentsPage.test.tsx`, describe block "export": mock `xlsx`'s `utils.json_to_sheet`/`writeFile`, click "Export to Excel", assert `writeFile` was called with a workbook containing one row per currently-filtered payment and the expected column headers
2. Run test — verify it fails
3. Implement: "Export to Excel" button in `PaymentsPageClient.tsx`, dynamically importing `xlsx` (`await import('xlsx')` inside the click handler to avoid bundling it into the main chunk), building rows from the current `payments` state array, calling `XLSX.writeFile`
4. Run test — verify it passes
5. Run the full frontend test suite: `cd frontend && npx vitest run`
6. **Sprint-close steps (final task of final batch)**:
   - Run `/aicodepath-verify` — all tests pass, no regressions
   - Run `/aicodepath-acceptance` — verify all 8 criteria from design doc Section 8 one-by-one
7. Commit: `git commit -m "feat(frontend): add Excel export to payments list"`

**Done when**: export test passes; `/aicodepath-verify` and `/aicodepath-acceptance` both report clean; manually confirmed exported `.xlsx` opens correctly.

---

## Branch Lifecycle
> This section will be populated by /aicodepath-worktree when the
> implementation branch is created. Do not begin implementation
> until this section exists with actual branch details.

- [ ] Worktree created: TBD
- [ ] Commit: Batch 1 — T1, T2, T3
- [ ] Commit: Batch 2 — T4, T5, T6, T7a, T7b, T8
- [ ] Commit: Batch 3 — T9, T10, T11
- [ ] Commit: Batch 4 — T12, T13, T14
- [ ] Merge feature branch -> main
- [ ] Remove worktree
- [ ] Clear active-worktree.json

## Sprint Acceptance

> HARD GATE — Every item verified with evidence (git hash, test output,
> or explicit confirmation). Applies to ALL sessions. No exceptions.

- [ ] All batch commits confirmed (hashes listed in Branch Lifecycle above)
- [ ] Feature branch merged to main (merge commit hash: ___)
- [ ] git worktree remove confirmed
- [ ] active-worktree.json cleared
- [ ] All tests passing on main (test output attached)
- [ ] Acceptance criteria from design doc verified (one-by-one, see design doc Section 8)

## Context Gate Note
> This environment lacks the `better-sqlite3` native module, so DB-backed unit tracking
> (`orchestrate load`/`orchestrate plan`) and ArtifactWriter/SessionStateManager persistence
> are unavailable. Execution path: `/aicodepath-subagent-dev` reading this file directly, NOT
> `/aicodepath-orchestrate`. If context usage reaches 50-60% mid-execution, resume with:
> `/aicodepath-subagent-dev aicodepath-docs/plan/2026-07-23-payment-management-module-plan.md`
> starting from the first task whose Status is not yet DONE (check `tasks.md` for current status).
