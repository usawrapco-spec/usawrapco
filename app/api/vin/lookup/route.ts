import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * VIN Lookup API - NHTSA Integration
 * Decodes vehicle VIN using NHTSA vPIC API
 * GET /api/vin/lookup?vin=<17-char-vin>
 */
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
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
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

    // Parse relevant fields from NHTSA response
    const results = data.Results
    const getValue = (variableId: number) => {
      const item = results.find((r: any) => r.VariableId === variableId)
      return item?.Value || null
    }

    const vehicleData = {
      vin: vin.toUpperCase(),
      year: getValue(29) || getValue(26),  // ModelYear or VariableId 26
      make: getValue(26) || getValue(27),  // Make
      model: getValue(28),                  // Model
      trim: getValue(109),                  // Trim
      bodyClass: getValue(5),               // Body Class
      vehicleType: getValue(10),            // Vehicle Type
      driveType: getValue(8),               // Drive Type
      engineCylinders: getValue(9),         // Engine Number of Cylinders
      engineLiters: getValue(11),           // Displacement (L)
      fuelType: getValue(24),               // Fuel Type Primary
      doors: getValue(14),                  // Number of Doors
      plantCity: getValue(31),              // Plant City
      plantCountry: getValue(32),           // Plant Country
      manufacturer: getValue(27),           // Manufacturer Name
      errorCode: getValue(143),             // Error Code (if any)
    }

    // Check for errors in the VIN decode
    if (vehicleData.errorCode && vehicleData.errorCode !== '0') {
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
