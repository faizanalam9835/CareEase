import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  BedDouble,
  Building2,
  Plus,
  RefreshCw,
  ArrowRightLeft,
  LogOut,
  Activity,
  Wrench,
  CircleCheck,
  Pencil,
  Trash2,
  ChevronRight,
  ArrowLeft,
  User,
  TriangleAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { wardService, admissionService } from '../../services';
import { useMeta } from '../../hooks/useMeta';
import StatsCard from '../../components/shared/StatsCard';
import VitalsDialog from '../vitals/VitalsDialog';
import {
  AdmitDialog,
  TransferDialog,
  DischargeDialog,
  WardDialog,
  AddBedDialog
} from './WardDialogs';
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Select,
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import { formatCurrency, formatDate, formatRelative, pluralise } from '../../lib/format';

const BED_STYLES = {
  Available: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400',
  Occupied: 'border-blue-200 bg-blue-50 hover:border-blue-400',
  Reserved: 'border-amber-200 bg-amber-50 hover:border-amber-400',
  Maintenance: 'border-slate-200 bg-slate-100 hover:border-slate-300'
};

const nightsSince = (date) => Math.max(Math.ceil((Date.now() - new Date(date)) / 86400000), 1);

/* ----------------------------- the bed board ----------------------------- */

const BedBoard = ({ ward, beds, onBack, onRefresh, canManageBeds, canAdmit, actions }) => (
  <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
          All wards
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{ward.name}</h2>
          <p className="text-sm text-slate-500">
            {ward.code} · {ward.type} · {ward.department}
            {ward.floor ? ` · floor ${ward.floor}` : ''} ·{' '}
            {formatCurrency(ward.dailyRate)}/night
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" icon={RefreshCw} onClick={onRefresh} />
        {canManageBeds && (
          <Button variant="outline" icon={Plus} onClick={actions.onAddBed}>
            Add bed
          </Button>
        )}
      </div>
    </div>

    {beds.length === 0 ? (
      <Card>
        <EmptyState
          icon={BedDouble}
          title="This ward has no beds yet"
          message="Add beds so patients can be admitted into them."
          action={
            canManageBeds && (
              <Button icon={Plus} onClick={actions.onAddBed}>
                Add bed
              </Button>
            )
          }
        />
      </Card>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {beds.map((bed) => {
          const patient = bed.currentPatient;
          const admission = bed.currentAdmission;

          return (
            <div
              key={bed._id}
              className={`rounded-xl border-2 p-4 transition-colors ${BED_STYLES[bed.status]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{bed.bedNumber}</span>
                </div>
                <Badge
                  tone={
                    bed.status === 'Available'
                      ? 'green'
                      : bed.status === 'Occupied'
                        ? 'blue'
                        : bed.status === 'Reserved'
                          ? 'amber'
                          : 'slate'
                  }
                >
                  {bed.status}
                </Badge>
              </div>

              {patient ? (
                <div className="mt-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{patient.patientId}</p>

                  {admission && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {admission.admissionId} · {pluralise(nightsSince(admission.admittedAt), 'night')} ·
                      admitted {formatDate(admission.admittedAt)}
                      {admission.attendingDoctor &&
                        ` · Dr. ${admission.attendingDoctor.lastName}`}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Activity}
                      onClick={() => actions.onVitals(patient)}
                    >
                      Vitals
                    </Button>
                    {canAdmit && admission && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={ArrowRightLeft}
                          aria-label="Move to another bed"
                          onClick={() => actions.onTransfer(bed)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          icon={LogOut}
                          aria-label="Discharge"
                          onClick={() => actions.onDischarge(bed)}
                        />
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-xs text-slate-500">
                    {formatCurrency(bed.dailyRate || ward.dailyRate)} per night
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {bed.status === 'Available' && canAdmit && (
                      <Button size="sm" icon={Plus} onClick={() => actions.onAdmit(bed)}>
                        Admit
                      </Button>
                    )}
                    {canManageBeds && bed.status !== 'Occupied' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={bed.status === 'Maintenance' ? CircleCheck : Wrench}
                          aria-label={
                            bed.status === 'Maintenance' ? 'Return to service' : 'Take out of service'
                          }
                          onClick={() =>
                            actions.onToggleService(
                              bed,
                              bed.status === 'Maintenance' ? 'Available' : 'Maintenance'
                            )
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          aria-label="Remove bed"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => actions.onDeleteBed(bed)}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </>
);

/* --------------------------------- page ---------------------------------- */

const Wards = () => {
  const { hasRole, isAdmin } = useAuth();
  const { meta } = useMeta();

  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [department, setDepartment] = useState('All');

  const [admitFor, setAdmitFor] = useState(undefined);
  const [transferFor, setTransferFor] = useState(null);
  const [dischargeFor, setDischargeFor] = useState(null);
  const [vitalsFor, setVitalsFor] = useState(null);
  const [wardDialog, setWardDialog] = useState(null);
  const [addBedFor, setAddBedFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [working, setWorking] = useState(false);

  const canAdmit = hasRole(['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']);
  const canManageBeds = isAdmin;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wardData, admissionData] = await Promise.all([
        wardService.list({ department }),
        admissionService.list({ status: 'Active', limit: 50 })
      ]);
      setOverview(wardData);
      setAdmissions(admissionData.admissions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [department]);

  const loadWard = useCallback(async (wardId) => {
    setLoading(true);
    try {
      setDetail(await wardService.get(wardId));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) loadWard(selected);
    else loadOverview();
  }, [selected, loadOverview, loadWard]);

  const refresh = () => (selected ? loadWard(selected) : loadOverview());

  /** The board hands over a bed; the dialogs need the admission on it. */
  const admissionOf = (bed) => {
    const admission = bed.currentAdmission;
    if (!admission) return null;
    return {
      ...admission,
      patient: bed.currentPatient,
      ward: detail?.ward,
      bed: { bedNumber: bed.bedNumber }
    };
  };

  const toggleService = async (bed, status) => {
    try {
      await wardService.updateBed(bed._id, { status });
      toast.success(status === 'Maintenance' ? 'Bed taken out of service' : 'Bed back in service');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteBed = async () => {
    setWorking(true);
    try {
      await wardService.removeBed(confirmDelete.bed._id);
      toast.success('Bed removed');
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const deleteWard = async () => {
    setWorking(true);
    try {
      const result = await wardService.remove(confirmDelete.ward._id);
      toast.success(result.message);
      setConfirmDelete(null);
      setSelected(null);
      loadOverview();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const boardActions = {
    onAdmit: (bed) => setAdmitFor({ ...bed, label: `${detail.ward.code} / ${bed.bedNumber}` }),
    onTransfer: (bed) => setTransferFor(admissionOf(bed)),
    onDischarge: (bed) => setDischargeFor(admissionOf(bed)),
    onVitals: (patient) => setVitalsFor(patient),
    onAddBed: () => setAddBedFor(detail.ward),
    onToggleService: toggleService,
    onDeleteBed: (bed) => setConfirmDelete({ bed })
  };

  if (loading && !overview && !detail) return <LoadingState label="Loading wards" className="py-24" />;
  if (error) return <ErrorState message={error} onRetry={loadOverview} />;

  return (
    <>
      <PageHeader
        title="Wards and beds"
        subtitle="Admissions, transfers, discharges and live occupancy"
        icon={BedDouble}
        actions={
          <>
            <Button variant="outline" icon={RefreshCw} onClick={refresh} />
            {canAdmit && (
              <Button icon={Plus} onClick={() => setAdmitFor(null)}>
                Admit patient
              </Button>
            )}
            {isAdmin && !selected && (
              <Button variant="outline" icon={Building2} onClick={() => setWardDialog({})}>
                Add ward
              </Button>
            )}
          </>
        }
      />

      {/* Overview */}
      {!selected && overview && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard icon={BedDouble} label="Total beds" value={overview.totals.beds} tone="cyan" />
            <StatsCard
              icon={User}
              label="Occupied"
              value={overview.totals.occupied}
              hint={`${overview.totals.occupancyRate}% occupancy`}
              tone="blue"
            />
            <StatsCard
              icon={CircleCheck}
              label="Available"
              value={overview.totals.available}
              tone="green"
            />
            <StatsCard
              icon={Wrench}
              label="Out of service"
              value={overview.totals.outOfService}
              tone={overview.totals.outOfService > 0 ? 'amber' : 'slate'}
            />
          </div>

          <Card className="mb-6">
            <div className="flex flex-wrap items-end gap-3 p-4">
              <Select
                className="w-52"
                label="Department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                options={['All', ...meta.departments]}
              />
            </div>
          </Card>

          {overview.wards.length === 0 ? (
            <Card>
              <EmptyState
                icon={Building2}
                title="No wards set up"
                message="Create a ward and its beds to start admitting inpatients."
                action={
                  isAdmin && (
                    <Button icon={Plus} onClick={() => setWardDialog({})}>
                      Add ward
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {overview.wards.map((ward) => (
                <Card key={ward._id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelected(ward._id)}
                    className="w-full p-5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{ward.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {ward.code} · {ward.type} · {ward.department}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium text-slate-900">
                          {ward.bedCounts.Occupied} / {ward.bedCounts.total} beds
                        </span>
                        <span className="text-xs text-slate-500">{ward.occupancyRate}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ward.occupancyRate >= 90
                              ? 'bg-red-500'
                              : ward.occupancyRate >= 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(ward.occupancyRate, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="green">{ward.bedCounts.Available} free</Badge>
                      {ward.bedCounts.Maintenance > 0 && (
                        <Badge tone="slate">{ward.bedCounts.Maintenance} out of service</Badge>
                      )}
                      <Badge tone="cyan">{formatCurrency(ward.dailyRate)}/night</Badge>
                    </div>
                  </button>

                  {isAdmin && (
                    <div className="flex justify-end gap-1 border-t border-slate-100 px-3 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Pencil}
                        aria-label="Edit ward"
                        onClick={() => setWardDialog(ward)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        aria-label="Delete ward"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => setConfirmDelete({ ward })}
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Current inpatients */}
          <Card>
            <CardHeader
              title="Current inpatients"
              subtitle={pluralise(admissions.length, 'active stay', 'active stays')}
              icon={User}
            />
            {admissions.length === 0 ? (
              <EmptyState icon={BedDouble} title="Nobody is admitted right now" />
            ) : (
              <ul className="divide-y divide-slate-50">
                {admissions.map((admission) => (
                  <li key={admission._id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {admission.patient?.firstName} {admission.patient?.lastName}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {admission.admissionId} · {admission.ward?.code} /{' '}
                        {admission.bed?.bedNumber} · {pluralise(nightsSince(admission.admittedAt), 'night')} ·{' '}
                        {admission.reason}
                      </span>
                    </span>
                    <Badge tone="blue">{formatRelative(admission.admittedAt)}</Badge>
                    <span className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Activity}
                        aria-label="Vitals"
                        onClick={() => setVitalsFor(admission.patient)}
                      />
                      {canAdmit && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={ArrowRightLeft}
                            aria-label="Move"
                            onClick={() => setTransferFor(admission)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            icon={LogOut}
                            aria-label="Discharge"
                            onClick={() => setDischargeFor(admission)}
                          />
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* Single ward */}
      {selected && detail && (
        <BedBoard
          ward={detail.ward}
          beds={detail.beds}
          onBack={() => {
            setSelected(null);
            setDetail(null);
          }}
          onRefresh={refresh}
          canManageBeds={canManageBeds}
          canAdmit={canAdmit}
          actions={boardActions}
        />
      )}

      {/* Dialogs */}
      <AdmitDialog
        open={admitFor !== undefined}
        presetBed={admitFor}
        onClose={() => setAdmitFor(undefined)}
        onDone={refresh}
      />
      <TransferDialog
        open={Boolean(transferFor)}
        admission={transferFor}
        onClose={() => setTransferFor(null)}
        onDone={refresh}
      />
      <DischargeDialog
        open={Boolean(dischargeFor)}
        admission={dischargeFor}
        onClose={() => setDischargeFor(null)}
        onDone={refresh}
      />
      <VitalsDialog
        open={Boolean(vitalsFor)}
        patient={vitalsFor}
        onClose={() => setVitalsFor(null)}
      />
      <WardDialog
        open={Boolean(wardDialog)}
        ward={wardDialog?._id ? wardDialog : null}
        meta={{ ...meta, wardTypes: meta.wardTypes || [] }}
        onClose={() => setWardDialog(null)}
        onDone={loadOverview}
      />
      <AddBedDialog
        open={Boolean(addBedFor)}
        ward={addBedFor}
        onClose={() => setAddBedFor(null)}
        onDone={refresh}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        loading={working}
        title={confirmDelete?.ward ? 'Delete this ward?' : 'Remove this bed?'}
        message={
          confirmDelete?.ward
            ? `${confirmDelete.ward.name} and all of its beds will be removed. This is refused while any bed is still occupied.`
            : `Bed ${confirmDelete?.bed?.bedNumber} will be removed.`
        }
        confirmLabel={confirmDelete?.ward ? 'Delete ward' : 'Remove bed'}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDelete?.ward ? deleteWard : deleteBed}
      />
    </>
  );
};

export default Wards;
