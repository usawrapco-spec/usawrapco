import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      startLocation = 'Gig Harbor',
      endLocation,
      duration,   // e.g. "half day", "full day", "2 days"
      interests,  // e.g. ["salmon fishing", "lunch stop", "crabbing"]
      partySize = 2,
      boatType = 'recreational',
      speedKnots = 10,
    } = body

    const month = new Date().toLocaleString('en-US', { month: 'long' })

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `Create a detailed ${duration || 'full day'} PNW boat trip itinerary.

Trip details:
- Start: ${startLocation}
- End: ${endLocation || startLocation} (return trip)
- Month: ${month} (use seasonal fishing/weather conditions)
- Party: ${partySize} people
- Boat: ${boatType}
- Cruise speed: ${speedKnots} knots
- Interests: ${interests?.join(', ') || 'fishing, sightseeing, dining'}

Return ONLY a JSON object (no other text) in this exact format:
{
  "title": "Descriptive trip name",
  "duration": "X hours",
  "totalDistanceNm": 0,
  "fuelEstimateGal": 0,
  "bestDepartTime": "7:00 AM",
  "tideNote": "Depart on ebb tide for best fishing at...",
  "weatherNote": "Typical ${month} conditions...",
  "stops": [
    {
      "order": 1,
      "time": "7:00 AM",
      "type": "depart",
      "name": "Location name",
      "lat": 47.3325,
      "lng": -122.5749,
      "duration": "30 min",
      "description": "What to do",
      "tips": "Pro tip",
      "distanceFromPrevNm": 0
    }
  ],
  "fishingHighlights": [
    { "species": "Chinook Salmon", "location": "Point Defiance", "technique": "Trolling flashers", "depth": "40-60 ft" }
  ],
  "diningStops": [
    { "name": "Restaurant name", "location": "City", "type": "Waterfront dining", "specialty": "Dish" }
  ],
  "safetyChecklist": [
    "File float plan with a shoreside contact",
    "Check NOAA marine forecast at marine.weather.gov",
    "VHF radio on Channel 16",
    "Life jackets accessible for all aboard"
  ]
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate trip plan' }, { status: 500 })
    }

    const plan = JSON.parse(jsonMatch[0])
    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[pnw/trip-plan]', err)
    return NextResponse.json({ error: 'Trip planning unavailable' }, { status: 500 })
  }
}