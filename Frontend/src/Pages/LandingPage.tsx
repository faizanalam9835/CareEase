import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Phone,
  MapPin,
  Stethoscope,
  CalendarDays,
  PhoneCall,
  FileText,
  Pill,
  Receipt,
  BedDouble,
  Activity,
  FileBarChart,
  Users,
  Mail,
  ShieldCheck,
  Lock,
  Layers,
  Ban,
  ArrowRight,
  CheckCircle2,
  Check,
  Minus,
  Send,
  LogIn,
  Search,
  Building2,
  UserCheck,
  KeyRound,
  LayoutDashboard,
  Bot,
  User
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { contactService } from '../services';
import type { OnboardingRequest } from '../services';
import { asApiError } from '../services/api';
import { Button, Input, Textarea } from '../components/ui';
import Logo from '../components/shared/Logo';
import { NAV_ITEMS, ROLE_LABELS } from '../lib/navigation';
import type { Role } from '../types';

/*
 * Everything on this page is what the product does today. No customer counts,
 * ratings or testimonials, and no third-party product names. The access matrix
 * is built from the app's own menu definition, so it cannot drift from reality.
 */

const CONTACT = {
  phone: '+91 98356 31769',
  email: 'faizansaikh786786f@gmail.com',
  city: 'Ranchi, Jharkhand, India'
};

const NAV = [
  { label: 'Product', href: '#product' },
  { label: 'Modules', href: '#modules' },
  { label: 'Access control', href: '#access' },
  { label: 'Security', href: '#security' },
  { label: 'Get started', href: '#contact' }
];

const MODULES: { icon: LucideIcon; title: string; copy: string }[] = [
  { icon: Stethoscope, title: 'Patients', copy: 'Patient IDs, blood group, allergies, emergency contacts and OPD / IPD status.' },
  { icon: CalendarDays, title: 'Appointments', copy: 'Live free-slot checking against each doctor’s hours; double bookings are refused.' },
  { icon: PhoneCall, title: 'Voice receptionist', copy: 'An AI that answers the phone and books appointments by itself, day and night.' },
  { icon: FileText, title: 'Prescriptions', copy: 'Diagnosis, dosage, frequency and duration, sent straight to the pharmacy.' },
  { icon: Pill, title: 'Pharmacy', copy: 'Batches, expiry dates and reorder levels; dispensing takes stock out.' },
  { icon: Receipt, title: 'Billing', copy: 'Itemised invoices, part payments, cash, card, UPI, net banking and insurance.' },
  { icon: BedDouble, title: 'Wards and beds', copy: 'ICU, NICU, maternity and more, with admit, transfer and discharge.' },
  { icon: Activity, title: 'Vitals', copy: 'Readings outside the normal or critical range are flagged for attention.' },
  { icon: FileBarChart, title: 'Reports', copy: 'Revenue, collections, departments and admissions, against the period before.' },
  { icon: Users, title: 'Staff', copy: 'Doctors with fees and working hours, nurses, reception and pharmacy.' },
  { icon: Mail, title: 'E-mail', copy: 'Confirmations to patients and doctors, welcome and password e-mails to staff.' },
  { icon: Search, title: 'Search and alerts', copy: 'One search across the hospital, alerts for low stock and overdue bills.' }
];

const HOSPITAL_ROLES: Role[] = ['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST'];
const MATRIX = NAV_ITEMS.filter((item) => !item.hideFromQuickActions && item.roles.some((r) => HOSPITAL_ROLES.includes(r)));

const ABAC_RULES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Building2,
    title: 'Hospital',
    copy: 'Every record carries its hospital. A request can only ever touch records of the hospital the signed-in account belongs to.'
  },
  {
    icon: Stethoscope,
    title: 'Department',
    copy: 'Doctors and nurses reach only patients of their own department. Admin, reception and pharmacy work across departments.'
  },
  {
    icon: UserCheck,
    title: 'Account status',
    copy: 'Inactive or locked accounts are refused on their very next request, even mid-session.'
  },
  {
    icon: KeyRound,
    title: 'Hospital status',
    copy: 'If a hospital’s workspace is paused, every one of its accounts is refused until it is active again.'
  }
];

