// app/pay/[invoiceId]/page.tsx
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import PayPageClient from './PayPageClient'

export const dynamic = 'force-dynamic'

export default async function PayPage({ params }: { params: { invoiceId: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customers(name, email, phone, company),
      projects(title, vehicle_desc),
      payments(amount, method, payment_date)
    `)
    .eq('pay_link_token', params.invoiceId)
    .single()

  if (error || !invoice || invoice.status === 'void') {
    notFound()
  }

  // Pass the Wisetack merchant URL from env
  // Set WISETACK_MERCHANT_URL in Vercel env vars after signing up at wisetack.com
  const wisetackMerchantUrl = process.env.WISETACK_MERCHANT_URL

  return (
    <PayPageClient
      invoice={invoice}
      token={params.invoiceId}
      wisetackMerchantUrl={wisetackMerchantUrl}
    />
  )
}
