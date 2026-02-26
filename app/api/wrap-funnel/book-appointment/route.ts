import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  try {
    const { session_token, slot, contact_name, contact_email, vehicle } = await req.json()

    if (!session_token || !slot) {
      return NextResponse.json({ error: 'session_token and slot required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Parse slot: "2026-02-27|9:00 AM"
    const [dateStr, timeStr] = (slot as string).split('|')
    const slotText = `${new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${timeStr}`

    // Look up session for project/customer refs
    const { data: session } = await admin
      .from('wrap_funnel_sessions')
      .select('project_id, customer_id')
      .eq('session_token', session_token)
      .single()

    // Update session with appointment
    await admin.from('wrap_funnel_sessions')
      .update({
        booked_appointment_at: new Date().toISOString(),
        appointment_note: slotText,
        updated_at: new Date().toISOString(),
      })
      .eq('session_token', session_token)

    // Create task for sales team
    await admin.from('tasks').insert({
      org_id: ORG_ID,
      project_id: session?.project_id || null,
      title: `Design consultation — ${contact_name || 'New Lead'}`,
      description: `Scheduled: ${slotText}. Vehicle: ${vehicle}. Email: ${contact_email}. Call this customer at the scheduled time to walk through their mockup and provide a quote.`,
      type: 'auto',
      status: 'open',
      priority: 'high',
      source: 'wrap_funnel',
    })

    // Notify team
    await admin.from('notifications').insert({
      org_id: ORG_ID,
      type: 'appointment',
      title: `Consultation Booked: ${contact_name || 'Website Lead'}`,
      body: `${slotText} — ${vehicle} — ${contact_email}`,
      link: session?.project_id ? `/projects/${session.project_id}` : '/tasks',
      read: false,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[wrap-funnel/book-appointment]', err)
    return NextResponse.json({ error: 'Booking failed' }, { status: 500 })
  }
}
