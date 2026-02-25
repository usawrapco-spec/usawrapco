import { LoginForm } from '@/components/auth/LoginForm'
import { Truck } from 'lucide-react'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp"
            alt="USA Wrap Co"
            style={{
              height: 80,
              width: 'auto',
              margin: '0 auto 12px',
              display: 'block',
            }}
          />
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: 'var(--text2)',
            marginBottom: 4,
          }}>
            American Craftsmanship You Can Trust™
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.1em',
            color: 'var(--text3)',
            textTransform: 'uppercase',
          }}>
            WrapShop Pro v6.0
          </div>
        </div>

        <LoginForm errorMessage={searchParams.error} />

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 20 }}>
          Need access? Create an account or contact your admin.
        </p>
      </div>
    </div>
  )
}
