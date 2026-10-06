/**
 * Feature 11: CMS-1500 Superbill Generator Modal
 * Statutory health insurance reimbursement statement with provider NPI 1982736450,
 * Tax ID, patient demographics, ICD-10 & CPT pickers, and printable layout.
 */

import React, { useState } from 'react';
import {
  Printer,
  Copy,
  Download,
  X,
  ShieldCheck,
  Check,
  FileCheck,
} from 'lucide-react';
import { Invoice, ClientRecord } from './types';
import {
  CLINICIAN_NAME,
  CLINICIAN_NPI,
  CLINICIAN_TAX_ID,
  CLINICIAN_LICENSE,
  PRACTICE_NAME,
  PRACTICE_ADDRESS,
  PRACTICE_PHONE,
} from './data/demo-seed';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SuperbillModalProps {
  invoice: Invoice;
  client?: ClientRecord;
  isOpen: boolean;
  onClose: () => void;
}

const ICD10_OPTIONS = [
  { code: 'F41.1', desc: 'Generalized Anxiety Disorder' },
  { code: 'F33.0', desc: 'Major Depressive Disorder, Recurrent, Mild' },
  { code: 'F43.10', desc: 'Post-Traumatic Stress Disorder' },
  { code: 'F43.23', desc: 'Adjustment Disorder with Mixed Anxiety & Depression' },
  { code: 'F40.10', desc: 'Social Anxiety Disorder' },
  { code: 'F41.0', desc: 'Panic Disorder without Agoraphobia' },
  { code: 'F51.01', desc: 'Primary Insomnia' },
];

const CPT_OPTIONS = [
  { code: '90837', desc: 'Psychotherapy, 60 minutes', defaultFee: 175 },
  { code: '90834', desc: 'Psychotherapy, 45 minutes', defaultFee: 150 },
  { code: '90832', desc: 'Psychotherapy, 30 minutes', defaultFee: 100 },
  { code: '90791', desc: 'Psychiatric Diagnostic Evaluation', defaultFee: 250 },
  { code: '90847', desc: 'Family / Couples Psychotherapy (50m)', defaultFee: 200 },
];

