import { useCallback, useEffect, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Globe, Plus, RefreshCw, Building2, Users, Stethoscope, Copy, Ban, CircleCheck, MailCheck } from 'lucide-react';
import { platformService } from '../../services';
import { asApiError } from '../../services/api';
import type { CreateTenantInput, CreateTenantResponse, Tenant } from '../../types';
import {
  Card,
  Table,
  Td,
  Badge,
  Button,
  Input,
  Modal,
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import StatsCard from '../../components/shared/StatsCard';
import { formatDate } from '../../lib/format';

const COLUMNS: TableColumn[] = [
  { key: 'hospital', label: 'Hospital' },
  { key: 'tenant', label: 'Tenant ID' },
  { key: 'admin', label: 'Administrator' },
  { key: 'usage', label: 'Staff / Patients / Appointments' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' }
];

const BLANK: CreateTenantInput = {
  name: '',
  address: '',
  city: '',
  state: '',
  contactNumber: '',
  licenseNumber: '',
  website: '',
  bedCapacity: 50,
  adminFirstName: '',
  adminLastName: '',
  adminEmail: ''
};

/** The CareEase platform admin: onboard hospitals and suspend or re-activate them. */
const Platform = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateTenantInput>(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreateTenantResponse | null>(null);

  const [toggling, setToggling] = useState<Tenant | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTenants((await platformService.tenants()).tenants);
    } catch (err) {
      setError(asApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: keyof CreateTenantInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const create = async (event: SyntheticEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await platformService.createTenant(form);
      setFormOpen(false);
      setForm(BLANK);
      setCreated(result);
      load();
    } catch (err) {
      const failure = asApiError(err);
      toast.error(failure.message);
      setErrors(failure.details || {});
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!toggling) return;
    setWorking(true);
    try {
      const next = toggling.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
      const result = await platformService.setStatus(toggling.tenantId, next);
      toast.success(result.message ?? 'Updated');
      setToggling(null);
      load();
    } catch (err) {
      toast.error(asApiError(err).message);
    } finally {
      setWorking(false);
    }
  };

  const copyLogin = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(
        `Sign in at ${window.location.origin}/login\nE-mail: ${created.admin.email}\nPassword: ${created.admin.temporaryPassword}`
      );
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  // Sends a real e-mail to the CareEase inbox, to prove the mail account works.
  const [checkingMail, setCheckingMail] = useState(false);
  const checkMail = async () => {
    setCheckingMail(true);
    try {
      toast.success((await platformService.mailCheck()).message ?? 'Sent');
    } catch (err) {
      toast.error(asApiError(err).message);
    } finally {
      setCheckingMail(false);
    }
  };

  const total = (key: 'staffCount' | 'patientCount') => tenants.reduce((sum, t) => sum + t[key], 0);

  return (
    <>
      <PageHeader
        title="Platform"
        subtitle="Every hospital on CareEase"
        icon={Globe}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={load} aria-label="Refresh" />
            <Button variant="outline" icon={MailCheck} loading={checkingMail} onClick={checkMail}>
              Test e-mail
            </Button>
            <Button icon={Plus} onClick={() => setFormOpen(true)}>
              Onboard hospital
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatsCard icon={Building2} label="Hospitals" value={tenants.length} hint={`${tenants.filter((t) => t.status === 'SUSPENDED').length} suspended`} />
        <StatsCard icon={Users} label="Staff accounts" value={total('staffCount')} />
        <StatsCard icon={Stethoscope} label="Patients" value={total('patientCount')} />
      </div>

      <Card>
        {loading ? (
          <LoadingState label="Loading hospitals" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : tenants.length === 0 ? (
          <EmptyState icon={Building2} title="No hospitals yet" message="Onboard the first one." />
        ) : (
          <Table columns={COLUMNS}>
            {tenants.map((tenant) => (
              <tr key={tenant._id}>
                <Td>
                  <p className="font-medium text-slate-900">{tenant.name}</p>
                  <p className="text-xs text-slate-400">
                    {[tenant.city, tenant.state].filter(Boolean).join(', ') || tenant.address} · since{' '}
                    {formatDate(tenant.createdAt)}
                  </p>
                </Td>
                <Td className="font-mono text-sm">{tenant.tenantId}</Td>
                <Td className="text-sm">{tenant.adminEmail}</Td>
                <Td className="text-sm">
                  {tenant.staffCount} / {tenant.patientCount} / {tenant.appointmentCount}
                </Td>
                <Td>
                  <Badge tone={tenant.status === 'SUSPENDED' ? 'red' : tenant.status === 'ACTIVE' ? 'green' : 'slate'}>
                    {tenant.status}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    variant={tenant.status === 'SUSPENDED' ? 'outline' : 'ghost'}
                    icon={tenant.status === 'SUSPENDED' ? CircleCheck : Ban}
                    className={tenant.status === 'SUSPENDED' ? '' : 'text-red-500'}
                    onClick={() => setToggling(tenant)}
                  >
                    {tenant.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Onboard */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Onboard a hospital"
        subtitle="The workspace goes live at once and the administrator gets their sign-in by e-mail."
        icon={Building2}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={create} loading={saving}>
              Create hospital
            </Button>
          </>
        }
      >
        <form onSubmit={create} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Hospital name" required value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
            <Input label="Licence number" required value={form.licenseNumber} error={errors.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
            <Input label="Address" required value={form.address} error={errors.address} onChange={(e) => set('address', e.target.value)} />
            <Input label="Contact number" required type="tel" value={form.contactNumber} error={errors.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} />
            <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
            <Input label="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
            <Input label="Website" value={form.website} onChange={(e) => set('website', e.target.value)} />
            <Input label="Beds" type="number" min={0} value={form.bedCapacity} error={errors.bedCapacity} onChange={(e) => set('bedCapacity', e.target.value)} />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-900">First administrator</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="First name" value={form.adminFirstName} onChange={(e) => set('adminFirstName', e.target.value)} />
              <Input label="Last name" value={form.adminLastName} onChange={(e) => set('adminLastName', e.target.value)} />
              <Input label="E-mail" required type="email" value={form.adminEmail} error={errors.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Hand-over */}
      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title={`${created?.tenant.name ?? 'Hospital'} is live`}
        subtitle={
          created?.emailSent
            ? `Sign-in details were e-mailed to ${created.admin.email}.`
            : 'The e-mail could not be sent, so share these details yourself.'
        }
        icon={CircleCheck}
        footer={
          <>
            <Button variant="outline" icon={Copy} onClick={copyLogin}>
              Copy
            </Button>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </>
        }
      >
        <dl className="space-y-2.5 rounded-md bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Tenant ID</dt>
            <dd className="font-mono font-medium text-slate-900">{created?.tenant.tenantId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">E-mail</dt>
            <dd className="break-all font-medium text-slate-900">{created?.admin.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Temporary password</dt>
            <dd className="font-mono font-medium text-slate-900">{created?.admin.temporaryPassword}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">They will be asked to set their own password on first sign-in.</p>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        loading={working}
        onClose={() => setToggling(null)}
        onConfirm={toggleStatus}
        title={toggling?.status === 'SUSPENDED' ? `Activate ${toggling?.name}?` : `Suspend ${toggling?.name}?`}
        message={
          toggling?.status === 'SUSPENDED'
            ? 'Its staff can sign in again straight away.'
            : 'Every member of its staff is signed out at once and cannot sign in until you activate it again. No data is deleted.'
        }
        confirmLabel={toggling?.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
        tone={toggling?.status === 'SUSPENDED' ? 'primary' : 'danger'}
      />
    </>
  );
};

export default Platform;
