import CustomerIntakePortal from '@/components/customer/CustomerIntakePortal'

export default function IntakePage({ params }: { params: { token: string } }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e8ecf4' }}>
      <CustomerIntakePortal token={params.token} />
    </div>
  )
}
