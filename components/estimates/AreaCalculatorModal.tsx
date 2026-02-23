'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Calculator } from 'lucide-react'

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

interface Panel {
  id: string
  name: string
  length: number
  width: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onUseSqft: (sqft: number) => void
  currentSqft?: number
}

export default function AreaCalculatorModal({ isOpen, onClose, onUseSqft, currentSqft }: Props) {
  const [panels, setPanels] = useState<Panel[]>([
    { id: '1', name: 'Hood', length: 0, width: 0 },
    { id: '2', name: 'Roof', length: 0, width: 0 },
    { id: '3', name: 'Left Side', length: 0, width: 0 },
    { id: '4', name: 'Right Side', length: 0, width: 0 },
    { id: '5', name: 'Rear', length: 0, width: 0 },
  ])
  const [wastePercent, setWastePercent] = useState(15)

  if (!isOpen) return null

  const totalRaw = panels.reduce((sum, p) => sum + (p.length * p.width), 0)
  const totalWithWaste = Math.round(totalRaw * (1 + wastePercent / 100))

  function addPanel() {
    setPanels(prev => [...prev, {
      id: `p-${Date.now()}`,
      name: `Panel ${prev.length + 1}`,
      length: 0,
      width: 0,
    }])
  }

  function removePanel(id: string) {
    setPanels(prev => prev.filter(p => p.id !== id))
  }

  function updatePanel(id: string, field: keyof Panel, value: string | number) {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text1)',
    outline: 'none', fontFamily: monoFont,
  }

  const label: React.CSSProperties = {
    display: 'block', fontSize: 9, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4,
    fontFamily: headingFont,
  }

  // Quick presets for common vehicle panels
  const PRESETS = [
    { name: 'Sedan Full', panels: [
      { name: 'Hood', length: 4.5, width: 5 },
      { name: 'Roof', length: 5, width: 5 },
      { name: 'Left Side', length: 15, width: 4 },
      { name: 'Right Side', length: 15, width: 4 },
      { name: 'Trunk', length: 4, width: 5 },
      { name: 'Front Bumper', length: 6, width: 2.5 },
      { name: 'Rear Bumper', length: 6, width: 2.5 },
    ]},
    { name: 'Truck Full', panels: [
      { name: 'Hood', length: 5, width: 5.5 },
      { name: 'Roof', length: 6, width: 5.5 },
      { name: 'Left Side', length: 18, width: 5 },
      { name: 'Right Side', length: 18, width: 5 },
      { name: 'Tailgate', length: 5.5, width: 4 },
      { name: 'Front Bumper', length: 7, width: 2.5 },
      { name: 'Rear Bumper', length: 7, width: 2.5 },
    ]},
    { name: 'Van Full', panels: [
      { name: 'Hood', length: 5, width: 5.5 },
      { name: 'Roof', length: 10, width: 6 },
      { name: 'Left Side', length: 20, width: 6 },
      { name: 'Right Side', length: 20, width: 6 },
      { name: 'Rear Doors', length: 6, width: 6 },
    ]},
  ]

  function loadPreset(preset: typeof PRESETS[0]) {
    setPanels(preset.panels.map((p, i) => ({
      id: `preset-${i}`,
      name: p.name,
      length: p.length,
      width: p.width,
    })))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 0, width: 620, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 16, fontWeight: 900, fontFamily: headingFont, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Area Calculator
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Quick presets */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...label, marginBottom: 8 }}>Quick Presets</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {PRESETS.map(preset => (
                <button key={preset.name} onClick={() => loadPreset(preset)} style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--accent)',
                }}>
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Panels list */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={label}>Panel Dimensions (ft)</div>
              <button onClick={addPanel} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
                color: 'var(--green)',
              }}>
                <Plus size={11} /> Add Panel
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 32px', gap: 6, padding: '0 0 4px 0' }}>
                <span style={{ ...label, marginBottom: 0 }}>Panel Name</span>
                <span style={{ ...label, marginBottom: 0, textAlign: 'center' as const }}>Length</span>
                <span style={{ ...label, marginBottom: 0, textAlign: 'center' as const }}>Width</span>
                <span style={{ ...label, marginBottom: 0, textAlign: 'right' as const }}>Sqft</span>
                <span />
              </div>
              {panels.map(panel => (
                <div key={panel.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 32px', gap: 6, alignItems: 'center' }}>
                  <input
                    value={panel.name}
                    onChange={e => updatePanel(panel.id, 'name', e.target.value)}
                    style={{ ...inp, fontFamily: 'inherit' }}
                    placeholder="Panel name"
                  />
                  <input
                    type="number"
                    value={panel.length || ''}
                    onChange={e => updatePanel(panel.id, 'length', Number(e.target.value))}
                    style={{ ...inp, textAlign: 'center' as const }}
                    min={0} step={0.5}
                  />
                  <input
                    type="number"
                    value={panel.width || ''}
                    onChange={e => updatePanel(panel.id, 'width', Number(e.target.value))}
                    style={{ ...inp, textAlign: 'center' as const }}
                    min={0} step={0.5}
                  />
                  <div style={{ fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: 'var(--text1)', textAlign: 'right' as const }}>
                    {Math.round(panel.length * panel.width)}
                  </div>
                  <button onClick={() => removePanel(panel.id)} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text3)', padding: 4, display: 'flex', alignItems: 'center',
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Waste factor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <span style={{ ...label, marginBottom: 0, minWidth: 80 }}>Waste Factor</span>
            <input
              type="number"
              value={wastePercent}
              onChange={e => setWastePercent(Number(e.target.value))}
              style={{ ...inp, width: 60, textAlign: 'center' as const }}
              min={0} max={50}
            />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>%</span>
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Raw Area</span>
              <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{totalRaw} sqft</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>+ {wastePercent}% Waste</span>
              <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>{Math.round(totalRaw * wastePercent / 100)} sqft</span>
            </div>
            <div style={{ borderTop: '2px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
              <span style={{ fontFamily: monoFont, fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{totalWithWaste} sqft</span>
            </div>
            {currentSqft && currentSqft > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'right' as const }}>
                Current: {currentSqft} sqft
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 9, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--text2)',
          }}>
            Cancel
          </button>
          <button onClick={() => { onUseSqft(totalWithWaste); onClose() }} style={{
            flex: 1, padding: '10px', borderRadius: 9, fontWeight: 800, fontSize: 13,
            cursor: 'pointer', background: 'var(--green)', border: 'none', color: '#fff',
          }}>
            Use This Sqft ({totalWithWaste})
          </button>
        </div>
      </div>
    </div>
  )
}
