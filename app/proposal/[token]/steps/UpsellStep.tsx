'use client'

import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react'

interface UpsellStepProps {
  upsells: any[]
  selectedIds: string[]
  onToggle: (id: string) => void
  packagePrice: number
  total: number
  onContinue: () => void
  onBack: () => void
  colors: any
}

export default function UpsellStep({
  upsells, selectedIds, onToggle, packagePrice, total, onContinue, onBack, colors: C,
}: UpsellStepProps) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 160px' }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: C.text3, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 0,
      }}>
        <ChevronLeft size={16} /> Back
      </button>

      <div style={{
        fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
        textAlign: 'center', marginBottom: 8,
      }}>
        Enhance Your Package
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: C.text2, marginBottom: 32 }}>
        Add optional upgrades to get the most out of your wrap
      </div>

      {/* Upsell cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {upsells.map((ups: any) => {
          const isOn = selectedIds.includes(ups.id)
          return (
            <div
              key={ups.id}
              onClick={() => onToggle(ups.id)}
              style={{
                background: isOn ? 'rgba(245,158,11,0.06)' : C.surface,
                border: `2px solid ${isOn ? C.accent : C.border}`,
                borderRadius: 14,
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'all 0.2s',
              }}
            >
              {/* Photo */}
              {ups.photo_url ? (
                <img
                  src={ups.photo_url}
                  alt={ups.name}
                  style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Plus size={20} style={{ color: C.text3 }} />
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>{ups.name}</span>
                  {ups.badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                      background: `${C.accent}20`, color: C.accent,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {ups.badge}
                    </span>
                  )}
                </div>
                {ups.description && (
                  <div style={{ fontSize: 13, color: C.text3, lineHeight: 1.4 }}>
                    {ups.description}
                  </div>
                )}
              </div>

              {/* Price */}
              <div style={{
                fontSize: 16, fontWeight: 800, color: C.text1,
                fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
              }}>
                +${Number(ups.price).toLocaleString()}
              </div>

              {/* Toggle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isOn ? C.accent : 'rgba(255,255,255,0.06)',
                border: `2px solid ${isOn ? C.accent : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s',
              }}>
                {isOn && <Check size={16} style={{ color: '#000' }} />}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: C.bg, borderTop: `1px solid ${C.border}`,
        padding: '16px 20px',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Running total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, padding: '0 4px',
          }}>
            <span style={{ fontSize: 14, color: C.text2 }}>
              Package + Add-ons
            </span>
            <span style={{
              fontSize: 22, fontWeight: 900, color: C.accent,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              ${total.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onContinue}
            style={{
              width: '100%', padding: '18px', border: 'none', borderRadius: 14,
              background: `linear-gradient(135deg, ${C.accent}, #d97706)`,
              color: '#000', fontSize: 17, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Continue
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
