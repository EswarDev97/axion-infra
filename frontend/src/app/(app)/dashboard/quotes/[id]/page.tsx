'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteService, invoiceService } from '@/services/billing';
import { formatCurrency, CURRENCIES, getCurrencySymbol } from '@/services/billing/types';
import { clientService } from '@/services/complaint/clientService';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { QuoteStatus, CurrencyCode, QuoteUpdateRequest, QuoteItemCreateRequest, QuoteItemUpdateRequest, InvoiceCreateRequest } from '@/services/billing/types';

const statusColors: Record<QuoteStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  DRAFT: 'gray', SENT: 'blue', ACCEPTED: 'green', REJECTED: 'red', EXPIRED: 'yellow', CONVERTED: 'purple',
};
const statusLabels: Record<QuoteStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', ACCEPTED: 'Accepted', REJECTED: 'Rejected', EXPIRED: 'Expired', CONVERTED: 'Converted',
};

interface EditableItem {
  id?: string;
  itemName: string;
  description: string;
  quantity: number;
  rate: number;
  dirty?: boolean;
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const quoteId = params.id as string;

  // Fetch quote
  const { data: quote, isLoading, error, refetch } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => quoteService.getById(quoteId),
    enabled: !!quoteId,
  });

  // Fetch clients
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.list({ limit: 200, isActive: true }),
  });
  const clients = clientsData?.items || [];

  // Editable state
  const [quoteNumber, setQuoteNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [taxPercentage, setTaxPercentage] = useState('0');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToPhone, setBillToPhone] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Populate form when quote loads
  useEffect(() => {
    if (quote) {
      setQuoteNumber(quote.quoteNumber || '');
      setTitle(quote.title || '');
      setDescription(quote.description || '');
      setClientId(quote.clientId || '');
      setCurrency((quote.currency as CurrencyCode) || 'INR');
      setTaxPercentage(String(quote.taxPercentage ?? 0));
      setValidUntil(quote.validUntil || '');
      setNotes(quote.notes || '');
      setTerms(quote.terms || '');
      setBillToName(quote.billToName || '');
      setBillToAddress(quote.billToAddress || '');
      setBillToEmail(quote.billToEmail || '');
      setBillToPhone(quote.billToPhone || '');
      setItems(
        (quote.items || []).map((i) => ({
          id: i.id,
          itemName: i.itemName || i.description || '',
          description: (i.itemName && i.description !== i.itemName ? i.description : '') || '',
          quantity: Number(i.quantity) || 1,
          rate: Number(i.rate) || 0,
        }))
      );
      setHasChanges(false);
    }
  }, [quote]);

  const markChanged = () => setHasChanges(true);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: QuoteUpdateRequest) => quoteService.update(quoteId, data),
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: QuoteItemCreateRequest) => quoteService.addItem(quoteId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quote', quoteId] }); },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: QuoteItemUpdateRequest }) =>
      quoteService.updateItem(quoteId, itemId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quote', quoteId] }); },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => quoteService.removeItem(quoteId, itemId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quote', quoteId] }); },
  });

  const sendMutation = useMutation({
    mutationFn: () => quoteService.send(quoteId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quote', quoteId] }); },
  });

  const acceptMutation = useMutation({
    mutationFn: () => quoteService.accept(quoteId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quote', quoteId] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: () => quoteService.reject(quoteId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quote', quoteId] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => quoteService.delete(quoteId),
    onSuccess: () => { router.push('/dashboard/quotes'); },
  });

  const convertMutation = useMutation({
    mutationFn: (data: InvoiceCreateRequest) => invoiceService.create(data),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      router.push(`/dashboard/invoices/${invoice.id}`);
    },
  });

  if (isLoading) return <LoadingState message="Loading quote..." />;
  if (error || !quote) return <ErrorState message="Failed to load quote" onRetry={refetch} />;

  const status = quote.status as QuoteStatus;
  const isDraft = status === 'DRAFT';
  const symbol = getCurrencySymbol(currency);

  const subtotal = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.rate || 0), 0);
  const taxAmt = subtotal * (parseFloat(taxPercentage) || 0) / 100;
  const total = subtotal + taxAmt;

  const handleSave = async () => {
    const dirtyItems = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.id && item.dirty);

    await Promise.all(
      dirtyItems.map(({ item }) =>
        updateItemMutation.mutateAsync({
          itemId: item.id as string,
          data: {
            itemName: item.itemName,
            description: item.description || undefined,
            quantity: item.quantity,
            rate: item.rate,
          },
        })
      )
    );

    if (dirtyItems.length > 0) {
      setItems((prev) =>
        prev.map((it) => (it.id && it.dirty ? { ...it, dirty: false } : it))
      );
    }

    updateMutation.mutate({
      quoteNumber,
      clientId,
      title,
      description: description || null,
      billToName: billToName || null,
      billToAddress: billToAddress || null,
      billToEmail: billToEmail || null,
      billToPhone: billToPhone || null,
      currency,
      taxPercentage: parseFloat(taxPercentage) || 0,
      validUntil: validUntil || null,
      notes: notes || null,
      terms: terms || null,
    });
  };

  const handleAddItem = () => {
    const newItem: EditableItem = { itemName: '', description: '', quantity: 1, rate: 0 };
    setItems([...items, newItem]);
    markChanged();
  };

  const handleSaveNewItem = (idx: number) => {
    const item = items[idx];
    if (!item.itemName || !item.rate) return;
    addItemMutation.mutate({
      itemName: item.itemName,
      description: item.description || undefined,
      quantity: item.quantity,
      rate: item.rate,
    });
  };

  const handleRemoveItem = (idx: number) => {
    const item = items[idx];
    if (item.id) {
      removeItemMutation.mutate(item.id);
    } else {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const updateItem = (idx: number, field: keyof EditableItem, value: string | number) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value, ...(updated[idx].id ? { dirty: true } : {}) };
    setItems(updated);
    markChanged();
  };

  const handleSaveExistingItem = (idx: number) => {
    const item = items[idx];
    if (!item.id || !item.itemName || !item.rate) return;
    updateItemMutation.mutate(
      {
        itemId: item.id,
        data: {
          itemName: item.itemName,
          description: item.description || undefined,
          quantity: item.quantity,
          rate: item.rate,
        },
      },
      {
        onSuccess: () => {
          setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, dirty: false } : it)));
        },
      }
    );
  };

  const handleConvertToInvoice = () => {
    if (!quote) return;
    convertMutation.mutate({
      clientId: quote.clientId,
      quoteId: quote.id,
      title: quote.title,
      description: quote.description || undefined,
      currency: quote.currency as CurrencyCode,
      taxPercentage: Number(quote.taxPercentage) || 0,
      billToName: quote.billToName || undefined,
      billToAddress: quote.billToAddress || undefined,
      billToEmail: quote.billToEmail || undefined,
      billToPhone: quote.billToPhone || undefined,
      notes: quote.notes || undefined,
      terms: quote.terms || undefined,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {isDraft ? (
            <Input
              className="text-xl font-bold w-56"
              value={quoteNumber}
              onChange={(e) => { setQuoteNumber(e.target.value); markChanged(); }}
            />
          ) : (
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
          )}
          <Badge variant={statusColors[status] || 'gray'}>
            {statusLabels[status] || status}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isDraft && hasChanges && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          {isDraft && (
            <>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending ? 'Sending...' : 'Send Quote'}
              </Button>
              <Button
                variant="danger"
                onClick={() => { if (confirm('Delete this quote?')) deleteMutation.mutate(); }}
              >
                Delete
              </Button>
            </>
          )}
          {status === 'SENT' && (
            <>
              <Button variant="primary" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>
                Accept
              </Button>
              <Button variant="danger" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
                Reject
              </Button>
            </>
          )}
          {status === 'ACCEPTED' && (
            <Button
              variant="primary"
              onClick={handleConvertToInvoice}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Invoice'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => quoteService.downloadPdf(quoteId, `${quoteNumber}.pdf`)}>
            Download PDF
          </Button>
          <Button variant="secondary" onClick={() => router.push('/dashboard/quotes')}>
            Back
          </Button>
        </div>
      </div>

      {updateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          Failed to save changes. Please check the form and try again.
        </div>
      )}
      {updateMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          Quote saved successfully.
        </div>
      )}

      {/* Quote Details */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">Quote Details</h2>
        {isDraft ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <Input value={title} onChange={(e) => { setTitle(e.target.value); markChanged(); }} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <Select value={clientId} onChange={(e) => { setClientId(e.target.value); markChanged(); }}>
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <Select value={currency} onChange={(e) => { setCurrency(e.target.value as CurrencyCode); markChanged(); }}>
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <option key={code} value={code}>{info.symbol} — {info.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
                <Input type="number" step="0.01" min="0" value={taxPercentage}
                  onChange={(e) => { setTaxPercentage(e.target.value); markChanged(); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <Input type="date" value={validUntil}
                  onChange={(e) => { setValidUntil(e.target.value); markChanged(); }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={2}
                value={description} onChange={(e) => { setDescription(e.target.value); markChanged(); }} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500 block">Title</span><span className="font-medium">{quote.title}</span></div>
            <div><span className="text-gray-500 block">Currency</span><span className="font-medium">{symbol} {quote.currency}</span></div>
            <div><span className="text-gray-500 block">Valid Until</span><span className="font-medium">{quote.validUntil || '—'}</span></div>
            <div><span className="text-gray-500 block">Created</span><span className="font-medium">{new Date(quote.createdAt).toLocaleDateString()}</span></div>
          </div>
        )}
      </div>

      {/* Bill To */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">Bill To</h2>
        {isDraft ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <Input value={billToName} onChange={(e) => { setBillToName(e.target.value); markChanged(); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input type="email" value={billToEmail} onChange={(e) => { setBillToEmail(e.target.value); markChanged(); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input value={billToPhone} onChange={(e) => { setBillToPhone(e.target.value); markChanged(); }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={2}
                value={billToAddress} onChange={(e) => { setBillToAddress(e.target.value); markChanged(); }} />
            </div>
          </>
        ) : (
          <div className="text-sm space-y-1">
            {quote.billToName && <div className="font-medium">{quote.billToName}</div>}
            {quote.billToAddress && <div className="text-gray-600">{quote.billToAddress}</div>}
            {quote.billToEmail && <div className="text-gray-600">{quote.billToEmail}</div>}
            {quote.billToPhone && <div className="text-gray-600">{quote.billToPhone}</div>}
            {!quote.billToName && <div className="text-gray-400">No billing details</div>}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Line Items ({symbol})</h2>
          {isDraft && (
            <Button type="button" variant="secondary" onClick={handleAddItem}>+ Add Item</Button>
          )}
        </div>

        {isDraft ? (
          <div className="space-y-4">
            {items.map((item, idx) => {
              const amount = (item.quantity || 0) * (item.rate || 0);
              const isNew = !item.id;
              return (
                <div key={item.id || `new-${idx}`} className={`border rounded-lg p-4 space-y-3 ${isNew ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="grid grid-cols-[1fr_100px_140px_140px] gap-3 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Item Name *</label>
                          <Input value={item.itemName} onChange={(e) => updateItem(idx, 'itemName', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Qty</label>
                          <Input type="number" min="0.01" step="0.01" value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Rate ({symbol})</label>
                          <Input type="number" min="0.01" step="0.01" value={item.rate}
                            onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="text-right">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Amount</label>
                          <div className="py-2 font-mono text-sm font-medium">
                            {symbol} {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <textarea className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600" rows={2}
                          value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="Description (optional)" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-6">
                      {isNew && (
                        <button type="button" onClick={() => handleSaveNewItem(idx)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 border border-green-300 rounded">
                          Save
                        </button>
                      )}
                      {!isNew && item.dirty && (
                        <button type="button" onClick={() => handleSaveExistingItem(idx)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 border border-green-300 rounded">
                          Save
                        </button>
                      )}
                      <button type="button" onClick={() => handleRemoveItem(idx)}
                        className="text-red-400 hover:text-red-600 text-lg font-bold px-2" title="Remove">&times;</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="pb-2">#</th>
                <th className="pb-2">Item</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(quote.items || []).map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3 text-sm text-gray-500">{idx + 1}</td>
                  <td className="py-3 text-sm">
                    <div className="font-medium">{item.itemName || item.description}</div>
                    {item.itemName && item.description && item.description !== item.itemName && (
                      <div className="text-gray-500 text-xs mt-0.5">{item.description}</div>
                    )}
                  </td>
                  <td className="py-3 text-sm text-right font-mono">{Number(item.quantity)}</td>
                  <td className="py-3 text-sm text-right font-mono">{formatCurrency(item.rate, quote.currency)}</td>
                  <td className="py-3 text-sm text-right font-mono font-medium">{formatCurrency(item.amount, quote.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        <div className="border-t pt-4 space-y-2 text-right">
          <div className="text-sm text-gray-600">
            Subtotal: <span className="font-mono font-medium">{symbol} {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-sm text-gray-600">
            Tax ({taxPercentage}%): <span className="font-mono font-medium">{symbol} {taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="text-lg font-bold">
            Total: <span className="font-mono">{symbol} {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            {isDraft ? (
              <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={3}
                value={notes} onChange={(e) => { setNotes(e.target.value); markChanged(); }} />
            ) : (
              <p className="text-sm text-gray-700">{quote.notes || '—'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
            {isDraft ? (
              <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={3}
                value={terms} onChange={(e) => { setTerms(e.target.value); markChanged(); }} />
            ) : (
              <p className="text-sm text-gray-700">{quote.terms || '—'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
