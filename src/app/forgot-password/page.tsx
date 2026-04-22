'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
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
            Send Reset Link
          </Button>
        </form>
      </div>
    </div>
  );
}
