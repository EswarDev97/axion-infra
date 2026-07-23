/**
 * MindFlow - Expense Receipts Section
 *
 * Lets a user attach supporting documents (bills, invoices, etc.) to an expense
 * request. Upload is a two-step flow: push the file bytes to the storage service
 * (`/documents`), then attach the returned fileId to the expense as a receipt.
 */
'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { expenseReceiptService } from '@/services/expense';
import { documentService } from '@/services/documents/documentService';
import { Button } from '@/components/ui/Button';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';
const MAX_MB = 10;

interface ReceiptsSectionProps {
  requestId: string;
  /** Allow upload/delete (e.g. only while the request is a DRAFT). */
  canEdit: boolean;
}

function formatSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReceiptsSection({ requestId, canEdit }: ReceiptsSectionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: receipts = [] } = useQuery({
    queryKey: ['expenseReceipts', requestId],
    queryFn: () => expenseReceiptService.getByRequest(requestId),
  });

  // File metadata (filename, size) keyed by fileId for display. Fetched per
  // file via the single-file endpoint (reliable through the gateway).
  const fileIds = receipts.map((r) => r.fileId);
  const { data: metaList } = useQuery({
    queryKey: ['expenseReceiptFileMeta', requestId, fileIds.join(',')],
    queryFn: async () => {
      const metas = await Promise.all(
        fileIds.map((id) => documentService.getById(id).catch(() => null))
      );
      return metas.filter((m): m is NonNullable<typeof m> => m !== null);
    },
    enabled: fileIds.length > 0,
  });
  const metaById = new Map((metaList ?? []).map((f) => [f.id, f]));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['expenseReceipts', requestId] });
    queryClient.invalidateQueries({ queryKey: ['expenseReceiptFiles', requestId] });
    queryClient.invalidateQueries({ queryKey: ['expenseRequest', requestId] });
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`"${file.name}" exceeds the ${MAX_MB} MB limit.`);
      return;
    }
    setBusy(true);
    try {
      const uploaded = await documentService.upload(file, {
        module: 'expense',
        entityType: 'expense_receipt',
        entityId: requestId,
      });
      await expenseReceiptService.upload(requestId, { fileId: uploaded.id });
      refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed to upload document.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async ({ receiptId, fileId }: { receiptId: string; fileId: string }) => {
      await expenseReceiptService.delete(receiptId);
      // Best-effort cleanup of the underlying file; ignore if already gone.
      try {
        await documentService.delete(fileId);
      } catch {
        /* noop */
      }
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e?.message || 'Failed to delete document.'),
  });

  const handleView = async (fileId: string) => {
    setError(null);
    try {
      const blob = await documentService.getBlob(fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError('Failed to open document.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Receipts &amp; Documents</h2>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              loading={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          {error}
        </div>
      )}

      {receipts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No documents uploaded yet (bills, invoices, etc.)
        </p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {receipts.map((r) => {
            const meta = metaById.get(r.fileId);
            const name = meta?.originalFilename || 'Document';
            return (
              <li key={r.id} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline truncate text-left block max-w-full"
                      onClick={() => handleView(r.fileId)}
                    >
                      {name}
                    </button>
                    <p className="text-xs text-gray-500">
                      {[formatSize(meta?.fileSize), new Date(r.uploadedAt).toLocaleString()]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="text-red-600 text-sm hover:text-red-700 flex items-center gap-1 shrink-0 disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ receiptId: r.id, fileId: r.fileId })}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <p className="mt-3 text-xs text-gray-500">
          Accepted: PDF, Word, Excel, and images (JPG/PNG/WebP). Max {MAX_MB} MB per file.
        </p>
      )}
    </div>
  );
}

export default ReceiptsSection;
