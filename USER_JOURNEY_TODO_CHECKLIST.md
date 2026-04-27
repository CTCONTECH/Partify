# Partify User Journey Todo Checklist

Last updated: 2026-04-27

Use this checklist to track the remaining work needed to make the core Partify user journeys production-ready.

## Current State

- [x] User signup creates a Supabase auth user.
- [x] Email confirmation flow works.
- [x] Confirmed users can log in.
- [x] Logout clears the Supabase session and returns users to login.
- [x] Auth profile rows are created/backfilled in `profiles`.
- [x] Client and supplier route protection exists through middleware.

---

## Priority 1: Customer Journey

- [x] Save vehicle through repository/service layer, not direct page `localStorage`.
- [x] Load user vehicle on home/profile through repository/service layer.
- [x] Use vehicle data to score compatible parts higher in search results.
- [x] Fix search cards so supplier count/price range comes from availability calls, not direct mock inventory.
- [ ] Add geolocation prompt/fallback before supplier comparison.
- [ ] Pass user location into supplier results so distance/total cost is real.
- [ ] Replace coupon screen mock data with live coupon issuing.
- [ ] Store coupon events live: issued, opened, navigation started, redeemed.
- [ ] Add "My coupons" / saved coupon history for client.

## Priority 2: Supplier Journey

- [ ] Convert supplier inventory page from mock inventory to live Supabase inventory.
- [ ] Convert edit inventory page from mock data to live inventory rows.
- [ ] Let supplier update price/stock directly, not only via import review.
- [ ] Improve supplier onboarding location capture: address lookup or map pin, not manual lat/lng.
- [ ] Load real supplier profile details on supplier profile page.
- [ ] Add edit business profile flow.
- [ ] Replace fake dashboard activity/revenue with real data or hide until available.
- [ ] Make low-stock alerts real.

## Priority 3: Supplier Import / Part Requests

- [ ] Replace naive CSV parsing with a proper CSV parser.
- [ ] Add clearer import statuses: imported, needs review, approved, rejected, catalog review.
- [ ] Add admin/backoffice workflow for unmatched/new part requests.
- [ ] Prevent suppliers from approving unmatched "new part" requests into nowhere.
- [ ] Add duplicate detection for supplier aliases and part requests.
- [ ] Add import error details that suppliers can fix row by row.

## Priority 4: Admin / Operations

- [ ] Build admin catalog review screen.
- [ ] Admin can map supplier-submitted parts to canonical parts.
- [ ] Admin can create new canonical parts from requests.
- [ ] Admin can monitor suppliers, imports, coupons, and redemptions.
- [ ] Add internal audit trail for import approvals and coupon redemptions.

## Priority 5: Production Trust

- [ ] Buy domain.
- [ ] Configure custom SMTP.
- [ ] Brand Supabase email templates as Partify.
- [ ] Add Terms of Service and Privacy Policy pages.
- [ ] Add support/contact flow.
- [ ] Add error monitoring, ideally Sentry.
- [ ] Add GitHub Actions for lint/build.
- [ ] Add smoke tests for signup/login/logout, client search, supplier onboarding, supplier import.

---

## Biggest Next Step

Complete the live customer journey:

`signup -> confirm email -> login -> add vehicle -> search part -> compare live suppliers -> issue live coupon -> navigate/contact supplier`

Current status: the flow works through login/home. Vehicle, coupon, and parts of search/results still need live-data finishing.