export const SuperbillModal: React.FC<SuperbillModalProps> = ({
  invoice,
  client,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  // Editable claim parameters
  const [selectedIcd10, setSelectedIcd10] = useState<string>(
    client?.diagnosis_code || 'F41.1'
  );
  const [selectedCpt, setSelectedCpt] = useState<string>(
    invoice.cpt_code || invoice.items?.[0]?.cpt_code || '90837'
  );
  const [pos, setPos] = useState<string>('02'); // 02 = Telehealth
  const [modifier, setModifier] = useState<string>('95'); // 95 = Synchronous Telemedicine
  const [fee, setFee] = useState<number>(invoice.amount || 175);
  const [amountPaid, setAmountPaid] = useState<number>(
    invoice.status === 'paid' ? invoice.amount : 0
  );

  const icd10Obj = ICD10_OPTIONS.find((i) => i.code === selectedIcd10) || ICD10_OPTIONS[0];
  const cptObj = CPT_OPTIONS.find((c) => c.code === selectedCpt) || CPT_OPTIONS[0];
  const balanceDue = Math.max(0, fee - amountPaid);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyClaimText = () => {
    const text = `
SUPERBILL REIMBURSEMENT STATEMENT (NOT AN OFFICIAL CMS-1500 FORM)
-----------------------------------------------------------------
PROVIDER INFORMATION:
Provider: ${CLINICIAN_NAME}
Practice: ${PRACTICE_NAME}
NPI: ${CLINICIAN_NPI}
Tax ID / EIN: ${CLINICIAN_TAX_ID}
State License: ${CLINICIAN_LICENSE}
Address: ${PRACTICE_ADDRESS}

PATIENT INFORMATION:
Patient Name: ${invoice.client_name}
DOB: ${client?.date_of_birth || '1988-04-12'}
MRN: ${client?.mrn || '#MC-88219'}
Insurance: ${client?.insurance_payer || 'Commercial Health Plan'}
Member ID: ${client?.member_id || '#MEM-882194'}

SERVICE DETAILS:
Invoice #: ${invoice.invoice_number}
Date of Service: ${invoice.issued_date}
Place of Service: ${pos} (${pos === '02' ? 'Telehealth' : 'Office'})
CPT Procedure Code: ${selectedCpt} (${cptObj.desc})
Modifier: ${modifier}
ICD-10 Diagnosis Code: ${selectedIcd10} (${icd10Obj.desc})
Units: 1
Total Fee: $${fee.toFixed(2)}
Amount Paid by Patient: $${amountPaid.toFixed(2)}
Balance Due: $${balanceDue.toFixed(2)}

I certify that the clinical services described above were rendered by me on the dates indicated.
Signature: ${CLINICIAN_NAME} (MD-CA-C182940)
`.trim();

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      toast.success('Superbill claim text copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative z-50 w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Superbill Reimbursement Statement
              </h2>
              <p className="text-xs text-slate-500">
                Draft reimbursement statement; payer acceptance and official CMS-1500 conformance are not verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyClaimText}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy Text
            </Button>
            <Button size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Print Superbill
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form Controls Bar (Customization) */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <Label>ICD-10 Diagnostic Code</Label>
            <select
              value={selectedIcd10}
              onChange={(e) => setSelectedIcd10(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            >
              {ICD10_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>CPT Procedure Code</Label>
            <select
              value={selectedCpt}
              onChange={(e) => {
                const c = e.target.value;
                setSelectedCpt(c);
                const found = CPT_OPTIONS.find((opt) => opt.code === c);
                if (found) setFee(found.defaultFee);
              }}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            >
              {CPT_OPTIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Place of Service (POS)</Label>
            <select
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            >
              <option value="02">02 — Telehealth (Patient not at Home)</option>
              <option value="10">10 — Telehealth (Patient at Home)</option>
              <option value="11">11 — Office / Clinic</option>
            </select>
          </div>

          <div>
            <Label>Telemedicine Modifier</Label>
            <select
              value={modifier}
              onChange={(e) => setModifier(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            >
              <option value="95">95 — Synchronous Telemedicine</option>
              <option value="GT">GT — Via Interactive Audio/Video</option>
              <option value="none">None (Standard In-Person)</option>
            </select>
          </div>
        </div>

        {/* Printable Superbill Layout Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
          <div
            id="superbill-print-area"
            data-testid="superbill-print-area"
            className="w-full max-w-3xl bg-white p-8 rounded-xl border border-slate-300 shadow-sm text-slate-900 space-y-6 print:shadow-none print:border-none print:p-0"
          >
            {/* Header / Title */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight uppercase">
                  Statement for Health Insurance Reimbursement
                </h1>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                  Reimbursement statement format
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                  {invoice.invoice_number}
                </span>
                <div className="text-[11px] text-slate-500 mt-1">
                  Issued: {invoice.issued_date}
                </div>
              </div>
            </div>

            {/* Provider and Patient Information Grid */}
            <div className="grid grid-cols-2 gap-6 text-xs pb-4 border-b border-slate-200">
              {/* Box 33: Billing Provider */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1.5 text-indigo-900">
                  Box 33: Billing Provider &amp; Clinician
                </div>
                <div className="font-extrabold text-slate-900 text-sm">{CLINICIAN_NAME}</div>
                <div className="text-slate-600 font-medium">{PRACTICE_NAME}</div>
                <div className="text-slate-600">{PRACTICE_ADDRESS}</div>
                <div className="text-slate-600">Phone: {PRACTICE_PHONE}</div>
                <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-slate-200 mt-2">
                  <div>
                    <span className="text-slate-400 font-sans block text-[9px]">Provider NPI:</span>
                    <strong>{CLINICIAN_NPI}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block text-[9px]">Federal Tax ID:</span>
                    <strong>{CLINICIAN_TAX_ID}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans block text-[9px]">State License:</span>
                    <strong>{CLINICIAN_LICENSE}</strong>
                  </div>
                </div>
              </div>

              {/* Box 2 / Box 5: Patient Demographics */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1.5 text-indigo-900">
                  Box 2 &amp; 5: Patient Demographics &amp; Insurance
                </div>
                <div className="font-extrabold text-slate-900 text-sm">{invoice.client_name}</div>
                <div className="text-slate-600 font-mono">
                  DOB: {client?.date_of_birth || '1988-04-12'} • MRN: {client?.mrn || '#MC-88219'}
                </div>
                <div className="text-slate-600">
                  Address: {client?.address || invoice.client_address || '742 Evergreen Terrace, San Francisco, CA'}
                </div>
                <div className="text-slate-600">Phone: {client?.phone || '(415) 555-0100'}</div>
                <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] border-t border-slate-200 mt-2">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Payer Carrier:</span>
                    <strong className="text-slate-800">
                      {client?.insurance_payer || 'Commercial Plan'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Member / Policy ID:</span>
                    <strong className="font-mono text-slate-800">
                      {client?.member_id || '#MEM-882194'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Codes Section */}
            <div className="text-xs">
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-2">
                Box 21: Diagnosis / Nature of Illness or Injury (ICD-10)
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold font-mono text-indigo-800 text-sm bg-white px-2 py-0.5 rounded border border-slate-300">
                  {selectedIcd10}
                </span>
                <span className="font-medium text-slate-700">{icd10Obj.desc}</span>
              </div>
            </div>

            {/* Service & Procedure Ledger Table */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                Box 24: Professional Clinical Encounter Ledger
              </div>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[10px] uppercase">
                    <th className="p-2 border-r border-slate-300">Dates of Service</th>
                    <th className="p-2 border-r border-slate-300 text-center">POS</th>
                    <th className="p-2 border-r border-slate-300">CPT Procedure</th>
                    <th className="p-2 border-r border-slate-300 text-center">Mod</th>
                    <th className="p-2 border-r border-slate-300">Diag Pointer</th>
                    <th className="p-2 border-r border-slate-300 text-center">Units</th>
                    <th className="p-2 text-right">Charges ($)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 border-r border-slate-200 font-mono">
                      {invoice.issued_date}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold">
                      {pos}
                    </td>
                    <td className="p-2.5 border-r border-slate-200">
                      <span className="font-bold font-mono text-indigo-700">{selectedCpt}</span> —{' '}
                      {cptObj.desc}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-center font-mono">
                      {modifier !== 'none' ? modifier : '—'}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-mono font-bold">
                      {selectedIcd10}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-center">1</td>
                    <td className="p-2.5 text-right font-mono font-bold">${fee.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Accounting Summary Grid */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Billed Charges:</span>
                  <span className="font-mono font-bold">${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Amount Paid by Patient:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ${amountPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-t-2 border-slate-900 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono text-slate-900">${balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Provider Certification & Signature Block */}
            <div className="pt-6 border-t-2 border-slate-900 space-y-4 text-xs">
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                "I certify that the clinical services described above were rendered by me on the dates
                indicated and comply with statutory healthcare standards. I certify that all entries
                are accurate and true."
              </p>

              <div className="flex items-end justify-between pt-4">
                <div>
                  <div className="font-serif text-lg text-indigo-950 font-bold border-b border-slate-400 pb-1 w-64">
                    {CLINICIAN_NAME}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                    Clinician Signature &amp; Title (MD / Behavioral Health)
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-slate-800 border-b border-slate-400 pb-1 w-36">
                    {invoice.issued_date}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">
                    Date Executed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperbillModal;
