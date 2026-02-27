import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { randomBytes } from 'crypto'

const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QB_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payroll/quickbooks/callback`
  : 'http://localhost:3000/api/payroll/quickbooks/callback'
const QB_SCOPE = 'com.intuit.quickbooks.accounting'
const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!QB_CLIENT_ID) return NextResponse.json({ error: 'QUICKBOOKS_CLIENT_ID not configured' }, { status: 500 })

  const state = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID,
    scope: QB_SCOPE,
    redirect_uri: QB_REDIRECT_URI,
    response_type: 'code',
    state,
  })

  const authUrl = `${QB_AUTH_URL}?${params.toString()}`
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('qb_oauth_state', state, { httpOnly: true, secure: true, maxAge: 600, path: '/' })
  return response
}
