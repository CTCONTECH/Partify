'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { mockParts, mockInventory } from '@/data/mockData';
import { Package, DollarSign } from 'lucide-react';

export default function EditInventoryItem() {
  const params = useParams();
  const router = useRouter();
  const partId = params.partId as string;

  const part = mockParts.find(p => p.id === partId);
  const inventoryItem = mockInventory.find(inv => inv.partId === partId && inv.supplierId === 's5');

  const [formData, setFormData] = useState({
    price: inventoryItem?.price.toString() || '',
    stock: inventoryItem?.stock.toString() || ''
  });

  useEffect(() => {
    if (!part) {
      router.push('/supplier/inventory');
    }
  }, [part, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/supplier/inventory');
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
              You'll be notified when stock falls below 5 units
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button type="submit" fullWidth size="lg">
              Save Changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => router.push('/supplier/inventory')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
