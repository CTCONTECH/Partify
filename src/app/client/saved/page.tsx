'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { PartCard } from '@/components/PartCard';
import { DiscoveryPart, getRecentClientSearches } from '@/lib/services/client-discovery-service';

export default function SavedSearches() {
  const router = useRouter();
  const [recentParts, setRecentParts] = useState<DiscoveryPart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentSearches = async () => {
      setLoading(true);
      try {
        setRecentParts(await getRecentClientSearches());
      } finally {
        setLoading(false);
      }
    };

    loadRecentSearches();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Recent Searches" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        {loading && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Loading recent searches...</p>
        )}

        {!loading && recentParts.length > 0 && (
          <div className="space-y-3">
            {recentParts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                onClick={() => router.push(`/client/results/${part.id}`)}
              />
            ))}
          </div>
        )}

        {!loading && recentParts.length === 0 && (
          <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] mb-2">No recent searches</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Parts you open from search will appear here.
          </p>
        </div>
        )}
      </div>

      <BottomNav role="client" />
    </div>
  );
}
