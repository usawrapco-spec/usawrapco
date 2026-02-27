export default function Custom500() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d0f14', color: '#e8eaed', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#f25a5a', marginBottom: '0.5rem' }}>500</h1>
        <p style={{ color: '#9299b5', marginBottom: '1.5rem' }}>Server-side error occurred</p>
        <a href="/dashboard" style={{ padding: '0.5rem 1.5rem', backgroundColor: '#4f7fff', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem' }}>
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
