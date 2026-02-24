import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: proposal } = await admin
      .from('proposals')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: packages } = await admin
      .from('proposal_packages')
      .select('*')
      .eq('proposal_id', params.id)
      .order('sort_order')

    const { data: upsells } = await admin
      .from('proposal_upsells')
      .select('*')
      .eq('proposal_id', params.id)
      .order('sort_order')

    const { data: selections } = await admin
      .from('proposal_selections')
      .select('*')
      .eq('proposal_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      proposal,
      packages: packages || [],
      upsells: upsells || [],
      selection: selections?.[0] || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const admin = getSupabaseAdmin()

    // Update proposal fields
    const { title, message, expiration_date, deposit_amount } = body
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (message !== undefined) updates.message = message
    if (expiration_date !== undefined) updates.expiration_date = expiration_date
    if (deposit_amount !== undefined) updates.deposit_amount = deposit_amount

    await admin.from('proposals').update(updates).eq('id', params.id)

    // Sync packages
    if (body.packages) {
      // Delete existing packages
      await admin.from('proposal_packages').delete().eq('proposal_id', params.id)

      if (body.packages.length > 0) {
        const pkgs = body.packages.map((p: any, i: number) => ({
          proposal_id: params.id,
          name: p.name || `Package ${i + 1}`,
          badge: p.badge || null,
          description: p.description || null,
          price: p.price || 0,
          includes: p.includes || [],
          photos: p.photos || [],
          video_url: p.video_url || null,
          sort_order: i,
        }))
        await admin.from('proposal_packages').insert(pkgs)
      }
    }

    // Sync upsells
    if (body.upsells) {
      await admin.from('proposal_upsells').delete().eq('proposal_id', params.id)

      if (body.upsells.length > 0) {
        const ups = body.upsells.map((u: any, i: number) => ({
          proposal_id: params.id,
          name: u.name || `Upsell ${i + 1}`,
          description: u.description || null,
          price: u.price || 0,
          photo_url: u.photo_url || null,
          badge: u.badge || null,
          sort_order: i,
        }))
        await admin.from('proposal_upsells').insert(ups)
      }
    }

    // Re-fetch everything
    const { data: proposal } = await admin.from('proposals').select('*').eq('id', params.id).single()
    const { data: packages } = await admin.from('proposal_packages').select('*').eq('proposal_id', params.id).order('sort_order')
    const { data: upsells } = await admin.from('proposal_upsells').select('*').eq('proposal_id', params.id).order('sort_order')

    return NextResponse.json({ proposal, packages: packages || [], upsells: upsells || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
