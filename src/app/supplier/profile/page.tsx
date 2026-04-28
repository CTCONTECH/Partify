'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth/client';
import { AlertCircle, Store, MapPin, Bell, HelpCircle, LogOut, ChevronRight } from 'lucide-react';

interface SupplierProfileInfo {
  businessName: string;
  email: string;
  address: string;
  suburb: string;
}

const DEFAULT_PROFILE: SupplierProfileInfo = {
  businessName: 'Supplier Profile',
  email: '',
  address: '',
  suburb: '',
};

export default function SupplierProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<SupplierProfileInfo>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          router.replace('/login?next=/supplier/profile');
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

        setProfile({
          businessName: supplier.business_name,
          email: user.email ?? '',
          address: supplier.address,
          suburb: supplier.suburb,
        });
      } catch (err: any) {
        setError(err?.message || 'Could not load supplier profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    await signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Profile" />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 mb-6 text-center">
          <div className="bg-[var(--secondary)] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl mb-1">{loading ? 'Loading...' : profile.businessName}</h2>
          {profile.email && (
            <p className="text-sm text-[var(--muted-foreground)] mb-2">{profile.email}</p>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
            <MapPin className="w-4 h-4" />
            <span>
              {profile.suburb ? `${profile.suburb}, Cape Town` : 'Cape Town'}
            </span>
          </div>
          {profile.address && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2">{profile.address}</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={() => router.push('/supplier/business-details')}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 active:bg-[var(--muted)] transition-colors"
          >
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <Store className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base mb-1">Business Details</h4>
              <p className="text-sm text-[var(--muted-foreground)]">
                Edit your store information
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
          </button>

          <button
            onClick={() => router.push('/notifications')}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 active:bg-[var(--muted)] transition-colors"
          >
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <Bell className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base">Notifications</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
          </button>

          <button
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 active:bg-[var(--muted)] transition-colors"
          >
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <HelpCircle className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base">Help & Support</h4>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
          </button>
        </div>

        <Button
          variant="destructive"
          fullWidth
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
