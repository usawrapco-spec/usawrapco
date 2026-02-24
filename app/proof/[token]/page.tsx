import ProofFlow from './ProofFlow'

export default function ProofPage({ params }: { params: { token: string } }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e8ecf4' }}>
      <ProofFlow token={params.token} />
    </div>
  )
}
