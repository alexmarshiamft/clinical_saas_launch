/**
 * Feature 9: Appointment Calendar Scheduler
 * Full-screen scheduler using react-big-calendar with Month, Week, Day views,
 * booking modal (Appointment vs Out of Office), event editing, and telehealth linking.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Plus,
  Video,
  Clock,
  User,
  MapPin,
  CheckCircle2,
  FileText,
  AlertCircle,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import {
  getAppointments,
  addAppointment,
  updateAppointment,
  deleteAppointment,
  getClients,
  subscribeToTheraFlowStore,
} from './data/theraflow-store';
import {
  CalendarEventRecord,
  ClientRecord,
  AppointmentStatus,
  AppointmentLocation,
} from './types';
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

// Headless / JSDOM environment safeguard for react-big-calendar TimeGrid
if (typeof window !== 'undefined') {
  if (!window.requestAnimationFrame) {
    (window as any).requestAnimationFrame = (callback: (time: number) => void): number => {
      return setTimeout(() => callback(Date.now()), 16) as unknown as number;
    };
  }
  if (!window.cancelAnimationFrame) {
    (window as any).cancelAnimationFrame = (id: number): void => {
      clearTimeout(id);
    };
  }
}

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalendarViewProps {
  initialClientId?: string;
  onNavigateToTelehealth?: (clientId: string) => void;
  onNavigateToNotes?: (clientId: string) => void;
}

interface CalendarEventDisplay {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEventRecord;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  initialClientId,
  onNavigateToTelehealth,
  onNavigateToNotes,
}) => {
  const { activePatient, setActivePatient } = useClinicalContext();
  const [appointments, setAppointments] = useState<CalendarEventRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'appointment' | 'ooo'>('appointment');
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId || '');
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('10:50');
  const [sessionType, setSessionType] = useState<string>('Individual Psychotherapy (CPT 90837)');
  const [cptCode, setCptCode] = useState<string>('90837');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [location, setLocation] = useState<AppointmentLocation>('Telehealth');
  const [oooReason, setOooReason] = useState<string>('Clinical Supervision');
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Selected Event Details Modal State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadData = useCallback(async () => {
    const [appts, clis] = await Promise.all([getAppointments(), getClients()]);
    setAppointments(appts);
    setClients(clis);
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribeToTheraFlowStore(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  // Pre-fill initial client if passed
  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
      setIsBookingOpen(true);
    }
  }, [initialClientId]);

  // Map events to react-big-calendar structure
  const calendarEvents = useMemo<CalendarEventDisplay[]>(() => {
    return appointments.map((appt) => {
      const start = new Date(appt.start_time);
      const end = new Date(appt.end_time);

      let title = appt.is_out_of_office
        ? `Out of Office: ${appt.ooo_reason || 'Blocked'}`
        : `${appt.client_name || 'Patient'} — ${appt.cpt_code || '90837'}`;

      return {
        id: appt.id,
        title,
        start,
        end,
        resource: appt,
      };
    });
  }, [appointments]);

  // Dynamic Event Color Coding
  const eventPropGetter = useCallback((event: CalendarEventDisplay) => {
    const appt = event.resource;
    let bg = '#3b82f6'; // Scheduled blue
    let border = '#2563eb';

    if (appt.is_out_of_office) {
      bg = '#64748b'; // Slate gray
      border = '#475569';
    } else if (appt.status === 'completed') {
      bg = '#10b981'; // Emerald green
      border = '#059669';
    } else if (appt.status === 'cancelled') {
      bg = '#ef4444'; // Red
      border = '#dc2626';
    }

    return {
      style: {
        backgroundColor: bg,
        borderColor: border,
        borderRadius: '6px',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: '600',
        padding: '2px 6px',
        border: `1px solid ${border}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      },
    };
  }, []);

  // Handle slot selection (clicking or dragging on empty calendar slot)
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const dateStr = format(start, 'yyyy-MM-dd');
    const startStr = format(start, 'HH:mm');
    const endStr = format(end, 'HH:mm');

    setSessionDate(dateStr);
    setStartTime(startStr);
    setEndTime(endStr);
    setIsBookingOpen(true);
  }, []);

  // Handle clicking an event
  const handleSelectEvent = useCallback((event: CalendarEventDisplay) => {
    setSelectedEvent(event.resource);
    setIsEditing(false);
    setIsDetailsOpen(true);
  }, []);

  // Handle booking form submission
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = new Date(`${sessionDate}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${sessionDate}T${endTime}:00`).toISOString();

    if (bookingMode === 'ooo') {
      await addAppointment({
        start_time: startDateTime,
        end_time: endDateTime,
        session_type: 'Out of Office',
        status: 'scheduled',
        location: 'In-Person',
        is_out_of_office: true,
        ooo_reason: oooReason,
        therapist_id: 'a0000000-0000-4000-8000-000000000001',
      });
      toast.success(`Out of office block added: ${oooReason}`);
    } else {
      const selectedClient = clients.find((c) => c.id === selectedClientId);
      const clientName = selectedClient
        ? `${selectedClient.first_name} ${selectedClient.last_name}`
        : 'Patient Encounter';

      await addAppointment({
        client_id: selectedClientId || undefined,
        client_name: clientName,
        client_email: selectedClient?.email,
        client_phone: selectedClient?.phone,
        start_time: startDateTime,
        end_time: endDateTime,
        session_type: sessionType,
        cpt_code: cptCode,
        status,
        location,
        notes: sessionNotes,
        therapist_id: 'a0000000-0000-4000-8000-000000000001',
      });
      toast.success(`Session scheduled for ${clientName}!`);
    }

    setIsBookingOpen(false);
  };

  // Handle event update in edit modal
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    await updateAppointment(selectedEvent.id, {
      status,
      location,
      session_type: sessionType,
      cpt_code: cptCode,
      notes: sessionNotes,
    });

    toast.success('Encounter schedule updated successfully!');
    setIsDetailsOpen(false);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    await deleteAppointment(selectedEvent.id);
    toast.success('Appointment removed from schedule');
    setIsDetailsOpen(false);
  };

  const handleSetActiveFromEvent = (appt: CalendarEventRecord) => {
    if (appt.client_id) {
      const cli = clients.find((c) => c.id === appt.client_id);
      if (cli) {
        setActivePatient({
          id: cli.id,
          name: `${cli.first_name} ${cli.last_name}`,
          dob: cli.date_of_birth,
          mrn: cli.mrn || `#MC-${cli.id.slice(0, 5).toUpperCase()}`,
          cptCode: appt.cpt_code || '90837',
          cptDesc: 'Psychotherapy (60m)',
          encounterId: appt.id,
          nextAppt: `${appt.start_time.split('T')[0]} at ${appt.start_time.split('T')[1]?.slice(0, 5)}`,
        });
        toast.success(`Active patient set to ${cli.first_name} ${cli.last_name}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Clinical Appointment Scheduler
            </h2>
            <p className="text-xs text-slate-500">
              Interactive session matrix with CPT tracking and telehealth linkage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-slate-600 gap-1 text-xs font-semibold">
            <button
              onClick={() => setCurrentView(Views.MONTH)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                currentView === Views.MONTH ? 'bg-white text-indigo-900 shadow-xs' : 'hover:bg-slate-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCurrentView(Views.WEEK)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                currentView === Views.WEEK ? 'bg-white text-indigo-900 shadow-xs' : 'hover:bg-slate-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCurrentView(Views.DAY)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                currentView === Views.DAY ? 'bg-white text-indigo-900 shadow-xs' : 'hover:bg-slate-200'
              }`}
            >
              Day
            </button>
          </div>

          <Button
            onClick={() => {
              setBookingMode('appointment');
              setIsBookingOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Book Session
          </Button>
        </div>
      </div>

      {/* Calendar Sizing Container */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs min-h-[650px] h-[calc(100vh-230px)] overflow-hidden">
        <BigCalendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          onView={(newView) => setCurrentView(newView)}
          date={currentDate}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          step={15}
          timeslots={4}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          style={{ height: '100%' }}
        />
      </div>

      {/* Booking Modal (Dialog) */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bookingMode === 'appointment' ? 'Schedule Clinical Encounter' : 'Schedule Out of Office'}
            </DialogTitle>
            <DialogDescription>
              Select encounter modality, session duration, and CPT billing code.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
            <button
              type="button"
              onClick={() => setBookingMode('appointment')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                bookingMode === 'appointment'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clinical Appointment
            </button>
            <button
              type="button"
              onClick={() => setBookingMode('ooo')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                bookingMode === 'ooo'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out of Office
            </button>
          </div>

          <form onSubmit={handleSaveAppointment} className="space-y-4 text-xs">
            {bookingMode === 'appointment' ? (
              <>
                <div>
                  <Label>Patient Selection *</Label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    <option value="">Select a patient from roster...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.mrn || 'Patient'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Session Type (CPT)</Label>
                    <select
                      value={cptCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setCptCode(code);
                        const names: Record<string, string> = {
                          '90837': 'Individual Psychotherapy (CPT 90837)',
                          '90834': 'Individual Psychotherapy (CPT 90834)',
                          '90791': 'Diagnostic Evaluation (CPT 90791)',
                          '90847': 'Family / Couples Therapy (CPT 90847)',
                        };
                        setSessionType(names[code] || 'Psychotherapy');
                      }}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="90837">90837 — 60 Min Psychotherapy</option>
                      <option value="90834">90834 — 45 Min Psychotherapy</option>
                      <option value="90791">90791 — Diagnostic Evaluation</option>
                      <option value="90847">90847 — Family Therapy (50m)</option>
                    </select>
                  </div>

                  <div>
                    <Label>Modality</Label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value as AppointmentLocation)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Telehealth">Telehealth (Encrypted WebRTC)</option>
                      <option value="In-Person">In-Person (Clinic Office)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Out of Office Reason *</Label>
                  <Input
                    value={oooReason}
                    onChange={(e) => setOooReason(e.target.value)}
                    placeholder="Clinical Supervision, Vacation, Case Conference..."
                    required
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Confirm Schedule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event Details / Edit Modal */}
      {selectedEvent && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {selectedEvent.is_out_of_office
                    ? 'Out of Office Block'
                    : selectedEvent.client_name || 'Encounter Details'}
                </span>
                <Badge
                  variant={
                    selectedEvent.status === 'completed'
                      ? 'emerald'
                      : selectedEvent.status === 'cancelled'
                      ? 'destructive'
                      : 'blue'
                  }
                  className="capitalize text-[10px]"
                >
                  {selectedEvent.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedEvent.session_type} • {selectedEvent.location}
              </DialogDescription>
            </DialogHeader>

            {!isEditing ? (
              <div className="space-y-4 text-xs">
                {/* Time & Location */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>
                      {selectedEvent.start_time.split('T')[0]} •{' '}
                      {selectedEvent.start_time.split('T')[1]?.slice(0, 5)} -{' '}
                      {selectedEvent.end_time.split('T')[1]?.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{selectedEvent.location}</span>
                  </div>
                </div>

                {/* Patient contact if regular appointment */}
                {!selectedEvent.is_out_of_office && selectedEvent.client_id && (
                  <div className="space-y-1 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Client:</span>{' '}
                      {selectedEvent.client_name}
                    </div>
                    {selectedEvent.client_email && (
                      <div>
                        <span className="font-semibold text-slate-700">Email:</span>{' '}
                        {selectedEvent.client_email}
                      </div>
                    )}
                    {selectedEvent.client_phone && (
                      <div>
                        <span className="font-semibold text-slate-700">Phone:</span>{' '}
                        {selectedEvent.client_phone}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  {selectedEvent.location === 'Telehealth' && selectedEvent.client_id && (
                    <Button
                      onClick={() => {
                        setIsDetailsOpen(false);
                        onNavigateToTelehealth?.(selectedEvent.client_id!);
                      }}
                      className="flex items-center justify-center gap-1.5"
                    >
                      <Video className="h-4 w-4" />
                      Join Telehealth Session
                    </Button>
                  )}

                  {!selectedEvent.is_out_of_office && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleSetActiveFromEvent(selectedEvent)}
                      >
                        Set as Active Patient
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDetailsOpen(false);
                          if (selectedEvent.client_id) {
                            onNavigateToNotes?.(selectedEvent.client_id);
                          }
                        }}
                      >
                        Write / View DAP Note
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 text-slate-600"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Encounter
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteEvent}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateEvent} className="space-y-3 text-xs">
                <div>
                  <Label>Status</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <Label>Modality</Label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value as AppointmentLocation)}
                    className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value="Telehealth">Telehealth</option>
                    <option value="In-Person">In-Person</option>
                  </select>
                </div>

                <div>
                  <Label>Session Notes</Label>
                  <Input
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Encounter updates..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CalendarView;
