import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const revalidate = 1800

const GIG_HARBOR_LAT = 47.333
const GIG_HARBOR_LNG = -122.578

export async function GET() {
  try {
    // Step 1: Get grid point for Gig Harbor
    const pointRes = await fetch(
      `https://api.weather.gov/points/${GIG_HARBOR_LAT},${GIG_HARBOR_LNG}`,
      { headers: { 'User-Agent': 'PNWNavigator/1.0 (admin@usawrapco.com)' } }
    )

    if (!pointRes.ok) {
      throw new Error(`Points API failed: ${pointRes.status}`)
    }

    const pointData = await pointRes.json()
    const props = pointData.properties
    const forecastUrl = props.forecast
    const marineZone = 'PZZ130'

    // Step 2: Fetch both regular forecast and marine zone forecast
    const [forecastRes, marineRes] = await Promise.allSettled([
      fetch(forecastUrl, { headers: { 'User-Agent': 'PNWNavigator/1.0 (admin@usawrapco.com)' } }),
      fetch(`https://api.weather.gov/zones/forecast/${marineZone}/forecast`, {
        headers: { 'User-Agent': 'PNWNavigator/1.0 (admin@usawrapco.com)' }
      })
    ])

    let forecast = null
    let marineForecast = null

    if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
      const fd = await forecastRes.value.json()
      const periods = fd.properties?.periods || []
      forecast = periods.slice(0, 4).map((p: any) => ({
        name: p.name,
        temperature: p.temperature,
        temperatureUnit: p.temperatureUnit,
        windSpeed: p.windSpeed,
        windDirection: p.windDirection,
        shortForecast: p.shortForecast,
        detailedForecast: p.detailedForecast,
        isDaytime: p.isDaytime,
        icon: p.icon,
      }))
    }

    if (marineRes.status === 'fulfilled' && marineRes.value.ok) {
      const md = await marineRes.value.json()
      const zones = md.properties?.periods || []
      marineForecast = zones.slice(0, 2).map((z: any) => ({
        name: z.name,
        detailedForecast: z.detailedForecast,
      }))
    }

    // Current conditions from first forecast period
    const current = forecast?.[0] || null

    return NextResponse.json({
      current,
      forecast,
      marineForecast,
      station: 'Gig Harbor, WA',
      zone: marineZone,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Weather fetch error:', err)
    return NextResponse.json({
      current: null,
      forecast: null,
      marineForecast: null,
      error: 'Weather data temporarily unavailable',
      updated_at: new Date().toISOString()
    }, { status: 500 })
  }
}
