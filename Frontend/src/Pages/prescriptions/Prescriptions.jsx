import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  PackageCheck,
  Clock,
  CircleCheck,
  Printer,
  ShieldAlert,
  Pill,
  CircleAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { prescriptionService, pharmacyService } from '../../services';
import { useMeta } from '../../hooks/useMeta';
import { useDebounce } from '../../hooks/useDebounce';
import PrescriptionForm from './PrescriptionForm';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
  Table,
  Td,
  Badge,
  Button,
  Select,
  Avatar,
  PageHeader,
  Pagination,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog,
  Modal
} from '../../components/ui';
import { formatDate, formatDateTime, PHARMACY_TONE } from '../../lib/format';

const COLUMNS = [
  { key: 'ref', label: 'Prescription' },
  { key: 'patient', label: 'Patient' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'medicines', label: 'Medicines' },
  { key: 'status', label: 'Pharmacy' },
  { key: 'actions', label: '', align: 'right' }
];

/* ----------------------------- detail dialog ----------------------------- */

const PrescriptionDetail = ({ open, onClose, prescription, onPrint }) => {
  if (!prescription) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={prescription.prescriptionId}
      subtitle={`${prescription.diagnosis} — ${formatDate(prescription.createdAt)}`}
      icon={FileText}
      size="lg"
      footer={
        <Button variant="outline" icon={Printer} onClick={() => onPrint(prescription)}>
          Print
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">Patient</p>
            <p className="text-sm font-medium text-slate-900">
              {prescription.patientId?.firstName} {prescription.patientId?.lastName}
            </p>
            <p className="text-xs text-slate-500">
              {prescription.patientId?.patientId} — {prescription.patientId?.gender},{' '}
              {prescription.patientId?.bloodGroup}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Prescribed by</p>
            <p className="text-sm font-medium text-slate-900">
              Dr. {prescription.doctorId?.firstName} {prescription.doctorId?.lastName}
            </p>
            <p className="text-xs text-slate-500">{prescription.doctorId?.department}</p>
          </div>
        </div>

        {prescription.patientId?.allergies?.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Allergies:</strong> {prescription.patientId.allergies.join(', ')}
            </span>
          </p>
        )}

        <section>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Medicines
          </h3>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {prescription.medicines.map((line) => (
              <li key={line._id} className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {line.medicineName} {line.dosage}
                    </p>
                    <p className="text-xs text-slate-500">
                      {line.frequency} for {line.duration}
                      {line.instructions && ` — ${line.instructions}`}
                    </p>
                  </div>
                  <Badge tone={line.quantityDispensed >= line.quantity ? 'green' : 'amber'}>
                    {line.quantityDispensed || 0} / {line.quantity}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {prescription.symptoms?.length > 0 && (
          <div>
            <p className="text-xs text-slate-400">Symptoms</p>
            <p className="text-sm text-slate-800">{prescription.symptoms.join(', ')}</p>
          </div>
        )}
        {prescription.testsRecommended?.length > 0 && (
          <div>
            <p className="text-xs text-slate-400">Tests recommended</p>
            <p className="text-sm text-slate-800">{prescription.testsRecommended.join(', ')}</p>
          </div>
        )}
        {prescription.followUpDate && (
          <div>
            <p className="text-xs text-slate-400">Follow-up</p>
            <p className="text-sm text-slate-800">{formatDate(prescription.followUpDate)}</p>
          </div>
        )}
        {prescription.notes && (
          <div>
            <p className="text-xs text-slate-400">Notes</p>
            <p className="text-sm text-slate-800">{prescription.notes}</p>
          </div>
        )}
        {prescription.dispensedAt && (
          <p className="text-xs text-slate-500">
            Dispensed {formatDateTime(prescription.dispensedAt)}
            {prescription.dispensedBy &&
              ` by ${prescription.dispensedBy.firstName} ${prescription.dispensedBy.lastName}`}
          </p>
        )}
      </div>
    </Modal>
  );
};

/* ----------------------------- dispense dialog ---------------------------- */

const DispenseDialog = ({ open, onClose, prescription, onDone }) => {
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [createInvoice, setCreateInvoice] = useState(true);

  useEffect(() => {
    if (!open || !prescription) return;
    setLoading(true);
    prescriptionService
      .stockCheck(prescription._id)
      .then(setCheck)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [open, prescription]);

  const dispense = async () => {
    setWorking(true);
    try {
      const result = await pharmacyService.dispense(prescription._id, { createInvoice });
      toast.success(result.message);
      if (result.invoice) toast.success(`Invoice ${result.invoice.invoiceId} raised`);
      onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dispense prescription"
      subtitle={prescription?.prescriptionId}
      icon={PackageCheck}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={working}>
            Cancel
          </Button>
          <Button
            onClick={dispense}
            loading={working}
            disabled={loading || !check?.lines?.some((line) => line.sufficient)}
          >
            Dispense
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingState label="Checking stock" />
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {check?.lines.map((line) => (
              <li key={line.lineId} className="flex items-center gap-3 p-3.5">
                <span className={line.sufficient ? 'text-emerald-500' : 'text-red-500'}>
                  {line.sufficient ? (
                    <CircleCheck className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">
                    {line.medicineName}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {line.inInventory
                      ? `Need ${line.required}, ${line.inStock} in stock`
                      : 'Not in the pharmacy inventory'}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {!check?.canDispenseFully && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Some lines cannot be filled from current stock. Dispensing now will mark the
              prescription partially dispensed.
            </p>
          )}

          <label className="flex items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={createInvoice}
              onChange={(event) => setCreateInvoice(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            Raise a pharmacy invoice for what is dispensed
          </label>
        </div>
      )}
    </Modal>
  );
};

/* --------------------------------- page ---------------------------------- */

const Prescriptions = () => {
  const { hasRole, isAdmin, isDoctor, isPharmacist } = useAuth();
  const { meta } = useMeta();

  const [state, setState] = useState({ prescriptions: [], meta: null, pharmacyCounts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ pharmacyStatus: 'All', status: 'All' });
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [dispensing, setDispensing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);

  const debouncedSearch = useDebounce(search);
  const canWrite = isDoctor;
  const canDispense = hasRole(['PHARMACIST', 'HOSPITAL_ADMIN']);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await prescriptionService.list({
        search: debouncedSearch || undefined,
        pharmacyStatus: filters.pharmacyStatus,
        status: filters.status,
        page,
        limit: 20
      });
      setState({
        prescriptions: data.prescriptions,
        meta: data.meta,
        pharmacyCounts: data.pharmacyCounts || {}
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const remove = async () => {
    setWorking(true);
    try {
      await prescriptionService.remove(confirm._id);
      toast.success('Prescription deleted');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  /** Opens a clean, printable copy in a new window. */
  const print = (prescription) => {
    const rows = prescription.medicines
      .map(
        (line) =>
          `<tr><td>${line.medicineName} ${line.dosage}</td><td>${line.frequency}</td><td>${line.duration}</td><td>${line.quantity}</td><td>${line.instructions || ''}</td></tr>`
      )
      .join('');

    const html = `<!doctype html><html><head><title>${prescription.prescriptionId}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:40px;color:#0f172a}
        h1{margin:0;font-size:20px;color:#0891b2}
        .meta{margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px}
        .meta span{color:#64748b}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
        th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
        th{background:#f8fafc;font-size:11px;text-transform:uppercase;color:#64748b}
        footer{margin-top:48px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px}
      </style></head><body>
      <h1>CareEase General Hospital</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b">Prescription ${prescription.prescriptionId}</p>
      <div class="meta">
        <div><span>Patient</span><br><strong>${prescription.patientId?.firstName} ${prescription.patientId?.lastName}</strong><br>${prescription.patientId?.patientId}</div>
        <div><span>Doctor</span><br><strong>Dr. ${prescription.doctorId?.firstName} ${prescription.doctorId?.lastName}</strong><br>${prescription.doctorId?.department}</div>
        <div><span>Date</span><br>${formatDate(prescription.createdAt)}</div>
        <div><span>Diagnosis</span><br>${prescription.diagnosis}</div>
      </div>
      <table><thead><tr><th>Medicine</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead><tbody>${rows}</tbody></table>
      ${prescription.testsRecommended?.length ? `<p style="font-size:13px"><strong>Tests:</strong> ${prescription.testsRecommended.join(', ')}</p>` : ''}
      ${prescription.followUpDate ? `<p style="font-size:13px"><strong>Follow-up:</strong> ${formatDate(prescription.followUpDate)}</p>` : ''}
      ${prescription.notes ? `<p style="font-size:13px"><strong>Notes:</strong> ${prescription.notes}</p>` : ''}
      <footer>Generated by CareEase HMS. Not valid without a doctor's signature.</footer>
      </body></html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('Allow pop-ups to print');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const counts = state.pharmacyCounts;

  return (
    <>
      <PageHeader
        title="Prescriptions"
        subtitle={
          isPharmacist
            ? 'The dispensing queue'
            : isDoctor
              ? 'Prescriptions you have written'
              : 'Prescriptions across the hospital'
        }
        icon={FileText}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={load} />
            {canWrite && (
              <Button
                icon={Plus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Write prescription
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={FileText} label="Total" value={state.meta?.total ?? 0} tone="cyan" />
        <StatsCard icon={Clock} label="Waiting" value={counts.Pending || 0} tone="amber" />
        <StatsCard
          icon={Pill}
          label="Partly dispensed"
          value={counts.Partially_Dispensed || 0}
          tone="blue"
        />
        <StatsCard icon={PackageCheck} label="Dispensed" value={counts.Dispensed || 0} tone="green" />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference or diagnosis"
              aria-label="Search prescriptions"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <Select
            className="w-48"
            value={filters.pharmacyStatus}
            onChange={(event) =>
              setFilters((f) => ({ ...f, pharmacyStatus: event.target.value }))
            }
            options={['All', ...meta.pharmacyStatuses]}
          />
          <Select
            className="w-36"
            value={filters.status}
            onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
            options={['All', ...meta.prescriptionStatuses]}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingState label="Loading prescriptions" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : state.prescriptions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No prescriptions"
            message={
              canWrite
                ? 'Write your first prescription for a patient in your department.'
                : 'Prescriptions written by doctors appear here.'
            }
            action={
              canWrite && (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Write prescription
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={COLUMNS}>
              {state.prescriptions.map((prescription) => (
                <tr key={prescription._id} className="transition-colors hover:bg-slate-50">
                  <Td>
                    <p className="font-mono text-xs font-medium text-slate-900">
                      {prescription.prescriptionId}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(prescription.createdAt)}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={`${prescription.patientId?.firstName || ''} ${prescription.patientId?.lastName || ''}`}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {prescription.patientId?.firstName} {prescription.patientId?.lastName}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          Dr. {prescription.doctorId?.lastName} — {prescription.department}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="max-w-[200px] truncate text-sm">{prescription.diagnosis}</p>
                  </Td>
                  <Td>
                    <Badge tone="slate">{prescription.medicines.length} item(s)</Badge>
                  </Td>
                  <Td>
                    <Badge tone={PHARMACY_TONE[prescription.pharmacyStatus] || 'slate'}>
                      {prescription.pharmacyStatus.replace('_', ' ')}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        aria-label="View"
                        onClick={() => setViewing(prescription)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Printer}
                        aria-label="Print"
                        onClick={() => print(prescription)}
                      />
                      {canDispense && prescription.pharmacyStatus !== 'Dispensed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={PackageCheck}
                          aria-label="Dispense"
                          className="text-emerald-600 hover:bg-emerald-50"
                          onClick={() => setDispensing(prescription)}
                        />
                      )}
                      {canWrite && prescription.pharmacyStatus === 'Pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(prescription);
                            setFormOpen(true);
                          }}
                        />
                      )}
                      {(isAdmin || canWrite) && prescription.pharmacyStatus === 'Pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          aria-label="Delete"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => setConfirm(prescription)}
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>

            <Pagination
              page={state.meta?.page || 1}
              totalPages={state.meta?.totalPages || 1}
              total={state.meta?.total}
              label="prescriptions"
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <PrescriptionForm
        open={formOpen}
        prescription={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <PrescriptionDetail
        open={Boolean(viewing)}
        prescription={viewing}
        onClose={() => setViewing(null)}
        onPrint={print}
      />

      <DispenseDialog
        open={Boolean(dispensing)}
        prescription={dispensing}
        onClose={() => setDispensing(null)}
        onDone={load}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        loading={working}
        title="Delete this prescription?"
        message={`${confirm?.prescriptionId} will be removed permanently.`}
        confirmLabel="Delete"
        onClose={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default Prescriptions;
