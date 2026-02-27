import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import PortalProposalView from '@/components/portal/PortalProposalView'

export const dynamic = 'force-dynamic'

export default async function PortalProposalPage({
  params,
}: {
  params: { token: string; proposalId: string }
}) {
  const { token, proposalId } = params
  const supabase = getSupabaseAdmin()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('portal_token', token)
    .single()

  if (!customer) return notFound()

  // Fetch estimate (proposal)
  const { data: estimate } = await supabase
    .from('estimates')
    .select('id, estimate_number, title, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, status, customer_note, created_at')
    .eq('id', proposalId)
    .eq('customer_id', customer.id)
    .single()

  if (!estimate) return notFound()

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('line_items')
    .select('id, name, description, quantity, unit_price, total_price, sort_order, specs')
    .eq('parent_id', estimate.id)
    .order('sort_order', { ascending: true })

  // Fetch options (packages A/B/C)
  const { data: options } = await supabase
    .from('estimate_options')
    .select('id, label, sort_order, selected, line_item_ids')
    .eq('estimate_id', estimate.id)
    .order('sort_order', { ascending: true })

  // Check if already signed
  const { data: existingSig } = await supabase
    .from('proposal_signatures')
    .select('id, signer_name, signed_at')
    .eq('proposal_id', estimate.id)
    .limit(1)
    .maybeSingle()

  return (
    <PortalProposalView
      estimate={estimate as any}
      lineItems={(lineItems || []) as any[]}
      options={(options || []) as any[]}
      existingSignature={existingSig as any}
      customerId={customer.id}
      customerName={customer.name}
    />
  )
}
