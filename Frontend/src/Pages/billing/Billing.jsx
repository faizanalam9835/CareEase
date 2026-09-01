import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  IndianRupee,
  RefreshCw,
  CreditCard,
  Printer,
  Ban,
  TrendingUp,
  Wallet,
  CircleAlert,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { billingService, patientService } from '../../services';
import { useMeta } from '../../hooks/useMeta';
import { useDebounce } from '../../hooks/useDebounce';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
  CardHeader,
  Table,
  Td,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  Modal,
  PageHeader,
  Pagination,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import { formatCurrency, formatDate, formatDateTime, PAYMENT_TONE } from '../../lib/format';

const COLUMNS = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'patient', label: 'Patient' },
  { key: 'amount', label: 'Total', align: 'right' },
  { key: 'balance', label: 'Outstanding', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' }
];

const BLANK_LINE = { itemName: '', itemType: 'Consultation', quantity: 1, unitPrice: '' };

/* ------------------------------ invoice form ----------------------------- */

const InvoiceForm = ({ open, onClose, onSaved, meta }) => {
  const [patientId, setPatientId] = useState('');
  const [lines, setLines] = useState([{ ...BLANK_LINE }]);
  const [taxPercentage, setTax] = useState(5);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [patients, setPatients] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPatientId('');
    setLines([{ ...BLANK_LINE }]);
    setTax(5);
    setDiscount(0);
    setNotes('');
    patientService
      .list({ limit: 100 })
      .then((data) => setPatients(data.patients))
      .catch((error) => toast.error(error.message));
  }, [open]);

  const setLine = (index, field, value) =>
    setLines((current) =>
      current.map((line, position) => (position === index ? { ...line, [field]: value } : line))
    );

  // Mirrors the server's calculation, so the preview matches what is saved.
  const totals = useMemo(() => {
    const subTotal = lines.reduce(
      (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
      0
    );
    const tax = (subTotal * (Number(taxPercentage) || 0)) / 100;
    return {
      subTotal,
      tax,
      total: Math.max(subTotal + tax - (Number(discount) || 0), 0)
    };
  }, [lines, taxPercentage, discount]);

  const submit = async (event) => {
    event.preventDefault();

    if (!patientId) {
      toast.error('Choose a patient');
      return;
    }
    const cleanLines = lines.filter((line) => line.itemName.trim() && line.unitPrice !== '');
    if (cleanLines.length === 0) {
      toast.error('Add at least one line with a description and price');
      return;
    }

    setSaving(true);
    try {
      const result = await billingService.create({
        patientId,
        items: cleanLines.map((line) => ({
          itemName: line.itemName,
          itemType: line.itemType,
          quantity: Number(line.quantity) || 1,
          unitPrice: Number(line.unitPrice)
        })),
        taxPercentage: Number(taxPercentage) || 0,
        discount: Number(discount) || 0,
        notes
      });
      toast.success(`${result.invoice.invoiceId} created`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New invoice"
      icon={Receipt}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create invoice
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Select
          label="Patient"
          required
          placeholder="Select a patient"
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
          options={patients.map((patient) => ({
            value: patient._id,
            label: `${patient.firstName} ${patient.lastName} — ${patient.patientId}`
          }))}
        />

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Line items
            </h3>
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              onClick={() => setLines((current) => [...current, { ...BLANK_LINE }])}
            >
              Add line
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
                <Input
                  label={index === 0 ? 'Description' : undefined}
                  className="sm:col-span-5"
                  placeholder="Specialist consultation"
                  value={line.itemName}
                  onChange={(event) => setLine(index, 'itemName', event.target.value)}
                />
                <Select
                  label={index === 0 ? 'Type' : undefined}
                  className="sm:col-span-3"
                  value={line.itemType}
                  onChange={(event) => setLine(index, 'itemType', event.target.value)}
                  options={meta.invoiceItemTypes}
                />
                <Input
                  label={index === 0 ? 'Qty' : undefined}
                  className="sm:col-span-1"
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(event) => setLine(index, 'quantity', event.target.value)}
                />
                <Input
                  label={index === 0 ? 'Unit price' : undefined}
                  className="sm:col-span-2"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) => setLine(index, 'unitPrice', event.target.value)}
                />
                <div className="flex items-end sm:col-span-1">
                  {lines.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      aria-label={`Remove line ${index + 1}`}
                      className="text-red-500 hover:bg-red-50"
                      onClick={() =>
                        setLines((current) => current.filter((_, position) => position !== index))
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tax %"
            type="number"
            min="0"
            max="100"
            value={taxPercentage}
            onChange={(event) => setTax(event.target.value)}
          />
          <Input
            label="Discount"
            type="number"
            min="0"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between py-1 text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subTotal, true)}</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600">
            <span>Tax ({taxPercentage || 0}%)</span>
            <span>{formatCurrency(totals.tax, true)}</span>
          </div>
          {Number(discount) > 0 && (
            <div className="flex justify-between py-1 text-slate-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount, true)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(totals.total, true)}</span>
          </div>
        </div>

        <Textarea
          label="Notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </form>
    </Modal>
  );
};

/* ------------------------------ payment dialog --------------------------- */

const PaymentDialog = ({ open, onClose, onSaved, invoice, meta }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setAmount(String(invoice.balanceAmount));
      setMethod(invoice.paymentMethod || 'Cash');
      setTransactionId('');
    }
  }, [open, invoice]);

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    if (value > invoice.balanceAmount) {
      toast.error(`That is more than the ${formatCurrency(invoice.balanceAmount, true)} outstanding`);
      return;
    }

    setSaving(true);
    try {
      const result = await billingService.recordPayment(invoice._id, {
        amount: value,
        method,
        transactionId: transactionId || undefined
      });
      toast.success(result.message);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      subtitle={invoice?.invoiceId}
      icon={CreditCard}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3.5 text-sm">
          <div className="flex justify-between py-0.5 text-slate-600">
            <span>Invoice total</span>
            <span>{formatCurrency(invoice?.totalAmount, true)}</span>
          </div>
          <div className="flex justify-between py-0.5 text-slate-600">
            <span>Already paid</span>
            <span>{formatCurrency(invoice?.paidAmount, true)}</span>
          </div>
          <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
            <span>Outstanding</span>
            <span>{formatCurrency(invoice?.balanceAmount, true)}</span>
          </div>
        </div>

        <Input
          label="Amount received"
          type="number"
          min="0"
          step="0.01"
          max={invoice?.balanceAmount}
          autoFocus
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Select
          label="Method"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          options={meta.paymentMethods}
        />
        {method !== 'Cash' && (
          <Input
            label="Reference"
            placeholder="Transaction ID"
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
          />
        )}
      </div>
    </Modal>
  );
};

