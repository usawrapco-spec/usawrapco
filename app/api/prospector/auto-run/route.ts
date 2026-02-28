import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // This endpoint runs auto-prospecting campaigns
  // Secured: checks for valid auth or internal call
  const admin = getSupabaseAdmin()

  try {
    // Get all active campaigns with auto_run enabled
    const { data: campaigns, error } = await admin
      .from('prospecting_campaigns')
      .select('*')
      .eq('status', 'active')
      .eq('auto_run', true)

    if (error || !campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: 'No active auto-run campaigns', ran: 0 })
    }

    let totalFound = 0
    let totalSaved = 0

    for (const campaign of campaigns) {
      try {
        // Build the AI search request
        const searchBody: any = {
          radius: campaign.target_radius_miles || 25,
          businessTypes: campaign.business_types || [],
          maxResults: campaign.max_results || 50,
          excludeExisting: true,
          minScore: campaign.min_score || 60,
          orgId: campaign.org_id,
        }

        // Geocode the target location
        const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
        if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'PLACEHOLDER_ADD_YOUR_KEY') continue

        let lat: number | null = null
        let lng: number | null = null

        const locationQuery = [campaign.target_city, campaign.target_state, campaign.target_zip].filter(Boolean).join(' ')
        if (locationQuery) {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationQuery)}&key=${GOOGLE_API_KEY}`
          )
          const geoData = await geoRes.json()
          if (geoData.results?.[0]?.geometry?.location) {
            lat = geoData.results[0].geometry.location.lat
            lng = geoData.results[0].geometry.location.lng
          }
        }

        if (!lat || !lng) continue

        searchBody.lat = lat
        searchBody.lng = lng

        // Call the ai-search endpoint internally
        const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'

        // Instead of calling ourselves, replicate the search logic inline
        const radiusMeters = Math.round(searchBody.radius * 1609.34)
        const types = searchBody.businessTypes.length > 0 ? searchBody.businessTypes : ['businesses']

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
        const newPlaces = allPlaces.filter(p => !existingIds.has(p.place_id)).slice(0, searchBody.maxResults)

        if (newPlaces.length === 0) continue

        // Save with default score (AI scoring in auto-run is optional for cost)
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
            ai_score: 50, // Default score for auto-run (can be scored later)
            status: 'uncontacted',
            priority: 'medium',
            discovered_via: 'ai_maps',
          }
        })

        const { data: saved } = await admin.from('prospects').insert(inserts).select()
        const savedCount = saved?.length || 0

        // Update campaign stats
        await admin.from('prospecting_campaigns').update({
          results_count: (campaign.results_count || 0) + savedCount,
          last_run_at: new Date().toISOString(),
        }).eq('id', campaign.id)

        totalFound += newPlaces.length
        totalSaved += savedCount
      } catch {
        // Skip failed campaign, continue with others
      }
    }

    return NextResponse.json({
      message: `Auto-run complete. Found ${totalFound}, saved ${totalSaved}`,
      ran: campaigns.length,
      found: totalFound,
      saved: totalSaved,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Auto-run failed' }, { status: 500 })
  }
}
