'use client';

import { Home, Search, User, Package, Ticket } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface BottomNavProps {
  role: 'client' | 'supplier';
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const clientNav: NavItem[] = [
    { icon: Home, label: 'Home', path: '/client/home' },
    { icon: Search, label: 'Search', path: '/client/search' },
    { icon: Ticket, label: 'Coupons', path: '/client/coupons' },
    { icon: User, label: 'Profile', path: '/client/profile' }
  ];

  const supplierNav: NavItem[] = [
    { icon: Home, label: 'Dashboard', path: '/supplier/dashboard' },
    { icon: Package, label: 'Inventory', path: '/supplier/inventory' },
    { icon: User, label: 'Profile', path: '/supplier/profile' }
  ];

  const items = role === 'client' ? clientNav : supplierNav;

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          const isPending = pendingPath === item.path && !isActive;

          return (
            <button
              key={item.path}
              onClick={() => {
                if (pathname === item.path) return;
                setPendingPath(item.path);
                router.push(item.path);
              }}
              className={`group flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] transition-all duration-200 active:scale-95 ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`rounded-2xl px-3 py-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--primary)]/10 -translate-y-0.5'
                    : isPending
                      ? 'bg-[var(--primary)]/10 animate-pulse'
                      : 'group-active:bg-[var(--muted)]'
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110' : isPending ? 'scale-105' : 'group-active:scale-90'
                  }`}
                />
              </span>
              <span
                className={`text-xs transition-all duration-200 ${
                  isActive ? 'font-medium' : isPending ? 'text-[var(--primary)]' : ''
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
