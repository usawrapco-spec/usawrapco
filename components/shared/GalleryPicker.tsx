'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  X, Search, Upload, Image, FileText, Film, Grid, ChevronRight,
  Loader2, Check, ExternalLink, Tag,
} from 'lucide-react'

export interface GalleryFile {
  id: string
  name: string
  url: string
  file_type: string | null
  size: number | null
  tags: string[] | null
  created_at: string
  project_id: string | null
  org_id: string
  project?: {
    id: string
    title: string
    customer?: { id: string; name: string; company_name: string | null } | null
  } | null
}

interface GalleryPickerProps {
  onSelect: (file: GalleryFile) => void
  onClose: () => void
  mode?: 'attach' | 'proof' | 'message'
  currentProjectId: string
  orgId: string
}

type FilterType = 'all' | 'photos' | 'pdfs' | 'videos' | 'proofs' | 'mockups'
type GalleryTab = 'job' | 'all' | 'customers' | 'upload'

const FILTER_TABS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Grid size={12} /> },
  { key: 'photos', label: 'Photos', icon: <Image size={12} /> },
  { key: 'pdfs', label: 'PDFs', icon: <FileText size={12} /> },
  { key: 'videos', label: 'Videos', icon: <Film size={12} /> },
  { key: 'proofs', label: 'Proofs', icon: <Tag size={12} /> },
  { key: 'mockups', label: 'Mockups', icon: <Image size={12} /> },
]

function isImage(file: GalleryFile) {
  return file.file_type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name || '')
}

