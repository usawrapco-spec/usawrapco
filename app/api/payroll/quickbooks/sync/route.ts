import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || ''
const QB_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payroll/quickbooks/callback`
  : 'http://localhost:3000/api/payroll/quickbooks/callback'

async function refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID

  // Get QB tokens
  const { data: setting } = await admin.from('app_settings').select('value').eq('org_id', orgId).eq('key', 'quickbooks_tokens').single()
  if (!setting?.value) return NextResponse.json({ error: 'QuickBooks not connected' }, { status: 400 })

  let tokenData: any = {}
  try { tokenData = JSON.parse(setting.value) } catch { return NextResponse.json({ error: 'Invalid token data' }, { status: 500 }) }

  // Refresh if expired
  let accessToken = tokenData.access_token
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    const refreshed = await refreshToken(tokenData.refresh_token)
    if (!refreshed) return NextResponse.json({ error: 'Token refresh failed — please reconnect QuickBooks' }, { status: 401 })
    accessToken = refreshed.access_token
    tokenData.access_token = accessToken
    tokenData.expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    await admin.from('app_settings').update({ value: JSON.stringify(tokenData) }).eq('org_id', orgId).eq('key', 'quickbooks_tokens')
  }

  const realmId = tokenData.realm_id
  const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }

  // Fetch invoices from QB (last 90 days)
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().split('T')[0]
  const qbRes = await fetch(
    `${baseUrl}/query?query=SELECT * FROM Invoice WHERE TxnDate >= '${since}' MAXRESULTS 200`,
    { headers }
  )
  if (!qbRes.ok) return NextResponse.json({ error: 'QB API error: ' + qbRes.statusText }, { status: 500 })
  const qbData = await qbRes.json()
  const qbInvoices: any[] = qbData?.QueryResponse?.Invoice || []

  // Get existing customers for matching
  const { data: customers } = await admin.from('customers').select('id, name, email').eq('org_id', orgId)
  const customerByName: Record<string, any> = {}
  const customerByEmail: Record<string, any> = {}
  for (const c of customers || []) {
    if (c.name) customerByName[c.name.toLowerCase()] = c
    if (c.email) customerByEmail[c.email.toLowerCase()] = c
  }

  let imported = 0
  let unmatched = 0
  const unmatchedList: any[] = []

  for (const inv of qbInvoices) {
    const customerName = inv.CustomerRef?.name || ''
    const customerEmail = inv.BillEmail?.Address || ''
    const customer = customerByName[customerName.toLowerCase()] || customerByEmail[customerEmail.toLowerCase()] || null

    const invData: any = {
      org_id: orgId,
      invoice_number: inv.DocNumber || inv.Id,
      total: parseFloat(inv.TotalAmt || 0),
      balance_due: parseFloat(inv.Balance || 0),
      status: inv.Balance <= 0 ? 'paid' : 'sent',
      due_date: inv.DueDate || null,
      created_at: inv.TxnDate ? inv.TxnDate + 'T00:00:00Z' : undefined,
    }
    if (customer) invData.customer_id = customer.id

    // Upsert by invoice_number
    const { error: upsertErr } = await admin.from('invoices').upsert(invData, { onConflict: 'invoice_number,org_id', ignoreDuplicates: false })
    if (!upsertErr) {
      imported++
      if (!customer) {
        unmatched++
        unmatchedList.push({ name: customerName, email: customerEmail, invoice: inv.DocNumber, amount: inv.TotalAmt })
      }
    }
  }

  return NextResponse.json({ imported, unmatched, unmatched_list: unmatchedList, total_qb: qbInvoices.length })
}
