'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CheckCircle2, AlertTriangle, Search, ChevronDown, Loader2 } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VehicleDecodeResult {
  year: string
  make: string
  model: string
  bodyClass: string
  trim?: string
  vehicleType?: string
  driveType?: string
  engineCylinders?: string
  engineLiters?: string
}

interface VinLookupFieldProps {
  /** Current VIN value */
  value: string
  /** Called when VIN text changes */
  onChange: (vin: string) => void
  /** Called when vehicle is successfully decoded */
  onVehicleDecoded: (data: VehicleDecodeResult) => void
  /** Show the camera scan button */
  showCamera?: boolean
  /** Show manual Year/Make/Model fallback dropdowns */
  showManualFallback?: boolean
  /** Use dark background variant (for portal/intake pages with different bg) */
  portalMode?: boolean
  /** Disable the input */
  disabled?: boolean
}

// ─── Year/Make/Model data for fallback ──────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear() + 1
const YEARS = Array.from({ length: 40 }, (_, i) => CURRENT_YEAR - i)

const COMMON_MAKES = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
  'Dodge', 'Ferrari', 'Fiat', 'Ford', 'Genesis', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover',
  'Lexus', 'Lincoln', 'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz',
  'Mini', 'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Rivian', 'Rolls-Royce',
  'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo',
]

// ─── Styles ─────────────────────────────────────────────────────────────────

const monoFont = "'JetBrains Mono', monospace"
const headingFont = "'Barlow Condensed', sans-serif"

