import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Panels that can appear per camera angle
const ANGLE_PANELS: Record<string, string[]> = {
  front:                ['hood', 'front_bumper', 'driver_mirror', 'passenger_mirror', 'windshield', 'driver_quarter_panel', 'passenger_quarter_panel'],
  rear:                 ['tailgate', 'rear_bumper', 'rear_glass', 'driver_quarter_panel', 'passenger_quarter_panel'],
  driver_side:          ['driver_door', 'driver_quarter_panel', 'hood', 'roof', 'rear_door', 'driver_mirror'],
  passenger_side:       ['passenger_door', 'passenger_quarter_panel', 'hood', 'roof', 'rear_door', 'passenger_mirror'],
  '3q_front_driver':    ['hood', 'driver_door', 'driver_quarter_panel', 'driver_mirror', 'front_bumper', 'windshield'],
  '3q_front_passenger': ['hood', 'passenger_door', 'passenger_quarter_panel', 'passenger_mirror', 'front_bumper', 'windshield'],
  '3q_rear_driver':     ['tailgate', 'driver_door', 'driver_quarter_panel', 'rear_bumper', 'rear_glass'],
  '3q_rear_passenger':  ['tailgate', 'passenger_door', 'passenger_quarter_panel', 'rear_bumper', 'rear_glass'],
  overhead:             ['hood', 'roof', 'trunk'],
  unknown:              [],
}

const PROMPT = `You are a vehicle wrap shop AI assistant. Analyze this vehicle photo and return a JSON object.

Required fields:
- "angle": Camera angle. Choose ONE: front | rear | driver_side | passenger_side | 3q_front_driver | 3q_front_passenger | 3q_rear_driver | 3q_rear_passenger | overhead | unknown
- "angle_confidence": float 0.0-1.0
- "vehicle_type": ONE of: pickup_truck | suv | sedan | van | box_truck | motorcycle | trailer | unknown
- "vehicle_make": Brand name (e.g. "Ford", "Toyota") or null
- "vehicle_model": Model name (e.g. "F-150", "Tundra") or null
- "vehicle_year": Estimated year or range (e.g. "2021" or "2019-2023") or null
- "vehicle_color": Current color (e.g. "White", "Silver", "Black")
- "existing_graphics": boolean — true if vehicle already has decals, text, or a wrap
- "suggested_template": Best match from: Pickup Truck Crew Cab | Pickup Truck Regular Cab | SUV Full Size | SUV Compact | Sedan | Sprinter Van | Transit Van | Box Truck 16ft | Box Truck 24ft | Flatbed Truck
- "detected_panels": Array of visible, mappable vehicle panels. Each item: { "panel": string, "bbox": { "x": float, "y": float, "w": float, "h": float }, "confidence": float }
  - bbox coords are 0.0-1.0 normalized (x=left edge, y=top edge, w=width, h=height of bounding box within the image)
  - Panel names: hood | roof | trunk | tailgate | front_bumper | rear_bumper | driver_door | passenger_door | rear_door | driver_quarter_panel | passenger_quarter_panel | driver_mirror | passenger_mirror | windshield | rear_glass | side_glass | bed_side_driver | bed_side_passenger | running_board
  - Only include panels clearly visible and mappable in this specific photo angle
- "notes": 1-2 sentence summary of condition, any issues, or special observations

Return ONLY the raw JSON object. No markdown, no explanation.`

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()
    if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

    const body = await req.json()
    const { photoUrl, photoId } = body
    if (!photoUrl) return NextResponse.json({ error: 'photoUrl required' }, { status: 400 })

    // ── Call Claude Vision ─────────────────────────────────────────────────────
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: photoUrl },
            },
            {
              type: 'text',
              text: PROMPT,
            },
          ],
        },
      ],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

    let analysis: any = { angle: 'unknown', vehicle_type: null, notes: 'Analysis unavailable' }
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) analysis = JSON.parse(match[0])
    } catch {
      analysis.notes = raw.slice(0, 200)
    }

    // ── Persist to DB ──────────────────────────────────────────────────────────
    if (photoId) {
      await supabase
        .from('vehicle_photos')
        .update({
          angle:              analysis.angle          ?? 'unknown',
          angle_confidence:   analysis.angle_confidence ?? null,
          vehicle_type:       analysis.vehicle_type   ?? null,
          vehicle_make:       analysis.vehicle_make   ?? null,
          vehicle_model:      analysis.vehicle_model  ?? null,
          vehicle_year:       analysis.vehicle_year   ?? null,
          vehicle_color:      analysis.vehicle_color  ?? null,
          existing_graphics:  analysis.existing_graphics ?? false,
          detected_panels:    analysis.detected_panels   ?? [],
          suggested_template: analysis.suggested_template ?? null,
          ai_analysis:        analysis,
          ai_analyzed_at:     new Date().toISOString(),
        })
        .eq('id', photoId)
    }

    return NextResponse.json({ analysis, success: true })
  } catch (err: any) {
    console.error('analyze-vehicle-photo error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
