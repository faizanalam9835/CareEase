import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Activity,
  HeartPulse,
  Thermometer,
  Wind,
  Droplet,
  Gauge,
  Scale,
  TriangleAlert,
  CircleCheck,
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { vitalsService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import {
  Modal,
  Button,
  Input,
  Textarea,
  Badge,
  Card,
  LoadingState,
  ErrorState,
  EmptyState
} from '../../components/ui';
import { formatDateTime, formatRelative } from '../../lib/format';

/** The six measurements a nurse takes on a routine round, in the order they take them. */
const FIELDS = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, step: '0.1', placeholder: '36.8' },
  { key: 'pulse', label: 'Pulse', unit: 'bpm', icon: HeartPulse, step: '1', placeholder: '78' },
  { key: 'systolic', label: 'BP systolic', unit: 'mmHg', icon: Gauge, step: '1', placeholder: '120' },
  { key: 'diastolic', label: 'BP diastolic', unit: 'mmHg', icon: Gauge, step: '1', placeholder: '80' },
  { key: 'respiratoryRate', label: 'Respiratory rate', unit: '/min', icon: Wind, step: '1', placeholder: '16' },
  { key: 'oxygenSaturation', label: 'SpO2', unit: '%', icon: Droplet, step: '1', placeholder: '98' },
  { key: 'bloodSugar', label: 'Blood sugar', unit: 'mg/dL', icon: Droplet, step: '1', placeholder: '95' },
  { key: 'weight', label: 'Weight', unit: 'kg', icon: Scale, step: '0.1', placeholder: '68' },
  { key: 'height', label: 'Height', unit: 'cm', icon: Scale, step: '0.5', placeholder: '170' },
  { key: 'painScore', label: 'Pain score', unit: '0-10', icon: Activity, step: '1', placeholder: '2' }
];

const LEVEL_TONE = {
  normal: 'green',
  low: 'amber',
  high: 'amber',
  'critical-low': 'red',
  'critical-high': 'red'
};

