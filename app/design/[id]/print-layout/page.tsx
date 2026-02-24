'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Download, Upload, Check, AlertTriangle, X,
  ChevronDown, ChevronRight, Info, Printer, Layers,
} from 'lucide-react'
import panelDimensions from '@/lib/data/panel-dimensions.json'
import { splitPanel, calculateLinearFeet, getDpiStatus } from '@/lib/utils/panel-splitter'
import type { PanelDef, PanelStrip } from '@/lib/utils/panel-splitter'

// ─── Types ────────────────────────────────────────────────────────────────────
type VehicleKey = keyof typeof panelDimensions
type MaterialType = 'cast' | 'cut'

interface VehicleData {
  label: string
  panels: PanelDef[]
  full_wrap_sqft: number
}

const PANEL_COLORS = [
  '#4f7fff', '#22c07a', '#22d3ee', '#f59e0b',
  '#8b5cf6', '#f25a5a', '#ec4899', '#14b8a6',
]

const SCALE = 3 // pixels per inch for roll visualization

// ─── Roll Visualization ───────────────────────────────────────────────────────
function RollVisual({
  strips, selectedPanel, onSelectPanel,
}: {
  strips: { panel: PanelDef; strips: PanelStrip[]; color: string }[]
  selectedPanel: string | null
  onSelectPanel: (id: string) => void
}) {
  // Group strips into rolls based on 54" width
  const ROLL_WIDTH_PX = 54 * SCALE
  const rolls: { strips: (PanelStrip & { color: string; panelLabel: string })[] }[] = []
  let currentRoll: (PanelStrip & { color: string; panelLabel: string })[] = []
  let currentRollHeight = 0

  strips.forEach(({ strips: panelStrips, color, panel }) => {
    panelStrips.forEach(strip => {
      const stripPx = strip.printHeight * SCALE
      if (currentRollHeight + stripPx > 600 * SCALE && currentRoll.length > 0) {
        rolls.push({ strips: currentRoll })
        currentRoll = []
        currentRollHeight = 0
      }
      currentRoll.push({ ...strip, color, panelLabel: panel.label })
      currentRollHeight += stripPx + 8
    })
  })
  if (currentRoll.length) rolls.push({ strips: currentRoll })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {rolls.map((roll, ri) => {
        const rollLF = roll.strips.reduce((t, s) => t + s.printHeight / 12, 0)
        return (
          <div key={ri}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9299b5', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
              Roll {ri + 1} — {rollLF.toFixed(1)} linear feet
            </div>
            <div style={{
              border: '2px solid #2a3044', borderRadius: 8, overflow: 'hidden',
              background: '#0d0f14', width: ROLL_WIDTH_PX + 24, position: 'relative',
            }}>
              {/* Roll width header */}
              <div style={{ background: '#1a1d27', padding: '4px 8px', fontSize: 10, color: '#5a6080', textAlign: 'center', borderBottom: '1px solid #2a3044' }}>
                54" roll width
              </div>
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {roll.strips.map((strip, si) => {
                  const w = strip.printWidth * SCALE
                  const h = Math.min(strip.printHeight * SCALE, 200)
                  const isSelected = selectedPanel === strip.panelId
                  return (
                    <div key={si} onClick={() => onSelectPanel(strip.panelId)}
                      style={{
                        width: w, height: h, background: strip.color + '20',
                        border: `2px solid ${isSelected ? strip.color : strip.color + '60'}`,
                        borderRadius: 4, cursor: 'pointer', position: 'relative',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        alignItems: 'center', transition: 'all 0.15s',
                        boxShadow: isSelected ? `0 0 0 2px ${strip.color}` : 'none',
                      }}>
                      {/* Bleed indicator */}
                      <div style={{
                        position: 'absolute', inset: 3, border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: 2, pointerEvents: 'none',
                      }} />
                      {/* Overlap hatching */}
                      {strip.hasTopOverlap && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, height: 6,
                          background: `repeating-linear-gradient(45deg, ${strip.color}30, ${strip.color}30 3px, transparent 3px, transparent 6px)`,
                        }} />
                      )}
                      {strip.hasBottomOverlap && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
                          background: `repeating-linear-gradient(45deg, ${strip.color}30, ${strip.color}30 3px, transparent 3px, transparent 6px)`,
                        }} />
                      )}
                      <span style={{ fontSize: 9, color: strip.color, fontWeight: 700, textAlign: 'center', padding: '0 4px', lineHeight: 1.3 }}>
                        {strip.panelLabel}
                      </span>
                      {strip.totalStrips > 1 && (
                        <span style={{ fontSize: 8, color: '#5a6080' }}>
                          {strip.stripNumber}/{strip.totalStrips}
                        </span>
                      )}
                      <span style={{ fontSize: 7, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>
                        {strip.printWidth.toFixed(1)}" × {strip.printHeight.toFixed(1)}"
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Strip Detail Accordion ────────────────────────────────────────────────────
function StripDetail({ panel, strips, color, canvasW, canvasH }: {
  panel: PanelDef
  strips: PanelStrip[]
  color: string
  canvasW: number
  canvasH: number
}) {
  const [open, setOpen] = useState(false)
  const dpiW = getDpiStatus(canvasW, panel.width)
  const dpiH = getDpiStatus(canvasH, panel.height)
  const worstDpi = Math.min(dpiW.dpi, dpiH.dpi)
  const dpiStatus = worstDpi >= 300 ? 'good' : worstDpi >= 150 ? 'acceptable' : 'low'

  return (
    <div style={{ border: '1px solid #1a1d27', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: open ? '#1a1d27' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#e8eaed' }}>{panel.label}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
          background: dpiStatus === 'good' ? 'rgba(34,192,122,0.15)' : dpiStatus === 'acceptable' ? 'rgba(245,158,11,0.15)' : 'rgba(242,90,90,0.15)',
          color: dpiStatus === 'good' ? '#22c07a' : dpiStatus === 'acceptable' ? '#f59e0b' : '#f25a5a',
        }}>
          {worstDpi} DPI
        </span>
        <span style={{ fontSize: 10, color: '#5a6080', flexShrink: 0 }}>{strips.length} strip{strips.length !== 1 ? 's' : ''}</span>
        {open ? <ChevronDown size={12} style={{ color: '#5a6080', flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: '#5a6080', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ padding: '12px', background: '#0d0f14', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* DPI Status */}
          <div style={{ padding: '8px 10px', borderRadius: 6, background: '#13151c', border: '1px solid #1a1d27' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5a6080', marginBottom: 4 }}>DPI CHECK</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontSize: 9, color: '#5a6080' }}>Width axis</div>
                <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: dpiW.status === 'good' ? '#22c07a' : dpiW.status === 'acceptable' ? '#f59e0b' : '#f25a5a', fontWeight: 700 }}>
                  {dpiW.dpi} DPI
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#5a6080' }}>Height axis</div>
                <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: dpiH.status === 'good' ? '#22c07a' : dpiH.status === 'acceptable' ? '#f59e0b' : '#f25a5a', fontWeight: 700 }}>
                  {dpiH.dpi} DPI
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#5a6080' }}>Status</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: dpiStatus === 'good' ? '#22c07a' : dpiStatus === 'acceptable' ? '#f59e0b' : '#f25a5a' }}>
                  {dpiStatus === 'good' ? 'Production Ready' : dpiStatus === 'acceptable' ? 'Acceptable' : 'Too Low'}
                </div>
              </div>
            </div>
          </div>
          {/* Strips */}
          {strips.map(strip => (
            <div key={strip.stripNumber} style={{ padding: '8px 10px', borderRadius: 6, background: '#13151c', border: `1px solid ${color}30` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: color, marginBottom: 6 }}>
                Strip {strip.stripNumber} of {strip.totalStrips}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                {[
                  ['Print size (w/ bleed)', `${strip.printWidth.toFixed(2)}" × ${strip.printHeight.toFixed(2)}"`],
                  ['Coverage', `${strip.startY.toFixed(1)}" – ${strip.endY.toFixed(1)}"`],
                  ['Top overlap', strip.hasTopOverlap ? '0.5" overlap' : 'Edge (no overlap)'],
                  ['Bottom overlap', strip.hasBottomOverlap ? '0.5" overlap' : 'Edge (no overlap)'],
                  ['Sqft', `${strip.sqft.toFixed(2)} sqft`],
                  ['Color mode', 'CMYK required'],
                  ['Crop marks', '0.375" at corners'],
                  ['Overlaminate', 'Yes'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 9, color: '#5a6080' }}>{k}</span>
                    <span style={{ fontSize: 11, color: '#e8eaed', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 9, color: '#5a6080', wordBreak: 'break-all' }}>
                File: {strip.filename}.pdf
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PrintLayoutPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const designId = params.id as string

  const [design, setDesign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [vehicleKey, setVehicleKey] = useState<VehicleKey>('pickup_crew')
  const [materialType, setMaterialType] = useState<MaterialType>('cast')
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([])
  const [wasteBuffer, setWasteBuffer] = useState(10)
  const [pricePerLF, setPricePerLF] = useState(4.5)
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    individualPanels: true,
    combinedFile: true,
    productionBrief: true,
    customerProof: false,
    materialCutList: true,
  })
  const [showExportOpts, setShowExportOpts] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: 3000, h: 2000 })
  const [highResUrl, setHighResUrl] = useState<string | null>(null)
  const [savingHighRes, setSavingHighRes] = useState(false)

  // Custom template upload
  const customTemplateRef = useRef<HTMLInputElement>(null)
  const [customTemplate, setCustomTemplate] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('design_projects').select('*, linked_project:project_id(id, title, vehicle_desc, vehicle_type)').eq('id', designId).single().then(({ data }) => {
      if (data) {
        setDesign(data)
        if (data.vehicle_type) {
          // Try to match vehicle type to panel dimensions key
          const keyMap: Record<string, VehicleKey> = {
            'Pickup Truck Crew Cab': 'pickup_crew',
            'Pickup Truck Regular Cab': 'pickup_regular',
            'Cargo Van Standard': 'cargo_van_standard',
            'Cargo Van High Roof': 'cargo_van_high_roof',
            'Sprinter Van': 'cargo_van_high_roof',
            'Box Truck 16ft': 'box_truck_16',
            'Box Truck 24ft': 'box_truck_24',
            'SUV Full Size': 'suv_full',
            'SUV Medium': 'suv_mid',
            'Sedan': 'sedan',
            'Semi Trailer 48ft': 'trailer_48',
          }
          const matched = keyMap[data.vehicle_type]
          if (matched) setVehicleKey(matched)
        }
        if (data.print_export_url) setHighResUrl(data.print_export_url)
        if (data.canvas_data?.width) setCanvasSize({ w: data.canvas_data.width || 3000, h: data.canvas_data.height || 2000 })
      }
      setLoading(false)
    })
  }, [designId, supabase])

  const vehicleData = panelDimensions[vehicleKey] as VehicleData
  const panels = vehicleData.panels

  const selectedPanels = panels.filter(p => selectedPanelIds.includes(p.id))

  const allStrips = selectedPanels.map((panel, i) => ({
    panel,
    strips: splitPanel(panel, materialType),
    color: PANEL_COLORS[i % PANEL_COLORS.length],
  }))

  const totalStrips = allStrips.reduce((t, p) => t + p.strips.length, 0)
  const totalSqft = selectedPanels.reduce((t, p) => t + p.sqft, 0)
  const totalLF = calculateLinearFeet(allStrips.flatMap(p => p.strips))
  const withBuffer = totalLF * (1 + wasteBuffer / 100)
  const materialCost = withBuffer * pricePerLF

  const togglePanel = (id: string) => {
    setSelectedPanelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleExport = async () => {
    if (!highResUrl) {
      alert('Please save a high-res export from the canvas first (Print Layout → Save High-Res Export).')
      return
    }
    setExporting(true)
    try {
      const res = await fetch(`/api/export/print-files/${designId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedPanels: selectedPanelIds,
          materialType,
          vehicleClass: vehicleKey,
          exportOptions,
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${design?.client_name || 'design'}-print-files.zip`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const err = await res.json()
        alert(err.error || 'Export failed')
      }
    } catch (err) {
      console.error('Export error:', err)
      alert('Export failed. Check console for details.')
    }
    setExporting(false)
  }

  const handleCustomTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) setCustomTemplate(ev.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#9299b5' }}>
        Loading...
      </div>
    )
  }

  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0f14', overflow: 'hidden' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        background: '#13151c', borderBottom: '1px solid #1a1d27', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button onClick={() => router.push(`/design/${designId}`)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9299b5', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <ArrowLeft size={16} />
          Back to Canvas
        </button>
        <div style={{ width: 1, height: 20, background: '#1a1d27' }} />
        <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: '#e8eaed' }}>
          Print Layout — {design?.client_name || 'Untitled'}
        </span>

        <div style={{ flex: 1 }} />

        {/* Material type toggle */}
        <div style={{ display: 'flex', gap: 4, background: '#0d0f14', borderRadius: 8, padding: 3, border: '1px solid #1a1d27' }}>
          {(['cast', 'cut'] as MaterialType[]).map(type => (
            <button key={type} onClick={() => setMaterialType(type)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: materialType === type ? '#4f7fff' : 'transparent',
                color: materialType === type ? '#fff' : '#9299b5',
              }}>
              {type === 'cast' ? 'Cast Vinyl (53.5")' : 'Cut Vinyl (51.5")'}
            </button>
          ))}
        </div>

        {/* Vehicle class */}
        <select
          value={vehicleKey}
          onChange={e => { setVehicleKey(e.target.value as VehicleKey); setSelectedPanelIds([]) }}
          style={{
            background: '#1a1d27', border: '1px solid #2a2f3d', borderRadius: 7, color: '#e8eaed',
            fontSize: 12, padding: '6px 10px', outline: 'none', cursor: 'pointer',
          }}
        >
          {(Object.keys(panelDimensions) as VehicleKey[]).map(key => (
            <option key={key} value={key}>{panelDimensions[key].label}</option>
          ))}
        </select>

        {/* Custom template upload */}
        <input ref={customTemplateRef} type="file" accept=".pdf,.png,.svg,.ai" style={{ display: 'none' }} onChange={handleCustomTemplateUpload} />
        <button onClick={() => customTemplateRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 7, color: '#8b5cf6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Upload size={13} />
          Upload Custom Template
        </button>

        {/* Export */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowExportOpts(v => !v)}
            disabled={selectedPanelIds.length === 0 || exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
              background: selectedPanelIds.length === 0 ? '#1a1d27' : '#22c07a',
              border: 'none', borderRadius: 7, color: selectedPanelIds.length === 0 ? '#5a6080' : '#0d0f14',
              fontSize: 12, fontWeight: 800, cursor: selectedPanelIds.length === 0 ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}>
            <Download size={13} />
            {exporting ? 'Exporting...' : 'Export All Print Files'}
            <ChevronDown size={11} />
          </button>
          {showExportOpts && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100,
              background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10,
              padding: 12, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', marginBottom: 8 }}>EXPORT OPTIONS</div>
              {(Object.entries(exportOptions) as [keyof typeof exportOptions, boolean][]).map(([key, val]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={val} onChange={e => setExportOptions(prev => ({ ...prev, [key]: e.target.checked }))} style={{ accentColor: '#4f7fff' }} />
                  <span style={{ fontSize: 12, color: '#9299b5' }}>
                    {key === 'individualPanels' ? 'Individual Panel PDFs' : key === 'combinedFile' ? 'Combined PDF (all panels)' : key === 'productionBrief' ? 'Production Brief PDF' : key === 'customerProof' ? 'Customer Proof (watermarked)' : 'Material Cut List (.txt)'}
                  </span>
                </label>
              ))}
              <button onClick={() => { setShowExportOpts(false); handleExport() }}
                style={{ width: '100%', marginTop: 10, padding: '8px 0', background: '#22c07a', border: 'none', borderRadius: 7, color: '#0d0f14', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                Generate Export
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── HIGH-RES EXPORT BANNER ── */}
      {!highResUrl && (
        <div style={{
          padding: '8px 20px', background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
        }}>
          <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ color: '#f59e0b', flex: 1 }}>
            High-res canvas export not saved yet. Go back to canvas and click <strong>Save High-Res Export</strong> before exporting print files.
          </span>
          <button onClick={() => router.push(`/design/${designId}`)}
            style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, color: '#f59e0b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Go to Canvas
          </button>
        </div>
      )}
      {highResUrl && (
        <div style={{
          padding: '6px 20px', background: 'rgba(34,192,122,0.05)', borderBottom: '1px solid rgba(34,192,122,0.15)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
        }}>
          <Check size={12} style={{ color: '#22c07a', flexShrink: 0 }} />
          <span style={{ color: '#22c07a' }}>High-res canvas export ready — print files will use this image</span>
        </div>
      )}

      {/* ── 3-COLUMN LAYOUT ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Panel Selection */}
        <div style={{ width: 280, flexShrink: 0, background: '#13151c', borderRight: '1px solid #1a1d27', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1d27', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#9299b5', textTransform: 'uppercase' }}>
              <Layers size={11} style={{ display: 'inline', marginRight: 5 }} />
              Panel Selection
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setSelectedPanelIds(panels.map(p => p.id))}
                style={{ fontSize: 10, padding: '3px 7px', background: '#1a1d27', border: 'none', borderRadius: 5, color: '#9299b5', cursor: 'pointer' }}>All</button>
              <button onClick={() => setSelectedPanelIds([])}
                style={{ fontSize: 10, padding: '3px 7px', background: '#1a1d27', border: 'none', borderRadius: 5, color: '#9299b5', cursor: 'pointer' }}>None</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {panels.map((panel, i) => {
              const strips = splitPanel(panel, materialType)
              const isSelected = selectedPanelIds.includes(panel.id)
              const color = PANEL_COLORS[i % PANEL_COLORS.length]
              return (
                <label key={panel.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', cursor: 'pointer',
                    borderRadius: 8, border: `1px solid ${isSelected ? color + '40' : '#1a1d27'}`,
                    background: isSelected ? color + '08' : 'transparent', transition: 'all 0.12s',
                  }}>
                  <input type="checkbox" checked={isSelected} onChange={() => togglePanel(panel.id)}
                    style={{ accentColor: color, marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? color : '#9299b5' }}>{panel.label}</div>
                    <div style={{ fontSize: 10, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace', marginTop: 1 }}>
                      {panel.width}" × {panel.height}" · {panel.sqft} sqft
                    </div>
                    <div style={{ fontSize: 10, color: strips.length > 1 ? '#f59e0b' : '#5a6080', marginTop: 1 }}>
                      {strips.length} strip{strips.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '1px solid #1a1d27', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                ['Panels', selectedPanelIds.length],
                ['Total strips', totalStrips],
                ['Total sqft', totalSqft.toFixed(1)],
                ['Linear feet', totalLF.toFixed(1) + ' ft'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: '#0d0f14', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: '#5a6080' }}>{k}</div>
                  <div style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', color: '#e8eaed', fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#0d0f14', borderRadius: 6, padding: '6px 8px' }}>
              <div style={{ fontSize: 9, color: '#5a6080' }}>Est. material cost</div>
              <div style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a', fontWeight: 700 }}>{fmtMoney(materialCost)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#5a6080', marginBottom: 4 }}>WASTE BUFFER</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[5, 10, 15].map(b => (
                  <button key={b} onClick={() => setWasteBuffer(b)}
                    style={{ flex: 1, padding: '4px 0', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: wasteBuffer === b ? '#4f7fff' : '#1a1d27', color: wasteBuffer === b ? '#fff' : '#9299b5' }}>
                    {b}%
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#5a6080' }}>
              With {wasteBuffer}% buffer: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{withBuffer.toFixed(1)} ft · {fmtMoney(withBuffer * pricePerLF)}</span>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#5a6080', marginBottom: 3 }}>$/LINEAR FOOT</div>
              <input type="number" step="0.25" value={pricePerLF} onChange={e => setPricePerLF(+e.target.value)}
                style={{ width: '100%', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 6, color: '#e8eaed', fontSize: 12, padding: '5px 8px', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
          </div>
        </div>

        {/* CENTER — Visual Roll Layout */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20, background: '#0d0f14' }}>
          {customTemplate && (
            <div style={{ marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid #1a1d27', position: 'relative' }}>
              <div style={{ padding: '6px 12px', background: '#1a1d27', fontSize: 11, color: '#9299b5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Custom Template</span>
                <button onClick={() => setCustomTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}><X size={12} /></button>
              </div>
              <img src={customTemplate} alt="Custom template" style={{ maxWidth: '100%', display: 'block', opacity: 0.6 }} />
            </div>
          )}
          {selectedPanelIds.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#5a6080', textAlign: 'center' }}>
              <Printer size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontSize: 15, fontWeight: 700 }}>Select panels to see roll layout</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Check panels in the left column to calculate print strips</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                54" Roll Layout — {allStrips.reduce((t, p) => t + p.strips.length, 0)} strips across {Math.ceil(totalLF / 50)} roll{Math.ceil(totalLF / 50) !== 1 ? 's' : ''}
              </div>
              <RollVisual strips={allStrips} selectedPanel={selectedPanel} onSelectPanel={setSelectedPanel} />
            </>
          )}
        </div>

        {/* RIGHT — Strip Details & DPI */}
        <div style={{ width: 320, flexShrink: 0, background: '#13151c', borderLeft: '1px solid #1a1d27', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1d27' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#9299b5', textTransform: 'uppercase' }}>
              <Info size={11} style={{ display: 'inline', marginRight: 5 }} />
              Strip Details & DPI
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Canvas DPI reference */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#0d0f14', border: '1px solid #1a1d27' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#5a6080', marginBottom: 6 }}>CANVAS SIZE REFERENCE</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#5a6080' }}>Width (px)</div>
                  <input type="number" value={canvasSize.w} onChange={e => setCanvasSize(p => ({ ...p, w: +e.target.value }))}
                    style={{ width: '100%', background: '#1a1d27', border: '1px solid #2a2f3d', borderRadius: 5, color: '#e8eaed', fontSize: 12, padding: '4px 6px', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#5a6080' }}>Height (px)</div>
                  <input type="number" value={canvasSize.h} onChange={e => setCanvasSize(p => ({ ...p, h: +e.target.value }))}
                    style={{ width: '100%', background: '#1a1d27', border: '1px solid #2a2f3d', borderRadius: 5, color: '#e8eaed', fontSize: 12, padding: '4px 6px', outline: 'none', fontFamily: 'JetBrains Mono, monospace' }} />
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#5a6080', lineHeight: 1.6 }}>
                Target 300 DPI: requires {Math.round(panels[0]?.width * 300 || 0)}px × {Math.round(panels[0]?.height * 300 || 0)}px minimum for first panel.
              </div>
            </div>

            {/* Panel accordions */}
            {allStrips.length === 0 && (
              <div style={{ textAlign: 'center', color: '#5a6080', fontSize: 12, padding: '20px 0' }}>
                Select panels to see strip details
              </div>
            )}
            {allStrips.map(({ panel, strips, color }) => (
              <StripDetail key={panel.id} panel={panel} strips={strips} color={color} canvasW={canvasSize.w} canvasH={canvasSize.h} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
