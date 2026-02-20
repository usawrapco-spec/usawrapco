import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const { rollId, finalWasteSqft, notes } = await req.json()
    if (!rollId) {
      return Response.json({ error: 'rollId required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Get current roll data
    const { data: roll } = await admin
      .from('vinyl_inventory')
      .select('*')
      .eq('id', rollId)
      .single()

    if (!roll) {
      return Response.json({ error: 'Roll not found' }, { status: 404 })
    }

    // Mark as consumed
    const { data, error } = await admin
      .from('vinyl_inventory')
      .update({
        status: 'consumed',
        sqft_available: 0,
        waste_sqft: (roll.waste_sqft || 0) + (finalWasteSqft || 0),
        consumed_at: new Date().toISOString(),
        notes: notes || roll.notes,
      })
      .eq('id', rollId)
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, roll: data })
  } catch (err) {
    console.error('[inventory/consume-roll] error:', err)
    return Response.json({ error: 'Failed to consume roll' }, { status: 500 })
  }
}
