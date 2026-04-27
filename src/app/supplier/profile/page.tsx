'use client';

import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { signOut } from '@/lib/auth/client';
import { Store, MapPin, Bell, HelpCircle, LogOut, ChevronRight } from 'lucide-react';

export default function SupplierProfile() {
  const router = useRouter();

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
          <h2 className="text-xl mb-1">ProAuto Supply</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-2">supplier@example.com</p>
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
            <MapPin className="w-4 h-4" />
            <span>Brackenfell, Cape Town</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <button
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
