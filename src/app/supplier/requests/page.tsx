'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/Badge';
import { getImportRepository } from '@/lib/adapters/factory';
import { useSupplierId } from '@/hooks/useSupplierId';
import { ImportJob } from '@/types';
import { ChevronRight, FileWarning, Clock, CheckCircle2, XCircle } from 'lucide-react';


function statusVariant(status: ImportJob['status']) {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'error') return 'error';
  if (status === 'review') return 'warning';
  return 'info';
}

function statusLabel(status: ImportJob['status']) {
  if (status === 'processing') return 'Processing';
  if (status === 'review') return 'In Review';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'error') return 'Error';
  return 'Pending';
}

function toFriendlyDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SupplierRequestsPage() {
  const router = useRouter();
  const { supplierId, loading: supplierLoading } = useSupplierId();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!supplierId) {
        setLoading(false);
        return;
      }

      try {
        const repo = getImportRepository();
        const all = await repo.getJobs(supplierId);
        // Part requests are manual submissions that still need matching/catalog review.
        const requests = all.filter(j => j.sourceType === 'manual');
        setJobs(requests);
      } catch (e: any) {
        setError(e?.message || 'Failed to load pending requests.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supplierId]);

  const stats = useMemo(() => {
    return {
      review: jobs.filter(j => j.status === 'review' || j.status === 'processing' || j.status === 'pending').length,
      approved: jobs.filter(j => j.status === 'approved').length,
      rejected: jobs.filter(j => j.status === 'rejected' || j.status === 'error').length,
    };
  }, [jobs]);

  if (loading || supplierLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-20">
        <TopBar title="Part Requests" showBack />
        <div className="p-6 max-w-2xl mx-auto space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--muted)] rounded-2xl" />
          ))}
        </div>
        <BottomNav role="supplier" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-20">
        <TopBar title="Part Requests" showBack />
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
        <BottomNav role="supplier" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Part Requests" showBack />

      <div className="p-6 max-w-2xl mx-auto space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 text-center">
            <Clock className="w-4 h-4 mx-auto text-amber-600 mb-1" />
            <p className="text-lg font-semibold">{stats.review}</p>
            <p className="text-xs text-[var(--muted-foreground)]">In Review</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-semibold">{stats.approved}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Approved</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 text-center">
            <XCircle className="w-4 h-4 mx-auto text-red-600 mb-1" />
            <p className="text-lg font-semibold">{stats.rejected}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Rejected</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <FileWarning className="w-8 h-8 mx-auto text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium mb-1">No part requests yet</p>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Manual submissions from Add Part will show here for tracking.
            </p>
            <button
              onClick={() => router.push('/supplier/add-part')}
              className="text-sm text-[var(--primary)] underline"
            >
              Create first request
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <button
                key={job.id}
                onClick={() => router.push(`/supplier/import/review/${job.id}`)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-left active:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {job.fileName || `Manual request • ${toFriendlyDate(job.createdAt)}`}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {job.rowCount} row{job.rowCount !== 1 ? 's' : ''} • {job.matchedCount} matched • {job.unmatchedCount} waiting review
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Updated {toFriendlyDate(job.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusVariant(job.status)} size="sm">{statusLabel(job.status)}</Badge>
                    <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
