import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getSupabaseAdmin()
    .from('deckforge_projects')
    .select('*')
    .eq('org_id', ORG_ID)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await getSupabaseAdmin()
    .from('deckforge_projects')
    .insert({
      org_id: ORG_ID,
      created_by: user.id,
      name: body.name,
      boat_name: body.boat_name || null,
      boat_make: body.boat_make || null,
      boat_model: body.boat_model || null,
      boat_length: body.boat_length || null,
      notes: body.notes || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
