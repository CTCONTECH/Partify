"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/Badge';
import { AlertTriangle, Archive, BarChart3, ClipboardCheck, PackageCheck, ReceiptText } from 'lucide-react';
import { isLiveMode } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { getSupplierNotificationCount } from '@/lib/services/notification-service';

interface SupplierInfo {
  businessName: string;
  suburb: string;
  active: boolean;
}

interface DashboardStats {
  totalParts: number;
  activeListings: number;
  lowStock: number;
  monthlyImports: number;
}

interface RecentActivity {
  id: string;
  type: 'import' | 'update' | 'lowstock';
  title: string;
  detail: string;
  time: string;
}

const MOCK_INFO: SupplierInfo = { businessName: 'ProAuto Supply', suburb: 'Brackenfell', active: true };
const MOCK_STATS: DashboardStats = { totalParts: 1245, activeListings: 892, lowStock: 23, monthlyImports: 3 };
const MOCK_ACTIVITY: RecentActivity[] = [
  { id: 'mock-import', type: 'import', title: 'Part import approved', detail: '5 items processed', time: '2 hours ago' },
  { id: 'mock-stock', type: 'update', title: 'Front Brake Pads', detail: 'Stock updated to 7', time: '4 hours ago' },
  { id: 'mock-lowstock', type: 'lowstock', title: 'Spark Plugs', detail: 'Low stock: 2 left', time: '5 hours ago' },
];
const EMPTY_INFO: SupplierInfo = { businessName: '', suburb: '', active: false };
const EMPTY_STATS: DashboardStats = { totalParts: 0, activeListings: 0, lowStock: 0, monthlyImports: 0 };

