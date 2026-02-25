'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'

const colors = {
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

export default function PortalLoginClient() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal/setup`,
      },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          fontSize: 32,
          fontWeight: 900,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '-0.01em',
          color: colors.text1,
          marginBottom: 4,
        }}>
          USA WRAP CO
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: colors.text3,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
        }}>
          Customer Portal
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: '40px 32px',
        width: '100%',
        maxWidth: 420,
      }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `${colors.green}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle2 size={28} style={{ color: colors.green }} />
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              fontFamily: "'Barlow Condensed', sans-serif",
              color: colors.text1,
              marginBottom: 10,
            }}>
              Check Your Email
            </div>
            <div style={{ fontSize: 14, color: colors.text2, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a sign-in link to <strong style={{ color: colors.text1 }}>{email}</strong>.
              Click the link in the email to access your portal.
            </div>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: '12px 24px',
                color: colors.text2,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 22,
              fontWeight: 900,
              fontFamily: "'Barlow Condensed', sans-serif",
              color: colors.text1,
              marginBottom: 6,
            }}>
              Sign In
            </div>
            <div style={{ fontSize: 14, color: colors.text2, marginBottom: 28 }}>
              Enter your email to receive a one-time sign-in link.
            </div>

            <form onSubmit={handleMagicLink}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 800,
                color: colors.text3,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <Mail size={18} style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text3,
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%',
                    background: colors.surface2,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: '14px 14px 14px 44px',
                    fontSize: 15,
                    color: colors.text1,
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: `${colors.red}10`,
                  border: `1px solid ${colors.red}30`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  color: colors.red,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: loading ? 'wait' : 'pointer',
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  background: colors.accent,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: loading || !email.trim() ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? (
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    Send Sign-In Link <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 32,
        fontSize: 12,
        color: colors.text3,
        textAlign: 'center',
      }}>
        <div>American Craftsmanship You Can Trust</div>
        <div style={{ marginTop: 4 }}>usawrapco.com</div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
