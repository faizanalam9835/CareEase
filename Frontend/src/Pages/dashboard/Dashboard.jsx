import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Users,
  Stethoscope,
  CalendarDays,
  BedDouble,
  IndianRupee,
  Pill,
  RefreshCw,
  Activity,
  ArrowRight,
  CircleAlert,
  AlertTriangle,
  Info,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  ServerCog
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService, appointmentService } from '../../services';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
  CardHeader,
  Badge,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
  PageHeader
} from '../../components/ui';
import {
  formatCurrency,
  formatNumber,
  formatRelative,
  formatTime,
  APPOINTMENT_TONE
} from '../../lib/format';
import { navFor } from '../../lib/navigation';

const CHART_COLORS = ['#0891b2', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#64748b'];

const ALERT_STYLES = {
  critical: { icon: CircleAlert, tone: 'red', ring: 'border-red-200 bg-red-50' },
  warning: { icon: AlertTriangle, tone: 'amber', ring: 'border-amber-200 bg-amber-50' },
  info: { icon: Info, tone: 'blue', ring: 'border-blue-200 bg-blue-50' }
};

const chartTooltip = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(15,23,42,0.08)'
  }
};

const axisProps = {
  tick: { fontSize: 11, fill: '#94a3b8' },
  tickLine: false,
  axisLine: false
};

