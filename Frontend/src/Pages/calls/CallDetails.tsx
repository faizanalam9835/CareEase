import { useEffect, useState } from 'react';
import { PhoneCall, Bot, User } from 'lucide-react';
import { callService } from '../../services';
import { asApiError } from '../../services/api';
import type { CallLog, CallMessage } from '../../types';
import { Modal, Badge, LoadingState, ErrorState, EmptyState } from '../../components/ui';
import { formatDateTime, formatDuration } from '../../lib/format';

interface CallDetailsProps {
  /** Open with a known call (Call Logs page)... */
  call?: CallLog | null;
  /** ...or with an appointment, and look up the call that booked it. */
  appointmentId?: string | null;
  appointmentLabel?: string;
  onClose: () => void;
}

/** Recording player and transcript for one voice receptionist call. Give it a `key` per call so state starts fresh. */
const CallDetails = ({ call: given, appointmentId, appointmentLabel, onClose }: CallDetailsProps) => {
  const open = Boolean(given || appointmentId);
  const [call, setCall] = useState<CallLog | null>(null);
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const translated = messages.some((message) => message.original);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const found = given || (await callService.forAppointment(appointmentId as string)).call;
        if (cancelled) return;
        if (!found) return setState('none');
        setCall(found);
        const transcript = await callService.transcript(found.id);
        if (cancelled) return;
        setMessages(transcript.messages);
        setState('ready');
        // The recording is the slow part; show the transcript while it downloads.
        try {
          const blob = await callService.recording(found.id);
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setAudioUrl(objectUrl);
        } catch {
          if (!cancelled) setAudioUrl('');
        }
      } catch (err) {
        if (cancelled) return;
        setError(asApiError(err).message);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, given, appointmentId, attempt]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Call details"
      subtitle={appointmentLabel || (call ? formatDateTime(call.startedAt) : undefined)}
      icon={PhoneCall}
      size="lg"
    >
      {state === 'loading' ? (
        <LoadingState label="Loading call" />
      ) : state === 'error' ? (
        <ErrorState message={error} onRetry={() => {
            setState('loading');
            setAttempt((n) => n + 1);
          }} />
      ) : state === 'none' ? (
        <EmptyState
          icon={PhoneCall}
          title="No call for this appointment"
          message="It was booked by staff, or the voice call could not be matched."
        />
      ) : (
        call && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="slate">{formatDateTime(call.startedAt)}</Badge>
              <Badge tone="slate">{formatDuration(call.durationSeconds)}</Badge>
              <Badge tone="slate">{call.language}</Badge>
              {call.caller && <Badge tone="slate">{call.caller}</Badge>}
            </div>

            {call.summary && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{call.summary}</p>}

            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Recording</p>
              {audioUrl ? (
                <audio controls src={audioUrl} className="w-full" />
              ) : (
                <p className="text-sm text-slate-400">
                  {audioUrl === '' ? 'The recording could not be loaded.' : 'Loading recording…'}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  Transcript{translated && !showOriginal && <span className="font-normal text-slate-400"> · translated to English</span>}
                </p>
                {translated && (
                  <button type="button" onClick={() => setShowOriginal((v) => !v)} className="text-xs font-medium text-cyan-700">
                    {showOriginal ? 'Show English' : 'Show original'}
                  </button>
                )}
              </div>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {messages.map((message, index) => {
                  const agent = message.role === 'agent';
                  const Icon = agent ? Bot : User;
                  return (
                    <div key={index} className={`flex gap-2 ${agent ? '' : 'flex-row-reverse'}`}>
                      <Icon className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-label={agent ? 'Receptionist' : 'Caller'} />
                      <p
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          agent ? 'bg-slate-100 text-slate-800' : 'bg-cyan-50 text-slate-800'
                        }`}
                      >
                        {showOriginal && message.original ? message.original : message.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
    </Modal>
  );
};

export default CallDetails;
