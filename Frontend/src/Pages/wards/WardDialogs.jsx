import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BedDouble, ArrowRightLeft, LogOut, Plus, Building2 } from 'lucide-react';
import { admissionService, wardService, patientService, userService } from '../../services';
import { Modal, Button, Input, Select, Textarea, Badge } from '../../components/ui';
import { formatCurrency, formatDate, pluralise } from '../../lib/format';

/* -------------------------------- admit ---------------------------------- */

export const AdmitDialog = ({ open, onClose, onDone, presetBed }) => {
  const [form, setForm] = useState({
    patientId: '',
    bedId: '',
    reason: '',
    diagnosis: '',
    attendingDoctor: '',
    notes: ''
  });
  const [patients, setPatients] = useState([]);
  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      patientId: '',
      bedId: presetBed?._id || '',
      reason: '',
      diagnosis: '',
      attendingDoctor: '',
      notes: ''
    });

    Promise.all([
      patientService.list({ limit: 100, status: 'Active' }),
      wardService.availableBeds(),
      userService.doctors()
    ])
      .then(([patientData, bedData, doctorData]) => {
        setPatients(patientData.patients);
        // A bed chosen from the board is not in the "available" list once it is
        // reserved, so keep it in the options.
        const options = bedData.beds;
        if (presetBed && !options.some((bed) => bed._id === presetBed._id)) {
          options.unshift(presetBed);
        }
        setBeds(options);
        setDoctors(doctorData.doctors);
      })
      .catch((error) => toast.error(error.message));
  }, [open, presetBed]);

  const patient = patients.find((entry) => entry._id === form.patientId);
  const bed = beds.find((entry) => entry._id === form.bedId);

  // Doctors are narrowed to the patient's department, matching the rule the API
  // applies to appointments.
  const eligibleDoctors = patient
    ? doctors.filter((doctor) => doctor.department === patient.department)
    : doctors;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.patientId || !form.bedId || !form.reason.trim()) {
      toast.error('A patient, a bed and a reason are required');
      return;
    }

    setSaving(true);
    try {
      const result = await admissionService.admit(form);
      toast.success(`${result.admission.admissionId} — patient admitted`);
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Admit a patient"
      subtitle={presetBed ? `Into ${presetBed.label || presetBed.bedNumber}` : undefined}
      icon={BedDouble}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Admit
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Select
          label="Patient"
          required
          placeholder="Select a patient"
          value={form.patientId}
          onChange={(event) => setForm((f) => ({ ...f, patientId: event.target.value }))}
          options={patients.map((entry) => ({
            value: entry._id,
            label: `${entry.firstName} ${entry.lastName} — ${entry.patientId} (${entry.department})`
          }))}
        />

        <Select
          label="Bed"
          required
          placeholder={beds.length ? 'Select an available bed' : 'No beds are free'}
          value={form.bedId}
          onChange={(event) => setForm((f) => ({ ...f, bedId: event.target.value }))}
          options={beds.map((entry) => ({
            value: entry._id,
            label: `${entry.label || entry.bedNumber}${entry.dailyRate ? ` — ${formatCurrency(entry.dailyRate)}/night` : ''}`
          }))}
        />

        {bed?.dailyRate > 0 && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Charged at <strong>{formatCurrency(bed.dailyRate)}</strong> per night. The room invoice
            is raised automatically on discharge.
          </p>
        )}

        <Select
          label="Attending doctor"
          placeholder={patient ? 'Optional' : 'Choose a patient first'}
          value={form.attendingDoctor}
          disabled={!patient}
          hint={patient ? `${patient.department} doctors` : undefined}
          onChange={(event) => setForm((f) => ({ ...f, attendingDoctor: event.target.value }))}
          options={eligibleDoctors.map((doctor) => ({
            value: doctor._id,
            label: `Dr. ${doctor.firstName} ${doctor.lastName}`
          }))}
        />

        <Input
          label="Reason for admission"
          required
          placeholder="Requires continuous monitoring"
          value={form.reason}
          onChange={(event) => setForm((f) => ({ ...f, reason: event.target.value }))}
        />
        <Input
          label="Provisional diagnosis"
          value={form.diagnosis}
          onChange={(event) => setForm((f) => ({ ...f, diagnosis: event.target.value }))}
        />
        <Textarea
          label="Notes"
          rows={2}
          value={form.notes}
          onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
        />
      </form>
    </Modal>
  );
};

