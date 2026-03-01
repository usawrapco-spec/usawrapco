import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isAdminRole } from '@/types'

// PATCH /api/admin/access — update a user's role and/or feature_permissions
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: caller } = await admin.from('profiles').select('role, org_id').eq('id', user.id).single()
  if (!caller || !isAdminRole(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { user_id, role, feature_permissions } = body as {
    user_id: string
    role?: string
    feature_permissions?: Record<string, boolean>
  }

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  // Verify target user is in same org
  const { data: target } = await admin
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', user_id)
    .single()

  if (!target || target.org_id !== caller.org_id) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (role !== undefined) updates.role = role
  if (feature_permissions !== undefined) updates.feature_permissions = feature_permissions

  const { data, error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', user_id)
    .select('id, role, feature_permissions')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// GET /api/admin/access — list all profiles in the org
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: caller } = await admin.from('profiles').select('role, org_id').eq('id', user.id).single()
  if (!caller || !isAdminRole(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('profiles')
    .select('id, name, email, role, avatar_url, active, division, feature_permissions, created_at')
    .eq('org_id', caller.org_id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
