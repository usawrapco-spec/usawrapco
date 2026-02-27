'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Wand2, PenTool, Upload, Type, Square, Circle, Minus, Image,
  Layers, ZoomIn, ZoomOut, Grid3x3, Undo2, Redo2, Download,
  Save, Send, Loader2, ChevronRight, ChevronLeft, Palette,
  Sparkles, Eye, RotateCw, Trash2, Copy, Move, MousePointer,
  FileImage, Settings, ArrowLeft, Check, X, Sliders
} from 'lucide-react'

type Mode = 'ai' | 'manual'
type AIStep = 1 | 2 | 3 | 4

const STYLE_TILES = [
  { id: 'clean', label: 'Clean', color: '#e0e0e0' },
  { id: 'bold', label: 'Bold', color: '#ff4444' },
  { id: 'colorful', label: 'Colorful', color: '#ff9900' },
  { id: 'professional', label: 'Professional', color: '#4f7fff' },
  { id: 'grunge', label: 'Grunge', color: '#666' },
  { id: 'gradient', label: 'Gradient', color: '#8b5cf6' },
]

const VEHICLE_TYPES = [
  'Sedan', 'SUV', 'Truck', 'Van', 'Sports Car', 'Box Truck',
  'Trailer', 'Bus', 'Motorcycle', 'Boat', 'Food Truck', 'Other',
]

const TOOLS = [
  { id: 'select', icon: MousePointer, label: 'Select' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'image', icon: Image, label: 'Image' },
  { id: 'logo', icon: FileImage, label: 'Logo' },
]

