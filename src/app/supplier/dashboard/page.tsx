"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/Badge';
import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { isLiveMode } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';

interface SupplierInfo {
  businessName: string;
  suburb: string;
  active: boolean;
}

interface DashboardStats {
  totalParts: number;
  activeListings: number;
  lowStock: number;
}

const MOCK_INFO: SupplierInfo = { businessName: 'ProAuto Supply', suburb: 'Brackenfell', active: true };
const MOCK_STATS: DashboardStats = { totalParts: 1245, activeListings: 892, lowStock: 23 };
const EMPTY_INFO: SupplierInfo = { businessName: '', suburb: '', active: false };
const EMPTY_STATS: DashboardStats = { totalParts: 0, activeListings: 0, lowStock: 0 };

export default function SupplierDashboard() {
  const router = useRouter();
  const [info, setInfo] = useState<SupplierInfo>(isLiveMode() ? EMPTY_INFO : MOCK_INFO);
  const [stats, setStats] = useState<DashboardStats>(isLiveMode() ? EMPTY_STATS : MOCK_STATS);
  const [loading, setLoading] = useState(isLiveMode());

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
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const statCards = [
    { label: 'Total Parts', value: stats.totalParts.toLocaleString(), icon: Package, color: 'bg-blue-500' },
    { label: 'Revenue (This Month)', value: 'R -', icon: DollarSign, color: 'bg-green-500' },
    { label: 'Active Listings', value: stats.activeListings.toLocaleString(), icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Low Stock Items', value: stats.lowStock.toLocaleString(), icon: AlertTriangle, color: 'bg-orange-500' },
  ];

  const recentActivity = [
    { type: 'sale', item: 'Front Brake Pads', price: 450, time: '2 hours ago' },
    { type: 'inquiry', item: 'Oil Filter', count: 3, time: '4 hours ago' },
    { type: 'lowstock', item: 'Spark Plugs', stock: 2, time: '5 hours ago' }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar showLogo showNotifications />

      <div className="p-6 max-w-2xl mx-auto">
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
                <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
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

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg">Recent Activity</h3>
          <button className="text-sm text-[var(--primary)] underline">
            View All
          </button>
        </div>

        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-base mb-1">{activity.item}</h4>
                  {activity.type === 'sale' && (
                    <p className="text-sm text-[var(--success)]">
                      Sale: R {activity.price}
                    </p>
                  )}
                  {activity.type === 'inquiry' && (
                    <p className="text-sm text-[var(--info)]">
                      {activity.count} customer inquiries
                    </p>
                  )}
                  {activity.type === 'lowstock' && (
                    <Badge variant="low-stock" size="sm">
                      Only {activity.stock} left
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
