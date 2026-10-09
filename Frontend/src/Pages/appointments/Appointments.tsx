import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  CalendarDays,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  CircleCheck,
  CircleX,
  Receipt,
  CalendarClock,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentService, billingService } from '../../services';
import { asApiError } from '../../services/api';
import { isPopulated } from '../../types';
import type { Appointment, AppointmentStatus, PageMeta, Ref } from '../../types';
import { useMeta } from '../../hooks/useMeta';
import { useDebounce } from '../../hooks/useDebounce';
import AppointmentForm from './AppointmentForm';
import CallDetails from '../calls/CallDetails';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
  Table,
  Td,
  Badge,
  Button,
  Select,
  Input,
  Avatar,
  PageHeader,
  Pagination,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { formatDate, formatTime, APPOINTMENT_TONE, PAYMENT_TONE } from '../../lib/format';

/** The referenced document when the API populated it, otherwise undefined. */
const populated = <T extends object>(ref: Ref<T> | undefined) => (isPopulated(ref) ? ref : undefined);

const COLUMNS: TableColumn[] = [
  { key: 'when', label: 'When' },
  { key: 'patient', label: 'Patient' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'payment', label: 'Payment' },
  { key: 'actions', label: '', align: 'right' }
];

const Appointments = () => {
  const { hasRole, isAdmin, isDoctor } = useAuth();
  const { meta } = useMeta();

  const [state, setState] = useState<{
    appointments: Appointment[];
    meta: PageMeta | null;
    statusCounts: Partial<Record<AppointmentStatus, number>>;
  }>({ appointments: [], meta: null, statusCounts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'All', date: '' });
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [confirm, setConfirm] = useState<Appointment | null>(null);
  const [working, setWorking] = useState(false);
  const [callFor, setCallFor] = useState<Appointment | null>(null);

  const debouncedSearch = useDebounce(search);
  const canBook = hasRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR']);
  const canBill = hasRole(['HOSPITAL_ADMIN', 'RECEPTIONIST']);
  // Nurses may only change the status, so they get the form with the details locked.
  const canEdit = canBook || hasRole(['NURSE']);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentService.list({
        status: filters.status,
        date: filters.date || undefined,
        page,
        limit: 20
      });
      setState({
        appointments: data.appointments,
        meta: data.meta,
        statusCounts: data.statusCounts || {}
      });
    } catch (err) {
      setError(asApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Name search runs on the loaded page; the server handles the heavy filters.
  const visible = state.appointments.filter((appointment) => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    const patient = `${populated(appointment.patientId)?.firstName || ''} ${populated(appointment.patientId)?.lastName || ''}`;
    const doctor = `${populated(appointment.doctorId)?.firstName || ''} ${populated(appointment.doctorId)?.lastName || ''}`;
    return (
      patient.toLowerCase().includes(term) ||
      doctor.toLowerCase().includes(term) ||
      appointment.appointmentId?.toLowerCase().includes(term) ||
      appointment.reason?.toLowerCase().includes(term)
    );
  });

  const remove = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      await appointmentService.remove(confirm._id);
      toast.success('Appointment deleted');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(asApiError(err).message);
    } finally {
      setWorking(false);
    }
  };

  const raiseInvoice = async (appointment: Appointment) => {
    try {
      const result = await billingService.createFromAppointment(appointment._id, {});
      toast.success(`${result.invoice.invoiceId} created`);
    } catch (err) {
      toast.error(asApiError(err).message);
    }
  };

  const counts = state.statusCounts;

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={isDoctor ? 'Your diary' : 'Bookings across the hospital'}
        icon={CalendarDays}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={load} />
            {canBook && (
              <Button
                icon={Plus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Book appointment
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={CalendarClock}
          label="Scheduled"
          value={(counts.Scheduled || 0) + (counts.Confirmed || 0)}
          tone="blue"
        />
        <StatsCard icon={CircleCheck} label="Completed" value={counts.Completed || 0} tone="green" />
        <StatsCard icon={CircleX} label="Cancelled" value={counts.Cancelled || 0} tone="rose" />
        <StatsCard icon={Clock} label="In progress" value={counts['In Progress'] || 0} tone="amber" />
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
              placeholder="Search by patient, doctor or reference"
              aria-label="Search appointments"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <Select
            className="w-40"
            value={filters.status}
            onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
            options={['All', ...meta.appointmentStatuses]}
          />
          <Input
            type="date"
            className="w-44"
            value={filters.date}
            onChange={(event) => setFilters((f) => ({ ...f, date: event.target.value }))}
          />
          {(filters.date || filters.status !== 'All') && (
            <Button variant="ghost" onClick={() => setFilters({ status: 'All', date: '' })}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingState label="Loading appointments" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={search || filters.date ? 'No matching appointments' : 'No appointments yet'}
            message={
              search || filters.date
                ? 'Try clearing the filters.'
                : 'Book the first appointment to get started.'
            }
            action={
              canBook && (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Book appointment
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={COLUMNS}>
              {visible.map((appointment) => (
                <tr key={appointment._id}>
                  <Td>
                    <p className="font-medium text-slate-900">
                      {formatDate(appointment.appointmentDate)}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatTime(appointment.appointmentTime)} — {appointment.durationMinutes} min
                    </p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={`${populated(appointment.patientId)?.firstName || ''} ${populated(appointment.patientId)?.lastName || ''}`}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {populated(appointment.patientId)?.firstName} {populated(appointment.patientId)?.lastName}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-400">
                          {appointment.appointmentId}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-sm text-slate-800">
                      Dr. {populated(appointment.doctorId)?.firstName} {populated(appointment.doctorId)?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{appointment.department}</p>
                  </Td>
                  <Td>
                    <p className="max-w-[220px] truncate text-sm">{appointment.reason}</p>
                    <Badge tone="slate" className="mt-1">
                      {appointment.appointmentType}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={APPOINTMENT_TONE[appointment.status] || 'slate'}>{appointment.status}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={PAYMENT_TONE[appointment.paymentStatus || 'Pending'] || 'slate'}>
                      {appointment.paymentStatus || 'Pending'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {canBill && (appointment.source === 'Staff' ? <span className="w-10" aria-hidden="true" /> : (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={PhoneCall}
                          aria-label="Call details"
                          title="Call recording and transcript"
                          onClick={() => setCallFor(appointment)}
                        />
                      ))}
                      {canBill && (appointment.status !== 'Completed' ? <span className="w-10" aria-hidden="true" /> : (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Receipt}
                          aria-label="Raise invoice"
                          onClick={() => raiseInvoice(appointment)}
                        />
                      ))}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(appointment);
                            setFormOpen(true);
                          }}
                        />
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          aria-label="Delete"
                          className="text-red-500"
                          onClick={() => setConfirm(appointment)}
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
              label="appointments"
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <AppointmentForm
        open={formOpen}
        appointment={editing}
        meta={meta}
        statusOnly={!canBook}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <CallDetails
        key={callFor?._id}
        appointmentId={callFor?._id}
        appointmentLabel={callFor?.appointmentId}
        onClose={() => setCallFor(null)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        loading={working}
        title="Delete this appointment?"
        message={`${confirm?.appointmentId} will be removed permanently. To keep the record, mark it cancelled instead.`}
        confirmLabel="Delete"
        onClose={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default Appointments;
