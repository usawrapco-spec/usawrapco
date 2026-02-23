import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { integrationId, config, enabled = true } = await req.json()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })
    const orgId = profile.org_id

    // Save to integrations table (upsert by org_id + integration_id)
    const { error: upsertError } = await admin
      .from('integrations')
      .upsert({
        org_id: orgId,
        integration_id: integrationId,
        config,
        enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id,integration_id' })

    if (upsertError) {
      // Table may not exist — try INSERT fallback
      await admin.from('integrations').insert({
        org_id: orgId,
        integration_id: integrationId,
        config,
        enabled,
      })
    }

    // Also save to orgs.settings.integrations for reliable API route access
    try {
      const { data: org } = await admin
        .from('orgs')
        .select('settings')
        .eq('id', orgId)
        .single()

      const currentSettings = (org?.settings as any) || {}
      const updatedSettings = {
        ...currentSettings,
        integrations: {
          ...(currentSettings.integrations || {}),
          [integrationId]: config,
        },
      }
      await admin.from('orgs').update({ settings: updatedSettings }).eq('id', orgId)
    } catch {
      // orgs.settings update failed — integrations table save is sufficient
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

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })
    const orgId = profile.org_id

    await admin
      .from('integrations')
      .update({ enabled: false, config: {} })
      .eq('org_id', orgId)
      .eq('integration_id', integrationId)

    // Also remove from orgs.settings.integrations
    try {
      const { data: org } = await admin
        .from('orgs')
        .select('settings')
        .eq('id', orgId)
        .single()

      const currentSettings = (org?.settings as any) || {}
      const integrations = { ...(currentSettings.integrations || {}) }
      delete integrations[integrationId]
      await admin
        .from('orgs')
        .update({ settings: { ...currentSettings, integrations } })
        .eq('id', orgId)
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}
