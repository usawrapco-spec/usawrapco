'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Star, Briefcase, X, ZoomIn, ChevronLeft, ChevronRight, Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#1e2738',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', amber: '#f59e0b',
  text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

type PhotoType = 'before' | 'after' | 'progress' | 'detail'
type Zone = 'front' | 'rear' | 'driver_side' | 'passenger_side' | 'roof' | 'interior' | 'full' | ''

interface JobPhoto {
  id: string
  photo_type: PhotoType
  url: string
  caption: string | null
  zone: Zone
  is_featured: boolean
  is_portfolio: boolean
  uploaded_by: string | null
  created_at: string
}

const PHOTO_TYPES: { key: PhotoType; label: string; color: string }[] = [
  { key: 'before', label: 'Before', color: '#f59e0b' },
  { key: 'after', label: 'After', color: '#22c07a' },
  { key: 'progress', label: 'Progress', color: '#4f7fff' },
  { key: 'detail', label: 'Detail', color: '#8b5cf6' },
]

const ZONES: { key: Zone; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'rear', label: 'Rear' },
  { key: 'driver_side', label: 'Driver Side' },
  { key: 'passenger_side', label: 'Pass. Side' },
  { key: 'roof', label: 'Roof' },
  { key: 'interior', label: 'Interior' },
  { key: 'full', label: 'Full View' },
]

