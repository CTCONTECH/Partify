'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/Badge';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface ActivityItem {
  id: string;
  eventType: string;
  title: string;
  detail: string;
  createdAt: string;
}

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

function activityTone(eventType: string) {
  if (eventType === 'inventory_low_stock') return 'low-stock';
  if (eventType === 'inventory_import_approved') return 'available';
  return 'default';
}

export default function SupplierActivityPage() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivity = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/supplier/activity');
          return;
        }

        const { data, error: activityError } = await supabase
          .from('supplier_activity_events')
          .select('id, event_type, title, detail, created_at')
          .eq('supplier_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (activityError) throw activityError;

        setActivity((data || []).map((item) => ({
          id: item.id,
          eventType: item.event_type,
          title: item.title,
          detail: item.detail || '',
          createdAt: item.created_at,
        })));
      } catch (err: any) {
        setError(err?.message || 'Could not load activity.');
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
      <div className="xl:hidden">
        <TopBar title="Activity" showBack />
      </div>

      <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto">
        <div className="hidden xl:block mb-6">
          <button
            type="button"
            onClick={() => router.push('/supplier/dashboard')}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
          <h1 className="text-3xl">Activity</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Review recent supplier imports, stock changes, and operational events.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl xl:rounded-lg p-4 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-20 bg-[var(--muted)] rounded-2xl xl:rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!loading && activity.length > 0 && (
          <div className="space-y-3 xl:bg-[var(--card)] xl:border xl:border-[var(--border)] xl:rounded-lg xl:overflow-hidden xl:space-y-0">
            <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_210px_130px] gap-3 px-4 py-3 bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <span>Activity</span>
              <span>Event</span>
              <span>Time</span>
            </div>
            {activity.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--card)] border border-[var(--border)] xl:border-0 xl:border-b xl:last:border-b-0 rounded-2xl xl:rounded-none p-4"
              >
                <div className="flex xl:grid xl:grid-cols-[minmax(0,1fr)_210px_130px] items-start xl:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base">{item.title}</h3>
                    </div>
                    {item.detail && (
                      <p className="text-sm text-[var(--muted-foreground)]">{item.detail}</p>
                    )}
                  </div>
                  <Badge variant={activityTone(item.eventType) as any} size="sm">
                    {item.eventType.replaceAll('_', ' ')}
                  </Badge>
                  <p className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                    {formatActivityTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activity.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">No activity yet</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Supplier activity will appear here as imports, stock changes, and profile updates happen.
            </p>
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
