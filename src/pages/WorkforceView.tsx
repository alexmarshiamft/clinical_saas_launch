import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  DollarSign,
  TrendingUp,
  Plus,
  Shield,
  FileCheck,
  Building2,
  Calendar,
  Award,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { usePracticeOs } from '@/lib/practice-os-context';
import { WorkerRecord, WorkerRole, EmploymentType, LicenseType } from '@/types/practice-os';

export const WorkforceView: React.FC = () => {
  const { workers, locations, compensationPlans, addWorker } = usePracticeOs();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form State for Add Worker Modal
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('(415) 555-');
  const [newRole, setNewRole] = useState<WorkerRole>('licensed_clinician');
  const [newEmploymentType, setNewEmploymentType] = useState<EmploymentType>('w2_employee');
  const [newLicenseType, setNewLicenseType] = useState<LicenseType>('LMFT');
  const [newLicenseNumber, setNewLicenseNumber] = useState('LMFT98231');
  const [newNpi, setNewNpi] = useState('1982736401');
  const [newWeeklyTarget, setNewWeeklyTarget] = useState(25);
  const [newCompPlanId, setNewCompPlanId] = useState(compensationPlans[0]?.id || '');

  const filteredWorkers = workers.filter((w) => {
    if (selectedRoleFilter === 'all') return true;
    return w.role === selectedRoleFilter;
  });

  // Calculate synthetic aggregate workforce metrics
  const activeCount = workers.filter((w) => w.status === 'active').length;
  const totalTargetHours = workers.reduce((acc, w) => acc + w.weeklyTargetHours, 0);
  const completedEncountersThisMonth = 142;
  const totalCollectionsMonth = 28400;
  const compensationAccruedMonth = 15620;

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !newEmail) return;

    addWorker({
      practiceId: 'practice-demo-1',
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      phone: newPhone,
      role: newRole,
      employmentType: newEmploymentType,
      status: 'active',
      primaryLocationId: locations[0]?.id || 'loc-sf-downtown',
      hireDate: new Date().toISOString().split('T')[0],
      credentials: {
        licenseType: newLicenseType,
        licenseNumber: newLicenseNumber,
        licenseState: 'CA',
        npi: newNpi,
        taxonomyCode: '106H00000X',
        expirationDate: '2028-06-30',
      },
      compensationPlanId: newCompPlanId || compensationPlans[0]?.id || '',
      paySchedule: 'semi_monthly',
      avatarInitials: `${newFirstName[0]}${newLastName[0]}`,
      weeklyTargetHours: Number(newWeeklyTarget),
    });

    setShowAddModal(false);
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Practice Workforce</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Module 1: Unified Staffing &amp; Roles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage practice clinicians, supervisors, associates, W-2 employees, 1099 contractors, and assigned compensation plans.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Clinician / Staff
        </button>
      </div>

      {/* Aggregate Workforce Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Active Clinicians</div>
            <div className="text-xl font-black text-slate-900">{activeCount} Providers</div>
            <div className="text-[10px] text-emerald-600 font-medium">100% Licensed &amp; Credentialed</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Weekly Target Hours</div>
            <div className="text-xl font-black text-slate-900">{totalTargetHours} hrs/week</div>
            <div className="text-[10px] text-slate-500 font-medium">{completedEncountersThisMonth} encounters this month</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Attributable Collections</div>
            <div className="text-xl font-black text-slate-900">${totalCollectionsMonth.toLocaleString()}</div>
            <div className="text-[10px] text-purple-600 font-medium">Avg $200 per encounter</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Accrued Compensation</div>
            <div className="text-xl font-black text-slate-900">${compensationAccruedMonth.toLocaleString()}</div>
            <div className="text-[10px] text-amber-600 font-medium">Next payroll: Oct 20 ($8,420 due)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Staff ({workers.length})
          </button>
          <button
            onClick={() => setSelectedRoleFilter('practice_owner')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedRoleFilter === 'practice_owner'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Owners
          </button>
          <button
            onClick={() => setSelectedRoleFilter('licensed_clinician')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedRoleFilter === 'licensed_clinician'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Licensed Therapists
          </button>
          <button
            onClick={() => setSelectedRoleFilter('associate_clinician')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedRoleFilter === 'associate_clinician'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Associates (AMFT/ASW)
          </button>
          <button
            onClick={() => setSelectedRoleFilter('supervising_clinician')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedRoleFilter === 'supervising_clinician'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Supervisors
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:block">
          One system of record: licenses, NPI, and compensation
        </div>
      </div>

      {/* Clinician Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkers.map((worker) => {
          const compPlan = compensationPlans.find((p) => p.id === worker.compensationPlanId);
          const location = locations.find((l) => l.id === worker.primaryLocationId);

          return (
            <div
              key={worker.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white font-black text-base flex items-center justify-center shadow-xs">
                      {worker.avatarInitials}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {worker.firstName} {worker.lastName}, {worker.credentials.licenseType}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="capitalize">{worker.role.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{worker.employmentType === 'w2_employee' ? 'W-2 Employee' : '1099 Contractor'}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                {/* Details Pills */}
                <div className="grid grid-cols-2 gap-2 my-3 text-[11px] text-slate-600 font-mono">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">NPI / License</span>
                    NPI: {worker.credentials.npi} ({worker.credentials.licenseNumber})
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Location</span>
                    {location?.name.split(' ')[0] || 'San Francisco'} Suite
                  </div>
                </div>

                {/* Assigned Compensation Plan Callout */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Award className="h-3 w-3" />
                    Assigned Compensation Plan
                  </div>
                  <div className="font-bold text-slate-900">{compPlan?.name || 'Standard Tiered'}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{compPlan?.description}</div>
                </div>
              </div>

              {/* Footer stats */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Target: {worker.weeklyTargetHours} hrs/wk</span>
                <span className="font-semibold text-slate-700">Semi-monthly Pay</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Clinician Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Add New Clinician / Staff</h3>
                <p className="text-xs text-slate-500">Add worker to practice and assign compensation plan.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="e.g. Siobhan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="e.g. Gallagher"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Practice Email</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="siobhan@practice.org"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Practice Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as WorkerRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="licensed_clinician">Licensed Clinician</option>
                    <option value="associate_clinician">Associate Clinician (AMFT/ASW)</option>
                    <option value="supervising_clinician">Supervising Clinician</option>
                    <option value="billing_specialist">Billing Specialist</option>
                    <option value="administrative_assistant">Admin Staff</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Employment Type</label>
                  <select
                    value={newEmploymentType}
                    onChange={(e) => setNewEmploymentType(e.target.value as EmploymentType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="w2_employee">W-2 Employee</option>
                    <option value="1099_contractor">1099 Contractor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">License Type</label>
                  <select
                    value={newLicenseType}
                    onChange={(e) => setNewLicenseType(e.target.value as LicenseType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="LMFT">LMFT</option>
                    <option value="LCSW">LCSW</option>
                    <option value="LPCC">LPCC</option>
                    <option value="PsyD">PsyD</option>
                    <option value="MD">MD</option>
                    <option value="AMFT">AMFT</option>
                    <option value="ASW">ASW</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">License #</label>
                  <input
                    type="text"
                    value={newLicenseNumber}
                    onChange={(e) => setNewLicenseNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NPI</label>
                  <input
                    type="text"
                    value={newNpi}
                    onChange={(e) => setNewNpi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Compensation Plan</label>
                <select
                  value={newCompPlanId}
                  onChange={(e) => setNewCompPlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {compensationPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.rules.length} rules)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Add Clinician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceView;