const SECURITY: { icon: LucideIcon; title: string; copy: string }[] = [
  { icon: Layers, title: 'Isolated data', copy: 'Each hospital’s data is kept apart and the boundary is enforced on the server, not in the browser.' },
  { icon: Lock, title: 'Protected passwords', copy: 'Passwords are stored as one-way hashes, with a strong-password rule for everyone.' },
  { icon: ShieldCheck, title: 'Checked every time', copy: 'Roles and attributes are re-read on every request, so a change applies immediately.' },
  { icon: Ban, title: 'Instant lock-out', copy: 'Deactivating a user signs them out at once, not when their session expires.' }
];

const STEPS = [
  { title: 'Tell us about your hospital', copy: 'Send the form below and we call you back.' },
  { title: 'We set up your workspace', copy: 'Your administrator receives their sign-in by e-mail.' },
  { title: 'Add your team', copy: 'Each staff member gets a welcome e-mail with their own login.' },
  { title: 'Go live', copy: 'Optionally connect the voice receptionist to your hospital’s number.' }
];

const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

/* ------------------------------ illustrations ----------------------------- */

const Window = ({ children, title }: { children: ReactNode; title: string }) => (
  <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      <span className="ml-3 text-xs text-slate-500">{title}</span>
    </div>
    {children}
  </div>
);

