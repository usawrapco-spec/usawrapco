import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { data: string[]; ts: number }>()
const CACHE_MS = 1000 * 60 * 60 * 6

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const make = searchParams.get('make')
  const year = searchParams.get('year')
  if (!make || !year) {
    return NextResponse.json({ error: 'make and year required' }, { status: 400 })
  }
  const key = `${make}:${year}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json({ models: cached.data })
  }
  try {
    const encodedMake = encodeURIComponent(make)
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodedMake}/modelyear/${year}?format=json`
    )
    const json = await res.json()
    const models: string[] = (json.Results || [])
      .map((r: any) => r.Model_Name as string)
      .filter(Boolean)
      .sort()
    cache.set(key, { data: models, ts: Date.now() })
    return NextResponse.json({ models })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
