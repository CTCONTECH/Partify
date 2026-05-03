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
type DatePreset = 'this_month' | 'last_month' | 'last_30' | 'last_90' | 'custom';

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

const PAGE_SIZE = 5;

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

function last14DayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getPresetRange(preset: DatePreset, customStart: string, customEnd: string) {
  const now = new Date();

  if (preset === 'this_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: endOfDay(now),
      label: 'This month',
    };
  }

  if (preset === 'last_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      label: 'Last month',
    };
  }

  if (preset === 'last_90') {
    const start = new Date(now);
    start.setDate(start.getDate() - 89);
    return {
      start: startOfDay(start),
      end: endOfDay(now),
      label: 'Last 90 days',
    };
  }

  if (preset === 'custom' && customStart && customEnd) {
    return {
      start: startOfDay(new Date(customStart)),
      end: endOfDay(new Date(customEnd)),
      label: `${customStart} to ${customEnd}`,
    };
  }

  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  return {
    start: startOfDay(start),
    end: endOfDay(now),
    label: 'Last 30 days',
  };
}

function couponActivityDate(coupon: SupplierCoupon): Date {
  return new Date(coupon.redeemedAt || coupon.navigationStartedAt || coupon.openedAt || coupon.createdAt);
}

export default function SupplierCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<SupplierCoupon[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customStart, setCustomStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return toInputDate(date);
  });
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));
  const [ledgerPage, setLedgerPage] = useState(1);
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

  useEffect(() => {
    setLedgerPage(1);
  }, [filter, datePreset, customStart, customEnd]);

  const selectedRange = useMemo(
    () => getPresetRange(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd]
  );

  const rangeCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const date = couponActivityDate(coupon);
      return date >= selectedRange.start && date <= selectedRange.end;
    });
  }, [coupons, selectedRange]);

  const analytics = useMemo(() => {
    const totalIssued = rangeCoupons.length;
    const active = rangeCoupons.filter((coupon) => isActive(coupon.status)).length;
    const redeemed = rangeCoupons.filter((coupon) => coupon.status === 'redeemed');
    const navigated = rangeCoupons.filter((coupon) => coupon.status === 'navigation_started' || coupon.status === 'redeemed');
    const redeemedValue = redeemed.reduce(
      (sum, coupon) => sum + (coupon.actualOrderAmount ?? coupon.finalPrice),
      0
    );
    const discounts = redeemed.reduce((sum, coupon) => sum + coupon.discountAmount, 0);

    return {
      active,
      redeemedCount: redeemed.length,
      redeemedValue,
      discounts,
      redemptionRate: totalIssued > 0 ? Math.round((redeemed.length / totalIssued) * 100) : 0,
      navigationRedemptionRate: navigated.length > 0 ? Math.round((redeemed.length / navigated.length) * 100) : 0,
    };
  }, [rangeCoupons]);

  const statusData = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      label: statusLabel(status),
      count: rangeCoupons.filter((coupon) => coupon.status === status).length,
      fill: STATUS_COLORS[status],
    }));
  }, [rangeCoupons]);

  const valueByDay = useMemo(() => {
    const daysInRange = Math.max(
      1,
      Math.min(31, Math.ceil((selectedRange.end.getTime() - selectedRange.start.getTime()) / 86400000) + 1)
    );

    const days = Array.from({ length: daysInRange }, (_, index) => {
      const date = new Date(selectedRange.end);
      date.setDate(date.getDate() - (daysInRange - 1 - index));
      return {
        key: last14DayKey(date),
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: 0,
      };
    });

    const byKey = new Map(days.map((day) => [day.key, day]));

    rangeCoupons
      .filter((coupon) => coupon.status === 'redeemed' && coupon.redeemedAt)
      .forEach((coupon) => {
        const key = last14DayKey(new Date(coupon.redeemedAt as string));
        const day = byKey.get(key);
        if (day) {
          day.value += coupon.actualOrderAmount ?? coupon.finalPrice;
        }
      });

    return days;
  }, [rangeCoupons, selectedRange]);

  const filteredCoupons = useMemo(() => {
    if (filter === 'active') return rangeCoupons.filter((coupon) => isActive(coupon.status));
    if (filter === 'redeemed') return rangeCoupons.filter((coupon) => coupon.status === 'redeemed');
    if (filter === 'closed') {
      return rangeCoupons.filter((coupon) => coupon.status === 'expired' || coupon.status === 'cancelled');
    }
    return rangeCoupons;
  }, [rangeCoupons, filter]);

  const filterCounts = {
    all: rangeCoupons.length,
    active: rangeCoupons.filter((coupon) => isActive(coupon.status)).length,
    redeemed: rangeCoupons.filter((coupon) => coupon.status === 'redeemed').length,
    closed: rangeCoupons.filter((coupon) => coupon.status === 'expired' || coupon.status === 'cancelled').length,
  };

  const totalLedgerPages = Math.max(1, Math.ceil(filteredCoupons.length / PAGE_SIZE));
  const safeLedgerPage = Math.min(ledgerPage, totalLedgerPages);
  const visibleCoupons = filteredCoupons.slice((safeLedgerPage - 1) * PAGE_SIZE, safeLedgerPage * PAGE_SIZE);
  const ledgerStart = filteredCoupons.length === 0 ? 0 : (safeLedgerPage - 1) * PAGE_SIZE + 1;
  const ledgerEnd = Math.min(safeLedgerPage * PAGE_SIZE, filteredCoupons.length);

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Coupon Analytics" showBack />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="bg-[var(--card)] border border-[var(--primary)]/30 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info" size="sm">Business Insights</Badge>
                <Badge variant="warning" size="sm">Pro</Badge>
              </div>
              <h1 className="text-2xl mb-2">Sales Insights</h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Track Partify coupon demand, redemptions, and sales value for your store.
              </p>
            </div>
            <div className="bg-blue-50 text-blue-700 w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-[var(--foreground)]" />
            <h2 className="text-lg">Date Range</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'this_month', label: 'This Month' },
              { key: 'last_month', label: 'Last Month' },
              { key: 'last_30', label: 'Last 30 Days' },
              { key: 'last_90', label: 'Last 90 Days' },
              { key: 'custom', label: 'Custom' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setDatePreset(item.key as DatePreset)}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap border transition-colors ${
                  datePreset === item.key
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="text-sm">
                <span className="block text-[var(--muted-foreground)] mb-1">From</span>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-[var(--input-background)]"
                />
              </label>
              <label className="text-sm">
                <span className="block text-[var(--muted-foreground)] mb-1">To</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-[var(--input-background)]"
                />
              </label>
            </div>
          )}

          <p className="text-xs text-[var(--muted-foreground)] mt-3">
            Showing analytics for {selectedRange.label}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Active Coupons', value: analytics.active.toLocaleString(), icon: Ticket, tone: 'bg-orange-50 text-orange-700' },
            { label: 'Redeemed', value: analytics.redeemedCount.toLocaleString(), icon: CheckCircle2, tone: 'bg-green-50 text-green-700' },
            { label: 'Tracked Value', value: formatCompactMoney(analytics.redeemedValue), icon: TrendingUp, tone: 'bg-blue-50 text-blue-700' },
            { label: 'Discounts Given', value: formatCompactMoney(analytics.discounts), icon: Tag, tone: 'bg-red-50 text-red-700' },
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
              {visibleCoupons.map((coupon) => (
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
              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Showing {ledgerStart}-{ledgerEnd} of {filteredCoupons.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLedgerPage((page) => Math.max(1, page - 1))}
                    disabled={safeLedgerPage === 1}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Page {safeLedgerPage} of {totalLedgerPages}
                  </span>
                  <button
                    onClick={() => setLedgerPage((page) => Math.min(totalLedgerPages, page + 1))}
                    disabled={safeLedgerPage === totalLedgerPages}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
