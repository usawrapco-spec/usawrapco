import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    lat, lng, address, radius = 10, businessTypes = [], guidance = '',
    fleetImportance = 5, visibilityImportance = 5, revenueImportance = 5,
    maxResults = 25, excludeExisting = true, minScore = 60, orgId,
  } = body

  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'PLACEHOLDER_ADD_YOUR_KEY') {
    return NextResponse.json({
      error: 'Google Places API key not configured. Add GOOGLE_PLACES_API_KEY to .env.local',
      found: 0, saved: 0, prospects: [],
    }, { status: 503 })
  }

  const admin = getSupabaseAdmin()

  try {
    // Step 1: Resolve coordinates
    let searchLat = lat
    let searchLng = lng

    if (address && !lat) {
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
      )
      const geoData = await geoRes.json()
      if (geoData.results?.[0]?.geometry?.location) {
        searchLat = geoData.results[0].geometry.location.lat
        searchLng = geoData.results[0].geometry.location.lng
      }
    }

    if (!searchLat || !searchLng) {
      return NextResponse.json({ error: 'Could not determine search location', found: 0, saved: 0, prospects: [] }, { status: 400 })
    }

    const radiusMeters = Math.round(radius * 1609.34)

    // Step 2: Search Google Places for each business type
    const types = businessTypes.length > 0 ? businessTypes : ['businesses with fleet vehicles']
    const allPlaces: any[] = []
    const seenPlaceIds = new Set<string>()

    for (const type of types.slice(0, 5)) {
      const query = `${type}`
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${searchLat},${searchLng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()

      if (searchData.results) {
        for (const place of searchData.results) {
          if (!seenPlaceIds.has(place.place_id)) {
            seenPlaceIds.add(place.place_id)
            allPlaces.push({ ...place, search_type: type })
          }
        }
      }
    }

    if (allPlaces.length === 0) {
      return NextResponse.json({ found: 0, saved: 0, prospects: [] })
    }

    // Step 3: Get details for top results
    const limitedPlaces = allPlaces.slice(0, Math.min(maxResults * 2, 60))
    const detailedPlaces: any[] = []

    const detailBatches: any[][] = [] as any[][]
    for (let i = 0; i < limitedPlaces.length; i += 10) {
      detailBatches.push(limitedPlaces.slice(i, i + 10) as any[])
    }

    for (const batch of detailBatches) {
      const batchResults = await Promise.all(batch.map(async (place: any) => {
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url,types,photos,opening_hours&key=${GOOGLE_API_KEY}`
          const detailRes = await fetch(detailUrl)
          const detailData = await detailRes.json()
          const d = detailData.result || {}
          return {
            ...place,
            phone: d.formatted_phone_number || '',
            website: d.website || '',
            rating: d.rating ?? place.rating ?? null,
            review_count: d.user_ratings_total ?? 0,
            detail_types: d.types || [],
            photos: (d.photos || []).slice(0, 3).map((p: any) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
            ),
          }
        } catch {
          return { ...place, phone: '', website: '', review_count: 0, detail_types: [], photos: [] }
        }
      }))
      detailedPlaces.push(...batchResults)
    }

    // Step 4: Exclude existing prospects
    let existingPlaceIds = new Set<string>()
    if (excludeExisting) {
      const { data: existing } = await admin
        .from('prospects')
        .select('google_place_id')
        .eq('org_id', orgId)
        .not('google_place_id', 'is', null)
      if (existing) {
        existingPlaceIds = new Set(existing.map((e: any) => e.google_place_id))
      }
    }

    const newPlaces = detailedPlaces.filter(p => !existingPlaceIds.has(p.place_id))

    if (newPlaces.length === 0) {
      return NextResponse.json({ found: detailedPlaces.length, saved: 0, prospects: [], message: 'All found businesses are already in your prospects' })
    }

    // Step 5: AI Score each business
    let anthropic: Anthropic | null = null
    try {
      anthropic = new Anthropic()
    } catch {
      // No API key — score all as 50
    }

    const scoredProspects: any[] = []

    // Batch AI scoring
    const scoreBatches: any[][] = [] as any[][]
    for (let i = 0; i < newPlaces.length; i += 5) {
      scoreBatches.push(newPlaces.slice(i, i + 5) as any[])
    }

    for (const batch of scoreBatches) {
      const results = await Promise.all(batch.map(async (place: any) => {
        let score = 50
        let reasoning = 'Default score — AI scoring unavailable'
        let suggestedPitch = ''
        let estimatedFleet = 0
        let vehicleTypes: string[] = []

        if (anthropic) {
          try {
            const aiRes = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: `You are an expert sales analyst for a vehicle wrap company. Score businesses on their potential for vehicle wraps. Consider fleet size, visibility needs, and business type. Fleet importance: ${fleetImportance}/10. Visibility importance: ${visibilityImportance}/10. Revenue importance: ${revenueImportance}/10.`,
              messages: [{
                role: 'user',
                content: `Business: ${place.name}\nType: ${place.search_type}\nRating: ${place.rating || 'N/A'}\nReviews: ${place.review_count || 0}\nAddress: ${place.formatted_address || ''}\nWebsite: ${place.website || 'N/A'}\n${guidance ? `User wants: ${guidance}` : ''}\n\nScore 0-100 for vehicle wrap potential. Return ONLY valid JSON: {"score":number,"reasoning":"string","suggested_pitch":"string","estimated_fleet_size":number,"vehicle_types":["string"]}`,
              }],
            })

            const text = (aiRes.content[0] as any).text || ''
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              score = Math.min(100, Math.max(0, parsed.score || 50))
              reasoning = parsed.reasoning || ''
              suggestedPitch = parsed.suggested_pitch || ''
              estimatedFleet = parsed.estimated_fleet_size || 0
              vehicleTypes = parsed.vehicle_types || []
            }
          } catch {
            // AI scoring failed, keep default
          }
        }

        return {
          place,
          score,
          reasoning,
          suggestedPitch,
          estimatedFleet,
          vehicleTypes,
        }
      }))
      scoredProspects.push(...results)
    }

    // Step 6: Filter by min score
    const qualified = scoredProspects
      .filter(s => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)

    if (qualified.length === 0) {
      return NextResponse.json({
        found: newPlaces.length,
        saved: 0,
        prospects: [],
        message: `Found ${newPlaces.length} businesses but none scored above ${minScore}`,
      })
    }

    // Step 7: Save to database
    const inserts = qualified.map(({ place, score, reasoning, suggestedPitch, estimatedFleet, vehicleTypes }) => {
      // Parse address components
      const addr = place.formatted_address || ''
      const parts = addr.split(',').map((p: string) => p.trim())

      return {
        org_id: orgId,
        business_name: place.name,
        business_type: place.search_type,
        address: parts[0] || addr,
        city: parts[1] || null,
        state: parts[2]?.split(' ')[0] || null,
        zip: parts[2]?.split(' ')[1] || null,
        lat: place.geometry?.location?.lat || null,
        lng: place.geometry?.location?.lng || null,
        phone: place.phone || null,
        website: place.website || null,
        google_place_id: place.place_id,
        google_rating: place.rating || null,
        google_review_count: place.review_count || 0,
        estimated_fleet_size: estimatedFleet,
        estimated_vehicle_types: vehicleTypes.length > 0 ? vehicleTypes : null,
        ai_score: score,
        ai_score_reasoning: reasoning,
        ai_suggested_pitch: suggestedPitch,
        status: 'uncontacted',
        priority: score >= 80 ? 'hot' : score >= 60 ? 'high' : 'medium',
        discovered_via: 'ai_google',
        photos: place.photos?.length > 0 ? place.photos : null,
      }
    })

    const { data: saved, error: saveError } = await admin
      .from('prospects')
      .insert(inserts)
      .select('*, assignee:assigned_to(id, name)')

    if (saveError) {
      return NextResponse.json({ error: saveError.message, found: newPlaces.length, saved: 0, prospects: [] }, { status: 500 })
    }

    return NextResponse.json({
      found: detailedPlaces.length,
      saved: saved?.length || 0,
      prospects: saved || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI search failed', found: 0, saved: 0, prospects: [] }, { status: 500 })
  }
}
