import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token, address, city, state, zip } = await req.json()
    if (!token || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Look up customer by portal_token
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id')
      .eq('portal_token', token)
      .single()

    if (custErr || !customer) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const fullAddress = `${address}, ${city}, ${state} ${zip}`

    // Update customer address
    await supabase
      .from('customers')
      .update({ address: fullAddress, city, state, zip })
      .eq('id', customer.id)

    // Update install_address on any mobile install projects for this customer
    await supabase
      .from('projects')
      .update({ install_address: fullAddress })
      .eq('customer_id', customer.id)
      .eq('is_mobile_install', true)
      .is('install_address', null)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Update profile error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
