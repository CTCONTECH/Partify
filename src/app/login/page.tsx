'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Mail, Lock, Wrench } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const role = localStorage.getItem('userRole') || 'client';
    const destination = role === 'client' ? '/client/home' : '/supplier/dashboard';
    router.push(destination);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="flex-1 flex flex-col justify-center p-6 max-w-md mx-auto w-full">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-[var(--primary)] p-4 rounded-2xl">
            <Wrench className="w-10 h-10 text-white" />
          </div>
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
            Log In
          </Button>
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
