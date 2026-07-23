'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/feedback/Alert';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { FormField } from '@/components/form/FormField';
import {
  paymentService,
  type Payment,
  type PaymentCreateRequest,
  type PaymentUpdateRequest,
} from '@/services/complaint/paymentService';
import { clientService, type Client } from '@/services/complaint/clientService';
import { employeeService } from '@/services/hr/hrService';
import type { Employee } from '@/services/hr/types';

const PAGE_SIZE = 20;

const CASE_STATUSES = [
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REPORT_SUBMITTED', label: 'Report Submitted' },
  { value: 'INVOICE_GENERATED', label: 'Invoice Generated' },
  { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const BILLING_STATUSES = [
  { value: 'COMPANY_BILLING', label: 'Company Billing' },
  { value: 'CUSTOMER_BILLING', label: 'Customer Billing' },
];

const emptyForm = {
  caseReference: '',
  clientId: '',
  financeId: '',
  vehicleRegistrationNumber: '',
  executiveEmployeeId: '',
  caseStatus: 'ASSIGNED',
  billingStatus: '',
  paymentMode: '',
  utrNumber: '',
  transactionDatetime: '',
  amount: '',
};

type FormState = typeof emptyForm;

export function PaymentsPageClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dropdown data
  const [clients, setClients] = useState<Client[]>([]);
  const [financers, setFinancers] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // ID -> display name lookups for rendering payments.clientId/executiveEmployeeId
  // as names in the table and export (the backend only returns raw FK ids).
  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of [...clients, ...financers]) map.set(c.id, c.name);
    return map;
  }, [clients, financers]);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of employees) map.set(e.id, e.fullName);
    return map;
  }, [employees]);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [formData, setFormData] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentService.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
      });
      setPayments(res.items ?? []);
      setTotalPages(res.pages ?? 1);
    } catch (e) {
      setError((e as Error).message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSearch = () => {
    setPage(1);
    fetchPayments();
  };

  const handleExport = async () => {
    // Dynamically imported so the (fairly large) SheetJS library is only
    // pulled into a separate chunk when the user actually exports, rather
    // than bloating the main payments page bundle.
    const XLSX = await import('xlsx');

    const rows = payments.map((payment, index) => ({
      'S.No': index + 1,
      'Case Reference': payment.caseReference,
      Client: clientNameById.get(payment.clientId) ?? payment.clientId,
      'Vehicle Reg No': payment.vehicleRegistrationNumber,
      Executive: employeeNameById.get(payment.executiveEmployeeId) ?? payment.executiveEmployeeId,
      'Case Status': payment.caseStatus,
      'Billing Status': payment.billingStatus,
      'Payment Mode': payment.paymentMode ?? '',
      'UTR Number': payment.utrNumber ?? '',
      'Transaction Date': payment.transactionDatetime ?? '',
      Amount: payment.amount ?? '',
      'Lead Created Date': payment.createdAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    XLSX.writeFile(workbook, 'payments.xlsx');
  };

  const fetchDropdownData = useCallback(async () => {
    try {
      const [clientRes, financerRes, employeeRes] = await Promise.all([
        clientService.list({ type: 'CLIENT', limit: 200 }),
        clientService.list({ type: 'FINANCER', limit: 200 }),
        employeeService.list({ pageSize: 200 }),
      ]);
      setClients(clientRes.items ?? []);
      setFinancers(financerRes.items ?? []);
      setEmployees(employeeRes.items ?? []);
    } catch (e) {
      setFormError((e as Error).message || 'Failed to load form reference data');
    }
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...emptyForm });
    setFormError(null);
    setShowForm(true);
    fetchDropdownData();
  };

  const openEdit = (payment: Payment) => {
    setEditing(payment);
    setFormData({
      caseReference: payment.caseReference,
      clientId: payment.clientId,
      financeId: payment.financeId || '',
      vehicleRegistrationNumber: payment.vehicleRegistrationNumber,
      executiveEmployeeId: payment.executiveEmployeeId,
      caseStatus: payment.caseStatus || 'ASSIGNED',
      billingStatus: payment.billingStatus || '',
      paymentMode: payment.paymentMode || '',
      utrNumber: payment.utrNumber || '',
      transactionDatetime: payment.transactionDatetime || '',
      amount: payment.amount != null ? String(payment.amount) : '',
    });
    setFormError(null);
    setShowForm(true);
    fetchDropdownData();
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Clear dependent fields when a parent selection changes, so hidden
      // fields never get submitted stale. Amount is NOT cleared here since
      // it's shown (optionally) for both Company and Customer Billing.
      if (field === 'billingStatus') {
        next.paymentMode = '';
        next.utrNumber = '';
        next.transactionDatetime = '';
      }
      if (field === 'paymentMode') {
        if (value === 'CASH') {
          next.utrNumber = '';
          next.transactionDatetime = '';
        }
      }
      return next;
    });
  };

  const isCompanyBilling = formData.billingStatus === 'COMPANY_BILLING';
  const isCustomerBilling = formData.billingStatus === 'CUSTOMER_BILLING';
  const isCash = isCustomerBilling && formData.paymentMode === 'CASH';
  const isTransfer = isCustomerBilling && formData.paymentMode === 'TRANSFER';
  // Amount is always shown once a billing status is picked: required for
  // Customer Billing (Cash or Transfer), optional for Company Billing.
  const showAmount = isCompanyBilling || isCash || isTransfer;

  const isFormValid = () => {
    if (!formData.caseReference.trim() || !formData.clientId || !formData.vehicleRegistrationNumber.trim()) {
      return false;
    }
    if (!formData.executiveEmployeeId || !formData.billingStatus) {
      return false;
    }
    if (isCustomerBilling) {
      if (!formData.paymentMode) return false;
      if (!formData.amount) return false;
      if (isTransfer && (!formData.utrNumber.trim() || !formData.transactionDatetime)) return false;
    }
    return true;
  };

  const buildPayload = (): PaymentCreateRequest => {
    const base: PaymentCreateRequest = {
      caseReference: formData.caseReference.trim(),
      clientId: formData.clientId,
      financeId: formData.financeId || undefined,
      vehicleRegistrationNumber: formData.vehicleRegistrationNumber.trim(),
      executiveEmployeeId: formData.executiveEmployeeId,
      caseStatus: formData.caseStatus,
      billingStatus: formData.billingStatus,
      paymentMode: undefined,
      utrNumber: undefined,
      transactionDatetime: undefined,
      amount: undefined,
    };

    if (formData.billingStatus === 'COMPANY_BILLING') {
      // Amount is optional for Company Billing — send it only if provided.
      base.amount = formData.amount ? parseFloat(formData.amount) : undefined;
    }

    if (formData.billingStatus === 'CUSTOMER_BILLING') {
      base.paymentMode = formData.paymentMode;
      base.amount = formData.amount ? parseFloat(formData.amount) : undefined;
      if (formData.paymentMode === 'TRANSFER') {
        base.utrNumber = formData.utrNumber.trim();
        base.transactionDatetime = formData.transactionDatetime;
      }
    }

    return base;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      setFormError('Please fill in all required fields');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = buildPayload();
      if (editing) {
        const updateData: PaymentUpdateRequest = {
          ...payload,
          financeId: payload.financeId ?? null,
          paymentMode: payload.paymentMode ?? null,
          utrNumber: payload.utrNumber ?? null,
          transactionDatetime: payload.transactionDatetime ?? null,
          amount: payload.amount ?? null,
        };
        await paymentService.update(editing.id, updateData);
      } else {
        await paymentService.create(payload);
      }
      setShowForm(false);
      fetchPayments();
    } catch (e) {
      setFormError((e as Error).message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await paymentService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchPayments();
    } catch (e) {
      setError((e as Error).message || 'Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payment Management</h1>
          <p className="text-gray-600">Track case-level payments, billing and finance references</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search payments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case Reference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Reg. No.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Executive</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment, index) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{payment.caseReference}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{clientNameById.get(payment.clientId) ?? payment.clientId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{payment.vehicleRegistrationNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employeeNameById.get(payment.executiveEmployeeId) ?? payment.executiveEmployeeId}</td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral">{payment.caseStatus}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral">{payment.billingStatus}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.amount != null ? payment.amount : '-'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEdit(payment)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(payment)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Payment' : 'Add Payment'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <Alert variant="error" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <FormField label="Case Reference" htmlFor="caseReference" required>
            <Input
              id="caseReference"
              value={formData.caseReference}
              onChange={(e) => handleChange('caseReference', e.target.value)}
              placeholder="e.g. CASE-1001"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Client" htmlFor="clientId" required>
              <Select
                id="clientId"
                value={formData.clientId}
                onChange={(e) => handleChange('clientId', e.target.value)}
                placeholder="Select client"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Finance" htmlFor="financeId">
              <Select
                id="financeId"
                value={formData.financeId}
                onChange={(e) => handleChange('financeId', e.target.value)}
                placeholder="Select finance (optional)"
              >
                {financers.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Vehicle Registration Number" htmlFor="vehicleRegistrationNumber" required>
              <Input
                id="vehicleRegistrationNumber"
                value={formData.vehicleRegistrationNumber}
                onChange={(e) => handleChange('vehicleRegistrationNumber', e.target.value.toUpperCase())}
                placeholder="e.g. KA01AB1234"
              />
            </FormField>
            <FormField label="Executive" htmlFor="executiveEmployeeId" required>
              <Select
                id="executiveEmployeeId"
                value={formData.executiveEmployeeId}
                onChange={(e) => handleChange('executiveEmployeeId', e.target.value)}
                placeholder="Select executive"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Case Status" htmlFor="caseStatus" required>
              <Select
                id="caseStatus"
                value={formData.caseStatus}
                onChange={(e) => handleChange('caseStatus', e.target.value)}
              >
                {CASE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Billing Status" htmlFor="billingStatus" required>
              <Select
                id="billingStatus"
                value={formData.billingStatus}
                onChange={(e) => handleChange('billingStatus', e.target.value)}
                placeholder="Select billing status"
              >
                {BILLING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </FormField>
          </div>

          {isCustomerBilling && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-700">Payment Mode</legend>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="CASH"
                    checked={formData.paymentMode === 'CASH'}
                    onChange={(e) => handleChange('paymentMode', e.target.value)}
                  />
                  Cash
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="TRANSFER"
                    checked={formData.paymentMode === 'TRANSFER'}
                    onChange={(e) => handleChange('paymentMode', e.target.value)}
                  />
                  Transfer
                </label>
              </div>
            </fieldset>
          )}

          {isTransfer && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="UTR Number" htmlFor="utrNumber" required>
                <Input
                  id="utrNumber"
                  value={formData.utrNumber}
                  onChange={(e) => handleChange('utrNumber', e.target.value)}
                  placeholder="UTR reference number"
                />
              </FormField>
              <FormField label="Transaction Date & Time" htmlFor="transactionDatetime" required>
                <Input
                  id="transactionDatetime"
                  type="datetime-local"
                  value={formData.transactionDatetime}
                  onChange={(e) => handleChange('transactionDatetime', e.target.value)}
                />
              </FormField>
            </div>
          )}

          {showAmount && (
            <FormField label="Amount" htmlFor="amount" required={isCustomerBilling}>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="e.g. 5000"
              />
            </FormField>
          )}

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!isFormValid()}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        description={`Are you sure you want to delete "${deleteTarget?.caseReference}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
