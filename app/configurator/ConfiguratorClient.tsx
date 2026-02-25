'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import {
  Search, Camera, RotateCcw, Send, ChevronDown, Check, Layers, X, Truck,
} from 'lucide-react'
import type { VehicleCategory } from '@/lib/configurator/vehicleModels'
import { VEHICLE_CATEGORY_OPTIONS, PANEL_LABELS } from '@/lib/configurator/vehicleModels'
import type { ConfiguratorHandle, WrapMaterial, PanelConfig } from '@/components/configurator/VehicleConfigurator'

const VehicleConfigurator = dynamic(() => import('@/components/configurator/VehicleConfigurator'), { ssr: false })

// ── Types ────────────────────────────────────────────────────────────────────

type Category = 'all' | 'gloss' | 'matte' | 'satin' | 'chrome' | 'color_shift' | 'carbon' | 'ppf'
type Brand = 'all' | 'Inozetek' | 'Pure PPF'

const CATEGORY_TABS: { id: Category; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'gloss',       label: 'Gloss' },
  { id: 'matte',       label: 'Matte' },
  { id: 'satin',       label: 'Satin' },
  { id: 'chrome',      label: 'Chrome' },
  { id: 'color_shift', label: 'Color Shift' },
  { id: 'carbon',      label: 'Carbon' },
  { id: 'ppf',         label: 'PPF' },
]

// ── Swatch ────────────────────────────────────────────────────────────────────

