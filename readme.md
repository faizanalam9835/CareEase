<div align="center">

# CareEase

**A multi-tenant hospital management system.**

Registration through to discharge — patients, appointments, prescriptions,
pharmacy stock, ward beds, nursing observations, billing and reporting — with
role- and department-level access control enforced on the server.

### [→ Open the live demo](https://careease-app.vercel.app)

`https://careease-app.vercel.app` · API at `https://careease-api.vercel.app`

</div>

---

## Try it in 10 seconds

The sign-in page lists five working accounts and fills the form on one click —
nothing to type, nothing to sign up for.

| Role | E-mail | Password | What they can see |
|---|---|---|---|
| **Administrator** | `admin@careease.health` | `Admin@123` | Everything — staff, all departments, wards, billing, reports |
| **Doctor** | `doctor@careease.health` | `Doctor@123` | Cardiology patients only, own diary, writes prescriptions |
| **Nurse** | `nurse@careease.health` | `Nurse@123` | Cardiology ward — records vitals, admits and moves patients |
| **Receptionist** | `reception@careease.health` | `Reception@123` | Registration, appointments, invoices, payments |
| **Pharmacist** | `pharmacy@careease.health` | `Pharmacy@123` | Stock, expiry, dispensing queue |

Hospital ID for all of them: **`TDEMO001`**

> **Signing in as two different roles is the fastest way to understand this
> project.** The sidebar, the dashboard figures and the API responses all
> change. A doctor's patient list is genuinely filtered server-side — it is not
> just a hidden menu item.

The demo carries 12 staff, 18 patients, 7 wards across 60 beds, 59 appointments
spanning five months, 10 prescriptions, 41 invoices, 6 current inpatients and 36
vitals readings. Two medicines are deliberately low or out of stock and one
inpatient is deliberately unwell, so the alerting and the clinical flags have
something real to show.

---

## What is interesting here

**Access control is real, not cosmetic.** Every list endpoint builds its query on
a tenant- and department-scoped filter, and single records are re-checked on
read. A cardiologist requesting an orthopaedic patient gets a 403 from the API,
not a blank screen from the router.

**The database is the source of truth for money and beds.** Invoice totals are
recomputed from line items on every save, so a client cannot post its own
`amount`. Bed occupancy is owned by the admission workflow — a bed becomes
occupied by admitting someone, never by an update call.

**Business rules are enforced where they matter.** A doctor cannot be
double-booked, a prescription cannot be dispensed twice, a payment cannot exceed
the invoice balance, and the last administrator cannot delete themselves.

**166 end-to-end tests** run against the real Express app and a real MongoDB —
not mocks.

---

## Features

### Patients
OPD and IPD registration with auto-generated per-tenant IDs, a full clinical file
combining appointment, prescription and invoice history, allergy flags,
discharge, CSV export, and search across name, ID and phone.

### Appointments
Booking against a doctor's real availability, with a slot picker that greys out
what is already taken. Overlapping bookings are rejected, as are bookings that
pair a patient with a doctor from another department. Status workflow, mandatory
cancellation reasons, and one-click consultation invoicing.

### Wards and beds
Wards with per-bed nightly rates and a live bed board showing who is in which
bed. Admit, transfer between beds, and discharge. Transfers are recorded against
the stay, so history survives a bed being reassigned. The room-charge invoice is
raised automatically on discharge from the nights actually stayed.

### Vitals
Ten measurements per reading — temperature, pulse, blood pressure, respiratory
rate, SpO2, blood sugar, weight, height, pain score — each judged against
age-appropriate reference ranges and flagged normal, out of range, or critical.
Trend charts per patient, plus a nurse worklist of inpatients whose latest
observations were abnormal or whose readings are overdue.

### Prescriptions
Multi-medicine prescriptions drawn from the pharmacy's own catalogue, so what is
prescribed can usually be dispensed without a name mismatch. Warns when a
prescribed drug appears on the patient's allergy list. Printable copy.

