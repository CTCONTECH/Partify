# Migration Guide: Mock to Live Supabase

This guide walks through migrating the Partify app from mock data to live Supabase backend.

## Overview

The app uses an **adapter pattern** that allows seamless switching between mock (localStorage) and live (Supabase) data sources. All business logic remains in the service layer, making the migration transparent to UI components.

## Architecture Layers

```
UI Components (React)
      ↓
Service Layer (coupon-service, parts-service, supplier-service)
      ↓
Repository Interfaces (contracts)
      ↓
Adapters ← Factory selects based on config
   ├── Mock Adapter (localStorage + in-memory)
   └── Supabase Adapter (PostgreSQL + PostGIS)
```

## Prerequisites

- Node.js 18+ and pnpm installed
- Supabase CLI installed: `npm install -g supabase`
- Supabase account (free tier works)

## Step 1: Set Up Supabase Project

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Choose organization
4. Set project name: `partify-prod`
5. Set strong database password (save it!)
6. Choose region: closest to Cape Town (e.g., `eu-west-1`)
7. Click "Create new project"

### 1.2 Get API Credentials

Once project is ready:

1. Go to Project Settings → API
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (long JWT token starting with `eyJ...`)
   - **service_role key** (different JWT, only for backend)

## Step 2: Configure Environment Variables

### 2.1 Create .env.local

Create `.env.local` in project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: for admin operations
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace with your actual values from Step 1.2.

### 2.2 Add to .gitignore

Ensure `.env.local` is in `.gitignore`:

```
.env.local
.env*.local
```

## Step 3: Install Dependencies

Add Supabase client libraries:

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

These are already referenced in the code at:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

## Step 4: Run Database Migrations

### 4.1 Initialize Supabase Locally (Optional)

For local development and testing:

```bash
supabase init
supabase start
```

This starts local Postgres with PostGIS.

### 4.2 Link to Remote Project

```bash
supabase link --project-ref your-project-ref
```

Get project ref from Supabase dashboard URL or settings.

### 4.3 Run Migrations

Migrations are in `supabase/migrations/` and must run in order:

```bash
# Option A: Run all migrations automatically
supabase db push

# Option B: Run manually in SQL editor
# Go to Supabase Dashboard → SQL Editor
# Copy/paste each file in order:
# 001_init_schema.sql
# 002_profiles.sql
# 003_suppliers.sql
# 004_parts.sql
# 005_inventory.sql
# 006_coupons.sql
# 007_events.sql
# 008_settlements.sql
# 009_rls_policies.sql
# 010_seed_data.sql
```

### 4.4 Verify Migrations

Check tables exist:

```bash
supabase db pull
```

Should show all tables in `supabase/migrations/` directory.

## Step 5: Enable PostGIS

PostGIS should be enabled by migration 001, but verify:

1. Go to Database → Extensions
2. Search for "postgis"
3. Ensure it's enabled

## Step 6: Update Components to Use Services

### 6.1 Current Pattern (Mock Data)

Most components currently import mock data directly:

```typescript
// ❌ OLD: Direct mock data import
import { mockSuppliers, mockParts } from '@/lib/mockData';

function PartSearch() {
  const [parts, setParts] = useState(mockParts);
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  
  const handleSearch = (query: string) => {
    const filtered = mockParts.filter(p => 
      p.partName.toLowerCase().includes(query.toLowerCase())
    );
    setParts(filtered);
  };
}
```

### 6.2 New Pattern (Service Layer)

Update to use service layer:

```typescript
// ✅ NEW: Use service layer
import { partsService } from '@/lib/services/parts-service';
import { supplierService } from '@/lib/services/supplier-service';

function PartSearch() {
  const [parts, setParts] = useState<Part[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const results = await partsService.searchParts(query);
      setParts(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Initial load
    handleSearch('');
  }, []);
}
```

### 6.3 Files to Update

Update these component files:

**Client Screens:**
- `src/app/screens/client/PartSearchScreen.tsx` → use `partsService.searchParts()`
- `src/app/screens/client/SupplierListScreen.tsx` → use `supplierService.findNearestSuppliers()`
- `src/app/screens/client/CouponScreen.tsx` → use `couponService.issueCoupon()`, `couponService.markCouponViewed()`
- `src/app/screens/client/CouponListScreen.tsx` → use `couponService.getUserCoupons()`

**Supplier Screens:**
- `src/app/screens/supplier/SupplierDashboard.tsx` → use `supplierService.getSupplierInventory()`
- `src/app/screens/supplier/CouponValidation.tsx` → use `couponService.getCouponByCode()`, `couponService.redeemCoupon()`

### 6.4 Example: Complete Before/After