/* ------------------------------- transfer -------------------------------- */

export const TransferDialog = ({ open, onClose, onDone, admission }) => {
  const [bedId, setBedId] = useState('');
  const [reason, setReason] = useState('');
  const [beds, setBeds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBedId('');
    setReason('');
    wardService
      .availableBeds()
      .then((data) => setBeds(data.beds))
      .catch((error) => toast.error(error.message));
  }, [open]);

  const submit = async () => {
    if (!bedId) {
      toast.error('Choose the bed to move the patient to');
      return;
    }
    setSaving(true);
    try {
      const result = await admissionService.transfer(admission._id, { bedId, reason });
      toast.success(result.message);
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move to another bed"
      subtitle={
        admission
          ? `${admission.patient?.firstName} ${admission.patient?.lastName} — currently ${admission.ward?.code} / ${admission.bed?.bedNumber}`
          : undefined
      }
      icon={ArrowRightLeft}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Move patient
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="New bed"
          required
          placeholder={beds.length ? 'Select an available bed' : 'No beds are free'}
          value={bedId}
          onChange={(event) => setBedId(event.target.value)}
          options={beds.map((bed) => ({
            value: bed._id,
            label: `${bed.label}${bed.dailyRate ? ` — ${formatCurrency(bed.dailyRate)}/night` : ''}`
          }))}
        />
        <Input
          label="Reason"
          placeholder="Closer to the nursing station"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <p className="text-xs text-slate-500">
          The move is recorded against the stay, and the nightly rate of the new bed applies from
          here on.
        </p>
      </div>
    </Modal>
  );
};

/* ------------------------------- discharge ------------------------------- */

