# Partify Supabase Backend

Complete backend infrastructure for Partify car parts marketplace.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                    │
│              (React Components + Services)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├─ Mock Mode (localStorage)
                     └─ Live Mode (Supabase)
                              │
              ┌───────────────┴───────────────┐
              │       Supabase Cloud          │
              │  ┌─────────────────────────┐  │
              │  │   PostgreSQL + PostGIS  │  │
              │  │   - Parts catalog       │  │
              │  │   - Supplier locations  │  │
              │  │   - Inventory prices    │  │
              │  │   - Coupon lifecycle    │  │
              │  │   - Event logs          │  │
              │  │   - Monthly settlements │  │
              │  └─────────────────────────┘  │
              │                                │
              │  ┌─────────────────────────┐  │
              │  │   Row Level Security    │  │
              │  │   - User isolation      │  │
              │  │   - Supplier permissions│  │
              │  │   - Public catalog      │  │
              │  └─────────────────────────┘  │
              │                                │
              │  ┌─────────────────────────┐  │
              │  │   Database Functions    │  │
              │  │   - Find nearest stores │  │
              │  │   - Issue coupons       │  │
              │  │   - Generate settlements│  │
              │  │   - Expire old coupons  │  │
              │  └─────────────────────────┘  │
              └────────────────────────────────┘
```

## Database Schema

### Core Tables

**profiles**
- User account information
- Links to Supabase auth
- Stores role (client/supplier/admin)

**suppliers**
- Business information for auto parts stores
- Geographic coordinates (PostGIS)
- Rating and active status

**parts**
- Car parts catalog
- Part numbers, names, categories
- Shared across all suppliers

**supplier_inventory**
- Junction table: suppliers ↔ parts
- Stock quantities and prices per supplier
- Each supplier sets own price for each part

**vehicles**
- User's registered vehicles
- Make, model, year, VIN
- One primary vehicle per user

### Coupon System

**coupon_issues**
- Main coupon records
- Unique codes (PFY-XXXX)
- Discount calculations
- State machine: issued → opened → navigation_started → redeemed
- 24-hour expiry

**coupon_events**
- Audit log of all coupon actions
- Event types: issued, viewed, navigation_started, redeemed, expired
- Metadata for each event
- Actor tracking (who did what)

### Billing System

**supplier_monthly_settlements**
- Monthly invoices for suppliers
- Total redemptions and commission owed
- Settlement period (year + month)
- Payment status tracking

**settlement_line_items**
- Individual redemptions in each settlement
- Links to specific coupon redemptions
- Commission per transaction (default 10%)

## Key Features

### 1. Geospatial Queries (PostGIS)

Find nearest suppliers to user location:

```sql
SELECT * FROM find_nearest_suppliers(
  user_lat := -33.9249,
  user_lon := 18.4241,
  part_id_filter := 'part-123',
  max_distance_km := 50,
  result_limit := 10
);
```

Returns suppliers sorted by distance with:
- Distance in kilometers
- Supplier details
- Part availability
- Pricing

**Performance:** GIST index on `coordinates` column enables fast proximity searches.

### 2. Coupon Lifecycle

State machine with automatic transitions:

```
issued → opened → navigation_started → redeemed
   ↓
