'use client'
import { ORG_ID } from '@/lib/org'

import { useRef, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import {
  Camera, RotateCcw, Send, ChevronDown, Layers, Truck,
} from 'lucide-react'
import type { VehicleCategory } from '@/lib/configurator/vehicleModels'
import { VEHICLE_CATEGORY_OPTIONS, PANEL_LABELS } from '@/lib/configurator/vehicleModels'
import type { ConfiguratorHandle, WrapMaterial, PanelConfig } from '@/components/configurator/VehicleConfigurator'
import MaterialPickerPanel from '@/components/design/MaterialPickerPanel'

const VehicleConfigurator = dynamic(() => import('@/components/configurator/VehicleConfigurator'), { ssr: false })

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ConfiguratorClient({ profile, materials }: { profile: any; materials: WrapMaterial[] }) {
  const supabase = createClient()
  const configRef = useRef<ConfiguratorHandle>(null)

  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>('sprinter_van')
  const [selectedPanel,   setSelectedPanel]   = useState<string | null>(null)
  const [selectedMat,     setSelectedMat]     = useState<WrapMaterial | null>(null)
  const [panelConfigs,    setPanelConfigs]     = useState<PanelConfig[]>([])
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
      org_id: ORG_ID,
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

  const handlePanelSelect = useCallback((pid: string | null) => setSelectedPanel(pid), [])

  const handleMaterialApplied = useCallback((configs: PanelConfig[]) => setPanelConfigs(configs), [])

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

        {/* Right panel — shared MaterialPickerPanel */}
        <div style={{ width: 320, background: 'var(--surface)', borderLeft: '1px solid var(--surface2)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
          {mockupUrls.length > 0 && (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--surface2)' }}>
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
          <MaterialPickerPanel
            materials={materials}
            selectedMat={selectedMat}
            selectedPanel={selectedPanel}
            panelConfigs={panelConfigs}
            onSelectMaterial={mat => {
              setSelectedMat(mat)
              if (selectedPanel) configRef.current?.applyMaterialToPanel(selectedPanel, mat)
            }}
            onSelectPanel={setSelectedPanel}
            onApplyToPanel={mat => {
              if (selectedPanel) configRef.current?.applyMaterialToPanel(selectedPanel, mat)
            }}
            onApplyToAll={() => {
              if (!selectedMat) return
              configRef.current?.applyMaterialToPanel('all', selectedMat)
              showToast('Material applied to entire vehicle')
            }}
            onSend={sendToCustomer}
            sending={sending}
          />
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
