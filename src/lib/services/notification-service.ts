import { createClient } from '@/lib/supabase/client';
import { getImportDisplayState, importDisplayLabel } from '@/lib/import-status';
import { VehicleOption } from '@/lib/vehicle-catalog';

export type SupplierNotificationType = 'low-stock' | 'out-of-stock' | 'import-review' | 'import-error';
export type ClientNotificationType = 'vehicle-setup' | 'coupon-expiring' | 'compatible-part';

export interface SupplierNotification {
  id: string;
  type: SupplierNotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: string;
  read: boolean;
}

export interface ClientNotification {
  id: string;
  type: ClientNotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: string;
  read: boolean;
}

const LOCAL_SUPPLIER_READ_PREFIX = 'partify:supplier-read-notifications';
const LOCAL_CLIENT_READ_PREFIX = 'partify:client-read-notifications';

function localReadKey(prefix: string, userId: string) {
  return `${prefix}:${userId}`;
}

function getLocalReadIds(prefix: string, userId: string) {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const value = window.localStorage.getItem(localReadKey(prefix, userId));
    const ids = value ? JSON.parse(value) : [];
    return new Set<string>(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set<string>();
  }
}

function markLocalRead(prefix: string, userId: string, id: string) {
  if (typeof window === 'undefined') return;

  const ids = getLocalReadIds(prefix, userId);
  ids.add(id);
  window.localStorage.setItem(localReadKey(prefix, userId), JSON.stringify([...ids]));
}

