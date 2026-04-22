'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { SupplierCard } from '@/components/SupplierCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { getSupplierResults, mockParts } from '@/data/mockData';
import { SlidersHorizontal } from 'lucide-react';

export default function SupplierResults() {
  const params = useParams();
  const router = useRouter();
  const partId = params.partId as string;
  const [sortBy, setSortBy] = useState<'total' | 'price' | 'distance'>('total');

  const part = mockParts.find(p => p.id === partId);
  const suppliers = getSupplierResults(partId);

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (sortBy === 'total') return a.totalCost - b.totalCost;
    if (sortBy === 'price') return a.itemPrice - b.itemPrice;
    return a.distance - b.distance;
  });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar title="Compare Suppliers" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        {part && (
          <div className="mb-6">
            <p className="text-sm text-[var(--muted-foreground)] mb-1">Part #{part.partNumber}</p>
            <h2 className="text-xl mb-2">{part.partName}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{part.compatibility}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[var(--muted-foreground)]" />
            <span className="text-sm">Sort by:</span>
          </div>
          <SegmentedControl
            options={[
              { value: 'total', label: 'Best Total' },
              { value: 'price', label: 'Price' },
              { value: 'distance', label: 'Distance' }
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value as any)}
          />
        </div>

        <div className="space-y-4">
          {sortedSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
            />
          ))}
        </div>

        {suppliers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">No suppliers found</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              This part is currently out of stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
