'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { getImportRepository, getPartsRepository } from '@/lib/adapters/factory';
import { getImportDisplayState, importDisplayDescription, importDisplayLabel, ImportDisplayState } from '@/lib/import-status';
import { ImportJob, ImportRow, Part } from '@/types';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

function parseManualDescription(rawDescription?: string) {
  if (!rawDescription?.includes('PART:')) return null;

  const values = rawDescription.split(' | ').reduce((acc, piece) => {
    const [key, value] = piece.split(':');
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  return {
    partName: values.PART,
    category: values.CATEGORY,
    compatibility: values.COMPATIBILITY,
  };
}

// ── Status badge helper ──────────────────────────────────────────────────────

function MatchBadge({ status }: { status: ImportRow['matchStatus'] }) {
  if (status === 'matched') return <Badge variant="available" size="sm">Matched</Badge>;
  if (status === 'unmatched') return <Badge variant="low-stock" size="sm">Unmatched</Badge>;
  if (status === 'error') return <Badge variant="out-of-stock" size="sm">Error</Badge>;
  if (status === 'skipped') return <Badge variant="out-of-stock" size="sm">Skipped</Badge>;
  return <Badge variant="low-stock" size="sm">Pending</Badge>;
}

function importStatusVariant(state: ImportDisplayState) {
  if (state === 'imported') return 'success';
  if (state === 'rejected' || state === 'needs_review') return 'error';
  if (state === 'catalogue_review' || state === 'ready_to_approve') return 'warning';
  return 'info';
}

function matchReasonLabel(reason?: string): string | null {
  if (!reason) return null;
  if (reason === 'supplier_alias_exact') return 'Matched by your supplier alias';
  if (reason === 'global_alias_exact') return 'Matched by catalogue alias';
  if (reason === 'canonical_part_number_exact') return 'Matched by canonical part number';
  if (reason === 'manual_review_assignment') return 'Assigned manually';
  if (reason.startsWith('ambiguous_')) return 'Needs review: multiple possible matches';
  if (reason === 'no_alias_or_canonical_match') return 'Needs review: no catalogue match';
  return reason.replace(/_/g, ' ');
}

// ── Row resolve widget ───────────────────────────────────────────────────────

function ResolveRow({
  row,
  parts,
  onResolved,
}: {
  row: ImportRow;
  parts: Part[];
  onResolved: (rowId: string, partId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = parts.filter(p =>
    p.partNumber.toLowerCase().includes(query.toLowerCase()) ||
    p.partName.toLowerCase().includes(query.toLowerCase())
  );

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const repo = getImportRepository();
      await repo.resolveRow(row.id, selected);
      onResolved(row.id, selected);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--primary)] underline underline-offset-2"
      >
        Assign manually
      </button>
    );
  }

  return (
    <div className="mt-2 bg-[var(--muted)] rounded-xl p-3 space-y-2">
      <input
        type="text"
        placeholder="Search part name or number…"
        className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 bg-[var(--background)]"
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      <div className="max-h-36 overflow-y-auto divide-y divide-[var(--border)]">
        {filtered.slice(0, 20).map(p => (
          <label key={p.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input
              type="radio"
              name={`resolve-${row.id}`}
              value={p.id}
              checked={selected === p.id}
              onChange={() => setSelected(p.id)}
            />
            <span className="text-xs font-mono">{p.partNumber}</span>
            <span className="text-xs text-[var(--muted-foreground)]">{p.partName}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--muted-foreground)] py-2">No matching parts found.</p>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="primary" className="text-xs py-1.5 px-3" onClick={handleSave} disabled={!selected || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <button onClick={() => setOpen(false)} className="text-xs text-[var(--muted-foreground)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ImportReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();

  const [job, setJob] = useState<ImportJob | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [done, setDone] = useState<{ upserted: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [importRepo, partsRepo] = [getImportRepository(), getPartsRepository()];
        const [result, allParts] = await Promise.all([
          importRepo.getJobWithRows(jobId as string),
          partsRepo.searchParts(''),
        ]);

        if (!result) {
          setError('Import job not found.');
          return;
        }
        setJob(result.job);
        setRows(result.rows);
        setParts(allParts);
      } catch (e: any) {
        setError(e?.message || 'Failed to load import job.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  function handleResolved(rowId: string, partId: string) {
    setRows(prev =>
      prev.map(r =>
        r.id === rowId
          ? { ...r, matchStatus: 'matched', matchedPartId: partId, matchReason: 'manual_review_assignment', matchConfidence: 1, errorReason: undefined }
          : r
      )
    );
    setJob(prev => {
      if (!prev) return prev;
      const matched = rows.filter(r => r.id === rowId ? true : r.matchStatus === 'matched').length;
      const unmatched = rows.filter(r => r.id === rowId ? false : r.matchStatus === 'unmatched').length;
      return { ...prev, matchedCount: matched, unmatchedCount: unmatched };
    });
  }

  async function handleApprove() {
    if (!job) return;
    setApproving(true);
    try {
      const result = await getImportRepository().approveJob(job.id);
      setDone(result);
      setJob(prev => prev ? { ...prev, status: 'approved' } : prev);
    } catch (e: any) {
      setError(e?.message || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!job) return;
    setRejecting(true);
    try {
      await getImportRepository().rejectJob(job.id);
      router.push('/supplier/inventory');
    } catch (e: any) {
      setError(e?.message || 'Rejection failed.');
      setRejecting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
        <div className="xl:hidden">
          <TopBar title="Review Import" showBack />
        </div>
        <div className="p-6 xl:px-10 xl:py-8 space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--muted)] rounded-2xl xl:rounded-lg" />
          ))}
        </div>
        <BottomNav role="supplier" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
        <div className="xl:hidden">
          <TopBar title="Review Import" showBack />
        </div>
        <div className="p-6 xl:px-10 xl:py-8">
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl xl:rounded-lg p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <BottomNav role="supplier" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center pb-20 xl:pb-8 xl:pl-64 px-6">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Import approved</h2>
        <p className="text-[var(--muted-foreground)] text-center mb-6">
          {done.upserted} item{done.upserted !== 1 ? 's' : ''} added or updated in your live inventory.
        </p>
        <Button variant="primary" onClick={() => router.push('/supplier/inventory')}>
          Back to Inventory
        </Button>
        <BottomNav role="supplier" />
      </div>
    );
  }

  const matched = rows.filter(r => r.matchStatus === 'matched').length;
  const unmatched = rows.filter(r => r.matchStatus === 'unmatched').length;
  const rowErrors = rows.filter(r => r.matchStatus === 'error').length;
  const isApproved = job?.status === 'approved' || job?.status === 'rejected';
  const hasCatalogCandidate = rows.some(r => r.matchStatus === 'unmatched' && !!parseManualDescription(r.rawDescription));
  const displayState = job ? getImportDisplayState(job) : 'needs_review';

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
      <div className="xl:hidden">
        <TopBar title="Review Import" showBack />
      </div>

      <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto space-y-5">
        <div className="hidden xl:flex items-start justify-between gap-6">
          <div>
            <button
              type="button"
              onClick={() => router.push('/supplier/import')}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] mb-2"
            >
              Back to import
            </button>
            <h1 className="text-3xl">Review Import</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Validate matched rows before publishing supplier stock to live inventory.
            </p>
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-4 xl:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {job?.fileName ? job.fileName : `${job?.sourceType ?? 'Import'} job`}
            </p>
            <Badge variant={importStatusVariant(displayState)} size="sm">
              {importDisplayLabel(displayState)}
            </Badge>
          </div>
          {job && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {importDisplayDescription(job)}
            </p>
          )}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-[var(--muted)] rounded-xl p-2">
              <p className="text-lg font-semibold">{rows.length}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-2">
              <p className="text-lg font-semibold text-green-600">{matched}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Matched</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-2">
              <p className="text-lg font-semibold text-amber-600">{unmatched}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Unmatched</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-2">
              <p className="text-lg font-semibold text-red-600">{rowErrors}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Errors</p>
            </div>
          </div>
          {rowErrors > 0 && !isApproved && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                Fix or remove error rows before approving this import.
              </p>
            </div>
          )}
          {unmatched > 0 && !isApproved && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                {hasCatalogCandidate
                  ? 'This submission includes a part that is not yet in the canonical catalog. It stays in staging until Partify maps it to an existing part or creates a new canonical part.'
                  : matched > 0
                    ? `${unmatched} row${unmatched !== 1 ? 's' : ''} could not be matched automatically. Assign them manually below, or approve now to import only the matched rows.`
                    : `${unmatched} row${unmatched !== 1 ? 's' : ''} could not be matched automatically. Assign them manually below, or reject this import.`}
              </p>
            </div>
          )}
        </div>

        {/* Row list */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg overflow-hidden">
          <p className="text-sm font-medium px-4 py-3 border-b border-[var(--border)]">Rows</p>
          <div className="hidden xl:grid grid-cols-[minmax(0,1.5fr)_120px_110px_130px] gap-3 px-4 py-2 bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <span>Supplier Row</span>
            <span>Status</span>
            <span className="text-right">Price</span>
            <span>Stock</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {rows.map(row => {
              const matchedPart = row.matchedPartId
                ? parts.find(p => p.id === row.matchedPartId)
                : undefined;
              const manualDescription = parseManualDescription(row.rawDescription);
              const matchReason = matchReasonLabel(row.matchReason);

              return (
                <div key={row.id} className="px-4 py-3">
                  <div className="flex xl:grid xl:grid-cols-[minmax(0,1.5fr)_120px_110px_130px] items-start xl:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono">{row.rawPartNumber}</p>
                      {matchedPart && (
                        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                          → {matchedPart.partName} ({matchedPart.partNumber})
                        </p>
                      )}
                      {manualDescription && !matchedPart && (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs text-[var(--foreground)]">{manualDescription.partName}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{manualDescription.category}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{manualDescription.compatibility}</p>
                        </div>
                      )}
                      {row.rawDescription && !matchedPart && !manualDescription && (
                        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                          {row.rawDescription}
                        </p>
                      )}
                      {row.errorReason && (
                        <p className="text-xs text-red-500 mt-0.5">{row.errorReason}</p>
                      )}
                      {matchReason && !row.errorReason && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{matchReason}</p>
                      )}
                    </div>
                    <div className="flex flex-col xl:contents items-end gap-1 flex-shrink-0">
                      <MatchBadge status={row.matchStatus} />
                      <span className="text-xs text-[var(--muted-foreground)] xl:text-right">
                        {row.price !== undefined ? `R${row.price.toFixed(2)}` : '-'}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {row.stock !== undefined ? `${row.stock} qty` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Manual resolution UI for unmatched rows */}
                  {row.matchStatus === 'unmatched' && !isApproved && (
                    manualDescription
                      ? <p className="text-xs text-[var(--muted-foreground)] mt-2">Waiting for catalog review by Partify.</p>
                      : <ResolveRow row={row} parts={parts} onResolved={handleResolved} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl xl:rounded-lg p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        {!isApproved && (
          <div className="flex gap-3 xl:max-w-xl xl:ml-auto">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleApprove}
              disabled={approving || rejecting || matched === 0}
            >
              {approving ? 'Approving…' : `Approve ${matched} matched`}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleReject}
              disabled={approving || rejecting}
            >
              {rejecting ? 'Rejecting…' : 'Reject all'}
            </Button>
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
