# Partify Production Smoke Tests

Last updated: 2026-05-05

Use this checklist after production deploys, major auth/database changes, and before launch milestones. These tests are intentionally lightweight and manual so they can be run against `https://partify.africa` without a test framework or seeded test automation.

## Preconditions

- Netlify deploy for the target commit is complete.
- Supabase production project is selected before running any audit queries.
- Test accounts exist:
  - client account with confirmed email
  - supplier account with onboarding completed
- Supplier has at least one matched live inventory item with stock greater than zero.
- Client has a saved vehicle compatible with at least one live inventory item.

## 1. Auth And Role Routing

- [ ] Log out completely.
- [ ] Visit `/client/home` while logged out and confirm redirect to login.
- [ ] Log in as client and confirm redirect to client home.
- [ ] Manually enter `/supplier/dashboard` as client and confirm access is denied or redirected.
- [ ] Log out.
- [ ] Log in as supplier and confirm redirect to supplier dashboard.
- [ ] Manually enter `/client/home` as supplier and confirm access is denied or redirected.
- [ ] Open supplier dashboard on laptop width and confirm desktop sidebar appears.
- [ ] Open supplier dashboard on mobile width and confirm bottom navigation appears.

Pass criteria:
- Private routes require login.
- Client and supplier roles cannot access each other's private workspace.
- Mobile and laptop layouts both render correctly.

## 2. Supplier Import

- [ ] Log in as supplier.
- [ ] Go to Inventory > Import CSV.
- [ ] Upload `qa-normal-import.csv`.
- [ ] Confirm import preview loads and valid rows are counted correctly.
- [ ] Submit rows for review.
- [ ] Confirm Review Import page opens.
- [ ] Approve matched rows.
- [ ] Confirm success page appears.
- [ ] Return to Inventory and confirm stock/price changes appear.
- [ ] Upload `qa-quoted-alternate-headers-import.csv`.
- [ ] Confirm quoted comma descriptions and alternate headers parse correctly.
- [ ] Upload `qa-unknown-part-import.csv`.
- [ ] Confirm unknown row stays in catalogue review and cannot create bad live inventory.
- [ ] Upload `qa-validation-errors-import.csv`.
- [ ] Confirm invalid rows show row-level errors and approval is blocked.

Pass criteria:
- Valid imports can be approved into live inventory.
- Existing live rows update instead of duplicating.
- Invalid/unmatched rows stay out of live inventory until reviewed.

Optional duplicate inventory audit:

```sql
SELECT
  supplier_id,
  part_id,
  COUNT(*) AS duplicate_count
FROM public.supplier_inventory
GROUP BY supplier_id, part_id
HAVING COUNT(*) > 1;
```

Expected result: no rows.

## 3. Client Search And Supplier Comparison

- [ ] Log in as client.
- [ ] Confirm a vehicle is saved.
- [ ] Search for a compatible part.
- [ ] Confirm results show compatible parts.
- [ ] Open supplier comparison for a part.
- [ ] Confirm supplier price, distance, fuel/travel cost, and total cost render.
- [ ] Confirm unavailable/out-of-stock suppliers are not presented as redeemable options.

Pass criteria:
- Client can find compatible parts from saved vehicle context.
- Supplier comparison uses live supplier/inventory data.
- Pricing and travel-cost UI is coherent on mobile.

## 4. Coupon Issue, Open, Navigate, And Redeem

- [ ] As client, issue a coupon from a live supplier/part result.
- [ ] Confirm coupon detail page opens and shows a coupon code.
- [ ] Confirm the coupon appears in My Coupons.
- [ ] Open the issued coupon again and confirm status changes to opened.
- [ ] Tap Start Navigation and confirm map navigation opens.
- [ ] Confirm coupon status becomes navigation started.
- [ ] As supplier, go to Redeem Coupon.
- [ ] Scan the client's QR code or enter the coupon code manually.
- [ ] Confirm coupon details load for the correct supplier.
- [ ] Confirm redemption.
- [ ] Confirm supplier success transition returns to dashboard.
- [ ] Confirm client coupon detail shows redeemed state.

Pass criteria:
- Coupon can be issued once per active client/supplier/part combination.
- Coupon event lifecycle records issue/open/navigation/redeem.
- Supplier cannot redeem a coupon belonging to another supplier.
- Client and supplier both see redeemed state after redemption.

Coupon lifecycle audit for one test coupon:

```sql
SELECT
  ce.event_type,
  COUNT(*) AS event_count,
  MIN(ce.created_at) AS first_seen,
  MAX(ce.created_at) AS last_seen
FROM public.coupon_events ce
JOIN public.coupon_issues ci ON ci.id = ce.coupon_id
WHERE ci.code = 'PFY-REPLACE-ME'
GROUP BY ce.event_type
ORDER BY ce.event_type;
```

Expected result:
- `coupon_issued`: 1
- `coupon_viewed`: 1 or more
- `navigation_started`: 0 or more, depending on test
- `coupon_redeemed`: 1 after supplier redemption

Active duplicate coupon audit:

```sql
WITH target_coupon AS (
  SELECT user_id, supplier_id, part_id
  FROM public.coupon_issues
  WHERE code = 'PFY-REPLACE-ME'
)
SELECT
  COUNT(*) AS active_coupon_count,
  ARRAY_AGG(ci.code ORDER BY ci.created_at DESC) AS active_codes,
  ARRAY_AGG(ci.status ORDER BY ci.created_at DESC) AS active_statuses
FROM public.coupon_issues ci
JOIN target_coupon tc
  ON tc.user_id = ci.user_id
 AND tc.supplier_id = ci.supplier_id
 AND tc.part_id = ci.part_id
WHERE ci.status IN ('issued', 'opened', 'navigation_started');
```

Expected result before redemption: one active coupon.
Expected result after redemption: zero active coupons for the same client/supplier/part.

## 5. Post-Smoke Checks

- [ ] Confirm no unexpected UI errors appear in browser console during the tested journeys.
- [ ] Confirm no stale active coupons are past `expires_at`.
- [ ] Confirm latest Netlify deploy is the intended commit.
- [ ] Record date, tester, environment, and pass/fail notes in launch notes or the working QA thread.

Stale active coupon audit:

```sql
SELECT COUNT(*) AS stale_active_coupon_count
FROM public.coupon_issues
WHERE status IN ('issued', 'opened', 'navigation_started')
  AND expires_at <= NOW();
```

Expected result: `0`.
