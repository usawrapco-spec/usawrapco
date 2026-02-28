import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin()
  const { data: report, error } = await admin
    .from('condition_reports')
    .select('*, projects(title, form_data)')
    .eq('report_token', params.token)
    .single()

  if (!report || error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ report })
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const admin = getSupabaseAdmin()

    const { data: report, error } = await admin
      .from('condition_reports')
      .update({ ...body })
      .eq('report_token', params.token)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
