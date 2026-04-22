import { MapPin, Package } from 'lucide-react';
import { Badge } from './Badge';

interface SupplierCardProps {
  supplier: {
    id: string;
    name: string;
    location: string;
    distance: number;
    itemPrice: number;
    fuelCost: number;
    totalCost: number;
    stockQty: number;
    isBestPrice?: boolean;
    isClosest?: boolean;
    isBestTotal?: boolean;
  };
  onClick?: () => void;
}

export function SupplierCard({ supplier, onClick }: SupplierCardProps) {
  const stockStatus = supplier.stockQty === 0 ? 'out-of-stock' : supplier.stockQty < 5 ? 'low-stock' : 'available';

  return (
    <button
      onClick={onClick}
      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-left active:bg-[var(--muted)] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-base mb-1">{supplier.name}</h3>
          <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
            <MapPin className="w-4 h-4" />
            <span>{supplier.location} • {supplier.distance}km</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {supplier.isBestPrice && <Badge variant="best-price" size="sm">Best Price</Badge>}
          {supplier.isClosest && <Badge variant="closest" size="sm">Closest</Badge>}
          {supplier.isBestTotal && <Badge variant="best-price" size="sm">Best Total</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-[var(--muted-foreground)]" />
        <Badge variant={stockStatus} size="sm">
          {supplier.stockQty === 0 ? 'Out of stock' : `${supplier.stockQty} in stock`}
        </Badge>
      </div>

      <div className="flex items-end justify-between pt-3 border-t border-[var(--border)]">
        <div>
          <p className="text-xs text-[var(--muted-foreground)] mb-1">Item price</p>
          <p className="text-lg">R {supplier.itemPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted-foreground)] mb-1">+ Fuel: R {supplier.fuelCost.toFixed(2)}</p>
          <p className="text-xl text-[var(--primary)]">R {supplier.totalCost.toFixed(2)}</p>
        </div>
      </div>
    </button>
  );
}
