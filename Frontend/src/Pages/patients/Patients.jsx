import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Stethoscope,
  BedDouble,
  Activity,
  Phone,
  LogOut,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services';
import { useMeta } from '../../hooks/useMeta';
import { useDebounce } from '../../hooks/useDebounce';
import PatientForm from './PatientForm';
import PatientDetail from './PatientDetail';
import VitalsDialog from '../vitals/VitalsDialog';
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
  ConfirmDialog
} from '../../components/ui';
import { formatDate, calculateAge, PATIENT_TONE } from '../../lib/format';

const COLUMNS = [
  { key: 'patient', label: 'Patient' },
  { key: 'contact', label: 'Contact' },
  { key: 'department', label: 'Department' },
  { key: 'type', label: 'Type' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' }
];

const Patients = () => {
  const { hasRole, isAdmin, seesAllDepartments, department } = useAuth();
  const { meta } = useMeta();

  const [state, setState] = useState({ patients: [], stats: null, meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ patientType: 'All', department: 'All', status: 'All' });
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [vitalsFor, setVitalsFor] = useState(null);
  const [working, setWorking] = useState(false);

  const debouncedSearch = useDebounce(search);
  const canEdit = hasRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']);
  const canRecordVitals = hasRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.list({
        search: debouncedSearch || undefined,
        patientType: filters.patientType,
        department: filters.department,
        status: filters.status,
        page,
        limit: 20
      });
      setState({ patients: data.patients, stats: data.stats, meta: data.meta });
    } catch (err) {
      // Previously this fell back to two hard-coded fake patients, so a broken
      // API looked like a working screen with somebody else's data on it.
      setError(err.message);
      setState({ patients: [], stats: null, meta: null });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const remove = async () => {
    setWorking(true);
    try {
      const result = await patientService.remove(confirm.patient._id);
      toast.success(result.message);
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const discharge = async (patient) => {
    try {
      const result = await patientService.discharge(patient._id, {});
      toast.success(result.message);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /** Client-side CSV export of the current page - no extra endpoint needed. */
  const exportCsv = () => {
    if (state.patients.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const header = ['Patient ID', 'Name', 'Age', 'Gender', 'Blood group', 'Phone', 'Department', 'Type', 'Status'];
    const rows = state.patients.map((patient) => [
      patient.patientId,
      `${patient.firstName} ${patient.lastName}`,
      calculateAge(patient.dateOfBirth),
      patient.gender,
      patient.bloodGroup,
      patient.phone,
      patient.department,
      patient.patientType,
      patient.status
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `careease-patients-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} patients`);
  };

  const stats = state.stats;

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={
          seesAllDepartments
            ? 'Every patient registered at this hospital'
            : `Patients in ${department}`
        }
        icon={Users}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={exportCsv}>
              Export
            </Button>
            <Button variant="outline" icon={RefreshCw} onClick={load} />
            {canEdit && (
              <Button
                icon={UserPlus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Register patient
              </Button>
            )}
          </>
        }
      />

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard icon={Users} label="Total patients" value={stats.total} tone="cyan" />
          <StatsCard icon={Stethoscope} label="Outpatients" value={stats.opd} tone="blue" />
          <StatsCard icon={BedDouble} label="Inpatients" value={stats.ipd} tone="purple" />
          <StatsCard icon={Activity} label="Active" value={stats.active} tone="green" />
        </div>
      )}

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
              placeholder="Search by name, patient ID or phone"
              aria-label="Search patients"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <Select
            className="w-36"
            value={filters.patientType}
            onChange={(event) => setFilters((f) => ({ ...f, patientType: event.target.value }))}
            options={['All', ...meta.patientTypes]}
          />
          {seesAllDepartments && (
            <Select
              className="w-44"
              value={filters.department}
              onChange={(event) => setFilters((f) => ({ ...f, department: event.target.value }))}
              options={['All', ...meta.clinicalDepartments]}
            />
          )}
          <Select
            className="w-36"
            value={filters.status}
            onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
            options={['All', ...meta.patientStatuses]}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingState label="Loading patients" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : state.patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search || Object.values(filters).some((v) => v !== 'All') ? 'No matches' : 'No patients yet'}
            message={
              search || Object.values(filters).some((v) => v !== 'All')
                ? 'Try a different search or clear the filters.'
                : 'Register your first patient to get started.'
            }
            action={
              canEdit && (
                <Button
                  icon={UserPlus}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Register patient
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={COLUMNS}>
              {state.patients.map((patient) => (
                <tr key={patient._id} className="transition-colors hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-400">
                          {patient.patientId}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      {patient.phone}
                    </p>
                    <p className="text-xs text-slate-400">
                      {calculateAge(patient.dateOfBirth)} yrs — {patient.gender}
                      {patient.bloodGroup !== 'Unknown' && ` — ${patient.bloodGroup}`}
                    </p>
                  </Td>
                  <Td>{patient.department}</Td>
                  <Td>
                    <Badge tone={patient.patientType === 'IPD' ? 'purple' : 'cyan'}>
                      {patient.patientType}
                    </Badge>
                    {patient.roomNumber && (
                      <p className="mt-1 text-xs text-slate-400">Room {patient.roomNumber}</p>
                    )}
                  </Td>
                  <Td className="text-sm">
                    {patient.assignedDoctor
                      ? `Dr. ${patient.assignedDoctor.firstName} ${patient.assignedDoctor.lastName}`
                      : '—'}
                  </Td>
                  <Td>
                    <Badge tone={PATIENT_TONE[patient.status] || 'slate'}>{patient.status}</Badge>
                    <p className="mt-1 text-xs text-slate-400">
                      Since {formatDate(patient.createdAt)}
                    </p>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        aria-label="View file"
                        onClick={() => setViewingId(patient._id)}
                      />
                      {canRecordVitals && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Activity}
                          aria-label="Vitals"
                          className="text-cyan-600 hover:bg-cyan-50"
                          onClick={() => setVitalsFor(patient)}
                        />
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(patient);
                            setFormOpen(true);
                          }}
                        />
                      )}
                      {patient.patientType === 'IPD' && patient.status === 'Active' && canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={LogOut}
                          aria-label="Discharge"
                          onClick={() => discharge(patient)}
                        />
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          aria-label="Delete"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => setConfirm({ patient })}
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
              label="patients"
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <PatientForm
        open={formOpen}
        patient={editing}
        meta={meta}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <PatientDetail
        open={Boolean(viewingId)}
        patientId={viewingId}
        onClose={() => setViewingId(null)}
      />

      <VitalsDialog
        open={Boolean(vitalsFor)}
        patient={vitalsFor}
        onClose={() => setVitalsFor(null)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        loading={working}
        title="Delete this patient record?"
        message={
          confirm
            ? `${confirm.patient.firstName} ${confirm.patient.lastName} (${confirm.patient.patientId}) will be removed. If they have appointments, prescriptions or invoices the record is archived instead, so the history stays intact.`
            : ''
        }
        confirmLabel="Delete"
        onClose={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default Patients;
