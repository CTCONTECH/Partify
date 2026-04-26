'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PartifyLogo } from '@/components/PartifyLogo';
import { getAuthContext } from '@/lib/auth/client';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
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
