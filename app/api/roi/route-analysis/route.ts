import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { VEHICLE_MULTIPLIERS } from '@/lib/roi/constants'
import { algorithmicEstimate } from '@/lib/roi/impression-calculator'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

async function analyzeSegment(lat: number, lng: number, apiKey: string) {
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${apiKey}&unit=KMPH`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    const flow = data.flowSegmentData
    if (!flow) return null

    const congestionRatio = flow.currentSpeed / flow.freeFlowSpeed
    const vehiclesPerHour = Math.round(flow.currentTravelTime * 600 * (1 - congestionRatio + 0.5))

    return {
      vehiclesPerHour,
      speed: flow.currentSpeed,
      freeFlowSpeed: flow.freeFlowSpeed,
      confidence: flow.confidence,
      congestionRatio,
    }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    waypoints = [],
    driveTimeHours = 4,
    peakHourPct = 40,
    vehicleType = 'van',
    city,
    campaignId,
  } = body

  if (!waypoints.length) {
    return Response.json({ error: 'At least one waypoint required' }, { status: 400 })
  }

  const apiKey = process.env.TOMTOM_API_KEY
  let totalImpressions = 0
  let segments: any[] = []
  let usedApi = false

  if (apiKey) {
    // Try TomTom API for each waypoint
    const results = await Promise.all(
      waypoints.map((wp: { lat: number; lng: number }) => analyzeSegment(wp.lat, wp.lng, apiKey))
    )

    const validResults = results.filter(Boolean)
    if (validResults.length > 0) {
      usedApi = true
      const vehicleMultiplier = VEHICLE_MULTIPLIERS[vehicleType] || 1.0
      const viewRate = 0.45

      segments = waypoints.map((wp: any, i: number) => {
        const r = results[i]
        const traffic = r ? r.vehiclesPerHour : 600
        const segImpressions = Math.round(traffic * (driveTimeHours / waypoints.length) * vehicleMultiplier * viewRate)
        return {
          name: `Segment ${i + 1}`,
          lat: wp.lat,
          lng: wp.lng,
          traffic,
          impressions: segImpressions,
          speed: r?.speed || null,
          confidence: r?.confidence || null,
          color: traffic > 1000 ? '#22c07a' : traffic > 500 ? '#f59e0b' : '#f25a5a',
        }
      })

      totalImpressions = segments.reduce((sum: number, s: any) => sum + s.impressions, 0)
    }
  }

  // Fallback to algorithmic estimate
  if (!usedApi) {
    const est = algorithmicEstimate(waypoints, driveTimeHours, peakHourPct, vehicleType, city)
    totalImpressions = est.totalImpressions
    segments = est.segments
  }

  // AI suggestion based on data
  const highTrafficSegments = segments.filter((s: any) => s.traffic > 800)
  const suggestion = highTrafficSegments.length > segments.length / 2
    ? `Great route! ${highTrafficSegments.length} of ${segments.length} segments have high traffic. Consider extending time on these segments for maximum exposure.`
    : `Consider adjusting your route to include more high-traffic corridors. Only ${highTrafficSegments.length} of ${segments.length} segments have strong traffic flow.`

  // Save route log if campaign provided
  if (campaignId) {
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    // Verify user's org owns this campaign
    const { data: campaign } = await admin
      .from('wrap_campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('org_id', orgId)
      .maybeSingle()

    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 })
    }

    await admin.from('wrap_route_logs').insert({
      campaign_id: campaignId,
      org_id: orgId,
      route_name: body.routeName || `Route ${new Date().toLocaleDateString()}`,
      waypoints,
      drive_time_minutes: Math.round(driveTimeHours * 60),
      estimated_impressions: totalImpressions,
      peak_hour_pct: peakHourPct,
      ai_impression_estimate: totalImpressions,
      ai_segment_breakdown: segments,
      ai_suggestion: suggestion,
    })
  }

  return Response.json({
    totalImpressions,
    segments,
    suggestion,
    usedApi,
    dailyImpressions: totalImpressions,
    monthlyImpressions: totalImpressions * 22,
    yearlyImpressions: totalImpressions * 260,
  })
}