async function getReadNotificationIds(supplierId: string) {
  const supabase = createClient();
  const readIds = getLocalReadIds(LOCAL_SUPPLIER_READ_PREFIX, supplierId);

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
  markLocalRead(LOCAL_SUPPLIER_READ_PREFIX, supplierId, id);

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

async function getClientReadNotificationIds(userId: string) {
  const supabase = createClient();
  const readIds = getLocalReadIds(LOCAL_CLIENT_READ_PREFIX, userId);

  const { data, error } = await supabase
    .from('client_notification_reads')
    .select('notification_id')
    .eq('user_id', userId);

  if (error) {
    console.warn('Client notification read state unavailable:', error.message);
    return readIds;
  }

  (data || []).forEach((row: any) => readIds.add(row.notification_id));
  return readIds;
}

export async function markClientNotificationRead(userId: string, id: string) {
  const supabase = createClient();
  markLocalRead(LOCAL_CLIENT_READ_PREFIX, userId, id);

  const { error } = await supabase
    .from('client_notification_reads')
    .upsert({
      user_id: userId,
      notification_id: id,
      read_at: new Date().toISOString(),
    });

  if (error) {
    console.warn('Could not mark client notification as read:', error.message);
  }
}

export function getUnreadClientNotificationCount(notifications: ClientNotification[]) {
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

function formatTimeUntil(value?: string | null) {
  if (!value) return '';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '';

  const diffMinutes = Math.max(0, Math.ceil((timestamp - Date.now()) / 60000));
  if (diffMinutes < 1) return 'Expires now';
  if (diffMinutes < 60) return `Expires in ${diffMinutes} min`;

  const diffHours = Math.ceil(diffMinutes / 60);
  return `Expires in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
}

function joinedPartName(parts: any) {
  if (Array.isArray(parts)) return parts[0]?.part_name;
  return parts?.part_name;
}

function joinedPart(parts: any) {
  if (Array.isArray(parts)) return parts[0];
  return parts;
}

function joinedSupplier(suppliers: any) {
  if (Array.isArray(suppliers)) return suppliers[0];
  return suppliers;
}

function primaryVehicleFromRow(row: any): (VehicleOption & { id?: string }) | null {
  if (!row) return null;

  return {
    id: row.id,
    make: row.make,
    model: row.model,
    year: Number(row.year),
    engine: row.engine,
  };
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
      .select('id, status, row_count, matched_count, unmatched_count, error_count, updated_at, created_at')
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
    const displayState = getImportDisplayState({
      status: job.status,
      matchedCount: job.matched_count || 0,
      unmatchedCount: job.unmatched_count || 0,
      errorCount: job.error_count || 0,
    });
    const isError = displayState === 'needs_review';
    const isCatalogueReview = displayState === 'catalogue_review';

    return {
      id: `import-${job.id}`,
      type: isError ? 'import-error' : 'import-review',
      title: importDisplayLabel(displayState),
      message: isError
        ? `${job.error_count || 0} row${job.error_count === 1 ? '' : 's'} need attention`
        : isCatalogueReview
          ? `${job.unmatched_count || 0} row${job.unmatched_count === 1 ? '' : 's'} need catalogue review`
          : `${job.row_count || 0} row${job.row_count === 1 ? '' : 's'} ready for review`,
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

export async function getClientNotifications(userId: string): Promise<ClientNotification[]> {
  const supabase = createClient();
  const readIds = await getClientReadNotificationIds(userId);
  const notifications: ClientNotification[] = [];

  const { data: primaryVehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, make, model, year, engine, created_at')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle();

  if (vehicleError) throw vehicleError;

  const vehicle = primaryVehicleFromRow(primaryVehicle);

  if (!vehicle) {
    notifications.push({
      id: 'client-vehicle-setup',
      type: 'vehicle-setup',
      title: 'Set up your vehicle',
      message: 'Add your vehicle to get more accurate part results.',
      time: 'Now',
      timestamp: new Date().toISOString(),
      read: readIds.has('client-vehicle-setup'),
    });
  }

  const { data: coupons, error: couponError } = await supabase
    .from('coupon_issues')
    .select(`
      id,
      status,
      expires_at,
      created_at,
      parts (
        part_name
      ),
      suppliers (
        business_name
      )
    `)
    .eq('user_id', userId)
    .in('status', ['issued', 'opened', 'navigation_started'])
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(5);

  if (couponError) {
    console.warn('Client coupon notifications unavailable:', couponError.message);
  }

  (couponError ? [] : (coupons || [])).forEach((coupon: any) => {
    const expiresAt = new Date(coupon.expires_at).getTime();
    const hoursLeft = (expiresAt - Date.now()) / 3600000;
    if (hoursLeft > 6) return;

    const partName = joinedPart(coupon.parts)?.part_name || 'Your coupon';
    const supplierName = joinedSupplier(coupon.suppliers)?.business_name || 'supplier';
    const id = `coupon-expiring-${coupon.id}`;

    notifications.push({
      id,
      type: 'coupon-expiring',
      title: 'Coupon expiring soon',
      message: `${partName} at ${supplierName} expires soon.`,
      time: formatTimeUntil(coupon.expires_at),
      timestamp: coupon.expires_at,
      read: readIds.has(id),
    });
  });

  if (vehicle) {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const { data: compatibleParts, error: compatibleError } = await supabase.rpc('get_compatible_parts', {
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      vehicle_year: vehicle.year,
      vehicle_engine: vehicle.engine,
      search_query: '',
      result_limit: 25,
    });

    if (compatibleError) {
      console.warn('Client compatible part notifications unavailable:', compatibleError.message);
    }

    (compatibleError ? [] : (compatibleParts || [])).forEach((part: any) => {
      const timestamp = part.latest_inventory_at;
      if (!timestamp || new Date(timestamp).getTime() < since.getTime()) return;

      const id = `compatible-part-${part.id}-${new Date(timestamp).toISOString().slice(0, 10)}`;

      notifications.push({
        id,
        type: 'compatible-part',
        title: 'New compatible part available',
        message: `${part.part_name || 'A part'} is available from live supplier stock.`,
        time: formatNotificationTime(timestamp),
        timestamp,
        read: readIds.has(id),
      });
    });
  }

  return notifications
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);
}

export async function getClientNotificationCount(userId: string): Promise<number> {
  const notifications = await getClientNotifications(userId);
  return getUnreadClientNotificationCount(notifications);
}
