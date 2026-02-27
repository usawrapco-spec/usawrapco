import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    // Require authenticated user (team member sending the link)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { project_id } = await req.json()
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Load project + customer info
    const { data: project, error: projErr } = await admin
      .from('projects')
      .select('id, title, portal_token, vehicle_desc, install_date, customer_id, org_id')
      .eq('id', project_id)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.customer_id) {
      return NextResponse.json({ error: 'No customer linked to this project' }, { status: 400 })
    }

    const { data: customer } = await admin
      .from('customers')
      .select('name, email, phone')
      .eq('id', project.customer_id)
      .single()

    if (!customer?.email) {
      return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 })
    }

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'}/portal/${project.portal_token}`
    const installDate = project.install_date
      ? new Date(project.install_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null

    // Send via Resend
    const RESEND_KEY = process.env.RESEND_API_KEY
    if (!RESEND_KEY) {
      return NextResponse.json({ error: 'Email not configured (no RESEND_API_KEY)' }, { status: 503 })
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Inter, system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
  .card { background: #fff; border-radius: 16px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .header { background: #0d0f14; padding: 28px 32px; text-align: center; }
  .logo { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: 2px; font-family: Georgia, serif; }
  .body { padding: 32px; }
  h2 { font-size: 22px; color: #0f172a; margin: 0 0 12px; }
  p { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
  .btn { display: inline-block; background: #4f7fff; color: #fff !important; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; margin: 8px 0 20px; }
  .meta { background: #f8fafc; border-radius: 10px; padding: 16px; margin: 20px 0; }
  .meta-row { display: flex; gap: 12px; margin-bottom: 8px; font-size: 13px; color: #64748b; }
  .meta-row:last-child { margin-bottom: 0; }
  .meta-label { font-weight: 600; color: #0f172a; min-width: 90px; }
  .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">USA WRAP CO</div>
    <div style="color:#9299b5; font-size:13px; margin-top:6px;">Customer Portal</div>
  </div>
  <div class="body">
    <h2>Your job portal is ready, ${customer.name?.split(' ')[0] || 'there'}!</h2>
    <p>We've set up your personal portal where you can track your project, review and approve the design, view photos, and send messages to the team — all in one place.</p>

    <div class="meta">
      <div class="meta-row"><span class="meta-label">Job:</span> ${project.title}</div>
      ${project.vehicle_desc ? `<div class="meta-row"><span class="meta-label">Vehicle:</span> ${project.vehicle_desc}</div>` : ''}
      ${installDate ? `<div class="meta-row"><span class="meta-label">Install Date:</span> ${installDate}</div>` : ''}
    </div>

    <div style="text-align:center">
      <a href="${portalUrl}" class="btn">Open My Portal</a>
    </div>

    <p style="font-size:13px; color:#94a3b8;">You can also copy this link: <a href="${portalUrl}" style="color:#4f7fff; word-break:break-all;">${portalUrl}</a></p>
    <p style="font-size:13px; color:#94a3b8;">This link is unique to your job. Please don't share it publicly.</p>
  </div>
  <div class="footer">
    USA Wrap Co &bull; 4124 124th St NW, Gig Harbor, WA 98332<br>
    253-525-8148 &bull; sales@usawrapco.com
  </div>
</div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'USA Wrap Co <noreply@usawrapco.com>',
        to: customer.email,
        subject: `Your project portal — ${project.title}`,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      console.error('[portal/send-link] Resend error:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
    }

    // Log in activity
    await admin.from('activity_log').insert({
      org_id: project.org_id,
      actor_id: user.id,
      entity_type: 'project',
      entity_id: project_id,
      action: 'portal_link_sent',
      details: { customer_email: customer.email },
    }).then(() => {}) // fire-and-forget

    return NextResponse.json({ ok: true, email: customer.email })
  } catch (err) {
    console.error('[portal/send-link]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