expired (after 24 hours)
```

Each state transition:
1. Updates `coupon_issues.status`
2. Sets timestamp (e.g., `opened_at`)
3. Logs event in `coupon_events`

### 3. Discount Calculation

Automatic in `issue_coupon()` function:

```sql
discount_amount := price * (discount_percent / 100.0);
final_price := price - discount_amount;
```

Default: 5% user discount, 10% platform commission

### 4. Row Level Security (RLS)

**Users** can only:
- View own coupons
- View own vehicles
- View public parts catalog
- View active suppliers

**Suppliers** can only:
- View/redeem coupons for their store
- Edit own inventory (stock, price)
- View own settlements

**Public** can:
- Search parts catalog
- View supplier locations (read-only)

### 5. Event Sourcing

All coupon actions logged in `coupon_events`:

```typescript
{
  couponId: 'coupon-123',
  eventType: 'coupon_redeemed',
  actorId: 'supplier-456',
  metadata: { orderAmount: 480 },
  occurredAt: '2026-04-23T14:30:00Z'
}
```

Enables:
- Audit trail
- Analytics
- Dispute resolution
- Settlement verification

### 6. Monthly Settlements

Generated automatically via cron:

```sql
SELECT generate_monthly_settlement(
  p_supplier_id := 'supplier-123',
  p_year := 2026,
  p_month := 4
);
```

Aggregates:
- Total redemptions
- Total order value
- Total commission (10% default)
- Individual line items

## Migration Files

Run in order:

1. **001_init_schema.sql** - Enums, extensions (PostGIS), base functions
2. **002_profiles.sql** - User profiles extending auth
3. **003_suppliers.sql** - Supplier locations with PostGIS
4. **004_parts.sql** - Parts catalog
5. **005_inventory.sql** - Stock and pricing per supplier
6. **006_coupons.sql** - Coupon issuance and redemption
7. **007_events.sql** - Event logging and expiry
8. **008_settlements.sql** - Monthly billing
9. **009_rls_policies.sql** - Security policies
10. **010_seed_data.sql** - Cape Town test data

## Seed Data (Cape Town)

5 suppliers with real coordinates:

| Supplier | Suburb | Latitude | Longitude |
|----------|--------|----------|-----------|
| AutoZone Bellville | Bellville | -33.8989 | 18.6289 |
| Midas Parow | Parow | -33.8950 | 18.5850 |
| Cape Auto | Woodstock | -33.9307 | 18.4472 |
| Motor City | Milnerton | -33.8769 | 18.5011 |
| ProAuto | Brackenfell | -33.8678 | 18.6892 |

5 common parts:
- Brake Pads (Front)
- Oil Filter
- Spark Plugs (Set of 4)
- Air Filter
- Water Pump

Each supplier has inventory for each part with varying prices.

## Database Functions

### find_nearest_suppliers()

Find suppliers near a location, optionally filtered by part.

**Parameters:**
- `user_lat` NUMERIC - User latitude
- `user_lon` NUMERIC - User longitude
- `part_id_filter` UUID - Optional part filter
- `max_distance_km` NUMERIC - Max distance (default 50)
- `result_limit` INTEGER - Max results (default 10)

**Returns:** Table with distance, supplier details, part availability

**Example:**
```sql
SELECT * FROM find_nearest_suppliers(
  -33.9249,
  18.4241,
  'part-123',
  25,
  5
);
```

### get_part_availability()

Get all suppliers that have a part in stock, with pricing.

**Parameters:**
- `part_id_filter` UUID - Part to search for
- `user_lat` NUMERIC - Optional user latitude
- `user_lon` NUMERIC - Optional user longitude

**Returns:** Table with supplier, price, stock, distance, fuel cost

**Example:**
```sql
SELECT * FROM get_part_availability(
  'part-123',
  -33.9249,
  18.4241
);
```

### issue_coupon()

Create a new coupon with automatic discount calculation.

**Parameters:**
- `p_user_id` UUID - User ID
- `p_supplier_id` UUID - Supplier ID
- `p_part_id` UUID - Part ID
- `p_inventory_id` UUID - Optional specific inventory item
- `p_price` NUMERIC - Original price
- `p_user_lat` NUMERIC - Optional user location
- `p_user_lon` NUMERIC - Optional user location

**Returns:** UUID of created coupon

**Example:**
```sql
SELECT issue_coupon(
  'user-123',
  'supplier-456',
  'part-789',
  NULL,
  500.00,
  -33.9249,
  18.4241
);
```

### log_coupon_event()

Log an event and update coupon state.

**Parameters:**
- `p_coupon_id` UUID
- `p_event_type` event_type enum
- `p_actor_id` UUID - Optional
- `p_metadata` JSONB - Optional

**Returns:** void

**Example:**
```sql
SELECT log_coupon_event(
  'coupon-123',
  'coupon_viewed',
  'user-456',
  NULL
);
```

### expire_old_coupons()

Mark expired coupons (called by cron).

**Returns:** INTEGER (count of expired coupons)

**Example:**
```sql
SELECT expire_old_coupons();
```

### generate_monthly_settlement()

Generate billing statement for a supplier.

**Parameters:**
- `p_supplier_id` UUID
- `p_year` INTEGER
- `p_month` INTEGER

**Returns:** UUID of created settlement

**Example:**
```sql
SELECT generate_monthly_settlement(
  'supplier-123',
  2026,
  4
);
```

## Indexes

Performance optimizations:

### Spatial Index (GIST)
```sql
CREATE INDEX idx_suppliers_coordinates 
ON suppliers USING GIST (coordinates);
```

Enables fast proximity searches.

### B-tree Indexes
```sql
-- Fast coupon lookups by code
CREATE INDEX idx_coupon_issues_code ON coupon_issues(code);

