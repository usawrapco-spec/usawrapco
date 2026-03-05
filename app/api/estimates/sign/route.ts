import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { token, signerName, signatureData, selectedZones, finalTotal } = await req.json()
    if (!token || !signerName) {
      return NextResponse.json({ error: 'token and signerName required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Fetch existing form_data to merge zone selection
    const { data: est } = await admin.from('estimates').select('form_data').eq('id', token).single()
    const formData = (est?.form_data as Record<string, unknown>) || {}

    const { error } = await admin
      .from('estimates')
      .update({
        status: 'accepted',
        signed_at: new Date().toISOString(),
        signer_name: signerName,
        signature_data: signatureData || null,
        form_data: {
          ...formData,
          ...(selectedZones ? { acceptedZones: selectedZones, acceptedTotal: finalTotal } : {}),
        },
      })
      .eq('id', token)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[estimates/sign] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
