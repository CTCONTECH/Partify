'use client';

import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Search, Car, History, TrendingUp } from 'lucide-react';

export default function ClientHome() {
  const router = useRouter();
  const vehicle = typeof window !== 'undefined' ? localStorage.getItem('userVehicle') : null;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Partify" showNotifications />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-[var(--primary)] to-[#BF360C] rounded-3xl p-6 mb-6 text-white">
          <h2 className="text-2xl mb-2">Find your part</h2>
          <p className="text-white/90 mb-6">Compare prices across Cape Town suppliers</p>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => router.push('/client/search')}
          >
            <Search className="w-5 h-5 mr-2" />
            Search Parts
          </Button>
        </div>

        {vehicle ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-[var(--muted)] p-2 rounded-lg">
                  <Car className="w-5 h-5 text-[var(--foreground)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Your Vehicle</p>
                  <h3 className="text-base">{vehicle}</h3>
                </div>
              </div>
              <button
                onClick={() => router.push('/client/vehicle-setup')}
                className="text-sm text-[var(--primary)] underline"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--accent)] border border-[var(--primary)]/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Car className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-base mb-1">Set up your vehicle</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  Add your vehicle details for accurate part results
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/client/vehicle-setup')}
                >
                  Add Vehicle
                </Button>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-lg mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/client/saved')}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 active:bg-[var(--muted)] transition-colors"
          >
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <History className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base mb-1">Recent Searches</h4>
              <p className="text-sm text-[var(--muted-foreground)]">View your search history</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/client/search')}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-3 active:bg-[var(--muted)] transition-colors"
          >
            <div className="bg-[var(--muted)] p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-[var(--foreground)]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base mb-1">Popular Parts</h4>
              <p className="text-sm text-[var(--muted-foreground)]">Browse commonly searched parts</p>
            </div>
          </button>
        </div>
      </div>

      <BottomNav role="client" />
    </div>
  );
}
