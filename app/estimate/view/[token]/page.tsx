import EstimateViewClient from '@/components/customer/EstimateViewClient'

export default function EstimateViewPage({ params }: { params: { token: string } }) {
  return <EstimateViewClient token={params.token} />
}
