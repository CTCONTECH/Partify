'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { createClient } from '@/lib/supabase/client';
import {
  getSupplierNotifications,
  markSupplierNotificationRead,
  SupplierNotification
} from '@/lib/services/notification-service';
import { AlertTriangle, ClipboardList, Package, XCircle } from 'lucide-react';

function notificationIcon(type: SupplierNotification['type']) {
  if (type === 'out-of-stock') return XCircle;
  if (type === 'import-review') return ClipboardList;
  if (type === 'import-error') return AlertTriangle;
  return Package;
}

function notificationTone(type: SupplierNotification['type']) {
  if (type === 'out-of-stock' || type === 'import-error') {
    return 'bg-[var(--out-of-stock-bg)] text-[var(--out-of-stock)]';
  }

  if (type === 'import-review') {
    return 'bg-[var(--best-price-bg)] text-[var(--info)]';
  }

  return 'bg-[var(--warning-bg)] text-[var(--warning)]';
}

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<SupplierNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/notifications');
          return;
        }

        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (supplier) {
          setNotifications(await getSupplierNotifications(user.id));
          return;
        }

        setNotifications([]);
      } catch (err: any) {
        setError(err?.message || 'Could not load notifications.');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [router]);

  async function handleNotificationClick(id: string) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const supplierId = userData.user?.id;
    if (!supplierId) return;

    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, read: true } : notification
    )));

    try {
      await markSupplierNotificationRead(supplierId, id);
    } catch (err: any) {
      setError(err?.message || 'Could not update notification.');
      setNotifications((current) => current.map((notification) => (
        notification.id === id ? { ...notification, read: false } : notification
      )));
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar title="Notifications" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-24 bg-[var(--muted)] rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = notificationIcon(notification.type);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className="w-full text-left bg-[var(--card)] border border-[var(--border)] border-l-4 border-l-[var(--primary)] rounded-2xl p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${notificationTone(notification.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-base">{notification.title}</h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-[var(--primary)] rounded-full flex-shrink-0 mt-1.5" />
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
                </button>
              );
            })}
          </div>
        )}

        {!loading && notifications.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">No notifications</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Supplier alerts will appear here when stock, imports, or requests need attention.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
