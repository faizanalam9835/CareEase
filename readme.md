<div align="center">

<img src="Frontend/public/favicon.svg" width="72" alt="CareEase logo" />

# CareEase

**Hospital management as a service, with an AI receptionist that books appointments over the phone.**

One platform, many hospitals, each one's data kept completely apart. Patients,
appointments, prescriptions, pharmacy, billing, wards, vitals and reports, with
role- and attribute-based access control enforced on the server.

### [→ Open the live demo](https://careease-app.vercel.app)

`https://careease-app.vercel.app` · API at `https://careease-api.vercel.app`

</div>

---

## Contents

- [What CareEase is](#what-careease-is)
- [Try it in 10 seconds](#try-it-in-10-seconds)
- [Highlights](#highlights)
- [All modules](#all-modules)
- [Who can do what](#who-can-do-what)
- [E-mails](#e-mails)
- [What is not built yet](#what-is-not-built-yet)
- [Tech stack](#tech-stack)
- [Running it locally](#running-it-locally)
- [Tests](#tests)
- [Architecture notes](#architecture-notes)
- [Voice receptionist setup](#voice-receptionist-setup)
- [Deployment](#deployment)
- [Environment](#environment)
- [Project structure](#project-structure)
- [Contact](#contact)

---

## What CareEase is

CareEase is a **multi-tenant SaaS** for small and mid-sized hospitals and
clinics. A hospital installs nothing: the CareEase team onboards it from the
platform admin, its administrator receives a login by e-mail, and the staff work
from the browser.

- **For hospitals:** one place for the front desk, doctors, nurses, pharmacy and
  accounts, plus a phone receptionist that never misses a call.
- **For the platform team:** onboard hospitals, suspend or re-activate them, and
  check that e-mail is working, without ever seeing patient data.

---

## Try it in 10 seconds

The sign-in page lists every demo account and fills the form on one click. **No
Hospital ID is needed**: the system works out the hospital from the account.

| Role | E-mail | Password | What they see |
|---|---|---|---|
| **Administrator** | `admin@careease.health` | `Admin@123` | Everything in the hospital: staff, all departments, wards, billing, reports, call logs |
| **Doctor** (Cardiology) | `doctor@careease.health` | `Doctor@123` | Cardiology patients only, own diary, writes prescriptions |
| **Doctor** (General) | `m.deshpande@careease.health` | `Doctor@123` | General patients, including voice bookings for General |
| **Nurse** | `nurse@careease.health` | `Nurse@123` | Cardiology ward: vitals, admissions, appointment status |
| **Receptionist** | `reception@careease.health` | `Reception@123` | Registration, appointments, invoices, payments, call logs |
| **Pharmacist** | `pharmacy@careease.health` | `Pharmacy@123` | Stock, expiry, dispensing queue |
| **Super Admin** (platform) | `superadmin@careease.health` | `Super@123` | Every hospital on the platform, onboarding and suspension. No patient data |

> **Sign in as two different roles.** The sidebar, the dashboard figures and the
> API responses all change. A doctor's patient list is filtered by the server,
> not just hidden in the menu.

---

## Highlights

### 📞 AI voice receptionist
Patients call the hospital and book on their own, in Hindi, English or Hinglish.

- Reads the hospital's **real** doctor list and fees; never invents a name, fee or time.
- Offers **only slots that are actually free** in that doctor's diary, so double bookings are impossible.
- Takes the patient's name, **date of birth**, gender and mobile (read back digit by digit), and an optional e-mail spelled letter by letter.
- Registers new callers by phone number and reuses the record for returning ones. A caller can only fill in missing details, never overwrite existing ones.
- Sends confirmation e-mails to the patient and the doctor.
- Stops and points to **108** if the caller describes an emergency.

### 🎧 Call logs, always in English
- Every call is kept with its **recording, transcript and summary**, linked to the appointment it created.
- Transcripts of Hindi (or any Indian-language) calls are **translated to English**, with a *Show original* toggle. Translations are cached, so a call is translated once.
- Recordings stream through the API, so no third-party key ever reaches the browser.

### 🔐 RBAC + ABAC
- **RBAC** decides which modules a role can open.
- **ABAC** decides which records it can touch:
  - **Hospital:** every query is scoped to the hospital of the signed-in account, taken from the server, never from the browser.
  - **Department:** doctors and nurses only reach patients of their own department.
  - **Account status:** an inactive or locked user is refused on their very next request.
  - **Hospital status:** suspending a hospital locks out all of its staff at once.

### 🏥 Platform admin
- Hospitals do not sign themselves up. A **Super Admin** onboards each one: the workspace goes live immediately and the hospital's administrator gets a temporary password by e-mail (also shown on screen, in case the mail is slow).
- One table of every hospital with staff, patient and appointment counts.
- **Suspend / Activate** in one click, with no data deleted.
- **Test e-mail** button to confirm the mail account is delivering.
- The Super Admin cannot open any hospital's patients, bills or records.

### 🔑 Login without a Hospital ID
Staff type only their e-mail and password. If the same e-mail and password exist
at two hospitals, the login asks which one to open, and only after the password
has matched.

### 💊 Prescription to paid invoice
The doctor writes a prescription, it lands in the pharmacy queue, dispensing
takes the stock out and raises the bill from the same visit. No retyping.

### 🌐 Landing page with a working enquiry form
The public site describes only what the product really does, shows the live
RBAC matrix built from the app's own menu, and its *Request a demo* form e-mails
the CareEase team directly (with a honeypot and a rate limit against spam).

---

## All modules

| Module | What it does |
|---|---|
| **Dashboard** | Today's appointments, bed occupancy, collections, revenue chart, alert feed and audit trail |
| **Patients** | Per-hospital patient IDs, blood group, allergies, emergency contact, OPD / IPD, full history of visits, prescriptions and bills, CSV export |
| **Appointments** | Booking against the doctor's working hours with a live slot picker; status from *Scheduled* to *Completed*, changed from the edit form; mandatory cancellation reason; separate payment column |
| **Call logs** | Recordings, English transcripts and summaries of every voice call, filtered by date |
| **Prescriptions** | Multi-medicine prescriptions from the pharmacy catalogue with dosage, frequency, duration and follow-up; allergy warning; printable copy |
| **Pharmacy** | Stock with batch, expiry and reorder level; dispensing decrements stock and raises the invoice |
| **Billing** | Itemised invoices (consultation, medicine, test, procedure, room), server-computed totals, a payment ledger with part payments, Cash / Card / UPI / Net Banking / Insurance |
| **Wards and beds** | General, Semi-Private, Private, ICU, ICCU, NICU, Emergency and Maternity; live bed board; admit, transfer, discharge; room charges billed on discharge |
| **Vitals** | Ten measurements per reading judged against reference ranges and flagged; trend charts and a nurse worklist |
| **Reports** | Revenue invoiced and collected, payment mix, department intake, appointment status, admissions and stock value for any range, compared with the previous period; CSV export |
| **Staff** | Doctors with fee, working days and hours; nurses, reception and pharmacy; welcome and password-reset e-mails |
| **Search and alerts** | One search across patients, staff and invoices; alerts for low and expiring stock, overdue invoices and prescriptions waiting |
| **Platform** | Super Admin onboarding, suspension and mail check |

Every button shows its name on hover, and the UI uses one brand colour on a light
background throughout.

---

## Who can do what

| | Admin | Doctor | Nurse | Receptionist | Pharmacist |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ● | ● | ● | ● | ● |
| Patients | all | own dept. | own dept. | all | — |
| Appointments | all | own diary | own dept., status only | all | — |
| Call logs | ● | — | — | ● | — |
| Wards and beds | all | ● | ● | ● | — |
| Vitals | all | own dept. | own dept. | — | — |
| Prescriptions | read, edit | writes own | own dept. | — | dispenses |
| Pharmacy | ● | read | — | — | ● |
| Billing | ● | read | — | ● | read |
| Reports | ● | — | — | ● | — |
| Staff and settings | ● | — | — | — | — |

The **Super Admin** sits outside every hospital and only reaches `/api/platform`
and its own profile. All of this is enforced in the API; the UI only mirrors it.

---

## E-mails

All mail goes through one mailer, awaited inside serverless functions so it is
not lost when the response ends. Every typed-in value is HTML-escaped.

| E-mail | Sent to | When |
|---|---|---|
| Workspace activated | Hospital administrator | A hospital is onboarded |
| Staff welcome | New staff member | An account is created |
| Password reset | Staff member | An administrator resets a password |
| Appointment confirmed | Patient | Any booking, including by phone |
| New appointment | Doctor | Any booking, including by phone |
| Onboarding request | CareEase team | The website form is submitted |
| E-mail check | CareEase team | The Super Admin presses *Test e-mail* |

Without SMTP credentials the app logs mail to the console instead and keeps working.

---

## What is not built yet

Kept honest on purpose:

- **Online payments.** Razorpay checkout and payment links are planned; payments are recorded by staff today.
- **A real phone number** for the voice receptionist. It runs on the voice platform's test calls until a number is connected.
- **SMS and WhatsApp** notifications; only e-mail today.
- **Patient portal or mobile app.**
- **Lab and radiology results.** Tests can be prescribed, not reported.
- **Insurance claims.** Insurance is a payment method only.
- **ABDM / ABHA, HL7 or FHIR** integration.

---

## Tech stack

**Backend:** Node.js · TypeScript · Express 5 · MongoDB · Mongoose · Zod · JWT · bcrypt · Nodemailer

**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · Recharts · Axios · React Hook Form · Lucide icons

**Voice and translation:** Sarvam (Samvaad agent, analytics and translate APIs)

**Hosting:** Vercel (both apps) · MongoDB Atlas · Gmail SMTP

---

## Running it locally

You need **Node 18+** and a **MongoDB** you can reach.

```bash
# 1. API
cd Backend
npm install
cp .env.example .env          # set MONGO_URI if it is not on localhost
npm run seed:reset            # demo hospital, all its data and the Super Admin
npm run dev                   # http://localhost:5000

# 2. App, in a second terminal
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

Starts a throw-away in-memory database, seeds it and runs the API against it.

</details>

---

## Tests

```bash
cd Backend && npm test
```

**211 end-to-end checks** against the real Express app and a real MongoDB, not
mocks: authentication, login without a Hospital ID and the choose-a-hospital
case, RBAC, ABAC, tenant isolation, the platform admin (onboarding, suspension,
instant lock-out, mail check), the voice receptionist (doctors, free times,
lenient booking input, double-booking, cross-hospital keys), call-log
permissions, appointment conflicts, the admission lifecycle, vitals flagging,
dispensing and stock, invoice arithmetic, reports and error handling.

The suite seeds its own `*_test` database and drops it afterwards, and it sends
mail to the console, never to real inboxes.

---

## Architecture notes

**Multi-tenancy.** Every record carries a `tenantId`, read from the signed-in
account on the server, never from a client header. The platform team lives in a
separate tenant (`TPLATFORM`) and is blocked from every hospital route.

**Identity.** The token carries only `userId` and `tenantId`. Roles, department,
account status and the hospital's status are re-read on every request, so a
permission change, deactivation or suspension takes effect immediately.

**Login.** E-mails are unique per hospital, not globally. Login matches the
password against every account with that e-mail and only asks which hospital to
open when more than one matches.

**Voice tools.** The voice agent calls `/api/voice/*` with a per-hospital key.
Responses are short text lines the agent can read aloud. Inputs are lenient
(blank fields, numeric phones, spoken blood groups) because voice platforms send
them that way.

**Call logs** are read live from the voice platform per hospital; nothing is
copied except cached English translations. Calls made before `CALL_LOGS_FROM`
are hidden.

**Business IDs.** `TDEMO001-P-0007` style IDs come from an atomic counter
collection, so concurrent writes cannot collide.

**Transactions.** Dispensing and admission use a MongoDB transaction on a
replica set and fall back gracefully on a standalone server.

---

## Voice receptionist setup

1. Create an agent on the voice platform and paste `voice-agent/instructions.txt` as its instructions.
2. Add three tools, all **POST** with inputs in the body and header `x-voice-key: <hospital key>`:
   - `get_doctors` → `/api/voice/doctors` (`department`, optional)
   - `get_free_times` → `/api/voice/availability` (`doctorId`, `date`)
   - `book_appointment` → `/api/voice/book` (`firstName`, `lastName`, `dateOfBirth`, `age`, `gender`, `phone`, `doctorId`, `date`, `time`, `reason`, `email`)
3. Map the hospital's key in `VOICE_KEYS` and its agent in `SARVAM_APPS` so its calls appear in Call Logs.

---

## Deployment

Both apps run on Vercel. The API is a serverless function that caches its
Mongoose connection on `globalThis`, so warm invocations reuse the socket.

```bash
# API
cd Backend
npx vercel link
npx vercel env add MONGO_URI production --sensitive
npx vercel env add JWT_SECRET production --sensitive
npx vercel deploy --prod

# App
cd Frontend
npx vercel link
npx vercel env add VITE_API_URL production    # https://<your-api>.vercel.app/api
npx vercel deploy --prod
```

- **Atlas Network Access** needs `0.0.0.0/0`, because Vercel's IPs are dynamic.
- **`VITE_API_URL` is baked in at build time**; changing it means redeploying the frontend.

---

## Environment

**`Backend/.env`**

| Variable | Purpose |
|---|---|
| `PORT` | API port, default `5000` |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret; the app refuses to boot in production with the default |
| `CLIENT_URL` | Frontend URL, used in e-mail links |
| `CORS_ORIGINS` | Comma-separated allow-list; `*` for development |
| `DEMO_MODE` | Lists demo accounts on the login page and creates the demo Super Admin. **Turn off for real data** |
| `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM_NAME` | Gmail SMTP; leave blank for console mode |
| `CONTACT_EMAIL` | Where website onboarding requests go; defaults to `EMAIL_USER` |
| `VOICE_KEYS` | `TENANT=key,...`: the key each hospital's voice agent sends |
| `SARVAM_API_KEY` | Voice platform analytics key, for call logs |
| `SARVAM_APPS` | `TENANT=org/workspace/app,...`: each hospital's voice agent |
| `SARVAM_TRANSLATE_KEY` | Platform key used to translate transcripts to English |
| `CALL_LOGS_FROM` | ISO date-time; calls before it are hidden (e.g. setup test calls) |

**`Frontend/.env`**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:5000/api` |

---

## Project structure

```
Backend/                      Express API (TypeScript)
  api/index.ts                Vercel serverless entry (cached connection)
  config/                     env, database, shared enumerations
  controllers/                one module per resource, incl. platform, voice, calls
  middleware/                 auth, tenant context, ABAC, validation, errors
  models/                     14 Mongoose schemas
  routes/                     17 route tables
  seed/                       demo data, demo accounts, demo Super Admin
  tests/                      end-to-end API suite
  utils/                      tokens, mail and templates, translation, id
                              sequences, pagination, audit log, vital ranges
  Server.ts                   app and long-running entry point

Frontend/                     React single-page app (TypeScript)
  public/favicon.svg          the CE logo, used everywhere
  src/components/ui/          shared UI kit: inputs, modals, tables, states
  src/components/layout/      shell, sidebar, header, route guard
  src/context/                authentication
  src/lib/                    formatting, navigation and role definitions
  src/Pages/                  one folder per feature, incl. platform and calls
  src/services/               API client and per-resource modules

voice-agent/                  instructions for the voice receptionist
```

---

## A note on the demo deployment

The live site runs with `DEMO_MODE=true`, which publishes the demo credentials
on the sign-in page, including the Super Admin's. That is deliberate, so anyone
can look around, but it makes the deployment a **public, writable
application**: treat anything in it as disposable, change the Super Admin
password, and set `DEMO_MODE=false` before real data goes anywhere near it.

---

## Contact

Ranchi, Jharkhand, India

📞 +91 98356 31769 · ✉️ faizansaikh786786f@gmail.com
