import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import vehicleData from '@/lib/data/vehicle-measurements.json'

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin()

  try {
    const { searchParams } = new URL(req.url)
    const force = searchParams.get('force') === 'true'

    const { count } = await admin
      .from('vehicle_measurements')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0 && !force) {
      return NextResponse.json({
        message: `Already seeded with ${count} vehicles. Pass ?force=true to re-seed.`,
        count,
      })
    }

    if (force) {
      await admin
        .from('vehicle_measurements')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    }

    const batchSize = 100
    let inserted = 0
    const errors: string[] = []

    for (let i = 0; i < vehicleData.length; i += batchSize) {
      const batch = vehicleData.slice(i, i + batchSize)
      const { error } = await admin.from('vehicle_measurements').insert(batch)
      if (error) {
        errors.push(`Batch ${i}: ${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      total: vehicleData.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
