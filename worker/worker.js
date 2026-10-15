/* ============================================================
   Lone Star ITS Private AI — quote request Worker
   POST /api/quote → Jira Service Management ticket (LSAR)
                   → HubSpot lead (optional, background)
   ============================================================ */

const ALLOWED_ORIGINS = new Set([
  'https://elspaniard97.github.io',
]);

const MAX_REQUEST_BYTES = 16 * 1024;

const JIRA_BASE_URL = 'https://lonestar-its.atlassian.net';
const JSM_PROJECT_KEY = 'LSAR';
const HUBSPOT_PORTAL_ID = '246524006';

const ALLOWED_TEAM_SIZES = new Set([
  '5-10 users (Office AI)',
  '15-30 users (Business AI)',
  '30+ users (Enterprise AI)',
  'Not sure',
]);

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://elspaniard97.github.io';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...SECURITY_HEADERS,
      ...corsHeaders(request),
    },
  });
}

function isAllowedSource(request) {
  const origin = request.headers.get('Origin') || '';
  if (origin) return ALLOWED_ORIGINS.has(origin);
  const referer = request.headers.get('Referer') || '';
  if (!referer) return false;
  try {
    const ref = new URL(referer);
    return ALLOWED_ORIGINS.has(`${ref.protocol}//${ref.host}`);
  } catch (_) {
    return false;
  }
}

async function checkRateLimit(env, request) {
  if (!env.RATE_LIMITER) return true;
  const key = request.headers.get('CF-Connecting-IP') || 'anonymous';
  try {
    const { success } = await env.RATE_LIMITER.limit({ key });
    return success !== false;
  } catch (err) {
    console.error('Rate limit check failed', err?.message || err);
    return true;
  }
}

async function readBoundedJson(request) {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return { error: { status: 413, message: 'Request body is too large.' } };
  }
  let buffer;
  try {
    buffer = await request.arrayBuffer();
  } catch (_) {
    return { error: { status: 400, message: 'Invalid request body.' } };
  }
  if (buffer.byteLength > MAX_REQUEST_BYTES) {
    return { error: { status: 413, message: 'Request body is too large.' } };
  }
  try {
    return { value: JSON.parse(new TextDecoder().decode(buffer)) };
  } catch (_) {
    return { error: { status: 400, message: 'Invalid JSON request body.' } };
  }
}

export function sanitizeQuoteInput(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const trim = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const fields = {
    name:     trim(payload.name,     200),
    email:    trim(payload.email,    254),
    company:  trim(payload.company,  200),
    phone:    trim(payload.phone,     40),
    teamSize: trim(payload.teamSize, 100),
    message:  trim(payload.message, 4000),
  };

  if (!fields.name || !fields.email || !fields.company || !fields.teamSize) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email)) return null;
  if (fields.phone && !/^[0-9+().\-\s]{7,40}$/.test(fields.phone)) return null;
  if (!ALLOWED_TEAM_SIZES.has(fields.teamSize)) return null;
  return fields;
}

let cachedServiceDeskId = null;
let cachedRequestTypeId = null;

