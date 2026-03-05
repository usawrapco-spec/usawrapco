import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { token, designBrief, conceptFeedback } = await req.json()
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { data: est } = await admin.from('estimates').select('form_data').eq('id', token).single()
    const formData = (est?.form_data as Record<string, unknown>) || {}

    // Merge customer-provided brief with any existing brief (customer values win)
    const existingBrief = (formData.designBrief as Record<string, unknown>) || {}
    const mergedBrief = { ...existingBrief, ...designBrief }

    // Merge concept feedback into existing concepts
    const existingConcepts = (formData.concepts as { url: string; approved?: boolean; customerNotes?: string }[]) || []
    const updatedConcepts = existingConcepts.map((c, i) => {
      const fb = (conceptFeedback as { index: number; note: string; approved?: boolean }[]).find(f => f.index === i)
      if (!fb) return c
      return { ...c, approved: fb.approved ?? c.approved, customerNotes: fb.note || c.customerNotes }
    })

    const { error } = await admin.from('estimates').update({
      form_data: { ...formData, designBrief: mergedBrief, concepts: updatedConcepts, designIntakeSubmittedAt: new Date().toISOString() },
    }).eq('id', token)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[design-intake] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