**Before (PartSearchScreen.tsx):**

```typescript
import { mockParts } from '@/lib/mockData';
import { calculateDistance } from '@/lib/geolocation';

export default function PartSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredParts, setFilteredParts] = useState(mockParts);
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = mockParts.filter(part =>
      part.partName.toLowerCase().includes(query.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredParts(filtered);
  };
  
  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {filteredParts.map(part => (
        <PartCard key={part.id} part={part} />
      ))}
    </div>
  );
}
```

**After (PartSearchScreen.tsx):**

```typescript
import { partsService } from '@/lib/services/parts-service';
import { Part } from '@/types';

export default function PartSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setLoading(true);
    setError(null);
    
    try {
      const results = await partsService.searchParts(query);
      setFilteredParts(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to search parts. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Load all parts on mount
    handleSearch('');
  }, []);
  
  return (
    <div>
      <input 
        onChange={(e) => handleSearch(e.target.value)}
        disabled={loading}
      />
      {loading && <div>Searching...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {filteredParts.map(part => (
        <PartCard key={part.id} part={part} />
      ))}
    </div>
  );
}
```

### 6.5 Coupon Issuance Example

**Before:**

```typescript
import { createCoupon } from '@/lib/coupon';

const handleGetCoupon = () => {
  const coupon = createCoupon(
    'user-123',
    selectedSupplier.id,
    selectedPart.id,
    selectedSupplier.price,
    5 // 5% discount
  );
  
  localStorage.setItem(
    `coupon_${selectedSupplier.id}_${selectedPart.id}`,
    JSON.stringify(coupon)
  );
  
  navigate('/coupon', { state: { coupon } });
};
```

**After:**

```typescript
import { couponService } from '@/lib/services/coupon-service';
import { useGeolocation } from '@/hooks/useGeolocation';

const { location } = useGeolocation();

const handleGetCoupon = async () => {
  setLoading(true);
  try {
    const coupon = await couponService.issueCoupon({
      userId: currentUser.id, // from auth context
      supplierId: selectedSupplier.id,
      partId: selectedPart.id,
      price: selectedSupplier.price,
      userLocation: location,
    });
    
    navigate('/coupon', { state: { coupon } });
  } catch (error) {
    console.error('Failed to issue coupon:', error);
    alert('Failed to create coupon. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

## Step 7: Switch from Mock to Live Mode

### 7.1 Configuration File

Edit `src/lib/config.ts`:

```typescript
export const config = {
  // Change this line:
  dataSource: 'live' as 'mock' | 'live',  // ← Change from 'mock' to 'live'
  
  discountPercent: 5,
  platformCommissionPercent: 10,
  fuelCostPerKm: 2.5,
  couponExpiryHours: 24,
};
```

That's it! The factory will now return Supabase adapters instead of mock adapters.

### 7.2 Verify Switch

Check which adapter is active:

```typescript
import { config } from '@/lib/config';

console.log('Data source:', config.dataSource);
console.log('Is live mode:', config.isLiveMode());
```

## Step 8: Authentication Setup

### 8.1 Enable Email Auth

1. Go to Authentication → Providers
2. Enable "Email" provider
3. Disable email confirmation for testing (enable for production)

### 8.2 Create Test Users

In SQL Editor:

```sql
-- Create test client user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'client@test.com',
  crypt('password123', gen_salt('bf')),
  now()
);

-- Create test supplier user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'supplier@test.com',
  crypt('password123', gen_salt('bf')),
  now()
);

-- Create profiles
INSERT INTO profiles (id, email, role, name)
SELECT id, email, 'client', 'Test Client'
FROM auth.users WHERE email = 'client@test.com';

INSERT INTO profiles (id, email, role, name)
SELECT id, email, 'supplier', 'Test Supplier'
FROM auth.users WHERE email = 'supplier@test.com';
```

### 8.3 Add Auth Context

Create `src/contexts/AuthContext.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

Wrap app in `src/app/layout.tsx`:

