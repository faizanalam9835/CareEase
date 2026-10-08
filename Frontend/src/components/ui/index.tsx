import { forwardRef, useEffect } from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TdHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Inbox, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Colour families shared by Badge and the status tone maps in lib/format. */
export type Tone = 'slate' | 'cyan' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

/** A string message, or a react-hook-form style `{ message }` error. */
export type FieldErrorLike = string | { message?: string } | null | false;

/* --------------------------------- Button -------------------------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-500 shadow-sm',
  secondary: 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 focus-visible:ring-cyan-300',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-cyan-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm'
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner in place of the icon and disables the button. */
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
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

const fieldClasses = (hasError: boolean, hasIcon: boolean) =>
  `w-full rounded-lg border bg-white py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors
   focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500
   ${hasIcon ? 'pl-10 pr-3' : 'px-3'}
   ${hasError
     ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
     : 'border-slate-300 focus:border-cyan-500 focus:ring-cyan-200'}`;

export interface FieldProps {
  label?: ReactNode;
  error?: FieldErrorLike;
  hint?: ReactNode;
  required?: boolean;
  children?: ReactNode;
  className?: string;
}

export const Field = ({ label, error, hint, required, children, className = '' }: FieldProps) => (
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

type FieldOwnProps = Omit<FieldProps, 'children'>;

export interface InputProps extends FieldOwnProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  icon?: LucideIcon;
  /** Rendered inside the right edge of the input, e.g. a show-password toggle. */
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
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

export type SelectOption = string | { value: string | number; label: ReactNode };

export interface SelectProps
  extends FieldOwnProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  options?: readonly SelectOption[];
  /** Adds an empty first option with this text. */
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
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

export interface TextareaProps
  extends FieldOwnProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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

export const Card = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

export interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  /** Rendered on the right, e.g. a button. */
  action?: ReactNode;
  className?: string;
}

export const CardHeader = ({ title, subtitle, icon: Icon, action, className = '' }: CardHeaderProps) => (
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

const BADGE_TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200'
};

export interface BadgeProps {
  children?: ReactNode;
  /** Unknown tones fall back to slate. */
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}

export const Badge = ({ children, tone = 'slate', icon: Icon, className = '' }: BadgeProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset
      ${BADGE_TONES[tone] || BADGE_TONES.slate} ${className}`}
  >
    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
    {children}
  </span>
);

/* --------------------------------- Modal --------------------------------- */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const MODAL_WIDTHS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl'
};

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  /** Also used as the dialog's accessible name. */
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  size?: ModalSize;
  children?: ReactNode;
  footer?: ReactNode;
}

export const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  children,
  footer
}: ModalProps) => {
  // Escape closes, and the page behind does not scroll while the dialog is up.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
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

export interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: ReactNode;
  confirmLabel?: ReactNode;
  /** The confirm button's variant. */
  tone?: ButtonVariant;
  loading?: boolean;
}

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading = false
}: ConfirmDialogProps) => (
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

export const Spinner = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <Loader2 className={`animate-spin text-cyan-600 ${className}`} aria-hidden="true" />
);

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState = ({ label = 'Loading', className = 'py-16' }: LoadingStateProps) => (
  <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
    <Spinner className="h-8 w-8" />
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className = ''
}: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
    <span className="rounded-full bg-slate-100 p-3 text-slate-400">
      <Icon className="h-7 w-7" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
    {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export interface ErrorStateProps {
  message?: ReactNode;
  onRetry?: () => void;
}

export const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
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

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, icon: Icon, actions }: PageHeaderProps) => (
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

export interface PaginationProps {
  page: number;
  totalPages?: number;
  total?: number;
  onChange: (page: number) => void;
  /** Plural noun for the count, e.g. "patients". */
  label?: string;
}

export const Pagination = ({ page, totalPages, total, onChange, label = 'records' }: PaginationProps) => {
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

export interface TableColumn {
  label: ReactNode;
  /** Defaults to the label; give one when the label is not a unique string. */
  key?: string;
  align?: 'left' | 'right';
  className?: string;
}

export interface TableProps {
  columns: readonly TableColumn[];
  children?: ReactNode;
  className?: string;
}

export const Table = ({ columns, children, className = '' }: TableProps) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="w-full min-w-[640px] text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50/80">
          {columns.map((column) => (
            <th
              key={column.key || String(column.label)}
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

export const Td = ({ children, className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
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

export interface AvatarProps {
  /** Initials and the colour are derived from this. */
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar = ({ name = '', size = 'md', className = '' }: AvatarProps) => {
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
