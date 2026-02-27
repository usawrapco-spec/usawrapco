import { getSupabaseAdmin } from '@/lib/supabase/service'
import { sendTransactionalEmail } from '@/lib/email/send'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name,
      company,
      email,
      phone,
      vehicleType,
      industry,
      avgJobValue,
      numVehicles,
      primaryCity,
      routeWaypoints,
      estimatedDailyImpressions,
      projectedMonthlyLeads,
      projectedAnnualRevenue,
      projectedRoiMultiplier,
    } = body

    if (!email && !phone) {
      return Response.json({ error: 'Email or phone required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const trackingCode = generateTrackingCode()

    const { data: lead, error } = await admin.from('wrap_leads').insert({
      org_id: ORG_ID,
      name,
      company,
      email,
      phone,
      vehicle_type: vehicleType,
      industry,
      avg_job_value: avgJobValue,
      num_vehicles: numVehicles || 1,
      primary_city: primaryCity,
      route_waypoints: routeWaypoints || [],
      estimated_daily_impressions: estimatedDailyImpressions || 0,
      tracking_code: trackingCode,
      projected_monthly_leads: projectedMonthlyLeads || 0,
      projected_annual_revenue: projectedAnnualRevenue || 0,
      projected_roi_multiplier: projectedRoiMultiplier || 0,
      status: 'new',
    }).select().single()

    if (error) {
      console.error('[ROI Submit] Insert error:', error)
      return Response.json({ error: 'Failed to submit' }, { status: 500 })
    }

    // Send confirmation email (non-blocking)
    if (email) {
      sendTransactionalEmail({
        to: email,
        toName: name || undefined,
        subject: `Your Wrap ROI Report - ${trackingCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f7fff;">Your Wrap ROI Report</h2>
            <p>Hi ${name || 'there'},</p>
            <p>Thanks for using our ROI calculator! Here's your tracking code:</p>
            <div style="background: #f0f4ff; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
              <div style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #4f7fff;">
                ${trackingCode}
              </div>
              <p style="color: #666; font-size: 13px; margin-top: 8px;">
                This code will be placed on your wrap for tracking
              </p>
            </div>
            <h3>Your Projected Numbers</h3>
            <ul>
              <li><strong>Monthly Leads:</strong> ${projectedMonthlyLeads || 'TBD'}</li>
              <li><strong>Annual Revenue:</strong> $${(projectedAnnualRevenue || 0).toLocaleString()}</li>
              <li><strong>ROI Multiplier:</strong> ${projectedRoiMultiplier || 'TBD'}x</li>
            </ul>
            <p>Our team will reach out within 24 hours to discuss your wrap project.</p>
            <p style="margin-top: 30px;">
              <a href="https://usawrapco.com/book" style="background: #22c07a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Book Your Wrap
              </a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">USA Wrap Co - Vehicle Wraps That Work</p>
          </div>
        `,
        emailType: 'roi_lead',
      }).catch(err => console.error('[ROI Submit] Email error:', err))
    }

    return Response.json({
      leadId: lead.id,
      trackingCode,
    })
  } catch (err) {
    console.error('[ROI Submit] Error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