```typescript
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Step 9: Testing Checklist

### 9.1 Mock Mode Tests

Before switching to live, verify mock mode works:

- [ ] Search for parts (empty query returns all)
- [ ] Search for parts (query filters results)
- [ ] Select part and see suppliers sorted by distance
- [ ] Click "Get Coupon" and see coupon screen
- [ ] Copy coupon code
- [ ] Start navigation in maps
- [ ] View coupon list (stored in localStorage)

### 9.2 Live Mode Tests

After switching to live (`dataSource: 'live'`):

**Parts & Search:**
- [ ] Search returns results from `parts` table
- [ ] Empty search returns all parts
- [ ] Part details load correctly

**Suppliers & Geolocation:**
- [ ] Nearest suppliers query uses PostGIS `find_nearest_suppliers()`
- [ ] Distance calculation is accurate (compare with Google Maps)
- [ ] Suppliers sorted by distance
- [ ] Fuel cost calculated correctly (R2.50/km round trip)

**Coupons:**
- [ ] Issue coupon creates record in `coupon_issues` table
- [ ] Coupon code is unique (PFY-XXXX format)
- [ ] Discount calculation: 5% off item price
- [ ] Final price = original price - discount
- [ ] Expiry set to 24 hours from creation
- [ ] Event logged in `coupon_events` table

**Coupon Lifecycle:**
- [ ] Mark as viewed updates status to 'opened'
- [ ] Start navigation updates status to 'navigation_started'
- [ ] Supplier can look up coupon by code
- [ ] Supplier can redeem coupon (status → 'redeemed')
- [ ] Cannot redeem already-redeemed coupon
- [ ] Cannot redeem expired coupon

**RLS Policies:**
- [ ] User can only see own coupons
- [ ] Supplier can only see coupons for their store
- [ ] User cannot access other users' vehicles
- [ ] Supplier can only edit own inventory

**Settlements:**
- [ ] Generate monthly settlement for supplier
- [ ] Settlement includes all redeemed coupons for that month
- [ ] Commission calculated at 10% of order amount
- [ ] Line items link to individual redemptions

### 9.3 Performance Tests

- [ ] Nearest supplier query < 500ms (with GIST index)
- [ ] Part search < 200ms
- [ ] Coupon issuance < 300ms
- [ ] Settlement generation < 2s (for 100+ redemptions)

## Step 10: Production Deployment

### 10.1 Environment Variables

Set in Vercel/hosting platform:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 10.2 Enable RLS

Ensure RLS is enabled on all tables (already done in migration 009):

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All should show `rowsecurity = true`.

### 10.3 Scheduled Functions

Set up cron jobs in Supabase:

**Expire Old Coupons (runs hourly):**

```sql
SELECT cron.schedule(
  'expire-old-coupons',
  '0 * * * *',  -- Every hour
  $$SELECT expire_old_coupons()$$
);
```

**Generate Monthly Settlements (runs on 1st of month):**

```sql
SELECT cron.schedule(
  'generate-settlements',
  '0 2 1 * *',  -- 2 AM on 1st of each month
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

### 10.4 Monitoring

Enable in Supabase Dashboard:
- Database → Logs (query performance)
- Authentication → Users (user growth)
- Storage → Usage (API quota)

Set up alerts for:
- Slow queries (> 1s)
- High error rate (> 5%)
- API quota (> 80%)

## Troubleshooting

### Issue: "relation does not exist"

**Cause:** Migrations not run or wrong schema.

**Fix:**
```bash
supabase db push
```

### Issue: "permission denied for table"

**Cause:** RLS blocking access.

**Fix:** Check RLS policies in migration 009. For testing, disable RLS:
```sql
ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;
```

(Re-enable for production!)

### Issue: "PostGIS function not found"

**Cause:** PostGIS extension not enabled.

**Fix:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Issue: "Invalid JWT"

**Cause:** Wrong anon key or expired token.

**Fix:** Regenerate anon key in Project Settings → API → Reset.

### Issue: Components still use mock data

**Cause:** Forgot to change `config.dataSource` to `'live'`.

**Fix:** Edit `src/lib/config.ts` and set `dataSource: 'live'`.

## Rollback Plan

If issues occur, rollback to mock mode:

1. Change `src/lib/config.ts`:
   ```typescript
   dataSource: 'mock' as 'mock' | 'live',
   ```

2. Clear affected localStorage:
   ```typescript
   localStorage.clear();
   ```

3. Redeploy

Mock data will work immediately without Supabase.

## Summary

Migration steps:
1. ✅ Create Supabase project
2. ✅ Configure `.env.local` with API keys
3. ✅ Install dependencies (`@supabase/supabase-js`, `@supabase/ssr`)
4. ✅ Run 10 migrations in order
5. ✅ Update components to use service layer
6. ✅ Switch `config.dataSource` from `'mock'` to `'live'`
7. ✅ Set up authentication
8. ✅ Test all flows
9. ✅ Deploy with environment variables
10. ✅ Schedule cron jobs

The adapter pattern ensures zero downtime—switch back to mock anytime by changing one line in `config.ts`.

## Support

For issues:
- Check Supabase logs: Dashboard → Database → Logs
- Review RLS policies: `supabase/migrations/009_rls_policies.sql`
- Verify functions exist: `SELECT * FROM pg_proc WHERE proname LIKE '%coupon%';`
- Test queries in SQL Editor before blaming code

Happy shipping! 🚀
