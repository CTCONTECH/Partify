import { Part } from '@/types';
import { createClient } from '@/lib/supabase/client';

export interface DiscoveryPart extends Part {
  supplierCount: number;
  priceRange: { min: number; max: number };
  query?: string;
  searchedAt?: string;
  popularityScore?: number;
}

function toCompatibilityString(value: any) {
  if (Array.isArray(value)) return value.join(', ');
  return value ? String(value) : '';
}

function toDiscoveryPart(row: any): DiscoveryPart {
  const part = row.parts || row;

  return {
    id: part.id,
    partNumber: part.part_number,
    partName: part.part_name,
    category: part.category,
    description: part.description || '',
    compatibility: toCompatibilityString(part.compatibility),
    supplierCount: Number(row.supplier_count || 0),
    priceRange: {
      min: Number(row.min_price || 0),
      max: Number(row.max_price || 0),
    },
    query: row.query || undefined,
    searchedAt: row.created_at || undefined,
    popularityScore: Number(row.popularity_score || 0),
  };
}

function applyStats(parts: DiscoveryPart[], rows: any[]) {
  const stats = new Map<string, { suppliers: Set<string>; prices: number[] }>();

  rows.forEach((row) => {
    if (!stats.has(row.part_id)) {
      stats.set(row.part_id, { suppliers: new Set(), prices: [] });
    }

    const partStats = stats.get(row.part_id)!;
    partStats.suppliers.add(row.supplier_id);
    partStats.prices.push(Number(row.price || 0));
  });

  return parts.map((part) => {
    const partStats = stats.get(part.id);
    if (!partStats) return part;

    return {
      ...part,
      supplierCount: partStats.suppliers.size,
      priceRange: {
        min: Math.min(...partStats.prices),
        max: Math.max(...partStats.prices),
      },
    };
  });
}

async function getCurrentUserId() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export async function recordClientPartActivity(part: Part, query: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const supabase = createClient();
  const { error } = await supabase
    .from('client_part_activity')
    .insert({
      user_id: userId,
      part_id: part.id,
      query: query.trim() || part.partName,
      activity_type: query.trim() ? 'search_result_opened' : 'part_viewed',
    });

  if (error) {
    console.warn('Could not record recent search:', error.message);
  }
}

export async function getRecentClientSearches(limit = 20): Promise<DiscoveryPart[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from('client_part_activity')
    .select(`
      id,
      query,
      created_at,
      parts (
        id,
        part_number,
        part_name,
        category,
        description,
        compatibility
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (error) {
    console.warn('Could not load recent searches:', error.message);
    return [];
  }

  const seen = new Set<string>();
  const recent: DiscoveryPart[] = [];

  (data || []).forEach((row: any) => {
    const part = Array.isArray(row.parts) ? row.parts[0] : row.parts;
    if (!part?.id || seen.has(part.id)) return;
    seen.add(part.id);
    recent.push(toDiscoveryPart({ ...row, parts: part }));
  });

  const sliced = recent.slice(0, limit);
  const { data: inventory } = await supabase
    .from('supplier_inventory')
    .select('part_id, supplier_id, price')
    .in('part_id', sliced.map((part) => part.id))
    .gt('stock', 0);

  return applyStats(sliced, inventory || []);
}

export async function getPopularClientParts(limit = 20): Promise<DiscoveryPart[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_popular_parts', { part_limit: limit });

  if (error) {
    console.warn('Could not load popular parts:', error.message);
    return [];
  }

  return (data || []).map((row: any) => toDiscoveryPart(row));
}
