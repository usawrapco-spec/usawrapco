'use client'

import { useState, useRef, useEffect } from 'react'
import { Save, ChevronDown, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'
import type { ImageSource } from './types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const BUCKET = 'project-files'

interface EditorSaveMenuProps {
  image: ImageSource
  getCanvasBlob: () => Promise<Blob | null>
  onSaved: () => void
}

type SaveMode = 'overwrite' | 'copy' | 'media'

export default function EditorSaveMenu({ image, getCanvasBlob, onSaved }: EditorSaveMenuProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMode, setSavedMode] = useState<SaveMode | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function uploadBlob(blob: Blob, path: string): Promise<string | null> {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true })
    if (error) {
      console.error('Upload error:', error)
      return null
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave(mode: SaveMode) {
    setSaving(true)
    setSavedMode(null)

    try {
      const blob = await getCanvasBlob()
      if (!blob) {
        toast('Failed to export canvas', 'error')
        setSaving(false)
        return
      }

      if (mode === 'overwrite') {
        // Overwrite original storage path
        if (image.storagePath) {
          const url = await uploadBlob(blob, image.storagePath)
          if (url && image.sourceType === 'job_image') {
            await supabase.from('job_images').update({ image_url: url }).eq('id', image.sourceId)
          } else if (url && image.sourceType === 'media_file') {
            await supabase.from('media_files').update({ public_url: url }).eq('id', image.sourceId)
          }
          toast('Image saved', 'success')
        } else {
          toast('No storage path — use Save as Copy', 'warning')
          setSaving(false)
          return
        }
      } else if (mode === 'copy') {
        // Save as new file next to original
        const ext = image.fileName.split('.').pop() || 'png'
        const basePath = image.storagePath
          ? image.storagePath.replace(/\/[^/]+$/, '')
          : `${image.orgId || 'media'}/${image.projectId || 'general'}`
        const newPath = `${basePath}/${Date.now()}_edited.${ext}`
        const url = await uploadBlob(blob, newPath)

        if (url && image.sourceType === 'job_image' && image.projectId) {
          await supabase.from('job_images').insert({
            org_id: image.orgId,
            project_id: image.projectId,
            image_url: url,
            file_name: `${image.fileName.replace(/\.[^.]+$/, '')}_edited.${ext}`,
            category: image.category || 'general',
          })
        } else if (url && image.sourceType === 'media_file') {
          await supabase.from('media_files').insert({
            storage_path: newPath,
            public_url: url,
            filename: `${image.fileName.replace(/\.[^.]+$/, '')}_edited.${ext}`,
            mime_type: blob.type,
            file_size: blob.size,
            source: 'editor',
            folder: image.category || 'internal',
            tags: [],
          })
        }
        toast('Saved as copy', 'success')
      } else if (mode === 'media') {
        // Save to media library
        const ext = image.fileName.split('.').pop() || 'png'
        const newPath = `media/${Date.now()}_edited.${ext}`
        const url = await uploadBlob(blob, newPath)

        if (url) {
          await supabase.from('media_files').insert({
            storage_path: newPath,
            public_url: url,
            filename: `${image.fileName.replace(/\.[^.]+$/, '')}_edited.${ext}`,
            mime_type: blob.type,
            file_size: blob.size,
            source: 'editor',
            folder: 'internal',
            tags: [],
          })
          toast('Saved to Media Library', 'success')
        }
      }

      setSavedMode(mode)
      setTimeout(() => setSavedMode(null), 2000)
      onSaved()
    } catch (err) {
      console.error('Save error:', err)
      toast('Save failed', 'error')
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  const options: { mode: SaveMode; label: string; desc: string }[] = [
    { mode: 'overwrite', label: 'Save (Overwrite)', desc: 'Replace the original file' },
    { mode: 'copy', label: 'Save as Copy', desc: 'New file in same location' },
    { mode: 'media', label: 'Save to Media Library', desc: 'Add to media library' },
  ]

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 8,
          border: 'none',
          background: '#22c07a',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
        disabled={saving}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: '#13151c',
            border: '1px solid #2a3f6a',
            borderRadius: 10,
            padding: 4,
            minWidth: 220,
            zIndex: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => handleSave(opt.mode)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: savedMode === opt.mode ? 'rgba(34,192,122,0.1)' : 'transparent',
                color: '#e8eaed',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {savedMode === opt.mode ? (
                <Check size={14} style={{ color: '#22c07a' }} />
              ) : (
                <Save size={14} style={{ color: '#5a6080' }} />
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#5a6080' }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
