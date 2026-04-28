import { createClient } from '@/lib/supabase/client';

export type SupplierNotificationType = 'low-stock' | 'out-of-stock' | 'import-review' | 'import-error';

export interface SupplierNotification {
  id: string;
  type: SupplierNotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: string;
  read: boolean;
}

const READ_NOTIFICATION_KEY = 'partify:supplier-read-notifications';

function getReadNotificationIds() {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const value = window.localStorage.getItem(READ_NOTIFICATION_KEY);
    const ids = value ? JSON.parse(value) : [];
    return new Set<string>(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set<string>();
  }
}

export function markSupplierNotificationRead(id: string) {
  if (typeof window === 'undefined') return;

  const ids = getReadNotificationIds();
  ids.add(id);
  window.localStorage.setItem(READ_NOTIFICATION_KEY, JSON.stringify([...ids]));
}

export function getUnreadSupplierNotificationCount(notifications: SupplierNotification[]) {
  return notifications.filter((notification) => !notification.read).length;
}

function formatNotificationTime(value?: string | null) {
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

function joinedPartName(parts: any) {
  if (Array.isArray(parts)) return parts[0]?.part_name;
  return parts?.part_name;
}

export async function getSupplierNotifications(supplierId: string): Promise<SupplierNotification[]> {
  const supabase = createClient();
  const readIds = getReadNotificationIds();

  const [{ data: inventory, error: inventoryError }, { data: imports, error: importsError }] = await Promise.all([
    supabase
      .from('supplier_inventory')
      .select(`
        id,
        stock,
        updated_at,
        parts (
          part_name,
          part_number
        )
      `)
      .eq('supplier_id', supplierId)
      .lte('stock', 5),
    supabase
      .from('import_jobs')
      .select('id, status, row_count, unmatched_count, error_count, updated_at, created_at')
      .eq('supplier_id', supplierId)
      .in('status', ['review', 'error'])
      .order('updated_at', { ascending: false }),
  ]);

  if (inventoryError) throw inventoryError;
  if (importsError) throw importsError;

  const stockNotifications: SupplierNotification[] = (inventory || []).map((item) => {
    const partName = joinedPartName(item.parts) || 'Inventory item';
    const isOut = item.stock === 0;

    return {
      id: `stock-${item.id}`,
      type: isOut ? 'out-of-stock' : 'low-stock',
      title: isOut ? 'Out of stock' : 'Low stock',
      message: `${partName}: ${item.stock} left`,
      time: formatNotificationTime(item.updated_at),
      timestamp: item.updated_at,
      read: readIds.has(`stock-${item.id}`),
    };
  });

  const importNotifications: SupplierNotification[] = (imports || []).map((job) => {
    const isError = job.status === 'error';

    return {
      id: `import-${job.id}`,
      type: isError ? 'import-error' : 'import-review',
      title: isError ? 'Import failed' : 'Import needs review',
      message: isError
        ? `${job.error_count || 0} row${job.error_count === 1 ? '' : 's'} need attention`
        : `${job.unmatched_count || 0} unmatched row${job.unmatched_count === 1 ? '' : 's'} to review`,
      time: formatNotificationTime(job.updated_at || job.created_at),
      timestamp: job.updated_at || job.created_at,
      read: readIds.has(`import-${job.id}`),
    };
  });

  return [...importNotifications, ...stockNotifications].sort((a, b) => (
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ));
}

export async function getSupplierNotificationCount(supplierId: string): Promise<number> {
  const notifications = await getSupplierNotifications(supplierId);
  return getUnreadSupplierNotificationCount(notifications);
}
