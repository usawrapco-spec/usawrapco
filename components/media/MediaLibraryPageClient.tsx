'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Upload, Grid3X3, List, X, Tag, Copy, Trash2,
  Download, Check, Package, Edit2, Plus, Loader2, Film,
  FileText, ChevronDown,
} from 'lucide-react'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import { useToast } from '@/components/shared/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaFile {
  id: string
  org_id: string | null
  filename: string | null
  public_url: string | null
  storage_path: string | null
  mime_type: string | null
  file_size: number
  uploaded_by: string | null
  source: string | null
  category: string | null
  ai_description: string | null
  tags: string[]
  ai_tags: string[]
  color_tags: string[]
  vehicle_type_tag: string | null
  wrap_type_tag: string | null
  starred: boolean
  created_at: string
}

interface Props { profile: Profile }

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET = 'project-files'
const HF = 'Barlow Condensed, sans-serif'
const MF = 'JetBrains Mono, monospace'

const CAT_FILTERS = [
  { key: 'all',          label: 'All',            color: 'var(--text2)' },
  { key: 'vehicle-wrap', label: 'Vehicle Wraps',  color: 'var(--accent)' },
  { key: 'install-photo',label: 'Install Photos', color: 'var(--green)' },
  { key: 'before-after', label: 'Before/After',   color: 'var(--amber)' },
  { key: 'design-proof', label: 'Design Proofs',  color: 'var(--purple)' },
  { key: 'team-photo',   label: 'Team Photos',    color: 'var(--cyan)' },
  { key: 'marketing',    label: 'Marketing',      color: '#e879f9' },
  { key: 'document',     label: 'Documents',      color: 'var(--text3)' },
]

