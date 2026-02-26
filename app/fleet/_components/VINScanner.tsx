'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Keyboard, Upload, Loader2, Check, AlertCircle, X, Plus } from 'lucide-react'

interface Customer {
  id: string
  name: string
  business_name?: string
}

interface DecodedVehicle {
  vin: string
  year: string
  make: string
  model: string
  trim: string
  body_class: string
  engine: string
  fuel_type: string
  drive_type: string
  color: string
  customer_id: string
  error?: string
}

interface Props {
  customers: Customer[]
  onRefresh: () => void
}

async function decodeVIN(vin: string): Promise<DecodedVehicle> {
  const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${vin}?format=json`)
  const data = await res.json()
  const r = data.Results?.[0]
  if (!r || !r.Make) throw new Error('Could not decode VIN')
  const cylinders = r.EngineCylinders ? `${r.EngineCylinders}cyl` : ''
  const displacement = r.DisplacementL ? `${Number(r.DisplacementL).toFixed(1)}L` : ''
  const engine = [displacement, cylinders].filter(Boolean).join(' ')
  return {
    vin,
    year: r.ModelYear || '',
    make: r.Make || '',
    model: r.Model || '',
    trim: r.Trim || '',
    body_class: r.BodyClass || '',
    engine,
    fuel_type: r.FuelTypePrimary || '',
    drive_type: r.DriveType || '',
    color: '',
    customer_id: '',
  }
}

export default function VINScanner({ customers, onRefresh }: Props) {
  const [mode, setMode] = useState<'camera' | 'manual' | 'bulk'>('manual')
  const [manualVin, setManualVin] = useState('')
  const [decoded, setDecoded] = useState<DecodedVehicle | null>(null)
  const [decoding, setDecoding] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)

  // Bulk state
  const [bulkText, setBulkText] = useState('')
  const [bulkResults, setBulkResults] = useState<DecodedVehicle[]>([])
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, running: false })

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraSupported, setCameraSupported] = useState(true)
  const scanRef = useRef<number>(0)

  // Camera scanner
  const startCamera = useCallback(async () => {
    try {
      if (!('BarcodeDetector' in window)) {
        setCameraSupported(false)
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
        startScanLoop()
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraSupported(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    if (scanRef.current) cancelAnimationFrame(scanRef.current)
    setCameraActive(false)
  }, [])

  const startScanLoop = useCallback(() => {
    const detector = new (window as any).BarcodeDetector({ formats: ['code_128', 'code_39'] })
    const scan = async () => {
      if (!videoRef.current || !cameraActive) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        for (const bc of barcodes) {
          const value = bc.rawValue?.replace(/[^A-Z0-9]/gi, '')
          if (value?.length === 17) {
            stopCamera()
            setManualVin(value.toUpperCase())
            handleDecode(value.toUpperCase())
            return
          }
        }
      } catch {}
      scanRef.current = requestAnimationFrame(scan)
    }
    scanRef.current = requestAnimationFrame(scan)
  }, [cameraActive])

  useEffect(() => { return () => stopCamera() }, [stopCamera])

  const handleDecode = async (vin?: string) => {
    const v = (vin || manualVin).trim().toUpperCase()
    if (v.length !== 17) { setError('VIN must be 17 characters'); return }
    setDecoding(true); setError(''); setDecoded(null); setAdded(false)
    try {
      const result = await decodeVIN(v)
      setDecoded(result)
    } catch (err: any) {
      setError(err.message || 'Decode failed')
    } finally {
      setDecoding(false)
    }
  }

  const addToFleet = async () => {
    if (!decoded) return
    setDecoding(true)
    try {
      const res = await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...decoded, source: 'vin-scan' }),
      })
      if (res.ok) {
        setAdded(true)
        onRefresh()
      }
    } catch {} finally { setDecoding(false) }
  }

  const handleBulkDecode = async () => {
    const vins = bulkText.split(/[,\n\r]+/).map(v => v.trim().toUpperCase()).filter(v => v.length === 17)
    if (!vins.length) { setError('No valid 17-character VINs found'); return }
    setBulkProgress({ current: 0, total: vins.length, running: true })
    setBulkResults([])
    const results: DecodedVehicle[] = []
    for (let i = 0; i < vins.length; i++) {
      setBulkProgress(p => ({ ...p, current: i + 1 }))
      try {
        const r = await decodeVIN(vins[i])
        results.push(r)
      } catch {
        results.push({ vin: vins[i], year: '', make: '', model: '', trim: '', body_class: '', engine: '', fuel_type: '', drive_type: '', color: '', customer_id: '', error: 'Decode failed' })
      }
      if (i < vins.length - 1) await new Promise(r => setTimeout(r, 200))
    }
    setBulkResults(results)
    setBulkProgress(p => ({ ...p, running: false }))
  }

  const addAllToFleet = async () => {
    const valid = bulkResults.filter(r => !r.error && r.make)
    if (!valid.length) return
    setDecoding(true)
    try {
      await fetch('/api/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles: valid.map(v => ({ ...v, source: 'bulk-import' })) }),
      })
      onRefresh()
      setBulkResults([])
      setBulkText('')
    } catch {} finally { setDecoding(false) }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: 'var(--text1)', fontSize: 13, outline: 'none',
  }

  const tabBtn = (m: typeof mode, label: string, Icon: any) => (
    <button
      key={m}
      onClick={() => { setMode(m); if (m !== 'camera') stopCamera() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: mode === m ? 'rgba(79,127,255,0.12)' : 'transparent',
        color: mode === m ? 'var(--accent)' : 'var(--text2)',
        border: mode === m ? '1px solid rgba(79,127,255,0.25)' : '1px solid transparent',
        cursor: 'pointer',
      }}
    >
      <Icon size={14} /> {label}
    </button>
  )

  return (
    <div>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabBtn('camera', 'Camera Scan', Camera)}
        {tabBtn('manual', 'Manual Entry', Keyboard)}
        {tabBtn('bulk', 'Bulk Import', Upload)}
      </div>

      {/* Camera mode */}
      {mode === 'camera' && (
        <div>
          {!cameraSupported && (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <AlertCircle size={32} style={{ color: 'var(--amber)', margin: '0 auto 8px' }} />
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                Camera scanning not supported in this browser. Use Manual Entry or Bulk Import instead.
              </p>
            </div>
          )}
          {cameraSupported && !cameraActive && (
            <button onClick={startCamera} style={{
              padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
            }}>
              <Camera size={16} /> Start Camera
            </button>
          )}
          {cameraActive && (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxWidth: 640, margin: '0 auto' }}>
              <video ref={videoRef} style={{ width: '100%', display: 'block' }} playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {/* Scan line */}
              <div style={{
                position: 'absolute', left: '10%', right: '10%', height: 2,
                background: 'var(--green)', boxShadow: '0 0 20px var(--green)',
                top: '50%', animation: 'scanLine 2s ease-in-out infinite',
              }} />
              <style>{`@keyframes scanLine { 0%,100% { top: 30%; } 50% { top: 70%; } }`}</style>
              <button onClick={stopCamera} style={{
                position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)',
                border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff',
              }}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div style={{ maxWidth: 500 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
            Enter 17-Character VIN
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={manualVin}
              onChange={e => setManualVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={17}
              placeholder="1FTBW2CM5MKA12345"
              style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', flex: 1 }}
            />
            <button
              onClick={() => handleDecode()}
              disabled={manualVin.length !== 17 || decoding}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: manualVin.length === 17 ? 'var(--accent)' : 'var(--surface2)',
                color: manualVin.length === 17 ? '#fff' : 'var(--text3)',
                border: 'none', cursor: manualVin.length === 17 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {decoding ? <Loader2 size={14} className="animate-spin" /> : null}
              Decode
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            {manualVin.length}/17 characters
          </div>
        </div>
      )}

      {/* Bulk mode */}
      {mode === 'bulk' && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
            Paste VINs (one per line or comma-separated)
          </label>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={`1FTBW2CM5MKA12345\n1HGBH41JXMN109186\nWAUZZZ8V0KA123456`}
            style={{ ...fieldStyle, minHeight: 120, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <button
              onClick={handleBulkDecode}
              disabled={bulkProgress.running || !bulkText.trim()}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: bulkProgress.running ? 0.6 : 1,
              }}
            >
              {bulkProgress.running ? <Loader2 size={14} className="animate-spin" /> : null}
              Decode All
            </button>
            {bulkProgress.running && (
              <span style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
                Decoding {bulkProgress.current}/{bulkProgress.total}...
              </span>
            )}
          </div>

          {/* Bulk results table */}
          {bulkResults.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                  Results ({bulkResults.filter(r => !r.error).length}/{bulkResults.length} decoded)
                </span>
                <button
                  onClick={addAllToFleet}
                  disabled={decoding}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Plus size={14} /> Add All to Fleet
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['VIN', 'Year', 'Make', 'Model', 'Status'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600,
                          color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text2)' }}>
                          {r.vin.slice(0, 11)}...
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text1)' }}>{r.year || '--'}</td>
                        <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text1)' }}>{r.make || '--'}</td>
                        <td style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text1)' }}>{r.model || '--'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {r.error ? (
                            <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertCircle size={12} /> Error
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Check size={12} /> OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(242,90,90,0.1)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Decoded result card */}
      {decoded && (mode === 'manual' || mode === 'camera') && (
        <div className="card" style={{ marginTop: 20, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 14, fontFamily: 'Barlow Condensed, sans-serif' }}>
            Decoded Vehicle
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Year', value: decoded.year },
              { label: 'Make', value: decoded.make },
              { label: 'Model', value: decoded.model },
              { label: 'Body Type', value: decoded.body_class },
              { label: 'Engine', value: decoded.engine },
              { label: 'Fuel', value: decoded.fuel_type },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>{f.label}</div>
                <div style={{ fontSize: 14, color: 'var(--text1)', fontWeight: 600, marginTop: 2 }}>{f.value || '--'}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                Assign to Customer
              </label>
              <select
                style={fieldStyle}
                value={decoded.customer_id}
                onChange={e => setDecoded(d => d ? { ...d, customer_id: e.target.value } : d)}
              >
                <option value="">-- None --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.business_name ? ` (${c.business_name})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                Color (not in VIN)
              </label>
              <input
                style={fieldStyle}
                value={decoded.color}
                onChange={e => setDecoded(d => d ? { ...d, color: e.target.value } : d)}
                placeholder="White"
              />
            </div>
          </div>

          <button
            onClick={addToFleet}
            disabled={added || decoding}
            style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: added ? 'var(--green)' : 'var(--accent)',
              color: '#fff', border: 'none', cursor: added ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {added ? <><Check size={16} /> Added to Fleet</> : decoding ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : <><Plus size={16} /> Add to Fleet</>}
          </button>
        </div>
      )}
    </div>
  )
}
