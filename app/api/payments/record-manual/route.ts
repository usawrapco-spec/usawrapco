import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { awardXP } from '@/lib/xp'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { invoice_id, amount, method, reference_number, notes, payment_date } = await req.json()

    if (!invoice_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'invoice_id and amount are required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: invoice } = await admin
      .from('invoices')
      .select('org_id, customer_id, total, amount_paid, balance, status')
      .eq('id', invoice_id)
      .maybeSingle()

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const newPaid = (invoice.amount_paid || 0) + amount
    const total = invoice.total
    const newBalance = Math.max(0, total - newPaid)

    // Record the payment
    const { data: payment, error: payErr } = await admin
      .from('payments')
      .insert({
        org_id: invoice.org_id,
        invoice_id,
        customer_id: invoice.customer_id,
        amount,
        method: method || 'cash',
        reference_number: reference_number || null,
        notes: notes || null,
        recorded_by: user.id,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

    // Update invoice totals and status (balance_due column doesn't exist, use balance)
    const updates: Record<string, unknown> = {
      amount_paid: newPaid,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    }
    if (newBalance <= 0) {
      updates.status = 'paid'
      updates.paid_at = new Date().toISOString()
    } else if (newPaid > 0) {
      updates.status = 'partial'
    }

    await admin.from('invoices').update(updates).eq('id', invoice_id)

    // Award XP when invoice is fully paid
    if (newBalance <= 0 && invoice.org_id) {
      awardXP(user.id, invoice.org_id, 'invoice_fully_paid', 50, { invoice_id }).catch(() => {})
    }

    return NextResponse.json({ ok: true, payment, new_balance: newBalance, new_status: updates.status || invoice.status })
  } catch (err: any) {
    console.error('[payments/record-manual]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
