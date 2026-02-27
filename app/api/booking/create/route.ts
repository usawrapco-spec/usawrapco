import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { appointment_type, date, time, customer_name, customer_email, customer_phone, notes } = body
    const orgId = body.org_id || ORG_ID

    if (!appointment_type || !date || !time || !customer_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Get settings for slot duration and daily limits
    const { data: settings } = await admin
      .from('booking_settings')
      .select('slot_duration_minutes, max_daily_bookings, booking_enabled')
      .eq('org_id', orgId)
      .maybeSingle()

    if (settings && !settings.booking_enabled) {
      return Response.json({ error: 'Online booking is currently disabled' }, { status: 400 })
    }

    const duration = settings?.slot_duration_minutes || 60
    const maxDaily = settings?.max_daily_bookings || 8

    // Check daily booking limit
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`
    const { count } = await admin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .neq('status', 'cancelled')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)

    if ((count || 0) >= maxDaily) {
      return Response.json({ error: 'No more slots available for this date' }, { status: 400 })
    }

    const startTime = `${date}T${time}:00`
    const startUtc = new Date(startTime + 'Z')
    const endTime = new Date(startUtc.getTime() + duration * 60000).toISOString()
    const title = `${appointment_type} - ${customer_name}`

    const { data, error } = await admin.from('appointments').insert({
      org_id: orgId,
      title,
      appointment_type,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      notes: notes || null,
      status: 'pending',
      source: 'online',
    }).select().single()

    if (error) {
      console.error('[booking/create] error:', error)
      return Response.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    return Response.json({ success: true, appointment: data })
  } catch (err) {
    console.error('[booking/create] error:', err)
    return Response.json({ error: 'Booking failed' }, { status: 500 })
  }
}
