import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { integrationId, config } = await req.json()

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'Could not find org' }, { status: 400 })
    }

    const { error: upsertError } = await supabase
      .from('org_config')
      .upsert({
        org_id: profile.org_id,
        key: `integration_${integrationId}`,
        value: JSON.stringify(config),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id,key' })

    if (upsertError) {
      console.error('[integrations/save] upsert error:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[integrations/save] error:', err)
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { integrationId } = await req.json()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

    await supabase
      .from('org_config')
      .delete()
      .eq('org_id', profile.org_id)
      .eq('key', `integration_${integrationId}`)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}
