import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vin = searchParams.get('vin')
  if (!vin) return NextResponse.json({ error: 'vin required' }, { status: 400 })
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`
    )
    const json = await res.json()
    const r = json.Results?.[0]
    if (!r) return NextResponse.json({ error: 'No results' }, { status: 404 })
    return NextResponse.json({
      make: r.Make || '',
      model: r.Model || '',
      year: r.ModelYear ? parseInt(r.ModelYear, 10) : null,
      trim: r.Trim || '',
      body_class: r.BodyClass || '',
      plant_country: r.PlantCountry || '',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
