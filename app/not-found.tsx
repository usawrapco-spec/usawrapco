import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#4f7fff', marginBottom: '0.5rem' }}>404</h1>
        <p style={{ color: '#9299b5', marginBottom: '1.5rem' }}>Page not found</p>
        <Link
          href="/dashboard"
          style={{ padding: '0.5rem 1.5rem', backgroundColor: '#4f7fff', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.875rem' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
