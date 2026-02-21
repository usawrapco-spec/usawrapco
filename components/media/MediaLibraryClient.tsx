'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Upload, Tag, ImageIcon, Video, FileText, Grid, List, X, CheckCircle } from 'lucide-react'
import type { Profile } from '@/types'
import { useToast } from '@/components/shared/Toast'

interface MediaFile {
  id: string
  filename: string
  public_url: string
  mime_type: string
  file_size: number
  tags: string[]
  ai_tags: string[]
  vehicle_type_tag: string
  wrap_type_tag: string
  source: string
  created_at: string
  uploaded_by: string
}

interface Props { profile: Profile }

const BUCKET = 'job-images'

function fileIcon(mime: string) {
  if (mime?.startsWith('image/')) return ImageIcon
  if (mime?.startsWith('video/')) return Video
  return FileText
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function MediaLibraryClient({ profile }: Props) {
  const { xpToast, badgeToast } = useToast()
  const [files, setFiles]       = useState<MediaFile[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [view, setView]         = useState<'grid' | 'list'>('grid')
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const fileRef                 = useRef<HTMLInputElement>(null)
  const supabase                = createClient()

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    setLoading(true)
    try {
      // Try media_files table first (new spec schema)
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data) {
        setFiles(data as MediaFile[])
      } else {
        // Fallback: load from job_images table (old schema)
        const { data: oldData } = await supabase
          .from('job_images')
          .select('id, storage_path, public_url, mime_type, file_name, created_at')
          .order('created_at', { ascending: false })
          .limit(200)

        setFiles((oldData || []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          filename: f.file_name as string || 'image',
          public_url: f.public_url as string || '',
          mime_type: f.mime_type as string || 'image/jpeg',
          file_size: 0,
          tags: [],
          ai_tags: [],
          vehicle_type_tag: '',
          wrap_type_tag: '',
          source: 'internal',
          created_at: f.created_at as string,
          uploaded_by: '',
        })))
      }
    } catch {
      setFiles([])
    }
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

      // Try inserting into media_files table
      await supabase.from('media_files').insert({
        storage_path: path,
        public_url: publicUrl,
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: profile.id,
        source: 'internal',
        tags: [],
        ai_tags: [],
      })

      await loadFiles()
      // Award media_upload XP
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'media_upload', sourceType: 'media' }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: {  amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
          if (res?.amount) xpToast(res.amount, 'Media uploaded', res.leveledUp, res.newLevel)
          if (res?.newBadges?.length) badgeToast(res.newBadges)
        })
        .catch(() => {})
    } catch (err) {
      console.error('Upload error:', err)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const allTags = Array.from(new Set(
    files.flatMap(f => [...(f.tags || []), ...(f.ai_tags || [])])
  )).sort()

  const filtered = files.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.filename?.toLowerCase().includes(q) ||
      f.tags?.some(t => t.toLowerCase().includes(q)) ||
      f.ai_tags?.some(t => t.toLowerCase().includes(q)) ||
      f.vehicle_type_tag?.toLowerCase().includes(q)
    const matchTag = !tagFilter || f.tags?.includes(tagFilter) || f.ai_tags?.includes(tagFilter)
    return matchSearch && matchTag
  })

  const selectedFile = files.find(f => f.id === selected)

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4 }}>
            Media Library
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {files.length} files · All photos, designs, and customer uploads
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            <Upload size={14} />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files, tags..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, outline: 'none' }}
          >
            <option value="">All tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['grid', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '8px 12px', border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--accent)' : 'var(--surface)',
                color: view === v ? '#fff' : 'var(--text3)',
                display: 'flex', alignItems: 'center',
              }}
            >
              {v === 'grid' ? <Grid size={14} /> : <List size={14} />}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <ImageIcon size={40} style={{ color: 'var(--text3)', opacity: 0.4, margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>
            {search || tagFilter ? 'No files match your search' : 'No files uploaded yet'}
          </div>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {filtered.map(f => {
            const isImg = f.mime_type?.startsWith('image/')
            return (
              <div
                key={f.id}
                onClick={() => setSelected(f.id === selected ? null : f.id)}
                style={{
                  background: 'var(--surface)', border: `1px solid ${f.id === selected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                {isImg ? (
                  <div style={{ height: 140, overflow: 'hidden', background: 'var(--surface2)' }}>
                    <img src={f.public_url} alt={f.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)' }}>
                    <FileText size={36} style={{ color: 'var(--text3)' }} />
                  </div>
                )}
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.filename}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{formatBytes(f.file_size)}</div>
                  {(f.tags?.length > 0 || f.ai_tags?.length > 0) && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {[...(f.tags || []), ...(f.ai_tags || [])].slice(0, 3).map(t => (
                        <span key={t} style={{ padding: '2px 6px', background: 'rgba(79,127,255,0.12)', color: 'var(--accent)', borderRadius: 4, fontSize: 10 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(f => (
            <div
              key={f.id}
              onClick={() => setSelected(f.id === selected ? null : f.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'var(--surface)',
                border: `1px solid ${f.id === selected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, cursor: 'pointer',
              }}
            >
              {f.mime_type?.startsWith('image/') ? (
                <img src={f.public_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, background: 'var(--surface2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={20} style={{ color: 'var(--text3)' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatBytes(f.file_size)} · {new Date(f.created_at).toLocaleDateString()}</div>
              </div>
              {f.source && (
                <span style={{ padding: '3px 8px', background: 'var(--surface2)', borderRadius: 5, fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                  {f.source}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedFile && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
              maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{selectedFile.filename}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            {selectedFile.mime_type?.startsWith('image/') && (
              <img src={selectedFile.public_url} alt={selectedFile.filename} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', margin: '20px auto', display: 'block' }} />
            )}
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Size</div><div style={{ fontSize: 13 }}>{formatBytes(selectedFile.file_size)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Type</div><div style={{ fontSize: 13 }}>{selectedFile.mime_type}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Source</div><div style={{ fontSize: 13 }}>{selectedFile.source || '—'}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Uploaded</div><div style={{ fontSize: 13 }}>{new Date(selectedFile.created_at).toLocaleDateString()}</div></div>
              </div>
              {[...(selectedFile.tags || []), ...(selectedFile.ai_tags || [])].length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Tags</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[...(selectedFile.tags || []), ...(selectedFile.ai_tags || [])].map(t => (
                      <span key={t} style={{ padding: '3px 8px', background: 'rgba(79,127,255,0.12)', color: 'var(--accent)', borderRadius: 5, fontSize: 12 }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <a
                href={selectedFile.public_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}
              >
                Open full size
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
