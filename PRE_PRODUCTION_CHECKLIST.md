# Partify Pre-Production Checklist

Last updated: 2026-05-03

Use this as the focused checklist for getting Partify from working pilot state to pre-production readiness. This list is intentionally practical and ordered by launch risk.

## P0 - Auth, Domain, And Email

- [x] Buy production domain: `partify.africa`.
- [x] Configure Netlify custom domain and SSL.
- [x] Configure Supabase Site URL and auth redirect URLs for `partify.africa`.
- [x] Configure Brevo custom SMTP in Supabase.
- [x] Authenticate `partify.africa` in Brevo with DKIM and DMARC.
- [x] Add SPF DNS record for Brevo.
- [x] Brand Supabase confirmation and password reset email templates.
- [x] Add hosted Partify email logo asset.
- [x] Confirm client signup email arrives, link opens `partify.africa`, and login works after confirmation.
- [x] Confirm supplier signup email arrives, link opens `partify.africa`, and onboarding/login works after confirmation.
- [x] Confirm password reset end-to-end: request email, open link, set new password, login with new password.
- [x] Rotate Brevo SMTP password/key and update Supabase after successful tests.
- [x] Add reply handling for `support@partify.africa` with forwarding or mailbox.
- [ ] Remove old Netlify auth redirect URLs after `partify.africa` is fully verified.

## P0 - Security And POPIA

- [x] Publish Terms of Service page.
- [x] Publish Privacy Policy page.
- [x] Create POPIA compliance checklist.
- [x] Final RLS policy audit across all public tables.
- [x] Verify client cannot access supplier-private rows.
- [x] Verify supplier cannot access another supplier's private rows.
- [x] Verify unauthenticated users cannot read or mutate private data.
- [x] Confirm only PostGIS/system metadata tables remain publicly exposed to `anon` outside intended public catalogue tables.
- [x] Define data retention and deletion process.
- [x] Define breach response process.
- [x] Document privacy contact / Information Officer responsibility.
- [ ] Attorney review of Terms and Privacy Policy before public launch.

## P0 - Coupon Flow

- [x] Issue live coupons from supplier/part context.
- [x] Store coupon issue/open/navigation events through live services.
- [ ] Confirm coupon issue flow works on `partify.africa` with live data.
- [x] Add client coupon history / "My Coupons".
- [ ] Decide supplier redemption model for MVP.
- [ ] Add supplier/admin coupon monitoring view.
- [x] Tighten coupon event permissions so users cannot spoof unrelated coupon events.
- [ ] Rotate/expire stale coupons correctly.

## P1 - Supplier Import Hardening

- [x] Supplier CSV import works with live inventory.
- [x] Re-import updates existing inventory rather than duplicating rows.
- [ ] Replace naive CSV parsing with a robust parser that supports quoted commas and newlines.
- [ ] Add import idempotency at file/job level.
- [ ] Improve row-level import validation and error messaging.
- [ ] Route unknown/unmatched parts into review instead of creating bad catalogue data.
- [ ] Add clearer supplier-facing import states: imported, needs review, approved, rejected, catalogue review.

## P1 - Catalogue And Fitment Accuracy

- [x] Add internal vehicle catalogue and part fitment foundation.
- [x] Make `Fits My Vehicle` use compatibility logic.
- [ ] Add structured OE number support.
- [ ] Add structured brand/manufacturer support.
- [ ] Add supplier part number and alias support to import flow.
- [ ] Add fitment source and confidence fields.
- [ ] Define JackCat/manual verification workflow.
- [ ] Add admin process for unmatched parts and bad fitment corrections.
- [ ] Add "verified fit" indicator on client search/results.

## P1 - Admin And Backoffice

- [ ] Build admin catalogue review screen.
- [ ] Build canonical part editor.
- [ ] Build vehicle/fitment editor.
- [ ] Build unmatched supplier part review queue.
- [ ] Add supplier/import/coupon monitoring views.
- [ ] Add audit trail for admin catalogue and supplier data changes.

## P1 - Production Reliability

- [x] Local build passes.
- [x] Lint passes with warnings only.
- [ ] Add GitHub Actions for lint/build.
- [ ] Add Sentry or equivalent error monitoring.
- [ ] Add smoke tests for auth, supplier import, client search, and coupon issue.
- [ ] Define Supabase backup/restore process.
- [ ] Define Netlify rollback process.
- [ ] Resolve or intentionally document remaining lint warnings.

## P1 - Launch Data

- [ ] Add pilot supplier accounts.
- [ ] Add verified supplier business details and locations.
- [ ] Add real supplier inventory for pilot testing.
- [ ] Add common Cape Town/South African vehicles to `vehicle_catalog`.
- [ ] Add high-demand service parts and verified fitments.
- [ ] Validate distance/fuel/total cost with real supplier locations.
- [ ] Run full client journey with real data: vehicle -> compatible part -> supplier comparison -> coupon.

## Today's Suggested Order

1. Remove old Netlify/local auth redirect URLs after final production auth verification.
2. Confirm coupon issue flow works on `partify.africa` with live data.
3. Decide supplier redemption model for MVP.
4. Start supplier import hardening with robust CSV parsing.
5. Update this checklist as each item is completed.
