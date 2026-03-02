import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { BRAND } from '@/lib/pdf/brand'

const DOC_LABELS: Record<string, string> = {
  estimate: 'Estimate',
  invoice: 'Invoice',
  workorder: 'Work Order',
  salesorder: 'Sales Order',
}

function fM(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, to_email } = await req.json()
    if (!type || !DOC_LABELS[type]) return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    if (!to_email) return NextResponse.json({ error: 'to_email is required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    const { data: project, error: projErr } = await admin
      .from('projects')
      .select('*, agent:agent_id(name), installer:installer_id(name), customer:customer_id(name,email,phone,company_name)')
      .eq('id', params.id)
      .single()

    if (projErr || !project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const { data: lineItems } = await admin
      .from('line_items')
      .select('description, quantity, unit_price, total')
      .eq('project_id', params.id)
      .order('created_at')

    const customer   = (project.customer ?? {}) as Record<string, any>
    const clientName = customer.name ?? customer.company_name ?? 'Customer'
    const fd         = (project.form_data ?? {}) as Record<string, any>
    const refStr     = project.id.slice(0, 8).toUpperCase()
    const docLabel   = DOC_LABELS[type]

    const subtotal = (lineItems ?? []).reduce((s: number, li: any) => s + Number(li.unit_price ?? li.total ?? 0), 0)
    const taxAmt   = subtotal * 0.081
    const total    = subtotal + taxAmt
    const deposit  = 250
    const balance  = Math.max(0, total - deposit)

    const installStr = project.install_date
      ? new Date(project.install_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD'

    const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    const lineItemsHtml = (lineItems ?? []).map((li: any) => `
      <tr>
        <td style="padding:10px 14px; font-size:13px; color:#0f172a; font-weight:600; border-bottom:1px solid #f1f5f9;">${li.description || 'Service'}</td>
        <td style="padding:10px 14px; font-size:13px; color:#64748b; text-align:center; border-bottom:1px solid #f1f5f9;">${li.quantity ?? 1}</td>
        <td style="padding:10px 14px; font-size:13px; color:#0f172a; font-weight:600; text-align:right; border-bottom:1px solid #f1f5f9; font-family:monospace;">${fM(Number(li.unit_price ?? li.total ?? 0))}</td>
      </tr>
    `).join('') || `<tr><td colspan="3" style="padding:20px; text-align:center; color:#94a3b8;">No line items</td></tr>`

    // Build totals section based on doc type
    let totalsHtml = ''
    if (type === 'estimate') {
      totalsHtml = `
        <tr><td colspan="2" style="padding:8px 14px; text-align:right; color:#64748b; font-size:13px;">Subtotal</td><td style="padding:8px 14px; text-align:right; font-family:monospace; font-size:13px;">${fM(subtotal)}</td></tr>
        <tr><td colspan="2" style="padding:8px 14px; text-align:right; color:#64748b; font-size:13px;">Tax (8.1%)</td><td style="padding:8px 14px; text-align:right; font-family:monospace; font-size:13px;">${fM(taxAmt)}</td></tr>
        <tr style="background:#f8fafc;"><td colspan="2" style="padding:12px 14px; text-align:right; font-weight:800; font-size:15px;">TOTAL</td><td style="padding:12px 14px; text-align:right; font-weight:800; font-size:15px; font-family:monospace; color:#3b82f6;">${fM(total)}</td></tr>
      `
    } else if (type === 'invoice') {
      totalsHtml = `
        <tr><td colspan="2" style="padding:8px 14px; text-align:right; color:#64748b; font-size:13px;">Subtotal</td><td style="padding:8px 14px; text-align:right; font-family:monospace; font-size:13px;">${fM(subtotal)}</td></tr>
        <tr><td colspan="2" style="padding:8px 14px; text-align:right; color:#64748b; font-size:13px;">Tax (8.1%)</td><td style="padding:8px 14px; text-align:right; font-family:monospace; font-size:13px;">${fM(taxAmt)}</td></tr>
        <tr><td colspan="2" style="padding:8px 14px; text-align:right; color:#16a34a; font-size:13px;">Deposit Paid</td><td style="padding:8px 14px; text-align:right; font-family:monospace; font-size:13px; color:#16a34a;">(${fM(deposit)})</td></tr>
        <tr style="background:#fef3c7;"><td colspan="2" style="padding:12px 14px; text-align:right; font-weight:800; font-size:15px;">BALANCE DUE</td><td style="padding:12px 14px; text-align:right; font-weight:800; font-size:15px; font-family:monospace; color:#f59e0b;">${fM(balance)}</td></tr>
      `
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'}/portal/${project.portal_token ?? project.id}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #eef0f5; margin: 0; padding: 40px 20px; }
  .wrap { max-width: 600px; margin: 0 auto; }
  .card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .header { background: #0f172a; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; }
  .brand { color: #fff; font-size: 18px; font-weight: 900; letter-spacing: 1px; }
  .doc-type { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
  .body { padding: 28px 32px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px; }
  .meta-item label { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .meta-item span { font-size: 13px; font-weight: 600; color: #0f172a; }
  .section-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 10px; }
  table.items { width: 100%; border-collapse: collapse; }
  .btn { display: inline-block; background: #4f7fff; color: #fff !important; padding: 13px 28px; border-radius: 9px; font-weight: 700; font-size: 14px; text-decoration: none; }
  .footer { background: #f1f5f9; padding: 18px 32px; text-align: center; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="brand">USA WRAP CO</div>
      <div class="doc-type" style="color:${type === 'estimate' ? '#3b82f6' : type === 'invoice' ? '#f59e0b' : '#22c55e'};">${docLabel.toUpperCase()}</div>
    </div>
    <div class="body">
      <h2 style="margin:0 0 6px; font-size:20px; color:#0f172a;">Hi ${clientName.split(' ')[0]}!</h2>
      <p style="margin:0 0 20px; font-size:14px; color:#64748b; line-height:1.6;">
        ${type === 'estimate' ? `Please find your estimate from USA Wrap Co below. This estimate is valid for 30 days.`
          : type === 'invoice' ? `Your invoice is ready. Please review the balance due and let us know if you have any questions.`
          : `Here is your ${docLabel.toLowerCase()} from USA Wrap Co.`}
      </p>

      <div class="meta">
        <div class="meta-item"><label>Reference</label><span>#${refStr}</span></div>
        <div class="meta-item"><label>Date</label><span>${todayStr}</span></div>
        <div class="meta-item"><label>Vehicle</label><span>${project.vehicle_desc || (fd.vehicle_make ? `${fd.vehicle_year ?? ''} ${fd.vehicle_make} ${fd.vehicle_model ?? ''}`.trim() : 'N/A')}</span></div>
        <div class="meta-item"><label>Install Date</label><span>${installStr}</span></div>
      </div>

      <div class="section-label">Services</div>
      <table class="items">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:9px 14px; text-align:left; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Description</th>
            <th style="padding:9px 14px; text-align:center; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; border-bottom:2px solid #e2e8f0; width:50px;">Qty</th>
            <th style="padding:9px 14px; text-align:right; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; border-bottom:2px solid #e2e8f0; width:110px;">Amount</th>
          </tr>
        </thead>
        <tbody>${lineItemsHtml}</tbody>
        ${totalsHtml ? `<tfoot>${totalsHtml}</tfoot>` : ''}
      </table>

      ${project.portal_token ? `
      <div style="margin-top:24px; text-align:center;">
        <div style="font-size:13px; color:#64748b; margin-bottom:12px;">View your job portal for updates, photos, and more:</div>
        <a href="${portalUrl}" class="btn">Open My Portal</a>
      </div>` : ''}

      <p style="margin:24px 0 0; font-size:12px; color:#94a3b8;">Questions? Reply to this email or call us at ${BRAND.phone}.</p>
    </div>
    <div class="footer">
      ${BRAND.name} · ${BRAND.address}, ${BRAND.city}<br>
      ${BRAND.phone} · ${BRAND.email}
    </div>
  </div>
</div>
</body>
</html>`

    const RESEND_KEY = process.env.RESEND_API_KEY
    if (!RESEND_KEY) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'USA Wrap Co <noreply@usawrapco.com>',
        to: to_email,
        subject: `Your ${docLabel} — ${project.title || project.vehicle_desc || refStr}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('[send-doc] Resend error:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
    }

    // Activity log (fire-and-forget)
    admin.from('activity_log').insert({
      org_id: project.org_id,
      actor_id: user.id,
      entity_type: 'project',
      entity_id: params.id,
      action: `${type}_sent`,
      details: { to_email },
    }).then(() => {}, () => {})

    return NextResponse.json({ ok: true, email: to_email })
  } catch (err) {
    console.error('[send-doc]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
