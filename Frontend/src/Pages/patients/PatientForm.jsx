import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Modal, Button, Input, Select, Textarea } from '../../components/ui';
import { patientService, userService } from '../../services';
import { toDateInput, calculateAge } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const BLANK = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: 'Unknown',
  phone: '',
  email: '',
  address: { street: '', city: '', state: '', pincode: '' },
  emergencyContact: { name: '', relationship: '', phone: '' },
  allergies: '',
  chronicConditions: '',
  currentMedications: '',
  patientType: 'OPD',
  department: '',
  assignedDoctor: '',
  roomNumber: '',
  notes: ''
};

const toList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Create/edit form for a patient, shared by both actions. */
const PatientForm = ({ open, onClose, onSaved, patient, meta }) => {
  const { user, seesAllDepartments } = useAuth();
  const isEdit = Boolean(patient);

  const [form, setForm] = useState(BLANK);
  const [doctors, setDoctors] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (patient) {
      setForm({
        ...BLANK,
        ...patient,
        dateOfBirth: toDateInput(patient.dateOfBirth),
        address: { ...BLANK.address, ...(patient.address || {}) },
        emergencyContact: { ...BLANK.emergencyContact, ...(patient.emergencyContact || {}) },
        allergies: (patient.allergies || []).join(', '),
        chronicConditions: (patient.chronicConditions || []).join(', '),
        currentMedications: (patient.currentMedications || []).join(', '),
        assignedDoctor: patient.assignedDoctor?._id || patient.assignedDoctor || ''
      });
    } else {
      // Clinical staff can only register into their own department, so it is
      // pre-filled and locked rather than offered and then rejected.
      setForm({ ...BLANK, department: seesAllDepartments ? '' : user.department });
    }
  }, [open, patient, user.department, seesAllDepartments]);

  useEffect(() => {
    if (!open || !form.department) {
      setDoctors([]);
      return;
    }
    userService
      .doctors({ department: form.department })
      .then((data) => setDoctors(data.doctors))
      .catch(() => setDoctors([]));
  }, [open, form.department]);

  const set = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setNested = (group, field, value) =>
    setForm((current) => ({ ...current, [group]: { ...current[group], [field]: value } }));

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Required';
    if (!form.lastName.trim()) next.lastName = 'Required';
    if (!form.dateOfBirth) next.dateOfBirth = 'Required';
    else if (new Date(form.dateOfBirth) > new Date()) next.dateOfBirth = 'Cannot be in the future';
    if (!form.gender) next.gender = 'Required';
    if (!/^\d{10}$/.test(String(form.phone).replace(/\D/g, '')))
      next.phone = 'Enter a 10 digit phone number';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Not a valid e-mail address';
    if (!form.department) next.department = 'Required';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      toast.error('Please correct the highlighted fields');
      return;
    }

    const payload = {
      ...form,
      allergies: toList(form.allergies),
      chronicConditions: toList(form.chronicConditions),
      currentMedications: toList(form.currentMedications),
      assignedDoctor: form.assignedDoctor || undefined,
      email: form.email || undefined
    };
    delete payload._id;
    delete payload.patientId;
    delete payload.tenantId;

    setSaving(true);
    try {
      const result = isEdit
        ? await patientService.update(patient._id, payload)
        : await patientService.create(payload);
      toast.success(result.message || 'Saved');
      onSaved();
      onClose();
    } catch (error) {
      // Field-level messages from the API land on the right inputs.
      if (error.details) setErrors(error.details);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const age = calculateAge(form.dateOfBirth);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${patient.firstName} ${patient.lastName}` : 'Register a patient'}
      subtitle={isEdit ? patient.patientId : 'A patient ID is generated automatically'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Save changes' : 'Register patient'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-6" noValidate>
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Personal details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              required
              value={form.firstName}
              error={errors.firstName}
              onChange={(e) => set('firstName', e.target.value)}
            />
            <Input
              label="Last name"
              required
              value={form.lastName}
              error={errors.lastName}
              onChange={(e) => set('lastName', e.target.value)}
            />
            <Input
              label="Date of birth"
              type="date"
              required
              max={toDateInput(new Date())}
              value={form.dateOfBirth}
              error={errors.dateOfBirth}
              hint={age !== null && age >= 0 ? `${age} years old` : undefined}
              onChange={(e) => set('dateOfBirth', e.target.value)}
            />
            <Select
              label="Gender"
              required
              placeholder="Select"
              options={meta.genders}
              value={form.gender}
              error={errors.gender}
              onChange={(e) => set('gender', e.target.value)}
            />
            <Select
              label="Blood group"
              options={meta.bloodGroups}
              value={form.bloodGroup}
              onChange={(e) => set('bloodGroup', e.target.value)}
            />
            <Input
              label="Phone"
              required
              inputMode="numeric"
              placeholder="9876543210"
              value={form.phone}
              error={errors.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
            <Input
              label="E-mail"
              type="email"
              className="sm:col-span-2"
              value={form.email}
              error={errors.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Care details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Patient type"
              options={meta.patientTypes}
              value={form.patientType}
              onChange={(e) => set('patientType', e.target.value)}
            />
            <Select
              label="Department"
              required
              placeholder="Select"
              options={meta.clinicalDepartments}
              value={form.department}
              error={errors.department}
              disabled={!seesAllDepartments}
              hint={!seesAllDepartments ? 'Limited to your own department' : undefined}
              onChange={(e) => set('department', e.target.value)}
            />
            <Select
              label="Assigned doctor"
              placeholder={form.department ? 'Unassigned' : 'Pick a department first'}
              options={doctors.map((doctor) => ({
                value: doctor._id,
                label: `Dr. ${doctor.firstName} ${doctor.lastName}${
                  doctor.specialization ? ` — ${doctor.specialization}` : ''
                }`
              }))}
              value={form.assignedDoctor}
              onChange={(e) => set('assignedDoctor', e.target.value)}
            />
            {form.patientType === 'IPD' && (
              <Input
                label="Room / bed"
                placeholder="C-204"
                value={form.roomNumber}
                onChange={(e) => set('roomNumber', e.target.value)}
              />
            )}
            {isEdit && (
              <Select
                label="Status"
                options={meta.patientStatuses}
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              />
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Input
              label="Allergies"
              placeholder="Penicillin, Peanuts"
              hint="Comma separated"
              value={form.allergies}
              onChange={(e) => set('allergies', e.target.value)}
            />
            <Input
              label="Chronic conditions"
              placeholder="Hypertension"
              hint="Comma separated"
              value={form.chronicConditions}
              onChange={(e) => set('chronicConditions', e.target.value)}
            />
            <Input
              label="Current medication"
              placeholder="Metformin 500mg"
              hint="Comma separated"
              value={form.currentMedications}
              onChange={(e) => set('currentMedications', e.target.value)}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Address
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Street"
              className="sm:col-span-2"
              value={form.address.street}
              onChange={(e) => setNested('address', 'street', e.target.value)}
            />
            <Input
              label="City"
              value={form.address.city}
              onChange={(e) => setNested('address', 'city', e.target.value)}
            />
            <Input
              label="State"
              value={form.address.state}
              onChange={(e) => setNested('address', 'state', e.target.value)}
            />
            <Input
              label="PIN code"
              value={form.address.pincode}
              onChange={(e) => setNested('address', 'pincode', e.target.value)}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Emergency contact
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Name"
              value={form.emergencyContact.name}
              onChange={(e) => setNested('emergencyContact', 'name', e.target.value)}
            />
            <Input
              label="Relationship"
              placeholder="Spouse"
              value={form.emergencyContact.relationship}
              onChange={(e) => setNested('emergencyContact', 'relationship', e.target.value)}
            />
            <Input
              label="Phone"
              value={form.emergencyContact.phone}
              onChange={(e) => setNested('emergencyContact', 'phone', e.target.value)}
            />
          </div>
          <Textarea
            label="Notes"
            className="mt-4"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </section>
      </form>
    </Modal>
  );
};

export default PatientForm;
