'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { SupplierCard } from '@/components/SupplierCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { getSupplierResults, mockParts } from '@/data/mockData';
import { MapPin, SlidersHorizontal } from 'lucide-react';
import { partsService } from '@/lib/services/parts-service';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Location, Part, SupplierResult } from '@/types';

const CAPE_TOWN_CBD: Location = { lat: -33.9249, lon: 18.4241 };

export default function SupplierResults() {
  const params = useParams();
  const router = useRouter();
  const partId = params.partId as string;
  const [sortBy, setSortBy] = useState<'total' | 'price' | 'distance'>('total');
  const [part, setPart] = useState<Part | null>(mockParts.find(p => p.id === partId) || null);
  const [suppliers, setSuppliers] = useState<SupplierResult[]>(getSupplierResults(partId));
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallbackLocation, setUsingFallbackLocation] = useState(false);
  const { location, error: locationError, loading: locationLoading, requestLocation } = useGeolocation(false);

  useEffect(() => {
    void requestLocation().catch(() => undefined);
  }, [requestLocation]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const locationForSearch = location || CAPE_TOWN_CBD;
      setUsingFallbackLocation(!location);

      try {
        const [partData, availability] = await Promise.all([
          partsService.getPartById(partId),
          partsService.getPartAvailability(partId, locationForSearch),
        ]);

        setPart(partData);
        setSuppliers(availability);
      } catch {
        setPart(mockParts.find(p => p.id === partId) || null);
        setSuppliers(getSupplierResults(partId, locationForSearch));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [partId, location]);

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

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {location
                  ? 'Using your current location'
                  : usingFallbackLocation
                    ? 'Using approximate Cape Town location'
                    : 'Checking your location'}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {location
                  ? 'Distances, fuel cost, and total cost are based on your browser location.'
                  : locationError || 'Allow location access for more accurate supplier comparison.'}
              </p>
            </div>
            {!locationLoading && (
              <button
                type="button"
                onClick={() => void requestLocation().catch(() => undefined)}
                className="text-sm text-[var(--primary)] underline"
              >
                {location ? 'Update' : 'Retry'}
              </button>
            )}
          </div>
        </div>

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

        {(isLoading || locationLoading) && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Comparing supplier prices and distance...
          </p>
        )}

        <div className="space-y-4">
          {sortedSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onClick={() => router.push(`/client/coupon/${supplier.id}/${partId}`)}
            />
          ))}
        </div>

        {suppliers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">No suppliers found</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              No suppliers currently list this part
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
