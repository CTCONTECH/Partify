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
import { useSupplierId } from '@/hooks/useSupplierId';
import { Part } from '@/types';
import {
  Search,
  Package,
  Hash,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  PlusCircle,
  Tag,
  Car,
} from 'lucide-react';


// ── Step 1: Search catalog ───────────────────────────────────────────────────

function CatalogSearch({
  onSelect,
  onCreateManual,
}: {
  onSelect: (part: Part) => void;
  onCreateManual: (query: string) => void;
}) {
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

      {query.trim().length > 0 && (
        <button
          type="button"
          onClick={() => onCreateManual(query.trim())}
          className="w-full bg-[var(--card)] border border-[var(--primary)]/30 rounded-2xl p-4 text-left active:bg-[var(--muted)] transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--primary)] mb-1">Can&apos;t find it? Submit a new part manually</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Use "{query.trim()}" as a starting point and send the part to staging for catalog review.
              </p>
            </div>
            <PlusCircle className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
          </div>
        </button>
      )}

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
        <div className="text-center py-6">
          <Package className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No matching parts found</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Try a different part number, name, or category, or use the manual submission card above.
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
  supplierId: string;
  onBack: () => void;
}

function PricingForm({ part, supplierId, onBack }: PricingFormProps) {
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
        supplierId,
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
        leftIcon={<span className="text-sm font-medium">R</span>}
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

interface ManualCandidateFormProps {
  supplierId: string;
  initialQuery: string;
  onBack: () => void;
}

function ManualCandidateForm({ supplierId, initialQuery, onBack }: ManualCandidateFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    supplierPartNumber: initialQuery,
    partName: '',
    category: '',
    compatibility: '',
    price: '',
    stock: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock, 10);

    if (!formData.supplierPartNumber.trim()) next.supplierPartNumber = 'Enter your part number.';
    if (!formData.partName.trim()) next.partName = 'Enter the part name.';
    if (!formData.category.trim()) next.category = 'Enter the category.';
    if (!formData.compatibility.trim()) next.compatibility = 'Enter vehicle compatibility.';
    if (!formData.price || isNaN(price) || price <= 0) next.price = 'Enter a valid price greater than zero.';
    if (!formData.stock || isNaN(stock) || stock < 0) next.stock = 'Enter a valid stock quantity (0 or more).';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const rawDescription = [
      `PART:${formData.partName.trim()}`,
      `CATEGORY:${formData.category.trim()}`,
      `COMPATIBILITY:${formData.compatibility.trim()}`,
    ].join(' | ');

    try {
      const repo = getImportRepository();
      const job = await repo.createJob(
        supplierId,
        'manual',
        [{
          rowNumber: 1,
          rawPartNumber: formData.supplierPartNumber.trim(),
          rawDescription,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10),
        }]
      );
      router.push(`/supplier/import/review/${job.id}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit part. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
        <p className="text-sm font-medium mb-1">Submit new part to staging</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          This part will not go live immediately. It lands in staging first so Partify can map it
          to an existing canonical part or create a new one.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[var(--primary)] mt-3 underline underline-offset-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to catalog search
        </button>
      </div>

      <Input
        label="Your part number"
        placeholder="e.g. OF-8921-A"
        value={formData.supplierPartNumber}
        onChange={e => setFormData({ ...formData, supplierPartNumber: e.target.value })}
        leftIcon={<Hash className="w-4 h-4" />}
        error={errors.supplierPartNumber}
        required
      />

      <Input
        label="Part name"
        placeholder="e.g. Oil Filter"
        value={formData.partName}
        onChange={e => setFormData({ ...formData, partName: e.target.value })}
        leftIcon={<Tag className="w-4 h-4" />}
        error={errors.partName}
        required
      />

      <Input
        label="Category"
        placeholder="e.g. Engine"
        value={formData.category}
        onChange={e => setFormData({ ...formData, category: e.target.value })}
        leftIcon={<Package className="w-4 h-4" />}
        error={errors.category}
        required
      />

      <Input
        label="Compatibility"
        placeholder="e.g. VW Golf 2012-2018"
        value={formData.compatibility}
        onChange={e => setFormData({ ...formData, compatibility: e.target.value })}
        leftIcon={<Car className="w-4 h-4" />}
        error={errors.compatibility}
        required
      />

      <Input
        label="Your price (ZAR)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        value={formData.price}
        onChange={e => setFormData({ ...formData, price: e.target.value })}
        leftIcon={<span className="text-sm font-medium">R</span>}
        error={errors.price}
        required
      />

      <Input
        label="Stock quantity"
        type="number"
        min="0"
        placeholder="0"
        value={formData.stock}
        onChange={e => setFormData({ ...formData, stock: e.target.value })}
        leftIcon={<Package className="w-4 h-4" />}
        error={errors.stock}
        required
      />

      {submitError && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Send to staging review'}
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={onBack} disabled={submitting}>
          Back
        </Button>
      </div>
    </form>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────

export default function AddPartPage() {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [manualSeed, setManualSeed] = useState('');
  const { supplierId, loading } = useSupplierId();

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Add Part" showBack />

      {/* Step indicator */}
      <div className="px-6 pt-4 pb-0 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${!selectedPart && !manualSeed ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
            {selectedPart || manualSeed
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : <span className="w-4 h-4 rounded-full border-2 border-[var(--primary)] flex items-center justify-center text-[10px] text-[var(--primary)] font-bold">1</span>
            }
            Find part
          </div>
          <div className="flex-1 h-px bg-[var(--border)]" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${selectedPart || manualSeed ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${selectedPart || manualSeed ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--muted-foreground)] text-[var(--muted-foreground)]'}`}>
              2
            </span>
            {selectedPart ? 'Set price & stock' : manualSeed ? 'Submit candidate' : 'Set price & stock'}
          </div>
        </div>
      </div>

      <div className="px-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-[var(--muted)] rounded-2xl" />
            ))}
          </div>
        ) : !supplierId ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            Supplier account not found. Please log in with a supplier account.
          </div>
        ) : !selectedPart && !manualSeed
          ? (
            <CatalogSearch
              onSelect={(part) => {
                setManualSeed('');
                setSelectedPart(part);
              }}
              onCreateManual={(query) => {
                setSelectedPart(null);
                setManualSeed(query);
              }}
            />
          )
          : selectedPart
            ? <PricingForm supplierId={supplierId} part={selectedPart} onBack={() => setSelectedPart(null)} />
            : <ManualCandidateForm supplierId={supplierId} initialQuery={manualSeed} onBack={() => setManualSeed('')} />
        }
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
