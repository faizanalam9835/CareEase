import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  HeartPulse,
  ShieldCheck,
  Pill,
  BarChart3,
  Users,
  ArrowRight,
  Info,
  Stethoscope,
  ClipboardList,
  UserCog,
  ConciergeBell,
  Globe
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { Button, Input, Badge, Spinner } from '../../components/ui';
import Logo from '../../components/shared/Logo';
import { homePath } from '../../lib/navigation';
import type { DemoAccount, DemoCredentials, HospitalChoice, LoginCredentials, Role } from '../../types';

const ROLE_ICONS: Record<Role, LucideIcon> = {
  HOSPITAL_ADMIN: UserCog,
  DOCTOR: Stethoscope,
  NURSE: HeartPulse,
  RECEPTIONIST: ConciergeBell,
  PHARMACIST: Pill,
  SUPER_ADMIN: Globe
};

const HIGHLIGHTS = [
  { icon: Building2, label: 'Multi-tenant', copy: 'Each hospital fully isolated' },
  { icon: ShieldCheck, label: 'Role-based access', copy: 'Down to the department' },
  { icon: Pill, label: 'Pharmacy', copy: 'Stock, expiry and dispensing' },
  { icon: BarChart3, label: 'Live analytics', copy: 'Revenue and occupancy' }
];

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demo, setDemo] = useState<DemoCredentials | null>(null);
  const [demoLoading, setDemoLoading] = useState(true);
  // Set when the account exists at several hospitals: the user picks one.
  const [choices, setChoices] = useState<HospitalChoice[] | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors }
  } = useForm<LoginCredentials>({ defaultValues: { email: '', password: '' } });

  // The seeded demo accounts are listed here and fill the form on a single click.
  useEffect(() => {
    authService
      .demoCredentials()
      .then((data) => setDemo(data.demoMode ? data : null))
      .catch(() => setDemo(null))
      .finally(() => setDemoLoading(false));
  }, []);

  const fillFromDemoAccount = (account: DemoAccount) => {
    if (!demo) return;
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    setChoices(null);
    toast.success(`Filled in the ${account.label} account`);
  };

  // No Hospital ID to type: the server finds the hospital from the account.
  const onSubmit = async (values: LoginCredentials) => {
    setSubmitting(true);
    const result = await login(values);
    setSubmitting(false);

    if (!result.success) {
      if (result.hospitals?.length) {
        setChoices(result.hospitals);
        return;
      }
      toast.error(result.error || 'Could not sign you in');
      return;
    }

    toast.success(`Welcome back, ${result.user.firstName}`);
    navigate(homePath(result.user.roles), { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col gap-3 p-3 lg:flex-row">
      {/* Form */}
      <div className="glass flex flex-1 flex-col justify-center rounded-3xl px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5">
            <Logo className="h-12 w-12" />
            <span>
              <span className="block text-lg font-semibold leading-tight text-slate-900">
                CareEase
              </span>
              <span className="block text-xs leading-tight text-slate-400">
                Hospital Management System
              </span>
            </span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Use the credentials your hospital administrator gave you.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
            <Input
              label="E-mail address"
              type="email"
              autoComplete="username"
              icon={Mail}
              placeholder="you@hospital.health"
              error={errors.email}
              required
              {...register('email', {
                required: 'Enter your e-mail address',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'That does not look like an e-mail address' }
              })}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              icon={Lock}
              placeholder="Your password"
              error={errors.password}
              required
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
              {...register('password', { required: 'Enter your password' })}
            />

            {choices && (
              <fieldset className="rounded-md border border-cyan-200 bg-cyan-50 p-3">
                <legend className="px-1 text-sm font-medium text-slate-900">
                  Your account works at more than one hospital. Open which one?
                </legend>
                <div className="mt-1 space-y-1.5">
                  {choices.map((hospital) => (
                    <Button
                      key={hospital.tenantId}
                      variant="outline"
                      icon={Building2}
                      className="w-full justify-start"
                      loading={submitting}
                      onClick={() => onSubmit({ ...getValues(), tenantId: hospital.tenantId })}
                    >
                      {hospital.name}
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {submitting ? 'Signing in' : 'Sign in'}
              {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </form>

          {/* Demo accounts */}
          {demoLoading ? (
            <div className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-6 text-sm text-slate-400">
              <Spinner className="h-4 w-4" />
              Checking for demo accounts
            </div>
          ) : demo ? (
            <section className="mt-7 rounded-2xl bg-cyan-50 p-4 ring-1 ring-inset ring-cyan-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  Demo accounts
                </h2>
              </div>

              <p className="mt-1.5 text-xs leading-relaxed text-cyan-800/80">
                {demo.seeded
                  ? 'Click any role to fill the form, then sign in. Each role sees a different slice of the system.'
                  : demo.hint}
              </p>

              {demo.seeded && (
                <ul className="mt-3 space-y-1.5">
                  {demo.accounts.map((account) => {
                    const Icon = ROLE_ICONS[account.role] || Users;
                    return (
                      <li key={account.email}>
                        <button
                          type="button"
                          onClick={() => fillFromDemoAccount(account)}
                          disabled={!account.available}
                          className="flex w-full items-center gap-3 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="rounded-lg bg-cyan-50 p-1.5 text-cyan-600">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {account.label}
                            </span>
                            <span className="block truncate font-mono text-[11px] text-slate-500">
                              {account.email} / {account.password}
                            </span>
                          </span>
                          <ArrowRight
                            className="h-4 w-4 shrink-0 text-slate-300"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          <p className="mt-7 text-center text-sm text-slate-500">
            New hospital?{' '}
            <Link
              to="/#contact"
              className="font-medium text-cyan-700 underline-offset-2 hover:underline"
            >
              Talk to the CareEase team
            </Link>
          </p>
        </div>
      </div>

      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-center overflow-hidden rounded-3xl bg-cyan-600 px-14 lg:flex">

        <div className="relative max-w-lg">
          <Badge tone="cyan" className="bg-white/15 text-white ring-white/25">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Secure multi-tenant platform
          </Badge>

          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Run the whole hospital from one place.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-cyan-50/90">
            Registration through to discharge — patients, appointments, prescriptions, pharmacy
            stock and billing, with strict department-level access control throughout.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, label, copy }) => (
              <div key={label} className="rounded-xl border border-white/15 bg-white/10 p-4">
                <Icon className="h-5 w-5 text-cyan-100" aria-hidden="true" />
                <dt className="mt-2.5 text-sm font-semibold text-white">{label}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-cyan-100/80">{copy}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-10 flex items-center gap-2 text-sm text-cyan-100/70">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Every action is written to an audit trail.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
