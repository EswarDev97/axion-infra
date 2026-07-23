# Tasks: Payment Management Module

Design: `aicodepath-docs/design/2026-07-23-payment-management-module-design.md`
Plan: `aicodepath-docs/plan/2026-07-23-payment-management-module-plan.md`

| Task | Agent | Content | DoD | Depends | Batch | Status |
|------|-------|---------|-----|---------|-------|--------|
| T1 | aicodepath-database-architect | Add `payments` table Alembic migration in `backend/alembic/versions/` | `alembic upgrade heads` exits 0; `\d payments` shows all columns + 3 indexes | — | 1 | TODO |
| T2 | aicodepath-backend-architect | Add `type` filter to `list_clients` (schema+service+api) | `GET /api/v1/complaints/clients?type=FINANCER` returns only FINANCER rows | — | 1 | TODO |
| T3 | aicodepath-security-engineer | Seed `payments:*` RBAC permissions via new `scripts/seed_payment_permissions.py` | Script idempotent; `HR_ADMIN`/`MANAGER` each get 4 new permission rows | — | 1 | TODO |
| T4 | aicodepath-database-architect | `Payment` SQLAlchemy model in `backend/services/complaint/models/payment.py` | `pytest backend/tests/unit/complaint/test_models.py -k TestPaymentModel` exits 0 | T1 | 2 | TODO |
| T5 | aicodepath-fastapi-expert | `Payment` Pydantic schemas + conditional `@model_validator` in `backend/services/complaint/schemas/payment.py` | `pytest backend/tests/unit/complaint/test_payment_schemas.py` exits 0, 4+ matrix cases covered | T4 | 2 | TODO |
| T6 | aicodepath-backend-architect | `PaymentService` CRUD in `backend/services/complaint/services/payment_service.py` | `pytest backend/tests/unit/complaint/test_payment_service.py` exits 0 | T5 | 2 | TODO |
| T7a | aicodepath-api-designer | `payments` API router (routes only) in `backend/services/complaint/api/payments.py` | `pytest backend/tests/unit/complaint/test_payments_api.py::test_create_payment_success` exits 0 | T6 | 2 | TODO |
| T7b | aicodepath-security-engineer | Add `require_permission` gating to all 5 `payments` endpoints | 401/403 tests pass in `test_payments_api.py` | T7a | 2 | TODO |
| T8 | aicodepath-backend-architect | Register `payments` router in `backend/services/complaint/api/__init__.py` | `curl .../payments` no longer 404s; full `backend/tests/unit/complaint/` suite passes; `/aicodepath-verify` clean | T7b | 2 | TODO |
| T9 | aicodepath-nextjs-expert | Frontend `paymentService.ts` in `frontend/src/services/complaint/paymentService.ts` | `npx vitest run frontend/tests/services/paymentService.test.ts` exits 0 | T8 | 3 | TODO |
| T10 | aicodepath-frontend-architect | Add `type` param to frontend `clientService.list()`; install `xlsx` | `npx vitest run frontend/tests/services/clientService.test.ts` exits 0; `xlsx` in `package.json` | T2 | 3 | TODO |
| T11 | aicodepath-frontend-architect | `AppSidebar.tsx` submenu support, nest Payment Management under Payroll | `npx vitest run frontend/tests/components/layout/AppSidebar.test.tsx` exits 0; other menu items unaffected | — | 3 | TODO |
| T12 | aicodepath-react-expert | `PaymentsPageClient.tsx` — list, search, pagination | `npx vitest run frontend/tests/pages/paymentsPage.test.tsx -t "list rendering"` exits 0 | T9 | 4 | TODO |
| T13 | aicodepath-react-expert | `PaymentsPageClient.tsx` — modal form, full conditional-field logic | `npx vitest run frontend/tests/pages/paymentsPage.test.tsx -t "conditional form fields"` exits 0, 4 branches covered | T12 | 4 | TODO |
| T14 | aicodepath-react-expert | `PaymentsPageClient.tsx` — Excel export button | `npx vitest run frontend/tests/pages/paymentsPage.test.tsx -t export` exits 0; `/aicodepath-verify` + `/aicodepath-acceptance` clean | T13, T11 | 4 | TODO |
