import dynamic from 'next/dynamic'

const PNWPageClient = dynamic(() => import('./PNWPageClient'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d0f14', color: '#9299b5', flexDirection: 'column', gap: 12
    }}>
      <div style={{ fontSize: 24, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 2 }}>
        PNW NAVIGATOR
      </div>
      <div style={{ fontSize: 13 }}>Loading chart...</div>
    </div>
  )
})

export default function PNWPage() {
  return <PNWPageClient />
}
