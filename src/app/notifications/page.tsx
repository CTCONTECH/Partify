'use client';

import { TopBar } from '@/components/TopBar';
import { Badge } from '@/components/Badge';
import { Package, TrendingDown, AlertTriangle } from 'lucide-react';

export default function Notifications() {
  const notifications = [
    {
      id: 1,
      type: 'price',
      icon: TrendingDown,
      title: 'Price drop alert',
      message: 'Front Brake Pads now R 425 at Midas Auto Parts',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'stock',
      icon: Package,
      title: 'Back in stock',
      message: 'Oil Filter is now available at AutoZone',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'warning',
      icon: AlertTriangle,
      title: 'Low stock warning',
      message: 'Spark Plugs - only 2 units remaining',
      time: '1 day ago',
      read: true
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar title="Notifications" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <div
                key={notification.id}
                className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 ${
                  !notification.read ? 'border-l-4 border-l-[var(--primary)]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    notification.type === 'price' ? 'bg-[var(--best-price-bg)]' :
                    notification.type === 'stock' ? 'bg-[var(--available-bg)]' :
                    'bg-[var(--warning-bg)]'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      notification.type === 'price' ? 'text-[var(--best-price)]' :
                      notification.type === 'stock' ? 'text-[var(--available)]' :
                      'text-[var(--warning)]'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-base">{notification.title}</h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[var(--primary)] rounded-full flex-shrink-0 ml-2 mt-1"></div>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
