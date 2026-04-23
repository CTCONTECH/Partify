# Service Layer API Reference

Quick reference for using the service layer in Partify. All services work identically whether in mock or live mode.

## Import Services

```typescript
import { partsService } from '@/lib/services/parts-service';
import { supplierService } from '@/lib/services/supplier-service';
import { couponService } from '@/lib/services/coupon-service';
```

## Parts Service

### searchParts(query: string): Promise<Part[]>

Search for parts by name, number, or category.

```typescript
const parts = await partsService.searchParts('brake');
// Returns all parts matching "brake"

const allParts = await partsService.searchParts('');
// Empty query returns all parts
```

### getPartById(id: string): Promise<Part | null>

Get a single part by ID.

```typescript
const part = await partsService.getPartById('part-123');
if (!part) {
  console.log('Part not found');
}
```

### getPartAvailability(partId: string, userLocation?: Location): Promise<SupplierResult[]>

Get all suppliers that have this part in stock, with pricing and distance.

```typescript
const availability = await partsService.getPartAvailability(
  'part-123',
  { lat: -33.9249, lon: 18.4241 } // Optional user location
);

// Returns array of SupplierResult with:
// - itemPrice: Part price at this supplier
// - distance: Distance from user (if location provided)
// - fuelCost: Estimated fuel cost for round trip
// - totalCost: itemPrice + fuelCost
// - isBestPrice: true if lowest item price
// - isClosest: true if nearest supplier
// - isBestTotal: true if lowest total cost
```

### getPartWithStats(partId: string): Promise<{ part, supplierCount, priceRange }>

Get part details with aggregate statistics.

```typescript
const { part, supplierCount, priceRange } = await partsService.getPartWithStats('part-123');

console.log(`${part.partName} available at ${supplierCount} suppliers`);
console.log(`Price range: R${priceRange.min} - R${priceRange.max}`);
```

## Supplier Service

### getSuppliers(): Promise<Supplier[]>

Get all active suppliers.

```typescript
const suppliers = await supplierService.getSuppliers();
```

### getSupplierById(id: string): Promise<Supplier | null>

Get a single supplier by ID.

```typescript
const supplier = await supplierService.getSupplierById('supplier-123');
```

### findNearestSuppliers(location: Location, partId?: string, maxDistanceKm?: number): Promise<Supplier[]>

Find suppliers near a location, optionally filtered by part availability.

```typescript
// Find all suppliers within 50km
const nearbySuppliers = await supplierService.findNearestSuppliers(
  { lat: -33.9249, lon: 18.4241 },
  undefined,
  50 // max distance in km
);

// Find suppliers that have a specific part
const suppliersWithPart = await supplierService.findNearestSuppliers(
  { lat: -33.9249, lon: 18.4241 },
  'part-123' // filter by part
);
```

### getSupplierInventory(supplierId: string): Promise<InventoryItem[]>

Get all parts in stock at a supplier.

```typescript
const inventory = await supplierService.getSupplierInventory('supplier-123');

inventory.forEach(item => {
  console.log(`${item.partName}: ${item.stock} in stock @ R${item.price}`);
});
```

### updateStock(inventoryId: string, newStock: number): Promise<void>

Update stock level (supplier action).

```typescript
await supplierService.updateStock('inv-123', 50);
```

### updatePrice(inventoryId: string, newPrice: number): Promise<void>

Update price (supplier action).

```typescript
await supplierService.updatePrice('inv-123', 299.99);
```

## Coupon Service

### issueCoupon(params): Promise<Coupon>

Issue a new coupon for a user at a supplier.

```typescript
const coupon = await couponService.issueCoupon({
  userId: 'user-123',
  supplierId: 'supplier-456',
  partId: 'part-789',
  price: 500, // Original price
  userLocation: { lat: -33.9249, lon: 18.4241 }, // Optional
});

// Coupon contains:
// - code: 'PFY-ABCD' (unique)
// - originalPrice: 500
// - discountAmount: 25 (5% of 500)
// - discountPercent: 5
// - finalPrice: 475
// - expiresAt: 24 hours from now
// - state: 'issued'
```

### getUserCoupons(userId: string): Promise<Coupon[]>

Get all coupons for a user.

```typescript
const coupons = await couponService.getUserCoupons('user-123');

// Filter active coupons
const activeCoupons = coupons.filter(c => 
  c.state !== 'redeemed' && 
  c.state !== 'expired' &&
  new Date(c.expiresAt) > new Date()
);
```

### markCouponViewed(couponId: string, userId: string): Promise<void>

Mark that user opened/viewed the coupon.

```typescript
await couponService.markCouponViewed('coupon-123', 'user-456');
// Transitions state: issued → opened
```

### markNavigationStarted(couponId: string, userId: string): Promise<void>

Mark that user started navigation to the supplier.

