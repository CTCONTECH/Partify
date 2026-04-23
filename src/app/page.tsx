'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const hasAccount = localStorage.getItem('hasAccount') === 'true';
      router.push(hasAccount ? '/login' : '/welcome');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-screen bg-gradient-to-br from-[var(--primary)] to-[#BF360C] flex flex-col items-center justify-center p-6">
      <div className="bg-white/10 p-6 rounded-3xl mb-6 backdrop-blur-sm">
        <Wrench className="w-20 h-20 text-white" />
      </div>
      <h1 className="text-4xl text-white mb-2">Partify</h1>
      <p className="text-white/80 text-lg">Find parts. Compare prices.</p>
    </div>
  );
}
