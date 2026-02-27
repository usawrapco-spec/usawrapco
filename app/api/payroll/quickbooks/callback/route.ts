import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || ''
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const QB_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payroll/quickbooks/callback`
  : 'http://localhost:3000/api/payroll/quickbooks/callback'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const sp = req.nextUrl.searchParams
  const code = sp.get('code')
  const state = sp.get('state')
  const realmId = sp.get('realmId')
  const error = sp.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/payroll?qb_error=' + encodeURIComponent(error), req.url))
  }

  const storedState = req.cookies.get('qb_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL('/payroll?qb_error=state_mismatch', req.url))
  }

  if (!code || !realmId) {
    return NextResponse.redirect(new URL('/payroll?qb_error=missing_params', req.url))
  }

  // Exchange code for tokens
  const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')
  const tokenRes = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: QB_REDIRECT_URI,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/payroll?qb_error=token_exchange_failed', req.url))
  }

  const tokens = await tokenRes.json()
  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  // Store tokens in app_settings
  const tokenData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    realm_id: realmId,
    expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    connected_at: new Date().toISOString(),
    connected_by: user.id,
  }

  const { data: existing } = await admin.from('app_settings').select('id').eq('org_id', orgId).eq('key', 'quickbooks_tokens').single()
  if (existing) {
    await admin.from('app_settings').update({ value: JSON.stringify(tokenData) }).eq('org_id', orgId).eq('key', 'quickbooks_tokens')
  } else {
    await admin.from('app_settings').insert({ org_id: orgId, key: 'quickbooks_tokens', value: JSON.stringify(tokenData) })
  }

  const response = NextResponse.redirect(new URL('/payroll?qb_connected=1', req.url))
  response.cookies.delete('qb_oauth_state')
  return response
}
