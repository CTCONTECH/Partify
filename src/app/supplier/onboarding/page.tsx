'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { Building2, MapPin, Navigation } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Default coordinates: Cape Town CBD
const DEFAULT_LAT = -33.9249;
const DEFAULT_LNG = 18.4241;

export default function SupplierOnboarding() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    suburb: '',
    lat: DEFAULT_LAT.toString(),
    lng: DEFAULT_LNG.toString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');

      const lat = parseFloat(form.lat);
      const lng = parseFloat(form.lng);
      if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid coordinates');

      const { error: insertError } = await supabase.from('suppliers').insert({
        id: userData.user.id,
        business_name: form.businessName.trim(),
        address: form.address.trim(),
        suburb: form.suburb.trim(),
        coordinates: `SRID=4326;POINT(${lng} ${lat})`,
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
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-[var(--muted-foreground)]" />
              <p className="text-sm text-[var(--muted-foreground)]">
                Coordinates (used for distance search)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="Latitude"
                placeholder="-33.9249"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                step="any"
              />
              <Input
                type="number"
                label="Longitude"
                placeholder="18.4241"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                step="any"
              />
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Default is Cape Town CBD. Update with your exact location for accurate results.
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
