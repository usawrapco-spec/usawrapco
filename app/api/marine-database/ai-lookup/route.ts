import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  try {
    const { query } = await req.json()
    if (!query || query.length < 3) return NextResponse.json({ error: 'Query too short' }, { status: 400 })

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const prompt = `You are a marine vessel database expert. Research the following boat and return comprehensive specs.

Boat query: "${query}"

Return a JSON object with these EXACT fields:
{
  "make": "string - manufacturer name (e.g. Boston Whaler, Sea Ray, Grady-White)",
  "model": "string - model name (e.g. 280 Outrage, Sundancer 320)",
  "year": number or null,
  "boat_class": "one of: bowrider, center_console, pontoon, cabin_cruiser, yacht, sailboat, catamaran, trawler, fishing, ski_boat, wakeboard, deck_boat, bass_boat, custom",
  "overall_length_ft": number,
  "beam_ft": number,
  "draft_ft": number or null,
  "dry_weight_lbs": number or null,
  "fuel_capacity_gal": number or null,
  "water_capacity_gal": number or null,
  "num_levels": number (1-4, how many deck levels),
  "deck_components": [{"id": "cockpit", "label": "Cockpit Floor"}, ...],
  "estimated_value_min": number (USD, low end of market value),
  "estimated_value_max": number (USD, high end of market value),
  "fun_facts": ["string", "string", ...] (4-6 interesting facts that would help the team seem knowledgeable about this boat when talking to the customer - include production history, awards, notable features, what it's best known for, common owner demographics, hull design innovations, top speed, fuel efficiency, or anything that makes a great conversation piece),
  "schematic_svg": "a complete inline SVG...",
  "source_urls": ["urls where specs can be verified"]
}

For deck_components, use these standard IDs where applicable: cockpit, bow, swim_platform, helm_station, casting_deck, aft_deck, port_gunwale, starboard_gunwale, transom_pad, step_pads, rod_locker_lid, storage_lids, seat_bases, console_top, hatch_covers, bow_platform, main_deck, flybridge, cabin_sole, foredeck.

For the schematic_svg field, generate a COMPLETE inline SVG showing a top-down (bird's-eye) view of the boat:
- Use viewBox="0 0 400 800" (portrait, bow pointing up)
- Hull outline with stroke="#22d3ee" fill="none" stroke-width="2"
- Interior deck areas with stroke="#1a1d27" fill="rgba(34,211,238,0.05)" stroke-width="1"
- Label key areas with <text fill="#9299b5" font-size="9" font-family="sans-serif" text-anchor="middle">
- Show: hull shape, cockpit, bow area, helm console, seating areas, swim platform, storage, gunwales
- Make it proportionally accurate based on the actual length and beam
- The SVG should be clean and professional, suitable for a dark background

Return ONLY valid JSON, no markdown fences.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const vessel = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    vessel.ai_generated = true

    return NextResponse.json({ vessel })
  } catch (err) {
    console.error('[marine-ai-lookup] error:', err)
    return NextResponse.json({ error: 'AI lookup failed' }, { status: 500 })
  }
}
