import {
  VEHICLE_MULTIPLIERS,
  CITY_DENSITY,
  CITY_TYPE_VEHICLES_PER_MILE,
} from './constants'

/**
 * Full algorithmic estimate used by internal route-analysis API.
 * Uses waypoints, drive time, and optional city/vehicle data.
 */
export function algorithmicEstimate(
  waypoints: { lat: number; lng: number }[],
  driveTimeHours: number,
  peakHourPct: number,
  vehicleType: string,
  city?: string,
) {
  const baseTrafficPerHour = 800
  const cityMultiplier = city ? (CITY_DENSITY[city.toLowerCase()] || 1.5) : 1.5
  const vehicleMultiplier = VEHICLE_MULTIPLIERS[vehicleType] || 1.0
  const peakBoost = 1 + (peakHourPct / 100) * 0.8

  const rawImpressions = baseTrafficPerHour * driveTimeHours * cityMultiplier * vehicleMultiplier * peakBoost
  const viewRate = 0.45
  const totalImpressions = Math.round(rawImpressions * viewRate)

  const segments = waypoints.map((wp, i) => ({
    name: `Segment ${i + 1}`,
    lat: wp.lat,
    lng: wp.lng,
    traffic: Math.round(baseTrafficPerHour * cityMultiplier * (0.7 + Math.random() * 0.6)),
    impressions: Math.round(totalImpressions / Math.max(waypoints.length, 1)),
    color: peakHourPct > 50 ? '#22c07a' : '#4f7fff',
  }))

  return { totalImpressions, segments }
}

/**
 * Simplified estimate for the public funnel.
 * No waypoints needed — just miles driven per day + city type + vehicle count.
 */
export function publicEstimate(
  milesPerDay: number,
  cityType: 'urban' | 'suburban' | 'rural',
  numVehicles: number,
) {
  const vehiclesPerMile = CITY_TYPE_VEHICLES_PER_MILE[cityType] || 400
  const viewRate = 0.45
  const dailyImpressions = Math.round(milesPerDay * vehiclesPerMile * viewRate * numVehicles)

  return {
    dailyImpressions,
    monthlyImpressions: dailyImpressions * 22,
    yearlyImpressions: dailyImpressions * 260,
  }
}
