/**
 * Feature 8: Client & Patient Roster
 * Search, status filtering, intake modal, and ClinicalContext synchronization.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  ArrowUpRight,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import {
  getClients,
  addClient,
  subscribeToTheraFlowStore,
} from './data/theraflow-store';
import { ClientRecord, ClientStatus } from './types';
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

interface ClientsViewProps {
  onSelectClient?: (clientId: string) => void;
}

function calculateAge(dobStr: string): number {
  if (!dobStr) return 35;
  const dob = new Date(dobStr);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onSelectClient }) => {
  const { activePatient, setActivePatient } = useClinicalContext();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClientStatus>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Client Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDob, setNewDob] = useState('1990-01-01');
  const [newDiagnosisCode, setNewDiagnosisCode] = useState('F41.1');
  const [newDiagnosisLabel, setNewDiagnosisLabel] = useState('Generalized Anxiety Disorder');
  const [newFee, setNewFee] = useState('175');
  const [newStatus, setNewStatus] = useState<ClientStatus>('active');

  const loadData = async () => {
    const list = await getClients();
    setClients(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToTheraFlowStore(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.mrn && c.mrn.toLowerCase().includes(query)) ||
        c.diagnosis_code.toLowerCase().includes(query) ||
        c.diagnosis_label.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const handleSetActive = (c: ClientRecord) => {
    const fullName = `${c.first_name} ${c.last_name}`;
    setActivePatient({
      id: c.id,
      name: fullName,
      dob: c.date_of_birth,
      age: calculateAge(c.date_of_birth),
      mrn: c.mrn || `#MC-${c.id.slice(0, 5).toUpperCase()}`,
      cptCode: '90837',
      cptDesc: 'Psychotherapy (60m)',
      encounterId: `enc-${c.id}-${Date.now()}`,
      nextAppt: c.recent_session_date ? `Recent: ${c.recent_session_date}` : 'Today at 10:00 AM',
    });
    toast.success(`Active client set to ${fullName}. Synced with Scribe, Aura & Scrubber.`);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }

    try {
      const created = await addClient({
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || '(415) 555-0199',
        date_of_birth: newDob,
        diagnosis_code: newDiagnosisCode,
        diagnosis_label: newDiagnosisLabel,
        fee: parseFloat(newFee) || 175,
        status: newStatus,
        therapist_id: 'a0000000-0000-4000-8000-000000000001',
      });

      toast.success(`Patient ${created.first_name} ${created.last_name} enrolled successfully!`);
      setIsAddModalOpen(false);

      // Reset form
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPhone('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll client');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Patient &amp; Client Roster
          </h2>
          <p className="text-xs text-slate-500">
            {clients.length} Active clinical records under treatment protocols.
          </p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Enroll New Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enroll New Clinical Patient</DialogTitle>
              <DialogDescription>
                Create a client clinical record. MRN is automatically assigned.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Jane"
                    required
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="patient@example.com"
                    required
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(415) 555-0100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Session Fee ($)</Label>
                  <Input
                    type="number"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Primary ICD-10 Diagnostic Code</Label>
                <select
                  value={newDiagnosisCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setNewDiagnosisCode(code);
                    const labels: Record<string, string> = {
                      'F41.1': 'Generalized Anxiety Disorder',
                      'F33.0': 'Major Depressive Disorder, Recurrent, Mild',
                      'F43.10': 'Post-Traumatic Stress Disorder',
                      'F43.23': 'Adjustment Disorder with Mixed Anxiety & Depressed Mood',
                      'F40.10': 'Social Anxiety Disorder',
                      'F51.01': 'Primary Insomnia',
                    };
                    setNewDiagnosisLabel(labels[code] || 'Behavioral Health Condition');
                  }}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="F41.1">F41.1 — Generalized Anxiety Disorder</option>
                  <option value="F33.0">F33.0 — Major Depressive Disorder, Recurrent, Mild</option>
                  <option value="F43.10">F43.10 — Post-Traumatic Stress Disorder</option>
                  <option value="F43.23">F43.23 — Adjustment Disorder w/ Mixed Anxiety &amp; Depression</option>
                  <option value="F40.10">F40.10 — Social Anxiety Disorder</option>
                  <option value="F51.01">F51.01 — Primary Insomnia</option>
                </select>
              </div>

              <div>
                <Label>Clinical Status</Label>
                <div className="flex gap-2">
                  {(['active', 'on_hold', 'discharged'] as ClientStatus[]).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setNewStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        newStatus === st
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Complete Enrollment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Matrix */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, MRN (#MC-...), or ICD-10..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          {(['all', 'active', 'on_hold', 'discharged'] as const).map((filter) => {
            const isSelected = statusFilter === filter;
            const count =
              filter === 'all'
                ? clients.length
                : clients.filter((c) => c.status === filter).length;

            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter === 'all' ? 'All Statuses' : filter.replace('_', ' ')}
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Patient Name &amp; MRN</th>
                <th className="py-3 px-4">Contact Coordinates</th>
                <th className="py-3 px-4">DOB / Age</th>
                <th className="py-3 px-4">Primary Diagnosis</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Clinical Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No patients match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isActive = activePatient.id === client.id;
                  const initials = `${client.first_name[0] || ''}${client.last_name[0] || ''}`;

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-slate-50/75 transition-colors ${
                        isActive ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Name & MRN */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {client.first_name} {client.last_name}
                              {isActive && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Sparkles className="h-2.5 w-2.5" /> Active in Copilot
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {client.mrn || `#MC-${client.id.slice(0, 5).toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col text-slate-600 space-y-0.5">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {client.email}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {client.phone}
                          </span>
                        </div>
                      </td>

                      {/* DOB / Age */}
                      <td className="py-3 px-4 text-slate-700">
                        <div>{client.date_of_birth}</div>
                        <div className="text-[11px] text-slate-500">
                          {calculateAge(client.date_of_birth)} yrs
                        </div>
                      </td>

                      {/* Diagnosis */}
                      <td className="py-3 px-4">
                        <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {client.diagnosis_code}
                        </span>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5">
                          {client.diagnosis_label}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            client.status === 'active'
                              ? 'emerald'
                              : client.status === 'on_hold'
                              ? 'amber'
                              : 'slate'
                          }
                          className="capitalize text-[11px]"
                        >
                          {client.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetActive(client)}
                            disabled={isActive}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 opacity-80 cursor-default'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                            }`}
                          >
                            {isActive ? 'Current Active' : 'Set Active'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectClient?.(client.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                          >
                            View Chart
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
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
    </div>
  );
};

export default ClientsView;
