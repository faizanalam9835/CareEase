import { Readable } from 'stream';
import Appointment from '../models/Appointment';
import CallTranscript from '../models/CallTranscript';
import { needsTranslation, toEnglish, mapLimit } from '../utils/translate';
import config from '../config/env';
import { ApiError, asyncHandler } from '../utils/apiError';

/*
 * Voice receptionist call logs, read live from Sarvam's analytics API. Nothing
 * is copied into our database. Each hospital only ever queries its own Sarvam
 * agent (picked from req.user.tenantId), so one hospital can never list or
 * play another hospital's calls. The Sarvam key stays on the server.
 */

interface SarvamInteraction {
  interaction_id: string;
  start_datetime: string;
  end_datetime: string;
  duration_in_seconds: number;
  language_name: string;
  num_messages: number;
  user_contact_masked?: string;
  ended_by?: string;
  agent_variables?: Record<string, string>;
}

// Sarvam ids look like "20261009/dd5bae75-19:12:42-f51c4993".
const INTERACTION_ID = /^[\w:/-]{8,100}$/;
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
// Sarvam sends UTC without a zone suffix.
const utc = (value: string) => new Date(value.endsWith('Z') ? value : `${value}Z`);

const sarvam = async (tenantId: string, path: string) => {
  const app = config.sarvam.apps[tenantId];
  if (!app || !config.sarvam.apiKey) throw ApiError.notFound('Voice call logs are not set up for this hospital');
  const response = await fetch(`https://apps.sarvam.ai/api/analytics/v1/${app}/${path}`, {
    headers: { 'X-API-Key': config.sarvam.apiKey }
  });
  if (response.status === 404 || response.status === 422) throw ApiError.notFound('Call not found');
  if (!response.ok) throw new ApiError(502, `Sarvam returned ${response.status}`);
  return response;
};

const listInteractions = async (tenantId: string, from: Date, to: Date, limit: number, offset: number) => {
  const cutoff = config.sarvam.callsVisibleFrom;
  if (cutoff && !Number.isNaN(cutoff.getTime()) && from < cutoff) from = cutoff;
  if (from > to) return { items: [], total: 0 };
  const query = new URLSearchParams({
    start_datetime: from.toISOString().slice(0, 19),
    end_datetime: to.toISOString().slice(0, 19),
    limit: String(limit),
    offset: String(offset),
    sort_by: 'start_datetime',
    sort_order: 'desc'
  });
  return (await (await sarvam(tenantId, `interactions?${query}`)).json()) as { items: SarvamInteraction[]; total: number };
};

const toCall = (item: SarvamInteraction) => ({
  id: item.interaction_id,
  startedAt: utc(item.start_datetime),
  endedAt: utc(item.end_datetime),
  durationSeconds: Math.round(item.duration_in_seconds),
  language: item.language_name,
  messages: item.num_messages,
  caller: item.user_contact_masked || null,
  endedBy: item.ended_by || null,
  summary: item.agent_variables?.call_summary || null
});

// A voice booking is saved while its call is live, so it belongs to the call
// whose window contains its createdAt (plus a little slack for clock skew).
const SLACK_MS = 90 * 1000;
const belongsTo = (call: ReturnType<typeof toCall>, createdAt: Date) =>
  createdAt.getTime() >= call.startedAt.getTime() - SLACK_MS && createdAt.getTime() <= call.endedAt.getTime() + SLACK_MS;

const voiceAppointments = (tenantId: string, from: Date, to: Date) =>
  // `source` missing = booked before the field existed; staff bookings are 'Staff'.
  Appointment.find({ tenantId, source: { $ne: 'Staff' }, createdAt: { $gte: from, $lte: to } }).select('appointmentId createdAt');

/** GET /api/calls?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1 (dates are IST days) */
export const listCalls = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 10);
  const fromDay = isoDay.test(String(req.query.from)) ? String(req.query.from) : today;
  const toDay = isoDay.test(String(req.query.to)) ? String(req.query.to) : today;
  const from = new Date(`${fromDay}T00:00:00+05:30`);
  const to = new Date(`${toDay}T23:59:59+05:30`);
  if (from > to) throw ApiError.badRequest('"from" must be on or before "to"');

  const limit = 20;
  const page = Math.max(1, Number(req.query.page) || 1);
  const { items, total } = await listInteractions(tenantId, from, to, limit, (page - 1) * limit);
  const calls = items.map(toCall);

  const booked = await voiceAppointments(tenantId, new Date(from.getTime() - SLACK_MS), new Date(to.getTime() + SLACK_MS));
  res.json({
    success: true,
    calls: calls.map((call) => ({
      ...call,
      appointments: booked.filter((a) => belongsTo(call, a.createdAt)).map((a) => ({ _id: a._id, appointmentId: a.appointmentId }))
    })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  });
});

/** GET /api/calls/for-appointment/:id - the call that booked this appointment, if any. */
export const callForAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).catch(() => null);
  if (!appointment) throw ApiError.notFound('Appointment not found');

  let call = null;
  if (appointment.source !== 'Staff') {
    // ponytail: assumes a booking call is under 30 minutes; widen the window if calls run longer.
    const around = appointment.createdAt.getTime();
    const { items } = await listInteractions(req.user.tenantId, new Date(around - 30 * 60 * 1000), new Date(around + SLACK_MS), 50, 0);
    call = items.map(toCall).find((c) => belongsTo(c, appointment.createdAt)) || null;
  }
  res.json({ success: true, call });
});

const interactionId = (value: unknown) => {
  const id = String(value || '');
  if (!INTERACTION_ID.test(id)) throw ApiError.badRequest('Invalid call id');
  return encodeURIComponent(id);
};

/** GET /api/calls/transcript?id= */
export const getTranscript = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const id = String(req.query.id);
  const cached = await CallTranscript.findOne({ tenantId, interactionId: id }).lean();
  if (cached) return res.json({ success: true, messages: cached.messages });

  const data = (await (await sarvam(tenantId, `transcripts/${interactionId(req.query.id)}`)).json()) as {
    messages?: { role: string; content: string }[];
  };
  const raw = (data.messages || []).map((m) => ({ role: m.role === 'assistant' ? 'agent' : 'caller', text: m.content }));

  // Shown in English whatever language the call was in; the original is kept for "show original".
  let complete = Boolean(config.sarvam.translateKey);
  const messages = complete
    ? await mapLimit(raw, 8, async (m) => {
        if (!needsTranslation(m.text)) return m;
        try {
          return { ...m, text: await toEnglish(m.text), original: m.text };
        } catch {
          complete = false;
          return m;
        }
      })
    : raw;

  // Only a fully translated transcript is cached, so a hiccup is retried on the next open.
  if (complete && messages.length) {
    await CallTranscript.updateOne({ tenantId, interactionId: id }, { $set: { messages } }, { upsert: true }).catch(() => {});
  }
  res.json({ success: true, messages });
});

/** GET /api/calls/recording?id= - streams the WAV so the Sarvam key never reaches the browser. */
export const getRecording = asyncHandler(async (req, res) => {
  const upstream = await sarvam(req.user.tenantId, `recordings/${interactionId(req.query.id)}`);
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/wav');
  const length = upstream.headers.get('content-length');
  if (length) res.setHeader('Content-Length', length);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res);
});
