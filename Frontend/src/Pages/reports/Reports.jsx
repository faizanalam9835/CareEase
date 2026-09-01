import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  FileBarChart,
  Download,
  Printer,
  RefreshCw,
  IndianRupee,
  Users,
  CalendarDays,
  BedDouble,
  Wallet,
  Receipt,
  Stethoscope,
  Pill,
  CircleAlert
} from 'lucide-react';
import { reportService } from '../../services';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
  CardHeader,
  Table,
  Td,
  Badge,
  Button,
  Input,
  Select,
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState
} from '../../components/ui';
import { formatCurrency, formatNumber, formatDate, toDateInput, pluralise } from '../../lib/format';

const COLORS = ['#0891b2', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#64748b'];

const axisProps = { tick: { fontSize: 11, fill: '#94a3b8' }, tickLine: false, axisLine: false };
const tooltipProps = {
  contentStyle: { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }
};

/** Ready-made windows, so the common case is one click rather than two date pickers. */
const PRESETS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'last-90', label: 'Last 90 days' },
  { value: 'this-year', label: 'This year' },
  { value: 'custom', label: 'Custom range' }
];

const rangeFor = (preset) => {
  const now = new Date();
  const start = (date) => toDateInput(date);

  switch (preset) {
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: start(from), to: start(to) };
    }
    case 'last-30': {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: start(from), to: start(now) };
    }
    case 'last-90': {
      const from = new Date(now);
      from.setDate(from.getDate() - 89);
      return { from: start(from), to: start(now) };
    }
    case 'this-year':
      return { from: start(new Date(now.getFullYear(), 0, 1)), to: start(now) };
    case 'this-month':
    default:
      return { from: start(new Date(now.getFullYear(), now.getMonth(), 1)), to: start(now) };
  }
};

