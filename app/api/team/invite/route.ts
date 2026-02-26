import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const VALID_ROLES = ['admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer'] as const

export async function POST(request: Request) {
  // Verify the caller is authenticated
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller has team management permission
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['owner', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role, resend } = body as { email: string; role: string; resend?: boolean }

  // Validate inputs
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Check if this email already has an active profile
  const { data: existingProfile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, name, active')
    .eq('email', normalizedEmail)
    .single()

  if (existingProfile && !resend) {
    return NextResponse.json(
      { error: 'A user with this email already has an account' },
      { status: 409 }
    )
  }

  // Upsert the invite record
  const { data: invite, error: inviteErr } = await getSupabaseAdmin()
    .from('team_invites')
    .upsert(
      {
        email: normalizedEmail,
        role,
        invited_by: user.id,
        org_id: ORG_ID,
        status: 'pending',
      },
      { onConflict: 'email,org_id' }
    )
    .select()
    .single()

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 })
  }

  // Send invite email via Supabase Auth admin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { error: sendErr } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: `${appUrl}/auth/callback`,
    data: { role, org_id: ORG_ID },
  })

  if (sendErr) {
    // Roll back invite record on email failure
    await getSupabaseAdmin().from('team_invites').delete().eq('id', invite.id)
    return NextResponse.json({ error: sendErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, invite })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['owner', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })

  const { error } = await getSupabaseAdmin()
    .from('team_invites')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