const SORT_OPTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'name',   label: 'Name' },
  { key: 'size',   label: 'Size' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(bytes: number): string {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function catColor(cat: string | null): string {
  return CAT_FILTERS.find(c => c.key === cat)?.color ?? 'var(--text3)'
}

function catLabel(cat: string | null): string {
  return CAT_FILTERS.find(c => c.key === cat)?.label ?? cat ?? 'General'
}

function isImg(mime: string | null): boolean { return !!mime?.startsWith('image/') }
function isVid(mime: string | null): boolean { return !!mime?.startsWith('video/') }

// ── Component ─────────────────────────────────────────────────────────────────

export default function MediaLibraryPageClient({ profile }: Props) {
  const { toast } = useToast()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Data ──────────────────────────────────────────────────────────────────
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)

  // ── Filters / view ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // ── Upload ────────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [dragging, setDragging] = useState(false)

  // ── Selection ─────────────────────────────────────────────────────────────
  const [multiMode, setMultiMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)

  // ── Detail editing ────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false)
  const [editNameVal, setEditNameVal] = useState('')
  const [tagInput, setTagInput] = useState('')

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [showBulkTag, setShowBulkTag] = useState(false)

  // ── Pack modal ────────────────────────────────────────────────────────────
  const [showPack, setShowPack] = useState(false)
  const [packName, setPackName] = useState('')
  const [packDesc, setPackDesc] = useState('')
  const [packCreating, setPackCreating] = useState(false)
  const [packLink, setPackLink] = useState<string | null>(null)

  // ── Clipboard ─────────────────────────────────────────────────────────────
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const canDelete = isAdminRole(profile.role) || profile.role === 'owner' || profile.role === 'production'
  const detailFile = files.find(f => f.id === detailId) ?? null

  // ── Load files ─────────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('media_files')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(500)

    setFiles((data || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      org_id: r.org_id as string | null,
      filename: r.file_name as string | null,
      public_url: r.file_url as string | null,
      storage_path: null,
      mime_type: r.mime_type as string | null,
      file_size: (r.file_size as number) || 0,
      uploaded_by: r.uploaded_by as string | null,
      source: r.source as string | null,
      category: r.category as string | null,
      ai_description: r.ai_description as string | null,
      tags: Array.isArray(r.tags) ? r.tags as string[] : [],
      ai_tags: Array.isArray(r.ai_tags) ? r.ai_tags as string[] : [],
      color_tags: Array.isArray(r.color_tags) ? r.color_tags as string[] : [],
      vehicle_type_tag: r.vehicle_type_tag as string | null,
      wrap_type_tag: r.wrap_type_tag as string | null,
      starred: (r.starred as boolean) ?? false,
      created_at: r.created_at as string,
    })))
    setLoading(false)
  }, [profile.org_id])

  useEffect(() => { loadFiles() }, [loadFiles])

  // ── Upload handler ─────────────────────────────────────────────────────────
  async function handleUpload(fileList: FileList | File[]) {
    const arr = Array.from(fileList)
    if (!arr.length) return
    setUploading(true)
    setUploadPct(0)

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      try {
        const ext = file.name.split('.').pop() || 'bin'
        const path = `media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

        const { data: inserted } = await supabase
          .from('media_files')
          .insert({
            org_id: profile.org_id,
            file_url: publicUrl,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            uploaded_by: profile.id,
            bucket: 'project-files',
            tags: [],
            ai_tags: [],
            color_tags: [],
          })
          .select('id')
          .single()

        // Fire-and-forget Claude Vision auto-tag
        if (inserted?.id && isImg(file.type)) {
          fetch('/api/ai/auto-tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaFileId: inserted.id, imageUrl: publicUrl }),
          }).catch(() => {})
        }
      } catch {
        toast('Upload failed: ' + file.name, 'error')
      }
      setUploadPct(Math.round(((i + 1) / arr.length) * 100))
    }

    await loadFiles()
    setUploading(false)
    setUploadPct(0)
    if (fileRef.current) fileRef.current.value = ''
    toast(`${arr.length} file${arr.length > 1 ? 's' : ''} uploaded`, 'success')
  }

  // ── Drag-drop ──────────────────────────────────────────────────────────────
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function onDragLeave(e: React.DragEvent) { e.preventDefault(); setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files)
  }

  // ── Filtered + sorted files ────────────────────────────────────────────────
  const filtered = files.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (f.filename ?? '').toLowerCase().includes(q) ||
      f.tags.some(t => t.toLowerCase().includes(q)) ||
      f.ai_tags.some(t => t.toLowerCase().includes(q)) ||
      (f.ai_description ?? '').toLowerCase().includes(q)
    const matchCat = catFilter === 'all' || f.category === catFilter
    return matchSearch && matchCat
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy === 'name') return (a.filename ?? '').localeCompare(b.filename ?? '')
    if (sortBy === 'size') return b.file_size - a.file_size
    return 0
  })

  // ── Selection ──────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Copy URL ───────────────────────────────────────────────────────────────
  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Bulk operations ────────────────────────────────────────────────────────
  async function bulkDelete() {
    if (!selected.size) return
    const ids = Array.from(selected)
    await supabase.from('media_files').delete().in('id', ids)
    setSelected(new Set())
    setMultiMode(false)
    await loadFiles()
    toast(`${ids.length} file${ids.length > 1 ? 's' : ''} deleted`, 'success')
  }

  async function bulkTag() {
    if (!bulkTagInput.trim() || !selected.size) return
    const tag = bulkTagInput.trim()
    for (const id of selected) {
      const f = files.find(x => x.id === id)
      if (f) {
        const tags = Array.from(new Set([...f.tags, tag]))
        await supabase.from('media_files').update({ tags }).eq('id', id)
      }
    }
    setBulkTagInput('')
    setShowBulkTag(false)
    await loadFiles()
  }

  // ── Detail panel operations ────────────────────────────────────────────────
  async function saveName() {
    if (!detailFile || !editNameVal.trim()) return
    await supabase.from('media_files').update({ file_name: editNameVal.trim() }).eq('id', detailFile.id)
    setEditingName(false)
    await loadFiles()
  }

  async function addTag() {
    if (!detailFile || !tagInput.trim()) return
    const tags = Array.from(new Set([...detailFile.tags, tagInput.trim()]))
    await supabase.from('media_files').update({ tags }).eq('id', detailFile.id)
    setTagInput('')
    await loadFiles()
  }

  async function removeTag(tag: string) {
    if (!detailFile) return
    const tags = detailFile.tags.filter(t => t !== tag)
    await supabase.from('media_files').update({ tags }).eq('id', detailFile.id)
    await loadFiles()
  }

  async function saveCat(cat: string) {
    if (!detailFile) return
    await supabase.from('media_files').update({ wrap_type_tag: cat }).eq('id', detailFile.id)
    await loadFiles()
  }

  async function deleteFile() {
    if (!detailFile) return
    await supabase.from('media_files').delete().eq('id', detailFile.id)
    setDetailId(null)
    await loadFiles()
    toast('File deleted', 'success')
  }

  // ── Create pack ────────────────────────────────────────────────────────────
  async function createPack() {
    if (!packName.trim() || !selected.size) return
    setPackCreating(true)
    const ids = Array.from(selected)
    const selectedFiles = files.filter(f => ids.includes(f.id))
    const res = await fetch('/api/media/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: packName.trim(),
        description: packDesc.trim() || null,
        media_file_ids: ids,
        photo_urls: selectedFiles.map(f => f.public_url).filter(Boolean),
        org_id: profile.org_id,
      }),
    })
    const data = await res.json() as { id?: string; error?: string }
    if (data.id) {
      setPackLink(`${window.location.origin}/share/${data.id}`)
    } else {
      toast('Failed to create pack', 'error')
    }
    setPackCreating(false)
  }

  // ── Card component (grid) ─────────────────────────────────────────────────
  function GridCard({ f }: { f: MediaFile }) {
    const isSel = multiMode && selected.has(f.id)
    const isActive = !multiMode && detailId === f.id
    const url = f.public_url ?? ''
    const allTags = [...f.tags, ...f.ai_tags].slice(0, 3)
    return (
      <div
        onClick={() => multiMode ? toggleSelect(f.id) : setDetailId(f.id === detailId ? null : f.id)}
        style={{
          background: 'var(--surface)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
          border: `1px solid ${isSel ? 'var(--green)' : isActive ? 'var(--accent)' : 'var(--border)'}`,
          transition: 'border-color 0.15s', position: 'relative',
        }}
      >
        {/* Checkbox */}
        {multiMode && (
          <div style={{
            position: 'absolute', top: 6, left: 6, zIndex: 2, width: 18, height: 18, borderRadius: 4,
            background: isSel ? 'var(--green)' : 'rgba(0,0,0,0.6)',
            border: `2px solid ${isSel ? 'var(--green)' : '#fff'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSel && <Check size={10} color="#fff" />}
          </div>
        )}

        {/* Category badge */}
        {f.category && f.category !== 'general' && (
          <div style={{
            position: 'absolute', top: 6, right: 6, zIndex: 2, padding: '2px 5px', borderRadius: 4,
            fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,0.75)', color: catColor(f.category),
          }}>
            {catLabel(f.category)}
          </div>
        )}

        {/* Thumbnail */}
        {isImg(f.mime_type) ? (
          <div style={{ height: 130, background: 'var(--surface2)', overflow: 'hidden' }}>
            <img src={url} alt={f.filename ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          </div>
        ) : (
          <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)' }}>
            {isVid(f.mime_type) ? <Film size={32} style={{ color: 'var(--text3)' }} /> : <FileText size={32} style={{ color: 'var(--text3)' }} />}
          </div>
        )}

        {/* Info */}
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.filename ?? 'Untitled'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: MF }}>{fmt(f.file_size)}</div>
          {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 5 }}>
              {allTags.map(t => (
                <span key={t} style={{ padding: '1px 5px', background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', borderRadius: 4, fontSize: 9 }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative' }}
    >
      {/* Drag overlay */}
      {dragging && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none',
          background: 'rgba(79,127,255,0.1)', border: '3px dashed var(--accent)', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)', fontFamily: HF }}>Drop files to upload</div>
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
        borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text1)', fontFamily: HF, textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>
          Media Library
        </h1>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 160, maxWidth: 300 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files, tags..."
            style={{ width: '100%', padding: '7px 10px 7px 28px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Sort */}
        <div style={{ position: 'relative' }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{ padding: '7px 28px 7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, outline: 'none', cursor: 'pointer', appearance: 'none' }}
          >
            {SORT_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 10px', border: 'none', cursor: 'pointer',
              background: view === v ? 'var(--accent)' : 'var(--surface)',
              color: view === v ? '#fff' : 'var(--text3)',
              display: 'flex', alignItems: 'center',
            }}>
              {v === 'grid' ? <Grid3X3 size={13} /> : <List size={13} />}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {/* Select mode */}
          <button
            onClick={() => { setMultiMode(!multiMode); setSelected(new Set()); setDetailId(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${multiMode ? 'var(--accent)' : 'var(--border)'}`,
              background: multiMode ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
              color: multiMode ? 'var(--accent)' : 'var(--text2)',
            }}
          >
            <Check size={12} /> Select
          </button>

          {/* Upload button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
              border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading
              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Upload size={13} />}
            {uploading ? `${uploadPct}%` : 'Upload'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,.pdf,.svg,.ai,.eps"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div style={{ height: 3, background: 'var(--surface2)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${uploadPct}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
        </div>
      )}

      {/* ── Filter chips ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border)',
        overflowX: 'auto', flexShrink: 0, alignItems: 'center',
      }}>
        {CAT_FILTERS.map(c => {
          const count = c.key === 'all' ? files.length : files.filter(f => f.category === c.key).length
          const active = catFilter === c.key
          return (
            <button
              key={c.key}
              onClick={() => setCatFilter(c.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                borderRadius: 20, whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${active ? c.color : 'var(--border)'}`,
                background: active ? `color-mix(in srgb, ${c.color} 15%, transparent)` : 'var(--surface)',
                color: active ? c.color : 'var(--text2)',
              }}
            >
              {c.label}
              <span style={{ fontSize: 10, fontFamily: MF, opacity: 0.7 }}>{count}</span>
            </button>
          )
        })}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', alignSelf: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {filtered.length}{filtered.length !== files.length ? ` of ${files.length}` : ''} files
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Grid / List area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text3)', gap: 10 }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
            </div>

          ) : filtered.length === 0 ? (
            /* Empty / drop zone */
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: 320, border: '2px dashed var(--border)', borderRadius: 16, cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={36} style={{ color: 'var(--text3)', opacity: 0.4, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', fontFamily: HF, marginBottom: 6 }}>
                {search || catFilter !== 'all' ? 'No files match your filter' : 'Drop files here or click to upload'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>JPG · PNG · GIF · WebP · MP4 · PDF · SVG · AI</div>
            </div>

          ) : view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {filtered.map(f => <GridCard key={f.id} f={f} />)}
            </div>

          ) : (
            /* List view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(f => {
                const isSel = multiMode && selected.has(f.id)
                const isActive = !multiMode && detailId === f.id
                const url = f.public_url ?? ''
                return (
                  <div
                    key={f.id}
                    onClick={() => multiMode ? toggleSelect(f.id) : setDetailId(f.id === detailId ? null : f.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: 'var(--surface)', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${isSel ? 'var(--green)' : isActive ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {multiMode && (
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        background: isSel ? 'var(--green)' : 'transparent',
                        border: `2px solid ${isSel ? 'var(--green)' : 'var(--text3)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSel && <Check size={10} color="#fff" />}
                      </div>
                    )}
                    {isImg(f.mime_type) ? (
                      <img src={url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, background: 'var(--surface2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isVid(f.mime_type) ? <Film size={18} style={{ color: 'var(--text3)' }} /> : <FileText size={18} style={{ color: 'var(--text3)' }} />}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.filename ?? 'Untitled'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {fmt(f.file_size)} · {new Date(f.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {f.category && f.category !== 'general' && (
                      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'var(--surface2)', color: catColor(f.category), flexShrink: 0 }}>
                        {catLabel(f.category)}
                      </span>
                    )}
                    {!multiMode && (
                      <button
                        onClick={e => { e.stopPropagation(); copyUrl(url, f.id) }}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: copiedId === f.id ? 'var(--green)' : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, flexShrink: 0 }}
                      >
                        {copiedId === f.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> URL</>}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Detail panel ───────────────────────────────────────────────── */}
        {detailFile && !multiMode && (
          <div style={{
            width: 300, flexShrink: 0, borderLeft: '1px solid var(--border)',
            overflowY: 'auto', padding: '16px 16px 80px',
            background: 'var(--surface)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>File Details</div>
              <button onClick={() => setDetailId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Preview */}
            {isImg(detailFile.mime_type) ? (
              <img
                src={detailFile.public_url ?? ''}
                alt={detailFile.filename ?? ''}
                style={{ width: '100%', borderRadius: 8, marginBottom: 14, background: 'var(--surface2)', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: 140, background: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {isVid(detailFile.mime_type)
                  ? <Film size={36} style={{ color: 'var(--text3)' }} />
                  : <FileText size={36} style={{ color: 'var(--text3)' }} />}
              </div>
            )}

            {/* Filename */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filename</div>
              {editingName ? (
                <div style={{ display: 'flex', gap: 5 }}>
                  <input
                    value={editNameVal}
                    onChange={e => setEditNameVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    autoFocus
                    style={{ flex: 1, padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none' }}
                  />
                  <button onClick={saveName} style={{ padding: '5px 8px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
                    <Check size={12} />
                  </button>
                  <button onClick={() => setEditingName(false)} style={{ padding: '5px 8px', background: 'var(--surface2)', border: 'none', borderRadius: 6, color: 'var(--text3)', cursor: 'pointer' }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', flex: 1, wordBreak: 'break-all' }}>{detailFile.filename}</div>
                  <button onClick={() => { setEditingName(true); setEditNameVal(detailFile.filename ?? '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', flexShrink: 0 }}>
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Category */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</div>
              <select
                value={detailFile.category ?? 'general'}
                onChange={e => saveCat(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: catColor(detailFile.category), fontSize: 12, outline: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                <option value="general">General</option>
                {CAT_FILTERS.filter(c => c.key !== 'all').map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Size', val: fmt(detailFile.file_size) },
                { label: 'Type', val: detailFile.mime_type ?? '--' },
                { label: 'Uploaded', val: new Date(detailFile.created_at).toLocaleDateString() },
                { label: 'Source', val: detailFile.source ?? 'internal' },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* AI Description */}
            {detailFile.ai_description && (
              <div style={{ marginBottom: 12, padding: '8px 10px', background: 'rgba(139,92,246,0.08)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ fontSize: 10, color: 'var(--purple)', marginBottom: 4, fontWeight: 700 }}>AI Description</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{detailFile.ai_description}</div>
              </div>
            )}

            {/* Tags */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tags</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                {detailFile.tags.map(t => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px', background: 'rgba(79,127,255,0.12)', color: 'var(--accent)', borderRadius: 5, fontSize: 11 }}>
                    {t}
                    <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, lineHeight: 1, display: 'flex' }}>
                      <X size={9} />
                    </button>
                  </span>
                ))}
                {detailFile.ai_tags.map(t => (
                  <span key={'ai-' + t} style={{ padding: '3px 7px', background: 'rgba(139,92,246,0.1)', color: 'var(--purple)', borderRadius: 5, fontSize: 11 }}>
                    {t} <span style={{ opacity: 0.5, fontSize: 9 }}>AI</span>
                  </span>
                ))}
                {detailFile.tags.length === 0 && detailFile.ai_tags.length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>No tags yet</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Add tag..."
                  style={{ flex: 1, padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 11, outline: 'none' }}
                />
                <button onClick={addTag} style={{ padding: '5px 8px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Colors */}
            {detailFile.color_tags.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Colors</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {detailFile.color_tags.map((c, i) => (
                    <div key={i} title={c} style={{ width: 24, height: 24, borderRadius: 4, background: c, border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => copyUrl(c, 'color-' + i)} />
                  ))}
                </div>
              </div>
            )}

            {/* Direct URL */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Direct URL</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ flex: 1, padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {detailFile.public_url ?? '--'}
                </div>
                <button
                  onClick={() => copyUrl(detailFile.public_url ?? '', detailFile.id)}
                  style={{ padding: '5px 8px', background: copiedId === detailFile.id ? 'rgba(34,192,122,0.12)' : 'var(--surface2)', border: `1px solid ${copiedId === detailFile.id ? 'var(--green)' : 'var(--border)'}`, borderRadius: 6, color: copiedId === detailFile.id ? 'var(--green)' : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, flexShrink: 0 }}
                >
                  {copiedId === detailFile.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <a
                href={detailFile.public_url ?? '#'}
                download={detailFile.filename ?? 'file'}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text2)', textDecoration: 'none' }}
              >
                <Download size={13} /> Download
              </a>
              {canDelete && (
                <button
                  onClick={deleteFile}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'rgba(242,90,90,0.08)', border: '1px solid var(--red)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--red)', cursor: 'pointer' }}
                >
                  <Trash2 size={13} /> Delete File
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bulk actions bar ─────────────────────────────────────────────── */}
      {multiMode && selected.size > 0 && (
        <div style={{
          position: 'sticky', bottom: 0,
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          zIndex: 20, flexWrap: 'wrap', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{selected.size} selected</span>

          {/* Bulk tag */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowBulkTag(!showBulkTag)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Tag size={12} /> Tag All
            </button>
            {showBulkTag && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 30, display: 'flex', gap: 6, width: 220 }}>
                <input
                  value={bulkTagInput}
                  onChange={e => setBulkTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && bulkTag()}
                  placeholder="Tag name..."
                  autoFocus
                  style={{ flex: 1, padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none' }}
                />
                <button onClick={bulkTag} style={{ padding: '5px 10px', background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
              </div>
            )}
          </div>

          {/* Create pack */}
          <button
            onClick={() => { setShowPack(true); setPackLink(null); setPackName(''); setPackDesc('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--accent)', background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Package size={12} /> Create Pack ({selected.size})
          </button>

          {/* Bulk delete */}
          {canDelete && (
            <button
              onClick={bulkDelete}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--red)', background: 'rgba(242,90,90,0.08)', color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Trash2 size={12} /> Delete ({selected.size})
            </button>
          )}

          <button
            onClick={() => { setMultiMode(false); setSelected(new Set()) }}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}
          >
            <X size={12} /> Cancel
          </button>
        </div>
      )}

      {/* ── Create Pack modal ────────────────────────────────────────────── */}
      {showPack && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => !packCreating && setShowPack(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 440, padding: 28 }}>
            {packLink ? (
              /* Success state */
              <>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)', fontFamily: HF, marginBottom: 8 }}>Pack Created!</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>Share this link with your client:</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <input readOnly value={packLink} style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none' }} />
                  <button
                    onClick={() => copyUrl(packLink, 'pack')}
                    style={{ padding: '8px 14px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {copiedId === 'pack' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button onClick={() => setShowPack(false)} style={{ width: '100%', padding: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Done
                </button>
              </>
            ) : (
              /* Create form */
              <>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text1)', fontFamily: HF, marginBottom: 6 }}>Create Photo Pack</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 18 }}>{selected.size} files selected · shareable link sent to client</div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Pack Name *</label>
                  <input
                    value={packName}
                    onChange={e => setPackName(e.target.value)}
                    placeholder="e.g. Ford F-150 Fleet Wrap — Before/After"
                    autoFocus
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Description (optional)</label>
                  <textarea
                    value={packDesc}
                    onChange={e => setPackDesc(e.target.value)}
                    rows={3}
                    placeholder="Add a note for your client..."
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowPack(false)}
                    style={{ flex: 1, padding: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createPack}
                    disabled={!packName.trim() || packCreating}
                    style={{ flex: 2, padding: 10, background: !packName.trim() || packCreating ? 'var(--surface2)' : 'var(--accent)', border: 'none', borderRadius: 8, color: !packName.trim() || packCreating ? 'var(--text3)' : '#fff', fontSize: 13, fontWeight: 700, cursor: !packName.trim() || packCreating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {packCreating
                      ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</>
                      : <><Package size={13} /> Create Pack</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
