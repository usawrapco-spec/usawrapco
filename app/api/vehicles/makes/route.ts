import { NextResponse } from 'next/server'

let cache: { data: string[]; ts: number } | null = null
const CACHE_MS = 1000 * 60 * 60 * 24 // 24 hours

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_MS) {
      return NextResponse.json({ makes: cache.data })
    }

    const res = await fetch(
      'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json',
      { next: { revalidate: 86400 } }
    )
    const json = await res.json()
    const makes: string[] = (json.Results || [])
      .map((r: any) => r.MakeName as string)
      .filter(Boolean)
      .sort()

    cache = { data: makes, ts: Date.now() }
    return NextResponse.json({ makes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
