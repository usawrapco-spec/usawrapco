import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/dashboard'

  // ── If Supabase redirected here with an error (e.g. trigger failure) ──
  const oauthError       = searchParams.get('error')
  const oauthErrorDesc   = searchParams.get('error_description')
  if (oauthError) {
    const msg = oauthErrorDesc || oauthError
    console.error('[auth/callback] Supabase OAuth error:', oauthError, oauthErrorDesc)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`)
  }

  const supabase = createClient()
  let user: { id: string; email?: string } | null = null
  let authError: string | null = null

  // ── Handle PKCE OAuth / magic-link code flow ──────────────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      authError = error.message
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    } else if (data.user) {
      user = data.user
    }
  }

  // ── Handle invite token (type=invite) ────────────────────────
  if (!user && token_hash && type === 'invite') {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: 'invite' })
    if (error) {
      authError = error.message
      console.error('[auth/callback] verifyOtp(invite) failed:', error.message)
    } else if (data.user) {
      user = data.user
    }
  }

  // ── Handle email confirmation / magic link ───────────────────
  if (!user && token_hash && (type === 'magiclink' || type === 'email')) {
    const otpType = type === 'magiclink' ? 'magiclink' : 'email'
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: otpType })
    if (error) {
      authError = error.message
      console.error('[auth/callback] verifyOtp(email) failed:', error.message)
    } else if (data.user) {
      user = data.user
    }
  }

  if (!user) {
    const msg = authError
      ? encodeURIComponent(authError)
      : encodeURIComponent('Could not sign in. Please try again.')
    const loginPath = next.startsWith('/portal') ? '/portal/login' : '/login'
    return NextResponse.redirect(`${origin}${loginPath}?error=${msg}`)
  }

  // ── Ensure profile exists and has required fields ────────────────
  const { data: existingProfile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    // Create profile — trigger should have done this, but handle the gap
    const { data: authUser } = await getSupabaseAdmin().auth.admin.getUserById(user.id)
    const meta = authUser?.user?.user_metadata ?? {}
    const { error: insertErr } = await getSupabaseAdmin().from('profiles').upsert({
      id:          user.id,
      org_id:      ORG_ID,
      name:        meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
      email:       user.email || '',
      avatar_url:  meta.avatar_url || meta.picture || null,
      role:        'viewer',
      active:      true,
      permissions: {},
    }, { onConflict: 'id' })
    if (insertErr) {
      console.error('[auth/callback] profile upsert failed:', insertErr.message, insertErr.details)
    }
  } else if (!existingProfile.org_id) {
    // Profile exists but org_id is missing (created by old trigger) — patch it
    const { error: patchErr } = await getSupabaseAdmin()
      .from('profiles')
      .update({ org_id: ORG_ID })
      .eq('id', user.id)
    if (patchErr) {
      console.error('[auth/callback] profile org_id patch failed:', patchErr.message)
    }
  }

  // ── Check for pending invite to apply pre-assigned role ──────
  if (user.email) {
    const { data: invite } = await getSupabaseAdmin()
      .from('team_invites')
      .select('id, role')
      .eq('email', user.email.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invite) {
      // Apply the pre-assigned role from the invite
      await getSupabaseAdmin()
        .from('profiles')
        .update({
          role:       invite.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // Mark invite as accepted
      await getSupabaseAdmin()
        .from('team_invites')
        .update({
          status:      'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
