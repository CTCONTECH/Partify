'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectUrl, upsertProfileForCurrentUser } from '@/lib/auth/client';
import { Mail, Lock, User, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'client';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login'),
          data: {
            role,
            name: formData.name,
            phone: formData.phone,
          },
        },
      });

      if (signUpError) throw signUpError;

      try {
        await upsertProfileForCurrentUser({
          role: role as 'client' | 'supplier' | 'admin',
          name: formData.name,
          phone: formData.phone,
        });
      } catch {
        // Non-fatal for confirmation-required projects.
      }

      setConfirmationEmail(formData.email);
      setSubmitting(false);
    } catch (err: any) {
      setError(err?.message || 'Signup failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="p-6 max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 p-2 -ml-2 text-[var(--foreground)]"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-2xl mb-2">Create account</h1>
        <p className="text-[var(--muted-foreground)] mb-8">
          Sign up as a {role === 'client' ? 'Client' : 'Supplier'}
        </p>

        {confirmationEmail ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base mb-1">Check your email</h2>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  We sent a confirmation link to {confirmationEmail}. Confirm your email, then log in to continue.
                </p>
                <Button type="button" fullWidth onClick={() => router.push('/login')}>
                  Go to Login
                </Button>
              </div>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            type="text"
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            leftIcon={<User className="w-5 h-5" />}
            required
          />

          <Input
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            leftIcon={<Mail className="w-5 h-5" />}
            required
          />

          <Input
            type="tel"
            label="Phone Number"
            placeholder="+27 XX XXX XXXX"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            leftIcon={<Phone className="w-5 h-5" />}
            required
          />

          <Input
            type="password"
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            leftIcon={<Lock className="w-5 h-5" />}
            required
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            leftIcon={<Lock className="w-5 h-5" />}
            required
          />

          <Button type="submit" fullWidth size="lg" className="mt-6" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Create Account'}
          </Button>

          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}
        </form>
        )}

        <div className="text-center mt-6">
          <span className="text-[var(--muted-foreground)]">Already have an account? </span>
          <button
            onClick={() => router.push('/login')}
            className="text-[var(--primary)] underline"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <SignupForm />
    </Suspense>
  );
}