const DashboardPreview = () => (
  <Window title="Dashboard">
    <div className="flex">
      <div className="hidden w-12 flex-col items-center gap-3 border-r border-slate-100 py-4 sm:flex">
        {[LayoutDashboard, Stethoscope, CalendarDays, PhoneCall, Pill, Receipt].map((Icon, i) => (
          <span key={i} className={`rounded-md p-1.5 ${i === 0 ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ))}
      </div>
      <div className="flex-1 space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Appointments today', '24'],
            ['Beds occupied', '38 / 50'],
            ['Collected today', '₹48,200']
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-100 p-3">
              <p className="truncate text-[10px] text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <p className="text-[10px] text-slate-500">Revenue, last 7 days</p>
          <div className="mt-2 flex h-20 items-end gap-2">
            {[45, 60, 38, 72, 55, 88, 66].map((h, i) => (
              <span key={i} className="flex-1 rounded-sm bg-cyan-500" style={{ height: `${h}%`, opacity: i === 5 ? 1 : 0.55 }} />
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100 rounded-md border border-slate-100">
          {[
            ['10:30', 'Follow-up · Cardiology', 'Confirmed'],
            ['11:00', 'Consultation · Neurology', 'Booked by phone'],
            ['11:30', 'OPD · General', 'Scheduled']
          ].map(([time, what, status]) => (
            <div key={time} className="flex items-center gap-3 px-3 py-2 text-xs">
              <span className="font-mono text-slate-500">{time}</span>
              <span className="flex-1 truncate text-slate-700">{what}</span>
              <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Window>
);

const CallPreview = () => (
  <Window title="Call details">
    <div className="space-y-3 p-4 text-sm">
      {[
        [true, 'Namaste, CareEase Hospital. How can I help you?'],
        [false, 'I need to see a cardiologist tomorrow morning.'],
        [true, 'Dr. Mehta is free at 10:30 or 11:00. Which suits you?'],
        [false, '11 is fine.'],
        [true, 'Booked. Your reference is APT-0061, and a confirmation is on its way.']
      ].map(([agent, text], i) => (
        <div key={i} className={`flex gap-2 ${agent ? '' : 'flex-row-reverse'}`}>
          {agent ? <Bot className="mt-1 h-4 w-4 shrink-0 text-cyan-600" aria-hidden="true" /> : <User className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
          <p className={`max-w-[80%] rounded-md px-3 py-2 ${agent ? 'bg-slate-100 text-slate-800' : 'bg-cyan-600 text-white'}`}>{text as string}</p>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-md bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Appointment created · recording and transcript saved
      </div>
    </div>
  </Window>
);

const InvoicePreview = () => (
  <Window title="Invoice INV-0142">
    <div className="p-4 text-sm">
      <div className="divide-y divide-slate-100">
        {[
          ['Consultation · Cardiology', '₹800'],
          ['Atorvastatin 10 mg × 30', '₹240'],
          ['ECG', '₹350']
        ].map(([item, amount]) => (
          <div key={item} className="flex justify-between py-2">
            <span className="text-slate-600">{item}</span>
            <span className="font-medium text-slate-900">{amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900">
        <span>Total</span>
        <span>₹1,390</span>
      </div>
      <div className="mt-3 flex gap-2 text-xs">
        <span className="rounded-md bg-cyan-600 px-2 py-1 font-medium text-white">Paid · UPI</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">Stock updated</span>
      </div>
    </div>
  </Window>
);

/* --------------------------------- pieces -------------------------------- */

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">{children}</p>
);

const FeatureRow = ({
  eyebrow,
  title,
  copy,
  points,
  visual,
  flip = false
}: {
  eyebrow: string;
  title: string;
  copy: string;
  points: string[];
  visual: ReactNode;
  flip?: boolean;
}) => (
  <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
    <div className={flip ? 'lg:order-2' : ''}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h3>
      <p className="mt-3 text-slate-600">{copy}</p>
      <ul className="mt-5 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-slate-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </div>
    <div className={flip ? 'lg:order-1' : ''}>{visual}</div>
  </div>
);

const BLANK: OnboardingRequest = { hospitalName: '', contactName: '', email: '', phone: '', city: '', beds: '', message: '', company: '' };

const ContactForm = () => {
  const [form, setForm] = useState<OnboardingRequest>(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (field: keyof OnboardingRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await contactService.requestOnboarding(form);
      setSent(true);
    } catch (err) {
      const failure = asApiError(err);
      setErrors(failure.details || {});
      toast.error(failure.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-md bg-white p-10 text-center shadow-xl">
        <CheckCircle2 className="mx-auto h-12 w-12 text-cyan-600" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-semibold text-slate-900">Thank you, {form.contactName.split(' ')[0] || 'we got it'}</h3>
        <p className="mt-2 text-slate-600">We will contact you at {form.email} within one working day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-md bg-white p-6 shadow-xl sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Hospital name" required value={form.hospitalName} error={errors.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} />
        <Input label="Your name" required value={form.contactName} error={errors.contactName} onChange={(e) => set('contactName', e.target.value)} />
        <Input label="Work e-mail" type="email" required value={form.email} error={errors.email} onChange={(e) => set('email', e.target.value)} />
        <Input label="Phone" type="tel" required value={form.phone} error={errors.phone} onChange={(e) => set('phone', e.target.value)} />
        <Input label="City" value={form.city} error={errors.city} onChange={(e) => set('city', e.target.value)} />
        <Input label="Number of beds" type="number" min={0} value={form.beds} error={errors.beds} onChange={(e) => set('beds', e.target.value)} />
      </div>
      <Textarea label="Anything we should know?" rows={3} value={form.message} error={errors.message} onChange={(e) => set('message', e.target.value)} />
      {/* Honeypot: invisible to people, filled in by bots. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.company} onChange={(e) => set('company', e.target.value)} />
      <Button type="submit" icon={Send} loading={sending} className="w-full" size="lg">
        Request a demo
      </Button>
    </form>
  );
};

/* ---------------------------------- page --------------------------------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-700">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <span className="text-lg font-bold text-slate-900">CareEase</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-6 text-sm font-medium lg:flex" aria-label="Sections">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-slate-600">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-700">
              Sign in
            </Link>
            <Button onClick={() => scrollTo('#contact')}>Request a demo</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cyan-50 to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-cyan-700 shadow-sm ring-1 ring-cyan-100">
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              New: an AI receptionist that books by phone
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              The whole hospital, <span className="text-cyan-600">one calm screen.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              Patients, appointments, prescriptions, pharmacy, billing and wards, for every member of your staff, with
              access controlled down to the department.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" icon={ArrowRight} onClick={() => scrollTo('#contact')}>
                Request a demo
              </Button>
              <Link to="/login">
                <Button size="lg" variant="outline" icon={LogIn}>
                  Try it live
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">
              {['12 modules', '5 staff roles', 'Role + attribute access', '24×7 phone booking'].map((fact) => (
                <span key={fact} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-600" aria-hidden="true" />
                  {fact}
                </span>
              ))}
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* Product */}
      <section id="product" className="scroll-mt-16 py-24">
        <div className="mx-auto max-w-7xl space-y-28 px-4 sm:px-6">
          <FeatureRow
            eyebrow="Front desk"
            title="Every call answered, every slot filled"
            copy="The voice receptionist picks up when your desk can’t. It reads your real doctor list and diary, so it only ever offers times that are free."
            points={[
              'Finds the right doctor by department and quotes the fee',
              'Registers new callers by phone number',
              'Confirmation e-mails to the patient and the doctor',
              'Recording and transcript kept with the appointment'
            ]}
            visual={<CallPreview />}
          />
          <FeatureRow
            flip
            eyebrow="Clinic to counter"
            title="From prescription to paid invoice, without retyping"
            copy="A prescription lands in the pharmacy queue, dispensing takes it out of stock, and the bill is raised from the same visit."
            points={[
              'Batch, expiry and reorder alerts for every medicine',
              'Itemised invoices with part payments and five payment methods',
              'Revenue and collections reports against the period before'
            ]}
            visual={<InvoicePreview />}
          />
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Eyebrow>Modules</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Everything the hospital runs on</h2>
            <p className="mt-3 text-lg text-slate-600">All of it in the product today, and all of it in the live demo.</p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="bg-white p-6">
                <Icon className="h-6 w-6 text-cyan-600" aria-hidden="true" />
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access control */}
      <section id="access" className="scroll-mt-16 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Eyebrow>Access control</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">RBAC decides the screens. ABAC decides the records.</h2>
            <p className="mt-3 text-lg text-slate-600">
              Role-based access opens the right modules for each job. Attribute-based rules then narrow every request to
              the records that person is allowed to touch.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <Users className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                Role-based access (RBAC)
              </h3>
              <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Module</th>
                      {HOSPITAL_ROLES.map((role) => (
                        <th key={role} className="px-2 py-3 text-center font-semibold">
                          {ROLE_LABELS[role].replace('Hospital administrator', 'Admin')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MATRIX.map((item) => (
                      <tr key={item.path}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{item.name === 'Hospital' ? 'Hospital settings' : item.name}</td>
                        {HOSPITAL_ROLES.map((role) => (
                          <td key={role} className="px-2 py-2.5 text-center">
                            {item.roles.includes(role) ? (
                              <Check className="mx-auto h-4 w-4 text-cyan-600" aria-label="Yes" />
                            ) : (
                              <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="No" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                Attribute-based rules (ABAC)
              </h3>
              <div className="mt-4 space-y-3">
                {ABAC_RULES.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="flex gap-4 rounded-md border border-slate-200 p-4">
                    <span className="h-fit rounded-md bg-cyan-50 p-2 text-cyan-600">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-sm text-slate-600">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="scroll-mt-16 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <Eyebrow>Security</Eyebrow>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Patient data stays where it belongs</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="rounded-md border border-slate-200 bg-white p-6">
                <Icon className="h-6 w-6 text-cyan-600" aria-hidden="true" />
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get started */}
      <section id="contact" className="scroll-mt-16 bg-cyan-600 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="text-white">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Bring CareEase to your hospital</h2>
            <p className="mt-3 text-lg text-cyan-50">We set up every hospital ourselves, so you are running in days, not months.</p>
            <ol className="mt-10 space-y-6">
              {STEPS.map(({ title, copy }, index) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white font-bold text-cyan-700">{index + 1}</span>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="text-cyan-50">{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <ContactForm />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1.2fr]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <Logo className="h-10 w-10" />
              <span className="text-lg font-bold text-slate-900">CareEase</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-slate-600">
              Hospital management with role and attribute based access, and an AI receptionist that books by phone.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Contact</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>
                <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-cyan-600" aria-hidden="true" />
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2.5 break-all">
                  <Mail className="h-4 w-4 shrink-0 text-cyan-600" aria-hidden="true" />
                  {CONTACT.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-cyan-600" aria-hidden="true" />
                {CONTACT.city}
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <p className="mx-auto max-w-7xl px-4 py-5 text-sm text-slate-500 sm:px-6">
            © {new Date().getFullYear()} CareEase. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
