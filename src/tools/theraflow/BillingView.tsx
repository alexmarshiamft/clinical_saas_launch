/**
 * Feature 11: Invoicing & Accounts Receivable View
 * Financial KPI metric summary, multi-status invoice lifecycle (paid, pending, overdue, void),
 * dynamic overdue calculation, and CMS-1500 Superbill generator launch.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  FileText,
  Printer,
  ChevronDown,
} from 'lucide-react';
import {
  getInvoices,
  addInvoice,
  updateInvoice,
  getClients,
  computeInvoiceStatus,
  computeFinancialKPIs,
  subscribeToTheraFlowStore,
} from './data/theraflow-store';
import { Invoice, ClientRecord, InvoiceStatus } from './types';
import { SuperbillModal } from './SuperbillModal';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const BillingView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  // Superbill modal state
  const [selectedInvoiceForSuperbill, setSelectedInvoiceForSuperbill] = useState<Invoice | null>(
    null
  );
  const [isSuperbillOpen, setIsSuperbillOpen] = useState(false);

  // New Invoice modal state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [newCptCode, setNewCptCode] = useState('90837');
  const [newAmount, setNewAmount] = useState('175');
  const [newIssuedDate, setNewIssuedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [newStatus, setNewStatus] = useState<InvoiceStatus>('pending');
  const [newNotes, setNewNotes] = useState('');

  const loadData = async () => {
    const [invList, cliList] = await Promise.all([getInvoices(), getClients()]);
    setInvoices(invList);
    setClients(cliList);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToTheraFlowStore(() => {
      loadData();
    });
    return unsub;
  }, []);

  // Compute Financial KPI metrics dynamically
  const kpis = useMemo(() => {
    return computeFinancialKPIs(invoices);
  }, [invoices]);

  // Filter invoices based on search & status
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const computed = computeInvoiceStatus(inv);
      const matchesStatus = statusFilter === 'all' || computed === statusFilter;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.client_name.toLowerCase().includes(query) ||
        (inv.cpt_code && inv.cpt_code.includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === newClientId);
    const clientName = client ? `${client.first_name} ${client.last_name}` : 'Patient';

    const amt = parseFloat(newAmount) || 175;
    const invNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    await addInvoice({
      invoice_number: invNum,
      client_id: newClientId,
      client_name: clientName,
      client_email: client?.email,
      client_dob: client?.date_of_birth,
      client_address: client?.address,
      cpt_code: newCptCode,
      amount: amt,
      status: newStatus,
      issued_date: newIssuedDate,
      due_date: newDueDate,
      notes: newNotes,
      items: [
        {
          cpt_code: newCptCode,
          description: `Psychotherapy Encounter (CPT ${newCptCode})`,
          date_of_service: newIssuedDate,
          fee: amt,
        },
      ],
      therapist_id: 'a0000000-0000-4000-8000-000000000001',
    });

    toast.success(`Invoice generated for ${clientName}!`);
    setIsNewInvoiceOpen(false);
    setNewNotes('');
  };

  const handleUpdateStatus = async (id: string, nextStatus: InvoiceStatus) => {
    await updateInvoice(id, {
      status: nextStatus,
      paid_date: nextStatus === 'paid' ? new Date().toISOString() : null,
    });
    toast.success(`Invoice marked as ${nextStatus.toUpperCase()}`);
  };

  const openSuperbill = (inv: Invoice) => {
    setSelectedInvoiceForSuperbill(inv);
    setIsSuperbillOpen(true);
  };

  const selectedClientForSuperbill = useMemo(() => {
    if (!selectedInvoiceForSuperbill) return undefined;
    return clients.find((c) => c.id === selectedInvoiceForSuperbill.client_id);
  }, [selectedInvoiceForSuperbill, clients]);

  return (
    <div className="space-y-6">
      {/* Financial KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Invoiced */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Invoiced
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ${kpis.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {kpis.count} practice ledger entries
          </div>
        </div>

        {/* KPI 2: Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Collected (Paid)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800">
            ${kpis.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            Settled via HSA, Stripe, or Patient Card
          </div>
        </div>

        {/* KPI 3: Pending Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Pending Receivables
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-800">
            ${kpis.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">
            Within current payment grace period
          </div>
        </div>

        {/* KPI 4: Overdue Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Overdue Receivables
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800">
            ${kpis.totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">
            Unpaid past scheduled due date
          </div>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice # (INV-...), patient name, or CPT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'paid', 'pending', 'overdue', 'void'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Issue New Patient Invoice</DialogTitle>
              <DialogDescription>
                Bill an individual encounter with CPT procedure code and payment terms.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <Label>Patient Selection *</Label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                  required
                >
                  <option value="">Select patient from roster...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CPT Procedure Code</Label>
                  <select
                    value={newCptCode}
                    onChange={(e) => setNewCptCode(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                  >
                    <option value="90837">90837 — 60m Psychotherapy ($175)</option>
                    <option value="90834">90834 — 45m Psychotherapy ($150)</option>
                    <option value="90791">90791 — Psychiatric Evaluation ($250)</option>
                    <option value="90847">90847 — Family Therapy ($200)</option>
                  </select>
                </div>
                <div>
                  <Label>Amount Billed ($)</Label>
                  <Input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date of Service</Label>
                  <Input
                    type="date"
                    value={newIssuedDate}
                    onChange={(e) => setNewIssuedDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Payment Due Date</Label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Initial Status</Label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as InvoiceStatus)}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="void">Void</option>
                </select>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Issue Invoice</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date of Service</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Session CPT</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const effectiveStatus = computeInvoiceStatus(inv);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {inv.issued_date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {inv.client_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold text-[11px]">
                          CPT {inv.cpt_code || '90837'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold font-mono text-slate-900">
                        ${Number(inv.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            effectiveStatus === 'paid'
                              ? 'emerald'
                              : effectiveStatus === 'pending'
                              ? 'blue'
                              : effectiveStatus === 'overdue'
                              ? 'destructive'
                              : 'slate'
                          }
                          className="capitalize text-[11px]"
                        >
                          {effectiveStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {inv.due_date}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => openSuperbill(inv)}
                            className="flex items-center gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          >
                            <FileText className="h-3 w-3" />
                            Superbill
                          </Button>

                          {effectiveStatus !== 'paid' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleUpdateStatus(inv.id, 'paid')}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Superbill Modal */}
      {selectedInvoiceForSuperbill && (
        <SuperbillModal
          invoice={selectedInvoiceForSuperbill}
          client={selectedClientForSuperbill}
          isOpen={isSuperbillOpen}
          onClose={() => setIsSuperbillOpen(false)}
        />
      )}
    </div>
  );
};

export default BillingView;
