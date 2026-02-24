export default function GetStartedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', color: '#e8eaed', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {children}
    </div>
  )
}
