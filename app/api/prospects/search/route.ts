import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

interface PlaceResult {
  business_name: string
  address: string
  phone: string
  website: string
  google_rating: number | null
  google_maps_url: string
  place_id: string
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessType, zipCode, radius = 25 } = await req.json()
  if (!businessType || !zipCode) {
    return NextResponse.json({ error: 'businessType and zipCode required' }, { status: 400 })
  }

  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'PLACEHOLDER_ADD_YOUR_KEY') {
    return NextResponse.json({ error: 'Google Places API key not configured. Add GOOGLE_PLACES_API_KEY to .env.local' }, { status: 503 })
  }

  try {
    // Step 1: Geocode the zip code to get lat/lng
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&key=${GOOGLE_API_KEY}`
    const geoRes = await fetch(geoUrl)
    const geoData = await geoRes.json()

    if (!geoData.results?.[0]?.geometry?.location) {
      return NextResponse.json({ error: 'Could not geocode zip code' }, { status: 400 })
    }

    const { lat, lng } = geoData.results[0].geometry.location
    const radiusMeters = Math.round(radius * 1609.34) // miles to meters

    // Step 2: Search Google Places (Text Search)
    const query = `${businessType} near ${zipCode}`
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()

    if (!searchData.results) {
      return NextResponse.json({ results: [] })
    }

    // Step 3: Get details for each place (phone, website)
    const results: PlaceResult[] = []
    const detailPromises = searchData.results.slice(0, 20).map(async (place: any) => {
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,url&key=${GOOGLE_API_KEY}`
      try {
        const detailRes = await fetch(detailUrl)
        const detailData = await detailRes.json()
        const d = detailData.result || {}
        return {
          business_name: d.name || place.name,
          address: d.formatted_address || place.formatted_address || '',
          phone: d.formatted_phone_number || '',
          website: d.website || '',
          google_rating: d.rating ?? place.rating ?? null,
          google_maps_url: d.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          place_id: place.place_id,
        }
      } catch {
        return {
          business_name: place.name,
          address: place.formatted_address || '',
          phone: '',
          website: '',
          google_rating: place.rating ?? null,
          google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          place_id: place.place_id,
        }
      }
    })

    const detailResults = await Promise.all(detailPromises)
    results.push(...detailResults)

    return NextResponse.json({ results, total: results.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Search failed' }, { status: 500 })
  }
}
