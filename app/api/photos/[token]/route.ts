import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('estimate_survey_photos')
    .select(`
      id, public_url, markup_url, markup_data, angle, category,
      caption, concern_type, is_flagged, file_name, created_at, share_token,
      survey_vehicle_id,
      estimate_survey_vehicles(vehicle_year, vehicle_make, vehicle_model),
      estimates(estimate_number, customer_id)
    `)
    .eq('share_token', params.token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
