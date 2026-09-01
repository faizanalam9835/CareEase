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
  Check,
  Copy,
  Info,
  Stethoscope,
  ClipboardList,
  UserCog,
  ConciergeBell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { Button, Input, Badge, Spinner } from '../../components/ui';
import { HOME_PATH } from '../../lib/navigation';

const ROLE_ICONS = {
  HOSPITAL_ADMIN: UserCog,
  DOCTOR: Stethoscope,
  NURSE: HeartPulse,
  RECEPTIONIST: ConciergeBell,
  PHARMACIST: Pill
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
  const [demo, setDemo] = useState(null);
  const [demoLoading, setDemoLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({ defaultValues: { email: '', password: '', tenantId: '' } });

  // The sign-in screen asks for a Hospital ID that a reviewer has no way of
  // knowing, so the seeded demo accounts are listed here and fill the form on
  // a single click.
  useEffect(() => {
    authService
      .demoCredentials()
      .then((data) => setDemo(data.demoMode ? data : null))
      .catch(() => setDemo(null))
      .finally(() => setDemoLoading(false));
  }, []);

  const fillFromDemoAccount = (account) => {
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    setValue('tenantId', demo.tenantId, { shouldValidate: true });
    toast.success(`Filled in the ${account.label} account`);
  };

  const copyTenant = async () => {
    try {
      await navigator.clipboard.writeText(demo.tenantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy - please select the ID and copy it manually');
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    const result = await login(values);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Could not sign you in');
      return;
    }

    toast.success(`Welcome back, ${result.user.firstName}`);
    navigate(HOME_PATH, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Form */}
      <div className="flex flex-1 flex-col justify-center bg-white px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5">
            <span className="rounded-xl bg-cyan-600 p-2 text-white">
              <HeartPulse className="h-6 w-6" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-semibold leading-tight text-slate-900">
                CareEase
              </span>
              <span className="block text-xs leading-tight text-slate-400">
                Hospital Management System
              </span>
            </span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
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

            <Input
              label="Hospital ID"
              icon={Building2}
              placeholder="TDEMO001"
              hint="The tenant ID issued when your hospital was registered."
              error={errors.tenantId}
              required
              className="uppercase-input"
              {...register('tenantId', {
                required: 'Enter your Hospital ID',
                pattern: {
                  value: /^T[A-Za-z0-9]{3,}$/,
                  message: 'A Hospital ID starts with T, for example TDEMO001'
                }
              })}
            />

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
            <section className="mt-7 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  Demo accounts
                </h2>
                <button
                  type="button"
                  onClick={copyTenant}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 font-mono text-xs font-semibold text-cyan-800 ring-1 ring-cyan-200 transition-colors hover:bg-cyan-100"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {demo.tenantId}
                </button>
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
                          className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-cyan-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
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
              to="/hospital-register"
              className="font-medium text-cyan-700 underline-offset-2 hover:underline"
            >
              Register your hospital
            </Link>
          </p>
        </div>
      </div>

      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-center overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-800 px-14 lg:flex">
        <div
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"
          aria-hidden="true"
        />

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
