'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'

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

interface Props {
  userId: string
  userEmail: string
}

export default function PortalSetupClient({ userId, userEmail }: Props) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const valid = name.trim().length >= 2 && password.length >= 6 && password === confirm

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    setError('')

    // Set password
    const { error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError) {
      setError(pwError.message)
      setLoading(false)
      return
    }

    // Update profile name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    router.push('/portal')
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
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          fontFamily: "'Barlow Condensed', sans-serif",
          color: colors.text1,
          marginBottom: 6,
        }}>
          Welcome! Set Up Your Account
        </div>
        <div style={{ fontSize: 14, color: colors.text2, marginBottom: 28 }}>
          Signed in as <strong style={{ color: colors.text1 }}>{userEmail}</strong>.
          Set your name and password for future sign-ins.
        </div>

        <form onSubmit={handleSetup}>
          {/* Name */}
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 800,
            color: colors.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Your Name
          </label>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <User size={18} style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.text3,
            }} />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Smith"
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

          {/* Password */}
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 800,
            color: colors.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Create Password
          </label>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Lock size={18} style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.text3,
            }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
              style={{
                width: '100%',
                background: colors.surface2,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: '14px 44px 14px 44px',
                fontSize: 15,
                color: colors.text1,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: colors.text3,
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm */}
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 800,
            color: colors.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Confirm Password
          </label>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <Lock size={18} style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.text3,
            }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              required
              style={{
                width: '100%',
                background: colors.surface2,
                border: `1px solid ${confirm && password !== confirm ? colors.red : colors.border}`,
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

          {confirm && password !== confirm && (
            <div style={{
              fontSize: 12,
              color: colors.red,
              marginBottom: 16,
              marginTop: -16,
            }}>
              Passwords do not match
            </div>
          )}

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
            disabled={loading || !valid}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 12,
              border: 'none',
              cursor: loading ? 'wait' : valid ? 'pointer' : 'not-allowed',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: "'Barlow Condensed', sans-serif",
              background: colors.accent,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: loading || !valid ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                Continue to Portal <ArrowRight size={18} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.location.href = '/portal'}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '12px 20px',
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              background: 'transparent',
              color: colors.text2,
              textAlign: 'center',
            }}
          >
            Skip for now
          </button>
        </form>
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