export default function GalleryPicker({
  onSelect, onClose, mode = 'attach', currentProjectId, orgId,
}: GalleryPickerProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<GalleryTab>('job')
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<GalleryFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        orgId,
        mode: activeTab === 'upload' ? 'all' : activeTab,
        filter,
        ...(search ? { search } : {}),
        ...(activeTab === 'job' ? { projectId: currentProjectId } : {}),
      })
      const res = await fetch(`/api/gallery?${params}`)
      if (res.ok) {
        const { files: data } = await res.json()
        setFiles(data || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [activeTab, filter, search, orgId, currentProjectId])

  useEffect(() => {
    if (activeTab !== 'upload') {
      fetchFiles()
    }
  }, [activeTab, filter, fetchFiles])

  // Debounced search
  useEffect(() => {
    if (activeTab === 'upload') return
    const timer = setTimeout(fetchFiles, 300)
    return () => clearTimeout(timer)
  }, [search, fetchFiles, activeTab])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `gallery/${orgId}/${currentProjectId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`

      const { error: storageErr } = await supabase.storage
        .from('project-files')
        .upload(path, file, { upsert: false })

      if (storageErr) throw storageErr

      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)

      const { data: fileRecord, error: dbErr } = await supabase
        .from('files')
        .insert({
          org_id: orgId,
          project_id: currentProjectId,
          name: file.name,
          url: urlData.publicUrl,
          file_type: file.type || null,
          size: file.size,
          tags: [],
        })
        .select()
        .single()

      if (dbErr) throw dbErr

      setFiles(prev => [fileRecord as GalleryFile, ...prev])
      setSelected(fileRecord as GalleryFile)
      setActiveTab('job')
    } catch (err) {
      console.error('Upload error:', err)
    }
    setUploading(false)
  }, [supabase, orgId, currentProjectId])

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  // Group files by customer for 'customers' tab
  const customerGroups = activeTab === 'customers'
    ? files.reduce((acc, f) => {
        const customerName = f.project?.customer?.name || 'Unknown Customer'
        if (!acc[customerName]) acc[customerName] = []
        acc[customerName].push(f)
        return acc
      }, {} as Record<string, GalleryFile[]>)
    : {}

  const connectToJob = async (file: GalleryFile) => {
    if (file.project_id !== currentProjectId) {
      await supabase.from('files').insert({
        org_id: orgId,
        project_id: currentProjectId,
        name: file.name,
        url: file.url,
        file_type: file.file_type,
        size: file.size,
        tags: file.tags || [],
      })
    }
    onSelect(file)
  }

  const actionLabel = mode === 'proof' ? 'Use as Proof'
    : mode === 'message' ? 'Use in Message'
    : 'Attach File'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Grid size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Gallery Picker
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
            {mode === 'proof' ? '— Select file for proof' : mode === 'message' ? '— Select to insert in message' : '— Select file to attach'}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--text3)', padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 20px', overflowX: 'auto',
        }}>
          {([
            { key: 'job', label: 'This Job' },
            { key: 'all', label: 'All Jobs' },
            { key: 'customers', label: 'Customers' },
            { key: 'upload', label: 'Upload New' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSelected(null) }}
              style={{
                padding: '10px 16px', background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                color: activeTab === t.key ? 'var(--accent)' : 'var(--text2)',
                borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
          {activeTab === 'upload' ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 16, padding: '60px 80px', textAlign: 'center',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                  background: dragOver ? 'rgba(79,127,255,0.05)' : 'transparent',
                }}
              >
                {uploading ? (
                  <Loader2 size={40} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                ) : (
                  <Upload size={40} style={{ color: 'var(--text3)', display: 'block', margin: '0 auto 12px' }} />
                )}
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>
                  {uploading ? 'Uploading…' : 'Drop file here or click to upload'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                  Images, PDFs, videos — any file type
                </div>
              </div>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFilePick} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Search + filter */}
              <div style={{
                padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center',
                flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface)', borderRadius: 8, padding: '7px 12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <Search size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by filename, tag, customer…"
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      color: 'var(--text1)', fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FILTER_TABS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 6,
                        border: `1px solid ${filter === f.key ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                        background: filter === f.key ? 'rgba(79,127,255,0.15)' : 'transparent',
                        color: filter === f.key ? 'var(--accent)' : 'var(--text3)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}
                    >
                      {f.icon} {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main content area */}
              <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', gap: 20, minHeight: 0 }}>
                {/* File grid */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                      <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
                      <Grid size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontSize: 14, fontWeight: 600 }}>No files found</div>
                      <div style={{ fontSize: 12, marginTop: 6 }}>
                        {activeTab === 'job' ? 'No files attached to this job yet' : 'Try a different search or filter'}
                      </div>
                    </div>
                  ) : activeTab === 'customers' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {Object.entries(customerGroups).map(([customerName, customerFiles]) => (
                        <div key={customerName}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                            {customerName} ({customerFiles.length})
                          </div>
                          <FileGrid
                            files={customerFiles}
                            selected={selected}
                            onSelect={setSelected}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <FileGrid files={files} selected={selected} onSelect={setSelected} />
                  )}
                </div>

                {/* Selected file detail panel */}
                {selected && (
                  <div style={{
                    width: 260, flexShrink: 0, background: 'var(--surface)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                    padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
                    alignSelf: 'flex-start',
                  }}>
                    {isImage(selected) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selected.url}
                        alt={selected.name}
                        style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 180 }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: 120, borderRadius: 8,
                        background: 'var(--surface2)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FileText size={40} style={{ color: 'var(--text3)' }} />
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', wordBreak: 'break-word' }}>
                        {selected.name}
                      </div>
                      {selected.size && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {(selected.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>

                    {selected.project && (
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Job</span>
                        {selected.project.title}
                      </div>
                    )}

                    {selected.project?.customer && (
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Customer</span>
                        {selected.project.customer.name}
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {selected.tags && selected.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {selected.tags.map(tag => (
                          <span key={tag} style={{
                            padding: '2px 8px', borderRadius: 10,
                            background: 'rgba(79,127,255,0.12)', color: 'var(--accent)',
                            fontSize: 10, fontWeight: 700,
                          }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      {selected.project_id !== currentProjectId && (
                        <button
                          onClick={() => connectToJob(selected)}
                          style={{
                            padding: '8px 12px', borderRadius: 8,
                            border: '1px solid var(--accent)', background: 'rgba(79,127,255,0.12)',
                            color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <ExternalLink size={12} /> Connect to This Job
                        </button>
                      )}
                      <button
                        onClick={() => onSelect(selected)}
                        style={{
                          padding: '9px 12px', borderRadius: 8,
                          border: 'none', background: 'var(--accent)',
                          color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                        }}
                      >
                        <Check size={13} /> {actionLabel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── File Grid ─────────────────────────────────────────────────────────────────
function FileGrid({
  files, selected, onSelect,
}: {
  files: GalleryFile[]
  selected: GalleryFile | null
  onSelect: (f: GalleryFile) => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: 10,
    }}>
      {files.map(file => {
        const isSelected = selected?.id === file.id
        const isImg = isImage(file)
        return (
          <div
            key={file.id}
            onClick={() => onSelect(file)}
            style={{
              borderRadius: 10,
              border: `2px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
              background: isSelected ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
              cursor: 'pointer', overflow: 'hidden',
              transition: 'border-color 0.12s, background 0.12s',
            }}
          >
            {/* Thumbnail */}
            <div style={{
              height: 100, background: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
            }}>
              {isImg ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={file.url}
                  alt={file.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <FileText size={28} style={{ color: 'var(--text3)' }} />
              )}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={11} style={{ color: '#fff' }} />
                </div>
              )}
            </div>
            {/* Caption */}
            <div style={{ padding: '6px 8px' }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {file.name}
              </div>
              {file.project?.title && (
                <div style={{
                  fontSize: 10, color: 'var(--text3)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2,
                }}>
                  {file.project.title}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