function formatActivityTime(value?: string | null) {
  if (!value) return '';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function mapActivityType(type: string): RecentActivity['type'] {
  if (type === 'inventory_import_approved') return 'import';
  if (type === 'inventory_low_stock') return 'lowstock';
  return 'update';
}

export default function SupplierDashboard() {
  const router = useRouter();
  const [info, setInfo] = useState<SupplierInfo>(isLiveMode() ? EMPTY_INFO : MOCK_INFO);
  const [stats, setStats] = useState<DashboardStats>(isLiveMode() ? EMPTY_STATS : MOCK_STATS);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>(isLiveMode() ? [] : MOCK_ACTIVITY);
  const [notificationCount, setNotificationCount] = useState(0);
  const [redeemedNotice, setRedeemedNotice] = useState(false);
  const [loading, setLoading] = useState(isLiveMode());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('redeemed') === '1') {
      setRedeemedNotice(true);
      window.history.replaceState(null, '', '/supplier/dashboard');
    }
  }, []);

  useEffect(() => {
    if (!isLiveMode()) return;

    const load = async () => {
      setLoading(true);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/supplier/dashboard');
          return;
        }

        const { data: supplier } = await supabase
          .from('suppliers')
          .select('business_name, suburb, active')
          .eq('id', user.id)
          .maybeSingle();

        if (!supplier) {
          router.replace('/supplier/onboarding');
          return;
        }

        setInfo({
          businessName: supplier.business_name,
          suburb: supplier.suburb,
          active: supplier.active,
        });

        const { data: inventory } = await supabase
          .from('supplier_inventory')
          .select('id, stock')
          .eq('supplier_id', user.id);

        if (inventory) {
          setStats({
            totalParts: inventory.length,
            activeListings: inventory.filter((i) => i.stock > 0).length,
            lowStock: inventory.filter((i) => i.stock > 0 && i.stock <= 5).length,
            monthlyImports: 0,
          });
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: monthlyImportCount } = await supabase
          .from('import_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', user.id)
          .eq('status', 'approved')
          .eq('source_type', 'csv')
          .gte('updated_at', startOfMonth.toISOString());

        setStats((current) => ({
          ...current,
          monthlyImports: monthlyImportCount || 0,
        }));

        const { data: activityRows } = await supabase
          .from('supplier_activity_events')
          .select('id, event_type, title, detail, created_at')
          .eq('supplier_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentActivity((activityRows || []).map((activity) => ({
          id: activity.id,
          type: mapActivityType(activity.event_type),
          title: activity.title,
          detail: activity.detail || '',
          time: formatActivityTime(activity.created_at),
        })));

        setNotificationCount(await getSupplierNotificationCount(user.id));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const statCards = [
    { label: 'Total Parts', value: stats.totalParts.toLocaleString(), icon: Archive, color: 'text-slate-700 bg-slate-100' },
    { label: 'Monthly Catalogue Imports', value: (stats.monthlyImports ?? 0).toLocaleString(), icon: ClipboardCheck, color: 'text-blue-700 bg-blue-50' },
    { label: 'Active Listings', value: stats.activeListings.toLocaleString(), icon: PackageCheck, color: 'text-green-700 bg-green-50' },
    { label: 'Low Stock Items', value: stats.lowStock.toLocaleString(), icon: AlertTriangle, color: 'text-orange-700 bg-orange-50' },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar showLogo showNotifications notificationCount={notificationCount} />

      <div className="p-6 max-w-2xl mx-auto">
        {redeemedNotice && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-6">
            <p className="text-sm">Coupon redeemed successfully.</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-[var(--primary)] to-[#D84315] rounded-3xl p-6 mb-6 text-white min-h-36">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-7 w-36 bg-white/30 rounded" />
              <div className="h-5 w-44 bg-white/25 rounded" />
              <div className="h-7 w-28 bg-white/30 rounded-full mt-4" />
            </div>
          ) : (
            <>
              <h2 className="text-2xl mb-2">{info.businessName}</h2>
              <p className="text-white/90 mb-4">{info.suburb}, Cape Town</p>
              <div className="flex items-center gap-2">
                <Badge variant="default" size="sm">{info.active ? 'Active Supplier' : 'Inactive'}</Badge>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
              >
                <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                {loading ? (
                  <>
                    <div className="h-7 w-12 bg-[var(--muted)] rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-[var(--muted)] rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl mb-1">{stat.value}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{stat.label}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push('/supplier/redeem')}
          className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6 flex items-center gap-3 active:bg-[var(--muted)] transition-colors"
        >
          <div className="bg-[var(--muted)] p-2 rounded-lg">
            <ReceiptText className="w-5 h-5 text-[var(--foreground)]" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-base mb-1">Redeem Coupon</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Verify a client code and record the sale</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/supplier/coupons')}
          className="w-full bg-[var(--card)] border border-[var(--primary)]/30 rounded-2xl p-4 mb-6 flex items-center gap-3 active:bg-[var(--muted)] transition-colors shadow-sm"
        >
          <div className="bg-blue-50 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base">Sales Insights</h3>
              <Badge variant="warning" size="sm">Pro</Badge>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">Track coupon demand, redemptions, and value</p>
          </div>
        </button>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg">Recent Activity</h3>
          <button
            onClick={() => router.push('/supplier/activity')}
            className="text-sm text-[var(--primary)] underline"
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          {loading && (
            <>
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="h-20 bg-[var(--muted)] rounded-2xl animate-pulse"
                />
              ))}
            </>
          )}

          {!loading && recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-base mb-1">{activity.title}</h4>
                  {activity.type === 'update' && (
                    <p className="text-sm text-[var(--success)]">{activity.detail}</p>
                  )}
                  {activity.type === 'import' && (
                    <p className="text-sm text-[var(--info)]">{activity.detail}</p>
                  )}
                  {activity.type === 'lowstock' && (
                    <Badge variant="low-stock" size="sm">{activity.detail}</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">{activity.time}</p>
              </div>
            </div>
          ))}

          {!loading && recentActivity.length === 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                No recent supplier activity yet.
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
