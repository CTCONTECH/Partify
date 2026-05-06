# Partify Production Operations Runbook

Last updated: 2026-05-05

This runbook covers the minimum operational procedures needed before Partify production launch. It is intentionally practical: who checks what, what to avoid, and how to recover from common failures.

## Ownership

- Production app: Netlify project connected to `origin/main`.
- Backend/auth/database: Supabase production project.
- Domain: `partify.africa`.
- Support mailbox: `support@partify.africa`.

Only make production changes from known-good commits and migrations. Do not run ad hoc destructive SQL in production without a backup/export and a written rollback path.

## Supabase Backup And Restore Process

### Backup Objectives

- Protect user profiles, supplier profiles, inventory, import jobs, coupon issues/events, notifications, and catalogue data.
- Be able to recover from accidental data deletion, bad migrations, and failed operational changes.
- Keep POPIA principles in mind: backups contain personal information and must be treated as confidential.

### Backup Sources

Use the Supabase dashboard as the primary backup source for managed database backups. For launch readiness, also keep explicit exports before high-risk operations.

High-risk operations include:
- Running new migrations in production.
- Bulk importing or deleting catalogue/inventory data.
- Changing RLS policies.
- Running data cleanup scripts.
- Changing coupon lifecycle functions/triggers.

### Before A High-Risk Database Change

1. Confirm the selected Supabase project is production.
2. Confirm the exact migration/script to run is committed to GitHub.
3. Export affected tables when the change touches data, not just schema.
4. Save the export outside the repo in secure storage.
5. Record:
   - date and time
   - operator
   - tables/functions affected
   - commit hash
   - migration filename
   - reason for change

Recommended affected-table exports:
- coupon changes: `coupon_issues`, `coupon_events`, coupon functions/triggers
- supplier import changes: `import_jobs`, `import_rows`, `supplier_inventory`, alias tables
- catalogue changes: `parts`, `part_vehicle_fitments`, `vehicle_catalog`, alias/fitment tables
- auth/profile changes: `profiles`, `suppliers`, `client_vehicles`

### Restore Decision Path

Use table-level restore/import when:
- one table or a small group of related rows was damaged
- the app is otherwise healthy
- the issue is understood and contained

Use full database restore when:
- a migration corrupted many tables
- RLS/auth policies are broadly broken
- data relationships are uncertain
- production cannot safely serve users

### Table-Level Restore Outline

1. Put the affected workflow into a temporary operational freeze.
   - Example: stop supplier imports or coupon issuing while restoring related data.
2. Identify the damaged rows and affected foreign-key relationships.
3. Export current damaged state before changing anything further.
4. Restore from the pre-change export into a staging or temporary table first when possible.
5. Compare counts and sample rows.
6. Apply the restore/update in production.
7. Re-run smoke tests for the affected journey.
8. Record the incident and the final state.

### Full Restore Outline

1. Treat as a production incident.
2. Stop or pause traffic-impacting changes.
3. Notify stakeholders that production may be unstable.
4. Use the Supabase dashboard restore mechanism for the selected recovery point.
5. After restore, verify:
   - auth login works
   - public catalogue reads work
   - supplier inventory loads
   - coupon issue/redeem works
   - latest required migrations are present
6. Run `PRODUCTION_SMOKE_TESTS.md`.
7. Record recovery time and any data-loss window.

### Backup Security

- Never commit database exports to Git.
- Never store service-role keys in local notes, screenshots, or public docs.
- Store exports only in access-controlled storage.
- Delete temporary local exports after they are no longer needed.
- Treat backup files as POPIA-covered records because they may contain email addresses, locations, vehicles, coupon history, and supplier details.

## Netlify Rollback Process

### Rollback Objectives

- Restore the last known-good frontend quickly when a deployment breaks user journeys.
- Avoid rolling the frontend back across incompatible database migrations unless the migration impact is understood.

### When To Roll Back

Rollback is appropriate when:
- login/signup/reset flows break
- supplier dashboard/import/redeem pages fail to load
- client search/coupon journeys fail
- production build deploys but runtime behavior is broken
- a UI release causes severe mobile or supplier desktop usability regression

Rollback alone may not be enough when:
- a Supabase migration changed schema/functions required by the previous frontend
- RLS policies were changed
- data was modified or deleted

### Before Rolling Back

1. Identify the failing deploy in Netlify.
2. Identify the last known-good commit/deploy.
3. Check whether database migrations were run after the last known-good frontend.
4. If migrations were run, confirm backward compatibility before rollback.
5. Capture the failure symptoms and affected routes.

### Netlify Dashboard Rollback

1. Open the Netlify project for Partify.
2. Go to Deploys.
3. Select the last known-good deploy.
4. Use Netlify rollback/publish deploy controls to restore that deploy.
5. Confirm `https://partify.africa` serves the restored deploy.
6. Run focused smoke tests for the broken area.

### Git Revert Rollback

Use this when the bad change is committed and should be undone in the repo.

1. Identify the bad commit hash.
2. Create a revert commit locally:

```powershell
git revert <bad_commit_hash>
```

3. Run:

```powershell
npm run lint
npm run build
```

4. Push the revert commit:

```powershell
git push origin main
```

5. Confirm Netlify deploy passes.
6. Run focused smoke tests.

Do not use `git reset --hard` for production rollback unless deliberately coordinating a history rewrite. Prefer revert commits.

### Rollback Verification

After rollback, verify:
- homepage/login loads
- client login and client home load
- supplier login and supplier dashboard load
- affected page now works again
- no obvious console/runtime error appears
- Netlify deploy points to the intended commit/deploy

If coupon/import/database behavior was involved, also run the related sections of `PRODUCTION_SMOKE_TESTS.md`.

## Incident Notes Template

Use this template in the working QA thread or launch notes:

```text
Incident date/time:
Detected by:
Affected environment:
Affected routes/workflows:
Bad commit/deploy:
Last known-good commit/deploy:
Database migrations involved:
Action taken:
Smoke tests run:
Result:
Follow-up work:
```

## Current Minimum Recovery Position

- Frontend rollback path: Netlify deploy rollback or Git revert commit.
- Database recovery path: Supabase managed backups plus explicit exports before high-risk changes.
- Manual verification path: `PRODUCTION_SMOKE_TESTS.md`.
