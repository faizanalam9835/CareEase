import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Building2,
  Save,
  Users,
  Stethoscope,
  CalendarDays,
  Copy,
  Check,
  BadgeCheck,
  Info
} from 'lucide-react';
import { hospitalService } from '../../services';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
  CardHeader,
  Button,
  Input,
  Badge,
  PageHeader,
  LoadingState,
  ErrorState
} from '../../components/ui';
import { formatDate } from '../../lib/format';

const HospitalSettings = () => {
  const [hospital, setHospital] = useState(null);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    hospitalService
      .getMine()
      .then((data) => {
        setHospital(data.hospital);
        setSummary(data.summary);
        setForm({
          name: data.hospital.name || '',
          address: data.hospital.address || '',
          city: data.hospital.city || '',
          state: data.hospital.state || '',
          contactNumber: data.hospital.contactNumber || '',
          website: data.hospital.website || '',
          bedCapacity: data.hospital.bedCapacity ?? 0
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const copyTenant = async () => {
    try {
      await navigator.clipboard.writeText(hospital.tenantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await hospitalService.updateMine({
        ...form,
        bedCapacity: Number(form.bedCapacity) || 0
      });
      setHospital(result.hospital);
      toast.success('Hospital profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading the hospital profile" className="py-24" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <PageHeader
        title="Hospital"
        subtitle="Profile and configuration"
        icon={Building2}
        actions={
          <Badge tone={hospital.status === 'ACTIVE' ? 'green' : 'amber'} icon={BadgeCheck}>
            {hospital.status}
          </Badge>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={Users} label="Staff accounts" value={summary.staffCount} tone="cyan" />
        <StatsCard icon={Stethoscope} label="Patients" value={summary.patientCount} tone="blue" />
        <StatsCard
          icon={CalendarDays}
          label="Appointments"
          value={summary.appointmentCount}
          tone="purple"
        />
        <StatsCard
          icon={Building2}
          label="Bed capacity"
          value={hospital.bedCapacity}
          hint="Drives the occupancy figure"
          tone="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Hospital profile"
            subtitle="Shown on invoices and prescriptions"
            icon={Building2}
          />
          <form onSubmit={save} className="space-y-4 p-5">
            <Input
              label="Hospital name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Address"
              required
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <Input
                label="State"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
              <Input
                label="Contact number"
                required
                value={form.contactNumber}
                onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
              />
              <Input
                label="Website"
                placeholder="https://"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
              <Input
                label="Bed capacity"
                type="number"
                min="0"
                hint="Used to calculate bed occupancy on the dashboard"
                value={form.bedCapacity}
                onChange={(e) => setForm((f) => ({ ...f, bedCapacity: e.target.value }))}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" icon={Save} loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Workspace" icon={Info} />
          <dl className="space-y-4 p-5 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Hospital ID</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-800">
                  {hospital.tenantId}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={copied ? Check : Copy}
                  aria-label="Copy hospital ID"
                  onClick={copyTenant}
                />
              </dd>
              <p className="mt-1.5 text-xs text-slate-500">
                Every member of your team needs this to sign in.
              </p>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Licence number</dt>
              <dd className="font-medium text-slate-800">{hospital.licenseNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Administrator e-mail</dt>
              <dd className="break-all text-slate-800">{hospital.adminEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Registered</dt>
              <dd className="text-slate-800">{formatDate(hospital.createdAt)}</dd>
            </div>
            {hospital.verifiedAt && (
              <div>
                <dt className="text-xs text-slate-400">Verified</dt>
                <dd className="text-slate-800">{formatDate(hospital.verifiedAt)}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>
    </>
  );
};

export default HospitalSettings;