/** Escapes a value for CSV: quotes it and doubles any embedded quote. */
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const Reports = () => {
  const [preset, setPreset] = useState('this-month');
  const [range, setRange] = useState(() => rangeFor('this-month'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await reportService.get(range));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const choosePreset = (value) => {
    setPreset(value);
    if (value !== 'custom') setRange(rangeFor(value));
  };

  /**
   * Builds one CSV from the same numbers on screen, section by section, so the
   * export and the page can never disagree.
   */
  const exportCsv = () => {
    if (!report) return;

    const rows = [
      ['CareEase report'],
      ['Period', `${report.range.from} to ${report.range.to}`, `${report.range.days} days`],
      ['Generated', new Date().toISOString()],
      [],
      ['Summary'],
      ['Metric', 'Value'],
      ['Revenue collected', report.summary.revenueCollected],
      ['Revenue invoiced', report.summary.revenueInvoiced],
      ['Collection rate %', report.summary.collectionRate],
      ['Invoices raised', report.summary.invoices],
      ['Discount given', report.summary.discountGiven],
      ['Tax collected', report.summary.taxCollected],
      ['Outstanding total', report.summary.outstandingTotal],
      ['Outstanding invoices', report.summary.outstandingInvoices],
      ['New patients', report.summary.newPatients],
      ['Appointments', report.summary.appointments],
      ['Prescriptions written', report.summary.prescriptions],
      ['Prescriptions dispensed', report.summary.dispensed],
      ['Admissions', report.summary.admissions],
      ['Discharges', report.summary.discharges],
      ['Average length of stay (days)', report.summary.averageLengthOfStay],
      ['Pharmacy stock value', report.summary.pharmacyStockValue],
      [],
      ['Revenue by day'],
      ['Date', 'Invoiced', 'Collected'],
      ...report.revenueByDay.map((row) => [row.date, row.invoiced, row.collected]),
      [],
      ['Revenue by category'],
      ['Category', 'Amount', 'Quantity'],
      ...report.revenueByCategory.map((row) => [row.category, row.amount, row.quantity]),
      [],
      ['Payment methods'],
      ['Method', 'Amount', 'Payments'],
      ...report.paymentMethods.map((row) => [row.method, row.amount, row.count]),
      [],
      ['New patients by department'],
      ['Department', 'Patients'],
      ...report.patientsByDepartment.map((row) => [row.department, row.count]),
      [],
      ['Appointments by status'],
      ['Status', 'Count'],
      ...report.appointmentsByStatus.map((row) => [row.status, row.count]),
      [],
      ['Doctor workload'],
      ['Doctor', 'Department', 'Appointments', 'Completed', 'Cancelled', 'Completion %'],
      ...report.doctorWorkload.map((row) => [
        row.name, row.department, row.appointments, row.completed, row.cancelled, row.completionRate
      ]),
      [],
      ['Most prescribed medicines'],
      ['Medicine', 'Prescribed', 'Dispensed', 'Times prescribed'],
      ...report.topMedicines.map((row) => [row.medicine, row.prescribed, row.dispensed, row.times])
    ];

    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `careease-report-${report.range.from}-to-${report.range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  if (loading) return <LoadingState label="Building the report" className="py-24" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const s = report.summary;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${formatDate(report.range.from)} to ${formatDate(report.range.to)} · ${pluralise(report.range.days, 'day')}`}
        icon={FileBarChart}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={load} />
            <Button variant="outline" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            <Button icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
          </>
        }
      />

      <Card className="mb-6 print:hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <Select
            label="Period"
            className="w-48"
            value={preset}
            onChange={(event) => choosePreset(event.target.value)}
            options={PRESETS}
          />
          <Input
            label="From"
            type="date"
            className="w-44"
            value={range.from}
            max={range.to}
            onChange={(event) => {
              setPreset('custom');
              setRange((current) => ({ ...current, from: event.target.value }));
            }}
          />
          <Input
            label="To"
            type="date"
            className="w-44"
            value={range.to}
            min={range.from}
            max={toDateInput(new Date())}
            onChange={(event) => {
              setPreset('custom');
              setRange((current) => ({ ...current, to: event.target.value }));
            }}
          />
          <p className="pb-2.5 text-xs text-slate-500">
            Compared with {formatDate(report.range.comparedWith.from)} –{' '}
            {formatDate(report.range.comparedWith.to)}
          </p>
        </div>
      </Card>

      {/* Headline figures */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={Wallet}
          label="Revenue collected"
          value={formatCurrency(s.revenueCollected)}
          change={s.revenueChange}
          changeLabel="vs previous period"
          tone="green"
        />
        <StatsCard
          icon={Receipt}
          label="Invoices raised"
          value={formatNumber(s.invoices)}
          change={s.invoicesChange}
          changeLabel="vs previous period"
          tone="cyan"
        />
        <StatsCard
          icon={Users}
          label="New patients"
          value={formatNumber(s.newPatients)}
          change={s.newPatientsChange}
          changeLabel="vs previous period"
          tone="blue"
        />
        <StatsCard
          icon={CircleAlert}
          label="Outstanding"
          value={formatCurrency(s.outstandingTotal)}
          hint={`${s.outstandingInvoices} unpaid invoice(s)`}
          tone={s.outstandingTotal > 0 ? 'rose' : 'slate'}
        />
        <StatsCard
          icon={CalendarDays}
          label="Appointments"
          value={formatNumber(s.appointments)}
          tone="purple"
        />
        <StatsCard
          icon={Pill}
          label="Prescriptions"
          value={formatNumber(s.prescriptions)}
          hint={`${s.dispensed} dispensed`}
          tone="amber"
        />
        <StatsCard
          icon={BedDouble}
          label="Admissions"
          value={formatNumber(s.admissions)}
          hint={`${s.discharges} discharged · avg stay ${s.averageLengthOfStay} days`}
          tone="cyan"
        />
        <StatsCard
          icon={IndianRupee}
          label="Collection rate"
          value={`${s.collectionRate}%`}
          hint={`${formatCurrency(s.revenueInvoiced)} invoiced`}
          tone="green"
        />
      </div>

      {/* Revenue */}
      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue over the period" icon={IndianRupee} />
          <div className="p-4 pt-5">
            {report.revenueByDay.length === 0 ? (
              <EmptyState title="No invoices in this period" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={report.revenueByDay}>
                  <defs>
                    <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    {...axisProps}
                    interval="preserveStartEnd"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                    }
                  />
                  <YAxis
                    {...axisProps}
                    width={54}
                    tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value)}
                  />
                  <Tooltip
                    {...tooltipProps}
                    formatter={(value) => formatCurrency(value, true)}
                    labelFormatter={(value) => formatDate(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="invoiced"
                    name="Invoiced"
                    stroke="#cbd5e1"
                    strokeWidth={2}
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#0891b2"
                    strokeWidth={2}
                    fill="url(#collectedFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue by category" icon={Receipt} />
          <div className="p-4 pt-5">
            {report.revenueByCategory.length === 0 ? (
              <EmptyState title="Nothing invoiced" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={report.revenueByCategory}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={54}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {report.revenueByCategory.map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipProps} formatter={(value) => formatCurrency(value, true)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Activity */}
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="New patients by department" icon={Users} />
          <div className="p-4 pt-5">
            {report.patientsByDepartment.length === 0 ? (
              <EmptyState title="No new patients in this period" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={report.patientsByDepartment} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" {...axisProps} allowDecimals={false} />
                  <YAxis type="category" dataKey="department" {...axisProps} width={90} />
                  <Tooltip {...tooltipProps} />
                  <Bar dataKey="count" name="Patients" fill="#0891b2" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="How people paid" icon={Wallet} />
          {report.paymentMethods.length === 0 ? (
            <EmptyState title="No payments in this period" />
          ) : (
            <ul className="divide-y divide-slate-50">
              {report.paymentMethods.map((method) => (
                <li key={method.method} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900">{method.method}</span>
                    <span className="block text-xs text-slate-400">
                      {method.count} payment{method.count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(method.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Doctor workload" icon={Stethoscope} />
          {report.doctorWorkload.length === 0 ? (
            <EmptyState title="No appointments in this period" />
          ) : (
            <Table
              columns={[
                { key: 'doctor', label: 'Doctor' },
                { key: 'appointments', label: 'Booked', align: 'right' },
                { key: 'completed', label: 'Completed', align: 'right' },
                { key: 'rate', label: 'Rate', align: 'right' }
              ]}
            >
              {report.doctorWorkload.map((doctor) => (
                <tr key={doctor.name} className="hover:bg-slate-50">
                  <Td>
                    <p className="font-medium text-slate-900">{doctor.name}</p>
                    <p className="text-xs text-slate-400">{doctor.department}</p>
                  </Td>
                  <Td className="text-right">{doctor.appointments}</Td>
                  <Td className="text-right">{doctor.completed}</Td>
                  <Td className="text-right">
                    <Badge
                      tone={
                        doctor.completionRate >= 80
                          ? 'green'
                          : doctor.completionRate >= 50
                            ? 'amber'
                            : 'slate'
                      }
                    >
                      {doctor.completionRate}%
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Most prescribed medicines" icon={Pill} />
          {report.topMedicines.length === 0 ? (
            <EmptyState title="No prescriptions in this period" />
          ) : (
            <Table
              columns={[
                { key: 'medicine', label: 'Medicine' },
                { key: 'times', label: 'Prescriptions', align: 'right' },
                { key: 'prescribed', label: 'Units', align: 'right' },
                { key: 'dispensed', label: 'Dispensed', align: 'right' }
              ]}
            >
              {report.topMedicines.map((medicine) => (
                <tr key={medicine.medicine} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-900">{medicine.medicine}</Td>
                  <Td className="text-right">{medicine.times}</Td>
                  <Td className="text-right">{medicine.prescribed}</Td>
                  <Td className="text-right">
                    <Badge tone={medicine.dispensed >= medicine.prescribed ? 'green' : 'amber'}>
                      {medicine.dispensed}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
};

export default Reports;
