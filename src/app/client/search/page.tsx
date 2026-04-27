'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { PartCard } from '@/components/PartCard';
import { mockParts } from '@/data/mockData';
import { partsService } from '@/lib/services/parts-service';
import { isLiveMode } from '@/lib/config';
import { vehicleService } from '@/lib/services/vehicle-service';
import { scorePartCompatibility, VehicleOption } from '@/lib/vehicle-catalog';
import { Part } from '@/types';

interface PartStats {
  supplierCount: number;
  priceRange: { min: number; max: number };
}

function sortByCompatibility(parts: Part[], selectedVehicle: VehicleOption | null) {
  return [...parts].sort((a, b) =>
    scorePartCompatibility(b.compatibility, selectedVehicle) -
    scorePartCompatibility(a.compatibility, selectedVehicle)
  );
}

export default function PartSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredParts, setFilteredParts] = useState<Part[]>(mockParts);
  const [isLoading, setIsLoading] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleOption | null>(null);
  const [partStats, setPartStats] = useState<Record<string, PartStats>>({});

  const loadPartStats = useCallback(async (parts: Part[]) => {
    const entries = await Promise.all(parts.map(async (part) => {
      const availability = await partsService.getPartAvailability(part.id);
      const prices = availability.map(item => item.itemPrice);
      return [
        part.id,
        {
          supplierCount: availability.length,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0,
          },
        },
      ] as const;
    }));

    setPartStats(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    const load = async () => {
      let primaryVehicle: VehicleOption | null = null;

      try {
        primaryVehicle = await vehicleService.getPrimaryVehicle();
        setVehicle(primaryVehicle);
      } catch {
        setVehicle(null);
      }

      if (!isLiveMode()) return;

      setIsLoading(true);
      try {
        const parts = await partsService.searchParts('');
        setFilteredParts(sortByCompatibility(parts, primaryVehicle));
        await loadPartStats(parts);
      } catch {
        setFilteredParts(mockParts);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [loadPartStats]);

  useEffect(() => {
    loadPartStats(filteredParts);
  }, [filteredParts, loadPartStats]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (isLiveMode()) {
      setIsLoading(true);
      try {
        const parts = await partsService.searchParts(query);
        setFilteredParts(sortByCompatibility(parts, vehicle));
      } catch {
        setFilteredParts([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (query.trim() === '') {
      setFilteredParts(sortByCompatibility(mockParts, vehicle));
      return;
    }

    const filtered = mockParts.filter(part =>
      part.partName.toLowerCase().includes(query.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(query.toLowerCase()) ||
      part.category.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredParts(sortByCompatibility(filtered, vehicle));
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
            const stats = partStats[part.id] || { supplierCount: 0, priceRange: { min: 0, max: 0 } };
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
