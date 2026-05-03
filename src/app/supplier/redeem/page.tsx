'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, ReceiptText, Search, ShieldCheck, Tag } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { couponService } from '@/lib/services/coupon-service';
import { Coupon } from '@/types';

interface CouponLookup {
  coupon: Coupon;
  partName: string;
  partNumber: string;
  clientLabel: string;
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function formatMoney(value: number): string {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function isExpired(coupon: Coupon): boolean {
  return new Date(coupon.expiresAt).getTime() < Date.now();
}

function statusLabel(coupon: Coupon): string {
  if (coupon.state === 'redeemed') return 'Redeemed';
  if (coupon.state === 'cancelled') return 'Cancelled';
  if (coupon.state === 'expired' || isExpired(coupon)) return 'Expired';
  if (coupon.state === 'navigation_started') return 'Navigation started';
  if (coupon.state === 'opened') return 'Opened';
  return 'Issued';
}

export default function SupplierRedeemPage() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [lookup, setLookup] = useState<CouponLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSupplier = async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/supplier/redeem');
          return;
        }

        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!supplier) {
          router.replace('/supplier/onboarding');
          return;
        }

        setSupplierId(supplier.id);
      } catch (err: any) {
        setError(err?.message || 'Could not load supplier account.');
      } finally {
        setLoading(false);
      }
    };

    loadSupplier();
  }, [router]);

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();

    const couponCode = normalizeCode(code);
    if (!couponCode) {
      setError('Enter a coupon code.');
      return;
    }

    setSearching(true);
    setError(null);
    setSuccess(null);
    setLookup(null);

    try {
      const coupon = await couponService.getCouponByCode(couponCode);

      if (!coupon) {
        setError('Coupon not found for this supplier.');
        return;
      }

      if (supplierId && coupon.supplierId !== supplierId) {
        setError('This coupon belongs to another supplier.');
        return;
      }

      const supabase = createClient();
      const { data: part } = coupon.partId
        ? await supabase
            .from('parts')
            .select('part_name, part_number')
            .eq('id', coupon.partId)
            .maybeSingle()
        : { data: null };

      setLookup({
        coupon,
        partName: part?.part_name || 'Part',
        partNumber: part?.part_number || 'Part number pending',
        clientLabel: `Client ${coupon.userId.slice(0, 8)}`,
      });
      setActualAmount(String(coupon.finalPrice.toFixed(2)));
    } catch (err: any) {
      setError(err?.message || 'Could not verify coupon.');
    } finally {
      setSearching(false);
    }
  };

  const handleRedeem = async () => {
    if (!lookup || !supplierId) return;

    const amount = Number(actualAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter the actual order amount.');
      return;
    }

    setRedeeming(true);
    setError(null);
    setSuccess(null);

    try {
      await couponService.redeemCoupon({
        couponId: lookup.coupon.id,
        redeemedBy: supplierId,
        orderAmount: amount,
      });

      setSuccess('Coupon redeemed successfully.');
      setLookup({
        ...lookup,
        coupon: {
          ...lookup.coupon,
          state: 'redeemed',
          redeemedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Could not redeem coupon.');
    } finally {
      setRedeeming(false);
    }
  };

  const canRedeem = lookup
    && !isExpired(lookup.coupon)
    && !['redeemed', 'expired', 'cancelled'].includes(lookup.coupon.state);

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Redeem Coupon" showBack />

      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <form onSubmit={handleLookup} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <ReceiptText className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <h2 className="text-lg">Verify Coupon Code</h2>
              <p className="text-sm text-[var(--muted-foreground)]">Enter the client&apos;s Partify code before checkout.</p>
            </div>
          </div>

          <Input
            label="Coupon Code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="PFY-ABC12345"
            autoCapitalize="characters"
            disabled={loading || searching || redeeming}
          />

          <Button type="submit" fullWidth disabled={loading || searching || redeeming}>
            <Search className="w-5 h-5 mr-2" />
            {searching ? 'Checking...' : 'Check Coupon'}
          </Button>
        </form>

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 rounded-2xl p-4">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        {lookup && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{lookup.partNumber}</p>
                <h3 className="text-xl">{lookup.partName}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{lookup.clientLabel}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full border border-orange-200 bg-orange-50 text-[var(--primary)]">
                {statusLabel(lookup.coupon)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Original</p>
                <p className="text-base">{formatMoney(lookup.coupon.originalPrice)}</p>
              </div>
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Discount</p>
                <p className="text-base text-[var(--primary)]">
                  {formatMoney(lookup.coupon.discountAmount)}
                </p>
              </div>
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Coupon Price</p>
                <p className="text-base">{formatMoney(lookup.coupon.finalPrice)}</p>
              </div>
              <div className="bg-[var(--muted)] rounded-xl p-3">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Expires</p>
                <p className="text-sm">{new Date(lookup.coupon.expiresAt).toLocaleString()}</p>
              </div>
            </div>

            <Input
              label="Actual Order Amount"
              type="number"
              min="0"
              step="0.01"
              value={actualAmount}
              onChange={(event) => setActualAmount(event.target.value)}
              disabled={!canRedeem || redeeming}
            />

            <Button fullWidth onClick={handleRedeem} disabled={!canRedeem || redeeming}>
              <Tag className="w-5 h-5 mr-2" />
              {redeeming ? 'Redeeming...' : 'Confirm Redemption'}
            </Button>

            <div className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Redeeming in Partify records this sale for supplier reporting and commission reconciliation.</p>
            </div>
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
