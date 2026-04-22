'use client';

import { Home, Search, User, Package } from 'lucide-react';
import { useLocation, useNavigate } from 'next/navigation';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface BottomNavProps {
  role: 'client' | 'supplier';
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const clientNav: NavItem[] = [
    { icon: Home, label: 'Home', path: '/client/home' },
    { icon: Search, label: 'Search', path: '/client/search' },
    { icon: User, label: 'Profile', path: '/client/profile' }
  ];

  const supplierNav: NavItem[] = [
    { icon: Home, label: 'Dashboard', path: '/supplier/dashboard' },
    { icon: Package, label: 'Inventory', path: '/supplier/inventory' },
    { icon: User, label: 'Profile', path: '/supplier/profile' }
  ];

  const items = role === 'client' ? clientNav : supplierNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] transition-colors ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
