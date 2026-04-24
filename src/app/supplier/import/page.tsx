'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { getImportRepository } from '@/lib/adapters/factory';
import { ImportRowInput } from '@/types';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';

// ── CSV parsing ──────────────────────────────────────────────────────────────

type ParsedRow = ImportRowInput & { _raw: string; _error?: string };

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // Detect header row — if first cell can't be a part number it's a header
  const firstCell = lines[0].split(',')[0].trim().toLowerCase();
  const hasHeader = ['part', 'part_number', 'part number', 'number', 'sku', 'code'].some(h =>
    firstCell.includes(h)
  );
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, idx) => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [rawPartNumber = '', rawDescription = '', priceRaw = '', stockRaw = ''] = cols;

    if (!rawPartNumber) {
      return {
        rowNumber: idx + 1,
        rawPartNumber: '',
        _raw: line,
        _error: 'Missing part number',
      };
    }

    const price = parseFloat(priceRaw);
    const stock = parseInt(stockRaw, 10);

    return {
      rowNumber: idx + 1,
      rawPartNumber,
      rawDescription: rawDescription || undefined,
      price: isNaN(price) ? undefined : price,
      stock: isNaN(stock) ? undefined : stock,
      _raw: line,
    };
  });
}

// ── Component ────────────────────────────────────────────────────────────────

const MOCK_SUPPLIER_ID = 's5';

export default function SupplierImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validRows = parsedRows.filter(r => !r._error && r.rawPartNumber);
  const errorRows = parsedRows.filter(r => r._error);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setSubmitError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setParseError('No data rows found in the file.');
          setParsedRows([]);
          return;
        }
        setParsedRows(rows);
      } catch {
        setParseError('Could not parse CSV. Check the file format.');
        setParsedRows([]);
      }
    };
    reader.readAsText(file);
  }

  function clearFile() {
    setFileName(null);
    setParsedRows([]);
    setParseError(null);
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const repo = getImportRepository();
      const job = await repo.createJob(
        MOCK_SUPPLIER_ID,
        'csv',
        validRows,
        fileName ?? undefined
      );
      router.push(`/supplier/import/review/${job.id}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit import. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      <TopBar title="Import Inventory" showBack />

      <div className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Format guidance */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Expected CSV format</p>
              <p className="text-xs text-[var(--muted-foreground)] font-mono">
                part_number, description, price, stock
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Header row is optional. Price and stock columns are optional but recommended.
              </p>
            </div>
          </div>
        </div>

        {/* File drop zone */}
        <div
          className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileName ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-5 h-5 text-[var(--primary)]" />
              <span className="text-sm font-medium">{fileName}</span>
              <button
                onClick={e => { e.stopPropagation(); clearFile(); }}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
              <p className="text-sm font-medium">Tap to select a CSV file</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Supported: .csv, .txt
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{parseError}</p>
          </div>
        )}

        {/* Preview */}
        {parsedRows.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <p className="text-sm font-medium">Preview</p>
              <div className="flex gap-2">
                {validRows.length > 0 && (
                  <Badge variant="available" size="sm">{validRows.length} valid</Badge>
                )}
                {errorRows.length > 0 && (
                  <Badge variant="out-of-stock" size="sm">{errorRows.length} errors</Badge>
                )}
              </div>
            </div>

            <div className="divide-y divide-[var(--border)] max-h-72 overflow-y-auto">
              {parsedRows.slice(0, 50).map((row, idx) => (
                <div key={idx} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-mono truncate ${row._error ? 'text-red-500' : ''}`}>
                      {row.rawPartNumber || <span className="text-[var(--muted-foreground)]">(empty)</span>}
                    </p>
                    {row.rawDescription && (
                      <p className="text-xs text-[var(--muted-foreground)] truncate">{row.rawDescription}</p>
                    )}
                    {row._error && (
                      <p className="text-xs text-red-500">{row._error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-[var(--muted-foreground)]">
                    {row.price !== undefined && <span>R{row.price.toFixed(2)}</span>}
                    {row.stock !== undefined && <span>{row.stock} qty</span>}
                    {row._error
                      ? <AlertCircle className="w-4 h-4 text-red-400" />
                      : <CheckCircle2 className="w-4 h-4 text-green-500" />
                    }
                  </div>
                </div>
              ))}
              {parsedRows.length > 50 && (
                <div className="px-4 py-2.5 text-center text-xs text-[var(--muted-foreground)]">
                  … and {parsedRows.length - 50} more rows
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        {validRows.length > 0 && (
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? 'Processing…'
              : `Submit ${validRows.length} row${validRows.length !== 1 ? 's' : ''} for review`
            }
          </Button>
        )}
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
