import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')

  if (!address) return NextResponse.json({ error: 'No address' }, { status: 400 })

  try {
    const encoded = encodeURIComponent(address)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      { headers: { 'User-Agent': 'WrapShopPro/1.0 fleet@usawrapco.com' } }
    )
    if (!res.ok) throw new Error('Nominatim error')
    const data = await res.json()
    if (data.length > 0) {
      return NextResponse.json({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display: data[0].display_name,
      })
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 })
  }
}
