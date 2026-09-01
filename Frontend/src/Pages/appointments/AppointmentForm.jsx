import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { CalendarClock, CircleCheck, Info } from 'lucide-react';
import { appointmentService, patientService, userService } from '../../services';
import { Modal, Button, Input, Select, Textarea, Spinner, Badge } from '../../components/ui';
import { toDateInput, todayInput, formatTime } from '../../lib/format';

const BLANK = {
  patientId: '',
  doctorId: '',
  appointmentDate: todayInput(),
  appointmentTime: '',
  durationMinutes: 30,
  appointmentType: 'OPD',
  reason: '',
  symptoms: ''
};

const AppointmentForm = ({ open, onClose, onSaved, appointment, meta }) => {
  const isEdit = Boolean(appointment);

  const [form, setForm] = useState(BLANK);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      appointment
        ? {
            patientId: appointment.patientId?._id || appointment.patientId || '',
            doctorId: appointment.doctorId?._id || appointment.doctorId || '',
            appointmentDate: toDateInput(appointment.appointmentDate),
            appointmentTime: appointment.appointmentTime || '',
            durationMinutes: appointment.durationMinutes || 30,
            appointmentType: appointment.appointmentType || 'OPD',
            reason: appointment.reason || '',
            symptoms: (appointment.symptoms || []).join(', ')
          }
        : BLANK
    );
  }, [open, appointment]);

  useEffect(() => {
    if (!open) return;
    Promise.all([patientService.list({ limit: 100, status: 'Active' }), userService.doctors()])
      .then(([patientData, doctorData]) => {
        setPatients(patientData.patients);
        setDoctors(doctorData.doctors);
      })
      .catch((error) => toast.error(error.message));
  }, [open]);

  const selectedPatient = patients.find((patient) => patient._id === form.patientId);
  const selectedDoctor = doctors.find((doctor) => doctor._id === form.doctorId);

  /**
   * A patient may only see a doctor from their own department - the API
   * enforces it, so the picker narrows the options rather than letting someone
   * choose a combination that will be rejected on save.
   */
  const availableDoctors = useMemo(() => {
    if (!selectedPatient) return doctors;
    return doctors.filter((doctor) => doctor.department === selectedPatient.department);
  }, [doctors, selectedPatient]);

  // Clear a doctor who no longer matches the chosen patient's department.
  useEffect(() => {
    if (form.doctorId && selectedPatient && selectedDoctor) {
      if (selectedDoctor.department !== selectedPatient.department) {
        setForm((current) => ({ ...current, doctorId: '', appointmentTime: '' }));
      }
    }
  }, [form.doctorId, selectedPatient, selectedDoctor]);

  // Real availability from the server, so a clashing slot is visible before
  // the user submits instead of coming back as an error.
  useEffect(() => {
    if (!open || !form.doctorId || !form.appointmentDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    appointmentService
      .availability(form.doctorId, form.appointmentDate)
      .then((data) => setSlots(data.slots))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [open, form.doctorId, form.appointmentDate]);

  const set = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (!form.patientId) next.patientId = 'Choose a patient';
    if (!form.doctorId) next.doctorId = 'Choose a doctor';
    if (!form.appointmentDate) next.appointmentDate = 'Choose a date';
    if (!form.appointmentTime) next.appointmentTime = 'Choose a time';
    if (!form.reason.trim()) next.reason = 'Give a reason for the visit';

    setErrors(next);
    if (Object.keys(next).length) {
      toast.error('Please complete the highlighted fields');
      return;
    }

    const payload = {
      ...form,
      symptoms: form.symptoms
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      durationMinutes: Number(form.durationMinutes)
    };

    setSaving(true);
    try {
      const result = isEdit
        ? await appointmentService.update(appointment._id, payload)
        : await appointmentService.create(payload);
      toast.success(result.message || 'Saved');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.message);
      if (error.details) setErrors(error.details);
    } finally {
      setSaving(false);
    }
  };

  const currentSlotTaken =
    form.appointmentTime &&
    slots.length > 0 &&
    slots.find((slot) => slot.time === form.appointmentTime)?.available === false &&
    form.appointmentTime !== appointment?.appointmentTime;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${appointment.appointmentId}` : 'Book an appointment'}
      icon={CalendarClock}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Save changes' : 'Book appointment'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Patient"
            required
            placeholder="Select a patient"
            value={form.patientId}
            error={errors.patientId}
            onChange={(event) => set('patientId', event.target.value)}
            options={patients.map((patient) => ({
              value: patient._id,
              label: `${patient.firstName} ${patient.lastName} — ${patient.patientId} (${patient.department})`
            }))}
          />

          <Select
            label="Doctor"
            required
            placeholder={selectedPatient ? 'Select a doctor' : 'Choose a patient first'}
            value={form.doctorId}
            error={errors.doctorId}
            disabled={!selectedPatient}
            hint={
              selectedPatient
                ? `Showing ${selectedPatient.department} doctors`
                : undefined
            }
            onChange={(event) => set('doctorId', event.target.value)}
            options={availableDoctors.map((doctor) => ({
              value: doctor._id,
              label: `Dr. ${doctor.firstName} ${doctor.lastName}${
                doctor.specialization ? ` — ${doctor.specialization}` : ''
              }`
            }))}
          />
        </div>

        {selectedPatient && availableDoctors.length === 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            No doctor is registered in {selectedPatient.department}. Add one under Staff, or move the
            patient to another department.
          </p>
        )}

        {selectedPatient?.allergies?.length > 0 && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <strong>Allergies on file:</strong> {selectedPatient.allergies.join(', ')}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Date"
            type="date"
            required
            min={isEdit ? undefined : todayInput()}
            value={form.appointmentDate}
            error={errors.appointmentDate}
            onChange={(event) => set('appointmentDate', event.target.value)}
          />
          <Input
            label="Time"
            type="time"
            required
            value={form.appointmentTime}
            error={errors.appointmentTime || (currentSlotTaken ? 'That slot is already taken' : undefined)}
            onChange={(event) => set('appointmentTime', event.target.value)}
          />
          <Select
            label="Duration"
            value={form.durationMinutes}
            onChange={(event) => set('durationMinutes', event.target.value)}
            options={[
              { value: 15, label: '15 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 45, label: '45 minutes' },
              { value: 60, label: '1 hour' }
            ]}
          />
        </div>

        {/* Slot picker */}
        {form.doctorId && form.appointmentDate && (
          <div className="rounded-lg border border-slate-200 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Available slots
              </p>
              {loadingSlots && <Spinner className="h-4 w-4" />}
            </div>

            {slots.length === 0 ? (
              <p className="py-2 text-sm text-slate-500">
                {loadingSlots ? 'Checking the diary…' : 'No slots published for this day.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((slot) => {
                  const selected = form.appointmentTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available && !selected}
                      onClick={() => set('appointmentTime', slot.time)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors
                        ${selected
                          ? 'bg-cyan-600 text-white'
                          : slot.available
                            ? 'bg-slate-100 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700'
                            : 'cursor-not-allowed bg-slate-50 text-slate-300 line-through'}`}
                    >
                      {formatTime(slot.time)}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedDoctor && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Dr. {selectedDoctor.lastName} works {formatTime(selectedDoctor.availableFrom)} to{' '}
                {formatTime(selectedDoctor.availableTo)}
                {selectedDoctor.consultationFee > 0 && (
                  <Badge tone="green" className="ml-1">
                    Fee ₹{selectedDoctor.consultationFee}
                  </Badge>
                )}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={form.appointmentType}
            onChange={(event) => set('appointmentType', event.target.value)}
            options={meta.appointmentTypes}
          />
          <Input
            label="Symptoms"
            placeholder="Fever, cough"
            hint="Comma separated"
            value={form.symptoms}
            onChange={(event) => set('symptoms', event.target.value)}
          />
        </div>

        <Textarea
          label="Reason for the visit"
          required
          rows={2}
          value={form.reason}
          error={errors.reason}
          onChange={(event) => set('reason', event.target.value)}
        />
      </form>
    </Modal>
  );
};

export default AppointmentForm;
