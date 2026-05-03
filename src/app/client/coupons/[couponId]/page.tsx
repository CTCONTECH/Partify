'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, MapPin, ReceiptText, Store, Tag } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { createClient } from '@/lib/supabase/client';
import { couponService } from '@/lib/services/coupon-service';
import { formatCouponCode } from '@/lib/coupon';
import { Coupon } from '@/types';

interface CouponDetail {
  coupon: Coupon;
  supplierName: string;
  supplierAddress: string;
  partName: string;
  partNumber: string;
}

function formatMoney(value: number): string {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value?: string): string {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString();
}

export default function ClientCouponDetailPage() {
  const params = useParams();
  const router = useRouter();
  const couponId = params.couponId as string | undefined;
  const [detail, setDetail] = useState<CouponDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCoupon = async () => {
      if (!couponId) {
        setError('Coupon link is incomplete.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace(`/login?next=/client/coupons/${couponId}`);
          return;
        }

        const coupon = await couponService.getCoupon(couponId);
        if (!coupon || coupon.userId !== user.id) {
          setError('Coupon not found.');
          return;
        }

        const [{ data: supplier }, { data: part }] = await Promise.all([
          supabase
            .from('suppliers')
            .select('business_name, address, suburb')
            .eq('id', coupon.supplierId)
            .maybeSingle(),
          coupon.partId
            ? supabase
                .from('parts')
                .select('part_name, part_number')
                .eq('id', coupon.partId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        setDetail({
          coupon,
          supplierName: supplier?.business_name || 'Supplier',
          supplierAddress: supplier?.address || supplier?.suburb || 'Address unavailable',
          partName: part?.part_name || 'Part',
          partNumber: part?.part_number || 'Part number pending',
        });
      } catch (err: any) {
        setError(err?.message || 'Could not load coupon.');
      } finally {
        setLoading(false);
      }
    };

    loadCoupon();
  }, [couponId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-20">
        <TopBar title="Coupon Details" showBack />
        <div className="p-6 max-w-2xl mx-auto">
          <p className="text-sm text-[var(--muted-foreground)]">Loading coupon...</p>
        </div>
        <BottomNav role="client" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-20">
        <TopBar title="Coupon Details" showBack />
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
            <p className="text-sm">{error || 'Coupon not found.'}</p>
          </div>
        </div>
        <BottomNav role="client" />
      </div>
    );
  }

  const { coupon } = detail;
  const isRedeemed = coupon.state === 'redeemed';

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title={isRedeemed ? 'Coupon Redeemed' : 'Coupon Details'} showBack />

      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className={`${isRedeemed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-[var(--card)] border-[var(--border)]'} border rounded-2xl p-5 text-center`}>
          <div className="w-14 h-14 rounded-2xl bg-white/80 border border-current/10 flex items-center justify-center mx-auto mb-3">
            {isRedeemed ? <CheckCircle2 className="w-8 h-8" /> : <ReceiptText className="w-8 h-8" />}
          </div>
          <h1 className="text-2xl mb-2">{isRedeemed ? 'Coupon Redeemed' : 'Coupon Complete'}</h1>
          <p className="text-sm opacity-80">
            {isRedeemed
              ? 'This coupon has been redeemed and recorded by the supplier.'
              : 'This coupon is no longer active.'}
          </p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <Store className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div>
              <h2 className="text-lg mb-1">{detail.supplierName}</h2>
              <div className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{detail.supplierAddress}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">{detail.partNumber}</p>
            <h2 className="text-xl">{detail.partName}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--muted)] rounded-xl p-3">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Code</p>
              <p className="font-mono text-base">{formatCouponCode(coupon.code)}</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-3">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Final Price</p>
              <p className="text-base text-[var(--primary)]">{formatMoney(coupon.finalPrice)}</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-3">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Discount</p>
              <p className="text-base">{formatMoney(coupon.discountAmount)}</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-3">
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Status</p>
              <p className="text-base capitalize">{coupon.state.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Clock className="w-4 h-4" />
            <span>Redeemed: {formatDateTime(coupon.redeemedAt)}</span>
          </div>
        </div>

        <Button fullWidth onClick={() => router.push('/client/home')}>
          <Tag className="w-5 h-5 mr-2" />
          Back to Home
        </Button>
      </div>

      <BottomNav role="client" />
    </div>
  );
}
