'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '@/services/billing';
import { formatCurrency, CURRENCIES, getCurrencySymbol } from '@/services/billing/types';
import { clientService } from '@/services/complaint/clientService';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { InvoiceStatus, CurrencyCode, InvoiceUpdateRequest, InvoiceItemCreateRequest } from '@/services/billing/types';

const statusColors: Record<InvoiceStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  DRAFT: 'gray', SENT: 'blue', PAID: 'green', OVERDUE: 'red', CANCELLED: 'yellow',
};
const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft', SENT: 'Sent', PAID: 'Paid', OVERDUE: 'Overdue', CANCELLED: 'Cancelled',
};

interface EditableItem {
  id?: string;
  itemName: string;
  description: string;
  quantity: number;
  rate: number;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const invoiceId = params.id as string;

  const { data: invoice, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceService.getById(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.list({ limit: 200, isActive: true }),
  });
  const clients = clientsData?.items || [];

  // Editable state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [taxType, setTaxType] = useState<'NONE' | 'IGST' | 'CGST_SGST'>('NONE');
  const [igstPercentage, setIgstPercentage] = useState('0');
  const [cgstPercentage, setCgstPercentage] = useState('0');
  const [sgstPercentage, setSgstPercentage] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToPhone, setBillToPhone] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber || '');
      setTitle(invoice.title || '');
      setDescription(invoice.description || '');
      setClientId(invoice.clientId || '');
      setCurrency((invoice.currency as CurrencyCode) || 'INR');
      setPoNumber(invoice.poNumber || '');
      setPoDate(invoice.poDate || '');
      const igst = Number((invoice as any).igstPercentage ?? 0);
      const cgst = Number((invoice as any).cgstPercentage ?? 0);
      const sgst = Number((invoice as any).sgstPercentage ?? 0);
      setIgstPercentage(String(igst));
      setCgstPercentage(String(cgst));
      setSgstPercentage(String(sgst));
      if (igst > 0) setTaxType('IGST');
      else if (cgst > 0 || sgst > 0) setTaxType('CGST_SGST');
      else setTaxType('NONE');
      setDueDate(invoice.dueDate || '');
      setNotes(invoice.notes || '');
      setTerms(invoice.terms || '');
      setBillToName(invoice.billToName || '');
      setBillToAddress(invoice.billToAddress || '');
      setBillToEmail(invoice.billToEmail || '');
      setBillToPhone(invoice.billToPhone || '');
      setItems(
        (invoice.items || []).map((i) => ({
          id: i.id,
          itemName: i.itemName || i.description || '',
          description: (i.itemName && i.description !== i.itemName ? i.description : '') || '',
          quantity: Number(i.quantity) || 1,
          rate: Number(i.rate) || 0,
        }))
      );
      setHasChanges(false);
    }
  }, [invoice]);

  const markChanged = () => setHasChanges(true);

  const updateMutation = useMutation({
    mutationFn: (data: InvoiceUpdateRequest) => invoiceService.update(invoiceId, data),
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: InvoiceItemCreateRequest) => invoiceService.addItem(invoiceId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }); },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => invoiceService.removeItem(invoiceId, itemId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }); },
  });

  const sendMutation = useMutation({
    mutationFn: () => invoiceService.send(invoiceId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }); },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => invoiceService.markPaid(invoiceId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => invoiceService.cancel(invoiceId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoiceService.delete(invoiceId),
    onSuccess: () => { router.push('/dashboard/invoices'); },
  });

  if (isLoading) return <LoadingState message="Loading invoice..." />;
  if (error || !invoice) return <ErrorState message="Failed to load invoice" onRetry={refetch} />;

  const status = invoice.status as InvoiceStatus;
  const isDraft = status === 'DRAFT';
  const symbol = getCurrencySymbol(currency);

  const igst = parseFloat(igstPercentage) || 0;
  const cgst = parseFloat(cgstPercentage) || 0;
  const sgst = parseFloat(sgstPercentage) || 0;
  const subtotal = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.rate || 0), 0);
  const igstAmt = subtotal * igst / 100;
  const cgstAmt = subtotal * cgst / 100;
  const sgstAmt = subtotal * sgst / 100;
  const taxAmt = igstAmt + cgstAmt + sgstAmt;
  const total = subtotal + taxAmt;

  const handleSave = () => {
    updateMutation.mutate({
      invoiceNumber,
      clientId,
      poNumber: poNumber || null,
      poDate: poDate || null,
      title,
      description: description || null,
      billToName: billToName || null,
      billToAddress: billToAddress || null,
      billToEmail: billToEmail || null,
      billToPhone: billToPhone || null,
      currency,
      taxPercentage: igst + cgst + sgst,
      igstPercentage: igst,
      cgstPercentage: cgst,
      sgstPercentage: sgst,
      dueDate: dueDate || null,
      notes: notes || null,
      terms: terms || null,
    });
  };

  const handleAddItem = () => {
    setItems([...items, { itemName: '', description: '', quantity: 1, rate: 0 }]);
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
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
    markChanged();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {isDraft ? (
            <Input
              className="text-xl font-bold w-56"
              value={invoiceNumber}
              onChange={(e) => { setInvoiceNumber(e.target.value); markChanged(); }}
            />
          ) : (
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          )}
          <Badge variant={statusColors[status] || 'gray'}>
            {statusLabels[status] || status}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isDraft && hasChanges && (
            <Button variant="primary" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          {isDraft && (
            <>
              <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? 'Sending...' : 'Send Invoice'}
              </Button>
              <Button variant="danger" onClick={() => { if (confirm('Delete this invoice?')) deleteMutation.mutate(); }}>
                Delete
              </Button>
            </>
          )}
          {status === 'SENT' && (
            <>
              <Button variant="primary" onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending}>
                Mark Paid
              </Button>
              <Button variant="danger" onClick={() => { if (confirm('Cancel this invoice?')) cancelMutation.mutate(); }}>
                Cancel Invoice
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => invoiceService.downloadPdf(invoiceId, `${invoiceNumber}.pdf`)}>
            Download PDF
          </Button>
          <Button variant="secondary" onClick={() => router.push('/dashboard/invoices')}>
            Back
          </Button>
        </div>
      </div>

      {updateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          Failed to save changes.
        </div>
      )}
      {updateMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          Invoice saved successfully.
        </div>
      )}

      {/* Invoice Details */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold">Invoice Details</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={taxType}
                  onChange={(e) => {
                    const t = e.target.value as 'NONE' | 'IGST' | 'CGST_SGST';
                    setTaxType(t);
                    if (t === 'NONE') { setIgstPercentage('0'); setCgstPercentage('0'); setSgstPercentage('0'); }
                    markChanged();
                  }}>
                  <option value="NONE">No Tax</option>
                  <option value="IGST">IGST (Interstate)</option>
                  <option value="CGST_SGST">CGST + SGST (Intrastate)</option>
                </select>
              </div>
              {taxType === 'IGST' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IGST %</label>
                  <Input type="number" step="0.01" min="0" value={igstPercentage}
                    onChange={(e) => { setIgstPercentage(e.target.value); markChanged(); }} />
                </div>
              )}
              {taxType === 'CGST_SGST' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CGST %</label>
                    <Input type="number" step="0.01" min="0" value={cgstPercentage}
                      onChange={(e) => { setCgstPercentage(e.target.value); markChanged(); }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SGST %</label>
                    <Input type="number" step="0.01" min="0" value={sgstPercentage}
                      onChange={(e) => { setSgstPercentage(e.target.value); markChanged(); }} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <Input type="date" value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); markChanged(); }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                <Input value={poNumber} onChange={(e) => { setPoNumber(e.target.value); markChanged(); }}
                  placeholder="Purchase Order number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Date</label>
                <Input type="date" value={poDate}
                  onChange={(e) => { setPoDate(e.target.value); markChanged(); }} />
              </div>
            </div>

            {/* Quote & PO Reference (read-only info) */}
            {invoice.quoteId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <span className="font-medium text-blue-800">Converted from Quote:</span>{' '}
                <span className="font-mono">{invoice.quoteNumber || invoice.quoteId}</span>
                {invoice.quoteDate && <span className="ml-3 text-blue-600">Date: {invoice.quoteDate}</span>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={2}
                value={description} onChange={(e) => { setDescription(e.target.value); markChanged(); }} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500 block">Title</span><span className="font-medium">{invoice.title}</span></div>
            <div><span className="text-gray-500 block">Currency</span><span className="font-medium">{symbol} {invoice.currency}</span></div>
            <div><span className="text-gray-500 block">Due Date</span><span className="font-medium">{invoice.dueDate || '—'}</span></div>
            <div><span className="text-gray-500 block">Created</span><span className="font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</span></div>
            {invoice.quoteNumber && (
              <div><span className="text-gray-500 block">Quote #</span><span className="font-medium">{invoice.quoteNumber}</span></div>
            )}
            {invoice.quoteDate && (
              <div><span className="text-gray-500 block">Quote Date</span><span className="font-medium">{invoice.quoteDate}</span></div>
            )}
            {invoice.poNumber && (
              <div><span className="text-gray-500 block">PO #</span><span className="font-medium">{invoice.poNumber}</span></div>
            )}
            {invoice.poDate && (
              <div><span className="text-gray-500 block">PO Date</span><span className="font-medium">{invoice.poDate}</span></div>
            )}
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
            {invoice.billToName && <div className="font-medium">{invoice.billToName}</div>}
            {invoice.billToAddress && <div className="text-gray-600">{invoice.billToAddress}</div>}
            {invoice.billToEmail && <div className="text-gray-600">{invoice.billToEmail}</div>}
            {invoice.billToPhone && <div className="text-gray-600">{invoice.billToPhone}</div>}
            {!invoice.billToName && <div className="text-gray-400">No billing details</div>}
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
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3 text-sm text-gray-500">{idx + 1}</td>
                  <td className="py-3 text-sm">
                    <div className="font-medium">{item.itemName || item.description}</div>
                    {item.itemName && item.description && item.description !== item.itemName && (
                      <div className="text-gray-500 text-xs mt-0.5">{item.description}</div>
                    )}
                  </td>
                  <td className="py-3 text-sm text-right font-mono">{Number(item.quantity)}</td>
                  <td className="py-3 text-sm text-right font-mono">{formatCurrency(item.rate, invoice.currency)}</td>
                  <td className="py-3 text-sm text-right font-mono font-medium">{formatCurrency(item.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        <div className="border-t pt-4 space-y-1.5 text-right">
          <div className="text-sm text-gray-600">Subtotal: <span className="font-mono font-medium">{symbol} {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          {igst > 0 && <div className="text-sm text-gray-600">IGST ({igst}%): <span className="font-mono font-medium">{symbol} {igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
          {cgst > 0 && <div className="text-sm text-gray-600">CGST ({cgst}%): <span className="font-mono font-medium">{symbol} {cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
          {sgst > 0 && <div className="text-sm text-gray-600">SGST ({sgst}%): <span className="font-mono font-medium">{symbol} {sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
          {igst === 0 && cgst === 0 && sgst === 0 && taxAmt > 0 && (
            <div className="text-sm text-gray-600">Tax: <span className="font-mono font-medium">{symbol} {taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          )}
          <div className="text-lg font-bold">Total: <span className="font-mono">{symbol} {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
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
              <p className="text-sm text-gray-700">{invoice.notes || '—'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
            {isDraft ? (
              <textarea className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" rows={3}
                value={terms} onChange={(e) => { setTerms(e.target.value); markChanged(); }} />
            ) : (
              <p className="text-sm text-gray-700">{invoice.terms || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment/Cancel Info */}
      {invoice.paidAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          Paid on {new Date(invoice.paidAt).toLocaleDateString()}
        </div>
      )}
      {invoice.cancelledAt && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          Cancelled on {new Date(invoice.cancelledAt).toLocaleDateString()}
          {invoice.cancellationReason && ` — ${invoice.cancellationReason}`}
        </div>
      )}
    </div>
  );
}
