'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';

export default function Signup() {
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

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('userRole', role);
    const destination = role === 'client' ? '/client/vehicle-setup' : '/supplier/dashboard';
    router.push(destination);
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

          <Button type="submit" fullWidth size="lg" className="mt-6">
            Create Account
          </Button>
        </form>

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