/* ------------------------------ invoice detail --------------------------- */

const InvoiceDetail = ({ open, onClose, invoice, onPrint }) => {
  if (!invoice) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice.invoiceId}
      subtitle={`Raised ${formatDate(invoice.invoiceDate)} — due ${formatDate(invoice.dueDate)}`}
      icon={Receipt}
      size="lg"
      footer={
        <Button variant="outline" icon={Printer} onClick={() => onPrint(invoice)}>
          Print
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={PAYMENT_TONE[invoice.paymentStatus] || 'slate'}>
            {invoice.paymentStatus.replace('_', ' ')}
          </Badge>
          <Badge tone="slate">{invoice.paymentMethod}</Badge>
        </div>

        <div>
          <p className="text-xs text-slate-400">Patient</p>
          <p className="text-sm font-medium text-slate-900">
            {invoice.patientId?.firstName} {invoice.patientId?.lastName}
          </p>
          <p className="text-xs text-slate-500">
            {invoice.patientId?.patientId} — {invoice.patientId?.phone}
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item._id}>
                  <td className="px-3 py-2.5">
                    {item.itemName}
                    <span className="ml-2 text-xs text-slate-400">{item.itemType}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(item.unitPrice, true)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {formatCurrency(item.amount, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subTotal, true)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax ({invoice.taxPercentage}%)</span>
            <span>{formatCurrency(invoice.taxAmount, true)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span>-{formatCurrency(invoice.discount, true)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(invoice.totalAmount, true)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Paid</span>
            <span>{formatCurrency(invoice.paidAmount, true)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <span>Outstanding</span>
            <span>{formatCurrency(invoice.balanceAmount, true)}</span>
          </div>
        </div>

        {invoice.payments?.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Payment history
            </h3>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {invoice.payments.map((payment) => (
                <li key={payment._id} className="flex items-center justify-between p-3 text-sm">
                  <span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(payment.amount, true)}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">{payment.method}</span>
                  </span>
                  <span className="text-xs text-slate-400">{formatDateTime(payment.paidAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {invoice.notes && (
          <div>
            <p className="text-xs text-slate-400">Notes</p>
            <p className="text-sm text-slate-800">{invoice.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

/* --------------------------------- page ---------------------------------- */

const Billing = () => {
  const { hasRole, isAdmin } = useAuth();
  const { meta } = useMeta();

  const [state, setState] = useState({ invoices: [], meta: null, stats: null });
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [working, setWorking] = useState(false);

  const debouncedSearch = useDebounce(search);
  const canBill = hasRole(['HOSPITAL_ADMIN', 'RECEPTIONIST']);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await billingService.list({
        search: debouncedSearch || undefined,
        paymentStatus: status,
        page,
        limit: 20
      });
      setState({ invoices: data.invoices, meta: data.meta, stats: data.stats });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!canBill) return;
    billingService
      .dashboard()
      .then((data) => setFinance(data.dashboard))
      .catch(() => setFinance(null));
  }, [canBill]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const cancel = async () => {
    setWorking(true);
    try {
      await billingService.cancel(cancelling._id, { reason: 'Cancelled by administrator' });
      toast.success('Invoice cancelled');
      setCancelling(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const print = (invoice) => {
    const rows = invoice.items
      .map(
        (item) =>
          `<tr><td>${item.itemName}<br><small>${item.itemType}</small></td><td style="text-align:right">${item.quantity}</td><td style="text-align:right">${formatCurrency(item.unitPrice, true)}</td><td style="text-align:right">${formatCurrency(item.amount, true)}</td></tr>`
      )
      .join('');

    const html = `<!doctype html><html><head><title>${invoice.invoiceId}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:40px;color:#0f172a}
        h1{margin:0;font-size:20px;color:#0891b2}
        .meta{margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px}
        .meta span{color:#64748b}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
        th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
        th{background:#f8fafc;font-size:11px;text-transform:uppercase;color:#64748b}
        .totals{margin-left:auto;margin-top:16px;width:280px;font-size:13px}
        .totals div{display:flex;justify-content:space-between;padding:4px 0}
        .totals .grand{border-top:1px solid #e2e8f0;margin-top:6px;padding-top:8px;font-weight:700;font-size:15px}
        footer{margin-top:48px;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px}
      </style></head><body>
      <h1>CareEase General Hospital</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b">Invoice ${invoice.invoiceId}</p>
      <div class="meta">
        <div><span>Billed to</span><br><strong>${invoice.patientId?.firstName} ${invoice.patientId?.lastName}</strong><br>${invoice.patientId?.patientId}<br>${invoice.patientId?.phone || ''}</div>
        <div><span>Invoice date</span><br>${formatDate(invoice.invoiceDate)}<br><span>Due</span><br>${formatDate(invoice.dueDate)}</div>
      </div>
      <table><thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">
        <div><span>Subtotal</span><span>${formatCurrency(invoice.subTotal, true)}</span></div>
        <div><span>Tax (${invoice.taxPercentage}%)</span><span>${formatCurrency(invoice.taxAmount, true)}</span></div>
        ${invoice.discount ? `<div><span>Discount</span><span>-${formatCurrency(invoice.discount, true)}</span></div>` : ''}
        <div class="grand"><span>Total</span><span>${formatCurrency(invoice.totalAmount, true)}</span></div>
        <div><span>Paid</span><span>${formatCurrency(invoice.paidAmount, true)}</span></div>
        <div><span>Outstanding</span><span>${formatCurrency(invoice.balanceAmount, true)}</span></div>
      </div>
      <footer>Status: ${invoice.paymentStatus.replace('_', ' ')}. Generated by CareEase HMS.</footer>
      </body></html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      toast.error('Allow pop-ups to print');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const stats = state.stats;

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Invoices, payments and revenue"
        icon={Receipt}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={load} />
            {canBill && (
              <Button icon={Plus} onClick={() => setFormOpen(true)}>
                New invoice
              </Button>
            )}
          </>
        }
      />

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard icon={Receipt} label="Invoices" value={stats.count} tone="cyan" />
          <StatsCard
            icon={IndianRupee}
            label="Invoiced"
            value={formatCurrency(stats.invoiced)}
            tone="blue"
          />
          <StatsCard
            icon={Wallet}
            label="Collected"
            value={formatCurrency(stats.collected)}
            tone="green"
          />
          <StatsCard
            icon={CircleAlert}
            label="Outstanding"
            value={formatCurrency(stats.outstanding)}
            tone={stats.outstanding > 0 ? 'rose' : 'slate'}
          />
        </div>
      )}

      {finance && finance.revenueTrend.length > 0 && (
        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Revenue"
              subtitle={`Collection rate ${finance.collectionRate}%`}
              icon={TrendingUp}
            />
            <div className="p-4 pt-5">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={finance.revenueTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                    tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value) => formatCurrency(value, true)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="invoiced" name="Invoiced" fill="#cbd5e1" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#0891b2" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Largest balances" icon={CircleAlert} />
            {finance.topDebtors.length === 0 ? (
              <EmptyState title="Everything is settled" className="py-10" />
            ) : (
              <ul className="divide-y divide-slate-50">
                {finance.topDebtors.map((debtor) => (
                  <li key={debtor.patientCode} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {debtor.name}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {debtor.patientCode} — {debtor.invoices} invoice(s)
                      </span>
                    </span>
                    <Badge tone="amber">{formatCurrency(debtor.outstanding)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by invoice number or patient"
              aria-label="Search invoices"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <Select
            className="w-44"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={['All', ...meta.paymentStatuses]}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingState label="Loading invoices" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : state.invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices"
            message={
              canBill
                ? 'Raise an invoice, or generate one from a completed appointment.'
                : 'Invoices appear here once the front desk raises them.'
            }
            action={
              canBill && (
                <Button icon={Plus} onClick={() => setFormOpen(true)}>
                  New invoice
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={COLUMNS}>
              {state.invoices.map((invoice) => (
                <tr key={invoice._id} className="transition-colors hover:bg-slate-50">
                  <Td>
                    <p className="font-mono text-xs font-medium text-slate-900">
                      {invoice.invoiceId}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(invoice.invoiceDate)}</p>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-900">
                      {invoice.patientId?.firstName} {invoice.patientId?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{invoice.patientId?.patientId}</p>
                  </Td>
                  <Td className="text-right font-medium">
                    {formatCurrency(invoice.totalAmount, true)}
                  </Td>
                  <Td className="text-right">
                    <span
                      className={
                        invoice.balanceAmount > 0 ? 'font-semibold text-amber-600' : 'text-slate-400'
                      }
                    >
                      {formatCurrency(invoice.balanceAmount, true)}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={PAYMENT_TONE[invoice.paymentStatus] || 'slate'}>
                      {invoice.paymentStatus.replace('_', ' ')}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        aria-label="View"
                        onClick={() => setViewing(invoice)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Printer}
                        aria-label="Print"
                        onClick={() => print(invoice)}
                      />
                      {canBill && invoice.balanceAmount > 0 && invoice.status === 'Active' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={CreditCard}
                          aria-label="Record payment"
                          className="text-emerald-600 hover:bg-emerald-50"
                          onClick={() => setPaying(invoice)}
                        />
                      )}
                      {isAdmin && invoice.paidAmount === 0 && invoice.status === 'Active' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Ban}
                          aria-label="Cancel"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => setCancelling(invoice)}
                        />
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>

            <Pagination
              page={state.meta?.page || 1}
              totalPages={state.meta?.totalPages || 1}
              total={state.meta?.total}
              label="invoices"
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <InvoiceForm open={formOpen} meta={meta} onClose={() => setFormOpen(false)} onSaved={load} />

      <InvoiceDetail
        open={Boolean(viewing)}
        invoice={viewing}
        onClose={() => setViewing(null)}
        onPrint={print}
      />

      <PaymentDialog
        open={Boolean(paying)}
        invoice={paying}
        meta={meta}
        onClose={() => setPaying(null)}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        loading={working}
        title="Cancel this invoice?"
        message={`${cancelling?.invoiceId} will be marked cancelled. Only invoices with no payments against them can be cancelled.`}
        confirmLabel="Cancel invoice"
        onClose={() => setCancelling(null)}
        onConfirm={cancel}
      />
    </>
  );
};

export default Billing;
