import { MapPin, Package, Tag } from 'lucide-react';
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
  const isHighlighted = supplier.isBestPrice || supplier.isClosest || supplier.isBestTotal;

  return (
    <button
      onClick={onClick}
      className={`
        w-full bg-[var(--card)] border rounded-2xl p-5 text-left
        transition-all duration-200 ease-in-out
        hover:shadow-md active:scale-[0.99]
        ${isHighlighted
          ? 'border-[var(--primary)] border-t-4 shadow-md'
          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
        }
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            {supplier.name}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <MapPin className="w-4 h-4" />
            <span>{supplier.location} • {supplier.distance}km</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {supplier.isBestPrice && <Badge variant="best-price" size="sm">Best Price</Badge>}
          {supplier.isClosest && <Badge variant="closest" size="sm">Closest</Badge>}
          {supplier.isBestTotal && <Badge variant="best-price" size="sm">Best Total</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
        <Badge variant={stockStatus} size="sm">
          {supplier.stockQty === 0 ? 'Out of stock' : `${supplier.stockQty} in stock`}
        </Badge>
      </div>

      <div className="pt-4 border-t border-[var(--border)] space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">Item price</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              R {supplier.itemPrice.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">
              + Fuel: R {supplier.fuelCost.toFixed(2)}
            </p>
            <p className="text-2xl font-bold bg-gradient-to-br from-[var(--primary)] to-[#D84315] bg-clip-text text-transparent">
              R {supplier.totalCost.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="w-full bg-gradient-to-br from-[var(--primary)] to-[#D84315] text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 pointer-events-none shadow-sm">
          <Tag className="w-4 h-4" />
          <span>Get Coupon</span>
        </div>
      </div>
    </button>
  );
}
