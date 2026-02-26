'use client'

import { useState } from 'react'
import { Briefcase, DollarSign, Check, Loader2 } from 'lucide-react'

interface JobLoggerProps {
  campaignId: string
  onLogged?: () => void
}

const SOURCES = [
  'Called tracking number',
  'Scanned QR code',
  'Saw the van / truck',
  'Word of mouth / referral',
  'Other',
]

export default function JobLogger({ campaignId, onLogged }: JobLoggerProps) {
  const [source, setSource] = useState('')
  const [jobValue, setJobValue] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async () => {
    if (!source || !jobValue) return
    setSaving(true)

    try {
      await fetch('/api/roi/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          event_type: 'job_logged',
          job_value: parseFloat(jobValue),
          job_notes: `Source: ${source}${notes ? `. ${notes}` : ''}`,
          job_confirmed: true,
        }),
      })
      setSaved(true)
      setSource('')
      setJobValue('')
      setNotes('')
      onLogged?.()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to log job:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Briefcase size={16} style={{ color: 'var(--amber)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Log a Job</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
        Got a job from your wrap? Log it here to track your ROI.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={labelStyle}>How did they find you?</label>
          <select value={source} onChange={e => setSource(e.target.value)} style={inputStyle}>
            <option value="">Select...</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Job Value ($)</label>
          <div style={{ position: 'relative' }}>
            <DollarSign size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              type="number"
              value={jobValue}
              onChange={e => setJobValue(e.target.value)}
              placeholder="0.00"
              style={{ ...inputStyle, paddingLeft: 28 }}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Notes (optional)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional details"
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!source || !jobValue || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px',
            borderRadius: 8,
            background: source && jobValue ? 'var(--amber)' : 'var(--surface2)',
            color: source && jobValue ? '#000' : 'var(--text3)',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: source && jobValue ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Briefcase size={14} />}
          {saving ? 'Saving...' : saved ? 'Logged!' : 'Log Job'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text3)',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface2)',
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
}
