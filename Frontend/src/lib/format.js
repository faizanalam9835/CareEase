/** Shared formatting and small mappings used across the app. */

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const currencyFormatterPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const formatCurrency = (value, precise = false) =>
  (precise ? currencyFormatterPrecise : currencyFormatter).format(Number(value) || 0);

export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date)}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
};

/** "3 minutes ago" style label for activity feeds. */
export const formatRelative = (value) => {
  if (!value) return '';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  return formatDate(value);
};

/** Turns "09:00" into "9:00 am" for display, leaving anything odd untouched. */
export const formatTime = (value) => {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return value || '—';
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'pm' : 'am';
  const display = hours % 12 || 12;
  return `${display}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
};

/** YYYY-MM-DD, the format `<input type="date">` expects. */
export const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().split('T')[0];
};

export const todayInput = () => toDateInput(new Date());

/** `pluralise(1, 'day')` -> "1 day"; `pluralise(3, 'day')` -> "3 days". */
export const pluralise = (count, singular, plural) =>
  `${formatNumber(count)} ${count === 1 ? singular : plural || `${singular}s`}`;

export const titleCase = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

/* ------------------------------ status tones ----------------------------- */

export const APPOINTMENT_TONE = {
  Scheduled: 'blue',
  Confirmed: 'cyan',
  'In Progress': 'amber',
  Completed: 'green',
  Cancelled: 'red',
  'No Show': 'slate'
};

export const PAYMENT_TONE = {
  Paid: 'green',
  Pending: 'amber',
  Partially_Paid: 'blue',
  Cancelled: 'slate',
  Refunded: 'purple'
};

export const PHARMACY_TONE = {
  Pending: 'amber',
  Dispensed: 'green',
  Partially_Dispensed: 'blue',
  Cancelled: 'slate'
};

export const PATIENT_TONE = {
  Active: 'green',
  Inactive: 'slate',
  Discharged: 'blue',
  Deceased: 'slate'
};

export const ROLE_TONE = {
  HOSPITAL_ADMIN: 'purple',
  DOCTOR: 'cyan',
  NURSE: 'green',
  PHARMACIST: 'amber',
  RECEPTIONIST: 'blue'
};

export const STOCK_TONE = {
  Active: 'green',
  Out_of_Stock: 'red',
  Discontinued: 'slate'
};
