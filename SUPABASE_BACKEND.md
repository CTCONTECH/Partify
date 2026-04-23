# Partify Backend with Supabase

## Overview

This document describes the complete backend architecture for Partify's coupon redemption and transaction tracking system. The backend will be activated once you connect Supabase from the **Make settings page**.

## Why Supabase?

Supabase provides:
- **PostgreSQL database** with real-time subscriptions
- **Built-in authentication** for users and suppliers
- **Row-level security** for supplier-only access
- **PostGIS** for geospatial queries (find nearest suppliers)
- **Edge Functions** for server-side coupon generation
- **Real-time** notifications for stock updates

## Database Schema

### Tables

#### 1. `users`
Stores all user accounts (clients and suppliers).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'supplier')),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `suppliers`
Extended supplier information.

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY REFERENCES users(id),
  business_name TEXT NOT NULL,
  address TEXT NOT NULL,
  location_suburb TEXT NOT NULL,
  coordinates GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS for lat/lon
  rating DECIMAL(2,1) DEFAULT 4.0,
  total_parts INT DEFAULT 0,
  commission_rate DECIMAL(4,2) DEFAULT 10.00, -- 10% commission
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for fast nearest-supplier queries
CREATE INDEX suppliers_coordinates_idx ON suppliers USING GIST(coordinates);
```

#### 3. `parts`
Car parts catalog.

```sql
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number TEXT UNIQUE NOT NULL,
  part_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  compatibility JSONB, -- Store vehicle compatibility as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX parts_part_number_idx ON parts(part_number);
CREATE INDEX parts_category_idx ON parts(category);
```

#### 4. `inventory`
Supplier inventory and pricing.

```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, part_id)
);

CREATE INDEX inventory_supplier_idx ON inventory(supplier_id);
CREATE INDEX inventory_part_idx ON inventory(part_id);
CREATE INDEX inventory_stock_idx ON inventory(stock) WHERE stock > 0;
```

#### 5. `coupons`
Generated discount coupons.

```sql
CREATE TYPE coupon_state AS ENUM (
  'issued',
  'opened',
  'navigation_started',
  'redeemed',
  'expired',
  'cancelled'
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id),
  original_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  state coupon_state DEFAULT 'issued',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_by UUID REFERENCES users(id), -- Supplier user who redeemed
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  CHECK (final_price = original_price - discount_amount),
  CHECK (expires_at > created_at)
);

CREATE INDEX coupons_user_idx ON coupons(user_id);
CREATE INDEX coupons_supplier_idx ON coupons(supplier_id);
CREATE INDEX coupons_state_idx ON coupons(state);
CREATE INDEX coupons_expires_idx ON coupons(expires_at);
```

#### 6. `redemptions`
Tracks coupon redemptions for billing.

```sql
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID UNIQUE REFERENCES coupons(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  redeemed_by UUID REFERENCES users(id), -- Supplier staff member
  order_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- Store additional order details
);

CREATE INDEX redemptions_supplier_idx ON redemptions(supplier_id);
CREATE INDEX redemptions_timestamp_idx ON redemptions(timestamp);
```

#### 7. `supplier_statements`
Monthly billing statements.

```sql
CREATE TABLE supplier_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month
  total_redemptions INT NOT NULL DEFAULT 0,
  gross_tracked_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(4,2) NOT NULL,
  commission_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, month)
);

CREATE INDEX supplier_statements_month_idx ON supplier_statements(month);
CREATE INDEX supplier_statements_paid_idx ON supplier_statements(paid);
```

#### 8. `vehicles`
User's saved vehicles.

```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL CHECK (year >= 1900 AND year <= 2100),
  engine TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX vehicles_user_idx ON vehicles(user_id);
```

#### 9. `notifications`
User notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'price_drop', 'back_in_stock', 'low_stock', 'coupon_expiring'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(read);
```

## Row Level Security (RLS)

Enable RLS on all tables and set policies:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Suppliers can only edit their own inventory
CREATE POLICY supplier_inventory_policy ON inventory
  FOR ALL
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

