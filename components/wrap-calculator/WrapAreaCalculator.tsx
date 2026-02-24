'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload, PenTool, Ruler, Table, Plus, Trash2, Edit3,
  Download, ArrowRight, Check, X, ZoomIn, ZoomOut,
  RotateCw, Calculator, ChevronRight, ChevronLeft
} from 'lucide-react'

interface WrapArea {
  id: string
  label: string
  points: { x: number; y: number }[]
  sqft: number
  color: string
}

interface Props {
  onComplete?: (areas: WrapArea[], totalSqft: number, materialNeeded: number) => void
  onClose?: () => void
}

const AREA_COLORS = [
  '#4f7fff', '#22c07a', '#f59e0b', '#f25a5a', '#8b5cf6',
  '#22d3ee', '#ec4899', '#84cc16', '#06b6d4', '#a855f7',
]

const PANEL_PRESETS = [
  'Driver Side', 'Passenger Side', 'Hood', 'Roof', 'Rear',
  'Front Bumper', 'Rear Bumper', 'Tailgate', 'Door Panel',
  'Quarter Panel', 'Fender', 'Custom',
]

const WASTE_FACTOR = 0.10 // 10%
const PRICE_PER_SQFT = 12 // Default

export default function WrapAreaCalculator({ onComplete, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [areas, setAreas] = useState<WrapArea[]>([])
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [scaleFactor, setScaleFactor] = useState<number>(1) // pixels per foot
  const [knownMeasurement, setKnownMeasurement] = useState('')
  const [measurementPixels, setMeasurementPixels] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setStep(2)
  }

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (step !== 2 || !isDrawing) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setCurrentPoints(prev => [...prev, { x, y }])
  }, [step, isDrawing])

  const finishPolygon = useCallback(() => {
    if (currentPoints.length < 3) return

    // Calculate area using Shoelace formula
    let pixelArea = 0
    for (let i = 0; i < currentPoints.length; i++) {
      const j = (i + 1) % currentPoints.length
      pixelArea += currentPoints[i].x * currentPoints[j].y
      pixelArea -= currentPoints[j].x * currentPoints[i].y
    }
    pixelArea = Math.abs(pixelArea) / 2

    // Convert to sqft based on scale
    const sqft = scaleFactor > 0 ? pixelArea / (scaleFactor * scaleFactor) : pixelArea / 100

    const area: WrapArea = {
      id: crypto.randomUUID(),
      label: PANEL_PRESETS[areas.length % PANEL_PRESETS.length],
      points: currentPoints,
      sqft: Math.round(sqft * 10) / 10,
      color: AREA_COLORS[areas.length % AREA_COLORS.length],
    }

    setAreas(prev => [...prev, area])
    setCurrentPoints([])
    setIsDrawing(false)
  }, [currentPoints, areas, scaleFactor])

  const removeArea = (id: string) => {
    setAreas(prev => prev.filter(a => a.id !== id))
  }

  const updateLabel = (id: string, label: string) => {
    setAreas(prev => prev.map(a => a.id === id ? { ...a, label } : a))
    setEditingLabel(null)
  }

  const applyScale = () => {
    const ft = parseFloat(knownMeasurement)
    if (!ft || ft <= 0 || measurementPixels <= 0) return
    const newScale = measurementPixels / ft
    setScaleFactor(newScale)
    // Recalculate all areas
    setAreas(prev => prev.map(area => {
      let pixelArea = 0
      for (let i = 0; i < area.points.length; i++) {
        const j = (i + 1) % area.points.length
        pixelArea += area.points[i].x * area.points[j].y
        pixelArea -= area.points[j].x * area.points[i].y
      }
      pixelArea = Math.abs(pixelArea) / 2
      return { ...area, sqft: Math.round((pixelArea / (newScale * newScale)) * 10) / 10 }
    }))
    setStep(4)
  }

  const totalSqft = areas.reduce((sum, a) => sum + a.sqft, 0)
  const materialNeeded = Math.ceil(totalSqft * (1 + WASTE_FACTOR))

  const getPolygonPath = (points: { x: number; y: number }[]) => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`).join(' ') + ' Z'
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden', maxWidth: 900,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calculator size={20} color="var(--accent)" />
          <div>
            <h3 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 18,
              color: 'var(--text1)', margin: 0,
            }}>Wrap Area Calculator</h3>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Step {step} of 4
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Step Progress */}
      <div style={{ padding: '12px 20px', background: 'var(--bg)', display: 'flex', gap: 4 }}>
        {['Upload', 'Draw Areas', 'Set Scale', 'Summary'].map((label, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{
              height: 3, borderRadius: 2,
              background: step > i + 1 ? 'var(--accent)' : step === i + 1 ? 'var(--accent)' : 'var(--border)',
              opacity: step > i + 1 ? 1 : step === i + 1 ? 0.7 : 0.3,
            }} />
            <div style={{ fontSize: 10, color: step >= i + 1 ? 'var(--accent)' : 'var(--text3)', marginTop: 4, textAlign: 'center' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 20 }}>
        {/* Step 1: Upload */}
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <input ref={fileInputRef} type="file" accept=".svg,.png,.jpg,.jpeg" onChange={handleFileUpload} style={{ display: 'none' }} />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 32px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <Upload size={40} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
                Upload Vehicle Outline
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Accepts SVG, PNG, JPG files
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                Use a vehicle outline or photo for accurate area measurement
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Draw Areas */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <button
                onClick={() => { setIsDrawing(!isDrawing); setCurrentPoints([]) }}
                className={isDrawing ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              >
                <PenTool size={14} /> {isDrawing ? 'Drawing...' : 'Draw Area'}
              </button>
              {isDrawing && currentPoints.length >= 3 && (
                <button onClick={finishPolygon} className="btn-primary btn-sm">
                  <Check size={14} /> Finish ({currentPoints.length} points)
                </button>
              )}
              {isDrawing && currentPoints.length > 0 && (
                <button onClick={() => setCurrentPoints([])} className="btn-ghost btn-sm">
                  <RotateCw size={14} /> Reset
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="btn-ghost btn-xs"><ZoomOut size={14} /></button>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)', alignSelf: 'center' }}>{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="btn-ghost btn-xs"><ZoomIn size={14} /></button>
            </div>

            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                position: 'relative', width: '100%', height: 400,
                background: '#1a1d27', borderRadius: 10, overflow: 'hidden',
                cursor: isDrawing ? 'crosshair' : 'default',
                border: '1px solid var(--border)',
              }}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Vehicle"
                  style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    opacity: 0.8,
                    transform: `scale(${zoom / 100})`,
                  }}
                />
              )}

              {/* SVG overlay for polygons */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {areas.map(area => (
                  <g key={area.id}>
                    <path
                      d={getPolygonPath(area.points)}
                      fill={`${area.color}30`}
                      stroke={area.color}
                      strokeWidth="2"
                    />
                    {/* Label */}
                    <text
                      x={`${area.points.reduce((s, p) => s + p.x, 0) / area.points.length}%`}
                      y={`${area.points.reduce((s, p) => s + p.y, 0) / area.points.length}%`}
                      fill="#fff"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {area.label} ({area.sqft} sqft)
                    </text>
                  </g>
                ))}

                {/* Current drawing points */}
                {currentPoints.length > 0 && (
                  <>
                    <polyline
                      points={currentPoints.map(p => `${p.x}% ${p.y}%`).join(' ')}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                    {currentPoints.map((p, i) => (
                      <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
                    ))}
                  </>
                )}
              </svg>
            </div>

            {/* Area List */}
            {areas.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {areas.map(area => (
                    <div key={area.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      background: 'var(--surface2)', borderRadius: 8,
                      borderLeft: `3px solid ${area.color}`,
                    }}>
                      {editingLabel === area.id ? (
                        <select
                          value={area.label}
                          onChange={e => updateLabel(area.id, e.target.value)}
                          onBlur={() => setEditingLabel(null)}
                          className="field"
                          style={{ width: 150 }}
                          autoFocus
                        >
                          {PANEL_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <span
                          onClick={() => setEditingLabel(area.id)}
                          style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', cursor: 'pointer', flex: 1 }}
                        >
                          {area.label}
                        </span>
                      )}
                      <span style={{
                        fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 600,
                        color: 'var(--accent)',
                      }}>
                        {area.sqft} sqft
                      </span>
                      <button onClick={() => setEditingLabel(area.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => removeArea(area.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={areas.length === 0}>
                Continue to Scale <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Set Scale */}
        {step === 3 && (
          <div style={{ maxWidth: 500, margin: '0 auto', padding: '20px 0' }}>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 16, fontFamily: 'Barlow Condensed' }}>
              Calibrate Measurements
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              Enter a known measurement to calibrate the square footage calculation. For example, if the vehicle is 16 feet long, enter 16.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label">Known Measurement (feet)</label>
                <input
                  type="number"
                  className="field"
                  value={knownMeasurement}
                  onChange={e => setKnownMeasurement(e.target.value)}
                  placeholder="e.g., 16"
                  step="0.5"
                />
              </div>
              <div>
                <label className="field-label">Measurement Pixels (approximate)</label>
                <input
                  type="number"
                  className="field"
                  value={measurementPixels || ''}
                  onChange={e => setMeasurementPixels(Number(e.target.value))}
                  placeholder="e.g., 800"
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  Approximate pixel length of the known measurement in the image
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setStep(2)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={applyScale}>
                <Ruler size={16} /> Apply Scale & Continue
              </button>
              <button className="btn-ghost" onClick={() => setStep(4)}>
                Skip <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 16, fontFamily: 'Barlow Condensed' }}>
              Area Summary
            </h4>

            {/* Summary Table */}
            <table className="data-table" style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th>Panel</th>
                  <th style={{ textAlign: 'right' }}>Sq Ft</th>
                </tr>
              </thead>
              <tbody>
                {areas.map(area => (
                  <tr key={area.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: area.color }} />
                        {area.label}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                      {area.sqft}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--text1)' }}>Total Area</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent)' }}>
                    {totalSqft.toFixed(1)} sqft
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--text1)' }}>
                    Material Needed <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(+{WASTE_FACTOR * 100}% waste)</span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--green)' }}>
                    {materialNeeded} sqft
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--text1)' }}>
                    Estimated Price <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(@${PRICE_PER_SQFT}/sqft)</span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--amber)' }}>
                    ${(materialNeeded * PRICE_PER_SQFT).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setStep(2)}>
                <ChevronLeft size={16} /> Edit Areas
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => onComplete?.(areas, totalSqft, materialNeeded)}
              >
                <Check size={16} /> Apply to Estimate
              </button>
              <button className="btn-ghost" onClick={onClose}>
                <Download size={16} /> Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
