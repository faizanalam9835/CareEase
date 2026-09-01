import React, { forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Inbox, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

/* --------------------------------- Button -------------------------------- */

const BUTTON_VARIANTS = {
  primary: 'bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-500 shadow-sm',
  secondary: 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 focus-visible:ring-cyan-300',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-cyan-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm'
};

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2'
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

/* --------------------------------- Input --------------------------------- */

const fieldClasses = (hasError, hasIcon) =>
  `w-full rounded-lg border bg-white py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors
   focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500
   ${hasIcon ? 'pl-10 pr-3' : 'px-3'}
   ${hasError
     ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
     : 'border-slate-300 focus:border-cyan-500 focus:ring-cyan-200'}`;

export const Field = ({ label, error, hint, required, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
    )}
    {children}
    {error && (
      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {typeof error === 'string' ? error : error.message}
      </p>
    )}
    {!error && hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const Input = forwardRef(function Input(
  { label, error, hint, required, icon: Icon, rightSlot, className = '', ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}
        <input ref={ref} className={fieldClasses(Boolean(error), Boolean(Icon))} {...props} />
        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, options = [], placeholder, className = '', children, ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      <select ref={ref} className={`${fieldClasses(Boolean(error), false)} pr-8`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value;
          const text = typeof option === 'string' ? option : option.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
        {children}
      </select>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, rows = 3, className = '', ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      <textarea ref={ref} rows={rows} className={fieldClasses(Boolean(error), false)} {...props} />
    </Field>
  );
});

/* ---------------------------------- Card --------------------------------- */

export const Card = ({ children, className = '', ...props }) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, icon: Icon, action, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 border-b border-slate-100 p-5 ${className}`}>
    <div className="flex items-start gap-3">
      {Icon && (
        <span className="mt-0.5 rounded-lg bg-cyan-50 p-2 text-cyan-600">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

/* --------------------------------- Badge --------------------------------- */

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200'
};

export const Badge = ({ children, tone = 'slate', icon: Icon, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset
      ${BADGE_TONES[tone] || BADGE_TONES.slate} ${className}`}
  >
    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
    {children}
  </span>
);

/* --------------------------------- Modal --------------------------------- */

const MODAL_WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl'
};

export const Modal = ({ open, onClose, title, subtitle, icon: Icon, size = 'md', children, footer }) => {
  // Escape closes, and the page behind does not scroll while the dialog is up.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative my-8 w-full ${MODAL_WIDTHS[size]} rounded-xl bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 rounded-lg bg-cyan-50 p-2 text-cyan-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading = false
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    icon={AlertCircle}
    size="sm"
    footer={
      <>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm leading-relaxed text-slate-600">{message}</p>
  </Modal>
);

/* -------------------------------- Feedback ------------------------------- */

export const Spinner = ({ className = 'h-6 w-6' }) => (
  <Loader2 className={`animate-spin text-cyan-600 ${className}`} aria-hidden="true" />
);

export const LoadingState = ({ label = 'Loading', className = 'py-16' }) => (
  <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
    <Spinner className="h-8 w-8" />
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

export const EmptyState = ({ icon: Icon = Inbox, title, message, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
    <span className="rounded-full bg-slate-100 p-3 text-slate-400">
      <Icon className="h-7 w-7" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
    {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    <span className="rounded-full bg-red-50 p-3 text-red-500">
      <AlertCircle className="h-7 w-7" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-sm font-semibold text-slate-900">Could not load this</h3>
    <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
    {onRetry && (
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

/* ------------------------------- Page header ----------------------------- */

export const PageHeader = ({ title, subtitle, icon: Icon, actions }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      {Icon && (
        <span className="rounded-xl bg-cyan-600 p-2.5 text-white shadow-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* ------------------------------- Pagination ------------------------------ */

export const Pagination = ({ page, totalPages, total, onChange, label = 'records' }) => {
  if (!totalPages || totalPages <= 1) {
    return total ? (
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        {total} {label}
      </p>
    ) : null;
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages}
        {total ? ` — ${total} ${label}` : ''}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          icon={ChevronLeft}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

/* --------------------------------- Table --------------------------------- */

export const Table = ({ columns, children, className = '' }) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50/80">
          {columns.map((column) => (
            <th
              key={column.key || column.label}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                column.align === 'right' ? 'text-right' : ''
              } ${column.className || ''}`}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const Td = ({ children, className = '', ...props }) => (
  <td className={`px-5 py-3.5 align-middle text-slate-700 ${className}`} {...props}>
    {children}
  </td>
);

/* --------------------------------- Avatar -------------------------------- */

const AVATAR_TONES = [
  'bg-cyan-100 text-cyan-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-rose-100 text-rose-700'
];

export const Avatar = ({ name = '', size = 'md', className = '' }) => {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  // Deterministic colour per name, so the same person keeps the same tint.
  const tone =
    AVATAR_TONES[
      [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length
    ];

  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${sizes[size]} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
};
