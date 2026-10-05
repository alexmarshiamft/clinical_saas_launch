/**
 * Milestone 3: TheraFlow Clinical EHR & Telehealth
 * Core TypeScript Data Contracts & Interfaces
 */

export type ClientStatus = 'active' | 'on_hold' | 'discharged' | 'inactive';

export interface ClientRecord {
  id: string;
  therapist_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string; // YYYY-MM-DD
  diagnosis_code: string; // e.g. "F41.1"
  diagnosis_label: string;
  status: ClientStatus;
  fee: number;
  mrn?: string;
  address?: string;
  emergency_contact?: string;
  insurance_payer?: string;
  member_id?: string;
  recent_session_date?: string;
  notes_summary?: string;
  created_at: string;
  updated_at: string;
}

export type NewClientInput = Omit<ClientRecord, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type AppointmentLocation = 'In-Person' | 'Telehealth';

export interface CalendarEventRecord {
  id: string;
  therapist_id: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  session_type: string; // e.g. "Individual Psychotherapy (CPT 90837)"
  cpt_code?: string;
  status: AppointmentStatus;
  location: AppointmentLocation;
  is_out_of_office?: boolean;
  ooo_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type NewAppointmentInput = Omit<CalendarEventRecord, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export interface DAPNote {
  id: string;
  therapist_id: string;
  client_id: string;
  client_name: string;
  client_mrn?: string;
  appointment_id?: string | null;
  date_of_service: string; // YYYY-MM-DD
  session_type: string;
  duration_minutes: number;
  cpt_code: string;
  diagnosis_code: string;
  d_text: string; // Data
  a_text: string; // Assessment
  p_text: string; // Plan
  is_locked: boolean;
  signed_at?: string | null;
  signed_by?: string | null;
  clinician_credentials?: string | null;
  created_at: string;
  updated_at: string;
}

export type NewNoteInput = Omit<DAPNote, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export interface TreatmentPlanObjective {
  id: string;
  description: string;
  target_date: string; // YYYY-MM-DD
  status: 'pending' | 'in_progress' | 'achieved' | 'discontinued';
}

export interface TreatmentPlan {
  id: string;
  therapist_id: string;
  client_id: string;
  client_name: string;
  diagnosis_code: string;
  diagnosis_label: string;
  problem_statement: string;
  long_term_goals: string;
  objectives: TreatmentPlanObjective[];
  interventions: string;
  target_completion_date: string; // YYYY-MM-DD
  review_frequency: '30_days' | '90_days' | 'annual';
  status: 'active' | 'in_progress' | 'achieved' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export type NewTreatmentPlanInput = Omit<TreatmentPlan, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'void';

export interface InvoiceItem {
  cpt_code: string;
  description: string;
  date_of_service: string;
  fee: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  therapist_id: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  client_dob?: string;
  client_address?: string;
  appointment_id?: string | null;
  items: InvoiceItem[];
  amount: number;
  status: InvoiceStatus;
  due_date: string; // YYYY-MM-DD
  issued_date: string; // YYYY-MM-DD
  paid_date?: string | null;
  notes?: string;
  cpt_code?: string;
  created_at: string;
  updated_at: string;
}

export type NewInvoiceInput = Omit<Invoice, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type AuditAction =
  | 'VIEW_EHR'
  | 'UPDATE_NOTE'
  | 'EXPORT_SUPERBILL'
  | 'TELEHEALTH_SESSION'
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_CLIENT'
  | 'UPDATE_CLIENT'
  | 'CREATE_APPOINTMENT'
  | 'UPDATE_APPOINTMENT'
  | 'SCRUB_PHI'
  | 'EXPORT_CHART';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  actor: string; // Email
  actorName: string; // Display name
  action: AuditAction;
  patientName?: string;
  patientMrn: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  details: Record<string, any>;
  hash: string;
  prevHash: string;
  tamperStatus: 'verified' | 'unverified';
}

export interface SuperbillClaimData {
  provider: {
    name: string;
    practiceName: string;
    npi: string;
    taxId: string;
    license: string;
    address: string;
    phone: string;
  };
  patient: {
    id: string;
    name: string;
    dob: string;
    mrn: string;
    address: string;
    phone: string;
    payerName?: string;
    memberId?: string;
  };
  encounter: {
    dateOfService: string;
    pos: string; // "02" for Telehealth, "11" for Office
    posName: string;
    cptCode: string;
    cptDescription: string;
    modifier?: string; // "95"
    icd10Code: string;
    icd10Description: string;
    units: number;
    fee: number;
    amountPaid: number;
    balanceDue: number;
  };
}
