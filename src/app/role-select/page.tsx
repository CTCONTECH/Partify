'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { User, Store } from 'lucide-react';

export default function RoleSelect() {
  const router = useRouter();

  const selectRole = (role: 'client' | 'supplier') => {
    router.push(`/signup?role=${role}`);
  };

  return (
    <div className="h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl mb-3 text-center">I am a...</h1>
      <p className="text-[var(--muted-foreground)] text-center mb-12 max-w-sm">
        Choose your account type to get started
      </p>

      <div className="w-full max-w-md space-y-4">
        <button
          onClick={() => selectRole('client')}
          className="w-full bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-6 text-left active:border-[var(--primary)] transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="bg-[var(--primary)] p-3 rounded-xl flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl mb-2">Client</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                I'm a mechanic or car owner looking for parts
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => selectRole('supplier')}
          className="w-full bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl p-6 text-left active:border-[var(--primary)] transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="bg-[var(--secondary)] p-3 rounded-xl flex-shrink-0">
              <Store className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl mb-2">Supplier</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                I'm a store owner managing inventory and pricing
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={() => router.push('/login')}
        className="mt-8 text-[var(--muted-foreground)] underline"
      >
        Already have an account? Log in
      </button>
    </div>
  );
}
