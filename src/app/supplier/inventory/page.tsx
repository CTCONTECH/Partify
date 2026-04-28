'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { Badge } from '@/components/Badge';
import { useSupplierId } from '@/hooks/useSupplierId';
import { supplierService } from '@/lib/services/supplier-service';
import { InventoryItem } from '@/types';
import { AlertCircle, ChevronRight } from 'lucide-react';

export default function SupplierInventory() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredInventory = inventory.filter(item =>
    item.partName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.partNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'out-of-stock';
    if (stock < 5) return 'low-stock';
    return 'available';
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Inventory" />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <SearchBar
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            showClear={searchQuery.length > 0}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {filteredInventory.length} items
          </p>
          <div className="flex gap-3">
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

        <div className="space-y-3">
          {!loading && filteredInventory.map((item) => (
            <button
              key={item.partId}
              onClick={() => router.push(`/supplier/edit-item/${item.partId}`)}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-left active:bg-[var(--muted)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">
                    Part #{item.partNumber}
                  </p>
                  <h3 className="text-base mb-2">{item.partName}</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] flex-shrink-0 ml-2" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={getStockStatus(item.stock)} size="sm">
                    {item.stock} in stock
                  </Badge>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    Updated {item.lastUpdated}
                  </span>
                </div>
                <p className="text-lg text-[var(--primary)]">R {item.price.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>

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
