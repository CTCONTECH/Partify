'use client';

import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';

export default function SavedSearches() {
  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Recent Searches" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)] mb-2">No recent searches</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your search history will appear here
          </p>
        </div>
      </div>

      <BottomNav role="client" />
    </div>
  );
}