function MaterialSwatch({ mat, selected, onClick }: { mat: WrapMaterial; selected: boolean; onClick: () => void }) {
  const isColorShift = mat.category === 'color_shift' && mat.hex_color_2
  const isChrome     = mat.category === 'chrome'
  const isPPF        = mat.is_ppf

  const swatchBg = isColorShift
    ? `linear-gradient(135deg, ${mat.hex_color} 0%, ${mat.hex_color_2} 100%)`
    : isChrome
    ? `conic-gradient(from 0deg, ${mat.hex_color}, #ffffff, ${mat.hex_color}, #aaaaaa, ${mat.hex_color})`
    : mat.hex_color ?? '#2a2a2a'

  return (
    <button
      onClick={onClick}
      title={mat.name}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0',
        minWidth: 64,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: swatchBg,
        border: selected ? '2.5px solid var(--accent)' : '2px solid rgba(255,255,255,0.1)',
        boxShadow: selected
          ? '0 0 0 3px rgba(79,127,255,0.35), inset 0 0 12px rgba(0,0,0,0.3)'
          : isChrome
          ? 'inset 0 2px 8px rgba(255,255,255,0.4), inset 0 -2px 8px rgba(0,0,0,0.3)'
          : mat.category === 'gloss'
          ? 'inset 0 2px 6px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.4)'
          : 'inset 0 2px 4px rgba(0,0,0,0.4)',
        position: 'relative', flexShrink: 0,
        transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.12s',
        transform: selected ? 'scale(1.08)' : 'scale(1)',
      }}>
        {selected && (
          <Check size={16} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
        )}
        {isPPF && !selected && (
          <div style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.6)', borderRadius: 3, fontSize: 7, color: '#aaa', padding: '0 2px' }}>PPF</div>
        )}
      </div>
      <span style={{ fontSize: 9, color: selected ? 'var(--text1)' : 'var(--text3)', textAlign: 'center', lineHeight: 1.2, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {mat.name.replace(/^(Gloss|Matte|Satin|Chrome|Carbon Fiber|Color Shift|Pure PPF|PPF)\s*/i, '')}
      </span>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ConfiguratorClient({ profile, materials }: { profile: any; materials: WrapMaterial[] }) {
  const supabase = createClient()
  const configRef = useRef<ConfiguratorHandle>(null)

  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('sprinter_van')
  const [selectedPanel,   setSelectedPanel]   = useState<string | null>(null)
  const [selectedMat,     setSelectedMat]     = useState<WrapMaterial | null>(null)
  const [panelConfigs,    setPanelConfigs]     = useState<PanelConfig[]>([])
  const [catFilter,       setCatFilter]        = useState<Category>('all')
  const [brandFilter,     setBrandFilter]      = useState<Brand>('all')
  const [search,          setSearch]           = useState('')
  const [sessionId,       setSessionId]        = useState<string | null>(null)
  const [sending,         setSending]          = useState(false)
  const [toast,           setToast]            = useState<string | null>(null)
  const [vehicleOpen,     setVehicleOpen]      = useState(false)
  const [vehicleYear,     setVehicleYear]      = useState('')
  const [vehicleMake,     setVehicleMake]      = useState('')
  const [vehicleModel,    setVehicleModel]     = useState('')
  const [mockupUrls,      setMockupUrls]       = useState<string[]>([])
  const [activeMockup,    setActiveMockup]     = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // Create/load session on mount
  useEffect(() => {
    supabase.from('configurator_sessions').insert({
      org_id: 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
      vehicle_category: vehicleCategory,
      created_by: profile?.id,
    }).select('id').single().then(({ data }) => {
      if (data) setSessionId(data.id)
    })
  }, [])

  // Save session config when panel configs change
  useEffect(() => {
    if (!sessionId) return
    supabase.from('configurator_sessions').update({
      panel_config: panelConfigs,
      vehicle_category: vehicleCategory,
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId)
  }, [panelConfigs, vehicleCategory, sessionId])

  // Filtered materials
  const filtered = materials.filter(m => {
    if (brandFilter !== 'all' && m.brand !== brandFilter) return false
    if (catFilter === 'ppf') {
      if (!m.is_ppf && !m.category.startsWith('ppf')) return false
    } else if (catFilter !== 'all') {
      if (m.category !== catFilter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!m.name.toLowerCase().includes(q) && !m.brand.toLowerCase().includes(q)) return false
    }
    return true
  })

  const handlePanelSelect = useCallback((pid: string | null) => setSelectedPanel(pid), [])

  const handleMaterialApplied = useCallback((configs: PanelConfig[]) => setPanelConfigs(configs), [])

  const applyToPanel = (mat: WrapMaterial) => {
    if (!configRef.current) return
    setSelectedMat(mat)
    if (selectedPanel) {
      configRef.current.applyMaterialToPanel(selectedPanel, mat)
    }
  }

  const applyToAll = () => {
    if (!configRef.current || !selectedMat) return
    configRef.current.applyMaterialToPanel('all', selectedMat)
    showToast('Material applied to entire vehicle')
  }

  const takeScreenshot = async () => {
    if (!configRef.current) return
    const dataUrl = configRef.current.takeScreenshot()
    if (!dataUrl) return
    showToast('Screenshot captured!')
    // Download
    const a = document.createElement('a')
    a.href = dataUrl; a.download = `wrap-config-${Date.now()}.png`; a.click()
  }

  const sendToCustomer = async () => {
    if (!configRef.current) return
    setSending(true)
    try {
      const dataUrl = configRef.current.takeScreenshot()
      if (!dataUrl) return
      // Upload
      const blob = await fetch(dataUrl).then(r => r.blob())
      const fname = `configurator-preview-${Date.now()}.png`
      const { error: upErr } = await supabase.storage
        .from('project-files')
        .upload(`previews/${fname}`, blob, { contentType: 'image/png' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(`previews/${fname}`)
      // Save to session
      if (sessionId) {
        await supabase.from('configurator_sessions').update({ screenshot_url: publicUrl }).eq('id', sessionId)
      }
      showToast('Preview saved! Share the configurator link with your customer.')
    } catch {
      showToast('Error saving preview')
    } finally {
      setSending(false)
    }
  }

  const resetAll = () => {
    configRef.current?.resetPanels()
    setSelectedMat(null)
    setSelectedPanel(null)
    setActiveMockup(null)
    showToast('Reset to default')
  }

  const panelLabel = selectedPanel ? (PANEL_LABELS[selectedPanel] ?? selectedPanel.replace(/_/g, ' ')) : null

  return (
    <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header strip */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--surface2)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', flexShrink: 0 }}>
        <Layers size={18} color="var(--accent)" />
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.02em' }}>3D WRAP CONFIGURATOR</span>
        <div style={{ flex: 1 }} />

        {/* Vehicle selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setVehicleOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '6px 12px', color: 'var(--text1)', fontSize: 13, cursor: 'pointer' }}
          >
            <Truck size={14} />
            {VEHICLE_CATEGORY_OPTIONS.find(v => v.value === vehicleCategory)?.label ?? 'Select Vehicle'}
            <ChevronDown size={12} style={{ opacity: 0.6, transform: vehicleOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {vehicleOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 10, padding: 6, zIndex: 50, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {VEHICLE_CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setVehicleCategory(opt.value); setVehicleOpen(false); setSelectedPanel(null); setSelectedMat(null) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: vehicleCategory === opt.value ? 'var(--surface2)' : 'transparent', border: 'none', borderRadius: 7, color: vehicleCategory === opt.value ? 'var(--accent)' : 'var(--text1)', fontSize: 13, cursor: 'pointer' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={takeScreenshot} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '6px 12px', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
          <Camera size={14} /> Screenshot
        </button>
        <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '6px 12px', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* Body: 3D view + sidebar */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: 0 }}>

        {/* 3D Viewport */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <VehicleConfigurator
            ref={configRef}
            vehicleCategory={vehicleCategory}
            onPanelSelect={handlePanelSelect}
            onMaterialApplied={handleMaterialApplied}
            mockupImageUrl={activeMockup}
          />
        </div>

        {/* Right panel */}
        <div style={{ width: 320, background: 'var(--surface)', borderLeft: '1px solid var(--surface2)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>

          {/* Panel target */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--surface2)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => { setSelectedPanel(null) }}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: !selectedPanel ? 'var(--accent)' : 'var(--surface2)', color: !selectedPanel ? '#fff' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              All Panels
            </button>
            <div style={{ flex: 1, padding: '6px 10px', borderRadius: 7, background: 'var(--surface2)', fontSize: 12, color: selectedPanel ? 'var(--accent)' : 'var(--text3)', textAlign: 'center', fontWeight: selectedPanel ? 600 : 400 }}>
              {selectedPanel ? panelLabel : 'Click panel'}
            </div>
            {selectedPanel && (
              <button onClick={() => setSelectedPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search */}
          <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--surface2)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search finishes..."
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid transparent', borderRadius: 7, padding: '7px 8px 7px 28px', fontSize: 12, color: 'var(--text1)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Brand filter */}
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              {(['all', 'Inozetek', 'Pure PPF'] as Brand[]).map(b => (
                <button
                  key={b}
                  onClick={() => setBrandFilter(b)}
                  style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', background: brandFilter === b ? 'rgba(79,127,255,0.18)' : 'var(--surface2)', color: brandFilter === b ? 'var(--accent)' : 'var(--text3)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                >
                  {b === 'all' ? 'All' : b}
                </button>
              ))}
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCatFilter(tab.id)}
                  style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: catFilter === tab.id ? 'var(--accent)' : 'var(--surface2)', color: catFilter === tab.id ? '#fff' : 'var(--text3)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected material preview */}
          {selectedMat && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--surface2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: selectedMat.category === 'color_shift' && selectedMat.hex_color_2
                  ? `linear-gradient(135deg, ${selectedMat.hex_color}, ${selectedMat.hex_color_2})`
                  : selectedMat.hex_color ?? '#2a2a2a',
                flexShrink: 0, border: '2px solid var(--accent)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMat.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{selectedMat.brand} · {selectedMat.product_line}</div>
              </div>
            </div>
          )}

          {/* Swatches grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 4px', alignContent: 'start' }}>
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text3)', fontSize: 12, paddingTop: 32 }}>
                No materials found
              </div>
            )}
            {filtered.map(mat => (
              <MaterialSwatch
                key={mat.id}
                mat={mat}
                selected={selectedMat?.id === mat.id}
                onClick={() => applyToPanel(mat)}
              />
            ))}
          </div>

          {/* Mockup strip */}
          {mockupUrls.length > 0 && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--surface2)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                AI Mockups — click to project
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {mockupUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveMockup(activeMockup === url ? null : url)}
                    style={{ flexShrink: 0, width: 72, height: 50, borderRadius: 8, overflow: 'hidden', border: activeMockup === url ? '2px solid var(--accent)' : '2px solid var(--surface2)', cursor: 'pointer', padding: 0 }}
                  >
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--surface2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => { if (selectedMat && selectedPanel) configRef.current?.applyMaterialToPanel(selectedPanel, selectedMat) }}
              disabled={!selectedMat || !selectedPanel}
              style={{ padding: '9px 0', borderRadius: 8, border: 'none', background: selectedMat && selectedPanel ? 'var(--accent)' : 'var(--surface2)', color: selectedMat && selectedPanel ? '#fff' : 'var(--text3)', fontSize: 13, fontWeight: 600, cursor: selectedMat && selectedPanel ? 'pointer' : 'not-allowed' }}
            >
              Apply to {panelLabel ?? 'Panel'}
            </button>
            <button
              onClick={applyToAll}
              disabled={!selectedMat}
              style={{ padding: '9px 0', borderRadius: 8, border: 'none', background: selectedMat ? 'rgba(79,127,255,0.14)' : 'var(--surface2)', color: selectedMat ? 'var(--accent)' : 'var(--text3)', fontSize: 13, fontWeight: 600, cursor: selectedMat ? 'pointer' : 'not-allowed' }}
            >
              Apply to Entire Vehicle
            </button>
            <button
              onClick={sendToCustomer}
              disabled={sending}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
            >
              <Send size={14} /> {sending ? 'Saving...' : 'Save & Share Preview'}
            </button>
          </div>
        </div>
      </div>

      {/* Config summary ribbon */}
      {panelConfigs.length > 0 && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--surface2)', padding: '8px 20px', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0 }}>
          {panelConfigs.map(cfg => (
            <div key={cfg.panelId} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', borderRadius: 6, padding: '4px 10px', flexShrink: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: cfg.material.hex_color ?? '#555' }} />
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{PANEL_LABELS[cfg.panelId] ?? cfg.panelId.replace(/_/g, ' ')}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{cfg.material.name.split(' ').slice(0, 2).join(' ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 10, padding: '10px 20px', fontSize: 13, color: 'var(--text1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 9999,
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}
    </main>
  )
}
