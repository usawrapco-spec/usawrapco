'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, Plus, Shield, Zap, Droplets, X } from 'lucide-react'

const C = {
  surface: '#13151c', surface2: '#1a1d27', border: '#1e2738',
  accent: '#4f7fff', green: '#22c07a', amber: '#f59e0b', purple: '#8b5cf6',
  text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

// Static upsell suggestions keyed by service_type or project type
const UPSELL_MAP: Record<string, { name: string; desc: string; value: string; icon: typeof Shield }[]> = {
  full_wrap: [
    { name: 'Chrome Delete', desc: 'Complete the look — black out all chrome trim', value: 'From $350', icon: Zap },
    { name: 'PPF Full Front', desc: 'Protect your new wrap from rock chips and road debris', value: 'From $1,400', icon: Shield },
    { name: 'Window Tint', desc: 'While the vehicle is already in the shop', value: 'From $280', icon: Droplets },
  ],
  partial_wrap: [
    { name: 'Full Vehicle Wrap', desc: 'Upgrade to full coverage for max impact', value: 'From $2,400', icon: Zap },
    { name: 'Chrome Delete', desc: 'Perfect complement to a partial wrap', value: 'From $350', icon: Shield },
    { name: 'Roof Wrap', desc: 'Add a contrasting roof to complete the look', value: '$450', icon: Droplets },
  ],
  ppf_front: [
    { name: 'Full Vehicle PPF', desc: 'Extend full-body protection — eliminate any gap', value: 'From $4,500', icon: Shield },
    { name: 'Full Vehicle Wrap', desc: 'Color change or brand graphics to go with your PPF', value: 'From $2,400', icon: Zap },
    { name: 'PPF Rockers', desc: 'Also protect the side rockers from road salt', value: '$400', icon: Droplets },
  ],
  ppf_full: [
    { name: 'Ceramic Coating', desc: 'Apply ceramic coat over PPF for hydrophobic protection', value: 'From $600', icon: Droplets },
    { name: 'Window Tint', desc: 'Round out the protection package with UV-blocking tint', value: 'From $280', icon: Shield },
  ],
  marine_wrap: [
    { name: 'DekWave Decking', desc: 'Match your hull with premium synthetic teak decking', value: '$28/sq ft', icon: Zap },
  ],
  fleet_wrap: [
    { name: 'PPF Full Front', desc: 'Protect fleet vehicles from road damage — per unit', value: 'From $1,400', icon: Shield },
    { name: 'Chrome Delete', desc: 'Unify brand look across your entire fleet', value: 'From $350', icon: Zap },
  ],
  default: [
    { name: 'Chrome Delete', desc: 'Clean up the trim for a complete custom look', value: 'From $350', icon: Zap },
    { name: 'Window Tint', desc: 'Great add-on while vehicle is in the shop', value: 'From $280', icon: Droplets },
    { name: 'PPF Full Front', desc: 'Protect the investment with paint protection film', value: 'From $1,400', icon: Shield },
  ],
}

interface Props {
  projectId: string
  serviceType?: string // from form_data or line items
  existingServices?: string[] // already on estimate, to exclude
  estimateId?: string
}

export default function UpsellWidget({ projectId, serviceType, existingServices = [], estimateId }: Props) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [added, setAdded] = useState<string[]>([])

  const key = serviceType || 'default'
  const suggestions = (UPSELL_MAP[key] || UPSELL_MAP.default).filter(
    u => !existingServices.some(s => s.toLowerCase().includes(u.name.toLowerCase())) &&
         !dismissed.includes(u.name)
  )

  const handleAdd = (name: string) => {
    setAdded(prev => [...prev, name])
    // Navigate to estimate editor if estimateId available
    if (estimateId) {
      window.location.href = `/estimates/${estimateId}?add=${encodeURIComponent(name)}`
    }
  }

  if (suggestions.length === 0) return null

  return (
    <div style={{ background: 'rgba(79,127,255,0.04)', border: `1px solid rgba(79,127,255,0.2)`, borderRadius: 12, padding: 16, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Lightbulb size={14} color={C.amber} />
        <span style={{ fontSize: 11, fontWeight: 800, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Barlow Condensed, sans-serif' }}>
          Upsell Opportunities
        </span>
        {serviceType && (
          <span style={{ fontSize: 11, color: C.text3, marginLeft: 4 }}>
            · Based on this job
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map(s => {
          const Icon = s.icon
          const isAdded = added.includes(s.name)
          return (
            <div
              key={s.name}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                background: C.surface2, borderRadius: 8, border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,127,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={C.accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>{s.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.green, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{s.value}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleAdd(s.name)}
                    disabled={isAdded}
                    style={{
                      padding: '4px 10px', borderRadius: 5, border: 'none', cursor: isAdded ? 'default' : 'pointer',
                      background: isAdded ? C.green : C.accent, color: '#fff', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    <Plus size={10} />
                    {isAdded ? 'Added' : 'Add'}
                  </button>
                  <button
                    onClick={() => setDismissed(prev => [...prev, s.name])}
                    style={{ padding: '4px 6px', borderRadius: 5, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.text3 }}
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