-- Users can only see their own coupons
CREATE POLICY user_coupons_policy ON coupons
  FOR SELECT
  USING (user_id = auth.uid());

-- Suppliers can redeem coupons for their store
CREATE POLICY supplier_redeem_policy ON coupons
  FOR UPDATE
  USING (supplier_id = auth.uid() AND state IN ('issued', 'opened', 'navigation_started'));
```

## Edge Functions

### 1. Generate Coupon
`supabase/functions/generate-coupon/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { userId, supplierId, partId, price } = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Generate unique code
  const code = `PFY-${generateRandomCode()}`
  
  // Calculate discount (5%)
  const discountPercent = 5.00
  const discountAmount = Math.round(price * (discountPercent / 100) * 100) / 100
  const finalPrice = price - discountAmount
  
  // 24 hour expiry
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code,
      user_id: userId,
      supplier_id: supplierId,
      part_id: partId,
      original_price: price,
      discount_amount: discountAmount,
      discount_percent: discountPercent,
      final_price: finalPrice,
      state: 'issued',
      expires_at: expiresAt
    })
    .select()
    .single()

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 2. Redeem Coupon
`supabase/functions/redeem-coupon/index.ts`

```typescript
// Verify coupon is valid, not expired, not used
// Update coupon state to 'redeemed'
// Create redemption record
// Calculate commission
// Return success
```

### 3. Generate Monthly Statement
`supabase/functions/generate-statement/index.ts`

```typescript
// Aggregate all redemptions for supplier for given month
// Calculate totals
// Generate supplier_statement record
// Return statement data for invoicing
```

## API Endpoints (Client SDK)

### Search for Parts
```typescript
const { data } = await supabase
  .from('inventory')
  .select(`
    *,
    part:parts(*),
    supplier:suppliers(*)
  `)
  .eq('part.part_number', 'BP-4567')
  .gt('stock', 0)
```

### Find Nearest Suppliers
```typescript
const { data } = await supabase.rpc('find_nearest_suppliers', {
  user_lat: -33.9307,
  user_lon: 18.4472,
  max_distance_km: 50,
  part_id: 'uuid'
})
```

### Real-time Stock Updates
```typescript
const channel = supabase
  .channel('inventory-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'inventory',
    filter: `part_id=eq.${partId}`
  }, (payload) => {
    // Update UI with new stock levels
  })
  .subscribe()
```

## Anti-Fraud Controls

1. **Coupon expiry**: 24 hours max
2. **Single-use**: Database constraint prevents duplicate redemptions
3. **Supplier verification**: Only authenticated supplier can redeem
4. **Signed tokens**: Coupon code is cryptographically random
5. **Rate limiting**: Edge Functions limit coupon generation per user
6. **Audit trail**: All state changes logged in coupons table
7. **Geofencing** (optional): Verify user is near supplier when redeeming

## Monthly Billing Process

Automated job runs on 1st of each month:

1. Call `generate-statement` edge function for each supplier
2. Aggregate all redemptions from previous month
3. Calculate commission (10% of order amount by default)
4. Generate PDF invoice
5. Send to supplier via email
6. Mark statement as generated

## Migration from Mock Data

When Supabase is connected:

1. Run seed script to populate parts catalog from `mockData.ts`
2. Create supplier accounts for mock suppliers
3. Update `getSupplierResults()` to use Supabase queries
4. Replace `createCoupon()` with Edge Function call
5. Update UI to use real-time subscriptions

## Next Steps

1. **Connect Supabase** from Make settings page
2. Run database migrations (SQL above)
3. Deploy Edge Functions
4. Update frontend API calls
5. Test coupon flow end-to-end
6. Set up monthly billing cron job

## Cost Estimate

Supabase free tier includes:
- 500MB database
- 50,000 monthly active users
- 2GB file storage
- 2GB bandwidth

Should be sufficient for initial launch. Pro plan ($25/month) for production.
