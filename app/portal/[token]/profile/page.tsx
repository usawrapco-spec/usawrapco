'use client'

import { useState } from 'react'
import { usePortal } from '@/lib/portal-context'
import { C } from '@/lib/portal-theme'
import { MapPin, Save, Loader2, Check, User } from 'lucide-react'

export default function PortalProfilePage() {
  const { customer, token, projects } = usePortal()

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!address.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError('Please fill in all address fields.')
      return
    }
    setSaving(true)
    setError('')

    try {
      const fullAddress = `${address}, ${city}, ${state} ${zip}`
      const res = await fetch('/api/portal/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, address: fullAddress, city, state, zip }),
      })

      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.surface2,
    color: C.text1, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 6, display: 'block',
    fontFamily: 'Barlow Condensed, sans-serif',
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: `${C.accent}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={20} style={{ color: C.accent }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: 0, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Your Profile
          </h1>
          <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>{customer.name}</p>
        </div>
      </div>

      {/* Contact Info (read-only) */}
      <div style={{ background: C.surface, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Contact Info
        </div>
        {customer.email && (
          <div style={{ fontSize: 13, color: C.text2, marginBottom: 6 }}>{customer.email}</div>
        )}
        {customer.phone && (
          <div style={{ fontSize: 13, color: C.text2 }}>{customer.phone}</div>
        )}
      </div>

      {/* Installation Address */}
      <div style={{ background: C.surface, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <MapPin size={16} style={{ color: C.accent }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>
            Installation Address
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.text2, marginBottom: 16, lineHeight: 1.5 }}>
          If your installation is mobile (we come to you), please enter the address where you'd like us to perform the work.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Street Address</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main Street"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Seattle" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input value={state} onChange={e => setState(e.target.value)} placeholder="WA" maxLength={2} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>ZIP</label>
              <input value={zip} onChange={e => setZip(e.target.value)} placeholder="98101" maxLength={10} style={inputStyle} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 12, color: C.red }}>{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 10,
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: saved ? C.green : C.accent, color: '#fff',
            fontSize: 14, fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
           : saved ? <Check size={16} />
           : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Address'}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
