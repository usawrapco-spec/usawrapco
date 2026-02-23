/**
 * GET /api/estimates/pdf?id=<estimate_id>
 *
 * Returns a branded HTML page for the given estimate.
 * The client opens this URL and calls window.print() to save as PDF.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Types ──────────────────────────────────────────────────────────────────────

interface LineItemRow {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  sort_order: number
  product_type: string | null
  specs: Record<string, unknown> | null
}

interface CustomerRow {
  id: string
  contact_name: string
  company_name?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
}

// ─── Route ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing ?id= parameter' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Load estimate + customer
  const { data: est, error: estErr } = await admin
    .from('estimates')
    .select('*, customer:customer_id(id, contact_name, company_name, email, phone, city, state)')
    .eq('id', id)
    .single()

  if (estErr || !est) {
    return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
  }

  // Load line items
  const { data: rawItems } = await admin
    .from('line_items')
    .select('*')
    .eq('parent_type', 'estimate')
    .eq('parent_id', id)
    .order('sort_order', { ascending: true })

  const lineItems: LineItemRow[] = (rawItems || []) as LineItemRow[]
  const customer: CustomerRow | null = (est.customer as CustomerRow) || null

  // ── Build rolled-up tree ────────────────────────────────────────────────────
  // Items with specs.rolledUp=true and specs.parentItemId are nested under the
  // parent. They still count toward the parent total but display indented.

  interface DisplayItem {
    index: number
    item: LineItemRow
    children: LineItemRow[]
  }

  const rolledUpIds = new Set<string>()
  const childrenMap = new Map<string, LineItemRow[]>()

  for (const li of lineItems) {
    const specs = li.specs as Record<string, unknown> | null
    if (specs?.rolledUp && specs?.parentItemId) {
      rolledUpIds.add(li.id)
      const pid = specs.parentItemId as string
      if (!childrenMap.has(pid)) childrenMap.set(pid, [])
      childrenMap.get(pid)!.push(li)
    }
  }

  const displayItems: DisplayItem[] = []
  let idx = 1
  for (const li of lineItems) {
    if (rolledUpIds.has(li.id)) continue
    displayItems.push({
      index: idx++,
      item: li,
      children: childrenMap.get(li.id) || [],
    })
  }

  // ── Status badge ───────────────────────────────────────────────────────────
  const statusColors: Record<string, { bg: string; text: string }> = {
    draft:    { bg: '#5a608020', text: '#9299b5' },
    sent:     { bg: '#4f7fff18', text: '#4f7fff' },
    accepted: { bg: '#22c07a18', text: '#22c07a' },
    expired:  { bg: '#f59e0b18', text: '#f59e0b' },
    rejected: { bg: '#f25a5a18', text: '#f25a5a' },
    void:     { bg: '#5a608020', text: '#5a6080' },
  }
  const badge = statusColors[est.status] || statusColors.draft

  // ── Render line item rows ──────────────────────────────────────────────────

  function renderLineItemRow(li: LineItemRow, num: string, isChild: boolean): string {
    const indent = isChild ? 'padding-left:28px;' : ''
    const nameStyle = isChild
      ? 'font-size:12px;color:#9299b5;font-weight:500;'
      : 'font-size:13px;color:#e8eaed;font-weight:700;'
    const descStyle = 'font-size:11px;color:#5a6080;margin-top:2px;line-height:1.4;'
    const numStyle = 'font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums;'

    return `
      <tr style="border-bottom:1px solid #2a2d3a;">
        <td style="padding:12px 14px;${indent}vertical-align:top;font-size:12px;color:#5a6080;${numStyle}">${esc(num)}</td>
        <td style="padding:12px 14px;${indent}vertical-align:top;">
          <div style="${nameStyle}">${esc(li.name)}</div>
          ${li.description ? `<div style="${descStyle}">${esc(li.description)}</div>` : ''}
        </td>
        <td style="padding:12px 14px;text-align:center;${numStyle}color:#e8eaed;font-size:13px;vertical-align:top;">${li.quantity}</td>
        <td style="padding:12px 14px;text-align:right;${numStyle}color:#9299b5;font-size:13px;vertical-align:top;">${fmtMoney(li.unit_price)}</td>
        <td style="padding:12px 14px;text-align:right;${numStyle}color:#e8eaed;font-size:13px;font-weight:700;vertical-align:top;">${fmtMoney(li.total_price)}</td>
      </tr>`
  }

  let lineItemsHtml = ''
  for (const di of displayItems) {
    lineItemsHtml += renderLineItemRow(di.item, String(di.index), false)
    for (let c = 0; c < di.children.length; c++) {
      lineItemsHtml += renderLineItemRow(di.children[c], `${di.index}.${c + 1}`, true)
    }
  }

  // ── Customer location ──────────────────────────────────────────────────────
  const custLocation = [customer?.city, customer?.state].filter(Boolean).join(', ')

  // ── Build HTML ─────────────────────────────────────────────────────────────

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Estimate QT #${est.estimate_number} - USA WRAP CO</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg: #0d0f14;
    --surface: #13151c;
    --surface2: #1a1d27;
    --text1: #e8eaed;
    --text2: #9299b5;
    --text3: #5a6080;
    --accent: #4f7fff;
    --green: #22c07a;
    --red: #f25a5a;
    --border: #2a2d3a;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--bg);
    color: var(--text1);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .page {
    max-width: 820px;
    margin: 0 auto;
    padding: 40px 36px 60px;
  }

  /* ─── Header ─────────────────────────────────────────────────────── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--border);
  }
  .logo-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 32px;
    letter-spacing: 0.04em;
    color: var(--text1);
    line-height: 1;
  }
  .logo-accent {
    color: var(--accent);
  }
  .company-info {
    font-size: 12px;
    color: var(--text3);
    line-height: 1.7;
  }
  .company-info a {
    color: var(--accent);
    text-decoration: none;
  }

  .est-meta {
    text-align: right;
  }
  .est-number {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 26px;
    color: var(--text1);
    letter-spacing: 0.02em;
    margin-bottom: 6px;
  }
  .est-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 10px;
  }
  .est-dates {
    font-size: 12px;
    color: var(--text3);
    line-height: 1.8;
  }
  .est-dates strong {
    color: var(--text2);
    font-weight: 600;
  }

  /* ─── Info Blocks ────────────────────────────────────────────────── */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 32px;
  }
  .info-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
  }
  .info-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text3);
    margin-bottom: 12px;
  }
  .info-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--text1);
    margin-bottom: 4px;
    font-family: 'Barlow Condensed', sans-serif;
  }
  .info-detail {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.7;
  }

  /* ─── Title / Notes ─────────────────────────────────────────────── */
  .estimate-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 18px;
    color: var(--text1);
    margin-bottom: 8px;
  }
  .estimate-notes {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.7;
    margin-bottom: 28px;
    padding: 14px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
  }

  /* ─── Line Items Table ──────────────────────────────────────────── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 28px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .items-table thead th {
    background: var(--surface2);
    padding: 12px 14px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
    border-bottom: 1px solid var(--border);
  }
  .items-table thead th:first-child { text-align: left; width: 40px; }
  .items-table thead th:nth-child(2) { text-align: left; }
  .items-table thead th:nth-child(3) { text-align: center; width: 60px; }
  .items-table thead th:nth-child(4) { text-align: right; width: 110px; }
  .items-table thead th:nth-child(5) { text-align: right; width: 110px; }

  /* ─── Totals ────────────────────────────────────────────────────── */
  .totals-block {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 36px;
  }
  .totals-inner {
    width: 320px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px 22px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
  }
  .totals-row .label { color: var(--text2); }
  .totals-row .value {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--text1);
  }
  .totals-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 8px 0;
  }
  .totals-row.total .label {
    font-size: 16px;
    font-weight: 800;
    color: var(--text1);
    font-family: 'Barlow Condensed', sans-serif;
  }
  .totals-row.total .value {
    font-size: 22px;
    font-weight: 900;
    color: var(--green);
  }

  /* ─── Customer Note ─────────────────────────────────────────────── */
  .customer-note {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 28px;
  }
  .customer-note .note-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .customer-note p {
    font-size: 13px;
    color: var(--text2);
    line-height: 1.7;
  }

  /* ─── Terms ─────────────────────────────────────────────────────── */
  .terms {
    border-top: 1px solid var(--border);
    padding-top: 24px;
    margin-top: 8px;
  }
  .terms-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 800;
    font-size: 14px;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 10px;
  }
  .terms-text {
    font-size: 11px;
    color: var(--text3);
    line-height: 1.8;
  }

  /* ─── Footer ────────────────────────────────────────────────────── */
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    text-align: center;
    font-size: 11px;
    color: var(--text3);
    line-height: 1.8;
  }
  .footer strong {
    color: var(--text2);
    font-weight: 700;
  }

  /* ─── Print Styles ──────────────────────────────────────────────── */
  @media print {
    @page {
      size: letter;
      margin: 0.5in 0.6in;
    }
    body {
      background: #0d0f14 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .page {
      padding: 0;
      max-width: none;
    }
    .no-print { display: none !important; }
    .items-table { page-break-inside: avoid; }
    .totals-block { page-break-inside: avoid; }
    .terms { page-break-inside: avoid; }
  }

  /* ─── Responsive ────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .page { padding: 20px 16px 40px; }
    .header { flex-direction: column; gap: 20px; }
    .est-meta { text-align: left; }
    .info-grid { grid-template-columns: 1fr; }
    .totals-inner { width: 100%; }
  }
</style>
</head>
<body>

<!-- Print button (hidden on print) -->
<div class="no-print" style="position:fixed;top:16px;right:16px;z-index:100;">
  <button onclick="window.print()" style="
    display:inline-flex;align-items:center;gap:8px;
    padding:10px 20px;border-radius:8px;border:1px solid var(--border);
    background:var(--accent);color:#fff;font-size:13px;font-weight:700;
    font-family:'Barlow Condensed',sans-serif;letter-spacing:0.03em;cursor:pointer;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Print / Save PDF
  </button>
</div>

<div class="page">
  <!-- ═══════════════ HEADER ═══════════════ -->
  <div class="header">
    <div class="logo-block">
      <div class="logo">USA <span class="logo-accent">WRAP</span> CO</div>
      <div class="company-info">
        5678 Wrap Dr, Tacoma WA 98402<br/>
        (253) 555-WRAP<br/>
        <a href="mailto:info@usawrapco.com">info@usawrapco.com</a><br/>
        <a href="https://usawrapco.com">usawrapco.com</a>
      </div>
    </div>
    <div class="est-meta">
      <div class="est-number">QT #${est.estimate_number}</div>
      <div class="est-badge" style="background:${badge.bg};color:${badge.text};">
        ${esc((est.status || 'draft').toUpperCase())}
      </div>
      <div class="est-dates">
        <strong>Date:</strong> ${fmtDate(est.quote_date)}<br/>
        <strong>Valid Until:</strong> ${fmtDate(est.due_date)}
      </div>
    </div>
  </div>

  <!-- ═══════════════ CUSTOMER + ESTIMATE INFO ═══════════════ -->
  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">Bill To</div>
      <div class="info-name">${esc(customer?.contact_name || 'Customer')}</div>
      <div class="info-detail">
        ${customer?.company_name ? `${esc(customer.company_name)}<br/>` : ''}
        ${customer?.email ? `${esc(customer.email)}<br/>` : ''}
        ${customer?.phone ? `${esc(customer.phone)}<br/>` : ''}
        ${custLocation ? `${esc(custLocation)}` : ''}
      </div>
    </div>
    <div class="info-card">
      <div class="info-label">Estimate Details</div>
      <div class="info-detail">
        <strong style="color:var(--text1);">Estimate:</strong> QT #${est.estimate_number}<br/>
        <strong style="color:var(--text1);">Issue Date:</strong> ${fmtDate(est.quote_date)}<br/>
        <strong style="color:var(--text1);">Due Date:</strong> ${fmtDate(est.due_date)}<br/>
        <strong style="color:var(--text1);">Division:</strong> ${esc((est.division || 'wraps').charAt(0).toUpperCase() + (est.division || 'wraps').slice(1))}
      </div>
    </div>
  </div>

  ${est.title ? `<div class="estimate-title">${esc(est.title)}</div>` : ''}
  ${est.notes ? `<div class="estimate-notes">${esc(est.notes)}</div>` : ''}

  <!-- ═══════════════ LINE ITEMS ═══════════════ -->
  <table class="items-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Item / Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml || `
      <tr>
        <td colspan="5" style="padding:24px;text-align:center;color:var(--text3);font-size:13px;">
          No line items
        </td>
      </tr>`}
    </tbody>
  </table>

  <!-- ═══════════════ TOTALS ═══════════════ -->
  <div class="totals-block">
    <div class="totals-inner">
      <div class="totals-row">
        <span class="label">Subtotal</span>
        <span class="value">${fmtMoney(Number(est.subtotal) || 0)}</span>
      </div>
      ${Number(est.discount) > 0 ? `
      <div class="totals-row">
        <span class="label">Discount</span>
        <span class="value" style="color:var(--red);">-${fmtMoney(Number(est.discount))}</span>
      </div>` : ''}
      ${Number(est.tax_amount) > 0 ? `
      <div class="totals-row">
        <span class="label">Tax${Number(est.tax_rate) > 0 ? ` (${(Number(est.tax_rate) * 100).toFixed(2)}%)` : ''}</span>
        <span class="value">${fmtMoney(Number(est.tax_amount))}</span>
      </div>` : ''}
      <hr class="totals-divider" />
      <div class="totals-row total">
        <span class="label">Total</span>
        <span class="value">${fmtMoney(Number(est.total) || 0)}</span>
      </div>
    </div>
  </div>

  ${est.customer_note ? `
  <!-- ═══════════════ CUSTOMER NOTE ═══════════════ -->
  <div class="customer-note">
    <div class="note-label">Note for Customer</div>
    <p>${esc(est.customer_note)}</p>
  </div>` : ''}

  <!-- ═══════════════ TERMS ═══════════════ -->
  <div class="terms">
    <div class="terms-title">Terms & Conditions</div>
    <div class="terms-text">
      This estimate is valid for 30 days from the date of issue. A 50% deposit is required to schedule production
      and begin work. Remaining balance is due upon completion before vehicle release. Prices are subject to change
      if the scope of work is modified. All materials and workmanship are covered by our standard warranty. Vehicle
      must be delivered in clean condition, free of heavy dirt and debris. USA Wrap Co is not responsible for
      pre-existing paint damage or clear coat failure. Cancellation after production has begun may incur material
      charges. By accepting this estimate, you authorize USA Wrap Co to perform the work described above.
    </div>
  </div>

  <!-- ═══════════════ FOOTER ═══════════════ -->
  <div class="footer">
    <strong>USA WRAP CO</strong><br/>
    5678 Wrap Dr, Tacoma WA 98402 &nbsp;|&nbsp; (253) 555-WRAP &nbsp;|&nbsp; info@usawrapco.com &nbsp;|&nbsp; usawrapco.com
  </div>
</div>

</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
