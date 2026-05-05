'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { useSupplierId } from '@/hooks/useSupplierId';
import { supplierService } from '@/lib/services/supplier-service';
import { InventoryItem } from '@/types';
import { AlertCircle, ChevronRight, SlidersHorizontal } from 'lucide-react';

type StatusFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
type SortOption = 'updated' | 'part-number' | 'stock' | 'price';

const PAGE_SIZE = 25;

export default function SupplierInventory() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { supplierId, loading: supplierLoading } = useSupplierId();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierLoading) return;

    if (!supplierId) {
      setInventory([]);
      setLoading(false);
      return;
    }

    const loadInventory = async () => {
      setLoading(true);
      setError(null);

      try {
        const items = await supplierService.getSupplierInventory(supplierId);
        setInventory(items);
      } catch (err: any) {
        setError(err?.message || 'Could not load inventory.');
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, [supplierId, supplierLoading]);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'out-of-stock';
    if (stock < 5) return 'low-stock';
    return 'available';
  };

  const getFilterStatus = (stock: number): StatusFilter => {
    if (stock === 0) return 'out-of-stock';
    if (stock < 5) return 'low-stock';
    return 'in-stock';
  };

  const filteredInventory = inventory
    .filter(item => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.partName?.toLowerCase().includes(query) ||
        item.partNumber?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === 'all' || getFilterStatus(item.stock) === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'part-number') {
        return (a.partNumber || '').localeCompare(b.partNumber || '');
      }

      if (sortBy === 'stock') {
        return a.stock - b.stock;
      }

      if (sortBy === 'price') {
        return a.price - b.price;
      }

      return (b.lastUpdated || '').localeCompare(a.lastUpdated || '');
    });

  const visibleInventory = filteredInventory.slice(0, visibleCount);
  const hasMore = filteredInventory.length > visibleCount;

  const filterOptions: Array<{ label: string; value: StatusFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'In stock', value: 'in-stock' },
    { label: 'Low', value: 'low-stock' },
    { label: 'Out', value: 'out-of-stock' },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
      <div className="xl:hidden">
        <TopBar title="Inventory" />
      </div>

      <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto">
        <div className="hidden xl:flex items-start justify-between gap-6 mb-6">
          <div>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">Supplier Inventory</p>
            <h1 className="text-3xl">Inventory Management</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Search, review, and update live stock and pricing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/supplier/requests')}
              className="h-11 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm hover:bg-[var(--muted)]"
            >
              Requests
            </button>
            <button
              onClick={() => router.push('/supplier/import')}
              className="h-11 px-4 rounded-lg bg-[var(--primary)] text-white text-sm hover:opacity-95"
            >
              Import CSV
            </button>
            <button
              onClick={() => router.push('/supplier/add-part')}
              className="h-11 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm hover:bg-[var(--muted)]"
            >
              Add Part
            </button>
          </div>
        </div>

        <div className="xl:bg-[var(--card)] xl:border xl:border-[var(--border)] xl:rounded-lg xl:p-5 xl:mb-5">
          <div className="sticky top-0 z-10 bg-[var(--background)] xl:bg-transparent pt-2 xl:pt-0 pb-4 xl:pb-0 -mx-6 xl:mx-0 px-6 xl:px-0 mb-2 xl:mb-0">
            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_220px] xl:gap-4 xl:items-end">
              <SearchBar
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                onClear={() => {
                  setSearchQuery('');
                  setVisibleCount(PAGE_SIZE);
                }}
                showClear={searchQuery.length > 0}
              />

              <div className="hidden xl:block">
                <label className="block text-sm text-[var(--muted-foreground)] mb-1" htmlFor="inventory-sort-desktop">
                  Sort
                </label>
                <select
                  id="inventory-sort-desktop"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="h-11 w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 text-sm text-[var(--foreground)]"
                >
                  <option value="updated">Recently updated</option>
                  <option value="part-number">Part number</option>
                  <option value="stock">Stock low-high</option>
                  <option value="price">Price low-high</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(option.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`h-9 px-4 rounded-full border text-sm whitespace-nowrap transition-colors ${
                    statusFilter === option.value
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {filteredInventory.length} item{filteredInventory.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-2 xl:hidden">
            <button
              onClick={() => router.push('/supplier/requests')}
              className="text-sm text-[var(--primary)] underline"
            >
              Requests
            </button>
            <button
              onClick={() => router.push('/supplier/import')}
              className="text-sm text-[var(--primary)] underline"
            >
              Import CSV
            </button>
            <button
              onClick={() => router.push('/supplier/add-part')}
              className="text-sm text-[var(--primary)] underline"
            >
              Add Part
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 xl:hidden">
          <SlidersHorizontal className="w-4 h-4 text-[var(--muted-foreground)]" />
          <label className="text-sm text-[var(--muted-foreground)]" htmlFor="inventory-sort">
            Sort
          </label>
          <select
            id="inventory-sort"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
              setVisibleCount(PAGE_SIZE);
            }}
            className="h-9 flex-1 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 text-sm text-[var(--foreground)]"
          >
            <option value="updated">Recently updated</option>
            <option value="part-number">Part number</option>
            <option value="stock">Stock low-high</option>
            <option value="price">Price low-high</option>
          </select>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-28 bg-[var(--muted)] rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        <div className="hidden xl:grid grid-cols-[minmax(0,1.5fr)_160px_130px_140px_120px_32px] gap-3 px-4 py-3 text-xs uppercase tracking-wide text-[var(--muted-foreground)] border border-[var(--border)] border-b-0 rounded-t-lg bg-[var(--muted)]">
          <span>Part</span>
          <span>Category</span>
          <span className="text-right">Price</span>
          <span>Stock</span>
          <span>Updated</span>
          <span />
        </div>

        <div className="space-y-2 xl:space-y-0 xl:border xl:border-[var(--border)] xl:rounded-b-lg xl:overflow-hidden xl:bg-[var(--card)]">
          {!loading && visibleInventory.map((item) => (
            <button
              key={item.partId}
              onClick={() => router.push(`/supplier/edit-item/${item.partId}`)}
              className="w-full bg-[var(--card)] border border-[var(--border)] xl:border-0 xl:border-b xl:last:border-b-0 rounded-xl xl:rounded-none p-4 text-left active:bg-[var(--muted)] xl:hover:bg-[var(--muted)] transition-colors"
            >
              <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_110px_110px_28px] xl:grid-cols-[minmax(0,1.5fr)_160px_130px_140px_120px_32px] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">
                    Part #{item.partNumber}
                  </p>
                  <h3 className="text-base font-medium truncate">{item.partName}</h3>
                  {item.category && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 md:hidden">
                      {item.category}
                    </p>
                  )}
                </div>

                <p className="text-xs text-[var(--muted-foreground)] hidden xl:block">
                  {item.category || 'Uncategorised'}
                </p>

                <p className="text-base text-[var(--primary)] text-right md:order-3 xl:order-none">
                  R {item.price.toFixed(2)}
                </p>

                <div className="flex items-center gap-2 md:order-2 xl:order-none">
                  <Badge variant={getStockStatus(item.stock)} size="sm">
                    {item.stock} in stock
                  </Badge>
                </div>

                <span className="text-xs text-[var(--muted-foreground)] md:order-4 xl:order-none">
                  Updated {item.lastUpdated}
                </span>

                <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] hidden md:block md:order-5 xl:order-none" />
              </div>
            </button>
          ))}
        </div>

        {!loading && hasMore && (
          <div className="pt-4">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setVisibleCount(count => count + PAGE_SIZE)}
            >
              Load more
            </Button>
          </div>
        )}

        {!loading && filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">No items found</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {searchQuery ? 'Try a different search term' : 'Add your first part to get started'}
            </p>
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
