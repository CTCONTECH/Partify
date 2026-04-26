'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { Badge } from '@/components/Badge';
import { mockParts, mockInventory } from '@/data/mockData';
import { useSupplierId } from '@/hooks/useSupplierId';
import { ChevronRight } from 'lucide-react';

export default function SupplierInventory() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { supplierId } = useSupplierId();

  const myInventory = mockInventory
    .filter(inv => inv.supplierId === supplierId)
    .map(inv => {
      const part = mockParts.find(p => p.id === inv.partId);
      return { ...inv, ...part };
    });

  const filteredInventory = myInventory.filter(item =>
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

        <div className="space-y-3">
          {filteredInventory.map((item) => (
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

        {filteredInventory.length === 0 && (
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
