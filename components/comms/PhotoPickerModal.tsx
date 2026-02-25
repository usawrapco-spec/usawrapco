'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Check, ImageIcon } from 'lucide-react'
import type { PhotoSelection } from './types'

interface JobImage {
  id: string
  project_id: string
  image_url: string
  category: string | null
  file_name: string | null
}

interface Props {
  projectId?: string | null
  orgId: string
  onInsert: (photos: PhotoSelection[]) => void
  onClose: () => void
}

const CATEGORIES = ['all', 'before', 'after', 'general', 'design', 'production']

export function PhotoPickerModal({ projectId, orgId, onInsert, onClose }: Props) {
  const supabase = createClient()
  const [images, setImages] = useState<JobImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState(projectId || '')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

  const fetchImages = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('job_images')
      .select('id, project_id, image_url, category, file_name')
      .order('created_at', { ascending: false })
      .limit(200)

    if (projectFilter) {
      query = query.eq('project_id', projectFilter)
    }
    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    const { data } = await query
    setImages(data || [])
    setLoading(false)
  }, [supabase, projectFilter, categoryFilter])

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50)
    setProjects(data || [])
  }, [supabase, orgId])

  useEffect(() => {
    fetchImages()
    fetchProjects()
  }, [fetchImages, fetchProjects])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleInsert = () => {
    const selected = images
      .filter((img) => selectedIds.has(img.id))
      .map((img) => ({
        job_image_id: img.id,
        image_url: img.image_url,
        caption: captions[img.id] || '',
        file_name: img.file_name || undefined,
      }))
    onInsert(selected)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '80vw',
          maxWidth: 1100,
          height: '80vh',
          background: 'var(--surface)',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ImageIcon size={18} style={{ color: 'var(--accent)' }} />
            <span
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--text1)',
              }}
            >
              Photo Picker
            </span>
            {selectedIds.size > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  background: 'rgba(79,127,255,0.1)',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {selectedIds.size} selected
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text3)',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left filters */}
          <div
            style={{
              width: 200,
              borderRight: '1px solid var(--border)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              flexShrink: 0,
              overflowY: 'auto',
            }}
          >
            {/* Project filter */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Project
              </div>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text1)',
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category filter */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Category
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 5,
                      fontSize: 12,
                      fontWeight: categoryFilter === cat ? 700 : 400,
                      color: categoryFilter === cat ? 'var(--accent)' : 'var(--text2)',
                      background:
                        categoryFilter === cat
                          ? 'rgba(79,127,255,0.08)'
                          : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      textTransform: 'capitalize',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Photo grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {loading ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 8,
                      background: 'var(--surface2)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text3)',
                  gap: 8,
                }}
              >
                <ImageIcon size={32} />
                <span style={{ fontSize: 13 }}>No photos found</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                }}
              >
                {images.map((img) => {
                  const isSelected = selectedIds.has(img.id)
                  return (
                    <div
                      key={img.id}
                      onClick={() => toggleSelect(img.id)}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: isSelected
                          ? '2px solid var(--accent)'
                          : '2px solid transparent',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <img
                        src={img.image_url}
                        alt={img.file_name || 'Photo'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(79,127,255,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={16} style={{ color: '#fff' }} />
                          </div>
                        </div>
                      )}
                      {/* Caption input when selected */}
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: 4,
                            background: 'rgba(0,0,0,0.7)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            placeholder="Caption..."
                            value={captions[img.id] || ''}
                            onChange={(e) =>
                              setCaptions((prev) => ({
                                ...prev,
                                [img.id]: e.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              outline: 'none',
                              color: '#fff',
                              fontSize: 10,
                              padding: '2px 4px',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text2)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={selectedIds.size === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background:
                selectedIds.size > 0 ? 'var(--accent)' : 'var(--surface2)',
              border: 'none',
              color: selectedIds.size > 0 ? '#fff' : 'var(--text3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            Insert {selectedIds.size > 0 ? `${selectedIds.size} Photo${selectedIds.size > 1 ? 's' : ''}` : 'Photos'}
          </button>
        </div>
      </div>
    </div>
  )
}
