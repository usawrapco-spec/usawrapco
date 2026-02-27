import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const date = searchParams.get('date')
    const orgId = searchParams.get('org_id') || ORG_ID

    if (!date) return Response.json({ error: 'date required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Get booking settings
    const { data: settings } = await admin
      .from('booking_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle()

    const hoursStart = settings?.hours_start || '08:00:00'
    const hoursEnd = settings?.hours_end || '17:00:00'
    const slotDuration = settings?.slot_duration_minutes || 60
    const bufferMinutes = settings?.buffer_minutes || 15
    const availableDays: string[] = settings?.available_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const minNotice = settings?.min_notice_hours || 24

    // Check if the date is an available day
    const dayOfWeek = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    if (!availableDays.includes(dayOfWeek)) {
      return Response.json({ slots: [] })
    }

    // Generate time slots
    const [startH, startM] = hoursStart.split(':').map(Number)
    const [endH, endM] = hoursEnd.split(':').map(Number)
    const startMinutes = startH * 60 + (startM || 0)
    const endMinutes = endH * 60 + (endM || 0)

    const allSlots: string[] = []
    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      const h = Math.floor(m / 60)
      const min = m % 60
      allSlots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }

    // Get existing appointments for this date
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`
    const { data: existing } = await admin
      .from('appointments')
      .select('start_time, end_time, duration_minutes')
      .eq('org_id', orgId)
      .neq('status', 'cancelled')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)

    // Filter out slots that conflict with existing appointments
    const availableSlots = allSlots.filter(slot => {
      const slotStart = new Date(`${date}T${slot}:00Z`)
      const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000)

      return !(existing || []).some(appt => {
        const apptStart = new Date(appt.start_time)
        const apptEnd = appt.end_time
          ? new Date(appt.end_time)
          : new Date(apptStart.getTime() + (appt.duration_minutes || 60) * 60000)
        const bufferedStart = new Date(apptStart.getTime() - bufferMinutes * 60000)
        const bufferedEnd = new Date(apptEnd.getTime() + bufferMinutes * 60000)
        return slotStart < bufferedEnd && slotEnd > bufferedStart
      })
    })

    // Filter out slots that don't meet minimum notice requirement
    const now = new Date()
    const filteredSlots = availableSlots.filter(slot => {
      const slotTime = new Date(`${date}T${slot}:00Z`)
      return slotTime.getTime() - now.getTime() >= minNotice * 3600000
    })

    return Response.json({ slots: filteredSlots })
  } catch (err) {
    console.error('[booking/slots] error:', err)
    return Response.json({ error: 'Failed to load slots' }, { status: 500 })
  }
}
