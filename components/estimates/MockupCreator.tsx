'use client'

import { useState, useRef } from 'react'
import { X, Wand2, Ruler, Image, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'

// ─── Fonts ──────────────────────────────────────────────────────────────────────

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MockupCreatorProps {
  isOpen: boolean
  onClose: () => void
  lineItemId: string
  specs: Record<string, unknown>
  updateSpec: (key: string, value: unknown) => void
  vehicleInfo: string // e.g. "2024 Ford F-150"
}

type TabKey = 'ai' | 'trace'

type CoverageOption = 'Full' | '3/4' | 'Half' | 'Quarter' | 'Hood Only' | 'Custom'

const COVERAGE_OPTIONS: CoverageOption[] = ['Full', '3/4', 'Half', 'Quarter', 'Hood Only', 'Custom']

// ─── Template Trace Panel ───────────────────────────────────────────────────────

interface TracePanel {
  id: string
  name: string
  length: number
  width: number
}

const TRACE_PRESETS: { name: string; panels: Omit<TracePanel, 'id'>[] }[] = [
  {
    name: 'Full Body',
    panels: [
      { name: 'Hood', length: 5, width: 5 },
      { name: 'Roof', length: 5.5, width: 5.5 },
      { name: 'Driver Side', length: 17, width: 4.5 },
      { name: 'Passenger Side', length: 17, width: 4.5 },
      { name: 'Trunk/Tailgate', length: 5, width: 4.5 },
      { name: 'Front Bumper', length: 6.5, width: 2.5 },
      { name: 'Rear Bumper', length: 6.5, width: 2.5 },
    ],
  },
  {
    name: 'Hood Only',
    panels: [
      { name: 'Hood', length: 5, width: 5 },
    ],
  },
  {
    name: 'Roof Only',
    panels: [
      { name: 'Roof', length: 5.5, width: 5.5 },
    ],
  },
  {
    name: 'Doors & Sides',
    panels: [
      { name: 'Driver Front Door', length: 4, width: 4 },
      { name: 'Driver Rear Door', length: 4, width: 4 },
      { name: 'Passenger Front Door', length: 4, width: 4 },
      { name: 'Passenger Rear Door', length: 4, width: 4 },
      { name: 'Driver Rear Quarter', length: 3, width: 3.5 },
      { name: 'Passenger Rear Quarter', length: 3, width: 3.5 },
    ],
  },
]

// ─── Styles ─────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
  fontFamily: headingFont,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '7px 10px',
  fontSize: 13,
  color: 'var(--text1)',
  outline: 'none',
  fontFamily: monoFont,
}

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  border: '1px solid var(--border)',
  background: 'var(--surface2)',
  color: 'var(--accent)',
}

const btnGreen: React.CSSProperties = {
  padding: '10px',
  borderRadius: 9,
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer',
  background: 'var(--green)',
  border: 'none',
  color: '#fff',
}

