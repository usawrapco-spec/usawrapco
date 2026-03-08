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

  const admin = getSupabaseAdmin()

  // ── Ensure profile exists and has required fields ────────────────
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    // Create profile — trigger should have done this, but handle the gap
    const { data: authUser } = await admin.auth.admin.getUserById(user.id)
    const meta = authUser?.user?.user_metadata ?? {}
    const { error: insertErr } = await admin.from('profiles').upsert({
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
    const { error: patchErr } = await admin
      .from('profiles')
      .update({ org_id: ORG_ID })
      .eq('id', user.id)
    if (patchErr) {
      console.error('[auth/callback] profile org_id patch failed:', patchErr.message)
    }
  }

  // ── Check for pending invite to apply pre-assigned role ──────
  if (user.email) {
    const { data: invite } = await admin
      .from('team_invites')
      .select('id, role')
      .eq('email', user.email.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invite) {
      await admin.from('profiles').update({ role: invite.role, updated_at: new Date().toISOString() }).eq('id', user.id)
      await admin.from('team_invites').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invite.id)
    }
  }

  // ── Portal auth: link this auth user to the customer record ──────────────
  // This runs for any auth flow that has next=/portal/* so customer data
  // is associated with their account for history, saved sessions, etc.
  if (next.startsWith('/portal') && user.email) {
    const { data: customer } = await admin
      .from('customers')
      .select('id, portal_token, auth_user_id')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    if (customer) {
      // Link auth_user_id if not already linked
      if (!customer.auth_user_id) {
        await admin
          .from('customers')
          .update({ auth_user_id: user.id })
          .eq('id', customer.id)
      }

      // If the next param is just /portal (no token), redirect to their portal token
      if ((next === '/portal' || next === '/portal/') && customer.portal_token) {
        return NextResponse.redirect(`${origin}/portal/${customer.portal_token}`)
      }

      // If next is /portal/[token]/something, keep that path (already has the right token)
      return NextResponse.redirect(`${origin}${next}`)
    }

    // No customer record found for this email — redirect to portal home
    // (they may be a new user without a job yet)
    return NextResponse.redirect(`${origin}/portal`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
