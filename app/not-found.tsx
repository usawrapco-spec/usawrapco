import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', color: 'var(--text1)', gap: 16,
    }}>
      <div style={{ fontSize: 64, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Barlow Condensed, sans-serif' }}>
        404
      </div>
      <div style={{ fontSize: 18, color: 'var(--text2)' }}>Page not found</div>
      <Link href="/dashboard" style={{
        padding: '8px 20px', background: 'var(--accent)', color: '#fff',
        borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
      }}>
        Back to Dashboard
      </Link>
    </div>
  )
}
