import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Pill,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  PackagePlus,
  PackageX,
  TriangleAlert,
  CalendarX,
  IndianRupee,
  Boxes
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pharmacyService } from '../../services';
import { useMeta } from '../../hooks/useMeta';
import { useDebounce } from '../../hooks/useDebounce';
import StatsCard from '../../components/shared/StatsCard';
import {
  Card,
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
import { formatCurrency, formatDate, toDateInput, STOCK_TONE } from '../../lib/format';

const COLUMNS = [
  { key: 'medicine', label: 'Medicine' },
  { key: 'category', label: 'Category' },
  { key: 'stock', label: 'Stock' },
  { key: 'price', label: 'Unit price', align: 'right' },
  { key: 'expiry', label: 'Expiry' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' }
];

const BLANK = {
  name: '',
  genericName: '',
  brand: '',
  category: 'Tablet',
  dosage: '',
  description: '',
  stockQuantity: 0,
  reorderLevel: 10,
  unitPrice: '',
  batchNumber: '',
  expiryDate: '',
  storageInstructions: ''
};

/* ------------------------------ medicine form ---------------------------- */

const MedicineForm = ({ open, onClose, onSaved, medicine, meta }) => {
  const isEdit = Boolean(medicine);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      medicine
        ? { ...BLANK, ...medicine, expiryDate: toDateInput(medicine.expiryDate) }
        : BLANK
    );
  }, [open, medicine]);

  const set = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const next = {};
    if (!form.name.trim()) next.name = 'Required';
    if (!form.genericName.trim()) next.genericName = 'Required';
    if (!form.brand.trim()) next.brand = 'Required';
    if (!form.dosage.trim()) next.dosage = 'Required';
    if (form.unitPrice === '' || Number(form.unitPrice) < 0) next.unitPrice = 'Enter a price';
    if (Number(form.stockQuantity) < 0) next.stockQuantity = 'Cannot be negative';

    setErrors(next);
    if (Object.keys(next).length) {
      toast.error('Please correct the highlighted fields');
      return;
    }

    const payload = {
      ...form,
      stockQuantity: Number(form.stockQuantity),
      reorderLevel: Number(form.reorderLevel),
      unitPrice: Number(form.unitPrice),
      expiryDate: form.expiryDate || undefined
    };
    delete payload._id;
    delete payload.medicineId;
    delete payload.tenantId;

    setSaving(true);
    try {
      const result = isEdit
        ? await pharmacyService.update(medicine._id, payload)
        : await pharmacyService.create(payload);
      toast.success(result.message || 'Saved');
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
      title={isEdit ? `Edit ${medicine.name}` : 'Add a medicine'}
      subtitle={isEdit ? medicine.medicineId : 'It will be added to the inventory'}
      icon={Pill}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {isEdit ? 'Save changes' : 'Add medicine'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label="Brand name"
          required
          placeholder="Calpol"
          value={form.name}
          error={errors.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <Input
          label="Generic name"
          required
          placeholder="Paracetamol"
          value={form.genericName}
          error={errors.genericName}
          onChange={(e) => set('genericName', e.target.value)}
        />
        <Input
          label="Manufacturer"
          required
          value={form.brand}
          error={errors.brand}
          onChange={(e) => set('brand', e.target.value)}
        />
        <Select
          label="Category"
          required
          options={meta.medicineCategories}
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
        />
        <Input
          label="Strength / volume"
          required
          placeholder="500mg"
          value={form.dosage}
          error={errors.dosage}
          onChange={(e) => set('dosage', e.target.value)}
        />
        <Input
          label="Unit price"
          type="number"
          step="0.01"
          min="0"
          required
          value={form.unitPrice}
          error={errors.unitPrice}
          onChange={(e) => set('unitPrice', e.target.value)}
        />
        <Input
          label="Stock quantity"
          type="number"
          min="0"
          value={form.stockQuantity}
          error={errors.stockQuantity}
          onChange={(e) => set('stockQuantity', e.target.value)}
        />
        <Input
          label="Reorder level"
          type="number"
          min="0"
          hint="An alert is raised at or below this level"
          value={form.reorderLevel}
          onChange={(e) => set('reorderLevel', e.target.value)}
        />
        <Input
          label="Batch number"
          value={form.batchNumber}
          onChange={(e) => set('batchNumber', e.target.value)}
        />
        <Input
          label="Expiry date"
          type="date"
          value={form.expiryDate}
          onChange={(e) => set('expiryDate', e.target.value)}
        />
        <Textarea
          label="Storage instructions"
          className="sm:col-span-2"
          rows={2}
          value={form.storageInstructions}
          onChange={(e) => set('storageInstructions', e.target.value)}
        />
      </form>
    </Modal>
  );
};

/* ------------------------------ stock dialog ----------------------------- */

const StockDialog = ({ open, onClose, onSaved, medicine }) => {
  const [mode, setMode] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMode('add');
      setQuantity('');
    }
  }, [open]);

  const submit = async () => {
    const value = Number(quantity);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid quantity');
      return;
    }

    setSaving(true);
    try {
      const result = await pharmacyService.updateStock(medicine._id, {
        stockQuantity: value,
        mode
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

  const projected =
    mode === 'add'
      ? (medicine?.stockQuantity || 0) + (Number(quantity) || 0)
      : mode === 'remove'
        ? (medicine?.stockQuantity || 0) - (Number(quantity) || 0)
        : Number(quantity) || 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust stock"
      subtitle={medicine ? `${medicine.name} ${medicine.dosage}` : ''}
      icon={PackagePlus}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Update stock
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Currently <strong className="text-slate-900">{medicine?.stockQuantity}</strong> unit(s) in
          stock, reorder level {medicine?.reorderLevel}.
        </p>

        <Select
          label="Action"
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          options={[
            { value: 'add', label: 'Add stock (delivery received)' },
            { value: 'remove', label: 'Remove stock (damaged or expired)' },
            { value: 'set', label: 'Set an exact figure (stock take)' }
          ]}
        />

        <Input
          label="Quantity"
          type="number"
          min="0"
          autoFocus
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          hint={quantity !== '' ? `New level: ${Math.max(projected, 0)}` : undefined}
        />
      </div>
    </Modal>
  );
};

/* --------------------------------- page ---------------------------------- */

const Pharmacy = () => {
  const { hasRole } = useAuth();
  const { meta } = useMeta();

  const [state, setState] = useState({ medicines: [], meta: null, stats: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: 'All', view: 'all' });
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);

  const debouncedSearch = useDebounce(search);
  const canManage = hasRole(['HOSPITAL_ADMIN', 'PHARMACIST']);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pharmacyService.list({
        search: debouncedSearch || undefined,
        category: filters.category,
        lowStock: filters.view === 'low' ? 'true' : undefined,
        expiringSoon: filters.view === 'expiring' ? 'true' : undefined,
        page,
        limit: 20
      });
      setState({ medicines: data.medicines, meta: data.meta, stats: data.stats });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const remove = async () => {
    setWorking(true);
    try {
      const result = await pharmacyService.remove(confirm._id);
      toast.success(result.message);
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const stats = state.stats;
  const expiryTone = (date) => {
    if (!date) return 'slate';
    const days = (new Date(date) - Date.now()) / 86400000;
    if (days < 0) return 'red';
    if (days < 90) return 'amber';
    return 'slate';
  };

  return (
    <>
      <PageHeader
        title="Pharmacy"
        subtitle="Medicine inventory, stock levels and expiry"
        icon={Pill}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={load} />
            {canManage && (
              <Button
                icon={Plus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add medicine
              </Button>
            )}
          </>
        }
      />

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard icon={Boxes} label="Items in catalogue" value={stats.totalItems} tone="cyan" />
          <StatsCard
            icon={TriangleAlert}
            label="Low stock"
            value={stats.lowStock}
            tone={stats.lowStock > 0 ? 'amber' : 'slate'}
          />
          <StatsCard
            icon={PackageX}
            label="Out of stock"
            value={stats.outOfStock}
            tone={stats.outOfStock > 0 ? 'rose' : 'slate'}
          />
          <StatsCard
            icon={IndianRupee}
            label="Stock value"
            value={formatCurrency(stats.stockValue)}
            hint={`${stats.expiringSoon} expiring within 90 days`}
            tone="green"
          />
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
              placeholder="Search by brand, generic name or manufacturer"
              aria-label="Search medicines"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>
          <Select
            className="w-40"
            value={filters.category}
            onChange={(event) => setFilters((f) => ({ ...f, category: event.target.value }))}
            options={['All', ...meta.medicineCategories]}
          />
          <Select
            className="w-48"
            value={filters.view}
            onChange={(event) => setFilters((f) => ({ ...f, view: event.target.value }))}
            options={[
              { value: 'all', label: 'Everything' },
              { value: 'low', label: 'Needs reordering' },
              { value: 'expiring', label: 'Expiring within 90 days' }
            ]}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingState label="Loading the inventory" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : state.medicines.length === 0 ? (
          <EmptyState
            icon={Pill}
            title={filters.view === 'low' ? 'Nothing needs reordering' : 'No medicines'}
            message={
              filters.view === 'all'
                ? 'Add the first medicine to your inventory.'
                : 'Nothing matches this filter right now.'
            }
            action={
              canManage &&
              filters.view === 'all' && (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Add medicine
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table columns={COLUMNS}>
              {state.medicines.map((medicine) => {
                const low = medicine.stockQuantity <= medicine.reorderLevel;
                return (
                  <tr key={medicine._id} className="transition-colors hover:bg-slate-50">
                    <Td>
                      <p className="font-medium text-slate-900">
                        {medicine.name} {medicine.dosage}
                      </p>
                      <p className="text-xs text-slate-400">
                        {medicine.genericName} — {medicine.brand}
                      </p>
                    </Td>
                    <Td>
                      <Badge tone="slate">{medicine.category}</Badge>
                    </Td>
                    <Td>
                      <p
                        className={`font-semibold ${
                          medicine.stockQuantity === 0
                            ? 'text-red-600'
                            : low
                              ? 'text-amber-600'
                              : 'text-slate-900'
                        }`}
                      >
                        {medicine.stockQuantity}
                      </p>
                      <p className="text-xs text-slate-400">Reorder at {medicine.reorderLevel}</p>
                    </Td>
                    <Td className="text-right font-medium">
                      {formatCurrency(medicine.unitPrice, true)}
                    </Td>
                    <Td>
                      {medicine.expiryDate ? (
                        <Badge tone={expiryTone(medicine.expiryDate)} icon={CalendarX}>
                          {formatDate(medicine.expiryDate)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                      {medicine.batchNumber && (
                        <p className="mt-1 font-mono text-xs text-slate-400">
                          {medicine.batchNumber}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={STOCK_TONE[medicine.status] || 'slate'}>
                        {medicine.status.replace('_', ' ')}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={PackagePlus}
                            aria-label="Adjust stock"
                            className="text-emerald-600 hover:bg-emerald-50"
                            onClick={() => setStockFor(medicine)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Pencil}
                            aria-label="Edit"
                            onClick={() => {
                              setEditing(medicine);
                              setFormOpen(true);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            aria-label="Remove"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => setConfirm(medicine)}
                          />
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>

            <Pagination
              page={state.meta?.page || 1}
              totalPages={state.meta?.totalPages || 1}
              total={state.meta?.total}
              label="medicines"
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <MedicineForm
        open={formOpen}
        medicine={editing}
        meta={meta}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <StockDialog
        open={Boolean(stockFor)}
        medicine={stockFor}
        onClose={() => setStockFor(null)}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        loading={working}
        title="Remove this medicine?"
        message={`${confirm?.name} ${confirm?.dosage} will be removed. If any stock remains it is marked discontinued instead, so past prescriptions still make sense.`}
        confirmLabel="Remove"
        onClose={() => setConfirm(null)}
        onConfirm={remove}
      />
    </>
  );
};

export default Pharmacy;
