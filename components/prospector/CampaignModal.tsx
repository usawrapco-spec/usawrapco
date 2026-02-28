'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { ProspectingCampaign } from './ProspectorApp'
import { X, Zap } from 'lucide-react'

const BUSINESS_TYPES = [
  'Food Trucks', 'Restaurants', 'Delivery Companies', 'Construction',
  'Landscaping', 'Plumbing/HVAC', 'Electricians', 'Real Estate',
  'Car Dealerships', 'Auto Repair', 'Towing', 'Moving Companies',
  'Contractors', 'Retail', 'Medical Transport', 'Event Companies',
  'Breweries/Wineries', 'Food Manufacturers',
]

interface Props {
  profile: Profile
  onClose: () => void
  onCreated: (campaign: ProspectingCampaign) => void
}

export function CampaignModal({ profile, onClose, onCreated }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [radius, setRadius] = useState(25)
  const [minScore, setMinScore] = useState(60)
  const [maxPerRun, setMaxPerRun] = useState(50)
  const [autoRun, setAutoRun] = useState(false)
  const [schedule, setSchedule] = useState('weekly')
  const [saving, setSaving] = useState(false)

  const save = useCallback(async () => {
    if (!name) return
    setSaving(true)
    const { data, error } = await supabase.from('prospecting_campaigns').insert({
      org_id: profile.org_id || ORG_ID,
      name, description: description || null,
      business_types: types.length > 0 ? types : null,
      target_radius_miles: radius,
      target_area: [city, state, zip].filter(Boolean).join(', ') || null,
      auto_run: autoRun, run_frequency: autoRun ? schedule : null,
      max_results: maxPerRun, min_score: minScore,
      status: 'active', results_count: 0,
    }).select().single()
    setSaving(false)
    if (!error && data) onCreated(data)
  }, [supabase, profile.org_id, name, description, types, radius, city, state, zip, autoRun, schedule, maxPerRun, minScore, onCreated])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
    color: 'var(--text1)', fontSize: 13, outline: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 500, maxHeight: '85vh', borderRadius: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
            <Zap size={18} style={{ color: 'var(--accent)' }} /> New Campaign
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Campaign Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Seattle Food Trucks Q1" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Campaign description..." rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Target Business Types</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {BUSINESS_TYPES.map(t => (
                <button key={t} onClick={() => setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  background: types.includes(t) ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.04)',
                  color: types.includes(t) ? 'var(--accent)' : 'var(--text3)',
                  border: types.includes(t) ? '1px solid rgba(79,127,255,0.3)' : '1px solid transparent',
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Seattle" style={inputStyle} />
            </div>
            <div style={{ flex: 0.5 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>State</label>
              <input value={state} onChange={e => setState(e.target.value)} placeholder="WA" style={inputStyle} />
            </div>
            <div style={{ flex: 0.5 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Zip</label>
              <input value={zip} onChange={e => setZip(e.target.value)} placeholder="98101" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Radius: {radius} mi</label>
            <input type="range" min={1} max={50} value={radius} onChange={e => setRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Min Score: {minScore}</label>
              <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Max/run</label>
              <input type="number" min={5} max={200} value={maxPerRun} onChange={e => setMaxPerRun(Number(e.target.value))} style={inputStyle} />
            </div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: autoRun ? 10 : 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Auto-Run</span>
              <button onClick={() => setAutoRun(!autoRun)} style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative',
                background: autoRun ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: autoRun ? 19 : 3, transition: 'left 0.2s' }} />
              </button>
            </div>
            {autoRun && (
              <select value={schedule} onChange={e => setSchedule(e.target.value)} style={inputStyle}>
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={save} disabled={!name || saving} style={{
            width: '100%', padding: 12, borderRadius: 8,
            background: name ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            color: name ? '#fff' : 'var(--text3)', fontSize: 14, fontWeight: 600,
            border: 'none', cursor: name && !saving ? 'pointer' : 'not-allowed',
          }}>{saving ? 'Creating...' : 'Create Campaign'}</button>
        </div>
      </div>
    </div>
  )
}
