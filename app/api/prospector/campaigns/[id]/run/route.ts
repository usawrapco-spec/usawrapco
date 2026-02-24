import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const campaignId = params.id

  // Get campaign
  const { data: campaign, error: campError } = await admin
    .from('prospecting_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'PLACEHOLDER_ADD_YOUR_KEY') {
    return NextResponse.json({ error: 'Google Places API key not configured', found: 0, saved: 0, prospects: [] }, { status: 503 })
  }

  try {
    // Geocode target location
    const locationQuery = [campaign.target_city, campaign.target_state, campaign.target_zip].filter(Boolean).join(' ')
    if (!locationQuery) {
      return NextResponse.json({ error: 'Campaign has no target location', found: 0, saved: 0, prospects: [] }, { status: 400 })
    }

    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationQuery)}&key=${GOOGLE_API_KEY}`
    )
    const geoData = await geoRes.json()
    if (!geoData.results?.[0]?.geometry?.location) {
      return NextResponse.json({ error: 'Could not geocode campaign location', found: 0, saved: 0, prospects: [] }, { status: 400 })
    }

    const { lat, lng } = geoData.results[0].geometry.location
    const radiusMeters = Math.round((campaign.target_radius_miles || 25) * 1609.34)
    const types = (campaign.target_business_types || []).length > 0 ? campaign.target_business_types : ['businesses']

    // Search Google Places
    const allPlaces: any[] = []
    const seenIds = new Set<string>()

    for (const type of types.slice(0, 5)) {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(type)}&location=${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()
      if (searchData.results) {
        for (const place of searchData.results) {
          if (!seenIds.has(place.place_id)) {
            seenIds.add(place.place_id)
            allPlaces.push({ ...place, search_type: type })
          }
        }
      }
    }

    // Exclude existing
    const { data: existing } = await admin
      .from('prospects')
      .select('google_place_id')
      .eq('org_id', campaign.org_id)
      .not('google_place_id', 'is', null)
    const existingIds = new Set((existing || []).map((e: any) => e.google_place_id))
    const newPlaces = allPlaces
      .filter(p => !existingIds.has(p.place_id))
      .slice(0, campaign.ai_max_prospects_per_run || 50)

    if (newPlaces.length === 0) {
      await admin.from('prospecting_campaigns').update({ last_run_at: new Date().toISOString() }).eq('id', campaignId)
      return NextResponse.json({ found: allPlaces.length, saved: 0, prospects: [], message: 'All found businesses already exist' })
    }

    // Save prospects
    const inserts = newPlaces.map(place => {
      const addr = place.formatted_address || ''
      const parts = addr.split(',').map((p: string) => p.trim())
      return {
        org_id: campaign.org_id,
        business_name: place.name,
        business_type: place.search_type,
        address: parts[0] || addr,
        city: parts[1] || null,
        state: parts[2]?.split(' ')[0] || null,
        zip: parts[2]?.split(' ')[1] || null,
        lat: place.geometry?.location?.lat || null,
        lng: place.geometry?.location?.lng || null,
        google_place_id: place.place_id,
        google_rating: place.rating || null,
        ai_score: 50,
        status: 'uncontacted',
        priority: 'medium',
        discovered_via: 'ai_maps',
      }
    })

    const { data: saved, error: saveError } = await admin
      .from('prospects')
      .insert(inserts)
      .select('*, assignee:assigned_to(id, name)')

    if (saveError) {
      return NextResponse.json({ error: saveError.message, found: allPlaces.length, saved: 0, prospects: [] }, { status: 500 })
    }

    // Update campaign
    await admin.from('prospecting_campaigns').update({
      prospects_found: (campaign.prospects_found || 0) + (saved?.length || 0),
      last_run_at: new Date().toISOString(),
    }).eq('id', campaignId)

    return NextResponse.json({
      found: allPlaces.length,
      saved: saved?.length || 0,
      prospects: saved || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Campaign run failed', found: 0, saved: 0, prospects: [] }, { status: 500 })
  }
}