function basicAuth(env) {
  return btoa(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`);
}

async function discoverJsmIds(env) {
  if (cachedServiceDeskId && cachedRequestTypeId) {
    return { serviceDeskId: cachedServiceDeskId, requestTypeId: cachedRequestTypeId };
  }
  const headers = { Authorization: `Basic ${basicAuth(env)}`, Accept: 'application/json' };

  const sdRes = await fetch(`${JIRA_BASE_URL}/rest/servicedeskapi/servicedesk?limit=50`, { headers });
  if (!sdRes.ok) throw new Error(`Failed to list service desks: ${sdRes.status}`);
  const sdData = await sdRes.json();
  const lsar = (sdData.values || []).find((sd) => sd.projectKey === JSM_PROJECT_KEY);
  if (!lsar) throw new Error(`Service desk for project ${JSM_PROJECT_KEY} not found`);

  const rtRes = await fetch(`${JIRA_BASE_URL}/rest/servicedeskapi/servicedesk/${lsar.id}/requesttype?limit=50`, { headers });
  if (!rtRes.ok) throw new Error(`Failed to list request types: ${rtRes.status}`);
  const rtData = await rtRes.json();
  const requestTypes = rtData.values || [];
  const rt =
    requestTypes.find((t) => /service request|general/i.test(t.name)) ||
    requestTypes[0];
  if (!rt) throw new Error('No request types available in LSAR');

  cachedServiceDeskId = String(lsar.id);
  cachedRequestTypeId = String(rt.id);
  return { serviceDeskId: cachedServiceDeskId, requestTypeId: cachedRequestTypeId };
}

async function createQuoteTicket(fields, env) {
  if (!env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
    return { ok: false, error: 'JSM credentials not configured' };
  }

  let ids;
  try {
    ids = await discoverJsmIds(env);
  } catch (err) {
    console.error('JSM discovery failed', err?.message || err);
    return { ok: false, error: 'JSM discovery failed' };
  }

  const summary = `Private AI quote: ${fields.company} — ${fields.teamSize}`.slice(0, 200);
  const description = [
    'New Private AI quote request.',
    '',
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Company: ${fields.company}`,
    `Phone: ${fields.phone || 'not given'}`,
    `Team size: ${fields.teamSize}`,
    '',
    'Message:',
    fields.message || '(none)',
    '',
    '— Submitted from https://elspaniard97.github.io/custom-ai-models/contact.html',
  ].join('\n');

  try {
    const res = await fetch(`${JIRA_BASE_URL}/rest/servicedeskapi/request`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth(env)}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        serviceDeskId: ids.serviceDeskId,
        requestTypeId: ids.requestTypeId,
        requestFieldValues: { summary, description },
        raiseOnBehalfOf: fields.email,
      }),
    });
    if (!res.ok) {
      console.error('JSM request creation failed', res.status, await res.text().catch(() => ''));
      return { ok: false, error: 'JSM ticket creation failed' };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, key: data.issueKey || null };
  } catch (err) {
    console.error('JSM fetch threw', err?.message || err);
    return { ok: false, error: 'JSM upstream error' };
  }
}

async function submitToHubSpot(fields, request, env) {
  if (!env.HUBSPOT_FORM_GUID) return;
  const url = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${env.HUBSPOT_FORM_GUID}`;
  const payload = {
    submittedAt: Date.now(),
    fields: [
      { objectTypeId: '0-1', name: 'firstname', value: fields.name },
      { objectTypeId: '0-1', name: 'email',     value: fields.email },
      { objectTypeId: '0-1', name: 'company',   value: fields.company },
      { objectTypeId: '0-1', name: 'phone',     value: fields.phone },
      { objectTypeId: '0-1', name: 'message',   value: `Private AI quote (${fields.teamSize}). ${fields.message}`.trim() },
    ].filter((f) => f.value),
    context: {
      pageUri:  request.headers.get('Referer') || 'https://elspaniard97.github.io/custom-ai-models/contact.html',
      pageName: 'Request a Quote | Lone Star ITS Private AI',
    },
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('HubSpot submission failed', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('HubSpot fetch threw', err?.message || err);
  }
}

async function handleQuote(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...corsHeaders(request) } });
  }
  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'Method not allowed' }, 405);
  }
  if (!isAllowedSource(request)) {
    return jsonResponse(request, { error: 'Forbidden' }, 403);
  }
  if (!(await checkRateLimit(env, request))) {
    return jsonResponse(request, { error: 'Too many requests. Please wait a moment and try again.' }, 429);
  }

  const parsed = await readBoundedJson(request);
  if (parsed.error) {
    return jsonResponse(request, { error: parsed.error.message }, parsed.error.status);
  }

  // Honeypot filled in: pretend success so bots learn nothing.
  if (parsed.value && typeof parsed.value._gotcha === 'string' && parsed.value._gotcha.trim()) {
    return jsonResponse(request, { ok: true });
  }

  const fields = sanitizeQuoteInput(parsed.value);
  if (!fields) {
    return jsonResponse(request, { error: 'Please fill in your name, email, company and team size.' }, 400);
  }

  const hubspot = submitToHubSpot(fields, request, env);
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(hubspot);

  const result = await createQuoteTicket(fields, env);
  if (!result.ok) {
    return jsonResponse(
      request,
      { error: "Sorry — we couldn't send your request. Please email support@lonestar-its.com or call (254) 317-9258." },
      502,
    );
  }
  return jsonResponse(request, { ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/quote') {
      return handleQuote(request, env, ctx);
    }
    return jsonResponse(request, { error: 'Not found' }, 404);
  },
};
