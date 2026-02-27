import { publicEstimate, algorithmicEstimate } from '@/lib/roi/impression-calculator'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      waypoints,
      numVehicles = 1,
      cityType = 'suburban',
      milesPerDay,
    } = body

    // If waypoints provided, use algorithmic estimate
    if (waypoints && waypoints.length > 0) {
      const driveTimeHours = Math.max(waypoints.length * 0.5, 2)
      const result = algorithmicEstimate(
        waypoints,
        driveTimeHours,
        40,
        'van',
      )

      const daily = result.totalImpressions * numVehicles
      return Response.json({
        dailyImpressions: daily,
        monthlyImpressions: daily * 22,
        yearlyImpressions: daily * 260,
        segments: result.segments,
      })
    }

    // Fallback: simple miles-per-day estimate
    const miles = milesPerDay || 30
    const result = publicEstimate(miles, cityType, numVehicles)

    return Response.json(result)
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
