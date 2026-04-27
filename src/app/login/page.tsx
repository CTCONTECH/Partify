"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PartifyLogo } from '@/components/PartifyLogo';
import { createClient } from '@/lib/supabase/client';
import { getAuthContext, getAuthRedirectUrl, upsertProfileForCurrentUser } from '@/lib/auth/client';
import { Mail, Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const showResendConfirmation = error?.toLowerCase().includes('email not confirmed');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (user?.email) {
        const metadataRole = (user.user_metadata?.role || 'client') as 'client' | 'supplier' | 'admin';
        await upsertProfileForCurrentUser({
          role: metadataRole,
          name: user.user_metadata?.name || user.email.split('@')[0],
          phone: user.user_metadata?.phone,
        });
      }

      const auth = await getAuthContext();
      const destination =
        searchParams.get('next') ||
        (auth.role === 'supplier' ? '/supplier/dashboard' : '/client/home');

      router.push(destination);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }

    setResending(true);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login'),
        },
      });

      if (resendError) throw resendError;
      setResendMessage('Confirmation email sent. Check your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Could not resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md mx-auto w-full">
        <div className="flex items-center justify-center mb-8">
          <PartifyLogo variant="icon" size="lg" />
        </div>

        <h1 className="text-2xl text-center mb-2">Welcome back</h1>
        <p className="text-[var(--muted-foreground)] text-center mb-8">
          Log in to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <Input
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-5 h-5" />}
            required
          />

          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-5 h-5" />}
            required
          />

          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="text-sm text-[var(--primary)] underline"
          >
            Forgot password?
          </button>

          <Button type="submit" fullWidth size="lg">
            {submitting ? 'Logging in...' : 'Log In'}
          </Button>

          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}

          {showResendConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              className="text-sm text-[var(--primary)] underline disabled:opacity-60"
            >
              {resending ? 'Sending confirmation email...' : 'Resend confirmation email'}
            </button>
          )}

          {resendMessage && (
            <p className="text-sm text-[var(--success)]">{resendMessage}</p>
          )}
        </form>

        <div className="text-center">
          <span className="text-[var(--muted-foreground)]">Don't have an account? </span>
          <button
            onClick={() => router.push('/role-select')}
            className="text-[var(--primary)] underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <LoginForm />
    </Suspense>
  );
}
