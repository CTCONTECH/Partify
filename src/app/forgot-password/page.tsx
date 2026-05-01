'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { createPasswordResetClient } from '@/lib/supabase/password-reset-client';
import { Mail, ArrowLeft } from 'lucide-react';

function friendlyResetError(message?: string) {
  const lower = (message || '').toLowerCase();

  if (lower.includes('rate limit')) {
    return 'Too many reset emails requested. Please wait a few minutes before trying again.';
  }

  return message || 'Could not send reset email.';
}

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const trimmedEmail = email.trim();

      const { data: accountExists, error: lookupError } = await supabase
        .rpc('can_request_password_reset', { p_email: trimmedEmail });

      if (lookupError) throw lookupError;
      if (!accountExists) {
        throw new Error('No Partify account is linked to this email address.');
      }

      const resetClient = createPasswordResetClient();
      const { error: resetError } = await resetClient.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(friendlyResetError(err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="bg-[var(--success)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-3">Check your email</h1>
          <p className="text-[var(--muted-foreground)] mb-8">
            We've sent password reset instructions to {email}
          </p>
          <Button fullWidth onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="p-6 max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 p-2 -ml-2 text-[var(--foreground)]"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-2xl mb-2">Forgot password?</h1>
        <p className="text-[var(--muted-foreground)] mb-8">
          Enter your email and we'll send you reset instructions
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-5 h-5" />}
            required
          />

          <Button type="submit" fullWidth size="lg" className="mt-6">
            {submitting ? 'Checking account...' : 'Send Reset Link'}
          </Button>

          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
