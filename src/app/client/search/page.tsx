'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { PartCard } from '@/components/PartCard';
import { mockParts, mockInventory } from '@/data/mockData';
import { partsService } from '@/lib/services/parts-service';
import { isLiveMode } from '@/lib/config';
import { Part } from '@/types';

export default function PartSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredParts, setFilteredParts] = useState<Part[]>(mockParts);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLiveMode()) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const parts = await partsService.searchParts('');
        setFilteredParts(parts);
      } catch {
        setFilteredParts(mockParts);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (isLiveMode()) {
      setIsLoading(true);
      try {
        const parts = await partsService.searchParts(query);
        setFilteredParts(parts);
      } catch {
        setFilteredParts([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (query.trim() === '') {
      setFilteredParts(mockParts);
      return;
    }

    const filtered = mockParts.filter(part =>
      part.partName.toLowerCase().includes(query.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(query.toLowerCase()) ||
      part.category.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredParts(filtered);
  };

  const getPartStats = (partId: string) => {
    const inventory = mockInventory.filter(inv => inv.partId === partId);
    const prices = inventory.map(inv => inv.price);
    return {
      supplierCount: inventory.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices)
      }
    };
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Search Parts" />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <SearchBar
            placeholder="Search by part name or number..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onClear={() => handleSearch('')}
            showClear={searchQuery.length > 0}
          />
        </div>

        {searchQuery && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {filteredParts.length} {filteredParts.length === 1 ? 'result' : 'results'} found
          </p>
        )}

        {isLoading && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Searching parts...</p>
        )}

        <div className="space-y-3">
          {filteredParts.map((part) => {
            const stats = getPartStats(part.id);
            return (
              <PartCard
                key={part.id}
                part={{ ...part, ...stats }}
                onClick={() => router.push(`/client/results/${part.id}`)}
              />
            );
          })}
        </div>

        {filteredParts.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">No parts found</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Try a different search term
            </p>
          </div>
        )}
      </div>

      <BottomNav role="client" />
    </div>
  );
}
