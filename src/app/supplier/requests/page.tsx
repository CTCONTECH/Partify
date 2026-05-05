'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Badge } from '@/components/Badge';
import { getImportRepository } from '@/lib/adapters/factory';
import { useSupplierId } from '@/hooks/useSupplierId';
import {
  getImportDisplayState,
  importDisplayDescription,
  importDisplayLabel,
  ImportDisplayState,
} from '@/lib/import-status';
import { ImportJob } from '@/types';
import { ArrowLeft, ChevronRight, FileWarning, Clock, CheckCircle2, XCircle } from 'lucide-react';

function statusVariant(state: ImportDisplayState) {
  if (state === 'imported') return 'success';
  if (state === 'rejected' || state === 'needs_review') return 'error';
  if (state === 'catalogue_review' || state === 'ready_to_approve') return 'warning';
  return 'info';
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
        const requests = all.filter((job) => job.sourceType === 'manual');
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
      open: jobs.filter((job) => {
        const state = getImportDisplayState(job);
        return state === 'processing' || state === 'ready_to_approve' || state === 'needs_review' || state === 'catalogue_review';
      }).length,
      imported: jobs.filter((job) => getImportDisplayState(job) === 'imported').length,
      rejected: jobs.filter((job) => getImportDisplayState(job) === 'rejected').length,
    };
  }, [jobs]);

  if (loading || supplierLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
        <div className="xl:hidden">
          <TopBar title="Part Requests" showBack />
        </div>
        <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--muted)] rounded-2xl xl:rounded-lg" />
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
          <TopBar title="Part Requests" showBack />
        </div>
        <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl xl:rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
        <BottomNav role="supplier" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
      <div className="xl:hidden">
        <TopBar title="Part Requests" showBack />
      </div>

      <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto space-y-5">
        <div className="hidden xl:flex items-start justify-between gap-6">
          <div>
            <button
              type="button"
              onClick={() => router.push('/supplier/inventory')}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to inventory
            </button>
            <h1 className="text-3xl">Part Requests</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Track manual part submissions and catalogue review outcomes.
            </p>
          </div>
          <button
            onClick={() => router.push('/supplier/add-part')}
            className="h-11 px-4 rounded-lg bg-[var(--primary)] text-white text-sm hover:opacity-95"
          >
            Create Request
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 xl:max-w-3xl">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-3 text-center">
            <Clock className="w-4 h-4 mx-auto text-amber-600 mb-1" />
            <p className="text-lg font-semibold">{stats.open}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Open</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto text-green-600 mb-1" />
            <p className="text-lg font-semibold">{stats.imported}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Imported</p>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-3 text-center">
            <XCircle className="w-4 h-4 mx-auto text-red-600 mb-1" />
            <p className="text-lg font-semibold">{stats.rejected}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Rejected</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-8 xl:p-12 text-center xl:max-w-3xl">
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
          <div className="space-y-3 xl:bg-[var(--card)] xl:border xl:border-[var(--border)] xl:rounded-lg xl:overflow-hidden xl:space-y-0">
            <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_170px_130px_32px] gap-3 px-4 py-3 bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <span>Request</span>
              <span>Status</span>
              <span>Updated</span>
              <span />
            </div>
            {jobs.map((job) => {
              const displayState = getImportDisplayState(job);

              return (
                <button
                  key={job.id}
                  onClick={() => router.push(`/supplier/import/review/${job.id}`)}
                  className="w-full bg-[var(--card)] border border-[var(--border)] xl:border-0 xl:border-b xl:last:border-b-0 rounded-2xl xl:rounded-none p-4 text-left active:bg-[var(--muted)] xl:hover:bg-[var(--muted)] transition-colors"
                >
                  <div className="flex xl:grid xl:grid-cols-[minmax(0,1fr)_170px_130px_32px] items-start xl:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {job.fileName || `Manual request - ${toFriendlyDate(job.createdAt)}`}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {importDisplayDescription(job)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 xl:hidden">
                        Updated {toFriendlyDate(job.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col xl:contents items-end gap-2">
                      <Badge variant={statusVariant(displayState)} size="sm">
                        {importDisplayLabel(displayState)}
                      </Badge>
                      <span className="hidden xl:inline text-xs text-[var(--muted-foreground)]">
                        {toFriendlyDate(job.updatedAt)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
