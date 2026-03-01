import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const admin = getSupabaseAdmin()

    // 1. Insert intake record
    const { data: intake, error: intakeErr } = await admin
      .from('design_intakes')
      .insert({
        org_id: ORG_ID,
        customer_name: body.name,
        business_name: body.businessName,
        email: body.email,
        phone: body.phone,
        website: body.website || null,
        referral_source: body.referralSource || null,
        services_requested: body.services || [],
        vehicle_details: body.vehicleDetails || null,
        brand_assets: body.brandAssets || null,
        ai_conversation: body.aiConversation || [],
        vision_notes: body.visionNotes || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (intakeErr || !intake) {
      console.error('[design-intakes/submit] intake insert error:', intakeErr)
      return NextResponse.json({ error: 'Failed to save intake' }, { status: 500 })
    }

    // 2. Upsert customer
    let customerId: string | null = null
    if (body.email) {
      const { data: existing } = await admin
        .from('customers')
        .select('id')
        .eq('org_id', ORG_ID)
        .eq('email', body.email)
        .maybeSingle()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCust } = await admin
          .from('customers')
          .insert({
            org_id: ORG_ID,
            name: body.name,
            email: body.email,
            phone: body.phone || null,
            company_name: body.businessName || null,
            business_name: body.businessName || null,
            lead_source: 'design_intake',
            status: 'lead',
          })
          .select('id')
          .single()
        customerId = newCust?.id || null
      }

      if (customerId) {
        await admin
          .from('design_intakes')
          .update({ converted_customer_id: customerId })
          .eq('id', intake.id)
      }
    }

    // 3. Insert notification for team
    await admin.from('notifications').insert({
      org_id: ORG_ID,
      type: 'new_design_intake',
      title: `New Design Intake: ${body.name || body.businessName || 'Unknown'}`,
      message: `${(body.services || []).join(', ')} — ${body.email || 'no email'}`,
      read: false,
    })

    // 4. Send confirmation email via Resend
    if (body.email) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const serviceList = (body.services || [])
          .map((s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()))
          .join(', ')

        await resend.emails.send({
          from: 'USA Wrap Co <hello@usawrapco.com>',
          to: body.email,
          subject: 'We received your project brief — USA Wrap Co',
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">
    <div style="text-align:center;margin-bottom:40px">
      <div style="font-size:28px;font-weight:800;color:#e8eaed;letter-spacing:-0.5px">USA WRAP CO</div>
      <div style="width:48px;height:3px;background:#4f7fff;margin:12px auto 0"></div>
    </div>
    <div style="background:#13151c;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.06)">
      <div style="font-size:24px;font-weight:700;color:#e8eaed;margin-bottom:8px">We got your brief!</div>
      <div style="font-size:16px;color:#9299b5;margin-bottom:32px;line-height:1.6">
        Thanks ${body.name ? body.name.split(' ')[0] : 'there'}, our design team will review your project and reach out within 1 business day.
      </div>
      <div style="background:#1a1d27;border-radius:12px;padding:24px;margin-bottom:24px">
        <div style="font-size:12px;font-weight:600;color:#9299b5;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">What you submitted</div>
        ${body.businessName ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="color:#9299b5;font-size:14px">Business</span><span style="color:#e8eaed;font-size:14px">${body.businessName}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="color:#9299b5;font-size:14px">Services</span><span style="color:#e8eaed;font-size:14px">${serviceList}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0"><span style="color:#9299b5;font-size:14px">Ref #</span><span style="color:#4f7fff;font-size:14px;font-family:monospace">${intake.id.slice(0, 8).toUpperCase()}</span></div>
      </div>
      <div style="text-align:center">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/portal/design?intake_id=${intake.id}"
           style="display:inline-block;background:#4f7fff;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
          View Your Brief →
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:32px;font-size:13px;color:#5a6080">
      USA Wrap Co &mdash; Vehicle &amp; Brand Design Specialists
    </div>
  </div>
</body>
</html>`,
        })
      } catch (emailErr) {
        // Email failure is non-fatal
        console.error('[design-intakes/submit] email error:', emailErr)
      }
    }

    return NextResponse.json({
      id: intake.id,
      customerId,
    })
  } catch (err) {
    console.error('[design-intakes/submit] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
