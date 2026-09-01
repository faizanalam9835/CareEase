import { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Droplet,
  ShieldAlert,
  CalendarDays,
  FileText,
  Receipt,
  User,
  BedDouble,
  HeartPulse
} from 'lucide-react';
import { patientService } from '../../services';
import { Modal, Badge, LoadingState, ErrorState, EmptyState } from '../../components/ui';
import {
  formatDate,
  formatCurrency,
  formatTime,
  calculateAge,
  APPOINTMENT_TONE,
  PAYMENT_TONE,
  PHARMACY_TONE,
  PATIENT_TONE
} from '../../lib/format';

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2.5">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="break-words text-sm text-slate-800">{value || '—'}</p>
    </div>
  </div>
);

const Section = ({ title, icon: Icon, count, children }) => (
  <section>
    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {title}
      {count !== undefined && <span className="text-slate-300">({count})</span>}
    </h3>
    {children}
  </section>
);

/** Read-only patient file: details plus appointment, prescription and invoice history. */
const PatientDetail = ({ open, onClose, patientId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !patientId) return;
    setLoading(true);
    setError(null);
    patientService
      .get(patientId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, patientId]);

  const patient = data?.patient;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patient ? `${patient.firstName} ${patient.lastName}` : 'Patient file'}
      subtitle={patient ? `${patient.patientId} — ${patient.department}` : undefined}
      icon={User}
      size="lg"
    >
      {loading ? (
        <LoadingState label="Loading the patient file" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-7">
          <div className="flex flex-wrap gap-2">
            <Badge tone={PATIENT_TONE[patient.status] || 'slate'}>{patient.status}</Badge>
            <Badge tone={patient.patientType === 'IPD' ? 'purple' : 'cyan'}>
              {patient.patientType}
            </Badge>
            {patient.bloodGroup !== 'Unknown' && (
              <Badge tone="red" icon={Droplet}>
                {patient.bloodGroup}
              </Badge>
            )}
            {data.summary.outstandingBalance > 0 && (
              <Badge tone="amber">
                {formatCurrency(data.summary.outstandingBalance)} outstanding
              </Badge>
            )}
          </div>

          {patient.allergies?.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-red-800">Allergies</p>
                <p className="text-sm text-red-700">{patient.allergies.join(', ')}</p>
              </div>
            </div>
          )}

          <Section title="Details" icon={User}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Row
                icon={CalendarDays}
                label="Date of birth"
                value={`${formatDate(patient.dateOfBirth)} (${calculateAge(patient.dateOfBirth)} years)`}
              />
              <Row icon={User} label="Gender" value={patient.gender} />
              <Row icon={Phone} label="Phone" value={patient.phone} />
              <Row icon={Mail} label="E-mail" value={patient.email} />
              <Row
                icon={MapPin}
                label="Address"
                value={
                  [
                    patient.address?.street,
                    patient.address?.city,
                    patient.address?.state,
                    patient.address?.pincode
                  ]
                    .filter(Boolean)
                    .join(', ') || null
                }
              />
              <Row
                icon={Phone}
                label="Emergency contact"
                value={
                  patient.emergencyContact?.name
                    ? `${patient.emergencyContact.name} (${
                        patient.emergencyContact.relationship || 'contact'
                      }) — ${patient.emergencyContact.phone || 'no number'}`
                    : null
                }
              />
              <Row
                icon={HeartPulse}
                label="Assigned doctor"
                value={
                  patient.assignedDoctor
                    ? `Dr. ${patient.assignedDoctor.firstName} ${patient.assignedDoctor.lastName}`
                    : null
                }
              />
              {patient.patientType === 'IPD' && (
                <Row icon={BedDouble} label="Room" value={patient.roomNumber} />
              )}
            </div>

            {(patient.chronicConditions?.length > 0 || patient.currentMedications?.length > 0) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {patient.chronicConditions?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400">Chronic conditions</p>
                    <p className="text-sm text-slate-800">{patient.chronicConditions.join(', ')}</p>
                  </div>
                )}
                {patient.currentMedications?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400">Current medication</p>
                    <p className="text-sm text-slate-800">{patient.currentMedications.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section
            title="Appointments"
            icon={CalendarDays}
            count={data.history.appointments.length}
          >
            {data.history.appointments.length === 0 ? (
              <EmptyState title="No appointments yet" className="py-8" />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {data.history.appointments.map((appointment) => (
                  <li key={appointment._id} className="flex items-center gap-3 p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {formatDate(appointment.appointmentDate)} at{' '}
                        {formatTime(appointment.appointmentTime)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        Dr. {appointment.doctorId?.firstName} {appointment.doctorId?.lastName} —{' '}
                        {appointment.reason}
                      </span>
                    </span>
                    <Badge tone={APPOINTMENT_TONE[appointment.status] || 'slate'}>
                      {appointment.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Prescriptions" icon={FileText} count={data.history.prescriptions.length}>
            {data.history.prescriptions.length === 0 ? (
              <EmptyState title="No prescriptions yet" className="py-8" />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {data.history.prescriptions.map((prescription) => (
                  <li key={prescription._id} className="flex items-center gap-3 p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {prescription.diagnosis}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {prescription.prescriptionId} — {prescription.medicines?.length} medicine(s)
                        — {formatDate(prescription.createdAt)}
                      </span>
                    </span>
                    <Badge tone={PHARMACY_TONE[prescription.pharmacyStatus] || 'slate'}>
                      {prescription.pharmacyStatus.replace('_', ' ')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Invoices" icon={Receipt} count={data.history.invoices.length}>
            {data.history.invoices.length === 0 ? (
              <EmptyState title="No invoices yet" className="py-8" />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {data.history.invoices.map((invoice) => (
                  <li key={invoice._id} className="flex items-center gap-3 p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {formatCurrency(invoice.totalAmount, true)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {invoice.invoiceId} — {formatDate(invoice.invoiceDate)}
                        {invoice.balanceAmount > 0 &&
                          ` — ${formatCurrency(invoice.balanceAmount, true)} outstanding`}
                      </span>
                    </span>
                    <Badge tone={PAYMENT_TONE[invoice.paymentStatus] || 'slate'}>
                      {invoice.paymentStatus.replace('_', ' ')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </Modal>
  );
};

export default PatientDetail;
