'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { SearchBar } from '@/components/SearchBar';
import { Badge } from '@/components/Badge';
import { getPartsRepository, getImportRepository } from '@/lib/adapters/factory';
import { Part } from '@/types';
import {
  Search,
  Package,
  DollarSign,
  Hash,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

const MOCK_SUPPLIER_ID = 's5';

// ── Step 1: Search catalog ───────────────────────────────────────────────────

function CatalogSearch({ onSelect }: { onSelect: (part: Part) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const repo = getPartsRepository();
        const parts = await repo.searchParts(query.trim());
        setResults(parts);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Search the Partify catalog to find the part you stock. You&apos;ll enter your price and stock
          quantity in the next step.
        </p>
        <SearchBar
          placeholder="Part number, name or category…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          showClear={query.length > 0}
          autoFocus
        />
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--muted)] rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map(part => (
            <button
              key={part.id}
              onClick={() => onSelect(part)}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-left active:bg-[var(--muted)] transition-colors flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--muted-foreground)] font-mono mb-0.5">
                  {part.partNumber}
                </p>
                <p className="text-base font-medium truncate">{part.partName}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">
                  {part.compatibility}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge variant="available" size="sm">{part.category}</Badge>
                <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-10">
          <Package className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No matching parts found</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Try a different part number, name, or category.
            If the part isn&apos;t in the catalog yet, contact Partify to have it added.
          </p>
        </div>
      )}

      {!loading && !searched && (
        <div className="text-center py-10">
          <Search className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Start typing to search the catalog
          </p>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Enter pricing details ────────────────────────────────────────────

interface PricingFormProps {
  part: Part;
  onBack: () => void;
}

function PricingForm({ part, onBack }: PricingFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    price: '',
    stock: '',
    supplierPartNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock, 10);

    if (!formData.price || isNaN(price) || price <= 0) {
      next.price = 'Enter a valid price greater than zero.';
    }
    if (!formData.stock || isNaN(stock) || stock < 0) {
      next.stock = 'Enter a valid stock quantity (0 or more).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    // Use supplier's own part number if provided, otherwise fall back to canonical number.
    // This way, the alias system registers the supplier number for future auto-matching.
    const rawPartNumber = formData.supplierPartNumber.trim() || part.partNumber;

    try {
      const repo = getImportRepository();
      const job = await repo.createJob(
        MOCK_SUPPLIER_ID,
        'manual',
        [{
          rowNumber: 1,
          rawPartNumber,
          rawDescription: part.partName,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10),
        }]
      );
      router.push(`/supplier/import/review/${job.id}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Selected part card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--muted-foreground)] font-mono mb-0.5">
              {part.partNumber}
            </p>
            <p className="text-base font-medium">{part.partName}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{part.compatibility}</p>
          </div>
          <Badge variant="available" size="sm">{part.category}</Badge>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[var(--primary)] mt-3 underline underline-offset-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Choose a different part
        </button>
      </div>

      {/* Your part number (alias) */}
      <div>
        <Input
          label="Your part number (optional)"
          placeholder={part.partNumber}
          value={formData.supplierPartNumber}
          onChange={e => setFormData({ ...formData, supplierPartNumber: e.target.value })}
          leftIcon={<Hash className="w-4 h-4" />}
        />
        <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
          If you use a different number for this part (e.g. from your supplier), enter it here.
          It will be saved as an alias for future imports.
        </p>
      </div>

      {/* Price */}
      <Input
        label="Your price (ZAR)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        value={formData.price}
        onChange={e => {
          setFormData({ ...formData, price: e.target.value });
          if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
        }}
        leftIcon={<DollarSign className="w-4 h-4" />}
        error={errors.price}
        required
      />

      {/* Stock */}
      <Input
        label="Stock quantity"
        type="number"
        min="0"
        placeholder="0"
        value={formData.stock}
        onChange={e => {
          setFormData({ ...formData, stock: e.target.value });
          if (errors.stock) setErrors(prev => ({ ...prev, stock: '' }));
        }}
        leftIcon={<Package className="w-4 h-4" />}
        error={errors.stock}
        required
      />

      {/* Low stock note */}
      <div className="bg-[var(--accent)] border border-[var(--primary)]/20 rounded-xl p-4">
        <p className="text-sm font-medium mb-1">Low stock alerts</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          You&apos;ll be notified automatically when stock drops below 5 units.
        </p>
      </div>

      {submitError && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? 'Saving…' : 'Review & confirm'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </Button>
      </div>
    </form>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────

export default function AddPartPage() {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Add Part" showBack />

      {/* Step indicator */}
      <div className="px-6 pt-4 pb-0 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${!selectedPart ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
            {selectedPart
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : <span className="w-4 h-4 rounded-full border-2 border-[var(--primary)] flex items-center justify-center text-[10px] text-[var(--primary)] font-bold">1</span>
            }
            Find part
          </div>
          <div className="flex-1 h-px bg-[var(--border)]" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${selectedPart ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${selectedPart ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--muted-foreground)] text-[var(--muted-foreground)]'}`}>
              2
            </span>
            Set price &amp; stock
          </div>
        </div>
      </div>

      <div className="px-6 max-w-2xl mx-auto">
        {!selectedPart
          ? <CatalogSearch onSelect={setSelectedPart} />
          : <PricingForm part={selectedPart} onBack={() => setSelectedPart(null)} />
        }
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
