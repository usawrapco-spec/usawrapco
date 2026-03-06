import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps { params: { token: string } }

export default async function OnboardPage({ params }: PageProps) {
  const supabase = getSupabaseAdmin()
  const { token } = params

  // Look up customer_intake by token
  const { data: intake } = await supabase
    .from('customer_intake')
    .select('id, project_id, customer_email')
    .eq('token', token)
    .single()

  if (!intake) notFound()

  // Chain: intake → project → customer → portal_token
  if (intake.project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('customer_id')
      .eq('id', intake.project_id)
      .single()

    if (project?.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, portal_token')
        .eq('id', project.customer_id)
        .single()

      if (customer?.portal_token) {
        redirect(`/portal/${customer.portal_token}`)
      }

      // Generate portal_token if customer exists but has none
      if (customer && !customer.portal_token) {
        const newToken = crypto.randomUUID()
        await supabase
          .from('customers')
          .update({ portal_token: newToken })
          .eq('id', customer.id)
        redirect(`/portal/${newToken}`)
      }
    }
  }

  // Fallback: try matching by email if no project chain
  if (intake.customer_email) {
    const { data: customerByEmail } = await supabase
      .from('customers')
      .select('id, portal_token')
      .eq('email', intake.customer_email)
      .limit(1)
      .single()

    if (customerByEmail?.portal_token) {
      redirect(`/portal/${customerByEmail.portal_token}`)
    }

    if (customerByEmail && !customerByEmail.portal_token) {
      const newToken = crypto.randomUUID()
      await supabase
        .from('customers')
        .update({ portal_token: newToken })
        .eq('id', customerByEmail.id)
      redirect(`/portal/${newToken}`)
    }
  }

  // No customer found — show not found
  notFound()
}
