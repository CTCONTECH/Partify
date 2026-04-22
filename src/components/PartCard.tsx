import { ChevronRight } from 'lucide-react';

interface PartCardProps {
  part: {
    id: string;
    partNumber: string;
    partName: string;
    compatibility: string;
    supplierCount: number;
    priceRange: { min: number; max: number };
  };
  onClick?: () => void;
}

export function PartCard({ part, onClick }: PartCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-left active:bg-[var(--muted)] transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Part #{part.partNumber}</p>
          <h3 className="text-base mb-2">{part.partName}</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">{part.compatibility}</p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Suppliers</p>
              <p className="text-sm">{part.supplierCount}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Price range</p>
              <p className="text-sm">R {part.priceRange.min} - R {part.priceRange.max}</p>
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] flex-shrink-0 ml-2" />
      </div>
    </button>
  );
}
