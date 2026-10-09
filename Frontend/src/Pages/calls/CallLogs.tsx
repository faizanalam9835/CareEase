import { useCallback, useEffect, useState } from 'react';
import { PhoneCall, RefreshCw, Eye } from 'lucide-react';
import { callService } from '../../services';
import { asApiError } from '../../services/api';
import type { CallLog, PageMeta } from '../../types';
import {
  Card,
  Table,
  Td,
  Badge,
  Button,
  Input,
  PageHeader,
  Pagination,
  LoadingState,
  ErrorState,
  EmptyState
} from '../../components/ui';
import type { TableColumn } from '../../components/ui';
import { formatDateTime, formatDuration } from '../../lib/format';
import CallDetails from './CallDetails';

const COLUMNS: TableColumn[] = [
  { key: 'when', label: 'When' },
  { key: 'caller', label: 'Caller' },
  { key: 'summary', label: 'Summary' },
  { key: 'booking', label: 'Booking' },
  { key: 'actions', label: '', align: 'right' }
];

const istDay = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86400000).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 10);

const CallLogs = () => {
  const [range, setRange] = useState({ from: istDay(-6), to: istDay() });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ calls: CallLog[]; meta: PageMeta | null }>({ calls: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CallLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callService.list({ ...range, page });
      setData({ calls: result.calls, meta: result.meta });
    } catch (err) {
      setError(asApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [range, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Call Logs"
        subtitle="Calls answered by the voice receptionist"
        icon={PhoneCall}
        actions={<Button variant="outline" icon={RefreshCw} onClick={load} aria-label="Refresh" />}
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <Input
            type="date"
            label="From"
            className="w-44"
            value={range.from}
            max={range.to}
            onChange={(event) => {
              setPage(1);
              setRange((r) => ({ ...r, from: event.target.value || istDay(-6) }));
            }}
          />
          <Input
            type="date"
            label="To"
            className="w-44"
            value={range.to}
            min={range.from}
            onChange={(event) => {
              setPage(1);
              setRange((r) => ({ ...r, to: event.target.value || istDay() }));
            }}
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <LoadingState label="Loading calls" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : data.calls.length === 0 ? (
          <EmptyState icon={PhoneCall} title="No calls in this period" message="Try a wider date range." />
        ) : (
          <>
            <Table columns={COLUMNS}>
              {data.calls.map((call) => (
                <tr key={call.id} className="transition-colors hover:bg-slate-50">
                  <Td>
                    <p className="font-medium text-slate-900">{formatDateTime(call.startedAt)}</p>
                    <p className="text-xs text-slate-400">
                      {formatDuration(call.durationSeconds)} · {call.language}
                    </p>
                  </Td>
                  <Td className="font-mono text-sm">{call.caller || '—'}</Td>
                  <Td>
                    <p className="max-w-[360px] text-sm text-slate-700 line-clamp-2">{call.summary || '—'}</p>
                  </Td>
                  <Td>
                    {call.appointments?.length ? (
                      call.appointments.map((a) => (
                        <Badge key={a._id} tone="green" className="font-mono">
                          {a.appointmentId}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No booking</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Button size="sm" variant="outline" icon={Eye} onClick={() => setSelected(call)}>
                      Details
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={data.meta?.page || 1}
              totalPages={data.meta?.totalPages || 1}
              total={data.meta?.total}
              label="calls"
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <CallDetails key={selected?.id} call={selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default CallLogs;