export default function DesignStudioPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.job_id as string
  const [mode, setMode] = useState<Mode>('ai')
  const [aiStep, setAIStep] = useState<AIStep>(1)
  const [activeTool, setActiveTool] = useState('select')
  const [showGrid, setShowGrid] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [concepts, setConcepts] = useState<string[]>([])
  const [selectedConcept, setSelectedConcept] = useState<number | null>(null)
  const [job, setJob] = useState<any>(null)
  const [canvasObjects, setCanvasObjects] = useState<any[]>([])
  const [selectedObject, setSelectedObject] = useState<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  // AI mode form state
  const [brandInfo, setBrandInfo] = useState({
    companyName: '',
    brandDescription: '',
    colors: ['#4f7fff', '#ffffff', '#000000'],
    industry: '',
  })
  const [vehicleInfo, setVehicleInfo] = useState({
    type: '',
    color: '',
    purpose: '',
  })
  const [designDirection, setDesignDirection] = useState({
    style: '',
    description: '',
  })

  // Load job info
  useEffect(() => {
    const loadJob = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, vehicle_desc, customer_id')
        .eq('id', jobId)
        .single()
      if (data) setJob(data)
    }
    if (jobId) loadJob()
  }, [jobId])

  const generateConcepts = async () => {
    setGenerating(true)
    // Simulate AI generation with placeholder concepts
    await new Promise(r => setTimeout(r, 3000))
    setConcepts([
      '/api/placeholder/concept-1',
      '/api/placeholder/concept-2',
      '/api/placeholder/concept-3',
    ])
    setGenerating(false)
    setAIStep(4)
  }

  const saveDesign = async () => {
    setSaving(true)
    try {
      await supabase.from('design_files').upsert({
        job_id: jobId,
        name: `Design - ${job?.title || 'Untitled'}`,
        canvas_json: { objects: canvasObjects, mode },
        version: 1,
        mode,
        status: 'draft',
      })
    } catch {}
    setSaving(false)
  }

  // Auto-save every 2 minutes in manual mode
  useEffect(() => {
    if (mode !== 'manual') return
    const interval = setInterval(saveDesign, 120000)
    return () => clearInterval(interval)
  }, [mode, canvasObjects])

  const renderAIMode = () => (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 0' }}>
      {/* Step Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
        {[1, 2, 3, 4].map(step => (
          <div
            key={step}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: aiStep >= step ? 'var(--accent)' : 'var(--surface2)',
              border: `2px solid ${aiStep >= step ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              color: aiStep >= step ? '#fff' : 'var(--text3)',
            }}>
              {aiStep > step ? <Check size={14} /> : step}
            </div>
            {step < 4 && <div style={{ width: 40, height: 2, background: aiStep > step ? 'var(--accent)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Brand Info */}
      {aiStep === 1 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 20, fontFamily: 'Barlow Condensed' }}>
            Brand Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="field-label">Company Name</label>
              <input className="field" value={brandInfo.companyName} onChange={e => setBrandInfo(p => ({ ...p, companyName: e.target.value }))} placeholder="Enter company name" />
            </div>
            <div>
              <label className="field-label">Logo Upload</label>
              <div style={{
                border: '2px dashed var(--border)', borderRadius: 10, padding: 32,
                textAlign: 'center', cursor: 'pointer', color: 'var(--text3)',
              }}>
                <Upload size={24} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13 }}>Click or drag to upload logo</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>PNG, SVG, AI, EPS</div>
              </div>
            </div>
            <div>
              <label className="field-label">Brand Description</label>
              <textarea className="field" rows={3} value={brandInfo.brandDescription} onChange={e => setBrandInfo(p => ({ ...p, brandDescription: e.target.value }))} placeholder="Describe the brand, style, and message..." />
            </div>
            <div>
              <label className="field-label">Brand Colors</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {brandInfo.colors.map((color, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <input
                      type="color"
                      value={color}
                      onChange={e => {
                        const next = [...brandInfo.colors]
                        next[i] = e.target.value
                        setBrandInfo(p => ({ ...p, colors: next }))
                      }}
                      style={{ width: 44, height: 44, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }}
                    />
                  </div>
                ))}
                <button
                  onClick={() => setBrandInfo(p => ({ ...p, colors: [...p.colors, '#333333'] }))}
                  style={{
                    width: 44, height: 44, borderRadius: 8, border: '2px dashed var(--border)',
                    background: 'transparent', cursor: 'pointer', color: 'var(--text3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
              </div>
            </div>
            <div>
              <label className="field-label">Industry</label>
              <input className="field" value={brandInfo.industry} onChange={e => setBrandInfo(p => ({ ...p, industry: e.target.value }))} placeholder="e.g., Construction, Food Service, Real Estate" />
            </div>
            <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setAIStep(2)}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Vehicle Info */}
      {aiStep === 2 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 20, fontFamily: 'Barlow Condensed' }}>
            Vehicle Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="field-label">Vehicle Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {VEHICLE_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setVehicleInfo(p => ({ ...p, type }))}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: `1px solid ${vehicleInfo.type === type ? 'var(--accent)' : 'var(--border)'}`,
                      background: vehicleInfo.type === type ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                      color: vehicleInfo.type === type ? 'var(--accent)' : 'var(--text2)',
                      cursor: 'pointer',
                    }}
                  >{type}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Vehicle Color</label>
              <input className="field" value={vehicleInfo.color} onChange={e => setVehicleInfo(p => ({ ...p, color: e.target.value }))} placeholder="e.g., White, Black, Silver" />
            </div>
            <div>
              <label className="field-label">Vehicle Purpose</label>
              <input className="field" value={vehicleInfo.purpose} onChange={e => setVehicleInfo(p => ({ ...p, purpose: e.target.value }))} placeholder="e.g., Company fleet, Food truck, Personal" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => setAIStep(1)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setAIStep(3)}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Design Direction */}
      {aiStep === 3 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 20, fontFamily: 'Barlow Condensed' }}>
            Design Direction
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="field-label">Style</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {STYLE_TILES.map(tile => (
                  <button
                    key={tile.id}
                    onClick={() => setDesignDirection(p => ({ ...p, style: tile.id }))}
                    style={{
                      padding: 16, borderRadius: 10, textAlign: 'center',
                      border: `2px solid ${designDirection.style === tile.id ? 'var(--accent)' : 'var(--border)'}`,
                      background: designDirection.style === tile.id ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, margin: '0 auto 8px',
                      background: `linear-gradient(135deg, ${tile.color}, ${tile.color}88)`,
                    }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: designDirection.style === tile.id ? 'var(--accent)' : 'var(--text2)' }}>
                      {tile.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Describe What You Want</label>
              <textarea className="field" rows={4} value={designDirection.description} onChange={e => setDesignDirection(p => ({ ...p, description: e.target.value }))} placeholder="Describe the look, feel, and any specific elements you want in the design..." />
            </div>
            <div>
              <label className="field-label">Reference Images (Optional)</label>
              <div style={{
                border: '2px dashed var(--border)', borderRadius: 10, padding: 24,
                textAlign: 'center', cursor: 'pointer', color: 'var(--text3)',
              }}>
                <Upload size={20} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12 }}>Upload reference images</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => setAIStep(2)}>
                <ChevronLeft size={16} /> Back
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={generateConcepts}>
                <Sparkles size={16} /> Generate Concepts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Generated Concepts */}
      {aiStep === 4 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 20, fontFamily: 'Barlow Condensed' }}>
            AI-Generated Concepts
          </h3>
          {generating ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 2s infinite',
              }}>
                <Wand2 size={28} color="#fff" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
                Generating Design Concepts...
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                AI is creating 3 unique design concepts based on your inputs
              </div>
              <div style={{ marginTop: 20, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'var(--accent)', borderRadius: 2,
                  animation: 'progressBar 3s ease-in-out',
                  width: '100%',
                }} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {concepts.map((concept, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedConcept(i)}
                    style={{
                      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                      border: `2px solid ${selectedConcept === i ? 'var(--accent)' : 'var(--border)'}`,
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      width: '100%', height: 160, background: 'var(--surface2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                        <Image size={32} style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: 11 }}>Concept {i + 1}</div>
                      </div>
                    </div>
                    {/* Watermark overlay */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.2)',
                      transform: 'rotate(-30deg)',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: 3 }}>
                        PROOF
                      </span>
                    </div>
                    <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between' }}>
                      <button className="btn-xs btn-primary" onClick={e => { e.stopPropagation(); setSelectedConcept(i) }}>Select</button>
                      <button className="btn-xs btn-ghost"><RotateCw size={12} /> Redo</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button className="btn-ghost" onClick={() => setAIStep(3)}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button className="btn-ghost" onClick={generateConcepts}>
                  <RotateCw size={16} /> Regenerate All
                </button>
                {selectedConcept !== null && (
                  <button className="btn-primary" style={{ flex: 1 }} onClick={() => setMode('manual')}>
                    <PenTool size={16} /> Edit in Designer
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  const renderManualMode = () => (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Left Panel - Tools */}
      <div style={{
        width: 56, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '8px 0', gap: 2,
      }}>
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            style={{
              width: 44, height: 44, margin: '0 auto', borderRadius: 8,
              background: activeTool === tool.id ? 'var(--accent)' : 'transparent',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <tool.icon size={18} color={activeTool === tool.id ? '#fff' : 'var(--text2)'} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
            style={{
              width: 44, height: 44, margin: '0 auto', borderRadius: 8,
              background: showGrid ? 'var(--surface2)' : 'transparent',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Grid3x3 size={18} color="var(--text2)" />
          </button>
        </div>
      </div>

      {/* Left Sidebar - Layers */}
      <div style={{
        width: 200, background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid var(--border)',
          fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Layers size={14} /> Layers
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {canvasObjects.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              No layers yet. Use the tools to add elements.
            </div>
          )}
          {canvasObjects.map((obj, i) => (
            <div
              key={i}
              onClick={() => setSelectedObject(obj)}
              style={{
                padding: '8px 10px', borderRadius: 6, marginBottom: 2,
                background: selectedObject === obj ? 'var(--surface2)' : 'transparent',
                cursor: 'pointer', fontSize: 12, color: 'var(--text1)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Eye size={12} color="var(--text3)" />
              {obj.type} {i + 1}
            </div>
          ))}
        </div>
        {/* Vehicle Type Selector */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <label className="field-label">Vehicle Template</label>
          <select className="field" style={{ fontSize: 11 }}>
            <option>Select vehicle...</option>
            {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Center - Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
        {/* Top Toolbar */}
        <div style={{
          height: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4,
        }}>
          <button className="btn-xs btn-ghost"><Undo2 size={14} /></button>
          <button className="btn-xs btn-ghost"><Redo2 size={14} /></button>
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />
          <button className="btn-xs btn-ghost" onClick={() => setZoom(z => Math.max(25, z - 25))}>
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)', minWidth: 40, textAlign: 'center' }}>
            {zoom}%
          </span>
          <button className="btn-xs btn-ghost" onClick={() => setZoom(z => Math.min(400, z + 25))}>
            <ZoomIn size={14} />
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn-xs btn-ghost"><Download size={14} /> Export</button>
          <button className="btn-xs btn-primary" onClick={saveDesign}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <button className="btn-xs btn-primary"><Send size={14} /> Send to Production</button>
        </div>

        {/* Canvas Area */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'auto',
        }}>
          {/* Grid overlay */}
          {showGrid && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(79,127,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79,127,255,0.06) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
          )}
          {/* Bleed markers */}
          <div style={{
            width: `${800 * zoom / 100}px`,
            height: `${500 * zoom / 100}px`,
            background: '#fff',
            borderRadius: 4,
            position: 'relative',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              position: 'absolute', inset: `${10 * zoom / 100}px`,
              border: '1px dashed rgba(255,0,0,0.3)',
              borderRadius: 2,
              pointerEvents: 'none',
            }} />
            <canvas ref={canvasRef} width={800} height={500} style={{ width: '100%', height: '100%' }} />
            {/* Placeholder text */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ccc', fontSize: 14, pointerEvents: 'none',
            }}>
              <div style={{ textAlign: 'center' }}>
                <PenTool size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <div>Click to add elements to the canvas</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.5 }}>Vehicle template will appear as background</div>
              </div>
            </div>
          </div>

          {/* Rulers */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 20,
            background: 'var(--surface)', borderBottom: '1px solid var(--border)',
            fontSize: 8, color: 'var(--text3)', display: 'flex', alignItems: 'flex-end',
            paddingLeft: 20, gap: 50, overflow: 'hidden',
          }}>
            {Array.from({ length: 20 }, (_, i) => (
              <span key={i} style={{ fontFamily: 'JetBrains Mono' }}>{i * 50}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Properties */}
      <div style={{
        width: 240, background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid var(--border)',
          fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Sliders size={14} /> Properties
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {!selectedObject ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              Select an element to edit its properties
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="field-label">Position X</label>
                <input type="number" className="field" />
              </div>
              <div>
                <label className="field-label">Position Y</label>
                <input type="number" className="field" />
              </div>
              <div>
                <label className="field-label">Width</label>
                <input type="number" className="field" />
              </div>
              <div>
                <label className="field-label">Height</label>
                <input type="number" className="field" />
              </div>
              <div>
                <label className="field-label">Rotation</label>
                <input type="number" className="field" />
              </div>
              <div>
                <label className="field-label">Opacity</label>
                <input type="range" min={0} max={100} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <div>
                <label className="field-label">Fill Color</label>
                <input type="color" style={{ width: '100%', height: 32, border: 'none', borderRadius: 6 }} />
              </div>
            </div>
          )}
        </div>
        {/* Export section */}
        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="field-label">Export As</label>
          <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}><Download size={14} /> PNG</button>
          <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}><Download size={14} /> PDF (Print-Ready)</button>
          <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}><Download size={14} /> CMYK PDF</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top Bar */}
      <div style={{
        height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 20,
            color: 'var(--text1)', margin: 0,
          }}>
            Design Studio
          </h1>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{job?.title || `Job ${jobId?.slice(0, 8)}...`}</div>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex', background: 'var(--surface2)', borderRadius: 8,
          border: '1px solid var(--border)', overflow: 'hidden',
        }}>
          <button
            onClick={() => setMode('ai')}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: mode === 'ai' ? 'var(--accent)' : 'transparent',
              color: mode === 'ai' ? '#fff' : 'var(--text2)',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Wand2 size={14} /> AI-Assisted
          </button>
          <button
            onClick={() => setMode('manual')}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: mode === 'manual' ? 'var(--accent)' : 'transparent',
              color: mode === 'manual' ? '#fff' : 'var(--text2)',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <PenTool size={14} /> Manual
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'ai' ? renderAIMode() : renderManualMode()}

      <style jsx global>{`
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}
