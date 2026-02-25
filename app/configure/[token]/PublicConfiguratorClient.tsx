'use client'
import { useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { Layers, Search, Check, RotateCcw, Camera, Share2, Truck } from 'lucide-react'
import type { VehicleCategory } from '@/lib/configurator/vehicleModels'
import { PANEL_LABELS, VEHICLE_CATEGORY_OPTIONS } from '@/lib/configurator/vehicleModels'
import type { ConfiguratorHandle, WrapMaterial, PanelConfig } from '@/components/configurator/VehicleConfigurator'

const VehicleConfigurator = dynamic(() => import('@/components/configurator/VehicleConfigurator'), { ssr: false })

type Category = 'all' | 'gloss' | 'matte' | 'satin' | 'chrome' | 'color_shift' | 'carbon' | 'ppf'

const CATEGORY_TABS: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'gloss', label: 'Gloss' }, { id: 'matte', label: 'Matte' },
  { id: 'satin', label: 'Satin' }, { id: 'chrome', label: 'Chrome' }, { id: 'color_shift', label: 'Color Shift' },
  { id: 'carbon', label: 'Carbon' }, { id: 'ppf', label: 'PPF' },
]

function Swatch({ mat, selected, onClick }: { mat: WrapMaterial; selected: boolean; onClick: () => void }) {
  const bg = mat.category === 'color_shift' && mat.hex_color_2
    ? `linear-gradient(135deg, ${mat.hex_color} 0%, ${mat.hex_color_2} 100%)`
    : mat.category === 'chrome'
    ? `conic-gradient(from 0deg, ${mat.hex_color}, #ffffff, ${mat.hex_color}, #aaaaaa, ${mat.hex_color})`
    : mat.hex_color ?? '#2a2a2a'
  return (
    <button onClick={onClick} title={mat.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0', minWidth: 60 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: bg,
        border: selected ? '2.5px solid #4f7fff' : '2px solid rgba(255,255,255,0.12)',
        boxShadow: selected ? '0 0 0 3px rgba(79,127,255,0.3)' : 'inset 0 2px 6px rgba(0,0,0,0.35)',
        position: 'relative', transform: selected ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.12s',
      }}>
        {selected && <Check size={15} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />}
      </div>
      <span style={{ fontSize: 9, color: selected ? '#e8eaed' : '#5a6080', textAlign: 'center', lineHeight: 1.2, maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {mat.name.replace(/^(Gloss|Matte|Satin|Chrome|Carbon Fiber|Color Shift|Pure PPF|PPF)\s*/i, '')}
      </span>
    </button>
  )
}

export default function PublicConfiguratorClient({ session, materials }: { session: any; materials: WrapMaterial[] }) {
  const supabase   = createClient()
  const configRef  = useRef<ConfiguratorHandle>(null)

  const [vehicleCategory] = useState<VehicleCategory>(session.vehicle_category ?? 'sedan')
  const [selectedPanel,   setSelectedPanel] = useState<string | null>(null)
  const [selectedMat,     setSelectedMat]   = useState<WrapMaterial | null>(null)
  const [panelConfigs,    setPanelConfigs]  = useState<PanelConfig[]>([])
  const [catFilter,       setCatFilter]     = useState<Category>('all')
  const [search,          setSearch]        = useState('')
  const [toast,           setToast]         = useState<string | null>(null)
  const [saved,           setSaved]         = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3200) }

  const filtered = materials.filter(m => {
    if (catFilter === 'ppf') { if (!m.is_ppf && !m.category.startsWith('ppf')) return false }
    else if (catFilter !== 'all' && m.category !== catFilter) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const applyToPanel = (mat: WrapMaterial) => {
    if (!configRef.current) return
    setSelectedMat(mat)
    if (selectedPanel) configRef.current.applyMaterialToPanel(selectedPanel, mat)
  }

  const applyToAll = () => {
    if (!configRef.current || !selectedMat) return
    configRef.current.applyMaterialToPanel('all', selectedMat)
    showToast('Applied to entire vehicle!')
  }

  const saveConfig = async () => {
    if (!configRef.current) return
    const dataUrl = configRef.current.takeScreenshot()
    if (!dataUrl) return
    try {
      const blob = await fetch(dataUrl).then(r => r.blob())
      const fname = `config-${session.id}-${Date.now()}.png`
      const { error } = await supabase.storage.from('project-files').upload(`previews/${fname}`, blob, { contentType: 'image/png' })
      const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(`previews/${fname}`)
      await supabase.from('configurator_sessions').update({
        panel_config: configRef.current.getPanelConfigs(),
        screenshot_url: publicUrl,
      }).eq('public_token', session.public_token)
      setSaved(true)
      showToast('Configuration saved! Your wrap shop will receive your selection.')
    } catch {
      showToast('Error saving — please try again.')
    }
  }

  const shareLink = () => {
    navigator.clipboard?.writeText(window.location.href)
    showToast('Link copied to clipboard!')
  }

  const vehicleLabel = VEHICLE_CATEGORY_OPTIONS.find(v => v.value === vehicleCategory)?.label

  return (
    <div style={{ minHeight: '100vh', background: '#0D0F14', color: '#e8eaed', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '14px 24px', background: '#13151c', borderBottom: '1px solid #1a1d27', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Layers size={20} color="#4f7fff" />
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '0.03em' }}>
            3D WRAP CONFIGURATOR
          </div>
          <div style={{ fontSize: 11, color: '#5a6080' }}>USA Wrap Co · Configure your vehicle wrap</div>
        </div>
        <div style={{ flex: 1 }} />
        {vehicleLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1d27', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#9299b5' }}>
            <Truck size={13} /> {vehicleLabel}
          </div>
        )}
        <button onClick={shareLink} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a1d27', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#9299b5', fontSize: 12, cursor: 'pointer' }}>
          <Share2 size={13} /> Share
        </button>
      </header>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Viewport */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <VehicleConfigurator
            ref={configRef}
            vehicleCategory={vehicleCategory}
            onPanelSelect={pid => setSelectedPanel(pid)}
            onMaterialApplied={cfg => setPanelConfigs(cfg)}
          />
        </div>

        {/* Sidebar */}
        <div style={{ width: 300, background: '#13151c', borderLeft: '1px solid #1a1d27', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Panel selector */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1a1d27', display: 'flex', gap: 6 }}>
            <button onClick={() => setSelectedPanel(null)} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', background: !selectedPanel ? '#4f7fff' : '#1a1d27', color: !selectedPanel ? '#fff' : '#9299b5', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>All</button>
            <div style={{ flex: 2, padding: '5px 8px', borderRadius: 7, background: '#1a1d27', fontSize: 11, color: selectedPanel ? '#4f7fff' : '#5a6080', textAlign: 'center' }}>
              {selectedPanel ? (PANEL_LABELS[selectedPanel] ?? selectedPanel.replace(/_/g, ' ')) : 'Click a panel'}
            </div>
          </div>

          {/* Search + filters */}
          <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #1a1d27' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', background: '#1a1d27', border: 'none', borderRadius: 7, padding: '6px 8px 6px 26px', fontSize: 12, color: '#e8eaed', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
              {CATEGORY_TABS.map(t => (
                <button key={t.id} onClick={() => setCatFilter(t.id)} style={{ padding: '3px 7px', borderRadius: 6, border: 'none', background: catFilter === t.id ? '#4f7fff' : '#1a1d27', color: catFilter === t.id ? '#fff' : '#5a6080', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Swatches */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 2px', alignContent: 'start' }}>
            {filtered.map(mat => (
              <Swatch key={mat.id} mat={mat} selected={selectedMat?.id === mat.id} onClick={() => applyToPanel(mat)} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #1a1d27', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {selectedMat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#1a1d27', borderRadius: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: selectedMat.hex_color ?? '#333', flexShrink: 0, border: '1.5px solid #4f7fff' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMat.name}</div>
                  <div style={{ fontSize: 9, color: '#5a6080' }}>{selectedMat.brand}</div>
                </div>
              </div>
            )}
            <button onClick={() => selectedMat && selectedPanel && configRef.current?.applyMaterialToPanel(selectedPanel, selectedMat)} disabled={!selectedMat || !selectedPanel} style={{ padding: '8px 0', borderRadius: 8, border: 'none', background: selectedMat && selectedPanel ? '#4f7fff' : '#1a1d27', color: selectedMat && selectedPanel ? '#fff' : '#5a6080', fontSize: 12, fontWeight: 600, cursor: selectedMat && selectedPanel ? 'pointer' : 'not-allowed' }}>
              Apply to Selected Panel
            </button>
            <button onClick={applyToAll} disabled={!selectedMat} style={{ padding: '8px 0', borderRadius: 8, border: 'none', background: selectedMat ? 'rgba(79,127,255,0.14)' : '#1a1d27', color: selectedMat ? '#4f7fff' : '#5a6080', fontSize: 12, fontWeight: 600, cursor: selectedMat ? 'pointer' : 'not-allowed' }}>
              Apply to Entire Vehicle
            </button>
            <button onClick={saveConfig} disabled={saved} style={{ padding: '9px 0', borderRadius: 8, border: 'none', background: saved ? '#1a1d27' : '#22c07a', color: saved ? '#22c07a' : '#fff', fontSize: 12, fontWeight: 700, cursor: saved ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saved ? <><Check size={14} /> Configuration Saved!</> : 'Save My Configuration →'}
            </button>
            <button onClick={() => { configRef.current?.resetPanels(); setSelectedMat(null); setSaved(false) }} style={{ padding: '6px 0', borderRadius: 8, border: 'none', background: 'transparent', color: '#5a6080', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Panel summary */}
      {panelConfigs.length > 0 && (
        <div style={{ background: '#13151c', borderTop: '1px solid #1a1d27', padding: '6px 20px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {panelConfigs.map(cfg => (
            <div key={cfg.panelId} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a1d27', borderRadius: 6, padding: '3px 9px', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.material.hex_color ?? '#555' }} />
              <span style={{ fontSize: 10, color: '#9299b5' }}>{PANEL_LABELS[cfg.panelId] ?? cfg.panelId.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10, padding: '10px 20px', fontSize: 13, color: '#e8eaed', boxShadow: '0 8px 28px rgba(0,0,0,0.6)', zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