export default function JobPhotosTab({ projectId, orgId, currentUserId }: { projectId: string; orgId: string; currentUserId: string }) {
  const supabase = createClient()
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [uploadType, setUploadType] = useState<PhotoType>('after')
  const [uploadZone, setUploadZone] = useState<Zone>('')
  const [filterType, setFilterType] = useState<PhotoType | 'all'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/job-photos?project_id=${projectId}`)
    const json = await res.json()
    setPhotos(json.photos || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const path = `job-photos/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('project-files').upload(path, file)
        if (uploadErr) continue
        const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
        await fetch('/api/job-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, photo_type: uploadType, url: publicUrl, zone: uploadZone }),
        })
      }
      await load()
    } finally {
      setUploading(false)
    }
  }

  const toggleFlag = async (photo: JobPhoto, field: 'is_featured' | 'is_portfolio') => {
    const updated = { ...photo, [field]: !photo[field] }
    setPhotos(prev => prev.map(p => p.id === photo.id ? updated : p))
    await fetch('/api/job-photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: photo.id, [field]: updated[field] }),
    })
  }

  const deletePhoto = async (photo: JobPhoto) => {
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    await fetch(`/api/job-photos?id=${photo.id}`, { method: 'DELETE' })
    if (lightboxIdx !== null) setLightboxIdx(null)
  }

  const filtered = filterType === 'all' ? photos : photos.filter(p => p.photo_type === filterType)

  const groupedByType: Record<PhotoType, JobPhoto[]> = {
    before: photos.filter(p => p.photo_type === 'before'),
    after: photos.filter(p => p.photo_type === 'after'),
    progress: photos.filter(p => p.photo_type === 'progress'),
    detail: photos.filter(p => p.photo_type === 'detail'),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Upload Controls */}
      <div style={{ background: C.surface2, borderRadius: 12, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {/* Photo type selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PHOTO_TYPES.map(pt => (
            <button
              key={pt.key}
              onClick={() => setUploadType(pt.key)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${uploadType === pt.key ? pt.color : C.border}`,
                background: uploadType === pt.key ? `${pt.color}20` : 'transparent',
                color: uploadType === pt.key ? pt.color : C.text2,
              }}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Zone selector */}
        <select
          value={uploadZone}
          onChange={e => setUploadZone(e.target.value as Zone)}
          style={{ padding: '6px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text2, fontSize: 12, cursor: 'pointer' }}
        >
          <option value="">Any zone</option>
          {ZONES.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
        </select>

        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && handleUpload(e.target.files)} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            background: C.accent, border: 'none', borderRadius: 8, color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', marginLeft: 'auto',
          }}
        >
          {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
          {uploading ? 'Uploading...' : 'Upload Photos'}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={() => setFilterType('all')}
          style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${filterType === 'all' ? C.accent : C.border}`, background: filterType === 'all' ? 'rgba(79,127,255,0.12)' : 'transparent', color: filterType === 'all' ? C.accent : C.text2 }}
        >
          All ({photos.length})
        </button>
        {PHOTO_TYPES.map(pt => {
          const count = groupedByType[pt.key].length
          if (count === 0) return null
          return (
            <button
              key={pt.key}
              onClick={() => setFilterType(pt.key)}
              style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${filterType === pt.key ? pt.color : C.border}`, background: filterType === pt.key ? `${pt.color}20` : 'transparent', color: filterType === pt.key ? pt.color : C.text2 }}
            >
              {pt.label} ({count})
            </button>
          )
        })}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: C.text3 }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
          Loading photos...
        </div>
      )}

      {!loading && filterType === 'all' ? (
        /* Grouped view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {PHOTO_TYPES.map(pt => {
            const group = groupedByType[pt.key]
            if (group.length === 0) return null
            return (
              <div key={pt.key}>
                <div style={{ fontSize: 11, fontWeight: 800, color: pt.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: 'Barlow Condensed, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pt.color }} />
                  {pt.label} Photos
                </div>
                <PhotoGrid photos={group} allPhotos={photos} onToggleFlag={toggleFlag} onDelete={deletePhoto} onLightbox={idx => setLightboxIdx(photos.indexOf(group[idx]))} />
              </div>
            )
          })}
        </div>
      ) : !loading ? (
        <PhotoGrid photos={filtered} allPhotos={photos} onToggleFlag={toggleFlag} onDelete={deletePhoto} onLightbox={idx => setLightboxIdx(photos.indexOf(filtered[idx]))} />
      ) : null}

      {!loading && photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3 }}>
          <Camera size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No photos yet</div>
          <div style={{ fontSize: 12 }}>Upload before/after photos to document the job</div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null && i > 0 ? i - 1 : i) }}
            style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={22} />
          </button>
          <img
            src={photos[lightboxIdx].url}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }}
          />
          <button
            onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null && i < photos.length - 1 ? i + 1 : i) }}
            style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={22} />
          </button>
          <button
            onClick={() => setLightboxIdx(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
          {/* Photo actions in lightbox */}
          <div style={{ position: 'absolute', bottom: 24, display: 'flex', gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); lightboxIdx !== null && toggleFlag(photos[lightboxIdx], 'is_featured') }}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: photos[lightboxIdx].is_featured ? C.amber : 'rgba(255,255,255,0.1)', color: photos[lightboxIdx].is_featured ? '#000' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Star size={13} fill={photos[lightboxIdx].is_featured ? '#000' : 'none'} />
              {photos[lightboxIdx].is_featured ? 'Featured' : 'Feature'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); lightboxIdx !== null && toggleFlag(photos[lightboxIdx], 'is_portfolio') }}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: photos[lightboxIdx].is_portfolio ? C.green : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Briefcase size={13} />
              {photos[lightboxIdx].is_portfolio ? 'In Portfolio' : 'Portfolio'}
            </button>
            <button
              onClick={e => { e.stopPropagation(); lightboxIdx !== null && deletePhoto(photos[lightboxIdx]) }}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(242,90,90,0.2)', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function PhotoGrid({ photos, allPhotos, onToggleFlag, onDelete, onLightbox }: {
  photos: JobPhoto[]
  allPhotos: JobPhoto[]
  onToggleFlag: (p: JobPhoto, f: 'is_featured' | 'is_portfolio') => void
  onDelete: (p: JobPhoto) => void
  onLightbox: (idx: number) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
      {photos.map((photo, i) => (
        <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3', background: '#1a1d27', cursor: 'pointer', border: `1px solid ${C.border}` }}>
          <img src={photo.url} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => onLightbox(i)} />
          {/* Badges */}
          <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
            {photo.is_featured && <span style={{ background: C.amber, color: '#000', fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 3 }}>FEATURED</span>}
            {photo.is_portfolio && <span style={{ background: C.green, color: '#000', fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 3 }}>PORTFOLIO</span>}
            {photo.zone && <span style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3 }}>{photo.zone.replace('_', ' ')}</span>}
          </div>
          {/* Hover actions */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 6, gap: 4, opacity: 0 }}
            className="photo-hover"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)' }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); onLightbox(i) }} style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 0', cursor: 'pointer' }}>
                <ZoomIn size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); onToggleFlag(photo, 'is_featured') }} style={{ flex: 1, background: photo.is_featured ? C.amber : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4, color: photo.is_featured ? '#000' : '#fff', fontSize: 10, fontWeight: 700, padding: '4px 0', cursor: 'pointer' }}>
                <Star size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(photo) }} style={{ flex: 1, background: 'rgba(242,90,90,0.3)', border: 'none', borderRadius: 4, color: C.red, fontSize: 10, fontWeight: 700, padding: '4px 0', cursor: 'pointer' }}>
                <X size={11} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
