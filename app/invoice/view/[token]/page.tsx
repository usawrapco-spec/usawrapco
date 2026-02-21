import InvoiceViewClient from '@/components/customer/InvoiceViewClient'

export default function InvoiceViewPage({ params }: { params: { token: string } }) {
  return <InvoiceViewClient token={params.token} />
}
