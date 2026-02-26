import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { token, signerName, signatureData } = await req.json()
    if (!token || !signerName) {
      return NextResponse.json({ error: 'token and signerName required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('invoices')
      .update({
        signed_at: new Date().toISOString(),
        signer_name: signerName,
        signature_data: signatureData || null,
      })
      .eq('id', token)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[invoices/sign] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
