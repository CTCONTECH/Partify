'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PartifyLogo } from '@/components/PartifyLogo';
import { getAuthContext } from '@/lib/auth/client';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hasRecoveryCode = searchParams.has('code');
      const hasRecoveryTokens = hashParams.has('access_token') && hashParams.has('refresh_token');

      if (hasRecoveryCode || hasRecoveryTokens) {
        router.replace(`/reset-password${window.location.search}${window.location.hash}`);
        return;
      }
    }

    const timer = setTimeout(() => {
      const route = async () => {
        const auth = await getAuthContext();
        if (!auth.userId) {
          router.push('/welcome');
          return;
        }

        router.push(auth.role === 'supplier' ? '/supplier/dashboard' : '/client/home');
      };

      route();
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-screen bg-gradient-to-br from-[var(--primary)] to-[#BF360C] flex flex-col items-center justify-center p-6">
      <div className="mb-6">
        <PartifyLogo variant="stacked" size="xl" theme="white" />
      </div>
      <p className="text-white/80 text-lg">Find parts. Compare prices.</p>
    </div>
  );
}
