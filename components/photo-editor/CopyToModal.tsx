'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Briefcase, Users, ImageIcon, Check, Loader2, Folder } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'
import { usePhotoEditor } from './PhotoEditorProvider'

type Tab = 'job' | 'customer' | 'media'

interface ProjectRow {
  id: string
  name: string
  customer_name?: string
  stage?: string
}

interface CustomerRow {
  id: string
  name: string
  email?: string
  projects?: ProjectRow[]
}

const CATEGORIES = [
  'before', 'design', 'proof', 'after', 'inspiration', 'archive', 'general',
]

const MEDIA_FOLDERS = [
  { key: 'vehicle-photos', label: 'Vehicle Photos' },
  { key: 'designs', label: 'Designs' },
  { key: 'proofs', label: 'Proofs' },
  { key: 'logos', label: 'Logos' },
  { key: 'customer', label: 'Customer Uploads' },
  { key: 'internal', label: 'Internal' },
]

export default function CopyToModal() {
  const { currentImage, closeCopyTo } = usePhotoEditor()
  const { toast } = useToast()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('job')
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('general')
  const [selectedFolder, setSelectedFolder] = useState('internal')
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)

  // Fetch projects
  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name, customer_name, stage')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setProjects(data as ProjectRow[])
      })
  }, [])

  // Fetch customers
  useEffect(() => {
    if (tab !== 'customer') return
    supabase
      .from('customers')
      .select('id, name, email')
      .order('name', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (data) setCustomers(data as CustomerRow[])
      })
  }, [tab])

  // Fetch projects for expanded customer
  useEffect(() => {
    if (!expandedCustomer) return
    supabase
      .from('projects')
      .select('id, name, stage')
      .eq('customer_id', expandedCustomer)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setCustomers((prev) =>
            prev.map((c) =>
              c.id === expandedCustomer ? { ...c, projects: data as ProjectRow[] } : c
            )
          )
        }
      })
  }, [expandedCustomer])

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase()
    return !q || p.name?.toLowerCase().includes(q) || p.customer_name?.toLowerCase().includes(q)
  })

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  })

  const handleCopyToJob = useCallback(async (projectId: string) => {
    if (!currentImage || copying) return
    setCopying(true)

    try {
      await supabase.from('job_images').insert({
        org_id: currentImage.orgId,
        project_id: projectId,
        image_url: currentImage.url,
        file_name: currentImage.fileName,
        category: selectedCategory,
      })
      setCopied(true)
      toast('Image copied to job', 'success')
      setTimeout(() => {
        setCopied(false)
        closeCopyTo()
      }, 1200)
    } catch (err) {
      console.error('Copy error:', err)
      toast('Failed to copy image', 'error')
    } finally {
      setCopying(false)
    }
  }, [currentImage, copying, selectedCategory, supabase, toast, closeCopyTo])

  const handleCopyToMedia = useCallback(async () => {
    if (!currentImage || copying) return
    setCopying(true)

    try {
      await supabase.from('media_files').insert({
        storage_path: currentImage.storagePath || '',
        public_url: currentImage.url,
        filename: currentImage.fileName,
        mime_type: 'image/*',
        file_size: 0,
        source: currentImage.sourceType === 'job_image' ? 'job' : 'editor',
        folder: selectedFolder,
        tags: [],
      })
      setCopied(true)
      toast('Image copied to Media Library', 'success')
      setTimeout(() => {
        setCopied(false)
        closeCopyTo()
      }, 1200)
    } catch (err) {
      console.error('Copy error:', err)
      toast('Failed to copy image', 'error')
    } finally {
      setCopying(false)
    }
  }, [currentImage, copying, selectedFolder, supabase, toast, closeCopyTo])

  if (!currentImage) return null

  const tabs: { key: Tab; label: string; Icon: typeof Briefcase }[] = [
    { key: 'job', label: 'Job', Icon: Briefcase },
    { key: 'customer', label: 'Customer', Icon: Users },
    { key: 'media', label: 'Media Library', Icon: ImageIcon },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={closeCopyTo}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#13151c',
          border: '1px solid #2a3f6a',
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #1e2d4a',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Copy To
            </div>
            <div style={{ fontSize: 12, color: '#5a6080', marginTop: 2 }}>
              {currentImage.fileName}
            </div>
          </div>
          <button
            onClick={closeCopyTo}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #1e2d4a',
              background: 'transparent', color: '#9299b5', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e2d4a' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(''); setSelectedProject(null) }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 0',
                border: 'none',
                borderBottom: tab === t.key ? '2px solid #4f7fff' : '2px solid transparent',
                background: 'transparent',
                color: tab === t.key ? '#4f7fff' : '#5a6080',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== 'media' && (
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a6080', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'job' ? 'Search jobs...' : 'Search customers...'}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 32px',
                  background: '#0d0f14',
                  border: '1px solid #1e2d4a',
                  borderRadius: 8,
                  color: '#e8eaed',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
          {/* ── Job tab ── */}
          {tab === 'job' && (
            <>
              {/* Category picker */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#5a6080', fontWeight: 600, lineHeight: '28px' }}>Category:</span>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: `1px solid ${selectedCategory === c ? '#4f7fff' : '#1e2d4a'}`,
                      background: selectedCategory === c ? 'rgba(79,127,255,0.12)' : 'transparent',
                      color: selectedCategory === c ? '#4f7fff' : '#9299b5',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {/* Project list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleCopyToJob(p.id)}
                    disabled={copying}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #1e2d4a',
                      background: copied && selectedProject === p.id ? 'rgba(34,192,122,0.08)' : '#0d0f14',
                      color: '#e8eaed',
                      cursor: copying ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <Briefcase size={14} style={{ color: '#5a6080', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      {p.customer_name && (
                        <div style={{ fontSize: 11, color: '#5a6080' }}>{p.customer_name}</div>
                      )}
                    </div>
                    {p.stage && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1a1d27', color: '#9299b5' }}>
                        {p.stage}
                      </span>
                    )}
                  </button>
                ))}
                {filteredProjects.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>
                    No jobs found
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Customer tab ── */}
          {tab === 'customer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Category picker */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: '#5a6080', fontWeight: 600, lineHeight: '28px' }}>Category:</span>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: `1px solid ${selectedCategory === c ? '#4f7fff' : '#1e2d4a'}`,
                      background: selectedCategory === c ? 'rgba(79,127,255,0.12)' : 'transparent',
                      color: selectedCategory === c ? '#4f7fff' : '#9299b5',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {filteredCustomers.map((c) => (
                <div key={c.id}>
                  <button
                    onClick={() => setExpandedCustomer(expandedCustomer === c.id ? null : c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #1e2d4a',
                      background: expandedCustomer === c.id ? 'rgba(79,127,255,0.06)' : '#0d0f14',
                      color: '#e8eaed',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <Users size={14} style={{ color: '#5a6080', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      {c.email && <div style={{ fontSize: 11, color: '#5a6080' }}>{c.email}</div>}
                    </div>
                  </button>
                  {/* Expanded: show customer's projects */}
                  {expandedCustomer === c.id && (
                    <div style={{ paddingLeft: 24, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(c.projects || []).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleCopyToJob(p.id)}
                          disabled={copying}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #1e2d4a',
                            background: '#0d0f14',
                            color: '#e8eaed',
                            cursor: copying ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            fontSize: 12,
                          }}
                        >
                          <Briefcase size={12} style={{ color: '#5a6080' }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          {p.stage && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#1a1d27', color: '#9299b5' }}>
                              {p.stage}
                            </span>
                          )}
                        </button>
                      ))}
                      {c.projects?.length === 0 && (
                        <div style={{ fontSize: 11, color: '#5a6080', padding: 8 }}>No projects</div>
                      )}
                      {!c.projects && (
                        <div style={{ fontSize: 11, color: '#5a6080', padding: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Loader2 size={12} className="animate-spin" /> Loading...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filteredCustomers.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>
                  No customers found
                </div>
              )}
            </div>
          )}

          {/* ── Media Library tab ── */}
          {tab === 'media' && (
            <div>
              <div style={{ fontSize: 12, color: '#5a6080', marginBottom: 12 }}>
                Select a folder to copy the image to:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MEDIA_FOLDERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSelectedFolder(f.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: `1px solid ${selectedFolder === f.key ? '#4f7fff' : '#1e2d4a'}`,
                      background: selectedFolder === f.key ? 'rgba(79,127,255,0.08)' : '#0d0f14',
                      color: selectedFolder === f.key ? '#4f7fff' : '#e8eaed',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Folder size={16} style={{ color: selectedFolder === f.key ? '#4f7fff' : '#5a6080' }} />
                    {f.label}
                    {selectedFolder === f.key && <Check size={14} style={{ marginLeft: 'auto', color: '#4f7fff' }} />}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCopyToMedia}
                disabled={copying}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '12px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: copied ? '#22c07a' : '#4f7fff',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: copying ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {copying ? (
                  <><Loader2 size={16} className="animate-spin" /> Copying...</>
                ) : copied ? (
                  <><Check size={16} /> Copied!</>
                ) : (
                  <><ImageIcon size={16} /> Copy to Media Library</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
