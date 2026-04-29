'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { PartCard } from '@/components/PartCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { mockParts } from '@/data/mockData';
import { partsService } from '@/lib/services/parts-service';
import { isLiveMode } from '@/lib/config';
import { vehicleService } from '@/lib/services/vehicle-service';
import { recordClientPartActivity } from '@/lib/services/client-discovery-service';
import { scorePartCompatibility, VehicleOption } from '@/lib/vehicle-catalog';
import { Part } from '@/types';

interface PartStats {
  supplierCount: number;
  priceRange: { min: number; max: number };
}

type SearchScope = 'vehicle' | 'all';

function sortByCompatibility(parts: Part[], selectedVehicle: VehicleOption | null) {
  return [...parts].sort((a, b) =>
    scorePartCompatibility(b.compatibility, selectedVehicle) -
    scorePartCompatibility(a.compatibility, selectedVehicle)
  );
}

function filterByVehicle(parts: Part[], selectedVehicle: VehicleOption | null) {
  if (!selectedVehicle) return parts;
  return parts.filter((part) => scorePartCompatibility(part.compatibility, selectedVehicle) > 0);
}

export default function PartSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [allParts, setAllParts] = useState<Part[]>(isLiveMode() ? [] : mockParts);
  const [filteredParts, setFilteredParts] = useState<Part[]>(isLiveMode() ? [] : mockParts);
  const [isLoading, setIsLoading] = useState(isLiveMode());
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [vehicle, setVehicle] = useState<VehicleOption | null>(null);
  const [scope, setScope] = useState<SearchScope>('vehicle');
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

  const applyFilters = useCallback((
    parts: Part[],
    selectedVehicle: VehicleOption | null,
    selectedScope: SearchScope
  ) => {
    const scopedParts = selectedScope === 'vehicle'
      ? filterByVehicle(parts, selectedVehicle)
      : parts;

    setFilteredParts(sortByCompatibility(scopedParts, selectedVehicle));
  }, []);

  useEffect(() => {
    const load = async () => {
      let primaryVehicle: VehicleOption | null = null;

      try {
        primaryVehicle = await vehicleService.getPrimaryVehicle();
        setVehicle(primaryVehicle);
      } catch {
        setVehicle(null);
      } finally {
        setVehicleLoading(false);
      }

      if (!isLiveMode()) return;

      setIsLoading(true);
      try {
        const parts = await partsService.searchParts('');
        setAllParts(parts);
        applyFilters(parts, primaryVehicle, primaryVehicle ? 'vehicle' : 'all');
        await loadPartStats(parts);
      } catch {
        setAllParts([]);
        setFilteredParts([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [applyFilters, loadPartStats]);

  useEffect(() => {
    loadPartStats(filteredParts);
  }, [filteredParts, loadPartStats]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (isLiveMode()) {
      setIsLoading(true);
      try {
        const parts = await partsService.searchParts(query);
        setAllParts(parts);
        applyFilters(parts, vehicle, scope);
      } catch {
        setAllParts([]);
        setFilteredParts([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (query.trim() === '') {
      setAllParts(mockParts);
      applyFilters(mockParts, vehicle, scope);
      return;
    }

    const filtered = mockParts.filter(part =>
      part.partName.toLowerCase().includes(query.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(query.toLowerCase()) ||
      part.category.toLowerCase().includes(query.toLowerCase())
    );
    setAllParts(filtered);
    applyFilters(filtered, vehicle, scope);
  };

  const handleScopeChange = (value: string) => {
    const nextScope = value as SearchScope;
    setScope(nextScope);
    applyFilters(allParts, vehicle, nextScope);
  };

  const handlePartClick = (part: Part) => {
    void recordClientPartActivity(part, searchQuery);
    router.push(`/client/results/${part.id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Search Parts" />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <SearchBar
            placeholder={scope === 'vehicle' ? 'Search parts that fit your vehicle...' : 'Search all parts...'}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onClear={() => handleSearch('')}
            showClear={searchQuery.length > 0}
          />
        </div>

        <div className="mb-4">
          <SegmentedControl
            options={[
              { value: 'vehicle', label: 'Fits My Vehicle', featured: true },
              { value: 'all', label: 'All Parts' },
            ]}
            value={scope}
            onChange={handleScopeChange}
          />
        </div>

        {!vehicleLoading && vehicle && scope === 'vehicle' && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Showing parts matched to your saved vehicle.
          </p>
        )}

        {!vehicleLoading && !vehicle && scope === 'vehicle' && (
          <div className="bg-[var(--accent)] border border-[var(--primary)]/20 rounded-2xl p-4 mb-4">
            <p className="text-sm mb-2">Add your vehicle to see compatible parts first.</p>
            <button
              type="button"
              onClick={() => router.push('/client/vehicle-setup')}
              className="text-sm text-[var(--primary)] underline"
            >
              Set up vehicle
            </button>
          </div>
        )}

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
                onClick={() => handlePartClick(part)}
              />
            );
          })}
        </div>

        {filteredParts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">
              {scope === 'vehicle' ? 'No compatible parts found' : 'No parts found'}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {scope === 'vehicle'
                ? 'Try All Parts or update your saved vehicle.'
                : 'Try a different search term.'}
            </p>
          </div>
        )}
      </div>

      <BottomNav role="client" />
    </div>
  );
}
