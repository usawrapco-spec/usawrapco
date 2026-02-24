'use client'

import { CheckCircle2, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useState } from 'react'

interface PackageStepProps {
  packages: any[]
  selectedId: string | null
  onSelect: (id: string) => void
  onContinue: () => void
  onBack: () => void
  colors: any
}

export default function PackageStep({
  packages, selectedId, onSelect, onContinue, onBack, colors: C,
}: PackageStepProps) {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 120px' }}>
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
        Choose Your Package
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: C.text2, marginBottom: 32 }}>
        Select the option that best fits your needs
      </div>

      {/* Package cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: packages.length <= 2 ? 'repeat(auto-fit, minmax(280px, 1fr))' : 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16, marginBottom: 32,
      }}>
        {packages.map((pkg: any) => {
          const isSelected = selectedId === pkg.id
          const includes: string[] = pkg.includes || []
          const photos: string[] = pkg.photos || []

          return (
            <div
              key={pkg.id}
              onClick={() => onSelect(pkg.id)}
              style={{
                background: C.surface,
                border: `2px solid ${isSelected ? C.accent : C.border}`,
                borderRadius: 16,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Badge */}
              {pkg.badge && (
                <div style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 2,
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                  background: `linear-gradient(135deg, ${C.accent}, #d97706)`,
                  color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {pkg.badge}
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 12, left: 12, zIndex: 2,
                  width: 28, height: 28, borderRadius: '50%', background: C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={18} style={{ color: '#000' }} />
                </div>
              )}

              {/* Photo */}
              {photos.length > 0 && (
                <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={photos[0]}
                    alt={pkg.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ padding: '20px' }}>
                {/* Name */}
                <div style={{
                  fontSize: 22, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
                  marginBottom: 4, color: C.text1,
                }}>
                  {pkg.name}
                </div>

                {/* Description */}
                {pkg.description && (
                  <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, marginBottom: 12 }}>
                    {pkg.description}
                  </div>
                )}

                {/* Price */}
                <div style={{
                  fontSize: 32, fontWeight: 900, color: C.accent,
                  fontFamily: 'JetBrains Mono, monospace', marginBottom: 16,
                }}>
                  ${Number(pkg.price).toLocaleString()}
                </div>

                {/* Includes */}
                {includes.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    {includes.map((item: string, i: number) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8,
                      }}>
                        <CheckCircle2 size={16} style={{ color: C.green, flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.4 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Video toggle */}
                {pkg.video_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedVideo(expandedVideo === pkg.id ? null : pkg.id)
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                      color: C.text2, fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    }}
                  >
                    <Play size={14} />
                    {expandedVideo === pkg.id ? 'Hide Video' : 'Watch Video'}
                  </button>
                )}

                {expandedVideo === pkg.id && pkg.video_url && (
                  <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9' }}>
                    <iframe
                      src={getEmbedUrl(pkg.video_url)}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Select button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(pkg.id) }}
                  style={{
                    width: '100%', padding: '14px', border: 'none', borderRadius: 10,
                    background: isSelected ? C.accent : 'rgba(255,255,255,0.06)',
                    color: isSelected ? '#000' : C.text1,
                    fontSize: 14, fontWeight: 800, cursor: 'pointer', marginTop: 16,
                    fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  {isSelected ? 'Selected' : 'Select This Package'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Most popular note */}
      {packages.length >= 3 && (
        <div style={{ textAlign: 'center', fontSize: 13, color: C.text3, marginBottom: 24 }}>
          Most customers choose the middle option
        </div>
      )}

      {/* Continue button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: `linear-gradient(transparent, ${C.bg} 30%)`,
        padding: '40px 20px 24px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button
            onClick={onContinue}
            disabled={!selectedId}
            style={{
              width: '100%', padding: '18px', border: 'none', borderRadius: 14,
              background: selectedId ? `linear-gradient(135deg, ${C.accent}, #d97706)` : C.surface2,
              color: selectedId ? '#000' : C.text3,
              fontSize: 17, fontWeight: 800, cursor: selectedId ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
              letterSpacing: '0.02em', opacity: selectedId ? 1 : 0.5,
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

function getEmbedUrl(url: string): string {
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v')
    return `https://www.youtube.com/embed/${id}`
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0]
    return `https://www.youtube.com/embed/${id}`
  }
  if (url.includes('vimeo.com/')) {
    const id = url.split('vimeo.com/')[1]?.split('?')[0]
    return `https://player.vimeo.com/video/${id}`
  }
  return url
}
