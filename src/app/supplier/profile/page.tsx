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

function SupplierProfileMark() {
  return (
    <div className="relative w-20 h-20 mx-auto mb-4">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[#D84315] rotate-3" />
      <div className="absolute inset-1 rounded-3xl bg-[var(--card)] border border-white/70 flex items-center justify-center">
        <svg
          viewBox="0 0 64 64"
          className="w-12 h-12"
          fill="none"
          aria-label="Supplier profile"
        >
          <path
            d="M32 6C41.4 6 48 12.7 48 22.1C48 35 32 55 32 55C32 55 16 35 16 22.1C16 12.7 22.6 6 32 6Z"
            fill="#FF5722"
          />
          <path
            d="M25 18H34.5C39.1 18 42 20.8 42 25C42 29.2 39.1 32 34.5 32H29.5V41H25V18ZM29.5 22V28H34.2C36.2 28 37.4 26.8 37.4 25C37.4 23.2 36.2 22 34.2 22H29.5Z"
            fill="white"
          />
          <path d="M22 45H42" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M25 50H39" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="absolute -right-1 -bottom-1 w-7 h-7 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center shadow-sm">
        <Store className="w-4 h-4 text-[var(--primary)]" />
      </div>
    </div>
  );
}

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
    await signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Profile" />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 mb-6 text-center">
          <SupplierProfileMark />
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
            onClick={() => router.push('/supplier/help')}
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
