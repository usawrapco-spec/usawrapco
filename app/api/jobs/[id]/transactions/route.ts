import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdmin()

  // Fetch payments via invoices linked to this project
  const { data, error } = await admin
    .from('payments')
    .select('*, invoice:invoice_id(id, project_id, invoice_number)')
    .eq('invoice.project_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data || [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdmin()
  const body = await req.json()

  // Find the primary invoice for this project to attach the payment to
  const { data: invoice } = await admin
    .from('invoices')
    .select('id')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!invoice && !body.invoice_id) {
    return NextResponse.json(
      { error: 'No invoice found for this job. Create an invoice first.' },
      { status: 400 }
    )
  }

  const invoiceId = body.invoice_id || invoice?.id

  const { data, error } = await admin
    .from('payments')
    .insert({
      org_id: body.org_id || ORG_ID,
      invoice_id: invoiceId,
      amount: body.amount,
      type: body.type || 'payment',
      method: body.method || 'cash',
      notes: body.notes || null,
      payment_date: body.payment_date || new Date().toISOString().slice(0, 10),
      recorded_by: body.recorded_by || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}
