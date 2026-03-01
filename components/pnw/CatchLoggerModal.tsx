'use client'
import { useState } from 'react'
import { X, Fish, Save } from 'lucide-react'

interface CatchLoggerModalProps {
  tripId?: string
  currentLat?: number
  currentLng?: number
  onClose: () => void
  onSaved: () => void
}

interface CatchForm {
  species: string
  weight: string
  length: string
  technique: string
  notes: string
  released: boolean
}

const COMMON_SPECIES = [
  'Chinook Salmon', 'Coho Salmon', 'Pink Salmon', 'Chum Salmon', 'Sockeye Salmon',
  'Steelhead', 'Cutthroat Trout', 'Rainbow Trout', 'Largemouth Bass', 'Smallmouth Bass',
  'Halibut', 'Lingcod', 'Rockfish', 'Dungeness Crab', 'Other',
]

export default function CatchLoggerModal({ tripId, currentLat, currentLng, onClose, onSaved }: CatchLoggerModalProps) {
  const [form, setForm] = useState<CatchForm>({
    species: '', weight: '', length: '', technique: '', notes: '', released: false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof CatchForm>(key: K, value: CatchForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.species) return
    setSaving(true)
    try {
      await fetch('/api/pnw/catches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          species_name: form.species,
          weight_lbs: form.weight ? parseFloat(form.weight) : null,
          length_inches: form.length ? parseFloat(form.length) : null,
          technique: form.technique || null,
          notes: form.notes || null,
          was_released: form.released,
          lat: currentLat,
          lng: currentLng,
          catch_date: new Date().toISOString(),
        }),
      })
      setSaved(true)
      setTimeout(() => onSaved(), 800)
    } catch {
      // non-blocking
      setSaved(true)
      setTimeout(() => onSaved(), 800)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: 'var(--text1)', fontSize: 13, outline: 'none',
    fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14, width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Fish size={16} color="#22c07a" />
            <span style={{ fontSize: 15, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.5px' }}>
              LOG A CATCH
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Species */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', marginBottom: 5 }}>
              SPECIES *
            </label>
            <select
              value={form.species}
              onChange={e => set('species', e.target.value)}
              style={{ ...inputStyle }}
            >
              <option value="">Select species…</option>
              {COMMON_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Weight / Length row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', marginBottom: 5 }}>
                WEIGHT (lbs)
              </label>
              <input
                type="number" step="0.1" min="0"
                value={form.weight}
                onChange={e => set('weight', e.target.value)}
                placeholder="0.0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', marginBottom: 5 }}>
                LENGTH (in)
              </label>
              <input
                type="number" step="0.5" min="0"
                value={form.length}
                onChange={e => set('length', e.target.value)}
                placeholder="0.0"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Technique */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', marginBottom: 5 }}>
              TECHNIQUE
            </label>
            <input
              type="text"
              value={form.technique}
              onChange={e => set('technique', e.target.value)}
              placeholder="e.g. trolling, casting, jigging…"
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', marginBottom: 5 }}>
              NOTES
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Conditions, bait, notes…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Released toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
              onClick={() => set('released', !form.released)}
              style={{
                width: 36, height: 20, borderRadius: 10, position: 'relative',
                background: form.released ? '#22c07a' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${form.released ? '#22c07a' : 'rgba(255,255,255,0.15)'}`,
                transition: 'all 0.2s', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 2, width: 14, height: 14, borderRadius: 7,
                background: '#fff', transition: 'left 0.2s',
                left: form.released ? 18 : 2,
              }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, letterSpacing: '0.3px' }}>
              Released back to water
            </span>
          </label>

          {/* Location info */}
          {currentLat !== undefined && currentLng !== undefined && (
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 5 }}>
              Location: {currentLat.toFixed(4)}°N {Math.abs(currentLng).toFixed(4)}°W
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!form.species || saving || saved}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8, border: 'none', cursor: form.species && !saving && !saved ? 'pointer' : 'default',
              background: saved ? 'rgba(34,192,122,0.2)' : form.species ? '#22c07a' : 'rgba(255,255,255,0.05)',
              color: saved ? '#22c07a' : form.species ? '#fff' : 'var(--text3)',
              fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.5px',
              transition: 'all 0.2s', marginTop: 4,
            }}
          >
            <Save size={14} />
            {saved ? 'SAVED!' : saving ? 'SAVING…' : 'SAVE CATCH'}
          </button>
        </div>
      </div>
    </div>
  )
}
