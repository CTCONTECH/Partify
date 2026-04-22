'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Car } from 'lucide-react';

export default function VehicleSetup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    engine: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicleString = `${formData.year} ${formData.make} ${formData.model} ${formData.engine}`;
    localStorage.setItem('userVehicle', vehicleString);
    router.push('/client/home');
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar title="Vehicle Setup" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-[var(--primary)] p-4 rounded-2xl">
            <Car className="w-10 h-10 text-white" />
          </div>
        </div>

        <h2 className="text-xl text-center mb-2">Add your vehicle</h2>
        <p className="text-[var(--muted-foreground)] text-center mb-8">
          We'll use this to find compatible parts
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Make"
            placeholder="e.g. Toyota, VW, BMW"
            value={formData.make}
            onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            required
          />

          <Input
            label="Model"
            placeholder="e.g. Corolla, Polo, 320i"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            required
          />

          <Input
            label="Year"
            type="number"
            placeholder="e.g. 2018"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            required
          />

          <Input
            label="Engine"
            placeholder="e.g. 1.6 Petrol, 2.0 TSI"
            value={formData.engine}
            onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
            required
          />

          <div className="pt-4">
            <Button type="submit" fullWidth size="lg">
              Save Vehicle
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
