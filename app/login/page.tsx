import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>🚗</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 900, letterSpacing: '-.01em', color: 'var(--text1)' }}>
              USA WRAP CO
            </span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>
            Operations Platform
          </div>
        </div>

        <LoginForm errorMessage={searchParams.error} />

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 20 }}>
          Contact your admin if you need access.
        </p>
      </div>
    </div>
  )
}
