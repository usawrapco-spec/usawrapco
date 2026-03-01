import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const revalidate = 1800 // 30 min

export async function GET() {
  try {
    // Fetch NOAA marine alerts for Puget Sound South zone PZZ130 and coastal WAZ516
    const [marineRes, coastalRes] = await Promise.allSettled([
      fetch('https://api.weather.gov/alerts/active?zone=PZZ130', {
        headers: { 'User-Agent': 'PNWNavigator/1.0 (admin@usawrapco.com)' }
      }),
      fetch('https://api.weather.gov/alerts/active?zone=WAZ516', {
        headers: { 'User-Agent': 'PNWNavigator/1.0 (admin@usawrapco.com)' }
      }),
    ])

    const alerts: any[] = []

    for (const result of [marineRes, coastalRes]) {
      if (result.status === 'fulfilled' && result.value.ok) {
        const data = await result.value.json()
        const features = data.features || []
        for (const f of features) {
          const p = f.properties
          const event = p.event || ''
          // Only show serious marine/weather alerts
          const isSerious = [
            'Gale Warning', 'Storm Warning', 'Small Craft Advisory',
            'Special Marine Warning', 'Hazardous Seas Warning',
            'High Wind Warning', 'Wind Advisory', 'Tsunami Warning',
            'Severe Thunderstorm Warning', 'Tornado Warning'
          ].some(e => event.toLowerCase().includes(e.toLowerCase()))

          if (isSerious) {
            alerts.push({
              id: f.id,
              event: p.event,
              headline: p.headline,
              description: p.description,
              instruction: p.instruction,
              severity: p.severity,
              urgency: p.urgency,
              effective: p.effective,
              expires: p.expires,
              area: p.areaDesc,
              sender: p.senderName,
            })
          }
        }
      }
    }

    // Deduplicate by id
    const unique = alerts.filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)

    return NextResponse.json({ alerts: unique, count: unique.length, checked_at: new Date().toISOString() })
  } catch (err) {
    console.error('Alerts fetch error:', err)
    return NextResponse.json({ alerts: [], count: 0, error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
