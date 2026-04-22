'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Wrench, Search, TrendingDown, MapPin } from 'lucide-react';

export default function Welcome() {
  const router = useRouter();

  const handleGetStarted = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    router.push('/role-select');
  };

  return (
    <div className="h-screen bg-[var(--background)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-[var(--primary)] p-6 rounded-3xl mb-6">
          <Wrench className="w-16 h-16 text-white" />
        </div>

        <h1 className="text-3xl text-center mb-3">Welcome to Partify</h1>
        <p className="text-[var(--muted-foreground)] text-center mb-12 max-w-sm">
          Find the exact car part you need, compare suppliers, and save time and money
        </p>

        <div className="w-full max-w-sm space-y-4 mb-12">
          <div className="flex items-start gap-3">
            <div className="bg-[var(--accent)] p-2 rounded-lg flex-shrink-0">
              <Search className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-base mb-1">Search by part number or name</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Quick vehicle-specific results</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-[var(--accent)] p-2 rounded-lg flex-shrink-0">
              <TrendingDown className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-base mb-1">Compare prices instantly</h3>
              <p className="text-sm text-[var(--muted-foreground)]">See best price, closest, and total cost</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-[var(--accent)] p-2 rounded-lg flex-shrink-0">
              <MapPin className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-base mb-1">Factor in travel costs</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Smart total cost calculations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pb-8">
        <Button fullWidth size="lg" onClick={handleGetStarted}>
          Get Started
        </Button>
      </div>
    </div>
  );
}