### Pharmacy
Inventory with per-item reorder levels, expiry tracking, and stock adjustment by
delta or stock-take. Dispensing decrements stock and raises the invoice in one
step, inside a transaction where the deployment supports one.

### Billing
Invoices with server-computed totals and a payment *ledger* rather than a single
mutable figure, so part payments and their history are both first-class.
Printable invoices, revenue analytics, and outstanding-balance reporting.

### Reports
Revenue, patient intake, doctor workload, payment mix, admissions and pharmacy
movement over any date range — compared against the preceding window of the same
length, not an arbitrary "last month". CSV export is built from the same numbers
rendered on screen, so the two cannot disagree.

### Dashboard
Live figures with month-on-month movement, appointment and revenue charts, an
alert feed for low stock, expiring medicine and overdue invoices, and an audit
trail of who did what.

### Platform
Hospital self-registration with e-mail verification, JWT auth, staff management
with password reset, global search across patients, staff and invoices, and an
activity log.

---

## Who can do what

| | Admin | Doctor | Nurse | Receptionist | Pharmacist |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ● | ● | ● | ● | ● |
| Patients | all | own dept. | own dept. | all | — |
| Appointments | all | own diary | own dept. | all | — |
| Wards and beds | all | ● | ● | ● | — |
| Vitals | all | own dept. | own dept. | — | — |
| Prescriptions | all | writes own | own dept. | — | dispenses |
| Pharmacy | ● | read | — | — | ● |
| Billing | ● | read | — | ● | read |
| Reports | ● | — | — | ● | — |
| Staff and settings | ● | — | — | — | — |

Doctors and nurses are confined to their own department. Administrators,
receptionists and pharmacists work hospital-wide. This is enforced in the API —
the UI only mirrors it.

---

## Tech stack

**Backend** — Node.js · Express 5 · MongoDB · Mongoose 9 · JWT · bcrypt ·
Nodemailer · Zod

**Frontend** — React 19 · Vite 7 · Tailwind CSS 4 · React Router 7 · Recharts ·
Axios · React Hook Form · Lucide icons

**Hosting** — Vercel (both apps) · MongoDB Atlas

---

## Running it locally

You need **Node 18+** and a **MongoDB** you can reach.

```bash
# 1. API
cd Backend
npm install
cp .env.example .env          # set MONGO_URI if it is not on localhost
npm run seed:reset            # loads the demo hospital and all its data
npm start                     # http://localhost:5000

# 2. App - in a second terminal
cd Frontend
npm install
cp .env.example .env          # VITE_API_URL, defaults to localhost:5000/api
npm run dev                   # http://localhost:5175
```

Open **http://localhost:5175/login** and pick any demo account.

<details>
<summary><b>No MongoDB installed?</b></summary>

<br>

```bash
cd Backend
npm install --save-dev mongodb-memory-server   # one time
npm run demo
```

Starts a throw-away in-memory database, seeds it, and runs the API against it.
Data lives only as long as the process.

</details>

---

## Tests

```bash
cd Backend && npm test
```

**166 end-to-end checks** against the real Express app: authentication, RBAC,
ABAC, tenant isolation, appointment conflicts, bed occupancy and the admission
lifecycle, vitals validation and flagging, dispensing and stock movement,
invoice arithmetic, reporting, and error handling.

It seeds its own `*_test` database and drops it afterwards, so your development
data is never touched.

Many of the tests are written as regressions against bugs this codebase actually
had — for example, that login works *without* a tenant header, that a failed
login returns no user record, and that invoice totals ignore a client-supplied
`amount`.

---

## Project structure

