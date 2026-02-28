'use client'

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { X, Search, Camera, Check, Image } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface PickerPhoto {
  id: string
  photo_url: string
  caption: string | null
  category: string | null
  job_title: string | null
  customer_id: string | null
  project_id: string | null
  source_type: string
  created_at: string
}

export interface PhotoPickerConfig {
  mode: 'single' | 'multi'
  onSelect: (photos: PickerPhoto[]) => void
  onClose?: () => void
  title?: string
}

// ─── Context ───────────────────────────────────────────────────────────────────
interface PhotoPickerContextValue {
  openPicker: (config: PhotoPickerConfig) => void
  closePicker: () => void
}

const PhotoPickerContext = createContext<PhotoPickerContextValue>({
  openPicker: () => {},
  closePicker: () => {},
})

export function usePhotoPickerModal() {
  return useContext(PhotoPickerContext)
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function PhotoPickerProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PhotoPickerConfig | null>(null)

  const openPicker = useCallback((cfg: PhotoPickerConfig) => setConfig(cfg), [])
  const closePicker = useCallback(() => setConfig(null), [])

  return (
    <PhotoPickerContext.Provider value={{ openPicker, closePicker }}>
      {children}
      {config && (
        <PhotoPickerModal
          config={config}
          onClose={() => { config.onClose?.(); closePicker() }}
        />
      )}
    </PhotoPickerContext.Provider>
  )
}

// ─── Modal ─────────────────────────────────────────────────────────────────────
export function PhotoPickerModal({
  config,
  onClose,
}: {
  config: PhotoPickerConfig
  onClose: () => void
}) {
  const supabase = createClient()
  const [photos, setPhotos] = useState<PickerPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'all' | 'recent'>('all')

  useEffect(() => {
    supabase.from('customer_all_photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setPhotos((data || []) as PickerPhoto[])
        setLoading(false)
      })
  }, [])

  const filtered = photos.filter(p => {
    const q = query.toLowerCase()
    if (!q) return true
    return (
      p.caption?.toLowerCase().includes(q) ||
      p.job_title?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    )
  })

  function toggleSelect(id: string) {
    if (config.mode === 'single') {
      setSelected(new Set([id]))
      return
    }
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleConfirm() {
    const selectedPhotos = photos.filter(p => selected.has(p.id))
    config.onSelect(selectedPhotos)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 16,
          border: '1px solid var(--surface2)',
          width: '100%', maxWidth: 880,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--surface2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={18} style={{ color: 'var(--accent)' }} />
            <span style={{
              fontSize: 16, fontWeight: 800, color: 'var(--text1)',
              fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {config.title || 'Pick Photos'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search + tabs */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--surface2)', display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by job, caption, category..."
              style={{
                width: '100%', padding: '8px 10px 8px 30px',
                background: 'var(--bg)', border: '1px solid var(--surface2)',
                borderRadius: 8, color: 'var(--text1)', fontSize: 13,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'recent'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: tab === t ? 'var(--accent)' : 'var(--bg)',
                  color: tab === t ? '#fff' : 'var(--text2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>Loading photos...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
              <Image size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
              No photos found
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {filtered.map(photo => {
                const isSel = selected.has(photo.id)
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo.id)}
                    style={{
                      position: 'relative', borderRadius: 8, overflow: 'hidden',
                      aspectRatio: '4/3', cursor: 'pointer',
                      border: `2px solid ${isSel ? 'var(--accent)' : 'transparent'}`,
                      background: 'var(--bg)',
                    }}
                  >
                    {photo.photo_url ? (
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={20} style={{ opacity: 0.3 }} />
                      </div>
                    )}
                    {isSel && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={12} style={{ color: '#fff' }} />
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '16px 6px 5px', fontSize: 9, color: 'rgba(255,255,255,0.8)',
                      fontWeight: 600,
                    }}>
                      {photo.job_title || photo.caption || ''}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom confirm bar */}
        {selected.size > 0 && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid var(--surface2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
              {selected.size} photo{selected.size !== 1 ? 's' : ''} selected
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSelected(new Set())}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--surface2)',
                  background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Clear
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Use {selected.size} Photo{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
