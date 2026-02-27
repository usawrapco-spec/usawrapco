'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Upload, ImageIcon, Video, FileText, Grid, List, X,
  Tag, Folder, Copy, Trash2, Download, Check, Filter, ChevronDown, Pencil,
} from 'lucide-react'
import { usePhotoEditor } from '@/components/photo-editor/PhotoEditorProvider'
import type { ImageSource } from '@/components/photo-editor/types'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
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
  folder: string
  created_at: string
  uploaded_by: string
}

interface Props { profile: Profile }

const BUCKET = 'project-files'

const FOLDERS = [
  { key: 'all', label: 'All Files', icon: Folder },
  { key: 'vehicle-photos', label: 'Vehicle Photos', icon: ImageIcon },
  { key: 'designs', label: 'Designs', icon: ImageIcon },
  { key: 'proofs', label: 'Proofs', icon: FileText },
  { key: 'logos', label: 'Logos', icon: ImageIcon },
  { key: 'customer', label: 'Customer Uploads', icon: Upload },
  { key: 'internal', label: 'Internal', icon: Folder },
]

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

function formatBytes(bytes: number) {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default function MediaLibraryClient({ profile }: Props) {
  const { xpToast, badgeToast } = useToast()
  const { openEditor, openCopyTo } = usePhotoEditor()
  const [files, setFiles]             = useState<MediaFile[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [tagFilter, setTagFilter]     = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [view, setView]               = useState<'grid' | 'list'>('grid')
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selected, setSelected]       = useState<string | null>(null)
  const [multiSelect, setMultiSelect] = useState<Set<string>>(new Set())
  const [isMultiMode, setIsMultiMode] = useState(false)
  const [dragging, setDragging]       = useState(false)
  const [tagInput, setTagInput]       = useState('')
  const [showTagEditor, setShowTagEditor] = useState(false)
  const [copied, setCopied]           = useState<string | null>(null)
  const fileRef                       = useRef<HTMLInputElement>(null)
  const dropRef                       = useRef<HTMLDivElement>(null)
  const supabase                      = createClient()

  useEffect(() => { loadFiles() }, [])

  async function loadFiles() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (!error && data) {
        setFiles(data as MediaFile[])
      } else {
        const { data: oldData } = await supabase
          .from('job_images')
          .select('id, image_url, file_name, category, created_at')
          .order('created_at', { ascending: false })
          .limit(200)

        setFiles((oldData || []).map((f: Record<string, unknown>) => ({
          id: f.id as string,
          filename: f.file_name as string || 'image',
          public_url: f.image_url as string || '',
          mime_type: 'image/jpeg',
          file_size: 0,
          tags: [],
          ai_tags: [],
          vehicle_type_tag: '',
          wrap_type_tag: '',
          source: 'internal',
          folder: 'internal',
          created_at: f.created_at as string,
          uploaded_by: '',
        })))
      }
    } catch {
      setFiles([])
    }
    setLoading(false)
  }

  async function handleUpload(fileList: FileList | File[]) {
    const filesToUpload = Array.from(fileList)
    if (!filesToUpload.length) return
    setUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      try {
        const ext = file.name.split('.').pop()
        const path = `media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

        const folder = folderFilter !== 'all' ? folderFilter : 'internal'

        await supabase.from('media_files').insert({
          storage_path: path,
          public_url: publicUrl,
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: profile.id,
          source: 'internal',
          folder,
          tags: [],
          ai_tags: [],
        })

        // AI auto-tag in background
        const insertedData = await supabase.from('media_files')
          .select('id')
          .eq('storage_path', path)
          .single()
        if (insertedData.data?.id && file.type?.startsWith('image/')) {
          fetch('/api/ai/auto-tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaFileId: insertedData.data.id, imageUrl: publicUrl }),
          }).catch((error) => { console.error(error); })
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
      setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100))
    }

    await loadFiles()
    // Award XP
    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'media_upload', sourceType: 'media' }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number; newBadges?: string[] } | null) => {
        if (res?.amount) xpToast(res.amount, 'Media uploaded', res.leveledUp, res.newLevel)
        if (res?.newBadges?.length) badgeToast(res.newBadges)
      })
      .catch((error) => { console.error(error); })

    setUploading(false)
    setUploadProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files)
    }
  }, [folderFilter])

  // Multi-select
  function toggleMultiSelect(id: string) {
    setMultiSelect(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkDelete() {
    if (!multiSelect.size) return
    const ids = Array.from(multiSelect)
    await supabase.from('media_files').delete().in('id', ids)
    setMultiSelect(new Set())
    setIsMultiMode(false)
    await loadFiles()
  }

  async function bulkTag(tag: string) {
    if (!multiSelect.size || !tag.trim()) return
    const ids = Array.from(multiSelect)
    for (const id of ids) {
      const file = files.find(f => f.id === id)
      if (file) {
        const tags = Array.from(new Set([...(file.tags || []), tag.trim()]))
        await supabase.from('media_files').update({ tags }).eq('id', id)
      }
    }
    setTagInput('')
    setShowTagEditor(false)
    await loadFiles()
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* noop */ }
  }

  function toMediaImageSource(f: MediaFile): ImageSource {
    return {
      url: f.public_url,
      sourceType: 'media_file',
      sourceId: f.id,
      fileName: f.filename,
      storagePath: (f as any).storage_path || '',
      category: f.folder,
    }
  }

  // Filters
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
    const matchFolder = folderFilter === 'all' || (f.folder === folderFilter) || (f.source === folderFilter)
    return matchSearch && matchTag && matchFolder
  })

  const selectedFile = files.find(f => f.id === selected)

  const canDelete = isAdminRole(profile.role) || profile.role === 'production'

  return (
    <div
      ref={dropRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {/* Drag overlay */}
      {dragging && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(79,127,255,0.15)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '3px dashed var(--accent)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', fontFamily: headingFont }}>
            Drop files to upload
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text1)', fontFamily: headingFont, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Media Library
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            {files.length} files {filtered.length !== files.length ? `(${filtered.length} shown)` : ''} · Drag and drop to upload
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isMultiMode && multiSelect.size > 0 && (
            <>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTagEditor(!showTagEditor)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--accent)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Tag size={13} /> Tag ({multiSelect.size})
                </button>
                {showTagEditor && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4, padding: 12,
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                    zIndex: 20, display: 'flex', gap: 6, width: 240,
                  }}>
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && bulkTag(tagInput)}
                      placeholder="Enter tag..."
                      style={{
                        flex: 1, padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none',
                      }}
                      autoFocus
                    />
                    <button onClick={() => bulkTag(tagInput)} style={{
                      padding: '6px 12px', background: 'var(--accent)', border: 'none', borderRadius: 6,
                      color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>Add</button>
                  </div>
                )}
              </div>
              {canDelete && (
                <button
                  onClick={bulkDelete}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--red)',
                    background: 'rgba(242,90,90,0.1)', color: 'var(--red)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Trash2 size={13} /> Delete ({multiSelect.size})
                </button>
              )}
            </>
          )}
          <button
            onClick={() => { setIsMultiMode(!isMultiMode); setMultiSelect(new Set()) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${isMultiMode ? 'var(--accent)' : 'var(--border)'}`,
              background: isMultiMode ? 'rgba(79,127,255,0.12)' : 'var(--surface)',
              color: isMultiMode ? 'var(--accent)' : 'var(--text2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Check size={13} /> Select
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            <Upload size={14} />
            {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,.pdf,.ai,.eps,.svg"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Folder tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {FOLDERS.map(f => {
          const count = f.key === 'all' ? files.length : files.filter(fi => fi.folder === f.key || fi.source === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setFolderFilter(f.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8, whiteSpace: 'nowrap',
                border: `1px solid ${folderFilter === f.key ? 'var(--accent)' : 'var(--border)'}`,
                background: folderFilter === f.key ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
                color: folderFilter === f.key ? 'var(--accent)' : 'var(--text3)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <f.icon size={13} />
              {f.label}
              <span style={{
                fontSize: 10, fontFamily: monoFont, padding: '1px 5px', borderRadius: 4,
                background: folderFilter === f.key ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search + filters */}
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
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Filter size={13} style={{ position: 'absolute', left: 10, color: 'var(--text3)', pointerEvents: 'none' }} />
            <select
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              style={{ padding: '8px 12px 8px 30px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
            >
              <option value="">All tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <ImageIcon size={40} style={{ color: 'var(--text3)', opacity: 0.4, margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>
            {search || tagFilter ? 'No files match your search' : 'No files uploaded yet — drag and drop or click Upload'}
          </div>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {filtered.map(f => {
            const isImg = f.mime_type?.startsWith('image/')
            const isSelected = isMultiMode && multiSelect.has(f.id)
            return (
              <div
                key={f.id}
                onClick={() => isMultiMode ? toggleMultiSelect(f.id) : setSelected(f.id === selected ? null : f.id)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--green)' : f.id === selected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                  transition: 'border-color 0.15s', position: 'relative',
                }}
              >
                {isMultiMode && (
                  <div style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 2,
                    width: 20, height: 20, borderRadius: 4,
                    background: isSelected ? 'var(--green)' : 'rgba(0,0,0,0.5)',
                    border: `2px solid ${isSelected ? 'var(--green)' : 'var(--text3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <Check size={12} color="#fff" />}
                  </div>
                )}
                {isImg ? (
                  <div style={{ height: 140, overflow: 'hidden', background: 'var(--surface2)', position: 'relative' }} className="group/card">
                    <img src={f.public_url} alt={f.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {!isMultiMode && (
                      <div
                        className="opacity-0 group-hover/card:opacity-100"
                        style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, transition: 'opacity 0.15s' }}
                      >
                        <button
                          title="Edit Photo"
                          onClick={(e) => { e.stopPropagation(); openEditor(toMediaImageSource(f)) }}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(0,0,0,0.6)', color: '#22c07a', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          title="Copy To..."
                          onClick={(e) => { e.stopPropagation(); openCopyTo(toMediaImageSource(f)) }}
                          style={{
                            width: 28, height: 28, borderRadius: 6, border: 'none',
                            background: 'rgba(0,0,0,0.6)', color: '#22d3ee', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)' }}>
                    {f.mime_type?.startsWith('video/') ? <Video size={36} style={{ color: 'var(--text3)' }} /> : <FileText size={36} style={{ color: 'var(--text3)' }} />}
                  </div>
                )}
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.filename}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: monoFont }}>{formatBytes(f.file_size)}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(f => {
            const isSelected = isMultiMode && multiSelect.has(f.id)
            return (
              <div
                key={f.id}
                onClick={() => isMultiMode ? toggleMultiSelect(f.id) : setSelected(f.id === selected ? null : f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--surface)',
                  border: `1px solid ${isSelected ? 'var(--green)' : f.id === selected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 10, cursor: 'pointer',
                }}
              >
                {isMultiMode && (
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    background: isSelected ? 'var(--green)' : 'transparent',
                    border: `2px solid ${isSelected ? 'var(--green)' : 'var(--text3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <Check size={12} color="#fff" />}
                  </div>
                )}
                {f.mime_type?.startsWith('image/') ? (
                  <img src={f.public_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: 'var(--surface2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={20} style={{ color: 'var(--text3)' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {formatBytes(f.file_size)} · {new Date(f.created_at).toLocaleDateString()}
                    {f.folder && f.folder !== 'internal' ? ` · ${f.folder}` : ''}
                  </div>
                </div>
                {!isMultiMode && (
                  <button
                    onClick={e => { e.stopPropagation(); copyUrl(f.public_url) }}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      background: copied === f.public_url ? 'rgba(34,192,122,0.1)' : 'var(--surface2)',
                      color: copied === f.public_url ? 'var(--green)' : 'var(--text3)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {copied === f.public_url ? <><Check size={11} /> Copied</> : <><Copy size={11} /> URL</>}
                  </button>
                )}
                {f.source && (
                  <span style={{ padding: '3px 8px', background: 'var(--surface2)', borderRadius: 5, fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                    {f.source}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedFile && !isMultiMode && (
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
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Size</div><div style={{ fontSize: 13, fontFamily: monoFont }}>{formatBytes(selectedFile.file_size)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Type</div><div style={{ fontSize: 13 }}>{selectedFile.mime_type}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Source</div><div style={{ fontSize: 13 }}>{selectedFile.source || '--'}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Uploaded</div><div style={{ fontSize: 13 }}>{new Date(selectedFile.created_at).toLocaleDateString()}</div></div>
                {selectedFile.folder && (
                  <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Folder</div><div style={{ fontSize: 13 }}>{selectedFile.folder}</div></div>
                )}
                {selectedFile.vehicle_type_tag && (
                  <div><div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Vehicle Type</div><div style={{ fontSize: 13 }}>{selectedFile.vehicle_type_tag}</div></div>
                )}
              </div>
              {[...(selectedFile.tags || []), ...(selectedFile.ai_tags || [])].length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Tags</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(selectedFile.tags || []).map(t => (
                      <span key={`t-${t}`} style={{ padding: '3px 8px', background: 'rgba(79,127,255,0.12)', color: 'var(--accent)', borderRadius: 5, fontSize: 12 }}>{t}</span>
                    ))}
                    {(selectedFile.ai_tags || []).map(t => (
                      <span key={`ai-${t}`} style={{ padding: '3px 8px', background: 'rgba(139,92,246,0.12)', color: 'var(--purple)', borderRadius: 5, fontSize: 12 }}>{t} (AI)</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedFile.mime_type?.startsWith('image/') && (
                  <>
                    <button
                      onClick={() => { setSelected(null); openEditor(toMediaImageSource(selectedFile)) }}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(34,192,122,0.1)', border: '1px solid var(--green)', color: 'var(--green)',
                      }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => { setSelected(null); openCopyTo(toMediaImageSource(selectedFile)) }}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(34,211,238,0.1)', border: '1px solid var(--cyan)', color: 'var(--cyan)',
                      }}
                    >
                      <Copy size={13} /> Copy To
                    </button>
                  </>
                )}
                <button
                  onClick={() => copyUrl(selectedFile.public_url)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: copied === selectedFile.public_url ? 'rgba(34,192,122,0.15)' : 'var(--surface2)',
                    border: `1px solid ${copied === selectedFile.public_url ? 'var(--green)' : 'var(--border)'}`,
                    color: copied === selectedFile.public_url ? 'var(--green)' : 'var(--text2)',
                  }}
                >
                  {copied === selectedFile.public_url ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy URL</>}
                </button>
                <a
                  href={selectedFile.public_url}
                  style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={13} /> Open full size
                </a>
                {canDelete && (
                  <button
                    onClick={async () => {
                      await supabase.from('media_files').delete().eq('id', selectedFile.id)
                      setSelected(null)
                      await loadFiles()
                    }}
                    style={{
                      padding: '8px 16px', background: 'rgba(242,90,90,0.1)', border: '1px solid var(--red)',
                      borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
