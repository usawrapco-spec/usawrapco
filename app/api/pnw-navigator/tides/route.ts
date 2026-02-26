import { NextRequest } from 'next/server'

// Proxy to NOAA CO-OPS API (no API key required)
// https://api.tidesandcurrents.noaa.gov/api/prod/

const STATIONS: Record<string, { name: string; id: string }> = {
  seattle:     { name: 'Seattle', id: '9447130' },
  tacoma:      { name: 'Tacoma', id: '9446484' },
  olympia:     { name: 'Olympia', id: '9446484' },
  port_townsend: { name: 'Port Townsend', id: '9444900' },
  neah_bay:    { name: 'Neah Bay', id: '9443090' },
  la_push:     { name: 'La Push', id: '9442396' },
  westport:    { name: 'Westport', id: '9441102' },
  friday_harbor: { name: 'Friday Harbor', id: '9449880' },
  port_angeles: { name: 'Port Angeles', id: '9444090' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stationKey = searchParams.get('station') || 'seattle'
  const station = STATIONS[stationKey] || STATIONS['seattle']

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

  const url = [
    'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter',
    `?begin_date=${fmt(today)}`,
    `&end_date=${fmt(tomorrow)}`,
    `&station=${station.id}`,
    `&product=predictions`,
    `&datum=MLLW`,
    `&time_zone=lst_ldt`,
    `&interval=hilo`,
    `&units=english`,
    `&application=pnw_navigator`,
    `&format=json`,
  ].join('')

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache 1 hour
    })
    const data = await res.json()

    const predictions = (data.predictions || []).map((p: any) => ({
      time: p.t,
      type: p.type, // 'H' or 'L'
      height_ft: parseFloat(p.v),
    }))

    return Response.json({
      station: station.name,
      station_id: station.id,
      predictions,
      all_stations: Object.entries(STATIONS).map(([key, s]) => ({
        key,
        name: s.name,
        id: s.id,
      })),
    })
  } catch (err) {
    return Response.json({
      station: station.name,
      station_id: station.id,
      predictions: [],
      error: 'Could not fetch tide data',
    })
  }
}
