import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { TopBar } from '../../components/TopBar';
import { SupplierCard } from '../../components/SupplierCard';
import { SegmentedControl } from '../../components/SegmentedControl';
import { Button } from '../../components/Button';
import { getSupplierResults, mockParts } from '../../data/mockData';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { SlidersHorizontal, MapPin, Loader2 } from 'lucide-react';

export function SupplierResults() {
  const { partId } = useParams<{ partId: string }>();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'total' | 'price' | 'distance'>('total');

  const { location, error, loading, requestLocation } = useGeolocation();
  const [showLocationPrompt, setShowLocationPrompt] = useState(!location);

  if (!partId) {
    navigate('/client/search');
    return null;
  }

  const part = mockParts.find(p => p.id === partId);
  const suppliers = getSupplierResults(partId, location || undefined);

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (sortBy === 'total') return a.totalCost - b.totalCost;
    if (sortBy === 'price') return a.itemPrice - b.itemPrice;
    return a.distance - b.distance;
  });

  useEffect(() => {
    if (location) {
      setShowLocationPrompt(false);
    }
  }, [location]);

  const handleSupplierClick = (supplierId: string) => {
    navigate(`/client/coupon/${supplierId}/${partId}`);
  };

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

        {/* Location Prompt */}
        {showLocationPrompt && !location && (
          <div className="bg-[var(--accent)] border border-[var(--primary)]/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-base mb-1">Enable Location</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  Get accurate distances to suppliers near you
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={requestLocation}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    'Enable Location'
                  )}
                </Button>
                {error && (
                  <p className="text-sm text-[var(--destructive)] mt-2">{error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {location && (
          <div className="flex items-center gap-2 text-sm text-[var(--success)] mb-4">
            <MapPin className="w-4 h-4" />
            <span>Showing distances from your location</span>
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
              onClick={() => handleSupplierClick(supplier.id)}
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
