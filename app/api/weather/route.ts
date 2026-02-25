import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat') || '47.3318'
  const lng = searchParams.get('lng') || '-122.5793'

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,precipitation_probability_max&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&forecast_days=7&timezone=America%2FLos_Angeles`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Open-Meteo fetch failed')
    const data = await res.json()

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 })
  }
}
