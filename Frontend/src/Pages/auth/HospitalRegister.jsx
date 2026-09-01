import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileBadge,
  Globe,
  BedDouble,
  HeartPulse,
  ArrowRight,
  ArrowLeft,
  CircleCheck,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Users
} from 'lucide-react';
import { hospitalService } from '../../services';
import { Button, Input, Card, Badge } from '../../components/ui';

const BENEFITS = [
  { icon: Clock, title: 'Live in minutes', copy: 'Register, verify your e-mail and start working.' },
  { icon: ShieldCheck, title: 'Your data stays yours', copy: 'Every hospital is fully isolated from every other.' },
  { icon: Users, title: 'Roles out of the box', copy: 'Doctors, nurses, pharmacy and front desk, ready to go.' }
];

/* ---------------------------- success panel ------------------------------ */

const Registered = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.tenantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-lg p-8 text-center">
        <span className="mx-auto inline-flex rounded-full bg-emerald-50 p-3.5 text-emerald-600">
          <CircleCheck className="h-8 w-8" aria-hidden="true" />
        </span>

        <h1 className="mt-5 text-xl font-semibold text-slate-900">Hospital registered</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We have sent a verification link to <strong>{result.adminEmail}</strong>. Open it to
          activate the workspace and create your administrator account.
        </p>

        <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
            Your Hospital ID
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="rounded bg-white px-2.5 py-1.5 font-mono text-base font-semibold text-slate-900 ring-1 ring-cyan-200">
              {result.tenantId}
            </code>
            <Button
              size="sm"
              variant="ghost"
              icon={copied ? Check : Copy}
              aria-label="Copy hospital ID"
              onClick={copy}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-cyan-800/80">
            Keep this safe — every member of your team needs it to sign in.
          </p>
        </div>

        {/* Shown so the flow can be completed on a machine with no mailbox. */}
        {result.verificationLink && (
          <div className="mt-4 rounded-xl border border-slate-200 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Verification link
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              If the e-mail does not arrive, you can verify directly:
            </p>
            <Button
              className="mt-2.5 w-full"
              onClick={() => navigate(`/verify/${result.verificationToken}`)}
            >
              Verify now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-cyan-700 hover:underline">
          Go to sign in
        </Link>
      </Card>
    </div>
  );
};

/* -------------------------------- the form -------------------------------- */

const HospitalRegister = () => {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Values typed into the landing page's call-to-action arrive as route state.
  const { state } = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: state?.name || '',
      adminEmail: state?.adminEmail || '',
      contactNumber: state?.contactNumber || '',
      bedCapacity: 50
    }
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const data = await hospitalService.register({
        ...values,
        bedCapacity: Number(values.bedCapacity) || 50
      });
      toast.success('Hospital registered');
      setResult({ ...data, adminEmail: values.adminEmail });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) return <Registered result={result} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="rounded-lg bg-cyan-600 p-1.5 text-white">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold text-slate-900">CareEase</span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Badge tone="cyan">Free to start</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Register your hospital
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              You get an isolated workspace with its own Hospital ID. Verify the administrator
              e-mail and you can start adding staff and patients straight away.
            </p>

            <Card className="mt-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6" noValidate>
                <section>
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Hospital details
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Hospital name"
                      required
                      className="sm:col-span-2"
                      icon={Building2}
                      placeholder="CareEase General Hospital"
                      error={errors.name}
                      {...register('name', {
                        required: 'Enter the hospital name',
                        minLength: { value: 3, message: 'At least 3 characters' }
                      })}
                    />
                    <Input
                      label="Address"
                      required
                      className="sm:col-span-2"
                      icon={MapPin}
                      placeholder="17 Marine Lines, Churchgate"
                      error={errors.address}
                      {...register('address', { required: 'Enter the address' })}
                    />
                    <Input label="City" placeholder="Mumbai" {...register('city')} />
                    <Input label="State" placeholder="Maharashtra" {...register('state')} />
                    <Input
                      label="Bed capacity"
                      type="number"
                      min="0"
                      icon={BedDouble}
                      hint="Used for the occupancy figure"
                      {...register('bedCapacity')}
                    />
                    <Input
                      label="Website"
                      icon={Globe}
                      placeholder="https://"
                      {...register('website')}
                    />
                  </div>
                </section>

                <section>
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Contact and licence
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Contact number"
                      required
                      icon={Phone}
                      placeholder="02224445566"
                      error={errors.contactNumber}
                      {...register('contactNumber', {
                        required: 'Enter a contact number',
                        pattern: {
                          value: /^[0-9+\-\s()]{8,15}$/,
                          message: 'That does not look like a phone number'
                        }
                      })}
                    />
                    <Input
                      label="Licence number"
                      required
                      icon={FileBadge}
                      placeholder="MH-HOSP-2024-0001"
                      error={errors.licenseNumber}
                      {...register('licenseNumber', { required: 'Enter the licence number' })}
                    />
                    <Input
                      label="Administrator e-mail"
                      type="email"
                      required
                      className="sm:col-span-2"
                      icon={Mail}
                      placeholder="admin@yourhospital.health"
                      hint="This becomes the first administrator account"
                      error={errors.adminEmail}
                      {...register('adminEmail', {
                        required: 'Enter the administrator e-mail',
                        pattern: {
                          value: /^\S+@\S+\.\S+$/,
                          message: 'That does not look like an e-mail address'
                        }
                      })}
                    />
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <p className="text-xs text-slate-500">
                    Already registered?{' '}
                    <Link to="/login" className="font-medium text-cyan-700 hover:underline">
                      Sign in
                    </Link>
                  </p>
                  <Button type="submit" size="lg" loading={submitting}>
                    {submitting ? 'Registering' : 'Register hospital'}
                    {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <aside className="space-y-4">
            {BENEFITS.map(({ icon: Icon, title, copy }) => (
              <Card key={title} className="p-5">
                <span className="inline-flex rounded-lg bg-cyan-50 p-2 text-cyan-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{copy}</p>
              </Card>
            ))}

            <Card className="border-cyan-100 bg-cyan-50/60 p-5">
              <h3 className="text-sm font-semibold text-cyan-900">Just looking around?</h3>
              <p className="mt-1 text-sm leading-relaxed text-cyan-800/80">
                The sign-in page lists demo accounts for every role, loaded with sample data.
              </p>
              <Link to="/login">
                <Button variant="secondary" size="sm" className="mt-3">
                  Try the demo
                </Button>
              </Link>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default HospitalRegister;
