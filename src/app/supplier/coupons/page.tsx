'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  ReceiptText,
  Tag,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/Badge';
import { createClient } from '@/lib/supabase/client';
import { formatCouponCode } from '@/lib/coupon';
import { CouponState } from '@/types';

type FilterKey = 'all' | 'active' | 'redeemed' | 'closed';

interface SupplierCoupon {
  id: string;
  code: string;
  status: CouponState;
  partNumber: string;
  partName: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  actualOrderAmount: number | null;
  createdAt: string;
  openedAt: string | null;
  navigationStartedAt: string | null;
  redeemedAt: string | null;
  expiresAt: string;
}

const STATUS_ORDER: CouponState[] = [
  'issued',
  'opened',
  'navigation_started',
  'redeemed',
  'expired',
  'cancelled',
];

const STATUS_COLORS: Record<CouponState, string> = {
  issued: '#F97316',
  opened: '#FB923C',
  navigation_started: '#2563EB',
  redeemed: '#16A34A',
  expired: '#64748B',
  cancelled: '#94A3B8',
};

function formatMoney(value: number): string {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function formatCompactMoney(value: number): string {
  if (value >= 1000) return `R ${(value / 1000).toFixed(1)}k`;
  return `R ${Math.round(value).toLocaleString()}`;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(value?: string | null): string {
  if (!value) return 'Not yet';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: CouponState): string {
  if (status === 'navigation_started') return 'Navigation';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusVariant(status: CouponState): 'success' | 'warning' | 'info' | 'error' | 'default' {
  if (status === 'redeemed') return 'success';
  if (status === 'navigation_started') return 'info';
  if (status === 'issued' || status === 'opened') return 'warning';
  if (status === 'expired' || status === 'cancelled') return 'default';
  return 'default';
}

function isActive(status: CouponState): boolean {
  return status === 'issued' || status === 'opened' || status === 'navigation_started';
}

function isThisMonth(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function last14DayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function SupplierCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<SupplierCoupon[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
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
          router.replace('/login?next=/supplier/coupons');
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

        const { data, error: couponError } = await supabase
          .from('coupon_issues')
          .select(`
            id,
            code,
            status,
            original_price,
            discount_amount,
            final_price,
            actual_order_amount,
            created_at,
            opened_at,
            navigation_started_at,
            redeemed_at,
            expires_at,
            parts (
              part_number,
              part_name
            )
          `)
          .eq('supplier_id', supplier.id)
          .order('created_at', { ascending: false })
          .limit(250);

        if (couponError) throw couponError;

        setCoupons((data || []).map((coupon: any) => ({
          id: coupon.id,
          code: coupon.code,
          status: coupon.status,
          partNumber: coupon.parts?.part_number || 'Part number pending',
          partName: coupon.parts?.part_name || 'Part',
          originalPrice: Number(coupon.original_price || 0),
          discountAmount: Number(coupon.discount_amount || 0),
          finalPrice: Number(coupon.final_price || 0),
          actualOrderAmount: coupon.actual_order_amount === null ? null : Number(coupon.actual_order_amount),
          createdAt: coupon.created_at,
          openedAt: coupon.opened_at,
          navigationStartedAt: coupon.navigation_started_at,
          redeemedAt: coupon.redeemed_at,
          expiresAt: coupon.expires_at,
        })));
      } catch (err: any) {
        setError(err?.message || 'Could not load coupon analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, [router]);

  const analytics = useMemo(() => {
    const totalIssued = coupons.length;
    const active = coupons.filter((coupon) => isActive(coupon.status)).length;
    const redeemed = coupons.filter((coupon) => coupon.status === 'redeemed');
    const redeemedThisMonth = redeemed.filter((coupon) => isThisMonth(coupon.redeemedAt));
    const navigated = coupons.filter((coupon) => coupon.status === 'navigation_started' || coupon.status === 'redeemed');
    const redeemedValueThisMonth = redeemedThisMonth.reduce(
      (sum, coupon) => sum + (coupon.actualOrderAmount ?? coupon.finalPrice),
      0
    );
    const discountsThisMonth = redeemedThisMonth.reduce((sum, coupon) => sum + coupon.discountAmount, 0);

    return {
      active,
      redeemedThisMonth: redeemedThisMonth.length,
      redeemedValueThisMonth,
      discountsThisMonth,
      redemptionRate: totalIssued > 0 ? Math.round((redeemed.length / totalIssued) * 100) : 0,
      navigationRedemptionRate: navigated.length > 0 ? Math.round((redeemed.length / navigated.length) * 100) : 0,
    };
  }, [coupons]);

  const statusData = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      label: statusLabel(status),
      count: coupons.filter((coupon) => coupon.status === status).length,
      fill: STATUS_COLORS[status],
    }));
  }, [coupons]);

  const valueByDay = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      return {
        key: last14DayKey(date),
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: 0,
      };
    });

    const byKey = new Map(days.map((day) => [day.key, day]));

    coupons
      .filter((coupon) => coupon.status === 'redeemed' && coupon.redeemedAt)
      .forEach((coupon) => {
        const key = last14DayKey(new Date(coupon.redeemedAt as string));
        const day = byKey.get(key);
        if (day) {
          day.value += coupon.actualOrderAmount ?? coupon.finalPrice;
        }
      });

    return days;
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    if (filter === 'active') return coupons.filter((coupon) => isActive(coupon.status));
    if (filter === 'redeemed') return coupons.filter((coupon) => coupon.status === 'redeemed');
    if (filter === 'closed') {
      return coupons.filter((coupon) => coupon.status === 'expired' || coupon.status === 'cancelled');
    }
    return coupons;
  }, [coupons, filter]);

  const filterCounts = {
    all: coupons.length,
    active: coupons.filter((coupon) => isActive(coupon.status)).length,
    redeemed: coupons.filter((coupon) => coupon.status === 'redeemed').length,
    closed: coupons.filter((coupon) => coupon.status === 'expired' || coupon.status === 'cancelled').length,
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Coupon Analytics" showBack />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Active Coupons', value: analytics.active.toLocaleString(), icon: Ticket, tone: 'bg-orange-50 text-orange-700' },
            { label: 'Redeemed This Month', value: analytics.redeemedThisMonth.toLocaleString(), icon: CheckCircle2, tone: 'bg-green-50 text-green-700' },
            { label: 'Tracked Value', value: formatCompactMoney(analytics.redeemedValueThisMonth), icon: TrendingUp, tone: 'bg-blue-50 text-blue-700' },
            { label: 'Discounts Given', value: formatCompactMoney(analytics.discountsThisMonth), icon: Tag, tone: 'bg-red-50 text-red-700' },
            { label: 'Redemption Rate', value: `${analytics.redemptionRate}%`, icon: Gauge, tone: 'bg-slate-100 text-slate-700' },
            { label: 'Nav to Redeem', value: `${analytics.navigationRedemptionRate}%`, icon: BarChart3, tone: 'bg-indigo-50 text-indigo-700' },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 min-h-28">
                <div className={`${metric.tone} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                {loading ? (
                  <>
                    <div className="h-6 w-16 bg-[var(--muted)] rounded mb-2 animate-pulse" />
                    <div className="h-4 w-24 bg-[var(--muted)] rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl mb-1">{metric.value}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{metric.label}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[var(--foreground)]" />
              <h2 className="text-lg">Coupon Funnel</h2>
            </div>
            <div className="h-64">
              {loading ? (
                <div className="h-full bg-[var(--muted)] rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-5 h-5 text-[var(--foreground)]" />
              <h2 className="text-lg">Redeemed Value</h2>
            </div>
            <div className="h-64">
              {loading ? (
                <div className="h-full bg-[var(--muted)] rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={valueByDay} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCompactMoney(Number(value))} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                    <Bar dataKey="value" fill="#16A34A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-[var(--foreground)]" />
              <h2 className="text-lg">Coupon Ledger</h2>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'redeemed', label: 'Redeemed' },
              { key: 'closed', label: 'Closed' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as FilterKey)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors ${
                  filter === item.key
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)]'
                }`}
              >
                {item.label} ({filterCounts[item.key as FilterKey]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 bg-[var(--muted)] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center py-10">
              <Ticket className="w-8 h-8 mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="text-sm text-[var(--muted-foreground)]">No coupons in this view yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCoupons.map((coupon) => (
                <div key={coupon.id} className="border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted-foreground)] font-mono mb-1">
                        {formatCouponCode(coupon.code)}
                      </p>
                      <h3 className="text-base truncate">{coupon.partName}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">{coupon.partNumber}</p>
                    </div>
                    <Badge variant={statusVariant(coupon.status)} size="sm">
                      {statusLabel(coupon.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Final Price</p>
                      <p>{formatMoney(coupon.finalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Discount</p>
                      <p>{formatMoney(coupon.discountAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Issued</p>
                      <p>{formatTime(coupon.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Redeemed</p>
                      <p>{formatTime(coupon.redeemedAt)}</p>
                    </div>
                  </div>

                  {coupon.status === 'navigation_started' && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <Clock className="w-4 h-4" />
                      <span>Client started navigation on {formatDate(coupon.navigationStartedAt)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
