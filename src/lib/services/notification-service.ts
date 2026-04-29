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

const LOCAL_READ_PREFIX = 'partify:supplier-read-notifications';

function localReadKey(supplierId: string) {
  return `${LOCAL_READ_PREFIX}:${supplierId}`;
}

function getLocalReadIds(supplierId: string) {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const value = window.localStorage.getItem(localReadKey(supplierId));
    const ids = value ? JSON.parse(value) : [];
    return new Set<string>(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set<string>();
  }
}

function markLocalRead(supplierId: string, id: string) {
  if (typeof window === 'undefined') return;

  const ids = getLocalReadIds(supplierId);
  ids.add(id);
  window.localStorage.setItem(localReadKey(supplierId), JSON.stringify([...ids]));
}

async function getReadNotificationIds(supplierId: string) {
  const supabase = createClient();
  const readIds = getLocalReadIds(supplierId);

  const { data, error } = await supabase
    .from('supplier_notification_reads')
    .select('notification_id')
    .eq('supplier_id', supplierId);

  if (error) {
    console.warn('Notification read state unavailable:', error.message);
    return readIds;
  }

  (data || []).forEach((row: any) => readIds.add(row.notification_id));
  return readIds;
}

export async function markSupplierNotificationRead(supplierId: string, id: string) {
  const supabase = createClient();
  markLocalRead(supplierId, id);

  const { error } = await supabase
    .from('supplier_notification_reads')
    .upsert({
      supplier_id: supplierId,
      notification_id: id,
      read_at: new Date().toISOString(),
    });

  if (error) {
    console.warn('Could not mark notification as read:', error.message);
  }
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
  const readIds = await getReadNotificationIds(supplierId);

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
