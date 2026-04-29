'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { useSupplierId } from '@/hooks/useSupplierId';
import { supplierService } from '@/lib/services/supplier-service';
import { InventoryItem } from '@/types';
import { AlertCircle, Ban, FileUp, Minus, Package, Plus } from 'lucide-react';

function stockVariant(stock: number) {
  if (stock === 0) return 'out-of-stock';
  if (stock < 5) return 'low-stock';
  return 'available';
}

export default function EditInventoryItem() {
  const params = useParams();
  const router = useRouter();
  const partId = params.partId as string;
  const { supplierId, loading: supplierLoading } = useSupplierId();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierLoading) return;

    if (!supplierId) {
      router.replace('/supplier/inventory');
      return;
    }

    const loadItem = async () => {
      setLoading(true);
      setError(null);

      try {
        const inventory = await supplierService.getSupplierInventory(supplierId);
        const currentItem = inventory.find(inv => inv.partId === partId);

        if (!currentItem) {
          setError('Inventory item not found.');
          return;
        }

        setItem(currentItem);
        setPrice(currentItem.price.toFixed(2));
        setStock(currentItem.stock.toString());
      } catch (err: any) {
        setError(err?.message || 'Could not load inventory item.');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [partId, router, supplierId, supplierLoading]);

  const updateStockValue = (nextStock: number) => {
    setStock(Math.max(0, nextStock).toString());
    setSaved(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!item) return;

    const parsedPrice = Number(price);
    const parsedStock = Number.parseInt(stock, 10);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Enter a valid price.');
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError('Enter a valid stock quantity.');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const inventoryId = item.id || item.partId;
      await Promise.all([
        supplierService.updatePrice(inventoryId, parsedPrice),
        supplierService.updateStock(inventoryId, parsedStock),
      ]);

      setItem({
        ...item,
        price: parsedPrice,
        stock: parsedStock,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
      setPrice(parsedPrice.toFixed(2));
      setStock(parsedStock.toString());
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || 'Could not save inventory item.');
    } finally {
      setSaving(false);
    }
  };

  const currentStock = Number.parseInt(stock || '0', 10) || 0;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Edit Item" showBack />

      <div className="p-6 max-w-md mx-auto">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-[var(--muted)] rounded-2xl" />
            <div className="h-12 bg-[var(--muted)] rounded-xl" />
            <div className="h-12 bg-[var(--muted)] rounded-xl" />
          </div>
        ) : (
          <>
            {item && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--muted-foreground)] mb-1">
                      Part #{item.partNumber}
                    </p>
                    <h2 className="text-xl mb-2">{item.partName}</h2>
                    {item.category && (
                      <p className="text-sm text-[var(--muted-foreground)]">{item.category}</p>
                    )}
                  </div>
                  <Badge variant={stockVariant(currentStock)} size="sm">
                    {currentStock} in stock
                  </Badge>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5">
                <p className="text-sm text-green-700">Inventory item saved.</p>
              </div>
            )}

            {item && (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileUp className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base mb-1">Quick correction</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Use this for one-off stock or price fixes. For full catalog updates, upload a CSV.
                      </p>
                    </div>
                  </div>
                </div>

                <Input
                  label="Price (ZAR)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setSaved(false);
                  }}
                  leftIcon={<span className="text-sm font-medium">R</span>}
                  required
                />

                <div>
                  <Input
                    label="Stock Quantity"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => {
                      setStock(e.target.value);
                      setSaved(false);
                    }}
                    leftIcon={<Package className="w-5 h-5" />}
                    required
                  />

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateStockValue(currentStock - 1)}
                      disabled={saving || currentStock === 0}
                      className="px-3"
                    >
                      <Minus className="w-4 h-4" />
                      1
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateStockValue(currentStock + 1)}
                      disabled={saving}
                      className="px-3"
                    >
                      <Plus className="w-4 h-4" />
                      1
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateStockValue(0)}
                      disabled={saving || currentStock === 0}
                      className="px-3"
                    >
                      <Ban className="w-4 h-4" />
                      Out
                    </Button>
                  </div>
                </div>

                <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-4">
                  <h4 className="text-base mb-1">Low stock alert</h4>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    This item is treated as low stock when quantity is below 5.
                  </p>
                </div>

                <div className="pt-3 space-y-3">
                  <Button type="submit" fullWidth size="lg" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={() => router.push('/supplier/inventory')}
                    disabled={saving}
                  >
                    Back to Inventory
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
