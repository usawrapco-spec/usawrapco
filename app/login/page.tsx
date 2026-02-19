import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl">🚗</span>
            <span
              className="font-display text-3xl font-900 tracking-tight text-text1"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              USA WRAP CO
            </span>
          </div>
          <div className="text-xs font-700 tracking-widest text-text3 uppercase">
            Operations Platform
          </div>
        </div>

        <LoginForm
          errorMessage={searchParams.error}
          successMessage={searchParams.message}
        />

        <p className="text-center text-xs text-text3 mt-6">
          Contact your admin if you need access.
        </p>
      </div>
    </div>
  )
}
