import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const revalidate = 3600

const STATIONS: Record<string, { id: string; name: string; lat: number; lng: number }> = {
  gig_harbor: { id: '9446484', name: 'Gig Harbor', lat: 47.333, lng: -122.578 },
  seattle:     { id: '9447130', name: 'Seattle',    lat: 47.602, lng: -122.338 },
  tacoma:      { id: '9446482', name: 'Tacoma',     lat: 47.259, lng: -122.415 },
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const stationKey = searchParams.get('station') || 'gig_harbor'
  const station = STATIONS[stationKey] || STATIONS.gig_harbor

  try {
    // Get today and 2 days out in YYYYMMDD format
    const today = new Date()
    const beginDate = today.toISOString().slice(0, 10).replace(/-/g, '')
    const endDate = new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10).replace(/-/g, '')

    const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter')
    url.searchParams.set('station', station.id)
    url.searchParams.set('product', 'predictions')
    url.searchParams.set('datum', 'MLLW')
    url.searchParams.set('time_zone', 'lst_ldt')
    url.searchParams.set('interval', 'hilo')
    url.searchParams.set('units', 'english')
    url.searchParams.set('application', 'PNWNavigator')
    url.searchParams.set('format', 'json')
    url.searchParams.set('begin_date', beginDate)
    url.searchParams.set('end_date', endDate)

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`NOAA API ${res.status}`)

    const data = await res.json()
    const predictions = (data.predictions || []).map((p: any) => ({
      time: p.t,
      type: p.type as 'H' | 'L',
      height_ft: parseFloat(p.v),
    }))

    // Find next upcoming tide
    const now = Date.now()
    const upcoming = predictions.filter((p: any) => new Date(p.time).getTime() > now)
    const next_tide = upcoming[0] || null

    return NextResponse.json({
      station: station.name,
      station_id: station.id,
      lat: station.lat,
      lng: station.lng,
      predictions,
      next_tide,
      all_stations: Object.entries(STATIONS).map(([key, s]) => ({ key, name: s.name, id: s.id })),
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Tides error:', err)
    return NextResponse.json({
      station: station.name,
      predictions: [],
      next_tide: null,
      error: 'Tide data temporarily unavailable',
      updated_at: new Date().toISOString()
    }, { status: 500 })
  }
}
