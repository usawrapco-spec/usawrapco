import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const id = searchParams.get('id')

  const admin = getSupabaseAdmin()

  if (id) {
    const { data, error: singleError } = await admin.from('fish_species').select('*').eq('id', id).single()
    if (singleError) return Response.json({ species: null }, { status: 404 })
    return Response.json({ species: data })
  }

  let query = admin.from('fish_species').select('*').order('common_name')
  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return Response.json({ species: [] })

  return Response.json({ species: data || [] })
}
