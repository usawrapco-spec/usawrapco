import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { session_token } = await req.json()
    if (!session_token) return NextResponse.json({ error: 'session_token required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    const { data: session } = await admin
      .from('wrap_funnel_sessions')
      .select('*')
      .eq('session_token', session_token)
      .maybeSingle()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // --- 1. Upsert customer ---
    let customerId: string | null = null
    if (session.contact_email) {
      const { data: existing } = await admin
        .from('customers')
        .select('id')
        .eq('org_id', ORG_ID)
        .eq('email', session.contact_email)
        .maybeSingle()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCust } = await admin.from('customers').insert({
          org_id: ORG_ID,
          name: session.contact_name || session.business_name || 'New Lead',
          email: session.contact_email,
          phone: session.contact_phone,
          company_name: session.business_name,
          lead_source: 'Website Intake',
        }).select('id').single()
        customerId = newCust?.id || null
      }
    }

    // --- 2. Create project ---
    const vehicleDesc = [session.vehicle_year, session.vehicle_make, session.vehicle_model]
      .filter(Boolean).join(' ') || 'Vehicle Wrap'

    const title = session.business_name
      ? `${session.business_name} — ${vehicleDesc}`
      : `${session.contact_name || 'New Lead'} — ${vehicleDesc}`

    const { data: project } = await admin.from('projects').insert({
      org_id: ORG_ID,
      title,
      type: 'wrap',
      status: 'estimate',
      pipe_stage: 'sales_in',
      customer_id: customerId,
      vehicle_desc: vehicleDesc,
      form_data: {
        source: 'Website Intake',
        wrap_funnel_token: session_token,
        vehicle_year: session.vehicle_year,
        vehicle_make: session.vehicle_make,
        vehicle_model: session.vehicle_model,
        vehicle_trim: session.vehicle_trim,
        wrap_coverage: session.wrap_coverage,
        estimated_price_low: session.estimated_price_low,
        estimated_price_high: session.estimated_price_high,
        website_url: session.website_url,
        logo_url: session.logo_url,
        brand_colors: session.brand_colors,
        style_preference: session.style_preference,
        instagram_handle: session.instagram_handle,
        business_description: session.business_description,
        mockup_urls: session.mockup_urls,
        utm_source: session.utm_source,
        utm_medium: session.utm_medium,
        utm_campaign: session.utm_campaign,
      },
    }).select('id').single()

    const projectId = project?.id || null

    // --- 3. Attach mockup images to job ---
    const mockupUrls: string[] = session.mockup_urls || []
    if (projectId && mockupUrls.length > 0) {
      await Promise.all(
        mockupUrls.map((url: string, i: number) =>
          admin.from('job_images').insert({
            org_id: ORG_ID,
            project_id: projectId,
            image_url: url,
            description: `AI Wrap Mockup Preview ${i + 1}`,
          })
        )
      )
    }

    // --- 4. Create task for sales agent ---
    await admin.from('tasks').insert({
      org_id: ORG_ID,
      project_id: projectId,
      title: `Follow up — ${session.contact_name || session.business_name || 'New Web Lead'}`,
      description: `New lead from website funnel. Vehicle: ${vehicleDesc}. Coverage: ${session.wrap_coverage}. Est: $${session.estimated_price_low}–$${session.estimated_price_high}. Website: ${session.website_url || 'N/A'}. Style: ${session.style_preference || 'N/A'}.`,
      type: 'auto',
      status: 'open',
      priority: 'high',
      source: 'wrap_funnel',
    })

    // --- 5. Notify team ---
    await admin.from('notifications').insert({
      org_id: ORG_ID,
      type: 'new_lead',
      title: `New Website Lead: ${session.contact_name || session.business_name || 'Unknown'}`,
      message: `${vehicleDesc} ${session.wrap_coverage ? '— ' + session.wrap_coverage + ' wrap' : ''}. Est $${session.estimated_price_low}–$${session.estimated_price_high}`,
      read: false,
    })

    // --- 6. Update session with CRM refs ---
    await admin.from('wrap_funnel_sessions').update({
      customer_id: customerId,
      project_id: projectId,
      converted_at: new Date().toISOString(),
      step_reached: 5,
      updated_at: new Date().toISOString(),
    }).eq('session_token', session_token)

    // --- 7. Send welcome email with mockups via Resend ---
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && session.contact_email) {
      const firstName = (session.contact_name || '').split(' ')[0] || 'there'
      const mockupHtml = (mockupUrls).slice(0, 3).map((url: string, i: number) =>
        `<img src="${url}" style="width:100%;max-width:480px;border-radius:10px;margin-bottom:16px;display:block;" alt="Wrap Mockup ${i + 1}" />`
      ).join('')

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@usawrapco.com',
          to: [session.contact_email],
          subject: `Your wrap mockup is ready, ${firstName}!`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0c12;color:#e8eaed;padding:32px;border-radius:16px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;margin-bottom:6px;">USA <span style="color:#4f7fff">WRAP</span> CO</div>
    <h1 style="font-size:26px;color:#fff;margin:0 0 8px;">Your Mockup is Ready, ${firstName}!</h1>
    <p style="color:#9299b5;margin:0;">Here's what your ${vehicleDesc} could look like wrapped</p>
  </div>
  ${mockupHtml}
  <div style="background:#13151c;border-radius:12px;padding:20px;margin-top:24px;border:1px solid #1e2230;">
    <p style="margin:0 0 12px;font-weight:700;font-size:15px;">Estimated Price Range</p>
    <p style="margin:0;color:#4f7fff;font-size:24px;font-weight:800;">$${session.estimated_price_low?.toLocaleString() || '—'} – $${session.estimated_price_high?.toLocaleString() || '—'}</p>
    <p style="margin:6px 0 0;color:#9299b5;font-size:13px;">Installed, all-inclusive. Exact quote after consultation.</p>
  </div>
  <div style="background:#13151c;border-radius:12px;padding:20px;margin-top:16px;border:1px solid #1e2230;">
    <p style="margin:0 0 8px;font-weight:700;">What happens next?</p>
    <p style="margin:0;color:#9299b5;font-size:14px;line-height:1.6;">One of our wrap designers will reach out within 1 business hour. We'll review your mockup together, answer any questions, and send you an exact quote. No obligation.</p>
  </div>
  <div style="text-align:center;margin-top:28px;font-size:12px;color:#5a6080;">
    USA Wrap Co — Professional Vehicle Wraps<br>
    <a href="tel:+1" style="color:#4f7fff;text-decoration:none;">Call us anytime</a>
  </div>
</div>`,
        }),
      }).catch(err => console.error('[wrap-funnel/complete] Resend error:', err))
    }

    return NextResponse.json({ ok: true, project_id: projectId, customer_id: customerId })
  } catch (err: any) {
    console.error('[wrap-funnel/complete]', err)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