function getStyles(portalMode: boolean) {
  const bg = portalMode ? '#0c1222' : 'var(--surface2)'
  const border = portalMode ? '#1e2d4a' : 'var(--border)'
  const text1 = portalMode ? '#e8ecf4' : 'var(--text1)'
  const text2 = portalMode ? '#8892a8' : 'var(--text2)'
  const text3 = portalMode ? '#5a6478' : 'var(--text3)'
  const green = portalMode ? '#22c55e' : 'var(--green)'
  const amber = portalMode ? '#f59e0b' : 'var(--amber)'
  const accent = portalMode ? '#4f7fff' : 'var(--accent)'

  return { bg, border, text1, text2, text3, green, amber, accent }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function VinLookupField({
  value,
  onChange,
  onVehicleDecoded,
  showCamera = true,
  showManualFallback = true,
  portalMode = false,
  disabled = false,
}: VinLookupFieldProps) {
  const s = getStyles(portalMode)

  const [loading, setLoading] = useState(false)
  const [decoded, setDecoded] = useState<VehicleDecodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  // Manual fallback state
  const [manualYear, setManualYear] = useState('')
  const [manualMake, setManualMake] = useState('')
  const [manualModel, setManualModel] = useState('')
  const [makeDropdownOpen, setMakeDropdownOpen] = useState(false)
  const [makeFilter, setMakeFilter] = useState('')
  const makeRef = useRef<HTMLDivElement>(null)

  // Camera file input ref
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Close make dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) {
        setMakeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ─── VIN Decode via API route ───────────────────────────────────────────

  const decodeVIN = useCallback(async (vin: string) => {
    if (vin.length !== 17) return
    setLoading(true)
    setError(null)
    setDecoded(null)

    try {
      const res = await fetch(`/api/vin/lookup?vin=${encodeURIComponent(vin)}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'VIN decode failed')
      }

      const v = json.vehicle
      if (v.make && v.model) {
        const result: VehicleDecodeResult = {
          year: v.year || '',
          make: v.make || '',
          model: v.model || '',
          bodyClass: v.bodyClass || '',
          trim: v.trim || undefined,
          vehicleType: v.vehicleType || undefined,
          driveType: v.driveType || undefined,
          engineCylinders: v.engineCylinders || undefined,
          engineLiters: v.engineLiters || undefined,
        }
        setDecoded(result)
        onVehicleDecoded(result)
      } else {
        setError('Could not decode VIN. Please enter vehicle info manually.')
        setShowManual(true)
      }
    } catch (err: any) {
      setError(err.message || 'VIN lookup failed. Please enter vehicle info manually.')
      setShowManual(true)
    } finally {
      setLoading(false)
    }
  }, [onVehicleDecoded])

  // Auto-decode when 17 chars
  useEffect(() => {
    if (value.length === 17 && !loading && !decoded) {
      decodeVIN(value)
    }
    if (value.length < 17) {
      setDecoded(null)
      setError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleVinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)
    onChange(cleaned)
  }

  function handleCameraClick() {
    cameraInputRef.current?.click()
  }

  function handleCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Practical fallback: notify user that OCR is not yet available
    // The camera capture lets them take a photo for reference
    alert('VIN photo captured. Automatic OCR extraction is coming soon. Please type the VIN from the photo into the field above.')
  }

  function handleManualSubmit() {
    if (!manualYear || !manualMake || !manualModel) return
    const result: VehicleDecodeResult = {
      year: manualYear,
      make: manualMake,
      model: manualModel,
      bodyClass: '',
    }
    setDecoded(result)
    setError(null)
    onVehicleDecoded(result)
  }

  const filteredMakes = makeFilter
    ? COMMON_MAKES.filter(m => m.toLowerCase().includes(makeFilter.toLowerCase()))
    : COMMON_MAKES

  // ─── Input styles ─────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: s.bg,
    border: `2px solid ${value.length === 17 && decoded ? s.green : s.border}`,
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 18,
    fontFamily: monoFont,
    fontWeight: 700,
    letterSpacing: '0.15em',
    color: s.text1,
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const smallInputStyle: React.CSSProperties = {
    width: '100%',
    background: s.bg,
    border: `1px solid ${s.border}`,
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: s.text1,
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: s.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: headingFont,
    marginBottom: 4,
  }

  return (
    <div>
      {/* ── VIN Input ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 6 }}>
        <label style={{
          ...labelStyle,
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}>
          <Search size={12} style={{ color: s.accent }} />
          VIN LOOKUP
        </label>

        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={value}
              onChange={handleVinChange}
              placeholder="Enter 17-character VIN"
              maxLength={17}
              disabled={disabled}
              style={inputStyle}
            />
            {loading && (
              <div style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center',
              }}>
                <Loader2
                  size={20}
                  style={{
                    color: s.accent,
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </div>
            )}
          </div>

          {showCamera && (
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 52,
                borderRadius: 10,
                border: `2px solid ${s.border}`,
                background: s.bg,
                color: s.text2,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
              title="Scan VIN barcode with camera"
            >
              <Camera size={22} />
            </button>
          )}
        </div>

        {/* Hidden camera input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleCameraCapture}
        />

        {/* Character counter */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
        }}>
          <span style={{ fontSize: 11, color: s.text3 }}>
            Find VIN on driver door jamb sticker or windshield base
          </span>
          <span style={{
            fontSize: 11,
            fontFamily: monoFont,
            color: value.length === 17 ? s.green : s.text3,
            fontWeight: value.length === 17 ? 700 : 400,
          }}>
            {value.length}/17
          </span>
        </div>
      </div>

      {/* ── Decode Result Card (green) ─────────────────────────────────── */}
      {decoded && (
        <div style={{
          marginTop: 10,
          padding: '14px 16px',
          borderRadius: 10,
          background: portalMode ? 'rgba(34,197,94,0.06)' : 'rgba(34,192,122,0.06)',
          border: `1px solid ${portalMode ? 'rgba(34,197,94,0.25)' : 'rgba(34,192,122,0.25)'}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          }}>
            <CheckCircle2 size={16} style={{ color: s.green, flexShrink: 0 }} />
            <span style={{
              fontSize: 13, fontWeight: 800, color: s.green,
              fontFamily: headingFont, letterSpacing: '0.03em',
            }}>
              Vehicle Found
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '8px 16px',
          }}>
            {decoded.year && (
              <div>
                <span style={{ fontSize: 10, color: s.text3, fontWeight: 600 }}>Year</span>
                <div style={{ fontSize: 14, color: s.text1, fontWeight: 700, fontFamily: monoFont }}>{decoded.year}</div>
              </div>
            )}
            {decoded.make && (
              <div>
                <span style={{ fontSize: 10, color: s.text3, fontWeight: 600 }}>Make</span>
                <div style={{ fontSize: 14, color: s.text1, fontWeight: 700 }}>{decoded.make}</div>
              </div>
            )}
            {decoded.model && (
              <div>
                <span style={{ fontSize: 10, color: s.text3, fontWeight: 600 }}>Model</span>
                <div style={{ fontSize: 14, color: s.text1, fontWeight: 700 }}>{decoded.model}</div>
              </div>
            )}
            {decoded.bodyClass && (
              <div>
                <span style={{ fontSize: 10, color: s.text3, fontWeight: 600 }}>Body</span>
                <div style={{ fontSize: 14, color: s.text1, fontWeight: 700 }}>{decoded.bodyClass}</div>
              </div>
            )}
            {decoded.trim && (
              <div>
                <span style={{ fontSize: 10, color: s.text3, fontWeight: 600 }}>Trim</span>
                <div style={{ fontSize: 14, color: s.text1, fontWeight: 700 }}>{decoded.trim}</div>
              </div>
            )}
            {decoded.driveType && (
              <div>
                <span style={{ fontSize: 10, color: s.text3, fontWeight: 600 }}>Drive</span>
                <div style={{ fontSize: 14, color: s.text1, fontWeight: 700 }}>{decoded.driveType}</div>
              </div>
            )}
            {decoded.engineCylinders && (
              <div>
                <span style={{ fontSize: 10, color: s.text3, fontWeight: 600 }}>Engine</span>
                <div style={{ fontSize: 14, color: s.text1, fontWeight: 700 }}>
                  {decoded.engineCylinders} cyl{decoded.engineLiters ? ` (${decoded.engineLiters}L)` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Error Message ──────────────────────────────────────────────── */}
      {error && (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          borderRadius: 8,
          background: portalMode ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.06)',
          border: `1px solid ${portalMode ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={14} style={{ color: s.amber, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: s.amber }}>{error}</span>
        </div>
      )}

      {/* ── Manual Entry Toggle ────────────────────────────────────────── */}
      {showManualFallback && !decoded && !showManual && (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          style={{
            marginTop: 8,
            background: 'none',
            border: 'none',
            color: s.accent,
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Don&apos;t have a VIN? Enter vehicle details manually
        </button>
      )}

      {/* ── Manual Fallback Dropdowns ──────────────────────────────────── */}
      {showManualFallback && showManual && !decoded && (
        <div style={{
          marginTop: 12,
          padding: '14px 16px',
          borderRadius: 10,
          background: portalMode ? 'rgba(79,127,255,0.04)' : 'rgba(79,127,255,0.04)',
          border: `1px solid ${portalMode ? 'rgba(79,127,255,0.15)' : 'rgba(79,127,255,0.15)'}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: s.accent,
            fontFamily: headingFont, textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: 12,
          }}>
            Manual Vehicle Entry
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {/* Year dropdown */}
            <div>
              <label style={labelStyle}>Year</label>
              <select
                value={manualYear}
                onChange={e => setManualYear(e.target.value)}
                style={{ ...smallInputStyle, cursor: 'pointer' }}
              >
                <option value="">Select...</option>
                {YEARS.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            {/* Make dropdown with search */}
            <div ref={makeRef} style={{ position: 'relative' }}>
              <label style={labelStyle}>Make</label>
              <input
                value={makeDropdownOpen ? makeFilter : manualMake}
                onChange={e => {
                  setMakeFilter(e.target.value)
                  if (!makeDropdownOpen) setMakeDropdownOpen(true)
                }}
                onFocus={() => setMakeDropdownOpen(true)}
                style={smallInputStyle}
                placeholder="Search makes..."
              />
              {makeDropdownOpen && filteredMakes.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                  background: portalMode ? '#111827' : 'var(--surface)',
                  border: `1px solid ${s.border}`,
                  borderRadius: 8, marginTop: 2, maxHeight: 180, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {filteredMakes.map(m => (
                    <div
                      key={m}
                      style={{
                        padding: '7px 12px', fontSize: 12, color: s.text1, cursor: 'pointer',
                        borderBottom: `1px solid ${s.border}`,
                      }}
                      onMouseDown={() => {
                        setManualMake(m)
                        setMakeDropdownOpen(false)
                        setMakeFilter('')
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = portalMode ? '#1a2540' : 'var(--surface2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Model text input */}
            <div>
              <label style={labelStyle}>Model</label>
              <input
                value={manualModel}
                onChange={e => setManualModel(e.target.value)}
                style={smallInputStyle}
                placeholder="e.g. Camry"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={!manualYear || !manualMake || !manualModel}
            style={{
              marginTop: 12,
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: headingFont,
              letterSpacing: '0.03em',
              cursor: (!manualYear || !manualMake || !manualModel) ? 'not-allowed' : 'pointer',
              background: (!manualYear || !manualMake || !manualModel) ? s.border : s.accent,
              color: (!manualYear || !manualMake || !manualModel) ? s.text3 : '#fff',
              opacity: (!manualYear || !manualMake || !manualModel) ? 0.6 : 1,
              transition: 'all 0.15s',
            }}
          >
            Use This Vehicle
          </button>
        </div>
      )}

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
