import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(_req: NextRequest) {
  // Light auth guard
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  const today = new Date()
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)

  const { data: jobs } = await admin
    .from('projects')
    .select('id, title, install_date, install_address, install_lat, install_lng, vehicle_desc')
    .eq('is_mobile_install', true)
    .not('install_date', 'is', null)
    .gte('install_date', today.toISOString().split('T')[0])
    .lte('install_date', in7Days.toISOString().split('T')[0])
    .not('status', 'eq', 'cancelled')

  const alerts: any[] = []

  for (const job of (jobs || [])) {
    const lat = (job as any).install_lat || 47.3318
    const lng = (job as any).install_lng || -122.5793

    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,precipitation_probability_max&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&forecast_days=7&timezone=America%2FLos_Angeles`
      )
      if (!weatherRes.ok) continue
      const weatherData = await weatherRes.json()

      const installDate = (job as any).install_date as string
      const dayIndex: number = weatherData.daily?.time?.findIndex((d: string) => d === installDate) ?? -1

      if (dayIndex >= 0 && weatherData.daily) {
        const code: number = weatherData.daily.weathercode[dayIndex]
        const maxTemp: number = weatherData.daily.temperature_2m_max[dayIndex]
        const minTemp: number = weatherData.daily.temperature_2m_min[dayIndex]
        const precip: number = weatherData.daily.precipitation_sum[dayIndex]
        const wind: number = weatherData.daily.windspeed_10m_max[dayIndex]
        const precipProb: number = weatherData.daily.precipitation_probability_max[dayIndex]

        const issues: string[] = []
        if (precipProb > 40 || precip > 0.1) issues.push(`Rain expected (${precipProb}% chance, ${precip.toFixed(2)}" precip)`)
        if (minTemp < 50) issues.push(`Too cold for vinyl (low: ${minTemp}°F — vinyl needs 50°F+)`)
        if (maxTemp > 95) issues.push(`Too hot for vinyl application (${maxTemp}°F)`)
        if (wind > 20) issues.push(`High winds (${wind} mph — makes install very difficult)`)
        if (code >= 95) issues.push('Thunderstorm forecast — DO NOT install')

        if (issues.length > 0) {
          const alert = {
            job_id: (job as any).id,
            job_title: (job as any).title || (job as any).vehicle_desc || 'Untitled Job',
            install_date: installDate,
            install_address: (job as any).install_address,
            issues,
            severity: code >= 95 ? 'danger' : (precip > 0.1 || minTemp < 50) ? 'high' : 'medium',
            weather_summary: { code, maxTemp, minTemp, precip, wind, precipProb },
          }
          alerts.push(alert)

          await admin
            .from('projects')
            .update({
              weather_alerts: [alert],
              last_weather_check: new Date().toISOString(),
            })
            .eq('id', (job as any).id)
        } else {
          await admin
            .from('projects')
            .update({
              weather_alerts: [],
              last_weather_check: new Date().toISOString(),
            })
            .eq('id', (job as any).id)
        }
      }
    } catch {
      // Skip jobs where weather fetch fails
    }
  }

  return NextResponse.json({ alerts, checked: jobs?.length ?? 0 })
}
