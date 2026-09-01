import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  KeyRound,
  Stethoscope,
  ShieldCheck,
  UserCheck,
  Copy,
  Check,
  Mail,
  Phone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services';
import { useMeta } from '../../hooks/useMeta';
import { useDebounce } from '../../hooks/useDebounce';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
  Table,
  Td,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Avatar,
  PageHeader,
  Pagination,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import { formatDate, formatRelative, ROLE_TONE } from '../../lib/format';
import { ROLE_LABELS } from '../../lib/navigation';

const COLUMNS = [
  { key: 'person', label: 'Staff member' },
  { key: 'contact', label: 'Contact' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' }
];

const BLANK = {
  firstName: '',
  lastName: '',
  email: '',
  professionalEmail: '',
  phone: '',
  password: '',
  department: 'General',
  designation: '',
  specialization: '',
  consultationFee: 500,
  roles: ['DOCTOR'],
  status: 'ACTIVE',
  availableFrom: '09:00',
  availableTo: '17:00'
};

/* -------------------------------- the form ------------------------------- */

const StaffForm = ({ open, onClose, onSaved, staff, meta, onCreated }) => {
  const isEdit = Boolean(staff);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(staff ? { ...BLANK, ...staff, password: '' } : BLANK);
  }, [open, staff]);

  const set = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const isDoctor = form.roles.includes('DOCTOR');

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Required';
    if (!form.lastName.trim()) next.lastName = 'Required';
    if (!isEdit && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid e-mail';
    if (!/^\d{10}$/.test(String(form.phone).replace(/\D/g, '')))
      next.phone = 'Enter a 10 digit phone number';
    if (form.roles.length === 0) next.roles = 'Pick a role';
    if (form.password && form.password.length < 8) {
      next.password = 'At least 8 characters, with an uppercase, a lowercase and a number';
    }

    setErrors(next);
    if (Object.keys(next).length) {
      toast.error('Please correct the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const result = await userService.update(staff._id, {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          professionalEmail: form.professionalEmail,
          department: form.department,
          designation: form.designation,
          specialization: form.specialization,
          consultationFee: Number(form.consultationFee) || 0,
          roles: form.roles,
          status: form.status,
          availableFrom: form.availableFrom,
          availableTo: form.availableTo
        });
        toast.success(result.message);
      } else {
        const result = await userService.create({
          ...form,
          consultationFee: Number(form.consultationFee) || 0,
          password: form.password || undefined
        });
        toast.success(result.message);
        // A generated password is shown once so the admin can pass it on, in
        // case SMTP is not configured on this deployment.
        if (result.temporaryPassword) {
          onCreated({ user: result.user, password: result.temporaryPassword });
        }
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.message);
      if (error.details) setErrors(error.details);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${staff.firstName} ${staff.lastName}` : 'Add a staff member'}
      subtitle={
        isEdit ? staff.email : 'Sign-in details are e-mailed to them automatically'
      }
      icon={UserPlus}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
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
            label="Sign-in e-mail"
            type="email"
            required
            disabled={isEdit}
            hint={isEdit ? 'The sign-in address cannot be changed' : undefined}
            value={form.email}
            error={errors.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <Input
            label="Contact e-mail"
            type="email"
            hint="Where the welcome message is sent"
            value={form.professionalEmail}
            onChange={(e) => set('professionalEmail', e.target.value)}
          />
          <Input
            label="Phone"
            required
            value={form.phone}
            error={errors.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          {!isEdit && (
            <Input
              label="Password"
              type="text"
              placeholder="Leave blank to generate one"
              hint="A generated password is e-mailed and shown once"
              value={form.password}
              error={errors.password}
              onChange={(e) => set('password', e.target.value)}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Role"
            required
            value={form.roles[0]}
            error={errors.roles}
            onChange={(e) => set('roles', [e.target.value])}
            options={meta.roles.map((role) => ({ value: role, label: ROLE_LABELS[role] || role }))}
          />
          <Select
            label="Department"
            required
            value={form.department}
            onChange={(e) => set('department', e.target.value)}
            options={meta.departments}
          />
          <Input
            label="Designation"
            placeholder="Senior Consultant"
            value={form.designation}
            onChange={(e) => set('designation', e.target.value)}
          />
          {isEdit && (
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'LOCKED', label: 'Locked' }
              ]}
            />
          )}
        </div>

        {isDoctor && (
          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Doctor details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Specialization"
                placeholder="Interventional Cardiology"
                value={form.specialization}
                onChange={(e) => set('specialization', e.target.value)}
              />
              <Input
                label="Consultation fee"
                type="number"
                min="0"
                value={form.consultationFee}
                onChange={(e) => set('consultationFee', e.target.value)}
              />
              <Input
                label="Available from"
                type="time"
                hint="Drives the appointment slot picker"
                value={form.availableFrom}
                onChange={(e) => set('availableFrom', e.target.value)}
              />
              <Input
                label="Available to"
                type="time"
                value={form.availableTo}
                onChange={(e) => set('availableTo', e.target.value)}
              />
            </div>
          </section>
        )}
      </form>
    </Modal>
  );
};

/* --------------------------- credentials dialog -------------------------- */

const CredentialsDialog = ({ open, onClose, details }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Hospital ID: ${details.user.tenantId}\nE-mail: ${details.user.email}\nPassword: ${details.password}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  if (!details) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Account created"
      subtitle="Share these details — the password is shown only once"
      icon={KeyRound}
      size="sm"
      footer={
        <>
          <Button variant="outline" icon={copied ? Check : Copy} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <dl className="space-y-2.5 rounded-lg bg-slate-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Hospital ID</dt>
          <dd className="font-mono font-medium text-slate-900">{details.user.tenantId}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">E-mail</dt>
          <dd className="break-all font-medium text-slate-900">{details.user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Password</dt>
          <dd className="font-mono font-medium text-slate-900">{details.password}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        They will be asked to choose a new password the first time they sign in.
      </p>
    </Modal>
  );
};

/* --------------------------------- page ---------------------------------- */

const StaffManagement = () => {
  const { user: currentUser } = useAuth();
  const { meta } = useMeta();

  const [state, setState] = useState({ users: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: 'All', department: 'All', status: 'All' });
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [working, setWorking] = useState(false);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.list({
        search: debouncedSearch || undefined,
        role: filters.role === 'All' ? undefined : filters.role,
        department: filters.department === 'All' ? undefined : filters.department,
        status: filters.status === 'All' ? undefined : filters.status,
        page,
        limit: 20
      });
      setState({ users: data.users, meta: data.meta });
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
      const result = await userService.remove(confirm._id);
      toast.success(result.message);
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const resetPassword = async () => {
    setWorking(true);
    try {
      const result = await userService.resetPassword(resetting._id);
      setResetting(null);
      setCredentials({ user: resetting, password: result.temporaryPassword });
      toast.success('Password reset');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const counts = state.users.reduce(
    (acc, member) => {
      acc.total += 1;
      if (member.roles.includes('DOCTOR')) acc.doctors += 1;
      if (member.roles.includes('NURSE')) acc.nurses += 1;
      if (member.status === 'ACTIVE') acc.active += 1;
      return acc;
    },
    { total: 0, doctors: 0, nurses: 0, active: 0 }
  );

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Accounts, roles and departments"
        icon={Users}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={load} />
            <Button
              icon={UserPlus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add staff member
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={Users} label="On this page" value={state.meta?.total ?? 0} tone="cyan" />
        <StatsCard icon={Stethoscope} label="Doctors" value={counts.doctors} tone="blue" />
        <StatsCard icon={ShieldCheck} label="Nurses" value={counts.nurses} tone="green" />
        <StatsCard icon={UserCheck} label="Active" value={counts.active} tone="purple" />
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
              placeholder="Search by name, e-mail or specialization"
              aria-label="Search staff"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <Select
            className="w-48"
            value={filters.role}
            onChange={(event) => setFilters((f) => ({ ...f, role: event.target.value }))}
            options={[
              'All',
              ...meta.roles.map((role) => ({ value: role, label: ROLE_LABELS[role] || role }))
            ]}
          />
          <Select
            className="w-44"
            value={filters.department}
            onChange={(event) => setFilters((f) => ({ ...f, department: event.target.value }))}
            options={['All', ...meta.departments]}
          />
          <Select
            className="w-36"
            value={filters.status}
            onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
            options={['All', 'ACTIVE', 'INACTIVE', 'LOCKED']}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingState label="Loading staff" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : state.users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff match this"
            message="Try clearing the filters, or add a new staff member."
            action={
              <Button
                icon={UserPlus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add staff member
              </Button>
            }
          />
        ) : (
          <>
            <Table columns={COLUMNS}>
              {state.users.map((member) => {
                const isSelf = member._id === currentUser.id;
                return (
                  <tr key={member._id} className="transition-colors hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${member.firstName} ${member.lastName}`} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {member.firstName} {member.lastName}
                            {isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {member.designation || member.specialization || '—'}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="flex items-center gap-1.5 truncate text-xs text-slate-600">
                        <Mail className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        {member.email}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        {member.phone}
                      </p>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map((role) => (
                          <Badge key={role} tone={ROLE_TONE[role] || 'slate'}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                    <Td className="text-sm">{member.department}</Td>
                    <Td>
                      <Badge
                        tone={
                          member.status === 'ACTIVE'
                            ? 'green'
                            : member.status === 'LOCKED'
                              ? 'red'
                              : 'slate'
                        }
                      >
                        {member.status}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-400">
                        {member.lastLoginAt
                          ? `Seen ${formatRelative(member.lastLoginAt)}`
                          : `Added ${formatDate(member.createdAt)}`}
                      </p>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={KeyRound}
                          aria-label="Reset password"
                          onClick={() => setResetting(member)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Pencil}
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(member);
                            setFormOpen(true);
                          }}
                        />
                        {!isSelf && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            aria-label="Remove"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => setConfirm(member)}
                          />
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>

            <Pagination
              page={state.meta?.page || 1}
              totalPages={state.meta?.totalPages || 1}
              total={state.meta?.total}
              label="staff"
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <StaffForm
        open={formOpen}
        staff={editing}
        meta={meta}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onCreated={setCredentials}
      />

      <CredentialsDialog
        open={Boolean(credentials)}
        details={credentials}
        onClose={() => setCredentials(null)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        loading={working}
        title="Remove this staff member?"
        message={`${confirm?.firstName} ${confirm?.lastName} will lose access. A doctor with upcoming appointments is deactivated instead of deleted, so the schedule stays intact.`}
        confirmLabel="Remove"
        onClose={() => setConfirm(null)}
        onConfirm={remove}
      />

      <ConfirmDialog
        open={Boolean(resetting)}
        loading={working}
        tone="primary"
        title="Reset this password?"
        message={`A new temporary password will be generated for ${resetting?.firstName} ${resetting?.lastName}, e-mailed to them and shown to you once.`}
        confirmLabel="Reset password"
        onClose={() => setResetting(null)}
        onConfirm={resetPassword}
      />
    </>
  );
};

export default StaffManagement;