export const DischargeDialog = ({ open, onClose, onDone, admission }) => {
  const [summary, setSummary] = useState('');
  const [createInvoice, setCreateInvoice] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSummary('');
      setCreateInvoice(true);
    }
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      const result = await admissionService.discharge(admission._id, {
        dischargeSummary: summary,
        createInvoice
      });
      toast.success(result.message);
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const nights = admission
    ? Math.max(Math.ceil((Date.now() - new Date(admission.admittedAt)) / 86400000), 1)
    : 0;
  const charge = nights * (admission?.dailyRate || 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Discharge patient"
      subtitle={
        admission ? `${admission.patient?.firstName} ${admission.patient?.lastName}` : undefined
      }
      icon={LogOut}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Discharge
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="space-y-1.5 rounded-lg bg-slate-50 p-3.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Admitted</dt>
            <dd className="font-medium text-slate-900">{formatDate(admission?.admittedAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Length of stay</dt>
            <dd className="font-medium text-slate-900">{pluralise(nights, 'night')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Nightly rate</dt>
            <dd className="font-medium text-slate-900">
              {formatCurrency(admission?.dailyRate || 0)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5">
            <dt className="text-slate-600">Room charges</dt>
            <dd className="font-semibold text-slate-900">{formatCurrency(charge)}</dd>
          </div>
        </dl>

        <Textarea
          label="Discharge summary"
          rows={3}
          placeholder="Recovered well. Discharged on oral medication with a follow-up in two weeks."
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={createInvoice}
            onChange={(event) => setCreateInvoice(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          Raise the room charge invoice
        </label>
      </div>
    </Modal>
  );
};

/* ------------------------------ create ward ------------------------------ */

export const WardDialog = ({ open, onClose, onDone, ward, meta }) => {
  const isEdit = Boolean(ward);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      ward
        ? { ...ward }
        : {
            name: '',
            code: '',
            type: 'General',
            department: 'General',
            floor: '',
            dailyRate: 2000,
            bedCount: 10,
            bedPrefix: ''
          }
    );
  }, [open, ward]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim() || !form.code?.trim()) {
      toast.error('A ward needs a name and a short code');
      return;
    }

    setSaving(true);
    try {
      const result = isEdit
        ? await wardService.update(ward._id, form)
        : await wardService.create({
            ...form,
            dailyRate: Number(form.dailyRate) || 0,
            bedCount: Number(form.bedCount) || 0
          });
      toast.success(result.message);
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${ward.name}` : 'Add a ward'}
      icon={Building2}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create ward'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label="Ward name"
          required
          className="sm:col-span-2"
          placeholder="Cardiology ICU"
          value={form.name || ''}
          onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
        />
        <Input
          label="Short code"
          required
          placeholder="CICU"
          hint="Shown on the bed board"
          disabled={isEdit}
          value={form.code || ''}
          onChange={(event) => setForm((f) => ({ ...f, code: event.target.value.toUpperCase() }))}
        />
        <Select
          label="Type"
          value={form.type || 'General'}
          onChange={(event) => setForm((f) => ({ ...f, type: event.target.value }))}
          options={meta.wardTypes}
        />
        <Select
          label="Department"
          value={form.department || 'General'}
          onChange={(event) => setForm((f) => ({ ...f, department: event.target.value }))}
          options={meta.departments}
        />
        <Input
          label="Floor"
          placeholder="3"
          value={form.floor || ''}
          onChange={(event) => setForm((f) => ({ ...f, floor: event.target.value }))}
        />
        <Input
          label="Nightly rate"
          type="number"
          min="0"
          value={form.dailyRate ?? 0}
          onChange={(event) => setForm((f) => ({ ...f, dailyRate: event.target.value }))}
        />

        {!isEdit && (
          <>
            <Input
              label="Beds to create"
              type="number"
              min="0"
              max="200"
              hint="Numbered automatically"
              value={form.bedCount ?? 0}
              onChange={(event) => setForm((f) => ({ ...f, bedCount: event.target.value }))}
            />
            <Input
              label="Bed prefix"
              placeholder="C"
              hint="C01, C02, and so on"
              value={form.bedPrefix || ''}
              onChange={(event) => setForm((f) => ({ ...f, bedPrefix: event.target.value }))}
            />
          </>
        )}

        {isEdit && (
          <Select
            label="Status"
            value={form.status || 'Active'}
            onChange={(event) => setForm((f) => ({ ...f, status: event.target.value }))}
            options={['Active', 'Closed']}
          />
        )}
      </form>
    </Modal>
  );
};

/* ------------------------------- add a bed -------------------------------- */

export const AddBedDialog = ({ open, onClose, onDone, ward }) => {
  const [bedNumber, setBedNumber] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBedNumber('');
      setDailyRate(ward?.dailyRate ?? '');
    }
  }, [open, ward]);

  const submit = async () => {
    if (!bedNumber.trim()) {
      toast.error('Enter a bed number');
      return;
    }
    setSaving(true);
    try {
      await wardService.addBed(ward._id, { bedNumber, dailyRate: Number(dailyRate) || 0 });
      toast.success(`Bed ${bedNumber} added`);
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a bed"
      subtitle={ward ? ward.name : undefined}
      icon={Plus}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Add bed
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Bed number"
          required
          autoFocus
          placeholder="C09"
          value={bedNumber}
          onChange={(event) => setBedNumber(event.target.value)}
        />
        <Input
          label="Nightly rate"
          type="number"
          min="0"
          hint={`Ward default is ${formatCurrency(ward?.dailyRate || 0)}`}
          value={dailyRate}
          onChange={(event) => setDailyRate(event.target.value)}
        />
      </div>
    </Modal>
  );
};

export const BedStatusBadge = ({ status }) => {
  const tones = { Available: 'green', Occupied: 'blue', Reserved: 'amber', Maintenance: 'slate' };
  return <Badge tone={tones[status] || 'slate'}>{status}</Badge>;
};