```typescript
await couponService.markNavigationStarted('coupon-123', 'user-456');
// Transitions state: opened → navigation_started
```

### redeemCoupon(params): Promise<void>

Redeem a coupon (supplier action).

```typescript
try {
  await couponService.redeemCoupon({
    couponId: 'coupon-123',
    redeemedBy: 'supplier-user-456', // Supplier employee ID
    orderAmount: 480, // Actual order total
  });
} catch (error) {
  // Throws if:
  // - Coupon not found
  // - Already redeemed
  // - Expired
}
```

### getCouponByCode(code: string): Promise<Coupon | null>

Look up a coupon by its code (for supplier validation).

```typescript
const coupon = await couponService.getCouponByCode('PFY-ABCD');

if (!coupon) {
  alert('Invalid coupon code');
} else if (coupon.state === 'redeemed') {
  alert('Coupon already used');
} else if (new Date(coupon.expiresAt) < new Date()) {
  alert('Coupon expired');
} else {
  // Valid coupon, proceed with redemption
}
```

## Common Patterns

### Loading States

```typescript
const [data, setData] = useState<Part[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const results = await partsService.searchParts(query);
    setData(results);
  } catch (err) {
    console.error('Failed to fetch:', err);
    setError('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### With Geolocation

```typescript
import { useGeolocation } from '@/hooks/useGeolocation';

function SupplierList() {
  const { location, error, loading } = useGeolocation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  useEffect(() => {
    if (location) {
      supplierService
        .findNearestSuppliers(location, partId)
        .then(setSuppliers);
    }
  }, [location, partId]);
  
  if (loading) return <div>Getting your location...</div>;
  if (error) return <div>Location access denied</div>;
  
  return <SupplierGrid suppliers={suppliers} />;
}
```

### Error Handling

```typescript
try {
  await couponService.redeemCoupon({ ... });
  toast.success('Coupon redeemed successfully!');
} catch (error) {
  if (error.message.includes('already redeemed')) {
    toast.error('This coupon has already been used');
  } else if (error.message.includes('expired')) {
    toast.error('This coupon has expired');
  } else {
    toast.error('Failed to redeem coupon');
  }
}
```

## Type Definitions

All types are defined in `src/types/index.ts`:

```typescript
type Part = {
  id: string;
  partNumber: string;
  partName: string;
  category: string;
  description?: string;
  imageUrl?: string;
};

type Supplier = {
  id: string;
  name: string;
  location: string;
  address: string;
  coordinates: Location;
  rating: number;
  totalParts: number;
  distance?: number; // km from user
};

type SupplierResult = Supplier & {
  itemPrice: number;
  fuelCost: number;
  totalCost: number;
  stockQty: number;
  partNumber: string;
  partName: string;
  isBestPrice?: boolean;
  isClosest?: boolean;
  isBestTotal?: boolean;
};

type Coupon = {
  id: string;
  code: string; // PFY-XXXX
  userId: string;
  supplierId: string;
  partId: string;
  originalPrice: number;
  discountAmount: number;
  discountPercent: number;
  finalPrice: number;
  state: CouponState;
  expiresAt: string; // ISO timestamp
  createdAt: string;
  redeemedAt?: string;
};

type CouponState = 
  | 'issued'
  | 'opened'
  | 'navigation_started'
  | 'redeemed'
  | 'expired';

type Location = {
  lat: number;
  lon: number;
};
```

## Testing Services

### Mock Mode

Services use mock data (localStorage + in-memory).

```typescript
import { config } from '@/lib/config';

console.log(config.dataSource); // 'mock'
console.log(config.isMockMode()); // true
```

### Live Mode

Services use Supabase backend.

Change `src/lib/config.ts`:

```typescript
export const config = {
  dataSource: 'live' as 'mock' | 'live',
  // ...
};
```

No code changes needed in components!

## Performance Tips

1. **Debounce search inputs** to avoid excessive API calls:
   ```typescript
   const debouncedSearch = useMemo(
     () => debounce((query) => partsService.searchParts(query), 300),
     []
   );
   ```

2. **Cache supplier locations** since they rarely change:
   ```typescript
   const [suppliers] = useState(() => 
     JSON.parse(localStorage.getItem('suppliers') || '[]')
   );
   ```

3. **Batch requests** when loading related data:
   ```typescript
   const [part, availability] = await Promise.all([
     partsService.getPartById(id),
     partsService.getPartAvailability(id, location),
   ]);
   ```

4. **Use suspense boundaries** to prevent layout shift:
   ```typescript
   <Suspense fallback={<LoadingSkeleton />}>
     <PartList />
   </Suspense>
   ```

## Next Steps

- See `MIGRATION_GUIDE.md` for switching from mock to live mode
- See `supabase/migrations/` for database schema
- See `src/lib/adapters/` for implementation details
