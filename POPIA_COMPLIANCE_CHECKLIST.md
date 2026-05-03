# Partify POPIA Compliance Checklist

Last updated: 2026-05-03

This is the operational checklist for reducing POPIA and data-breach risk before launch. It does not replace legal advice, but it gives us a practical build-and-audit path.

## P0 - Must Be Done Before Public Launch

- [x] Publish Privacy Policy page.
- [x] Publish Terms of Service page.
- [ ] Attorney review of Terms and Privacy Policy for South African launch.
- [ ] Confirm responsible party details and final legal entity name.
- [ ] Appoint final Information Officer once the responsible party / legal entity is confirmed.
- [x] Document operational privacy contact and Information Officer responsibility.
- [ ] Register or confirm Information Officer requirements with the Information Regulator if applicable.
- [ ] Map all personal information collected: clients, suppliers, support, location, coupons, auth, logs.
- [ ] Document purpose for each data category.
- [ ] Confirm lawful basis for each data category.
- [ ] Keep client location optional and permission-based.
- [ ] Ensure no service-role key or secret is exposed to browser bundles.
- [ ] Complete final RLS audit for all public tables.
- [ ] Add abuse/rate-limit controls for auth, password reset, coupon issuing, imports, and support actions.
- [ ] Add centralized error monitoring with sensitive-data scrubbing.
- [x] Define incident response and POPIA breach notification process.
- [x] Define data retention periods for accounts, vehicle data, supplier data, coupon events, import logs, and support messages.
- [x] Define account deletion and data export request workflow.

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

Operational owner: the Partify operator / responsible party must coordinate breach handling until a final Information Officer is appointed.

Privacy and breach intake: `support@partify.africa`.

1. Triage and contain the incident as soon as it is discovered: disable affected features, revoke exposed sessions or credentials, pause risky integrations, and stop further unauthorized access.
2. Preserve logs and evidence before cleanup: Supabase auth/database logs, Netlify deploy/runtime logs, email provider logs, support mailbox messages, and relevant app screenshots or exports.
3. Identify affected users, data categories, systems, and the likely exposure window.
4. Assess whether POPIA notification duties are triggered. Where required, notify the Information Regulator and affected data subjects as soon as reasonably possible.
5. Rotate affected credentials/secrets, including Supabase service keys, SMTP credentials, API keys, database credentials, and admin passwords where relevant.
6. Communicate clearly with affected users: what happened, what data was involved, what Partify has done, and what users should do next.
7. Document the root cause, timeline, decisions made, notifications sent, and corrective actions.
8. Add a follow-up task to prevent recurrence, such as RLS policy updates, rate limits, monitoring alerts, dependency fixes, or access reviews.

## Privacy Contact And Information Officer Responsibility

Operational privacy contact: `support@partify.africa`.

Until the final legal entity and appointed Information Officer are confirmed, the Partify operator is responsible for:

1. Receiving and tracking privacy, deletion, export, correction, and breach-related requests.
2. Verifying requester identity through control of the account email address before disclosing or deleting personal information.
3. Coordinating POPIA breach assessment and notification decisions.
4. Maintaining the retention, deletion, third-party operator, and incident records.
5. Ensuring Supabase, Netlify, Brevo, HostAfrica, and any future monitoring/maps providers are reviewed as third-party operators.
6. Escalating Terms, Privacy Policy, Information Officer appointment, and notification obligations for attorney review before public launch.

## Retention Schedule

- `profiles`: Keep while the account is active. On account deletion, remove personal profile data unless a legal or billing obligation requires temporary retention.
- `vehicles`: Keep while the account is active. Delete when the user deletes the vehicle or requests account deletion.
- `coupon_issues`: Keep for 24 months for dispute handling, supplier reporting, and financial reconciliation.
- `coupon_events`: Keep for 24 months because they support coupon lifecycle auditability and dispute resolution.
- `supplier_inventory`: Keep while the supplier account is active. Remove or archive when the supplier offboards and the commercial retention window expires.
- `import_jobs` and `import_rows`: Keep for 12 months for catalogue troubleshooting and supplier support.
- `supplier_activity_events`: Keep for 12 months for operational audit and support.
- `client_part_activity`: Keep for 12 months for recent searches, popular parts, and product analytics.
- `supplier_notification_reads` and `client_notification_reads`: Keep for 6 months.
- `support mailbox messages`: Keep for 12 months, or longer if tied to a dispute, abuse investigation, or legal request.
- `backups`: Deleted data may remain in backups until the normal backup rotation window expires.

## Deletion And Data Request Workflow

1. Receive the request through `support@partify.africa` and verify the requester controls the account email address.
2. Record the request date, account email, request type, and outcome in an internal support log.
3. For a data export request:
   - export the user's profile, vehicles, active coupons, and relevant support/account records
   - provide the export securely to the verified account email
4. For a client deletion request:
   - delete vehicles and client notification read state
   - delete or anonymize profile fields not required for security, fraud prevention, or legal retention
   - retain coupon/commercial records only where needed for audit, settlement, or dispute handling
5. For a supplier deletion or offboarding request:
   - deactivate supplier access first
   - retain inventory/import/coupon/settlement records during the commercial retention window
   - delete or anonymize unnecessary personal contact details once retention obligations expire
6. Confirm completion to the requester by email and state any data that had to be retained, with the reason.
7. If the request cannot be fulfilled immediately because of legal, fraud, or accounting obligations, respond with the retention reason and expected deletion timeline.
