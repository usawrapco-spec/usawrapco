import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('vhf_channels')
    .select('*')
    .order('channel')

  if (error) return Response.json({ channels: [] })
  return Response.json({ channels: data || [] })
}
