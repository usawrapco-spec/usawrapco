import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// ── USA Wrap Co — send-email edge function ───────────────────────
// Sends branded transactional email via Resend.
//
// Required secrets (set via `supabase secrets set`):
//   RESEND_API_KEY=re_...
//
// Called from /api/inbox/send with header:
//   x-internal-secret: <INTERNAL_SECRET env var>
//
// Request body:
//   { to, subject, html, cc?, bcc?, reply_to? }
//
// Response:
//   { id: "resend-message-id" }  on success
//   { error: "message" }         on failure

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = 'USA Wrap Co <shop@usawrapco.com>'
const REPLY_TO = 'shop@usawrapco.com'
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET') ?? 'usawrapco-internal'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

Deno.serve(async (req: Request) => {
  // ── CORS preflight ───────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-internal-secret, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Auth: internal secret ────────────────────────────────────────
  const secret = req.headers.get('x-internal-secret')
  if (secret !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Parse body ───────────────────────────────────────────────────
  let body: {
    to: string
    subject: string
    html: string
    cc?: string[]
    bcc?: string[]
    reply_to?: string
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { to, subject, html, cc, bcc, reply_to } = body

  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'Missing to, subject, or html' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Build Resend payload ─────────────────────────────────────────
  const payload: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
    reply_to: reply_to || REPLY_TO,
    // Open & click tracking enabled by default when domain is verified in Resend
    // Resend fires email.opened / email.clicked webhooks to your registered webhook URL
  }
  if (cc && cc.length > 0) payload.cc = cc
  if (bcc && bcc.length > 0) payload.bcc = bcc

  // ── Call Resend API ──────────────────────────────────────────────
  let resendRes: Response
  try {
    resendRes = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[send-email] Resend fetch error:', err)
    return new Response(JSON.stringify({ error: 'Resend API unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resendData = await resendRes.json()

  if (!resendRes.ok) {
    console.error('[send-email] Resend error:', resendData)
    return new Response(JSON.stringify({ error: resendData?.message || 'Resend API error', resend: resendData }), {
      status: resendRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log('[send-email] Sent OK — id:', resendData.id, 'to:', to)
  return new Response(JSON.stringify({ id: resendData.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