const btnCancel: React.CSSProperties = {
  padding: '10px',
  borderRadius: 9,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text2)',
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function MockupCreator({
  isOpen,
  onClose,
  lineItemId,
  specs,
  updateSpec,
  vehicleInfo,
}: MockupCreatorProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('ai')

  // AI Mockup tab state
  const [coverage, setCoverage] = useState<CoverageOption>(
    (specs.mockupCoverage as CoverageOption) || 'Full'
  )
  const [designBrief, setDesignBrief] = useState<string>(
    (specs.mockupBrief as string) || ''
  )
  const [brandFile, setBrandFile] = useState<File | null>(null)
  const [brandFileUrl, setBrandFileUrl] = useState<string>(
    (specs.mockupBrandFileUrl as string) || ''
  )
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Template Trace tab state
  const [panels, setPanels] = useState<TracePanel[]>([
    { id: '1', name: 'Panel 1', length: 0, width: 0 },
  ])

  if (!isOpen) return null

  const mockupUrl = specs.mockupUrl as string | undefined

  // ─── AI Mockup Handlers ─────────────────────────────────────────────────────

  async function handleBrandFileUpload(file: File) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `mockup-brands/${lineItemId}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('job-images')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('job-images')
        .getPublicUrl(path)

      setBrandFileUrl(urlData.publicUrl)
      updateSpec('mockupBrandFileUrl', urlData.publicUrl)
      toast('Brand file uploaded', 'success')
    } catch (err) {
      console.error('Upload error:', err)
      toast('Failed to upload brand file', 'error')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBrandFile(file)
    handleBrandFileUpload(file)
  }

  function handleGenerateMockup() {
    if (!designBrief.trim()) {
      toast('Please describe the design first', 'warning')
      return
    }

    setGenerating(true)

    const prompt = [
      `Vehicle: ${vehicleInfo}`,
      `Coverage: ${coverage}`,
      `Design: ${designBrief}`,
      brandFileUrl ? `Brand assets: ${brandFileUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    updateSpec('mockupPrompt', prompt)
    updateSpec('mockupCoverage', coverage)
    updateSpec('mockupBrief', designBrief)

    // Simulate async delay then show pending message
    setTimeout(() => {
      setGenerating(false)
      toast('AI mockup generation coming soon - Replicate flux-pro integration pending', 'info')
    }, 1200)
  }

  function handleUseMockup() {
    if (mockupUrl) {
      updateSpec('mockupSelected', true)
      toast('Mockup applied to line item', 'success')
      onClose()
    }
  }

  function handleDownloadMockup() {
    if (mockupUrl) {
      const a = document.createElement('a')
      a.href = mockupUrl as string
      a.download = `mockup-${lineItemId}.png`
      a.click()
    }
  }

  // ─── Template Trace Handlers ────────────────────────────────────────────────

  function addPanel() {
    setPanels(prev => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        name: `Panel ${prev.length + 1}`,
        length: 0,
        width: 0,
      },
    ])
  }

  function removePanel(id: string) {
    setPanels(prev => prev.filter(p => p.id !== id))
  }

  function updatePanel(id: string, field: keyof TracePanel, value: string | number) {
    setPanels(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  function loadPreset(preset: (typeof TRACE_PRESETS)[0]) {
    setPanels(
      preset.panels.map((p, i) => ({
        id: `preset-${i}-${Date.now()}`,
        name: p.name,
        length: p.length,
        width: p.width,
      }))
    )
  }

  const totalSqft = panels.reduce((sum, p) => sum + p.length * p.width, 0)
  const totalSqftRounded = Math.round(totalSqft * 100) / 100

  function handleUseSqft() {
    updateSpec('vinylArea', Math.round(totalSqft))
    toast(`Vinyl area set to ${Math.round(totalSqft)} sqft`, 'success')
    onClose()
  }

  // ─── Tab Styles ─────────────────────────────────────────────────────────────

  const tabBtn = (key: TabKey): React.CSSProperties => ({
    flex: 1,
    padding: '12px 0',
    background: 'transparent',
    border: 'none',
    borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
    color: activeTab === key ? 'var(--accent)' : 'var(--text3)',
    fontSize: 12,
    fontWeight: 800,
    fontFamily: headingFont,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.15s ease',
  })

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 0,
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: '0 16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image size={16} style={{ color: 'var(--accent)' }} />
            <span
              style={{
                fontSize: 16,
                fontWeight: 900,
                fontFamily: headingFont,
                color: 'var(--text1)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Mockup Creator
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tab Bar ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button onClick={() => setActiveTab('ai')} style={tabBtn('ai')}>
            <Wand2 size={13} />
            AI Design Mockup
          </button>
          <button onClick={() => setActiveTab('trace')} style={tabBtn('trace')}>
            <Ruler size={13} />
            Template Trace
          </button>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Vehicle info badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text3)',
                    fontFamily: headingFont,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Vehicle
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--text1)',
                    fontFamily: headingFont,
                    letterSpacing: '0.02em',
                  }}
                >
                  {vehicleInfo || 'Not specified'}
                </span>
              </div>

              {/* Coverage selector */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Coverage</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6,
                  }}
                >
                  {COVERAGE_OPTIONS.map(opt => {
                    const active = coverage === opt
                    return (
                      <button
                        key={opt}
                        onClick={() => setCoverage(opt)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 7,
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: headingFont,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          cursor: 'pointer',
                          border: active
                            ? '2px solid var(--accent)'
                            : '1px solid var(--border)',
                          background: active
                            ? 'rgba(79,127,255,0.08)'
                            : 'var(--surface)',
                          color: active ? 'var(--accent)' : 'var(--text2)',
                          transition: 'all 0.15s ease',
                          outline: 'none',
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Design brief */}
              <div>
                <div style={labelStyle}>Design Brief</div>
                <textarea
                  value={designBrief}
                  onChange={e => setDesignBrief(e.target.value)}
                  placeholder="Describe the design: colors, style, brand elements..."
                  rows={4}
                  style={{
                    ...inputStyle,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: 80,
                  }}
                />
              </div>

              {/* Brand file upload */}
              <div>
                <div style={labelStyle}>Brand File (Optional)</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.svg,.ai,.eps,.pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      ...btnSecondary,
                      opacity: uploading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Image size={12} />
                    {uploading ? 'Uploading...' : 'Upload Logo / Brand File'}
                  </button>
                  {(brandFile || brandFileUrl) && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--green)',
                        fontWeight: 600,
                      }}
                    >
                      {brandFile ? brandFile.name : 'File attached'}
                    </span>
                  )}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerateMockup}
                disabled={generating || !designBrief.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontWeight: 900,
                  fontSize: 13,
                  fontFamily: headingFont,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: generating || !designBrief.trim() ? 'not-allowed' : 'pointer',
                  opacity: generating || !designBrief.trim() ? 0.5 : 1,
                  background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                  border: 'none',
                  color: '#fff',
                  transition: 'opacity 0.15s ease',
                }}
              >
                {generating ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'mockup-spin 0.6s linear infinite',
                      }}
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    Generate Mockup
                  </>
                )}
              </button>

              {/* Prompt preview (if stored) */}
              {specs.mockupPrompt && !mockupUrl && (
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div style={{ ...labelStyle, marginBottom: 8 }}>Generated Prompt</div>
                  <pre
                    style={{
                      fontSize: 11,
                      color: 'var(--text2)',
                      fontFamily: monoFont,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {specs.mockupPrompt as string}
                  </pre>
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 14px',
                      background: 'rgba(79,127,255,0.06)',
                      border: '1px solid rgba(79,127,255,0.15)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Wand2 size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                      AI generation placeholder -- mockup image will appear here once Replicate integration is active.
                    </span>
                  </div>
                </div>
              )}

              {/* Generated mockup display */}
              {mockupUrl && (
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={mockupUrl as string}
                    alt="Generated mockup"
                    style={{
                      width: '100%',
                      display: 'block',
                      borderRadius: '10px 10px 0 0',
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '12px 16px',
                    }}
                  >
                    <button onClick={handleDownloadMockup} style={{ ...btnSecondary, flex: 1 }}>
                      Download
                    </button>
                    <button
                      onClick={handleUseMockup}
                      style={{ ...btnGreen, flex: 1 }}
                    >
                      Use This
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trace' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Canvas placeholder */}
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 20,
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundImage:
                    'linear-gradient(rgba(90,96,128,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(90,96,128,0.08) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                <Ruler size={24} style={{ color: 'var(--text3)' }} />
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text3)',
                    fontFamily: headingFont,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 700,
                  }}
                >
                  Vehicle Silhouette Canvas
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                  Draw polygons over areas to wrap. Use the panel list below to define wrap zones.
                </span>
              </div>

              {/* Quick presets */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Quick Presets</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TRACE_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => loadPreset(preset)}
                      style={btnSecondary}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel list */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div style={labelStyle}>Panel Dimensions (ft)</div>
                  <button
                    onClick={addPanel}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: 'rgba(34,192,122,0.1)',
                      border: '1px solid rgba(34,192,122,0.3)',
                      color: 'var(--green)',
                    }}
                  >
                    <Plus size={11} /> Add Panel
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Header row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 80px 80px 32px',
                      gap: 6,
                      padding: '0 0 4px 0',
                    }}
                  >
                    <span style={{ ...labelStyle, marginBottom: 0 }}>Area Name</span>
                    <span style={{ ...labelStyle, marginBottom: 0, textAlign: 'center' }}>
                      Length
                    </span>
                    <span style={{ ...labelStyle, marginBottom: 0, textAlign: 'center' }}>
                      Width
                    </span>
                    <span style={{ ...labelStyle, marginBottom: 0, textAlign: 'right' }}>
                      Sqft
                    </span>
                    <span />
                  </div>

                  {panels.map(panel => (
                    <div
                      key={panel.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 80px 80px 32px',
                        gap: 6,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        value={panel.name}
                        onChange={e => updatePanel(panel.id, 'name', e.target.value)}
                        style={{ ...inputStyle, fontFamily: 'inherit' }}
                        placeholder="Area name"
                      />
                      <input
                        type="number"
                        value={panel.length || ''}
                        onChange={e =>
                          updatePanel(panel.id, 'length', Number(e.target.value))
                        }
                        style={{ ...inputStyle, textAlign: 'center' }}
                        min={0}
                        step={0.5}
                      />
                      <input
                        type="number"
                        value={panel.width || ''}
                        onChange={e =>
                          updatePanel(panel.id, 'width', Number(e.target.value))
                        }
                        style={{ ...inputStyle, textAlign: 'center' }}
                        min={0}
                        step={0.5}
                      />
                      <div
                        style={{
                          fontFamily: monoFont,
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text1)',
                          textAlign: 'right',
                        }}
                      >
                        {Math.round(panel.length * panel.width * 100) / 100}
                      </div>
                      <button
                        onClick={() => removePanel(panel.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text3)',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Running total */}
              <div
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                    Panels
                  </span>
                  <span
                    style={{
                      fontFamily: monoFont,
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text1)',
                    }}
                  >
                    {panels.length}
                  </span>
                </div>
                <div
                  style={{
                    borderTop: '2px solid var(--border)',
                    paddingTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text1)',
                      fontFamily: headingFont,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Total Area
                  </span>
                  <span
                    style={{
                      fontFamily: monoFont,
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'var(--green)',
                    }}
                  >
                    {totalSqftRounded} sqft
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button onClick={onClose} style={{ ...btnCancel, flex: 1 }}>
            Cancel
          </button>
          {activeTab === 'trace' && (
            <button
              onClick={handleUseSqft}
              disabled={totalSqft <= 0}
              style={{
                ...btnGreen,
                flex: 1,
                opacity: totalSqft <= 0 ? 0.5 : 1,
                cursor: totalSqft <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Use This Sqft ({Math.round(totalSqft)})
            </button>
          )}
          {activeTab === 'ai' && !mockupUrl && (
            <button
              onClick={handleGenerateMockup}
              disabled={generating || !designBrief.trim()}
              style={{
                ...btnGreen,
                flex: 1,
                background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                opacity: generating || !designBrief.trim() ? 0.5 : 1,
                cursor: generating || !designBrief.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {generating ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'mockup-spin 0.6s linear infinite',
                    }}
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={13} />
                  Generate
                </>
              )}
            </button>
          )}
          {activeTab === 'ai' && mockupUrl && (
            <button
              onClick={handleUseMockup}
              style={{ ...btnGreen, flex: 1 }}
            >
              Use This Mockup
            </button>
          )}
        </div>
      </div>

      {/* Spinner keyframe animation */}
      <style>{`
        @keyframes mockup-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