const LevelIcon = ({ level }) => {
  if (!level || level === 'normal') {
    return <CircleCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />;
  }
  if (level.endsWith('low')) {
    return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
};

/** A single measurement tile in the "latest reading" strip. */
const Reading = ({ label, value, unit, flag }) => {
  if (value === undefined || value === null) return null;
  const level = flag?.level || 'normal';
  const critical = level.startsWith('critical');

  return (
    <div
      className={`rounded-lg border p-3 ${
        critical
          ? 'border-red-200 bg-red-50'
          : level === 'normal'
            ? 'border-slate-200 bg-white'
            : 'border-amber-200 bg-amber-50'
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span
          className={`text-lg font-semibold ${
            critical ? 'text-red-700' : level === 'normal' ? 'text-slate-900' : 'text-amber-700'
          }`}
        >
          {value}
        </span>
        <span className="text-xs text-slate-400">{unit}</span>
      </p>
      {flag && (
        <p
          className={`mt-1 flex items-center gap-1 text-[11px] ${
            critical ? 'text-red-600' : level === 'normal' ? 'text-slate-400' : 'text-amber-600'
          }`}
        >
          <LevelIcon level={level} />
          {level === 'normal' ? `normal ${flag.normalRange}` : `outside ${flag.normalRange}`}
        </p>
      )}
    </div>
  );
};

const VitalsDialog = ({ open, onClose, patient, onRecorded }) => {
  const { hasRole, user } = useAuth();
  const canRecord = hasRole(['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const patientId = patient?._id || patient?.id;

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await vitalsService.list(patientId, { limit: 30 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!open) return;
    setForm({});
    setNotes('');
    setShowForm(false);
    load();
  }, [open, load]);

  const save = async (event) => {
    event.preventDefault();

    const payload = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value !== '' && value !== undefined)
    );
    if (Object.keys(payload).length === 0) {
      toast.error('Enter at least one measurement');
      return;
    }

    setSaving(true);
    try {
      const result = await vitalsService.record(patientId, { ...payload, notes });
      // A critical reading is called out loudly rather than buried in a list.
      if (result.assessment?.hasCritical) {
        toast.error(`Critical: ${result.assessment.summary.join(', ')}`, { duration: 8000 });
      } else {
        toast.success(result.message);
      }
      setForm({});
      setNotes('');
      setShowForm(false);
      await load();
      onRecorded?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (reading) => {
    try {
      await vitalsService.remove(reading._id);
      toast.success('Reading removed');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const latest = data?.latest;
  const flags = latest?.assessment?.flags || {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Vitals — ${patient?.firstName || ''} ${patient?.lastName || ''}`.trim()}
      subtitle={
        data?.patient
          ? `${data.patient.patientId}${data.patient.age !== null ? ` · ${data.patient.age} years` : ''}`
          : undefined
      }
      icon={Activity}
      size="lg"
      footer={
        canRecord && !showForm ? (
          <Button icon={Plus} onClick={() => setShowForm(true)}>
            Record new reading
          </Button>
        ) : null
      }
    >
      {loading ? (
        <LoadingState label="Loading observations" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          {/* Record form */}
          {showForm && (
            <Card className="border-cyan-200 bg-cyan-50/40 p-4">
              <form onSubmit={save} className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                  New reading
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  {FIELDS.map((field) => (
                    <Input
                      key={field.key}
                      label={`${field.label} (${field.unit})`}
                      type="number"
                      step={field.step}
                      inputMode="decimal"
                      placeholder={field.placeholder}
                      value={form[field.key] ?? ''}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                    />
                  ))}
                </div>

                <Textarea
                  label="Notes"
                  rows={2}
                  placeholder="Patient comfortable, no distress."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />

                <p className="text-xs text-slate-500">
                  Leave anything you did not measure blank — only what you enter is saved.
                </p>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving}>
                    Save reading
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Latest */}
          {latest ? (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Latest reading
                </h3>
                <div className="flex items-center gap-2">
                  {latest.assessment?.hasCritical ? (
                    <Badge tone="red" icon={TriangleAlert}>
                      Critical
                    </Badge>
                  ) : latest.assessment?.abnormalCount ? (
                    <Badge tone="amber" icon={TriangleAlert}>
                      {latest.assessment.abnormalCount} outside range
                    </Badge>
                  ) : (
                    <Badge tone="green" icon={CircleCheck}>
                      All normal
                    </Badge>
                  )}
                  <span className="text-xs text-slate-400">{formatRelative(latest.recordedAt)}</span>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {FIELDS.map((field) => (
                  <Reading
                    key={field.key}
                    label={field.label}
                    value={latest[field.key]}
                    unit={field.unit}
                    flag={flags[field.key]}
                  />
                ))}
                {latest.bmi && <Reading label="BMI" value={latest.bmi} unit="kg/m²" />}
              </div>

              {latest.notes && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {latest.notes}
                </p>
              )}
            </section>
          ) : (
            <EmptyState
              icon={Activity}
              title="No observations yet"
              message={
                canRecord
                  ? 'Record the first set of vitals for this patient.'
                  : 'Nursing staff will record vitals here.'
              }
              action={
                canRecord && (
                  <Button icon={Plus} onClick={() => setShowForm(true)}>
                    Record reading
                  </Button>
                )
              }
            />
          )}

          {/* Trend */}
          {data.trend?.length > 1 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Trend over the last {data.trend.length} readings
              </h3>
              <div className="rounded-lg border border-slate-200 p-3">
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="recordedAt"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      width={34}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                      labelFormatter={(value) => formatDateTime(value)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      name="Systolic"
                      stroke="#e11d48"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="Diastolic"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="pulse"
                      name="Pulse"
                      stroke="#0891b2"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="oxygenSaturation"
                      name="SpO2"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* History */}
          {data.vitals?.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                History
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">When</th>
                      <th className="px-3 py-2 text-left">Temp</th>
                      <th className="px-3 py-2 text-left">Pulse</th>
                      <th className="px-3 py-2 text-left">BP</th>
                      <th className="px-3 py-2 text-left">SpO2</th>
                      <th className="px-3 py-2 text-left">By</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.vitals.map((reading) => {
                      const abnormal = reading.assessment?.abnormalCount || 0;
                      const canDelete =
                        hasRole('HOSPITAL_ADMIN') ||
                        String(reading.recordedBy?._id || reading.recordedBy) === String(user.id);

                      return (
                        <tr
                          key={reading._id}
                          className={reading.assessment?.hasCritical ? 'bg-red-50/60' : undefined}
                        >
                          <td className="whitespace-nowrap px-3 py-2.5">
                            {formatDateTime(reading.recordedAt)}
                            {abnormal > 0 && (
                              <Badge
                                tone={reading.assessment.hasCritical ? 'red' : 'amber'}
                                className="ml-2"
                              >
                                {abnormal}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5">{reading.temperature ?? '—'}</td>
                          <td className="px-3 py-2.5">{reading.pulse ?? '—'}</td>
                          <td className="px-3 py-2.5">{reading.bloodPressure ?? '—'}</td>
                          <td className="px-3 py-2.5">{reading.oxygenSaturation ?? '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">
                            {reading.recordedBy
                              ? `${reading.recordedBy.firstName} ${reading.recordedBy.lastName}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={Trash2}
                                aria-label="Remove reading"
                                className="text-red-500 hover:bg-red-50"
                                onClick={() => remove(reading)}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
};

export default VitalsDialog;