```
Backend/                      Express API
  api/index.js                Vercel serverless entry (cached connection)
  config/                     env, database, shared enumerations
  controllers/                request handling, one module per resource
  middleware/                 auth, tenant context, ABAC, validation, errors
  models/                     13 Mongoose schemas
  routes/                     86 endpoints across 14 route tables
  seed/                       demo data and the shared demo-account list
  tests/                      end-to-end API suite
  utils/                      tokens, mail, id sequences, pagination,
                              audit log, transactions, vital reference ranges
  Server.js                   long-running entry point (npm start)

Frontend/                     React single-page app
  src/components/ui/          shared UI kit - inputs, modals, tables, states
  src/components/layout/      shell, sidebar, header, route guard
  src/context/                authentication
  src/hooks/                  server metadata, debounce
  src/lib/                    formatting, navigation definition
  src/Pages/                  one folder per feature
  src/services/               API client and per-resource modules
```

---

## Architecture notes

**Multi-tenancy.** Every record carries a `tenantId`, and it is read from the
signed JWT — never from a client header, so it cannot be forged. A second
hospital signing in sees only its own data, including in aggregate figures.

**Access control.** Role-based (what the role may do) plus attribute-based
(which department's records). Applied in the query filter for lists and
re-checked on single records.

**Identity.** The access token carries only `userId` and `tenantId`. Roles,
department and account status are read from the database on every request, so a
permission change or a deactivation takes effect immediately rather than when
the token expires.

**Business IDs.** `TDEMO001-P-0007` style identifiers come from an atomic
counter collection, not a document count, so concurrent writes cannot collide.

**Transactions.** Dispensing and admission use a MongoDB transaction where the
deployment is a replica set, and fall back to unsessioned writes on a standalone
`mongod` — detected once and cached, rather than failing at the first write.

**E-mail is optional.** With no SMTP credentials configured the app logs messages
to the console and carries on, so registration and staff creation work on a
machine with no mail account.

---

## Deployment

Both apps run on Vercel. The API runs as a serverless function that caches its
Mongoose connection on `globalThis`, so warm invocations reuse the socket instead
of exhausting the cluster's connection limit.

```bash
# API
cd Backend
npx vercel link
npx vercel env add MONGO_URI production     # paste your Atlas URI
npx vercel env add JWT_SECRET production    # a long random string
npx vercel deploy --prod

# App
cd Frontend
npx vercel link
npx vercel env add VITE_API_URL production  # https://<your-api>.vercel.app/api
npx vercel deploy --prod
```

Two things that catch people out:

- **Atlas Network Access** needs `0.0.0.0/0` allowlisted, because Vercel's
  function IPs are dynamic.
- **`VITE_API_URL` is baked in at build time.** Changing it means redeploying the
  frontend, not just updating the variable.

---

## Environment

**`Backend/.env`** — see `.env.example`

| Variable | Purpose |
|---|---|
| `PORT` | API port, default `5000` |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret — the app refuses to boot in production with the default |
| `CLIENT_URL` | Frontend URL, used in verification e-mail links |
| `CORS_ORIGINS` | Comma-separated allow-list; `*` for development |
| `DEMO_MODE` | Serves the demo accounts on the login page — **turn off in production** |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP credentials; leave blank for console mode |

**`Frontend/.env`**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:5000/api` |

---

## Scripts

**Backend**

| Command | Does |
|---|---|
| `npm start` | Run the API |
| `npm run dev` | Run with file watching |
| `npm run seed` | Load demo data, keeping what is already there |
| `npm run seed:reset` | Wipe the demo tenant and reload it |
| `npm run demo` | In-memory database, seeded, zero setup |
| `npm test` | End-to-end API suite |

**Frontend**

| Command | Does |
|---|---|
| `npm run dev` | Dev server on port 5175 |
| `npm run build` | Production build |
| `npm run preview` | Serve the build locally |
| `npm run lint` | ESLint |

---

## A note on the demo deployment

The live site runs with `DEMO_MODE=true`, which publishes those five sets of
credentials on the sign-in page. That is deliberate — it is a demo, and anyone
should be able to look around. It does mean the deployment is a **public,
writable application**: treat anything in it as disposable, and set
`DEMO_MODE=false` before putting real data anywhere near it.
