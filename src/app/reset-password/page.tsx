'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PartifyLogo } from '@/components/PartifyLogo';
import { createClient } from '@/lib/supabase/client';
import { createPasswordResetClient } from '@/lib/supabase/password-reset-client';
import { CheckCircle2, Lock } from 'lucide-react';

type ResetSessionMode = 'implicit' | 'ssr';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<ResetSessionMode | null>(null);

  useEffect(() => {
    const prepareSession = async () => {
      setError(null);

      try {
        const code = searchParams.get('code');
        const recoveryClient = createPasswordResetClient();

        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await recoveryClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;

            const { data } = await recoveryClient.auth.getSession();
            if (!data.session) {
              throw new Error('This reset link is invalid or has expired. Request a new reset link.');
            }

            setSessionMode('implicit');
            setReady(true);
            return;
          }
        }

        if (code) {
          const supabase = createClient();
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error('This reset link is invalid or has expired. Request a new reset link.');
          }

          setSessionMode('ssr');
          setReady(true);
          return;
        }

        const { data } = await recoveryClient.auth.getSession();
        if (!data.session) {
          throw new Error('This reset link is invalid or has expired. Request a new reset link.');
        }

        setSessionMode('implicit');
        setReady(true);
      } catch (err: any) {
        const message = String(err?.message || '');
        if (message.toLowerCase().includes('pkce')) {
          setError('This reset link could not be verified. Request a new reset email and open the latest link.');
        } else {
          setError(message || 'Could not open reset link.');
        }
      }
    };

    prepareSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = sessionMode === 'ssr' ? createClient() : createPasswordResetClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setComplete(true);
    } catch (err: any) {
      setError(err?.message || 'Could not update password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (complete) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="bg-[var(--success)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-3">Password updated</h1>
          <p className="text-[var(--muted-foreground)] mb-8">
            You can now log in with your new password.
          </p>
          <Button fullWidth onClick={() => router.replace('/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md mx-auto w-full">
        <div className="flex items-center justify-center mb-8">
          <PartifyLogo variant="icon" size="lg" />
        </div>

        <h1 className="text-2xl text-center mb-2">Create new password</h1>
        <p className="text-[var(--muted-foreground)] text-center mb-8">
          Choose a new password for your Partify account.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              label="New password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              required
            />

            <Input
              type="password"
              label="Confirm password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-5 h-5" />}
              required
            />

            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? 'Updating password...' : 'Update Password'}
            </Button>
          </form>
        )}

        {!ready && !error && (
          <div className="h-24 bg-[var(--muted)] rounded-2xl animate-pulse" />
        )}

        {error && !ready && (
          <Button variant="secondary" fullWidth onClick={() => router.replace('/forgot-password')}>
            Request New Link
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