-- Fast user coupon queries
CREATE INDEX idx_coupon_issues_user_id ON coupon_issues(user_id);

-- Fast supplier coupon queries
CREATE INDEX idx_coupon_issues_supplier_id ON coupon_issues(supplier_id);

-- Fast event timeline queries
CREATE INDEX idx_coupon_events_coupon_id ON coupon_events(coupon_id);

-- Fast inventory lookups
CREATE INDEX idx_supplier_inventory_supplier ON supplier_inventory(supplier_id);
CREATE INDEX idx_supplier_inventory_part ON supplier_inventory(part_id);
```

## Triggers

### Auto-update timestamps
```sql
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

Applied to all tables with `updated_at` column.

### Primary vehicle management
```sql
CREATE TRIGGER enforce_single_primary_vehicle
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_single_primary_vehicle();
```

Ensures only one primary vehicle per user.

### Auto-update coupon status
```sql
CREATE TRIGGER update_coupon_status_on_event
  AFTER INSERT ON coupon_events
  FOR EACH ROW
  EXECUTE FUNCTION update_coupon_status_from_event();
```

Keeps `coupon_issues.status` in sync with latest event.

## Scheduled Jobs (Cron)

### Expire old coupons
```sql
SELECT cron.schedule(
  'expire-old-coupons',
  '0 * * * *',  -- Every hour
  $$SELECT expire_old_coupons()$$
);
```

### Generate monthly settlements
```sql
SELECT cron.schedule(
  'generate-settlements',
  '0 2 1 * *',  -- 2 AM on 1st of month
  $$
  SELECT generate_monthly_settlement(
    supplier_id,
    EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::int,
    EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::int
  )
  FROM suppliers WHERE active = true;
  $$
);
```

## Environment Setup

1. **Create project** on [supabase.com](https://supabase.com)
2. **Get credentials** from Project Settings → API
3. **Set environment variables:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. **Run migrations:**
   ```bash
   supabase link --project-ref your-ref
   supabase db push
   ```

See `../MIGRATION_GUIDE.md` for detailed setup instructions.

## Testing

### Verify migrations
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check functions exist
SELECT proname FROM pg_proc 
WHERE proname LIKE '%coupon%' OR proname LIKE '%settlement%';
```

### Test queries
```sql
-- Search parts
SELECT * FROM parts WHERE part_name ILIKE '%brake%';

-- Find nearest suppliers
SELECT * FROM find_nearest_suppliers(
  -33.9249, 18.4241, NULL, 50, 10
);

-- Check seed data
SELECT COUNT(*) FROM suppliers;  -- Should be 5
SELECT COUNT(*) FROM parts;      -- Should be 5
SELECT COUNT(*) FROM supplier_inventory;  -- Should be 25 (5x5)
```

## Performance Targets

- Part search: < 200ms
- Nearest supplier query: < 500ms
- Coupon issuance: < 300ms
- Settlement generation: < 2s (for 100+ redemptions)

## Security Checklist

- [x] RLS enabled on all tables
- [x] Anon key has minimal permissions
- [x] Service key never exposed to browser
- [x] Users can't access other users' data
- [x] Suppliers can't edit other suppliers' inventory
- [x] Public catalog is read-only
- [x] Coupon redemption validates ownership
- [x] Settlement generation is idempotent

## Monitoring

Track in Supabase Dashboard:
- Query performance (Database → Logs)
- API usage (Settings → Usage)
- Error rates (Logs → Errors)
- Auth activity (Authentication → Users)

Set alerts for:
- Slow queries (> 1s)
- High error rate (> 5%)
- API quota (> 80%)

## Backup Strategy

Supabase provides:
- **Automatic daily backups** (last 7 days on free tier)
- **Point-in-time recovery** (paid plans)

Manual backup:
```bash
supabase db dump -f backup.sql
```

## Troubleshooting

**"relation does not exist"**
→ Run migrations: `supabase db push`

**"permission denied for table"**
→ Check RLS policies in migration 009

**"function not found"**
→ Verify migrations 006, 007, 008 ran successfully

**"invalid JWT"**
→ Regenerate anon key in Project Settings

See `../MIGRATION_GUIDE.md` for more troubleshooting.

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostGIS Docs](https://postgis.net/documentation/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- Migration Guide: `../MIGRATION_GUIDE.md`
- Service API: `../SERVICE_API.md`

## Support

For issues:
1. Check Supabase Dashboard → Logs
2. Review RLS policies
3. Test queries in SQL Editor
4. Verify environment variables

---

Built for Partify - Cape Town Car Parts Marketplace
