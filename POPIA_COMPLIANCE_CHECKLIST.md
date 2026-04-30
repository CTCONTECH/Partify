# Partify POPIA Compliance Checklist

Last updated: 2026-04-30

This is the operational checklist for reducing POPIA and data-breach risk before launch. It does not replace legal advice, but it gives us a practical build-and-audit path.

## P0 - Must Be Done Before Public Launch

- [x] Publish Privacy Policy page.
- [x] Publish Terms of Service page.
- [ ] Attorney review of Terms and Privacy Policy for South African launch.
- [ ] Confirm responsible party details and final legal entity name.
- [ ] Appoint and document the Information Officer / privacy contact.
- [ ] Register or confirm Information Officer requirements with the Information Regulator if applicable.
- [ ] Map all personal information collected: clients, suppliers, support, location, coupons, auth, logs.
- [ ] Document purpose for each data category.
- [ ] Confirm lawful basis for each data category.
- [ ] Keep client location optional and permission-based.
- [ ] Ensure no service-role key or secret is exposed to browser bundles.
- [ ] Complete final RLS audit for all public tables.
- [ ] Add abuse/rate-limit controls for auth, password reset, coupon issuing, imports, and support actions.
- [ ] Add centralized error monitoring with sensitive-data scrubbing.
- [ ] Define incident response and POPIA breach notification process.
- [ ] Define data retention periods for accounts, vehicle data, supplier data, coupon events, import logs, and support messages.
- [ ] Define account deletion and data export request workflow.

## P1 - Strongly Recommended Before Pilot Suppliers

- [ ] Add in-app consent/notice wording before location capture.
- [ ] Add privacy links to signup, login, profile/help areas.
- [ ] Add audit logs for admin access to personal information.
- [ ] Add admin-only access controls before any admin dashboard ships.
- [ ] Add automated smoke tests for role isolation: client cannot read supplier-private data; supplier cannot read another supplier's private data.
- [ ] Review Supabase Auth email templates for branded, non-misleading privacy copy.
- [ ] Add backup/restore procedure and test a restore.
- [ ] Add dependency vulnerability checks.
- [ ] Add CI build/lint gate.

## P2 - Ongoing Governance

- [ ] Quarterly RLS and permission review.
- [ ] Quarterly dependency/security review.
- [ ] Maintain a register of third-party operators: Supabase, Netlify, email provider, monitoring provider, maps/geocoding provider.
- [ ] Maintain a supplier data processing and acceptable-use clause.
- [ ] Maintain a process to correct bad catalogue/fitment data reported by users.
- [ ] Review retention and deletion jobs after real usage begins.

## Data We Must Treat As Sensitive

- User names, emails, phone numbers, and auth identifiers.
- Saved vehicle details linked to a user.
- Browser location and supplier coordinates.
- Supplier business details, imports, stock, prices, and activity history.
- Coupon issue, view, navigation, and redemption events.
- Support messages and operational logs.

## Breach Response Minimum

1. Contain the incident and stop unauthorized access.
2. Preserve logs and evidence.
3. Identify affected users, data categories, and exposure window.
4. Notify the Information Regulator and affected data subjects where POPIA requires it.
5. Rotate affected credentials/secrets.
6. Document root cause and corrective actions.
