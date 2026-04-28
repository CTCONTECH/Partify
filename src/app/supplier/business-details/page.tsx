'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Building2, MapPin, Navigation } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BusinessForm {
  businessName: string;
  address: string;
  suburb: string;
}

export default function SupplierBusinessDetailsPage() {
  const router = useRouter();
  const { location, error: locationError, loading: locationLoading, requestLocation } = useGeolocation(false);
  const [form, setForm] = useState<BusinessForm>({
    businessName: '',
    address: '',
    suburb: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBusiness = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/supplier/business-details');
          return;
        }

        const { data: supplier, error: supplierError } = await supabase
          .from('suppliers')
          .select('business_name, address, suburb')
          .eq('id', user.id)
          .maybeSingle();

        if (supplierError) throw supplierError;

        if (!supplier) {
          router.replace('/supplier/onboarding');
          return;
        }

        setForm({
          businessName: supplier.business_name,
          address: supplier.address,
          suburb: supplier.suburb,
        });
      } catch (err: any) {
        setError(err?.message || 'Could not load business details.');
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    setError(null);

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (userError || !user) throw new Error('Not authenticated');

      const updatePayload: Record<string, string> = {
        business_name: form.businessName.trim(),
        address: form.address.trim(),
        suburb: form.suburb.trim(),
      };

      if (location) {
        updatePayload.coordinates = `SRID=4326;POINT(${location.lon} ${location.lat})`;
      }

      const { error: updateError } = await supabase
        .from('suppliers')
        .update(updatePayload)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSaved(true);
    } catch (err: any) {
      setError(err?.message || 'Could not save business details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Business Details" showBack />

      <div className="p-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            type="text"
            label="Business Name"
            placeholder="e.g. Cape Auto Spares"
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            leftIcon={<Building2 className="w-5 h-5" />}
            disabled={loading}
            required
          />

          <Input
            type="text"
            label="Street Address"
            placeholder="e.g. 12 Voortrekker Road, Bellville"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            leftIcon={<MapPin className="w-5 h-5" />}
            disabled={loading}
            required
          />

          <Input
            type="text"
            label="Suburb"
            placeholder="e.g. Bellville"
            value={form.suburb}
            onChange={(e) => setForm({ ...form, suburb: e.target.value })}
            leftIcon={<MapPin className="w-5 h-5" />}
            disabled={loading}
            required
          />

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Business location</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {location
                    ? 'New location captured. Save changes to update supplier distance estimates.'
                    : locationError || 'Keep your saved location, or update it while you are at the business.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void requestLocation().catch(() => undefined)}
                disabled={locationLoading || loading}
                className="text-sm text-[var(--primary)] underline disabled:opacity-60"
              >
                {locationLoading ? 'Locating...' : 'Update'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm text-green-700">Business details saved.</p>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading || submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
