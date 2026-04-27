'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Location } from '@/types';
import { Building2, MapPin, Navigation } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Default coordinates: Cape Town CBD
const DEFAULT_LAT = -33.9249;
const DEFAULT_LNG = 18.4241;
const DEFAULT_LOCATION: Location = { lat: DEFAULT_LAT, lon: DEFAULT_LNG };

export default function SupplierOnboarding() {
  const router = useRouter();
  const { location, error: locationError, loading: locationLoading, requestLocation } = useGeolocation(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    suburb: '',
  });

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace('/login?next=/supplier/onboarding');
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');

      const supplierLocation = location || DEFAULT_LOCATION;

      const { error: insertError } = await supabase.from('suppliers').insert({
        id: userData.user.id,
        business_name: form.businessName.trim(),
        address: form.address.trim(),
        suburb: form.suburb.trim(),
        coordinates: `SRID=4326;POINT(${supplierLocation.lon} ${supplierLocation.lat})`,
      });

      if (insertError) throw insertError;

      router.push('/supplier/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to save business profile. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="p-6 max-w-md mx-auto">
        <div className="mb-8">
          <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-[var(--primary)]" />
          </div>
          <h1 className="text-2xl mb-2">Set up your business</h1>
          <p className="text-[var(--muted-foreground)]">
            Add your business details so customers can find you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            type="text"
            label="Business Name"
            placeholder="e.g. Cape Auto Spares"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            leftIcon={<Building2 className="w-5 h-5" />}
            required
          />

          <Input
            type="text"
            label="Street Address"
            placeholder="e.g. 12 Voortrekker Road, Bellville"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            leftIcon={<MapPin className="w-5 h-5" />}
            required
          />

          <Input
            type="text"
            label="Suburb"
            placeholder="e.g. Bellville"
            value={form.suburb}
            onChange={(e) => setForm({ ...form, suburb: e.target.value })}
            leftIcon={<MapPin className="w-5 h-5" />}
            required
          />

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Business location</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {location
                    ? 'Using your current device location for supplier distance estimates.'
                    : locationError || 'If you are currently at your business, use your location for better distance estimates.'}
                </p>
                {location && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-2">
                    Location captured.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void requestLocation().catch(() => undefined)}
                disabled={locationLoading}
                className="text-sm text-[var(--primary)] underline disabled:opacity-60"
              >
                {locationLoading ? 'Locating...' : location ? 'Update' : 'Use my location'}
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-3">
              We will use your address for your supplier profile. Address verification will be added later.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Complete Setup'}
          </Button>
        </form>
      </div>
    </div>
  );
}
