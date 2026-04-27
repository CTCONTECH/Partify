'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { vehicleService } from '@/lib/services/vehicle-service';
import {
  getVehicleEngines,
  getVehicleMakes,
  getVehicleModels,
  getVehicleYears,
} from '@/lib/vehicle-catalog';
import { Car } from 'lucide-react';

export default function VehicleSetup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    engine: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makes = getVehicleMakes();
  const models = formData.make ? getVehicleModels(formData.make) : [];
  const years = formData.make && formData.model ? getVehicleYears(formData.make, formData.model) : [];
  const engines = formData.make && formData.model && formData.year
    ? getVehicleEngines(formData.make, formData.model, Number(formData.year))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await vehicleService.savePrimaryVehicle({
        make: formData.make,
        model: formData.model,
        year: Number(formData.year),
        engine: formData.engine,
      });
      router.push('/client/home');
    } catch (err: any) {
      setError(err?.message || 'Could not save vehicle. Please try again.');
      setSubmitting(false);
    }
  };

  const selectClass = 'w-full h-12 px-4 bg-[var(--input-background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-50';

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
          <div>
            <label className="block text-sm mb-2 text-[var(--foreground)]">Make</label>
            <select
              className={selectClass}
              value={formData.make}
              onChange={(e) => setFormData({ make: e.target.value, model: '', year: '', engine: '' })}
              required
            >
              <option value="">Select make</option>
              {makes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[var(--foreground)]">Model</label>
            <select
              className={selectClass}
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value, year: '', engine: '' })}
              disabled={!formData.make}
              required
            >
              <option value="">Select model</option>
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[var(--foreground)]">Year</label>
            <select
              className={selectClass}
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value, engine: '' })}
              disabled={!formData.model}
              required
            >
              <option value="">Select year</option>
              {years.map(year => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2 text-[var(--foreground)]">Engine</label>
            <select
              className={selectClass}
              value={formData.engine}
              onChange={(e) => setFormData({ ...formData, engine: e.target.value })}
              disabled={!formData.year}
              required
            >
              <option value="">Select engine</option>
              {engines.map(engine => (
                <option key={engine} value={engine}>{engine}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}

          <div className="pt-4">
            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Vehicle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
