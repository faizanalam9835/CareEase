import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Plus, Trash2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { prescriptionService, patientService, pharmacyService } from '../../services';
import { Modal, Button, Input, Select, Textarea, Badge } from '../../components/ui';
import { toDateInput } from '../../lib/format';

const BLANK_LINE = {
  medicineName: '',
  dosage: '',
  frequency: 'Twice daily',
  duration: '5 days',
  quantity: 10,
  instructions: ''
};

const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 6 hours',
  'As needed'
];

const PrescriptionForm = ({ open, onClose, onSaved, prescription }) => {
  const isEdit = Boolean(prescription);

  const [form, setForm] = useState({
    patientId: '',
    diagnosis: '',
    symptoms: '',
    testsRecommended: '',
    followUpDate: '',
    notes: ''
  });
  const [lines, setLines] = useState([{ ...BLANK_LINE }]);
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (prescription) {
      setForm({
        patientId: prescription.patientId?._id || prescription.patientId || '',
        diagnosis: prescription.diagnosis || '',
        symptoms: (prescription.symptoms || []).join(', '),
        testsRecommended: (prescription.testsRecommended || []).join(', '),
        followUpDate: toDateInput(prescription.followUpDate),
        notes: prescription.notes || ''
      });
      setLines(
        prescription.medicines?.length
          ? prescription.medicines.map((line) => ({ ...line }))
          : [{ ...BLANK_LINE }]
      );
    } else {
      setForm({
        patientId: '',
        diagnosis: '',
        symptoms: '',
        testsRecommended: '',
        followUpDate: '',
        notes: ''
      });
      setLines([{ ...BLANK_LINE }]);
    }
  }, [open, prescription]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      patientService.list({ limit: 100, status: 'Active' }),
      // Offering the pharmacy's actual catalogue means what is prescribed can
      // usually be dispensed without a free-text mismatch.
      pharmacyService.list({ limit: 100 }).catch(() => ({ medicines: [] }))
    ])
      .then(([patientData, medicineData]) => {
        setPatients(patientData.patients);
        setMedicines(medicineData.medicines || []);
      })
      .catch((error) => toast.error(error.message));
  }, [open]);

  const patient = patients.find((entry) => entry._id === form.patientId);

  const setLine = (index, field, value) =>
    setLines((current) =>
      current.map((line, position) => (position === index ? { ...line, [field]: value } : line))
    );

  /** Picking from the catalogue fills the dosage and links the inventory item. */
  const chooseMedicine = (index, medicineId) => {
    const medicine = medicines.find((entry) => entry._id === medicineId);
    if (!medicine) return;
    setLines((current) =>
      current.map((line, position) =>
        position === index
          ? { ...line, medicine: medicine._id, medicineName: medicine.name, dosage: medicine.dosage }
          : line
      )
    );
  };

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (!form.patientId) next.patientId = 'Choose a patient';
    if (!form.diagnosis.trim()) next.diagnosis = 'Enter a diagnosis';

    const cleanLines = lines.filter((line) => line.medicineName.trim());
    if (cleanLines.length === 0) next.medicines = 'Add at least one medicine';
    else if (cleanLines.some((line) => !line.dosage || !line.frequency || !line.duration)) {
      next.medicines = 'Every medicine needs a dosage, frequency and duration';
    }

    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(next.medicines || 'Please complete the highlighted fields');
      return;
    }

    const payload = {
      ...form,
      symptoms: form.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
      testsRecommended: form.testsRecommended.split(',').map((s) => s.trim()).filter(Boolean),
      followUpDate: form.followUpDate || undefined,
      medicines: cleanLines.map((line) => ({
        medicine: line.medicine || undefined,
        medicineName: line.medicineName,
        dosage: line.dosage,
        frequency: line.frequency,
        duration: line.duration,
        instructions: line.instructions,
        quantity: Number(line.quantity) || 1
      }))
    };

    setSaving(true);
    try {
      const result = isEdit
        ? await prescriptionService.update(prescription._id, payload)
        : await prescriptionService.create(payload);

      toast.success(result.message || 'Prescription saved');
      // The API flags a clash with the patient's recorded allergies.
      result.warnings?.forEach((warning) =>
        toast(warning, {
          icon: <TriangleAlert className="h-5 w-5 text-amber-400" aria-hidden="true" />,
          duration: 8000
        })
      );
      onSaved();
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
      title={isEdit ? `Edit ${prescription.prescriptionId}` : 'Write a prescription'}
      icon={FileText}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create prescription'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Select
          label="Patient"
          required
          placeholder="Select a patient"
          value={form.patientId}
          error={errors.patientId}
          disabled={isEdit}
          onChange={(event) => setForm((f) => ({ ...f, patientId: event.target.value }))}
          options={patients.map((entry) => ({
            value: entry._id,
            label: `${entry.firstName} ${entry.lastName} — ${entry.patientId} (${entry.department})`
          }))}
        />

        {patient?.allergies?.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Allergies on file:</strong> {patient.allergies.join(', ')}
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Diagnosis"
            required
            className="sm:col-span-2"
            placeholder="Stable angina"
            value={form.diagnosis}
            error={errors.diagnosis}
            onChange={(event) => setForm((f) => ({ ...f, diagnosis: event.target.value }))}
          />
          <Input
            label="Symptoms"
            placeholder="Chest pain, breathlessness"
            hint="Comma separated"
            value={form.symptoms}
            onChange={(event) => setForm((f) => ({ ...f, symptoms: event.target.value }))}
          />
          <Input
            label="Tests recommended"
            placeholder="ECG, Lipid profile"
            hint="Comma separated"
            value={form.testsRecommended}
            onChange={(event) => setForm((f) => ({ ...f, testsRecommended: event.target.value }))}
          />
        </div>

        {/* Medicines */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Medicines
            </h3>
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              onClick={() => setLines((current) => [...current, { ...BLANK_LINE }])}
            >
              Add medicine
            </Button>
          </div>

          {errors.medicines && (
            <p className="mb-2 text-xs text-red-600">{errors.medicines}</p>
          )}

          <div className="space-y-3">
            {lines.map((line, index) => {
              const catalogue = medicines.find(
                (entry) => entry.name.toLowerCase() === line.medicineName.toLowerCase()
              );
              return (
                <div key={index} className="rounded-lg border border-slate-200 p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                      Medicine {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {catalogue && (
                        <Badge tone={catalogue.stockQuantity > 0 ? 'green' : 'red'}>
                          {catalogue.stockQuantity} in stock
                        </Badge>
                      )}
                      {lines.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          aria-label={`Remove medicine ${index + 1}`}
                          className="text-red-500 hover:bg-red-50"
                          onClick={() =>
                            setLines((current) => current.filter((_, position) => position !== index))
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      label="From inventory"
                      placeholder="Or type a name below"
                      value={line.medicine || ''}
                      onChange={(event) => chooseMedicine(index, event.target.value)}
                      options={medicines.map((medicine) => ({
                        value: medicine._id,
                        label: `${medicine.name} ${medicine.dosage} (${medicine.stockQuantity} in stock)`
                      }))}
                    />
                    <Input
                      label="Medicine name"
                      required
                      value={line.medicineName}
                      onChange={(event) => setLine(index, 'medicineName', event.target.value)}
                    />
                    <Input
                      label="Dosage"
                      required
                      placeholder="500mg"
                      value={line.dosage}
                      onChange={(event) => setLine(index, 'dosage', event.target.value)}
                    />
                    <Select
                      label="Frequency"
                      required
                      value={line.frequency}
                      onChange={(event) => setLine(index, 'frequency', event.target.value)}
                      options={FREQUENCIES}
                    />
                    <Input
                      label="Duration"
                      required
                      placeholder="5 days"
                      value={line.duration}
                      onChange={(event) => setLine(index, 'duration', event.target.value)}
                    />
                    <Input
                      label="Quantity"
                      type="number"
                      min="1"
                      required
                      value={line.quantity}
                      onChange={(event) => setLine(index, 'quantity', event.target.value)}
                    />
                    <Input
                      label="Instructions"
                      className="sm:col-span-2"
                      placeholder="After food"
                      value={line.instructions}
                      onChange={(event) => setLine(index, 'instructions', event.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Follow-up date"
            type="date"
            value={form.followUpDate}
            onChange={(event) => setForm((f) => ({ ...f, followUpDate: event.target.value }))}
          />
        </div>

        <Textarea
          label="Notes"
          rows={2}
          placeholder="Return sooner if symptoms worsen."
          value={form.notes}
          onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
        />
      </form>
    </Modal>
  );
};

export default PrescriptionForm;
