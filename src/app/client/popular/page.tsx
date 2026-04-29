'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { PartCard } from '@/components/PartCard';
import {
  DiscoveryPart,
  getPopularClientParts,
  recordClientPartActivity,
} from '@/lib/services/client-discovery-service';

export default function PopularParts() {
  const router = useRouter();
  const [parts, setParts] = useState<DiscoveryPart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPopularParts = async () => {
      setLoading(true);
      try {
        setParts(await getPopularClientParts());
      } finally {
        setLoading(false);
      }
    };

    loadPopularParts();
  }, []);

  const openPart = (part: DiscoveryPart) => {
    void recordClientPartActivity(part, 'Popular parts');
    router.push(`/client/results/${part.id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Popular Parts" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Frequently viewed and requested parts with live supplier stock.
        </p>

        {loading && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Loading popular parts...</p>
        )}

        {!loading && parts.length > 0 && (
          <div className="space-y-3">
            {parts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                onClick={() => openPart(part)}
              />
            ))}
          </div>
        )}

        {!loading && parts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-2">No popular parts yet</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Popular parts will appear once suppliers have live stock.
            </p>
          </div>
        )}
      </div>

      <BottomNav role="client" />
    </div>
  );
}
