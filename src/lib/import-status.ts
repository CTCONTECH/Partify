import { ImportJob } from '@/types';

export type ImportDisplayState =
  | 'processing'
  | 'ready_to_approve'
  | 'needs_review'
  | 'catalogue_review'
  | 'imported'
  | 'rejected';

export function getImportDisplayState(job: Pick<ImportJob, 'status' | 'matchedCount' | 'unmatchedCount' | 'errorCount'>): ImportDisplayState {
  if (job.status === 'approved') return 'imported';
  if (job.status === 'rejected') return 'rejected';
  if (job.status === 'pending' || job.status === 'processing') return 'processing';
  if (job.status === 'error' || job.errorCount > 0) return 'needs_review';
  if (job.unmatchedCount > 0) return 'catalogue_review';
  if (job.matchedCount > 0) return 'ready_to_approve';
  return 'needs_review';
}

export function importDisplayLabel(state: ImportDisplayState): string {
  if (state === 'processing') return 'Processing';
  if (state === 'ready_to_approve') return 'Ready to approve';
  if (state === 'needs_review') return 'Needs review';
  if (state === 'catalogue_review') return 'Catalogue review';
  if (state === 'imported') return 'Imported';
  return 'Rejected';
}

export function importDisplayDescription(job: Pick<ImportJob, 'status' | 'matchedCount' | 'unmatchedCount' | 'errorCount'>): string {
  const state = getImportDisplayState(job);

  if (state === 'imported') {
    return `${job.matchedCount} row${job.matchedCount === 1 ? '' : 's'} imported into live inventory`;
  }

  if (state === 'rejected') {
    return 'Import was rejected';
  }

  if (state === 'processing') {
    return 'Import is being processed';
  }

  if (job.errorCount > 0) {
    return `${job.errorCount} row${job.errorCount === 1 ? '' : 's'} need correction before approval`;
  }

  if (state === 'catalogue_review') {
    return `${job.unmatchedCount} row${job.unmatchedCount === 1 ? '' : 's'} need catalogue review`;
  }

  if (job.matchedCount > 0) {
    return `${job.matchedCount} matched row${job.matchedCount === 1 ? '' : 's'} ready for approval`;
  }

  return 'Import is waiting for review';
}
