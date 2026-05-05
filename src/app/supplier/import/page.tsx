'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { AlertCircle, CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { getImportRepository } from '@/lib/adapters/factory';
import { useSupplierId } from '@/hooks/useSupplierId';
import { ImportRowInput } from '@/types';

type ParsedRow = ImportRowInput & { _raw: string; _error?: string };
type CsvRecord = Record<string, string | undefined>;

interface SelectedImportFile {
  name: string;
  size: number;
  hash: string;
}

const HEADER_ALIASES = {
  partNumber: [
    'part_number',
    'part number',
    'partnumber',
    'part no',
    'part_no',
    'part code',
    'part_code',
    'sku',
    'code',
    'item code',
    'item_code',
  ],
  description: [
    'description',
    'part description',
    'part_description',
    'name',
    'part name',
    'part_name',
    'item name',
    'item_name',
  ],
  price: [
    'price',
    'unit price',
    'unit_price',
    'retail price',
    'retail_price',
    'selling price',
    'selling_price',
  ],
  stock: ['stock', 'qty', 'quantity', 'stock qty', 'stock_qty', 'on hand', 'on_hand'],
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.find((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function parseNumber(value?: string): number | undefined {
  const cleaned = (value || '')
    .trim()
    .replace(/^R\s*/i, '')
    .replace(/\s/g, '')
    .replace(/,/g, '');

  if (!cleaned) return undefined;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function rowToRawString(record: CsvRecord): string {
  return Object.values(record)
    .filter((value) => value !== undefined && value !== null)
    .join(', ');
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (!crypto.subtle) {
    let hash = 2166136261;
    for (const byte of new Uint8Array(buffer)) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${hash >>> 0}-${file.size}`;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function parseCSV(text: string): ParsedRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const preview = Papa.parse<string[]>(trimmed, {
    preview: 1,
    skipEmptyLines: 'greedy',
  });

  const firstRow = preview.data[0] || [];
  const normalizedFirstRow = firstRow.map(normalizeHeader);
  const knownHeaderCount = Object.values(HEADER_ALIASES)
    .flat()
    .filter((alias) => normalizedFirstRow.includes(normalizeHeader(alias))).length;
  const hasHeader = knownHeaderCount > 0;

  const parsed = Papa.parse<CsvRecord>(trimmed, {
    header: hasHeader,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(firstError.message || 'Could not parse CSV.');
  }

  const rows: CsvRecord[] = hasHeader
    ? parsed.data
    : (parsed.data as unknown as string[][]).map((row) => ({
        part_number: row[0],
        description: row[1],
        price: row[2],
        stock: row[3],
      }));

  const headers = hasHeader ? Object.keys(rows[0] || {}) : ['part_number', 'description', 'price', 'stock'];
  const partNumberColumn = findColumn(headers, HEADER_ALIASES.partNumber) || 'part_number';
  const descriptionColumn = findColumn(headers, HEADER_ALIASES.description) || 'description';
  const priceColumn = findColumn(headers, HEADER_ALIASES.price) || 'price';
  const stockColumn = findColumn(headers, HEADER_ALIASES.stock) || 'stock';

  return rows.map((row, idx) => {
    const rowNumber = idx + (hasHeader ? 2 : 1);
    const rawPartNumber = (row[partNumberColumn] || '').trim();
    const rawDescription = (row[descriptionColumn] || '').trim();
    const price = parseNumber(row[priceColumn]);
    const stock = parseNumber(row[stockColumn]);
    const errors: string[] = [];

    if (!rawPartNumber) errors.push('Missing part number');
    if (price === undefined) errors.push('Price is required');
    if (stock === undefined) errors.push('Stock is required');
    if (Number.isNaN(price)) errors.push('Invalid price');
    if (Number.isNaN(stock)) errors.push('Invalid stock');
    if (price !== undefined && !Number.isNaN(price) && price < 0) errors.push('Price cannot be negative');
    if (stock !== undefined && !Number.isNaN(stock) && (!Number.isInteger(stock) || stock < 0)) {
      errors.push('Stock must be a whole number');
    }

    return {
      rowNumber,
      rawPartNumber,
      rawDescription: rawDescription || undefined,
      price: price === undefined || Number.isNaN(price) ? undefined : price,
      stock: stock === undefined || Number.isNaN(stock) ? undefined : stock,
      _raw: rowToRawString(row),
      _error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  });
}

export default function SupplierImportPage() {
  const router = useRouter();
  const { supplierId, loading } = useSupplierId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedImportFile | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validRows = parsedRows.filter((row) => !row._error && row.rawPartNumber);
  const errorRows = parsedRows.filter((row) => row._error);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setSubmitError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      const text = readerEvent.target?.result as string;

      try {
        const hash = await hashFile(file);
        const rows = parseCSV(text);

        if (rows.length === 0) {
          setParseError('No data rows found in the file.');
          setParsedRows([]);
          setSelectedFile(null);
          return;
        }

        setSelectedFile({
          name: file.name,
          size: file.size,
          hash,
        });
        setParsedRows(rows);
      } catch (err: any) {
        setParseError(err?.message || 'Could not parse CSV. Check the file format.');
        setParsedRows([]);
        setSelectedFile(null);
      }
    };
    reader.readAsText(file);
  }

  function clearFile() {
    setFileName(null);
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (parsedRows.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const repo = getImportRepository();
      const job = await repo.createJob(
        supplierId!,
        'csv',
        parsedRows,
        fileName ?? undefined,
        selectedFile?.hash,
        selectedFile?.size
      );
      router.push(`/supplier/import/review/${job.id}`);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit import. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20 xl:pb-8 xl:pl-64">
      <div className="xl:hidden">
        <TopBar title="Import Inventory" showBack />
      </div>

      <div className="p-6 xl:px-10 xl:py-8 max-w-7xl mx-auto space-y-6">
        <div className="hidden xl:flex items-start justify-between gap-6">
          <div>
            <button
              type="button"
              onClick={() => router.push('/supplier/inventory')}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] mb-2"
            >
              Back to inventory
            </button>
            <h1 className="text-3xl">Import Inventory</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Upload supplier stock files into a staged review before publishing to live inventory.
            </p>
          </div>
        </div>

        <div className="xl:grid xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-6 xl:items-start">
          <div className="space-y-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg p-4">
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

            <div
              className="border-2 border-dashed border-[var(--border)] rounded-2xl xl:rounded-lg p-8 xl:min-h-64 text-center cursor-pointer hover:border-[var(--primary)] transition-colors xl:flex xl:flex-col xl:items-center xl:justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-5 h-5 text-[var(--primary)]" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      clearFile();
                    }}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    aria-label="Remove selected file"
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
          </div>

          <div className="space-y-6 mt-6 xl:mt-0">

        {parseError && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl xl:rounded-lg p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{parseError}</p>
          </div>
        )}

        {parsedRows.length > 0 && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl xl:rounded-lg overflow-hidden">
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

            <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_120px_90px_80px] gap-3 px-4 py-2 bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <span>Part</span>
              <span className="text-right">Price</span>
              <span>Stock</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-[var(--border)] max-h-72 xl:max-h-[520px] overflow-y-auto">
              {parsedRows.slice(0, 50).map((row, idx) => (
                <div key={idx} className="px-4 py-2.5 flex xl:grid xl:grid-cols-[minmax(0,1fr)_120px_90px_80px] items-start xl:items-center justify-between gap-3">
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
                  <div className="flex items-center gap-3 xl:contents flex-shrink-0 text-xs text-[var(--muted-foreground)]">
                    <span className="xl:text-right">{row.price !== undefined ? `R${row.price.toFixed(2)}` : '-'}</span>
                    <span>{row.stock !== undefined ? `${row.stock} qty` : '-'}</span>
                    <span>
                      {row._error
                        ? <AlertCircle className="w-4 h-4 text-red-400" />
                        : <CheckCircle2 className="w-4 h-4 text-green-500" />
                      }
                    </span>
                  </div>
                </div>
              ))}
              {parsedRows.length > 50 && (
                <div className="px-4 py-2.5 text-center text-xs text-[var(--muted-foreground)]">
                  ... and {parsedRows.length - 50} more rows
                </div>
              )}
            </div>
          </div>
        )}

        {submitError && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-2xl xl:rounded-lg p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        {parsedRows.length > 0 && (
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || loading || !supplierId}
          >
            {submitting
              ? 'Processing...'
              : `Submit ${parsedRows.length} row${parsedRows.length !== 1 ? 's' : ''} for review`
            }
          </Button>
        )}
          </div>
        </div>
      </div>

      <BottomNav role="supplier" />
    </div>
  );
}
