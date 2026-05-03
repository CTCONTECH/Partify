'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight, Clock, Search, Store, Tag, Ticket } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { createClient } from '@/lib/supabase/client';
import { couponService } from '@/lib/services/coupon-service';
import { formatCouponCode, getCouponTimeRemaining } from '@/lib/coupon';
import { Coupon, CouponState } from '@/types';

interface CouponDetail {
  coupon: Coupon;
  supplierName: string;
  supplierLocation: string;
  partName: string;
  partNumber: string;
}

function formatMoney(value: number): string {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function effectiveState(coupon: Coupon): CouponState {
  if (
    coupon.state !== 'redeemed' &&
    coupon.state !== 'cancelled' &&
    new Date(coupon.expiresAt).getTime() < Date.now()
  ) {
    return 'expired';
  }

  return coupon.state;
}

function stateLabel(state: CouponState): string {
  if (state === 'navigation_started') return 'Navigation started';
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function stateClass(state: CouponState): string {
  if (state === 'redeemed') return 'bg-green-50 text-green-700 border-green-200';
  if (state === 'expired' || state === 'cancelled') return 'bg-gray-50 text-gray-600 border-gray-200';
  return 'bg-orange-50 text-[var(--primary)] border-orange-200';
}

export default function ClientCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<CouponDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCoupons = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/client/coupons');
          return;
        }

        const userCoupons = await couponService.getUserCoupons(user.id);
        const supplierIds = Array.from(new Set(userCoupons.map((coupon) => coupon.supplierId)));
        const partIds = Array.from(new Set(userCoupons.map((coupon) => coupon.partId).filter(Boolean)));

        const [{ data: suppliers, error: suppliersError }, { data: parts, error: partsError }] =
          await Promise.all([
            supplierIds.length
              ? supabase
                  .from('suppliers')
                  .select('id, business_name, suburb')
                  .in('id', supplierIds)
              : Promise.resolve({ data: [], error: null }),
            partIds.length
              ? supabase
                  .from('parts')
                  .select('id, part_name, part_number')
                  .in('id', partIds)
              : Promise.resolve({ data: [], error: null }),
          ]);

        if (suppliersError) throw suppliersError;
        if (partsError) throw partsError;

        const suppliersById = new Map(
          (suppliers || []).map((supplier: any) => [supplier.id, supplier])
        );
        const partsById = new Map((parts || []).map((part: any) => [part.id, part]));

        setCoupons(
          userCoupons.map((coupon) => {
            const supplier = suppliersById.get(coupon.supplierId) as any;
            const part = partsById.get(coupon.partId) as any;

            return {
              coupon,
              supplierName: supplier?.business_name || 'Supplier',
              supplierLocation: supplier?.suburb || 'Location pending',
              partName: part?.part_name || 'Part',
              partNumber: part?.part_number || 'Part number pending',
            };
          })
        );
      } catch (err: any) {
        setError(err?.message || 'Could not load your coupons.');
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, [router]);

  const activeCount = useMemo(
    () => coupons.filter(({ coupon }) => ['issued', 'opened', 'navigation_started'].includes(effectiveState(coupon))).length,
    [coupons]
  );

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="My Coupons" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <Ticket className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Available now</p>
              <h2 className="text-xl">{loading ? 'Loading...' : `${activeCount} active`}</h2>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
                <div className="h-4 w-32 bg-[var(--muted)] rounded mb-3" />
                <div className="h-5 w-48 bg-[var(--muted)] rounded mb-3" />
                <div className="h-4 w-24 bg-[var(--muted)] rounded" />
              </div>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-[var(--muted)] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
            <h2 className="text-xl mb-2">No coupons yet</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Search for a part and choose a supplier to issue your first coupon.
            </p>
            <Button onClick={() => router.push('/client/search')}>
              <Search className="w-5 h-5 mr-2" />
              Search Parts
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map(({ coupon, supplierName, supplierLocation, partName, partNumber }) => {
              const state = effectiveState(coupon);
              const canOpenActive = ['issued', 'opened', 'navigation_started'].includes(state) && coupon.partId;
              const canViewDetails = ['redeemed', 'expired', 'cancelled'].includes(state);

              return (
                <button
                  key={coupon.id}
                  type="button"
                  onClick={() => {
                    if (canOpenActive) router.push(`/client/coupon/${coupon.supplierId}/${coupon.partId}`);
                    if (canViewDetails) router.push(`/client/coupons/${coupon.id}`);
                  }}
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-left active:bg-[var(--muted)] transition-colors disabled:active:bg-[var(--card)]"
                  disabled={!canOpenActive && !canViewDetails}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm text-[var(--muted-foreground)]">{partNumber}</p>
                      <h3 className="text-base">{partName}</h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${stateClass(state)}`}>
                      {stateLabel(state)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-3">
                    <Store className="w-4 h-4" />
                    <span>{supplierName} · {supplierLocation}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[var(--muted)] rounded-xl p-3">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Code</p>
                      <p className="font-mono text-base">{formatCouponCode(coupon.code)}</p>
                    </div>
                    <div className="bg-[var(--muted)] rounded-xl p-3">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">You save</p>
                      <p className="text-base text-[var(--primary)]">{formatMoney(coupon.discountAmount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {state === 'expired' ? 'Expired' : state === 'redeemed' ? 'Redeemed' : getCouponTimeRemaining(coupon)}
                    </span>
                    {(canOpenActive || canViewDetails) && <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="client" />
    </div>
  );
}
