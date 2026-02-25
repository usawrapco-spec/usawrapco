'use client'

import { useState } from 'react'
import { Search, Check, X } from 'lucide-react'
import type { WrapMaterial, PanelConfig } from '@/components/configurator/VehicleConfigurator'
import { PANEL_LABELS } from '@/lib/configurator/vehicleModels'

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

function MaterialSwatch({ mat, selected, onClick }: { mat: WrapMaterial; selected: boolean; onClick: () => void }) {
  const isColorShift = mat.category === 'color_shift' && mat.hex_color_2
  const isChrome = mat.category === 'chrome'
  const isPPF = mat.is_ppf

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
        minWidth: 56,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: swatchBg,
        border: selected ? '2.5px solid #4f7fff' : '2px solid rgba(255,255,255,0.1)',
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
          <Check size={14} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
        )}
        {isPPF && !selected && (
          <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.6)', borderRadius: 3, fontSize: 7, color: '#aaa', padding: '0 2px' }}>PPF</div>
        )}
      </div>
      <span style={{ fontSize: 9, color: selected ? '#e8eaed' : '#5a6080', textAlign: 'center', lineHeight: 1.2, maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {mat.name.replace(/^(Gloss|Matte|Satin|Chrome|Carbon Fiber|Color Shift|Pure PPF|PPF)\s*/i, '')}
      </span>
    </button>
  )
}

interface MaterialPickerPanelProps {
  materials: WrapMaterial[]
  selectedMat: WrapMaterial | null
  selectedPanel: string | null
  panelConfigs: PanelConfig[]
  onSelectMaterial: (mat: WrapMaterial) => void
  onSelectPanel: (pid: string | null) => void
  onApplyToPanel: (mat: WrapMaterial) => void
  onApplyToAll: () => void
  /** If provided, shows "Send & Share" action button */
  onSend?: () => void
  sending?: boolean
}

export default function MaterialPickerPanel({
  materials, selectedMat, selectedPanel, panelConfigs,
  onSelectMaterial, onSelectPanel, onApplyToPanel, onApplyToAll, onSend, sending,
}: MaterialPickerPanelProps) {
  const [catFilter, setCatFilter] = useState<Category>('all')
  const [brandFilter, setBrandFilter] = useState<Brand>('all')
  const [search, setSearch] = useState('')

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

  const panelLabel = selectedPanel ? (PANEL_LABELS[selectedPanel] ?? selectedPanel.replace(/_/g, ' ')) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Panel target */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1a1d27', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => onSelectPanel(null)}
          style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', background: !selectedPanel ? '#4f7fff' : '#1a1d27', color: !selectedPanel ? '#fff' : '#9299b5', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
        >
          All Panels
        </button>
        <div style={{ flex: 1, padding: '5px 8px', borderRadius: 6, background: '#1a1d27', fontSize: 11, color: selectedPanel ? '#4f7fff' : '#5a6080', textAlign: 'center', fontWeight: selectedPanel ? 600 : 400 }}>
          {selectedPanel ? panelLabel : 'Click panel'}
        </div>
        {selectedPanel && (
          <button onClick={() => onSelectPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: 2 }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #1a1d27', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search finishes..."
            style={{ width: '100%', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 6, padding: '6px 8px 6px 26px', fontSize: 11, color: '#e8eaed', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {/* Brand filter */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['all', 'Inozetek', 'Pure PPF'] as Brand[]).map(b => (
            <button key={b} onClick={() => setBrandFilter(b)}
              style={{ flex: 1, padding: '3px 0', borderRadius: 5, border: 'none', background: brandFilter === b ? 'rgba(79,127,255,0.18)' : '#1a1d27', color: brandFilter === b ? '#4f7fff' : '#5a6080', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
              {b === 'all' ? 'All' : b}
            </button>
          ))}
        </div>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
          {CATEGORY_TABS.map(tab => (
            <button key={tab.id} onClick={() => setCatFilter(tab.id)}
              style={{ padding: '2px 7px', borderRadius: 5, border: 'none', background: catFilter === tab.id ? '#4f7fff' : '#1a1d27', color: catFilter === tab.id ? '#fff' : '#5a6080', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected material preview */}
      {selectedMat && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a1d27', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: selectedMat.category === 'color_shift' && selectedMat.hex_color_2
              ? `linear-gradient(135deg, ${selectedMat.hex_color}, ${selectedMat.hex_color_2})`
              : selectedMat.hex_color ?? '#2a2a2a',
            flexShrink: 0, border: '2px solid #4f7fff',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMat.name}</div>
            <div style={{ fontSize: 9, color: '#5a6080' }}>{selectedMat.brand} · {selectedMat.product_line}</div>
          </div>
        </div>
      )}

      {/* Swatches grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 2px', alignContent: 'start' }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#5a6080', fontSize: 12, paddingTop: 24 }}>
            No materials found
          </div>
        )}
        {filtered.map(mat => (
          <MaterialSwatch
            key={mat.id}
            mat={mat}
            selected={selectedMat?.id === mat.id}
            onClick={() => { onSelectMaterial(mat); onApplyToPanel(mat) }}
          />
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #1a1d27', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => { if (selectedMat) onApplyToPanel(selectedMat) }}
          disabled={!selectedMat || !selectedPanel}
          style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: selectedMat && selectedPanel ? '#4f7fff' : '#1a1d27', color: selectedMat && selectedPanel ? '#fff' : '#5a6080', fontSize: 12, fontWeight: 600, cursor: selectedMat && selectedPanel ? 'pointer' : 'not-allowed' }}
        >
          Apply to {panelLabel ?? 'Panel'}
        </button>
        <button
          onClick={onApplyToAll}
          disabled={!selectedMat}
          style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: selectedMat ? 'rgba(79,127,255,0.14)' : '#1a1d27', color: selectedMat ? '#4f7fff' : '#5a6080', fontSize: 12, fontWeight: 600, cursor: selectedMat ? 'pointer' : 'not-allowed' }}
        >
          Apply to Entire Vehicle
        </button>
        {onSend && (
          <button
            onClick={onSend}
            disabled={sending}
            style={{ padding: '8px 0', borderRadius: 7, border: 'none', background: '#22c07a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}
          >
            {sending ? 'Saving...' : 'Save & Share Preview'}
          </button>
        )}
      </div>
    </div>
  )
}
