'use client'

import { useState, useRef, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, Camera, Pen, RotateCcw, Check, Loader2 } from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#1e2738',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', amber: '#f59e0b',
  text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const DAMAGE_TYPES = ['Scratch', 'Chip', 'Dent', 'Crack', 'Rust', 'Stain'] as const
const FUEL_LEVELS = ['empty', '1/4', '1/2', '3/4', 'full'] as const
const ZONES = [
  { key: 'front', label: 'Front Bumper' },
  { key: 'hood', label: 'Hood' },
  { key: 'roof', label: 'Roof' },
  { key: 'driver_side', label: 'Driver Side' },
  { key: 'passenger_side', label: 'Pass. Side' },
  { key: 'rear', label: 'Rear Bumper' },
  { key: 'left_fender', label: 'Left Fender' },
  { key: 'right_fender', label: 'Right Fender' },
  { key: 'interior', label: 'Interior' },
]

interface DamageEntry {
  zone: string
  type: string
  notes: string
  photo_url: string
}

interface Props {
  report: any
  token: string
}

export default function ConditionReportClient({ report, token }: Props) {
  const [mileage, setMileage] = useState(report.mileage?.toString() || '')
  const [fuelLevel, setFuelLevel] = useState<string>(report.fuel_level || '')
  const [vin, setVin] = useState(report.vin || '')
  const [damageZones, setDamageZones] = useState<DamageEntry[]>(report.damage_zones || [])
  const [activeZone, setActiveZone] = useState<string | null>(null)
  const [installerNotes, setInstallerNotes] = useState(report.installer_notes || '')
  const [signature, setSignature] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signed, setSigned] = useState(report.status === 'signed')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)

  const addDamage = (zone: string, type: string) => {
    setDamageZones(prev => [...prev, { zone, type, notes: '', photo_url: '' }])
    setActiveZone(zone)
  }

  const removeDamage = (idx: number) => {
    setDamageZones(prev => prev.filter((_, i) => i !== idx))
  }

  const updateDamage = (idx: number, field: keyof DamageEntry, val: string) => {
    setDamageZones(prev => prev.map((d, i) => i === idx ? { ...d, [field]: val } : d))
  }

  // Signature canvas
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineTo(x, y)
    ctx.strokeStyle = C.accent
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const endDraw = () => {
    isDrawing.current = false
    const canvas = canvasRef.current
    if (canvas) setSignature(canvas.toDataURL())
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  const saveReport = async () => {
    setSaving(true)
    try {
      await fetch(`/api/condition-reports/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mileage: mileage ? parseInt(mileage) : null,
          fuel_level: fuelLevel,
          vin,
          damage_zones: damageZones,
          installer_notes: installerNotes,
          pre_existing_damage: damageZones.length > 0,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const signReport = async () => {
    if (!signature || !acknowledged) return
    setSigning(true)
    try {
      await fetch(`/api/condition-reports/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, acknowledged }),
      })
      setSigned(true)
    } finally {
      setSigning(false)
    }
  }

  const isCustomerView = report.status === 'sent' || report.status === 'signed'
  const project = (report as any).projects

  if (signed) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <CheckCircle2 size={64} color={C.green} style={{ marginBottom: 24 }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text1, marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Report Signed
          </div>
          <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.6 }}>
            Thank you! Your vehicle condition report has been signed and saved.
            This protects both you and us before installation begins.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text1, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>
          USA Wrap Co
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text1, fontFamily: 'Barlow Condensed, sans-serif' }}>
          Vehicle Condition Report
        </div>
        {project?.title && (
          <div style={{ fontSize: 13, color: C.text2, marginTop: 2 }}>Job: {project.title}</div>
        )}
        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
          {report.vehicle_year} {report.vehicle_make} {report.vehicle_model}
          {report.vehicle_color && ` · ${report.vehicle_color}`}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Vehicle Info */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Vehicle Info
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.text2, display: 'block', marginBottom: 4 }}>Mileage</label>
              <input
                type="number"
                value={mileage}
                onChange={e => setMileage(e.target.value)}
                placeholder="e.g. 42500"
                disabled={isCustomerView}
                style={{ width: '100%', padding: '10px 12px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.text2, display: 'block', marginBottom: 8 }}>Fuel Level</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {FUEL_LEVELS.map(fl => (
                  <button
                    key={fl}
                    onClick={() => !isCustomerView && setFuelLevel(fl)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${fuelLevel === fl ? C.accent : C.border}`,
                      background: fuelLevel === fl ? 'rgba(79,127,255,0.15)' : C.surface2,
                      color: fuelLevel === fl ? C.accent : C.text2, fontSize: 11, fontWeight: 700, cursor: isCustomerView ? 'default' : 'pointer',
                    }}
                  >
                    {fl}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.text2, display: 'block', marginBottom: 4 }}>VIN (optional)</label>
              <input
                value={vin}
                onChange={e => setVin(e.target.value)}
                placeholder="17-character VIN"
                disabled={isCustomerView}
                style={{ width: '100%', padding: '10px 12px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Damage Zones */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Pre-Existing Damage
          </div>
          <div style={{ fontSize: 12, color: C.text2, marginBottom: 14 }}>
            Tap a zone, then select the damage type. This protects you after installation.
          </div>

          {/* Zone Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
            {ZONES.map(z => {
              const hasDamage = damageZones.some(d => d.zone === z.key)
              return (
                <button
                  key={z.key}
                  onClick={() => !isCustomerView && setActiveZone(activeZone === z.key ? null : z.key)}
                  style={{
                    padding: '10px 6px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: isCustomerView ? 'default' : 'pointer',
                    border: `1px solid ${activeZone === z.key ? C.accent : hasDamage ? C.amber : C.border}`,
                    background: activeZone === z.key ? 'rgba(79,127,255,0.12)' : hasDamage ? 'rgba(245,158,11,0.08)' : C.surface2,
                    color: activeZone === z.key ? C.accent : hasDamage ? C.amber : C.text2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {hasDamage && <AlertTriangle size={10} />}
                  {z.label}
                </button>
              )
            })}
          </div>

          {/* Damage type selector for active zone */}
          {activeZone && !isCustomerView && (
            <div style={{ background: C.surface2, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 10 }}>
                Add damage to: <strong style={{ color: C.text1 }}>{ZONES.find(z => z.key === activeZone)?.label}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DAMAGE_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => addDamage(activeZone, type)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: 'rgba(242,90,90,0.12)', border: `1px solid rgba(242,90,90,0.3)`, color: C.red,
                    }}
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Damage list */}
          {damageZones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {damageZones.map((d, i) => (
                <div key={i} style={{ background: 'rgba(242,90,90,0.06)', border: '1px solid rgba(242,90,90,0.2)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
                      {ZONES.find(z => z.key === d.zone)?.label} — {d.type}
                    </span>
                    {!isCustomerView && (
                      <button onClick={() => removeDamage(i)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 16 }}>×</button>
                    )}
                  </div>
                  <textarea
                    value={d.notes}
                    onChange={e => updateDamage(i, 'notes', e.target.value)}
                    placeholder="Add notes (e.g. minor surface scratch, 3 inches)"
                    rows={2}
                    disabled={isCustomerView}
                    style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text1, padding: '8px 10px', fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          )}

          {damageZones.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: C.text3, fontSize: 13 }}>
              <Check size={20} color={C.green} style={{ margin: '0 auto 6px' }} />
              No pre-existing damage marked
            </div>
          )}
        </div>

        {/* Installer Notes */}
        {!isCustomerView && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'Barlow Condensed, sans-serif' }}>
              Installer Notes
            </div>
            <textarea
              value={installerNotes}
              onChange={e => setInstallerNotes(e.target.value)}
              placeholder="Any additional notes about the vehicle condition..."
              rows={4}
              style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, padding: '10px 12px', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Save Report (installer) */}
        {!isCustomerView && (
          <button
            onClick={saveReport}
            disabled={saving}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: saved ? C.green : C.accent, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={18} /> : <Camera size={18} />}
            {saving ? 'Saving...' : saved ? 'Saved — Sent to Customer' : 'Save & Send to Customer'}
          </button>
        )}

        {/* Customer Signature Section */}
        {isCustomerView && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>
              Customer Review & Signature
            </div>
            <div style={{ fontSize: 13, color: C.text2, marginBottom: 16, lineHeight: 1.6 }}>
              Please review the vehicle condition above. Any pre-existing damage is noted.
              By signing below, you confirm that this report accurately reflects your vehicle&apos;s condition before service.
            </div>

            {/* Signature pad */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Sign below</span>
                <button onClick={clearSignature} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RotateCcw size={12} /> Clear
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={560}
                height={120}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
                style={{
                  width: '100%', height: 120, background: C.surface2,
                  border: `2px dashed ${signature ? C.accent : C.border}`,
                  borderRadius: 8, cursor: 'crosshair', touchAction: 'none', display: 'block',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
                style={{ marginTop: 2, accentColor: C.accent, width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
                I confirm that this report accurately reflects the condition of my vehicle before installation.
                I understand that USA Wrap Co is not responsible for pre-existing damage.
              </span>
            </label>

            <button
              onClick={signReport}
              disabled={signing || !signature || !acknowledged}
              style={{
                width: '100%', padding: 14, borderRadius: 10, border: 'none',
                background: !signature || !acknowledged ? C.surface2 : C.green,
                color: !signature || !acknowledged ? C.text3 : '#fff',
                fontSize: 15, fontWeight: 800, cursor: !signature || !acknowledged ? 'not-allowed' : 'pointer',
                fontFamily: 'Barlow Condensed, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {signing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Pen size={18} />}
              {signing ? 'Signing...' : 'Sign & Confirm'}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
