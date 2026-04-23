'use client';

import { ArrowLeft, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  onBack?: () => void;
}

export function TopBar({ title, showBack, showNotifications, onBack }: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--card)] border-b border-[var(--border)] safe-area-inset-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-[var(--foreground)] active:text-[var(--primary)]"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          {title && (
            <h1 className="text-lg">{title}</h1>
          )}
        </div>
        {showNotifications && (
          <button
            onClick={() => router.push('/notifications')}
            className="p-2 -mr-2 text-[var(--foreground)] active:text-[var(--primary)]"
          >
            <Bell className="w-6 h-6" />
          </button>
        )}
      </div>
    </header>
  );
}
