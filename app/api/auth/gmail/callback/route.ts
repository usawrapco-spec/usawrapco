import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateRaw = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    console.error('[GMAIL OAUTH] Error from Google:', error)
    return NextResponse.redirect(
      `${APP_URL}/settings/email-accounts?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(
      `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('Missing authorization code')}`
    )
  }

  // Parse state JSON and verify CSRF nonce
  let parsedState: { uid: string; nonce: string }
  try {
    parsedState = JSON.parse(stateRaw)
  } catch {
    return NextResponse.redirect(
      `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('Invalid OAuth state')}`
    )
  }

  const cookieNonce = req.cookies.get('gmail_oauth_nonce')?.value
  if (!cookieNonce || cookieNonce !== parsedState.nonce) {
    console.error('[GMAIL OAUTH] CSRF nonce mismatch')
    return NextResponse.redirect(
      `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('Security check failed — please try again')}`
    )
  }

  // Extract verified user ID from state
  const state = parsedState.uid

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return NextResponse.redirect(
      `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('Google OAuth not configured on server')}`
    )
  }

  try {
    // Clear the nonce cookie now that it's been consumed
    const clearNonceCookie = (res: NextResponse) => {
      res.cookies.set('gmail_oauth_nonce', '', { maxAge: 0, path: '/' })
      return res
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('[GMAIL OAUTH] Token exchange failed:', errBody)
      return NextResponse.redirect(
        `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('Token exchange failed')}`
      )
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokens

    // Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!profileRes.ok) {
      console.error('[GMAIL OAUTH] Failed to fetch Google profile')
      return NextResponse.redirect(
        `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('Failed to fetch Google profile')}`
      )
    }

    const googleProfile = await profileRes.json()
    const gmailAddress = googleProfile.email
    const displayName = googleProfile.name || gmailAddress

    // Get initial history ID for incremental sync
    const historyRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      { headers: { Authorization: `Bearer ${access_token}` } }
    )
    const historyData = historyRes.ok ? await historyRes.json() : null
    const historyId = historyData?.historyId || null

    // Save to email_accounts table
    const admin = getSupabaseAdmin()

    // Get profile to get org_id
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id')
      .eq('id', state)
      .single()

    if (!profile) {
      return NextResponse.redirect(
        `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('User profile not found')}`
      )
    }

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

    // Upsert: update if this gmail address is already connected for this org
    const { data: existing } = await admin
      .from('email_accounts')
      .select('id')
      .eq('org_id', profile.org_id)
      .eq('email', gmailAddress)
      .maybeSingle()

    if (existing) {
      await admin
        .from('email_accounts')
        .update({
          access_token,
          refresh_token: refresh_token || undefined,
          token_expires_at: expiresAt,
          display_name: displayName,
          gmail_history_id: historyId,
          connected_by: state,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await admin.from('email_accounts').insert({
        org_id: profile.org_id,
        email: gmailAddress,
        display_name: displayName,
        provider: 'gmail',
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        gmail_history_id: historyId,
        connected_by: state,
        assigned_to: state,
        status: 'active',
        last_synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    return clearNonceCookie(NextResponse.redirect(`${APP_URL}/settings/email-accounts?success=1`))
  } catch (err) {
    console.error('[GMAIL OAUTH] Callback error:', err)
    return NextResponse.redirect(
      `${APP_URL}/settings/email-accounts?error=${encodeURIComponent('Unexpected error during OAuth')}`
    )
  }
}
