'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { invoiceService } from '@/services/billing';
import { CURRENCIES, getCurrencySymbol } from '@/services/billing/types';
import { clientService } from '@/services/complaint/clientService';
import type { InvoiceCreateRequest, CurrencyCode } from '@/services/billing/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface LineItem {
  itemName: string;
  description: string;
  quantity: number;
  rate: number;
}

export default function NewInvoicePage() {
  const router = useRouter();

  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Fetch next invoice number (useQuery handles auth timing)
  const { data: nextNumber } = useQuery({
    queryKey: ['nextInvoiceNumber'],
    queryFn: () => invoiceService.getNextNumber(),
    retry: 2,
    staleTime: 30000,
  });

  // Pre-fill when fetched (only if user hasn't typed anything)
  useEffect(() => {
    if (nextNumber && !invoiceNumber) {
      setInvoiceNumber(nextNumber);
    }
  }, [nextNumber]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [taxPercentage, setTaxPercentage] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Bill-to company details
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToPhone, setBillToPhone] = useState('');

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { itemName: '', description: '', quantity: 1, rate: 0 },
  ]);

  const symbol = getCurrencySymbol(currency);

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.list({ limit: 200, isActive: true }),
  });
  const clients = clientsData?.items || [];

  // Auto-fill bill-to when client is selected
  const handleClientChange = (selectedClientId: string) => {
    setClientId(selectedClientId);
    const client = clients.find((c) => c.id === selectedClientId);
    if (client) {
      setBillToName(client.name);
      setBillToEmail(client.email || '');
      setBillToPhone(client.phone || '');
      setBillToAddress(client.address || '');
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: InvoiceCreateRequest) => invoiceService.create(data),
    onSuccess: (invoice) => {
      router.push(`/dashboard/invoices/${invoice.id}`);
    },
  });

  const addItem = () => {
    setItems([...items, { itemName: '', description: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
  const taxAmount = subtotal * (parseFloat(taxPercentage) || 0) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items
      .filter((item) => item.itemName && item.rate > 0)
      .map((item) => ({
        itemName: item.itemName,
        description: item.description || undefined,
        quantity: item.quantity,
        rate: item.rate,
      }));

    createMutation.mutate({
      invoiceNumber: invoiceNumber || undefined,
      clientId,
      quoteId: quoteId || undefined,
      title,
      description: description || undefined,
      billToName: billToName || undefined,
      billToAddress: billToAddress || undefined,
      billToEmail: billToEmail || undefined,
      billToPhone: billToPhone || undefined,
      currency,
      taxPercentage: parseFloat(taxPercentage) || 0,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      items: validItems,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create New Invoice</h1>
        <p className="text-gray-600">Fill in the details below to create an invoice</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Invoice Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. AXN-INV-2526-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. March 2026 Services"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <Select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                required
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.code})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              >
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.symbol} — {info.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Quote (optional)</label>
              <Input
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                placeholder="Quote ID (auto-copies items)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this invoice"
            />
          </div>
        </div>

        {/* Bill To - Company Details */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Bill To</h2>
          <p className="text-xs text-gray-500">Auto-filled from client. You can edit if needed.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <Input
                value={billToName}
                onChange={(e) => setBillToName(e.target.value)}
                placeholder="Company / Client name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                type="email"
                value={billToEmail}
                onChange={(e) => setBillToEmail(e.target.value)}
                placeholder="billing@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input
                value={billToPhone}
                onChange={(e) => setBillToPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={2}
              value={billToAddress}
              onChange={(e) => setBillToAddress(e.target.value)}
              placeholder="Full billing address"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Line Items ({symbol})</h2>
            <Button type="button" variant="secondary" onClick={addItem}>
              + Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const amount = (item.quantity || 0) * (item.rate || 0);
              return (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="grid grid-cols-[1fr_100px_140px_140px] gap-3 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Item Name *</label>
                          <Input
                            value={item.itemName}
                            onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                            placeholder="e.g. Consulting Hours"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Qty</label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Rate ({symbol})</label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="text-right">
                          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Amount</label>
                          <div className="py-2 font-mono text-sm font-medium">
                            {symbol} {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <textarea
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600"
                          rows={2}
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="Description (optional) — details about this item..."
                        />
                      </div>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="mt-6 text-red-400 hover:text-red-600 text-lg font-bold px-2"
                        title="Remove item"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2 text-right">
            <div className="text-sm text-gray-600">
              Subtotal: <span className="font-mono font-medium">{symbol} {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-sm text-gray-600">
              Tax ({taxPercentage}%): <span className="font-mono font-medium">{symbol} {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/dashboard/invoices')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || !title || !clientId}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>

        {createMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            Failed to create invoice. Please check all required fields and try again.
          </div>
        )}
      </form>
    </div>
  );
}
