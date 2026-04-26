# Partify Production Readiness Checklist

Last updated: 2026-04-26

## Current State Summary

### What is working now
- [x] GitHub push pipeline is healthy (`main` is syncing to origin).
- [x] Netlify build blocker from eager Supabase client init has been fixed in code.
- [x] `npm run build` passes locally.
- [x] Core client search and supplier results flows can run in both mock and live modes.
- [x] Supabase migrations exist through `012_import_staging_pipeline.sql`.
- [x] Import staging flow exists (CSV/manual -> staging review -> approve/reject).
- [x] Supplier can create manual missing-part requests via Add Part flow.

### What is not production-ready yet
- [ ] Authentication is still mocked in UI (localStorage-based role/account flow).
- [ ] Supplier identity is hardcoded in multiple pages (`MOCK_SUPPLIER_ID = 's5'`).
- [ ] Supplier inventory pages still use `mockParts`/`mockInventory` directly.
- [ ] CSV parser is naive (`split(',')`) and not robust to quoted commas/newlines.
- [ ] No CI pipeline (no GitHub Actions for lint/build/test gates).
- [ ] No automated tests (unit/integration/e2e) currently enforcing regressions.
- [ ] Production deployment visibility/monitoring and rollback procedures are not documented.

---

## A) Product & Feature Readiness

### A1. Account & access control
- [ ] Replace localStorage pseudo-auth with real Supabase Auth (login/signup/session refresh/logout).
- [ ] Implement route protection middleware for supplier/client/admin pages.
- [ ] Tie supplier pages to authenticated supplier profile instead of hardcoded supplier ID.
- [ ] Add role enforcement server-side (not just UI routing).

### A2. Supplier workflows
- [ ] Move supplier inventory listing/edit from direct mock arrays to service/repository calls only.
- [ ] Add supplier profile onboarding + mapping between auth user and supplier record.
- [ ] Add explicit statuses for part requests beyond generic import jobs (requested, catalog_review, mapped, live).
- [ ] Add supplier notifications for request outcomes (approved/rejected/mapped).

### A3. Client workflows
- [ ] Confirm coupon issue/redeem flow works end-to-end against live data and RLS.
- [ ] Validate geolocation fallback behavior for denied/failed location permission.
- [ ] Validate price/distance sorting and cost calculations with realistic live inventory volume.

### A4. Admin/backoffice workflows
- [ ] Build internal/admin workflow for catalog candidate review (map to existing part or create new part).
- [ ] Add conflict-resolution tooling for duplicate/near-duplicate part requests.
- [ ] Add operational dashboard for import jobs, error rows, and approval throughput.

---

## B) Data Readiness (Live Mode)

### B1. Minimum launch dataset
- [ ] Seed/ingest real supplier profiles (not placeholders).
- [ ] Seed/ingest canonical parts with compatibility metadata.
- [ ] Seed/ingest supplier inventory for launch regions.
- [ ] Seed part-number aliases for major supplier number variants.

### B2. Data quality controls
- [ ] Add validation rules for price/stock/part number format at ingestion boundaries.
- [ ] Add dedupe rules for canonical parts and aliases.
- [ ] Add basic anomaly checks (negative price, implausible stock jumps, duplicate rows).

### B3. Ingestion hardening
- [ ] Replace simple CSV parsing with robust parser library (quoted fields, escaped commas, multiline support).
- [ ] Add idempotency keys for repeated file submissions.
- [ ] Add import audit trail export and retry workflow.
- [ ] Implement API/SFTP lanes to feed the same staging pipeline.

---

## C) Engineering Quality & Architecture

### C1. Code hygiene
- [ ] Remove or isolate legacy mock-only components/pages that bypass service layer.
- [ ] Eliminate hardcoded supplier IDs and derive from authenticated session context.
- [ ] Resolve lint warnings to near-zero and enforce as CI gate.

### C2. Testing strategy
- [ ] Add unit tests for adapters/services (mock + live behavior).
- [ ] Add integration tests for staging pipeline (`createJob`, `resolveRow`, `approveJob`).
- [ ] Add e2e smoke tests for top journeys (client search, supplier import, add-part request).
- [ ] Add migration verification test (fresh DB bootstrap and smoke query suite).

### C3. CI/CD gates
- [ ] Add GitHub Actions pipeline: install -> lint -> typecheck -> build.
- [ ] Add optional preview environment smoke tests before production promotion.
- [ ] Add branch protection requiring passing checks on `main`.

---

## D) Security, Privacy, and Compliance

### D1. Secrets & environment
- [ ] Verify Netlify env vars for intended mode (`mock` or `live`) in all contexts.
- [ ] Ensure no service-role key is exposed to browser bundles.
- [ ] Add explicit startup validation for required env vars by runtime mode.

### D2. Auth & authorization
- [ ] Validate all Supabase RLS policies with real user-role tests.
- [ ] Ensure suppliers can access only their own inventory/import jobs.
- [ ] Ensure client and supplier roles cannot cross-access unauthorized data.

### D3. App security basics
- [ ] Add abuse controls/rate limiting on mutation endpoints/actions.
- [ ] Add error sanitization (no sensitive internals in UI/API responses).
- [ ] Review dependency vulnerabilities and patch critical/high issues.

### D4. Legal/commercial readiness
- [ ] Publish Terms of Service and Privacy Policy pages.
- [ ] Define POPIA/GDPR data retention and deletion process.
- [ ] Define supplier agreement and commission settlement terms.

---

## E) Operations & Reliability

### E1. Observability
- [ ] Add centralized error monitoring (Sentry or equivalent).
- [ ] Add structured logging for ingestion pipeline and coupon events.
- [ ] Define alerting for build failures, import error-rate spikes, and failed settlements.

### E2. Runtime operations
- [ ] Document incident response and rollback plan.
- [ ] Define backup/restore procedure for Supabase data.
- [ ] Define on-call ownership for production issues.

### E3. Performance & scalability
- [ ] Validate large-result pagination and query performance for search/results.
- [ ] Add DB indexes for top query paths beyond current baseline.
- [ ] Run basic load tests for search/import approval endpoints.

---

## F) Release Management

### F1. Pre-launch checklist (must-pass)
- [ ] Production deploy from `main` passes consistently.
- [ ] Smoke tests pass in production environment.
- [ ] Launch dataset coverage approved by product owner.
- [ ] Auth + RLS penetration tests complete.
- [ ] Monitoring/alerts verified and tested.

### F2. Launch plan
- [ ] Freeze release scope and publish release notes.
- [ ] Define phased rollout (internal -> pilot suppliers -> public).
- [ ] Define rollback criteria and owner approvals.

---

## Suggested Execution Order

1. Auth + identity wiring (remove hardcoded supplier context).
2. Supplier inventory and request pages to pure service/repo live path.
3. Admin catalog-review workflow for manual part requests.
4. Robust CSV parser + ingestion hardening.
5. CI/test baseline.
6. Monitoring + incident runbooks.
7. Live data baseline fill and launch dry-run.

---

## Evidence Used For This Assessment

- Local quality gates run:
  - `npm run lint` -> warnings only (no errors).
  - `npm run build` -> successful.
- Code indicators:
  - localStorage pseudo-auth usage in login/signup/role pages.
  - hardcoded supplier IDs in supplier add/import/edit/requests pages.
  - direct mock data usage in some supplier/client components.
  - no CI workflows present in `.github` (only Copilot instructions file).
