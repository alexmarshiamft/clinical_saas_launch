/**
 * Dual-Engine TheraFlow Data Store
 * Seamlessly interfaces with Supabase when configured, and falls back to
 * a persistent deterministic localStorage sandbox for testing, CI, and demo modes.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  ClientRecord,
  NewClientInput,
  CalendarEventRecord,
  NewAppointmentInput,
  DAPNote,
  NewNoteInput,
  TreatmentPlan,
  NewTreatmentPlanInput,
  Invoice,
  NewInvoiceInput,
  InvoiceStatus,
  AuditLogEntry,
  AuditAction,
} from '@/tools/theraflow/types';
import {
  SEED_CLIENTS,
  SEED_APPOINTMENTS,
  SEED_NOTES,
  SEED_TREATMENT_PLANS,
  SEED_INVOICES,
  SEED_AUDIT_LOGS,
  DEMO_THERAPIST_ID,
  CLINICIAN_NAME,
  CLINICIAN_EMAIL,
} from './demo-seed';
import { computeRecordHash, GENESIS_HASH } from '@/lib/audit';

export const LOCAL_STORAGE_KEY_THERAFLOW = 'clinical_saas_theraflow_store_v1';

interface LocalStoreState {
  clients: ClientRecord[];
  appointments: CalendarEventRecord[];
  notes: DAPNote[];
  treatmentPlans: TreatmentPlan[];
  invoices: Invoice[];
  auditLogs: AuditLogEntry[];
}

function getInitialStore(): LocalStoreState {
  if (typeof window === 'undefined') {
    return {
      clients: [...SEED_CLIENTS],
      appointments: [...SEED_APPOINTMENTS],
      notes: [...SEED_NOTES],
      treatmentPlans: [...SEED_TREATMENT_PLANS],
      invoices: [...SEED_INVOICES],
      auditLogs: [...SEED_AUDIT_LOGS],
    };
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_THERAFLOW);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.clients) && parsed.clients.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[TheraFlow Store] Failed to load local store, re-initializing from seed:', err);
  }

  const initial: LocalStoreState = {
    clients: [...SEED_CLIENTS],
    appointments: [...SEED_APPOINTMENTS],
    notes: [...SEED_NOTES],
    treatmentPlans: [...SEED_TREATMENT_PLANS],
    invoices: [...SEED_INVOICES],
    auditLogs: [...SEED_AUDIT_LOGS],
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_THERAFLOW, JSON.stringify(initial));
  } catch {}

  return initial;
}

// In-memory cache for fast sync reads
let memoryStore: LocalStoreState = getInitialStore();

function persistLocalStore() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_THERAFLOW, JSON.stringify(memoryStore));
    } catch (e) {
      console.warn('[TheraFlow Store] LocalStorage save failure:', e);
    }
  }
}

// Simple event dispatcher for store mutations
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToTheraFlowStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.error('[TheraFlow Store] Listener error:', e);
    }
  }
}

// ----------------------------------------------------------------------------
// Client Roster Operations
// ----------------------------------------------------------------------------
export async function getClients(): Promise<ClientRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('last_name', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as ClientRecord[];
      }
    } catch (err) {
      console.warn('[TheraFlow Store] Supabase getClients error, falling back to local store:', err);
    }
  }
  return [...memoryStore.clients];
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data as ClientRecord;
    } catch {}
  }
  const found = memoryStore.clients.find((c) => c.id === id);
  return found ? { ...found } : null;
}

export async function addClient(input: NewClientInput): Promise<ClientRecord> {
  const newClient: ClientRecord = {
    ...input,
    id: input.id || `client-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    therapist_id: input.therapist_id || DEMO_THERAPIST_ID,
    mrn: input.mrn || `#MC-${Math.floor(10000 + Math.random() * 90000)}`,
    status: input.status || 'active',
    fee: input.fee ?? 175,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('clients').insert([newClient]);
    } catch {}
  }

  memoryStore.clients = [newClient, ...memoryStore.clients];
  persistLocalStore();

  await logAuditEvent(
    'CREATE_CLIENT',
    'client',
    newClient.id,
    { name: `${newClient.first_name} ${newClient.last_name}`, mrn: newClient.mrn },
    `${newClient.first_name} ${newClient.last_name}`,
    newClient.mrn
  );

  notifyListeners();
  return newClient;
}

export async function updateClient(id: string, updates: Partial<ClientRecord>): Promise<ClientRecord> {
  const index = memoryStore.clients.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error(`Client ${id} not found`);
  }

  const updated: ClientRecord = {
    ...memoryStore.clients[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('clients').update(updates).eq('id', id);
    } catch {}
  }

  memoryStore.clients[index] = updated;
  persistLocalStore();

  await logAuditEvent(
    'UPDATE_CLIENT',
    'client',
    id,
    updates,
    `${updated.first_name} ${updated.last_name}`,
    updated.mrn
  );

  notifyListeners();
  return updated;
}

// ----------------------------------------------------------------------------
// Appointment / Calendar Operations
// ----------------------------------------------------------------------------
export async function getAppointments(): Promise<CalendarEventRecord[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('appointments').select('*');
      if (!error && data && data.length > 0) {
        return data as CalendarEventRecord[];
      }
    } catch {}
  }
  return [...memoryStore.appointments];
}

export async function addAppointment(input: NewAppointmentInput): Promise<CalendarEventRecord> {
  const newAppt: CalendarEventRecord = {
    ...input,
    id: input.id || `appt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    therapist_id: input.therapist_id || DEMO_THERAPIST_ID,
    status: input.status || 'scheduled',
    location: input.location || 'Telehealth',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('appointments').insert([newAppt]);
    } catch {}
  }

  memoryStore.appointments = [newAppt, ...memoryStore.appointments];
  persistLocalStore();

  await logAuditEvent(
    'CREATE_APPOINTMENT',
    'appointment',
    newAppt.id,
    { sessionType: newAppt.session_type, start: newAppt.start_time },
    newAppt.client_name,
    newAppt.client_id
  );

  notifyListeners();
  return newAppt;
}

export async function updateAppointment(
  id: string,
  updates: Partial<CalendarEventRecord>
): Promise<CalendarEventRecord> {
  const index = memoryStore.appointments.findIndex((a) => a.id === id);
  if (index === -1) {
    throw new Error(`Appointment ${id} not found`);
  }

  const updated: CalendarEventRecord = {
    ...memoryStore.appointments[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('appointments').update(updates).eq('id', id);
    } catch {}
  }

  memoryStore.appointments[index] = updated;
  persistLocalStore();

  await logAuditEvent(
    'UPDATE_APPOINTMENT',
    'appointment',
    id,
    updates,
    updated.client_name,
    updated.client_id
  );

  notifyListeners();
  return updated;
}

export async function deleteAppointment(id: string): Promise<void> {
  memoryStore.appointments = memoryStore.appointments.filter((a) => a.id !== id);
  persistLocalStore();
  notifyListeners();
}

// ----------------------------------------------------------------------------
// DAP Progress Note Operations
// ----------------------------------------------------------------------------
export async function getNotes(): Promise<DAPNote[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('progress_notes').select('*');
      if (!error && data && data.length > 0) return data as DAPNote[];
    } catch {}
  }
  return [...memoryStore.notes];
}

export async function getNotesByClientId(clientId: string): Promise<DAPNote[]> {
  const all = await getNotes();
  return all.filter((n) => n.client_id === clientId);
}

export async function addNote(input: NewNoteInput): Promise<DAPNote> {
  const newNote: DAPNote = {
    ...input,
    id: input.id || `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    therapist_id: input.therapist_id || DEMO_THERAPIST_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('progress_notes').insert([newNote]);
    } catch {}
  }

  memoryStore.notes = [newNote, ...memoryStore.notes];
  persistLocalStore();

  await logAuditEvent(
    'UPDATE_NOTE',
    'progress_note',
    newNote.id,
    { status: newNote.is_locked ? 'signed_and_locked' : 'draft', date: newNote.date_of_service },
    newNote.client_name,
    newNote.client_mrn
  );

  notifyListeners();
  return newNote;
}

export async function updateNote(id: string, updates: Partial<DAPNote>): Promise<DAPNote> {
  const index = memoryStore.notes.findIndex((n) => n.id === id);
  if (index === -1) {
    throw new Error(`Note ${id} not found`);
  }

  const updated: DAPNote = {
    ...memoryStore.notes[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('progress_notes').update(updates).eq('id', id);
    } catch {}
  }

  memoryStore.notes[index] = updated;
  persistLocalStore();

  await logAuditEvent(
    'UPDATE_NOTE',
    'progress_note',
    id,
    { is_locked: updated.is_locked, signed_by: updated.signed_by },
    updated.client_name,
    updated.client_mrn
  );

  notifyListeners();
  return updated;
}

// ----------------------------------------------------------------------------
// Treatment Plan Operations
// ----------------------------------------------------------------------------
export async function getTreatmentPlans(): Promise<TreatmentPlan[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('treatment_plans').select('*');
      if (!error && data && data.length > 0) return data as TreatmentPlan[];
    } catch {}
  }
  return [...memoryStore.treatmentPlans];
}

export async function getTreatmentPlanByClientId(clientId: string): Promise<TreatmentPlan | null> {
  const plans = await getTreatmentPlans();
  return plans.find((p) => p.client_id === clientId) || null;
}

export async function addTreatmentPlan(input: NewTreatmentPlanInput): Promise<TreatmentPlan> {
  const newPlan: TreatmentPlan = {
    ...input,
    id: input.id || `tp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    therapist_id: input.therapist_id || DEMO_THERAPIST_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  memoryStore.treatmentPlans = [newPlan, ...memoryStore.treatmentPlans];
  persistLocalStore();

  await logAuditEvent(
    'UPDATE_NOTE',
    'treatment_plan',
    newPlan.id,
    { diagnosis: newPlan.diagnosis_code, status: newPlan.status },
    newPlan.client_name,
    newPlan.client_id
  );

  notifyListeners();
  return newPlan;
}

export async function updateTreatmentPlan(
  id: string,
  updates: Partial<TreatmentPlan>
): Promise<TreatmentPlan> {
  const index = memoryStore.treatmentPlans.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error(`Treatment plan ${id} not found`);
  }

  const updated: TreatmentPlan = {
    ...memoryStore.treatmentPlans[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  memoryStore.treatmentPlans[index] = updated;
  persistLocalStore();
  notifyListeners();
  return updated;
}

// ----------------------------------------------------------------------------
// Billing & Invoice Operations
// ----------------------------------------------------------------------------
export function computeInvoiceStatus(inv: { status: string; due_date: string }): InvoiceStatus {
  if (inv.status === 'paid') return 'paid';
  if (inv.status === 'void') return 'void';

  const today = new Date().toISOString().split('T')[0];
  if (inv.due_date && inv.due_date < today) {
    return 'overdue';
  }
  return 'pending';
}

export function computeFinancialKPIs(invoices: Invoice[]) {
  const initial = {
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    count: invoices.length,
  };

  return invoices.reduce((acc, inv) => {
    const status = computeInvoiceStatus(inv);
    const amt = Number(inv.amount) || 0;

    if (status !== 'void') {
      acc.totalInvoiced += amt;
    }
    if (status === 'paid') {
      acc.totalPaid += amt;
    } else if (status === 'pending') {
      acc.totalPending += amt;
    } else if (status === 'overdue') {
      acc.totalOverdue += amt;
    }
    return acc;
  }, initial);
}

export async function getInvoices(): Promise<Invoice[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('invoices').select('*');
      if (!error && data && data.length > 0) return data as Invoice[];
    } catch {}
  }
  return [...memoryStore.invoices];
}

export async function addInvoice(input: NewInvoiceInput): Promise<Invoice> {
  const newInvoice: Invoice = {
    ...input,
    id: input.id || `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    invoice_number:
      input.invoice_number || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    therapist_id: input.therapist_id || DEMO_THERAPIST_ID,
    items: input.items || [
      {
        cpt_code: input.cpt_code || '90837',
        description: 'Individual Psychotherapy',
        date_of_service: input.issued_date || new Date().toISOString().split('T')[0],
        fee: input.amount || 175,
      },
    ],
    amount: input.amount ?? 175,
    status: input.status || 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('invoices').insert([newInvoice]);
    } catch {}
  }

  memoryStore.invoices = [newInvoice, ...memoryStore.invoices];
  persistLocalStore();

  await logAuditEvent(
    'EXPORT_SUPERBILL',
    'invoice',
    newInvoice.id,
    { invoiceNumber: newInvoice.invoice_number, amount: newInvoice.amount },
    newInvoice.client_name,
    newInvoice.client_id
  );

  notifyListeners();
  return newInvoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  const index = memoryStore.invoices.findIndex((i) => i.id === id);
  if (index === -1) {
    throw new Error(`Invoice ${id} not found`);
  }

  const updated: Invoice = {
    ...memoryStore.invoices[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('invoices').update(updates).eq('id', id);
    } catch {}
  }

  memoryStore.invoices[index] = updated;
  persistLocalStore();
  notifyListeners();
  return updated;
}

// ----------------------------------------------------------------------------
// Audit Log Operations
// ----------------------------------------------------------------------------
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  return [...memoryStore.auditLogs];
}

export async function logAuditEvent(
  action: AuditAction,
  resourceType: string,
  resourceId?: string,
  details: Record<string, any> = {},
  patientName?: string,
  patientMrn: string = '#MC-88219'
): Promise<AuditLogEntry> {
  const logs = memoryStore.auditLogs;
  const prevHash = logs.length > 0 ? logs[logs.length - 1].hash : GENESIS_HASH;
  const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();

  const hash = computeRecordHash({
    prevHash,
    id,
    timestamp,
    actor: CLINICIAN_EMAIL,
    action,
    patientMrn,
    resourceType,
    details,
  });

  const entry: AuditLogEntry = {
    id,
    timestamp,
    actor: CLINICIAN_EMAIL,
    actorName: CLINICIAN_NAME,
    action,
    patientName,
    patientMrn,
    resourceType,
    resourceId,
    ipAddress: '127.0.0.1',
    details,
    hash,
    prevHash,
    tamperStatus: 'verified',
  };

  memoryStore.auditLogs.push(entry);
  persistLocalStore();

  // Also post to backend Express /api/audit-logs if running
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    let token = '';
    try {
      const raw = localStorage.getItem('clinical_saas_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        token = parsed?.session?.access_token || '';
      }
    } catch {}

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/audit-logs', {
      method: 'POST',
      headers,
      body: JSON.stringify(entry),
    }).catch(() => {
      // Ignored in offline / test harness mode
    });
  }

  notifyListeners();
  return entry;
}

/**
 * Resets local store back to authoritative demo seed fixtures.
 */
export function resetTheraFlowStore() {
  memoryStore = {
    clients: [...SEED_CLIENTS],
    appointments: [...SEED_APPOINTMENTS],
    notes: [...SEED_NOTES],
    treatmentPlans: [...SEED_TREATMENT_PLANS],
    invoices: [...SEED_INVOICES],
    auditLogs: [...SEED_AUDIT_LOGS],
  };
  persistLocalStore();
  notifyListeners();
}
