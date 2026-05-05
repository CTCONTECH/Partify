'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { geocodeBusinessAddress, GeocodedAddress } from '@/lib/geocoding';
import { ArrowLeft, Building2, CheckCircle2, MapPin, Navigation } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BusinessForm {
  businessName: string;
  address: string;
  suburb: string;
}

export default function SupplierBusinessDetailsPage() {
  const router = useRouter();
  const [form, setForm] = useState<BusinessForm>({
    businessName: '',
    address: '',
    suburb: '',
  });
  const [loading, setLoading] = useState(true);
  const [hasSavedLocation, setHasSavedLocation] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<GeocodedAddress | null>(null);
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
          .select('business_name, address, suburb, coordinates')
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
        setHasSavedLocation(Boolean(supplier.coordinates));
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

      const resolvedLocation = await geocodeBusinessAddress(form.address, form.suburb);

      const updatePayload: Record<string, string> = {
        business_name: form.businessName.trim(),
        address: form.address.trim(),
        suburb: form.suburb.trim(),
        coordinates: `SRID=4326;POINT(${resolvedLocation.lon} ${resolvedLocation.lat})`,
      };

      const { error: updateError } = await supabase
        .from('suppliers')
        .update(updatePayload)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSaved(true);
      setHasSavedLocation(true);
      setVerifiedAddress(resolvedLocation);
    } catch (err: any) {
      setError(err?.message || 'Could not save business details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
      <div className="xl:hidden">
        <TopBar title="Business Details" showBack />
      </div>

      <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto">
        <div className="hidden xl:block mb-6">
          <button
            type="button"
            onClick={() => router.push('/supplier/profile')}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </button>
          <h1 className="text-3xl">Business Details</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Keep supplier trading details and distance location accurate for customers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6 xl:space-y-0 xl:items-start">
          <div className="space-y-5">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Primary business address</p>
                <p className="text-sm text-[var(--foreground)] mt-1">
                  {form.address || 'No street address saved'}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {form.suburb ? `${form.suburb}, Cape Town` : 'Suburb not set'}
                </p>
              </div>
            </div>
          </div>

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

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 xl:hidden">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Distance location</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {hasSavedLocation
                    ? 'Coordinates are saved from the primary business address.'
                    : 'Save changes to verify the primary address and create supplier distance coordinates.'}
                </p>
                {verifiedAddress && (
                  <p className="text-xs text-[var(--success)] mt-2">
                    Verified: {verifiedAddress.label}
                  </p>
                )}
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  This address powers nearest-supplier results and is shown to customers.
                </p>
              </div>
            </div>
          </div>
          </div>

          <div className="space-y-5">
          <div className="hidden xl:block bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Distance location</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {hasSavedLocation
                    ? 'Coordinates are saved from the primary business address.'
                    : 'Save changes to verify the primary address and create supplier distance coordinates.'}
                </p>
                {verifiedAddress && (
                  <p className="text-xs text-[var(--success)] mt-2">
                    Verified: {verifiedAddress.label}
                  </p>
                )}
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  This address powers nearest-supplier results and is shown to customers.
                </p>
              </div>
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
            {submitting ? 'Verifying address...' : 'Save Changes'}
          </Button>
          </div>
        </form>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
