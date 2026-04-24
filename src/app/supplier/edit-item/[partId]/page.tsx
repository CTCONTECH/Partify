'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { mockParts, mockInventory } from '@/data/mockData';
import { getImportRepository } from '@/lib/adapters/factory';
import { Package, DollarSign, AlertCircle } from 'lucide-react';

const MOCK_SUPPLIER_ID = 's5';

export default function EditInventoryItem() {
  const params = useParams();
  const router = useRouter();
  const partId = params.partId as string;

  const part = mockParts.find(p => p.id === partId);
  const inventoryItem = mockInventory.find(inv => inv.partId === partId && inv.supplierId === MOCK_SUPPLIER_ID);

  const [formData, setFormData] = useState({
    price: inventoryItem?.price.toString() || '',
    stock: inventoryItem?.stock.toString() || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!part) {
      router.push('/supplier/inventory');
    }
  }, [part, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const repo = getImportRepository();
      const job = await repo.createJob(
        MOCK_SUPPLIER_ID,
        'manual',
        [{
          rowNumber: 1,
          rawPartNumber: part.partNumber,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10),
        }]
      );
      router.push(`/supplier/import/review/${job.id}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save. Please try again.');
      setSubmitting(false);
    }
  };

  if (!part) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar title="Edit Item" showBack />

      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Part #{part.partNumber}</p>
          <h2 className="text-xl mb-2">{part.partName}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{part.compatibility}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Price (ZAR)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            leftIcon={<DollarSign className="w-5 h-5" />}
            required
          />

          <Input
            label="Stock Quantity"
            type="number"
            placeholder="0"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            leftIcon={<Package className="w-5 h-5" />}
            required
          />

          <div className="bg-[var(--accent)] border border-[var(--primary)]/20 rounded-xl p-4">
            <h4 className="text-base mb-2">Low stock alert</h4>
            <p className="text-sm text-[var(--muted-foreground)]">
              You&apos;ll be notified when stock falls below 5 units
            </p>
          </div>

          {submitError && (
            <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => router.push('/supplier/inventory')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

