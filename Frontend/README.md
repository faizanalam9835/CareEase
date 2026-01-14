# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.




# 🏥 Hospital Management System (HMS)

A **multi-tenant, cloud-enabled Hospital Management System** built to digitize hospital operations with **secure tenant isolation, role-based access control, and scalable architecture**.

This platform enables hospitals to **self-register, onboard quickly**, and manage the **complete patient lifecycle** without any upfront infrastructure cost.

---

## 🚀 Key Features

- 🌐 Multi-Tenant SaaS Architecture  
- 🔐 OAuth2 + JWT Authentication  
- 👥 Role-Based Access Control (RBAC)  
- 🎯 Attribute-Based Access Control (ABAC)  
- 🏥 Patient Registration (OPD & IPD)  
- 💊 Prescription Management  
- 🧭 Role-Based Dynamic UI Menus  
- ⚡ Redis Caching & Session Optimization  

---

## 🧠 Product Vision

To build a **secure, scalable, and flexible Hospital SaaS platform** that allows hospitals of any size to digitize their workflows while ensuring **strict tenant-level data privacy**.

---

## 👥 Target Users

- **Hospital Admin** – Hospital onboarding, configuration, user management  
- **Doctors** – Patient management, prescriptions, diagnostics  
- **Nurses** – Patient care and vital monitoring  
- **Pharmacists** – Prescription fulfillment  
- **Receptionists** – Appointments and patient registration  

---

## 🏢 Multi-Tenancy & Hospital Onboarding

- Hospital self-registration without manual intervention  
- Auto-generated **Tenant ID (UUID-based)**  
- Schema-per-tenant database isolation  
- Email verification & activation workflow  
- Tenant lifecycle: `PENDING → VERIFIED → ACTIVE → SUSPENDED → INACTIVE`  

---

## 🔐 Authentication & Authorization

- OAuth2 with JWT (Access & Refresh Tokens)  
- Token contains userId, tenantId, roles, permissions  
- Hierarchical Role-Based Access Control (RBAC)  
- Fine-grained Attribute-Based Access Control (ABAC)  
- Permission format: `RESOURCE:ACTION`  

---

## 👤 User Management

- Admin-driven user creation  
- Auto-generated usernames  
- Strong password policy with history  
- Forgot / Reset / Force password change  
- User states: `ACTIVE`, `INACTIVE`, `LOCKED`  

---

## 🧑‍⚕️ Patient Management

- OPD & IPD patient registration  
- Unique patient ID per tenant  
- Advanced search & filters  
- Photo upload support  
- Export patient data (CSV / PDF)  

---

## 💊 Prescription Management

- Multiple medicines per prescription  
- Dosage, frequency & instructions  
- Prescription templates  
- Tenant-specific prescription IDs  

---

## 🧭 Dynamic Role-Based UI

- Menu rendering based on permissions  
- Frontend & backend permission validation  
- Hierarchical menu structure  

---

## 🏗️ System Architecture

- **Architecture Type:** Modular Monolith  
- **Tenant Isolation:** Middleware-based context adapter  
- **Caching:** Redis (namespaced per tenant)  
- **Security:** Centralized authentication & authorization  

---

## 🧩 Tech Stack

### Backend (Node.js Stack)
- Node.js (v20+)  
- Express.js  
- MongoDB (Schema-per-Tenant)  
- Mongoose ORM  
- Redis  
- JWT + Passport.js  
- Nodemailer  
- Winston / Morgan  
- Docker  

### Frontend (React Stack)
- React.js (v18+)  
- React Router  
- Redux Toolkit / Context API  
- Material UI (MUI)  
- Axios  
- Vite / CRA  

---

## 📁 Project Structure


