"use client";

import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/Badge';
import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

export default function SupplierDashboard() {
  const stats = [
    { label: 'Total Parts', value: '1,245', icon: Package, color: 'bg-blue-500' },
    { label: 'Revenue (This Month)', value: 'R 45,230', icon: DollarSign, color: 'bg-green-500' },
    { label: 'Active Listings', value: '892', icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Low Stock Items', value: '23', icon: AlertTriangle, color: 'bg-orange-500' }
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
        <div className="bg-gradient-to-br from-[var(--primary)] to-[#D84315] rounded-3xl p-6 mb-6 text-white">
          <h2 className="text-2xl mb-2">ProAuto Supply</h2>
          <p className="text-white/90 mb-4">Brackenfell, Cape Town</p>
          <div className="flex items-center gap-2">
            <Badge variant="default" size="sm">Active Supplier</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
              >
                <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl mb-1">{stat.value}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{stat.label}</p>
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
