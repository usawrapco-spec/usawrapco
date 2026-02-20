'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Truck } from 'lucide-react'

type Mode = 'signin' | 'signup'

const S = {
  label: {
    display: 'block',
    fontSize: 10,
    fontWeight: 800,
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '.06em',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text1)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
}

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(errorMessage || '')
  const [info, setInfo]         = useState('')
  const router   = useRouter()
  const supabase = createClient()

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setInfo('')
    setPassword('')
    setConfirm('')
  }

  // ── Google OAuth ──────────────────────────────────────────
  async function signInGoogle() {
    setLoading(true); setError(''); setInfo('')
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthErr) {
      console.error('[LoginForm] Google OAuth error:', oauthErr)
      setError(`Google sign-in failed: ${oauthErr.message}`)
      setLoading(false)
    }
    // On success the browser navigates away — no need to setLoading(false)
  }

  // ── Email Sign In ─────────────────────────────────────────
  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setInfo('')
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      setError(signInErr.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  // ── Email Sign Up ─────────────────────────────────────────
  async function signUp(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setInfo('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const redirectTo = `${window.location.origin}/auth/callback`
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    })

    if (signUpErr) {
      setError(signUpErr.message)
      setLoading(false)
      return
    }

    // If a session was returned immediately, email confirmation is disabled — go straight in
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }

    // Email confirmation required — tell the user to check their inbox
    setInfo('Account created! Check your email to confirm your address, then sign in.')
    setLoading(false)
    setMode('signin')
  }

  const isSignUp = mode === 'signup'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>

      {/* ── Mode tabs ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, background: 'var(--surface2)', padding: 4 }}>
        {(['signin', 'signup'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--text1)' : 'var(--text3)',
              boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.3)' : 'none',
              transition: 'all .15s',
            }}
          >
            {m === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </div>

      {/* ── Error / Info banners ────────────────────────────── */}
      {error && (
        <div style={{
          background: 'rgba(242,90,90,.1)', border: '1px solid rgba(242,90,90,.3)',
          borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}
      {info && (
        <div style={{
          background: 'rgba(34,192,122,.1)', border: '1px solid rgba(34,192,122,.3)',
          borderRadius: 8, padding: '10px 14px', color: 'var(--green)', fontSize: 13, marginBottom: 16,
        }}>
          {info}
        </div>
      )}

      {/* ── Google button ───────────────────────────────────── */}
      <button onClick={signInGoogle} disabled={loading} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb', borderRadius: 10,
        padding: '12px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16,
        opacity: loading ? .6 : 1,
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        {isSignUp ? 'Sign Up with Google' : 'Continue with Google'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>or email</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* ── Email form ──────────────────────────────────────── */}
      <form onSubmit={isSignUp ? signUp : signIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={S.label}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required placeholder="you@usawrapco.com" style={S.input}
          />
        </div>
        <div>
          <label style={S.label}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required placeholder="••••••••" minLength={6} style={S.input}
          />
        </div>

        {isSignUp && (
          <div>
            <label style={S.label}>Confirm Password</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required placeholder="••••••••" minLength={6} style={S.input}
            />
          </div>
        )}

        <button type="submit" disabled={loading || !email || !password} style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10,
          padding: '11px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          opacity: (loading || !email || !password) ? .6 : 1,
          marginTop: 4,
        }}>
          {loading
            ? (isSignUp ? 'Creating account…' : 'Signing in…')
            : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>
    </div>
  )
}

export default LoginForm
