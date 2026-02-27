import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * VIN Lookup API - NHTSA Integration
 * Decodes vehicle VIN using NHTSA vPIC API
 * GET /api/vin/lookup?vin=<17-char-vin>
 *
 * NHTSA Results return objects with { Variable: string, Value: string | null, VariableId: number }
 * We use Variable name strings for reliable lookup since VariableId can vary.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const vin = searchParams.get('vin')

    if (!vin || vin.length !== 17) {
      return NextResponse.json(
        { error: 'Invalid VIN. Must be exactly 17 characters.' },
        { status: 400 }
      )
    }

    // Call NHTSA vPIC API
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(vin)}?format=json`
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.Results || data.Results.length === 0) {
      return NextResponse.json(
        { error: 'No results found for this VIN' },
        { status: 404 }
      )
    }

    // Parse relevant fields from NHTSA response using Variable name strings
    const results: { Variable: string; Value: string | null; VariableId: number }[] = data.Results
    const getByName = (name: string): string | null => {
      const item = results.find((r) => r.Variable === name)
      return item?.Value && item.Value.trim() && item.Value !== 'Not Applicable' ? item.Value.trim() : null
    }

    const vehicleData = {
      vin: vin.toUpperCase(),
      year: getByName('Model Year'),
      make: getByName('Make'),
      model: getByName('Model'),
      trim: getByName('Trim'),
      bodyClass: getByName('Body Class'),
      vehicleType: getByName('Vehicle Type'),
      driveType: getByName('Drive Type'),
      engineCylinders: getByName('Engine Number of Cylinders'),
      engineLiters: getByName('Displacement (L)'),
      fuelType: getByName('Fuel Type - Primary'),
      doors: getByName('Doors'),
      plantCity: getByName('Plant City'),
      plantCountry: getByName('Plant Country'),
      manufacturer: getByName('Manufacturer Name'),
      errorCode: getByName('Error Code'),
    }

    // NHTSA error codes: "0" means no error. Anything else is a decode issue.
    // However, partial results can still be useful, so we only reject if
    // make+model are both missing AND there's an error code.
    const hasError = vehicleData.errorCode && vehicleData.errorCode !== '0'
    const hasUsableData = vehicleData.make && vehicleData.model

    if (hasError && !hasUsableData) {
      return NextResponse.json(
        { error: 'Invalid VIN or VIN decode failed', data: vehicleData },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      vehicle: vehicleData,
    })

  } catch (error: any) {
    console.error('VIN lookup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to lookup VIN' },
      { status: 500 }
    )
  }
}
