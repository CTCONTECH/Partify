'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client';

const SUPPLIER_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const LAST_ACTIVITY_KEY = 'partify:supplier:last_activity_at';

export function useSupplierIdleTimeout(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let lastWriteAt = 0;
    let signingOut = false;

    const now = () => Date.now();

    const recordActivity = (force = false) => {
      const currentTime = now();
      if (!force && currentTime - lastWriteAt < ACTIVITY_WRITE_THROTTLE_MS) return;

      lastWriteAt = currentTime;
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(currentTime));
    };

    const expireSession = async () => {
      if (signingOut) return;
      signingOut = true;
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);
      await signOut();
      router.replace('/login?reason=session_expired');
    };

    const checkIdleState = () => {
      const lastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));

      if (!lastActivity || Number.isNaN(lastActivity)) {
        recordActivity(true);
        return;
      }

      if (now() - lastActivity >= SUPPLIER_IDLE_TIMEOUT_MS) {
        void expireSession();
      }
    };

    const handleActivity = () => recordActivity();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkIdleState();
        recordActivity();
      }
    };

    checkIdleState();

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(checkIdleState, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [enabled, router]);
}
