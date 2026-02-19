'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LoginFormProps {
  errorMessage?: string
  successMessage?: string
}

export function LoginForm({ errorMessage, successMessage }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorMessage || '')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="card anim-pop-in" style={{ padding: '28px' }}>
      <h1 className="text-lg font-800 text-text1 mb-1">Sign in</h1>
      <p className="text-sm text-text3 mb-6">Enter your credentials to access ops</p>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red/10 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-green/10 border border-green/30 text-green text-sm">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            className="field"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            className="field"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Signing in…
            </span>
          ) : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
