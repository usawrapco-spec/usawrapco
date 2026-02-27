'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, Lock } from 'lucide-react'
import PresentationViewer, { type PresentationSlide, type PresentationBranding } from '@/components/presentation/PresentationViewer'

export default function PublicPresentationPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const sessionId = useRef(crypto.randomUUID())
  const startedAt = useRef(Date.now())

  useEffect(() => {
    fetch(`/api/presentation/public/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(json.error); return }
        setData(json)
        if (!json.password_protected) setUnlocked(true)
        // Track session start
        fetch(`/api/presentation/public/${token}/decision`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId.current }),
        }).catch((error) => { console.error(error); })
      })
      .catch(() => setError('Failed to load presentation'))
      .finally(() => setLoading(false))
  }, [token])

  // Track view on unmount
  useEffect(() => {
    return () => {
      if (!data) return
      const timeSpent = Math.round((Date.now() - startedAt.current) / 1000)
      navigator.sendBeacon(
        `/api/presentation/public/${token}/decision`,
        JSON.stringify({ sessionId: sessionId.current, timeSpentSeconds: timeSpent })
      )
    }
  }, [data, token])

  const handleDecision = async (decision: 'love_it' | 'request_changes', feedback?: string) => {
    const timeSpent = Math.round((Date.now() - startedAt.current) / 1000)
    await fetch(`/api/presentation/public/${token}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId.current,
        decision,
        feedback,
        timeSpentSeconds: timeSpent,
      }),
    })
  }

  const checkPassword = () => {
    if (pwInput === data?.password) {
      setUnlocked(true)
      setPwError('')
    } else {
      setPwError('Incorrect password. Please try again.')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 size={32} color="#4f7fff" className="animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, textAlign: 'center', padding: 40,
      }}>
        <AlertCircle size={48} color="rgba(255,255,255,0.2)" />
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif' }}>
          {error === 'Presentation link has expired' ? 'Link Expired' : 'Presentation Not Found'}
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 360 }}>
          {error === 'Presentation link has expired'
            ? 'This presentation link has expired. Please contact your wrap shop for an updated link.'
            : 'This presentation link is invalid or no longer available.'}
        </p>
      </div>
    )
  }

  // Password gate
  if (data?.password_protected && !unlocked) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 40,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Lock size={28} color="#4f7fff" />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8 }}>
            Password Protected
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            This presentation requires a password to view.
          </p>
          <input
            type="password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') checkPassword() }}
            placeholder="Enter password"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${pwError ? '#f25a5a' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#fff',
              outline: 'none', marginBottom: 8, boxSizing: 'border-box',
            }}
          />
          {pwError && <p style={{ fontSize: 12, color: '#f25a5a', marginBottom: 12 }}>{pwError}</p>}
          <button
            onClick={checkPassword}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
              background: '#4f7fff', color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif',
            }}
          >
            View Presentation
          </button>
        </div>
      </div>
    )
  }

  const slides: PresentationSlide[] = Array.isArray(data?.slides) ? data.slides : []
  const branding: PresentationBranding = data?.branding || {}

  return (
    <PresentationViewer
      slides={slides}
      clientName={data?.client_name}
      title={data?.title}
      branding={branding}
      timerSeconds={data?.timer_seconds || 4}
      publicMode
      token={token}
      sessionId={sessionId.current}
      onDecision={handleDecision}
    />
  )
}
