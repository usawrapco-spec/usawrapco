import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { email, send_sms, phone } = body
    const admin = getSupabaseAdmin()

    // Fetch proposal + estimate + customer
    const { data: proposal } = await admin
      .from('proposals')
      .select('*, estimate:estimates(id, customer_id, title, org_id)')
      .eq('id', params.id)
      .single()

    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

    const proposalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.usawrapco.com'}/proposal/${proposal.public_token}`

    // Update proposal status
    await admin.from('proposals').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)

    // Send email
    let emailSent = false
    if (email) {
      try {
        const emailRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: `Your Vehicle Wrap Proposal from USA Wrap Co`,
            body: `
              <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0f14; color: #e8eaed; padding: 32px; border-radius: 12px;">
                <h1 style="font-family: 'Barlow Condensed', sans-serif; font-size: 24px; margin: 0 0 16px;">USA WRAP CO</h1>
                <p style="color: #9299b5; font-size: 15px; line-height: 1.6;">
                  We've prepared a custom vehicle wrap proposal for you. Click below to view your options, select a package, and secure your spot.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${proposalUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #22c07a, #16a35e); color: #fff; font-weight: 800; font-size: 15px; border-radius: 10px; text-decoration: none;">
                    View Your Proposal
                  </a>
                </div>
                <p style="color: #5a6080; font-size: 12px; text-align: center;">
                  This link is unique to you. Do not share it with others.
                </p>
              </div>
            `,
          }),
        })
        emailSent = emailRes.ok
      } catch {
        console.log('[PROPOSAL] Email send failed, logged')
      }
    }

    // Send SMS if requested
    let smsSent = false
    if (send_sms && phone) {
      try {
        const smsRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/messages/sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            message: `USA Wrap Co: Your vehicle wrap proposal is ready! View it here: ${proposalUrl}`,
          }),
        })
        smsSent = smsRes.ok
      } catch {
        console.log('[PROPOSAL] SMS send failed, logged')
      }
    }

    // Log activity
    await admin.from('activity_log').insert({
      org_id: proposal.estimate?.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
      actor_id: user.id,
      action: 'proposal_sent',
      entity_type: 'proposal',
      entity_id: params.id,
      details: { email, emailSent, smsSent, proposalUrl },
    }).then(() => {})

    return NextResponse.json({ success: true, emailSent, smsSent, proposalUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
