'use client';

import { BarChart3, Home, Search, User, Package, Ticket, ReceiptText, ClipboardList } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupplierIdleTimeout } from '@/hooks/useSupplierIdleTimeout';
import { PartifyLogo } from '@/components/PartifyLogo';

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
  useSupplierIdleTimeout(role === 'supplier');

  const clientNav: NavItem[] = [
    { icon: Home, label: 'Home', path: '/client/home' },
    { icon: Search, label: 'Search', path: '/client/search' },
    { icon: Ticket, label: 'Coupons', path: '/client/coupons' },
    { icon: User, label: 'Profile', path: '/client/profile' }
  ];

  const supplierNav: NavItem[] = [
    { icon: Home, label: 'Dashboard', path: '/supplier/dashboard' },
    { icon: Package, label: 'Inventory', path: '/supplier/inventory' },
    { icon: ReceiptText, label: 'Redeem', path: '/supplier/redeem' },
    { icon: User, label: 'Profile', path: '/supplier/profile' }
  ];

  const supplierDesktopNav: NavItem[] = [
    { icon: Home, label: 'Dashboard', path: '/supplier/dashboard' },
    { icon: Package, label: 'Inventory', path: '/supplier/inventory' },
    { icon: ClipboardList, label: 'Requests', path: '/supplier/requests' },
    { icon: ReceiptText, label: 'Redeem Coupon', path: '/supplier/redeem' },
    { icon: BarChart3, label: 'Sales Insights', path: '/supplier/coupons' },
    { icon: User, label: 'Profile', path: '/supplier/profile' }
  ];

  const items = role === 'client' ? clientNav : supplierNav;
  const desktopItems = role === 'supplier' ? supplierDesktopNav : [];

  const isActivePath = (path: string) => (
    pathname === path || (path !== '/supplier/dashboard' && pathname.startsWith(`${path}/`))
  );

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  return (
    <>
      {role === 'supplier' && (
        <aside className="hidden xl:flex fixed left-0 top-0 bottom-0 w-64 bg-[var(--card)] border-r border-[var(--border)] z-30 flex-col">
          <div className="h-20 px-6 flex items-center border-b border-[var(--border)]">
            <PartifyLogo variant="horizontal" size="lg" />
          </div>

          <div className="px-4 py-5">
            <p className="px-3 mb-3 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              Supplier Workspace
            </p>
            <div className="space-y-1">
              {desktopItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);
                const isPending = pendingPath === item.path && !isActive;
                const isInsights = item.path === '/supplier/coupons';

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (pathname === item.path) return;
                      setPendingPath(item.path);
                      router.push(item.path);
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--primary)] text-white shadow-sm'
                        : isInsights
                          ? 'bg-blue-50 text-blue-800 border border-blue-100 hover:bg-blue-100'
                          : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                    } ${isPending ? 'animate-pulse' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                    {isInsights && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${
                          isActive ? 'bg-white/20 text-white' : 'bg-white text-blue-700'
                        }`}
                      >
                        Pro
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto p-4">
            <div className="border border-[var(--border)] bg-[var(--muted)] rounded-lg p-3">
              <p className="text-sm mb-1">Business tools</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Manage stock, coupon demand, and redemptions from one workspace.
              </p>
            </div>
          </div>
        </aside>
      )}

      <nav className={`fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] safe-area-inset-bottom ${role === 'supplier' ? 'xl:hidden' : ''}`}>
        <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);
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
    </>
  );
}