const Dashboard = () => {
  const { user, roles, isAdmin, hasRole } = useAuth();

  const [data, setData] = useState({
    stats: null,
    charts: null,
    activities: [],
    alerts: [],
    today: [],
    system: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    // Every panel is fetched in parallel and settled independently, so one
    // endpoint the current role cannot see does not blank the whole page.
    const [stats, charts, activities, alerts, today, system] = await Promise.allSettled([
      dashboardService.stats(),
      dashboardService.charts(14),
      dashboardService.activities(8),
      dashboardService.alerts(),
      appointmentService.today(),
      dashboardService.systemStatus()
    ]);

    if (stats.status === 'rejected') {
      setError(stats.reason?.message || 'Could not load the dashboard');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setData({
      stats: stats.value.stats,
      scope: stats.value.scope,
      charts: charts.status === 'fulfilled' ? charts.value.charts : null,
      activities: activities.status === 'fulfilled' ? activities.value.activities : [],
      alerts: alerts.status === 'fulfilled' ? alerts.value.alerts : [],
      today: today.status === 'fulfilled' ? today.value.appointments : [],
      system: system.status === 'fulfilled' ? system.value.services : []
    });

    setLoading(false);
    setRefreshing(false);
    if (isRefresh) toast.success('Dashboard updated');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const quickLinks = useMemo(
    () => navFor(roles).filter((item) => !item.hideFromQuickActions && item.path !== '/app/dashboard'),
    [roles]
  );

  const statCards = useMemo(() => {
    const stats = data.stats;
    if (!stats) return [];

    const cards = [
      {
        icon: Users,
        label: 'Patients',
        value: formatNumber(stats.totalPatients),
        change: stats.patientGrowth,
        tone: 'cyan',
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']
      },
      {
        icon: CalendarDays,
        label: "Today's appointments",
        value: formatNumber(stats.todayAppointments),
        hint: `${formatNumber(stats.upcomingAppointments)} upcoming`,
        tone: 'blue',
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']
      },
      {
        icon: BedDouble,
        label: 'Beds occupied',
        value: `${stats.occupancyRate}%`,
        hint: `${stats.ipdPatients} of ${stats.bedCapacity} beds`,
        tone: 'purple',
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']
      },
      {
        icon: Stethoscope,
        label: 'Doctors on staff',
        value: formatNumber(stats.activeDoctors),
        hint: `${formatNumber(stats.totalStaff)} staff in total`,
        tone: 'green',
        roles: ['HOSPITAL_ADMIN']
      },
      {
        icon: IndianRupee,
        label: 'Revenue this month',
        value: formatCurrency(stats.monthlyRevenue),
        change: stats.revenueGrowth,
        tone: 'green',
        roles: ['HOSPITAL_ADMIN', 'RECEPTIONIST']
      },
      {
        icon: IndianRupee,
        label: 'Outstanding',
        value: formatCurrency(stats.pendingPayments),
        hint: 'Across unpaid invoices',
        tone: 'rose',
        roles: ['HOSPITAL_ADMIN', 'RECEPTIONIST']
      },
      {
        icon: FileText,
        label: 'Prescriptions waiting',
        value: formatNumber(stats.pendingPrescriptions),
        hint: `${formatNumber(stats.totalPrescriptions)} written in total`,
        tone: 'amber',
        roles: ['HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST']
      },
      {
        icon: Pill,
        label: 'Low stock items',
        value: formatNumber(stats.lowStockCount),
        hint: `Inventory worth ${formatCurrency(stats.stockValue)}`,
        tone: stats.lowStockCount > 0 ? 'rose' : 'slate',
        roles: ['HOSPITAL_ADMIN', 'PHARMACIST']
      }
    ];

    return cards.filter((card) => hasRole(card.roles));
  }, [data.stats, hasRole]);

  if (loading) return <LoadingState label="Loading your dashboard" className="py-24" />;
  if (error) return <ErrorState message={error} onRetry={() => load()} />;

  const { charts, activities, alerts, today, system, scope } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.firstName}`}
        subtitle={`${scope?.hospitalName} — ${scope?.department}`}
        icon={Activity}
        actions={
          <Button variant="outline" icon={RefreshCw} loading={refreshing} onClick={() => load(true)}>
            Refresh
          </Button>
        }
      />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.slice(0, 3).map((alert, index) => {
            const style = ALERT_STYLES[alert.severity] || ALERT_STYLES.info;
            const Icon = style.icon;
            return (
              <Link
                key={`${alert.title}-${index}`}
                to={alert.link || '/app/dashboard'}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-shadow hover:shadow-sm ${style.ring}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{alert.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                    {alert.message}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts */}
      {charts && (
        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Appointments over the last 14 days"
              subtitle="Booked, completed and cancelled"
              icon={CalendarDays}
            />
            <div className="p-4 pt-5">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={charts.appointmentTrend}>
                  <defs>
                    <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="doneFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} allowDecimals={false} width={28} />
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Booked"
                    stroke="#0891b2"
                    strokeWidth={2}
                    fill="url(#totalFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#doneFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Patients by department" icon={Stethoscope} />
            <div className="p-4 pt-5">
              {charts.patientsByDepartment.length === 0 ? (
                <EmptyState title="No patients yet" message="Register a patient to see the split." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={charts.patientsByDepartment}
                      dataKey="count"
                      nameKey="department"
                      innerRadius={54}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {charts.patientsByDepartment.map((entry, index) => (
                        <Cell key={entry.department} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {isAdmin && (
            <>
              <Card className="xl:col-span-2">
                <CardHeader
                  title="Revenue"
                  subtitle="Invoiced against collected, last six months"
                  icon={IndianRupee}
                />
                <div className="p-4 pt-5">
                  {charts.revenueTrend.length === 0 ? (
                    <EmptyState title="No invoices yet" message="Revenue appears once you raise invoices." />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={charts.revenueTrend} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" {...axisProps} />
                        <YAxis
                          {...axisProps}
                          width={54}
                          tickFormatter={(value) =>
                            value >= 1000 ? `${Math.round(value / 1000)}k` : value
                          }
                        />
                        <Tooltip {...chartTooltip} formatter={(value) => formatCurrency(value, true)} />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                        <Bar dataKey="invoiced" name="Invoiced" fill="#cbd5e1" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="collected" name="Collected" fill="#0891b2" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Busiest doctors" subtitle="By appointment volume" icon={Stethoscope} />
                <div className="p-2">
                  {charts.topDoctors.length === 0 ? (
                    <EmptyState title="No appointments yet" />
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {charts.topDoctors.map((doctor, index) => (
                        <li key={doctor.name} className="flex items-center gap-3 px-3 py-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {doctor.name}
                            </span>
                            <span className="block text-xs text-slate-500">{doctor.department}</span>
                          </span>
                          <Badge tone="cyan">{doctor.appointments}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Today + activity */}
      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Today's schedule"
            subtitle={`${today.length} appointment${today.length === 1 ? '' : 's'}`}
            icon={Clock}
            action={
              <Link to="/app/appointments">
                <Button size="sm" variant="ghost">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </Link>
            }
          />
          {today.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing booked for today"
              message="Appointments booked for today will appear here."
              action={
                <Link to="/app/appointments">
                  <Button size="sm">Book an appointment</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-50">
              {today.slice(0, 6).map((appointment) => (
                <li key={appointment._id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="w-16 shrink-0 text-sm font-semibold text-slate-900">
                    {formatTime(appointment.appointmentTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {appointment.patientId?.firstName} {appointment.patientId?.lastName}
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
        </Card>

        <Card>
          <CardHeader title="Recent activity" icon={Activity} />
          {activities.length === 0 ? (
            <EmptyState title="Nothing yet" message="Actions taken in the system show up here." />
          ) : (
            <ul className="divide-y divide-slate-50">
              {activities.map((activity) => (
                <li key={activity.id} className="px-5 py-3">
                  <p className="text-sm leading-snug text-slate-700">{activity.description}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {activity.actor} — {formatRelative(activity.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick links + system */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Jump to" subtitle="Only what your role can reach" icon={ArrowRight} />
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition-all hover:border-cyan-300 hover:shadow-sm"
                >
                  <span className="rounded-lg bg-cyan-50 p-2 text-cyan-600 transition-transform group-hover:scale-105">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{item.name}</span>
                    <span className="block text-xs text-slate-500">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="System status" icon={ServerCog} />
          <ul className="divide-y divide-slate-50">
            {system.map((service) => (
              <li key={service.service} className="flex items-center gap-3 px-5 py-3.5">
                {service.status === 'operational' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : service.status === 'degraded' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{service.service}</span>
                  <span className="block truncate text-xs text-slate-500">{service.response}</span>
                </span>
                <Badge
                  tone={
                    service.status === 'operational'
                      ? 'green'
                      : service.status === 'degraded'
                        ? 'amber'
                        : 'red'
                  }
                >
                  {service.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
};

export default Dashboard;
