'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff, Lock } from 'lucide-react'

const C = {
  bg: '#0d0f14',
  surface: '#13151c',
  surface2: '#1a1d27',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  text1: '#e8eaed',
  text2: '#9299b5',
  text3: '#5a6080',
}

type Tab = 'google' | 'password' | 'magic'
type Mode = 'signin' | 'signup'

interface Props {
  /** Optional portal token to redirect back to after auth */
  next?: string
}

export default function PortalLoginClient({ next }: Props) {
  const [tab, setTab] = useState<Tab>('google')
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const redirectOrigin =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? window.location.origin
      : 'https://app.usawrapco.com'

  const callbackUrl = `${redirectOrigin}/auth/callback?next=${encodeURIComponent(next || '/portal')}`

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
    if (e) { setError(e.message); setLoading(false) }
    // On success the browser navigates away — no setLoading(false) needed
  }

  // ── Email / Password ────────────────────────────────────────────────────────
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim() || undefined },
          emailRedirectTo: callbackUrl,
        },
      })
      if (signUpErr) {
        setError(signUpErr.message)
        setLoading(false)
        return
      }
      // Sign-up sends a confirmation email; show success
      setSent(true)
      setLoading(false)
    } else {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInErr) {
        setError(signInErr.message)
        setLoading(false)
        return
      }
      // Signed in — redirect
      window.location.href = next || '/portal'
    }
  }

  // ── Magic link ──────────────────────────────────────────────────────────────
  const handleMagicLink = async (evt: React.FormEvent) => {
    evt.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: callbackUrl },
    })
    if (otpErr) {
      setError(otpErr.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  // ── "Check your email" success screen ──────────────────────────────────────
  if (sent) {
    return (
      <Page>
        <Card style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `${C.green}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle2 size={28} style={{ color: C.green }} />
          </div>
          <Heading>Check Your Email</Heading>
          <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, marginBottom: 24 }}>
            {tab === 'magic'
              ? <>We sent a sign-in link to <strong style={{ color: C.text1 }}>{email}</strong>. Click the link to access your portal.</>
              : <>We sent a confirmation link to <strong style={{ color: C.text1 }}>{email}</strong>. Click it to finish creating your account.</>
            }
          </p>
          <GhostBtn onClick={() => { setSent(false); setEmail('') }}>
            Use a different email
          </GhostBtn>
        </Card>
      </Page>
    )
  }

  return (
    <Page>
      <Card>
        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          background: C.surface2,
          borderRadius: 12,
          padding: 4,
          marginBottom: 28,
          gap: 4,
        }}>
          {(['google', 'password', 'magic'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setSent(false) }}
              style={{
                flex: 1,
                padding: '9px 4px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                background: tab === t ? C.surface : 'transparent',
                color: tab === t ? C.text1 : C.text3,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {t === 'google' ? 'Google' : t === 'password' ? 'Email & Password' : 'Email Link'}
            </button>
          ))}
        </div>

        {/* ── Google ── */}
        {tab === 'google' && (
          <>
            <Heading style={{ marginBottom: 6 }}>Sign in with Google</Heading>
            <p style={{ fontSize: 14, color: C.text2, marginBottom: 28 }}>
              The fastest way to create or access your portal account.
            </p>
            {error && <ErrorBox>{error}</ErrorBox>}
            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                cursor: loading ? 'wait' : 'pointer',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: 'inherit',
                background: C.surface2,
                color: C.text1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </button>
          </>
        )}

        {/* ── Email & Password ── */}
        {tab === 'password' && (
          <>
            {/* Sign in / Sign up toggle */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {(['signin', 'signup'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 10,
                    border: mode === m ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    background: mode === m ? `${C.accent}15` : 'transparent',
                    color: mode === m ? C.accent : C.text3,
                  }}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handlePassword}>
              {mode === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <Label>Your Name</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    autoComplete="name"
                  />
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <Label>Email Address</Label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.text3 }} />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ paddingLeft: 42 }}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <Label>Password {mode === 'signup' && <span style={{ color: C.text3, textTransform: 'none', letterSpacing: 0 }}>(min 6 characters)</span>}</Label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.text3 }} />
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ paddingLeft: 42, paddingRight: 44 }}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 4 }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <ErrorBox>{error}</ErrorBox>}

              <PrimaryBtn type="submit" disabled={loading || !email.trim() || !password}>
                {loading
                  ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
                }
              </PrimaryBtn>
            </form>
          </>
        )}

        {/* ── Magic Link ── */}
        {tab === 'magic' && (
          <>
            <Heading style={{ marginBottom: 6 }}>Email Sign-In Link</Heading>
            <p style={{ fontSize: 14, color: C.text2, marginBottom: 28 }}>
              Enter your email and we&apos;ll send a one-click sign-in link — no password needed.
            </p>
            <form onSubmit={handleMagicLink}>
              <div style={{ marginBottom: 20 }}>
                <Label>Email Address</Label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.text3 }} />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={{ paddingLeft: 42 }}
                    autoComplete="email"
                  />
                </div>
              </div>
              {error && <ErrorBox>{error}</ErrorBox>}
              <PrimaryBtn type="submit" disabled={loading || !email.trim()}>
                {loading
                  ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  : <>Send Sign-In Link <ArrowRight size={18} /></>
                }
              </PrimaryBtn>
            </form>
          </>
        )}
      </Card>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Page>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: C.text1, marginBottom: 2 }}>
          USA WRAP CO
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Customer Portal
        </div>
      </div>
      {children}
      <div style={{ marginTop: 28, fontSize: 12, color: C.text3, textAlign: 'center' }}>
        <div>American Craftsmanship You Can Trust</div>
        <div style={{ marginTop: 3 }}>usawrapco.com</div>
      </div>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      padding: '36px 32px',
      width: '100%',
      maxWidth: 440,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Heading({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 22,
      fontWeight: 900,
      fontFamily: "'Barlow Condensed', sans-serif",
      color: C.text1,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 11,
      fontWeight: 800,
      color: C.text3,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: 6,
    }}>
      {children}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: C.surface2,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '13px 14px',
        fontSize: 14,
        color: C.text1,
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        ...props.style,
      }}
    />
  )
}

function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        width: '100%',
        padding: '14px 20px',
        borderRadius: 12,
        border: 'none',
        cursor: props.disabled ? 'wait' : 'pointer',
        fontSize: 15,
        fontWeight: 800,
        fontFamily: "'Barlow Condensed', sans-serif",
        background: C.accent,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: props.disabled ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    />
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '12px 24px',
        color: C.text2,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: `${C.red}10`,
      border: `1px solid ${C.red}30`,
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 16,
      fontSize: 13,
      color: C.red,
    }}>
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.185 17.64 11.847 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
