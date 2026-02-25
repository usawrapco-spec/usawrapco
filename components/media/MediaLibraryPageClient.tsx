'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import { useToast } from '@/components/shared/Toast'
import {
  Search, Upload, FolderPlus, Wand2, Sparkles, Link, UserPlus,
  FolderInput, Tag, Trash2, Download, LayoutGrid, List, Star,
  Folder, Image as ImageIcon, FileText, ChevronRight, ChevronDown,
  ChevronLeft, X, Copy, ExternalLink, Calendar, HardDrive, User,
  Check, Loader2, ArrowLeft, ArrowRight, Plus, Eye,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MediaImage {
  id: string
  org_id: string
  project_id: string | null
  user_id: string | null
  uploaded_by: string | null
  category: string
  image_url: string
  public_url: string | null
  storage_path: string | null
  file_name: string
  file_size: number
  mime_type: string | null
  vehicle_type: string | null
  wrap_scope: string | null
  tags: string[]
  ai_tags: string[]
  metadata: Record<string, any> | null
  created_at: string
  // joined
  project_title?: string
  uploader_name?: string
}

interface FolderItem {
  key: string
  label: string
  icon: typeof Folder
  category?: string
  count?: number
}

interface ProjectFolder {
  id: string
  title: string
  count: number
}

interface Props {
  profile: Profile
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const BUCKET = 'project-files'
const PAGE_SIZE = 60
const HEADING_FONT = 'Barlow Condensed, sans-serif'
const MONO_FONT = 'JetBrains Mono, monospace'

const CATEGORIES = [
  'vehicle', 'logo', 'design', 'before', 'after',
  'install', 'marine', 'trailer', 'signage', 'proof',
  'customer', 'internal', 'general',
] as const

const STATIC_FOLDERS: FolderItem[] = [
  { key: 'all', label: 'All Files', icon: Folder },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'vehicle', label: 'Vehicle Photos', icon: ImageIcon, category: 'vehicle' },
  { key: 'design', label: 'Designs', icon: ImageIcon, category: 'design' },
  { key: 'proof', label: 'Proofs', icon: FileText, category: 'proof' },
  { key: 'logo', label: 'Logos', icon: ImageIcon, category: 'logo' },
  { key: 'customer', label: 'Customer Uploads', icon: Upload, category: 'customer' },
  { key: 'internal', label: 'Internal', icon: Folder, category: 'internal' },
  { key: 'before', label: 'Before Photos', icon: ImageIcon, category: 'before' },
  { key: 'after', label: 'After Photos', icon: ImageIcon, category: 'after' },
  { key: 'install', label: 'Install Photos', icon: ImageIcon, category: 'install' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function getImageUrl(img: MediaImage): string {
  return img.public_url || img.image_url || ''
}

function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function MediaLibraryPageClient({ profile }: Props) {
  const { toast } = useToast()
  const supabase = createClient()

  // ─── State ──────────────────────────────────────────────────────────────────

  // Data
  const [images, setImages] = useState<MediaImage[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  // Project folders
  const [projectFolders, setProjectFolders] = useState<ProjectFolder[]>([])
  const [projectsExpanded, setProjectsExpanded] = useState(false)

  // View
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeFolder, setActiveFolder] = useState('all')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false)
  const [searching, setSearching] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())

  // Detail modal
  const [detailImage, setDetailImage] = useState<MediaImage | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [editingCategory, setEditingCategory] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')

  // Upload
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  // AI tagging
  const [aiTagging, setAiTagging] = useState(false)

  // Modals
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [moveCategory, setMoveCategory] = useState('general')

  // Clipboard
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // ─── Data Fetching ────────────────────────────────────────────────────────

  const fetchImages = useCallback(async (pageNum = 0, append = false) => {
    setLoading(true)
    try {
      const from = pageNum * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('job_images')
        .select('*', { count: 'exact' })
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .range(from, to)

      // Category filter
      if (activeFolder !== 'all' && activeFolder !== 'starred' && activeFolder !== 'by-project') {
        const folder = STATIC_FOLDERS.find(f => f.key === activeFolder)
        if (folder?.category) {
          query = query.eq('category', folder.category)
        }
      }

      // Project filter
      if (activeProjectId) {
        query = query.eq('project_id', activeProjectId)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('[media-library] fetch error:', error)
        toast('Failed to load images', 'error')
        setLoading(false)
        return
      }

      const mapped: MediaImage[] = (data || []).map(row => ({
        id: row.id,
        org_id: row.org_id,
        project_id: row.project_id,
        user_id: row.user_id,
        uploaded_by: row.uploaded_by,
        category: row.category || 'general',
        image_url: row.image_url || '',
        public_url: row.public_url || null,
        storage_path: row.storage_path || null,
        file_name: row.file_name || 'Untitled',
        file_size: row.file_size || 0,
        mime_type: row.mime_type || null,
        vehicle_type: row.vehicle_type || null,
        wrap_scope: row.wrap_scope || null,
        tags: Array.isArray(row.tags) ? row.tags : [],
        ai_tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
        metadata: row.metadata || null,
        created_at: row.created_at,
      }))

      if (append) {
        setImages(prev => [...prev, ...mapped])
      } else {
        setImages(mapped)
      }

      setTotalCount(count || 0)
      setHasMore((count || 0) > from + PAGE_SIZE)
    } catch (err) {
      console.error('[media-library] error:', err)
      toast('Failed to load images', 'error')
    }
    setLoading(false)
  }, [profile.org_id, activeFolder, activeProjectId])

  const fetchProjectFolders = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, title')
      .eq('org_id', profile.org_id)
      .order('title')
      .limit(100)

    if (data) {
      // Get counts per project
      const { data: counts } = await supabase
        .from('job_images')
        .select('project_id')
        .eq('org_id', profile.org_id)
        .not('project_id', 'is', null)

      const countMap: Record<string, number> = {}
      ;(counts || []).forEach(row => {
        if (row.project_id) {
          countMap[row.project_id] = (countMap[row.project_id] || 0) + 1
        }
      })

      setProjectFolders(
        data
          .filter(p => (countMap[p.id] || 0) > 0)
          .map(p => ({ id: p.id, title: p.title, count: countMap[p.id] || 0 }))
      )
    }
  }, [profile.org_id])

  // Load starred from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`media_starred_${profile.org_id}`)
      if (saved) setStarredIds(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [profile.org_id])

  // Save starred to localStorage
  const saveStarred = useCallback((ids: Set<string>) => {
    setStarredIds(ids)
    try {
      localStorage.setItem(`media_starred_${profile.org_id}`, JSON.stringify([...ids]))
    } catch { /* ignore */ }
  }, [profile.org_id])

  // Initial load
  useEffect(() => {
    fetchImages(0)
    fetchProjectFolders()
  }, [fetchImages, fetchProjectFolders])

  // Refetch on folder change
  useEffect(() => {
    setPage(0)
    setSelectedIds(new Set())
    fetchImages(0)
  }, [activeFolder, activeProjectId])

  // ─── Filtered Images ──────────────────────────────────────────────────────

  const filteredImages = useMemo(() => {
    let result = images

    // Starred filter
    if (activeFolder === 'starred') {
      result = result.filter(img => starredIds.has(img.id))
    }

    // Client-side search (non-AI)
    if (searchQuery && !aiSearchEnabled) {
      const q = searchQuery.toLowerCase()
      result = result.filter(img =>
        (img.file_name || '').toLowerCase().includes(q) ||
        (img.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (img.ai_tags || []).some(t => t.toLowerCase().includes(q)) ||
        (img.category || '').toLowerCase().includes(q) ||
        (img.vehicle_type || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [images, activeFolder, starredIds, searchQuery, aiSearchEnabled])

  // ─── Folder counts ────────────────────────────────────────────────────────

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: totalCount, starred: starredIds.size }
    STATIC_FOLDERS.forEach(f => {
      if (f.category) {
        counts[f.key] = images.filter(img => img.category === f.category).length
      }
    })
    return counts
  }, [images, totalCount, starredIds])

  // ─── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setUploadProgress(0)

    const files = Array.from(fileList)
    let completed = 0

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('org_id', profile.org_id)
        formData.append('uploaded_by', profile.id)
        if (activeFolder !== 'all' && activeFolder !== 'starred' && activeFolder !== 'by-project') {
          const folder = STATIC_FOLDERS.find(f => f.key === activeFolder)
          if (folder?.category) {
            formData.append('tag', folder.category)
          }
        }
        if (activeProjectId) {
          formData.append('project_id', activeProjectId)
        }

        const res = await fetch('/api/media/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await res.json()
          toast(`Upload failed: ${err.error || 'Unknown error'}`, 'error')
        }
      } catch (err) {
        toast(`Upload failed for ${file.name}`, 'error')
      }
      completed++
      setUploadProgress(Math.round((completed / files.length) * 100))
    }

    setUploading(false)
    setUploadProgress(0)
    toast(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`, 'success')
    fetchImages(0)
    fetchProjectFolders()
  }, [profile, activeFolder, activeProjectId, fetchImages, fetchProjectFolders, toast])

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }, [handleUpload])

  // ─── Selection ────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredImages.map(img => img.id)))
    }
  }, [filteredImages, selectedIds])

  const toggleStar = useCallback((id: string) => {
    const next = new Set(starredIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    saveStarred(next)
  }, [starredIds, saveStarred])

  // ─── AI Tagging ───────────────────────────────────────────────────────────

  const handleAiTag = useCallback(async () => {
    const ids = selectedIds.size > 0
      ? [...selectedIds]
      : images.filter(img => !img.ai_tags || img.ai_tags.length === 0).map(img => img.id).slice(0, 20)

    if (ids.length === 0) {
      toast('No images to tag', 'info')
      return
    }

    setAiTagging(true)
    toast(`AI tagging ${ids.length} image${ids.length > 1 ? 's' : ''}...`, 'info')

    try {
      const res = await fetch('/api/media/ai-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: ids }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast(`AI tagging failed: ${err.error || 'Unknown error'}`, 'error')
      } else {
        const data = await res.json()
        toast(`Tagged ${data.summary?.success || 0} of ${data.summary?.total || 0} images`, 'success')
        fetchImages(0)
      }
    } catch {
      toast('AI tagging failed', 'error')
    }
    setAiTagging(false)
  }, [selectedIds, images, toast, fetchImages])

  // ─── AI Search ────────────────────────────────────────────────────────────

  const handleAiSearch = useCallback(async () => {
    if (!searchQuery.trim() || !aiSearchEnabled) return
    setSearching(true)
    try {
      const res = await fetch('/api/media/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, orgId: profile.org_id }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.results) {
          setImages(data.results)
          setTotalCount(data.results.length)
          setHasMore(false)
        }
      } else {
        toast('AI search failed', 'error')
      }
    } catch {
      toast('AI search failed', 'error')
    }
    setSearching(false)
  }, [searchQuery, aiSearchEnabled, profile.org_id, toast])

  // ─── Share ────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    const urls = filteredImages
      .filter(img => selectedIds.has(img.id))
      .map(img => getImageUrl(img))
      .filter(Boolean)

    if (urls.length === 0) {
      toast('Select images to share', 'info')
      return
    }

    try {
      const res = await fetch('/api/share-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: filteredImages.find(img => selectedIds.has(img.id))?.project_id || null,
          photoUrls: urls,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const link = `${window.location.origin}/share/${data.token}`
        setShareLink(link)
        setShowShareModal(true)
      } else {
        toast('Failed to create share link', 'error')
      }
    } catch {
      toast('Failed to create share link', 'error')
    }
  }, [selectedIds, filteredImages, toast])

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    try {
      for (const id of ids) {
        await supabase.from('job_images').delete().eq('id', id)
      }
      toast(`Deleted ${ids.length} file${ids.length > 1 ? 's' : ''}`, 'success')
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
      fetchImages(0)
    } catch {
      toast('Delete failed', 'error')
    }
  }, [selectedIds, supabase, toast, fetchImages])

  // ─── Download ─────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    const selected = filteredImages.filter(img => selectedIds.has(img.id))
    for (const img of selected) {
      const url = getImageUrl(img)
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = img.file_name || 'download'
        a.target = '_self'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    }
  }, [selectedIds, filteredImages])

  // ─── Bulk Tag ─────────────────────────────────────────────────────────────

  const handleBulkTag = useCallback(async () => {
    if (!bulkTagInput.trim()) return
    const newTags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean)
    const ids = [...selectedIds]

    for (const id of ids) {
      const img = images.find(i => i.id === id)
      if (img) {
        const merged = [...new Set([...(img.tags || []), ...newTags])]
        await supabase.from('job_images').update({ tags: merged }).eq('id', id)
      }
    }

    toast(`Tagged ${ids.length} file${ids.length > 1 ? 's' : ''}`, 'success')
    setBulkTagInput('')
    setShowTagModal(false)
    fetchImages(0)
  }, [bulkTagInput, selectedIds, images, supabase, toast, fetchImages])

  // ─── Move to category ─────────────────────────────────────────────────────

  const handleMoveCategory = useCallback(async () => {
    const ids = [...selectedIds]
    for (const id of ids) {
      await supabase.from('job_images').update({ category: moveCategory }).eq('id', id)
    }
    toast(`Moved ${ids.length} file${ids.length > 1 ? 's' : ''}`, 'success')
    setShowMoveModal(false)
    fetchImages(0)
  }, [selectedIds, moveCategory, supabase, toast, fetchImages])

  // ─── Assign to customer ──────────────────────────────────────────────────

  const searchCustomers = useCallback(async (q: string) => {
    setCustomerSearch(q)
    if (q.length < 2) { setCustomers([]); return }
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('org_id', profile.org_id)
      .ilike('name', `%${q}%`)
      .limit(10)
    setCustomers(data || [])
  }, [supabase, profile.org_id])

  // ─── Detail modal: inline edits ──────────────────────────────────────────

  const saveFileName = useCallback(async () => {
    if (!detailImage || !editNameValue.trim()) return
    await supabase.from('job_images').update({ file_name: editNameValue.trim() }).eq('id', detailImage.id)
    setDetailImage({ ...detailImage, file_name: editNameValue.trim() })
    setEditingName(false)
    toast('File name updated', 'success')
  }, [detailImage, editNameValue, supabase, toast])

  const saveCategory = useCallback(async (cat: string) => {
    if (!detailImage) return
    await supabase.from('job_images').update({ category: cat }).eq('id', detailImage.id)
    setDetailImage({ ...detailImage, category: cat })
    setEditingCategory(false)
    toast('Category updated', 'success')
  }, [detailImage, supabase, toast])

  const addTagToDetail = useCallback(async () => {
    if (!detailImage || !newTagInput.trim()) return
    const merged = [...new Set([...(detailImage.tags || []), newTagInput.trim()])]
    await supabase.from('job_images').update({ tags: merged }).eq('id', detailImage.id)
    setDetailImage({ ...detailImage, tags: merged })
    setNewTagInput('')
    toast('Tag added', 'success')
  }, [detailImage, newTagInput, supabase, toast])

  const removeTagFromDetail = useCallback(async (tag: string) => {
    if (!detailImage) return
    const filtered = (detailImage.tags || []).filter(t => t !== tag)
    await supabase.from('job_images').update({ tags: filtered }).eq('id', detailImage.id)
    setDetailImage({ ...detailImage, tags: filtered })
    toast('Tag removed', 'success')
  }, [detailImage, supabase, toast])

  // ─── Detail nav ───────────────────────────────────────────────────────────

  const detailIndex = detailImage ? filteredImages.findIndex(i => i.id === detailImage.id) : -1

  const goDetailPrev = useCallback(() => {
    if (detailIndex > 0) {
      const prev = filteredImages[detailIndex - 1]
      setDetailImage(prev)
      setEditingName(false)
      setEditingCategory(false)
    }
  }, [detailIndex, filteredImages])

  const goDetailNext = useCallback(() => {
    if (detailIndex < filteredImages.length - 1) {
      const next = filteredImages[detailIndex + 1]
      setDetailImage(next)
      setEditingName(false)
      setEditingCategory(false)
    }
  }, [detailIndex, filteredImages])

  // Keyboard nav
  useEffect(() => {
    if (!detailImage) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDetailImage(null); return }
      if (e.key === 'ArrowLeft') { goDetailPrev(); return }
      if (e.key === 'ArrowRight') { goDetailNext(); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [detailImage, goDetailPrev, goDetailNext])

  // ─── Copy URL ─────────────────────────────────────────────────────────────

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch {
      toast('Failed to copy', 'error')
    }
  }, [toast])

  // ─── Load more ────────────────────────────────────────────────────────────

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchImages(nextPage, true)
  }, [page, fetchImages])

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasSelection = selectedIds.size > 0

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(79, 127, 255, 0.12)',
          border: '3px dashed var(--accent)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            padding: '32px 48px', background: 'var(--surface)',
            borderRadius: 12, textAlign: 'center',
          }}>
            <Upload size={40} style={{ color: 'var(--accent)', marginBottom: 8 }} />
            <div style={{ fontFamily: HEADING_FONT, fontSize: 22, color: 'var(--text1)', fontWeight: 600 }}>
              Drop files to upload
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
              Images will be added to your media library
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* ─── Top Toolbar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexWrap: 'wrap',
        minHeight: 52,
      }}>
        {/* Left group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ToolbarButton
            icon={<Upload size={15} />}
            label="Upload"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
          />
          <ToolbarButton
            icon={<FolderPlus size={15} />}
            label="New Folder"
            onClick={() => toast('Custom folders coming soon', 'info')}
          />
          <ToolbarButton
            icon={<Wand2 size={15} />}
            label="AI Auto-Tag"
            onClick={handleAiTag}
            accent
            loading={aiTagging}
          />
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
          <ToolbarToggle
            icon={<Sparkles size={15} />}
            label="AI Search"
            active={aiSearchEnabled}
            onClick={() => setAiSearchEnabled(!aiSearchEnabled)}
          />
        </div>

        {/* Search */}
        <div style={{
          flex: 1, minWidth: 200, maxWidth: 420, position: 'relative',
        }}>
          <Search size={15} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text3)',
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && aiSearchEnabled) handleAiSearch()
            }}
            placeholder={aiSearchEnabled ? 'Describe what you\'re looking for...' : 'Search files, tags...'}
            style={{
              width: '100%', padding: '7px 10px 7px 32px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text1)', fontSize: 13,
              outline: 'none',
            }}
          />
          {searching && (
            <Loader2 size={14} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--accent)', animation: 'spin 1s linear infinite',
            }} />
          )}
        </div>

        {/* Right group: context actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
          {hasSelection && (
            <>
              <span style={{
                padding: '4px 10px', borderRadius: 12,
                background: 'var(--accent)', color: '#fff',
                fontSize: 12, fontWeight: 600, fontFamily: MONO_FONT,
              }}>
                {selectedIds.size} selected
              </span>
              <ToolbarButton icon={<Link size={15} />} label="Share" onClick={handleShare} />
              <ToolbarButton icon={<UserPlus size={15} />} label="Assign" onClick={() => setShowAssignModal(true)} />
              <ToolbarButton icon={<FolderInput size={15} />} label="Move" onClick={() => setShowMoveModal(true)} />
              <ToolbarButton icon={<Tag size={15} />} label="Tag" onClick={() => setShowTagModal(true)} />
              <ToolbarButton icon={<Download size={15} />} label="Download" onClick={handleDownload} />
              <ToolbarButton icon={<Trash2 size={15} />} label="Delete" onClick={() => setShowDeleteConfirm(true)} danger />
            </>
          )}

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

          {/* View toggle */}
          <div style={{
            display: 'flex', borderRadius: 6, overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '5px 8px', background: viewMode === 'grid' ? 'var(--accent)' : 'var(--surface2)',
                border: 'none', color: viewMode === 'grid' ? '#fff' : 'var(--text3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '5px 8px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--surface2)',
                border: 'none', color: viewMode === 'list' ? '#fff' : 'var(--text3)', cursor: 'pointer',
                borderLeft: '1px solid var(--border)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div style={{ height: 3, background: 'var(--surface2)' }}>
          <div style={{
            height: '100%', width: `${uploadProgress}%`,
            background: 'var(--accent)', transition: 'width 0.3s',
          }} />
        </div>
      )}

      {/* ─── Body: Sidebar + Grid ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─── Sidebar ───────────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div style={{
            width: 240, flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            overflowY: 'auto',
            padding: '12px 0',
          }}>
            <div style={{
              padding: '0 12px 8px', fontFamily: HEADING_FONT,
              fontSize: 11, fontWeight: 600, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Library
            </div>

            {/* Static folders */}
            {STATIC_FOLDERS.map(folder => {
              const FIcon = folder.icon
              const isActive = activeFolder === folder.key && !activeProjectId
              return (
                <button
                  key={folder.key}
                  onClick={() => {
                    setActiveFolder(folder.key)
                    setActiveProjectId(null)
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', border: 'none', cursor: 'pointer',
                    background: isActive ? 'rgba(79, 127, 255, 0.12)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text2)',
                    fontSize: 13, textAlign: 'left',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--surface2)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <FIcon size={15} />
                  <span style={{ flex: 1 }}>{folder.label}</span>
                  {folderCounts[folder.key] !== undefined && (
                    <span style={{
                      fontSize: 11, fontFamily: MONO_FONT,
                      color: 'var(--text3)', minWidth: 20, textAlign: 'right',
                    }}>
                      {folderCounts[folder.key]}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '10px 12px' }} />

            {/* By Project */}
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', border: 'none', cursor: 'pointer',
                background: 'transparent', color: 'var(--text2)',
                fontSize: 13, textAlign: 'left',
                borderLeft: '3px solid transparent',
              }}
            >
              {projectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={15} />
              <span style={{ flex: 1, fontWeight: 600 }}>By Project</span>
              <span style={{
                fontSize: 11, fontFamily: MONO_FONT, color: 'var(--text3)',
              }}>
                {projectFolders.length}
              </span>
            </button>

            {projectsExpanded && projectFolders.map(pf => {
              const isActive = activeProjectId === pf.id
              return (
                <button
                  key={pf.id}
                  onClick={() => {
                    setActiveFolder('by-project')
                    setActiveProjectId(pf.id)
                  }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px 6px 36px', border: 'none', cursor: 'pointer',
                    background: isActive ? 'rgba(79, 127, 255, 0.12)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text3)',
                    fontSize: 12, textAlign: 'left',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--surface2)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {pf.title}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: MONO_FONT, color: 'var(--text3)' }}>
                    {pf.count}
                  </span>
                </button>
              )
            })}

            {/* Create folder */}
            <div style={{ height: 1, background: 'var(--border)', margin: '10px 12px' }} />
            <button
              onClick={() => toast('Custom folders coming soon', 'info')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', border: 'none', cursor: 'pointer',
                background: 'transparent', color: 'var(--text3)',
                fontSize: 13, textAlign: 'left',
                borderLeft: '3px solid transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Plus size={14} />
              <span>Create Folder</span>
            </button>

            {/* Sidebar footer stats */}
            <div style={{
              padding: '16px 12px 8px', borderTop: '1px solid var(--border)',
              marginTop: 12,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                Library Stats
              </div>
              <div style={{
                fontSize: 20, fontFamily: MONO_FONT, fontWeight: 700,
                color: 'var(--text1)',
              }}>
                {totalCount.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>total files</div>
            </div>
          </div>
        )}

        {/* Sidebar toggle (collapsed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              width: 32, flexShrink: 0,
              background: 'var(--surface)', border: 'none',
              borderRight: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* ─── Main Content ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Breadcrumb / info bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 13,
          }}>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  padding: 4, background: 'none', border: 'none',
                  color: 'var(--text3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <Folder size={14} style={{ color: 'var(--text3)' }} />
            <span style={{ color: 'var(--text2)', fontWeight: 600 }}>
              {activeProjectId
                ? projectFolders.find(p => p.id === activeProjectId)?.title || 'Project'
                : STATIC_FOLDERS.find(f => f.key === activeFolder)?.label || 'All Files'
              }
            </span>
            <span style={{ color: 'var(--text3)', fontFamily: MONO_FONT, fontSize: 12 }}>
              {filteredImages.length} file{filteredImages.length !== 1 ? 's' : ''}
            </span>
            {hasSelection && (
              <button
                onClick={selectAll}
                style={{
                  marginLeft: 'auto', padding: '3px 10px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 4, color: 'var(--text2)', fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {selectedIds.size === filteredImages.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {loading && images.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: 12,
              }}>
                <Loader2 size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--text3)', fontSize: 14 }}>Loading media library...</span>
              </div>
            ) : filteredImages.length === 0 ? (
              <EmptyState
                onUpload={() => fileInputRef.current?.click()}
                isFiltered={activeFolder !== 'all' || !!searchQuery}
              />
            ) : viewMode === 'grid' ? (
              /* ─── Grid View ───────────────────────────────────────────── */
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 12,
                }}>
                  {filteredImages.map(img => (
                    <GridCard
                      key={img.id}
                      image={img}
                      isSelected={selectedIds.has(img.id)}
                      isStarred={starredIds.has(img.id)}
                      onSelect={() => toggleSelect(img.id)}
                      onStar={() => toggleStar(img.id)}
                      onClick={() => {
                        setDetailImage(img)
                        setEditNameValue(img.file_name)
                      }}
                      onCopyLink={() => copyToClipboard(getImageUrl(img))}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      style={{
                        padding: '10px 32px', background: 'var(--surface2)',
                        border: '1px solid var(--border)', borderRadius: 8,
                        color: 'var(--text1)', fontSize: 14, cursor: 'pointer',
                        fontFamily: HEADING_FONT, fontWeight: 600,
                      }}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* ─── List View ───────────────────────────────────────────── */
              <>
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 8,
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 44px 1fr 100px 100px 100px 120px',
                    padding: '8px 12px', background: 'var(--surface2)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredImages.length && filteredImages.length > 0}
                        onChange={selectAll}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </div>
                    <div />
                    <div>Name</div>
                    <div>Category</div>
                    <div>Size</div>
                    <div>Date</div>
                    <div>Tags</div>
                  </div>

                  {/* Rows */}
                  {filteredImages.map(img => (
                    <div
                      key={img.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 44px 1fr 100px 100px 100px 120px',
                        padding: '6px 12px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        background: selectedIds.has(img.id) ? 'rgba(79, 127, 255, 0.06)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onClick={() => {
                        setDetailImage(img)
                        setEditNameValue(img.file_name)
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedIds.has(img.id)) e.currentTarget.style.background = 'var(--surface2)'
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedIds.has(img.id)) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(img.id)}
                          onChange={() => toggleSelect(img.id)}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: 4, overflow: 'hidden' }}>
                        <img
                          src={getImageUrl(img)}
                          alt=""
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{
                        fontSize: 13, color: 'var(--text1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        paddingRight: 8,
                      }}>
                        {img.file_name}
                      </div>
                      <div style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--surface2)', color: 'var(--text2)',
                        textTransform: 'capitalize', display: 'inline-block', width: 'fit-content',
                      }}>
                        {img.category}
                      </div>
                      <div style={{ fontSize: 12, fontFamily: MONO_FONT, color: 'var(--text3)' }}>
                        {formatBytes(img.file_size)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {formatDate(img.created_at)}
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', overflow: 'hidden', maxHeight: 22 }}>
                        {[...(img.tags || []), ...(img.ai_tags || [])].slice(0, 2).map((tag, i) => (
                          <span key={i} style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 3,
                            background: 'rgba(79, 127, 255, 0.1)', color: 'var(--accent)',
                          }}>
                            {truncate(tag, 12)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      style={{
                        padding: '10px 32px', background: 'var(--surface2)',
                        border: '1px solid var(--border)', borderRadius: 8,
                        color: 'var(--text1)', fontSize: 14, cursor: 'pointer',
                        fontFamily: HEADING_FONT, fontWeight: 600,
                      }}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Detail Modal ──────────────────────────────────────────────────── */}
      {detailImage && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setDetailImage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90vw', maxWidth: 1100, height: '85vh',
              background: 'var(--surface)', borderRadius: 12,
              display: 'flex', overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* Left: Image */}
            <div style={{
              flex: 3, background: 'var(--bg)', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={getImageUrl(detailImage)}
                alt={detailImage.file_name}
                style={{
                  maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                }}
              />

              {/* Nav arrows */}
              {detailIndex > 0 && (
                <button
                  onClick={goDetailPrev}
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.6)', border: 'none',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              {detailIndex < filteredImages.length - 1 && (
                <button
                  onClick={goDetailNext}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.6)', border: 'none',
                    color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ArrowRight size={18} />
                </button>
              )}

              {/* Counter */}
              <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                padding: '4px 12px', borderRadius: 12,
                background: 'rgba(0, 0, 0, 0.6)', color: '#fff',
                fontSize: 12, fontFamily: MONO_FONT,
              }}>
                {detailIndex + 1} / {filteredImages.length}
              </div>
            </div>

            {/* Right: Info panel */}
            <div style={{
              flex: 2, maxWidth: 380, overflowY: 'auto',
              padding: 24, borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              {/* Close button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDetailImage(null)}
                  style={{
                    padding: 4, background: 'none', border: 'none',
                    color: 'var(--text3)', cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* File name (editable) */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  File Name
                </div>
                {editingName ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveFileName() }}
                      style={{
                        flex: 1, padding: '6px 8px', background: 'var(--surface2)',
                        border: '1px solid var(--border)', borderRadius: 4,
                        color: 'var(--text1)', fontSize: 14,
                      }}
                      autoFocus
                    />
                    <button
                      onClick={saveFileName}
                      style={{
                        padding: '6px 10px', background: 'var(--accent)',
                        border: 'none', borderRadius: 4, color: '#fff',
                        cursor: 'pointer', fontSize: 12,
                      }}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => { setEditingName(true); setEditNameValue(detailImage.file_name) }}
                    style={{
                      fontSize: 16, fontWeight: 600, color: 'var(--text1)',
                      fontFamily: HEADING_FONT, cursor: 'pointer',
                      padding: '4px 0', borderBottom: '1px dashed var(--border)',
                    }}
                    title="Click to edit"
                  >
                    {detailImage.file_name}
                  </div>
                )}
              </div>

              {/* Category (editable) */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Category
                </div>
                {editingCategory ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => saveCategory(cat)}
                        style={{
                          padding: '4px 10px', borderRadius: 4, fontSize: 12,
                          background: detailImage.category === cat ? 'var(--accent)' : 'var(--surface2)',
                          color: detailImage.category === cat ? '#fff' : 'var(--text2)',
                          border: '1px solid var(--border)', cursor: 'pointer',
                          textTransform: 'capitalize',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingCategory(true)}
                    style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 4,
                      background: 'var(--surface2)', color: 'var(--text1)',
                      fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                      border: '1px solid var(--border)',
                    }}
                    title="Click to change"
                  >
                    {detailImage.category}
                  </div>
                )}
              </div>

              {/* Tags (editable) */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {(detailImage.tags || []).map((tag, i) => (
                    <span key={`tag-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 4,
                      background: 'rgba(79, 127, 255, 0.1)', color: 'var(--accent)',
                      fontSize: 12,
                    }}>
                      {tag}
                      <button
                        onClick={() => removeTagFromDetail(tag)}
                        style={{
                          padding: 0, background: 'none', border: 'none',
                          color: 'var(--accent)', cursor: 'pointer', display: 'flex',
                        }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {(detailImage.ai_tags || []).map((tag, i) => (
                    <span key={`ai-${i}`} style={{
                      padding: '3px 8px', borderRadius: 4,
                      background: 'rgba(139, 92, 246, 0.1)', color: 'var(--purple)',
                      fontSize: 12,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addTagToDetail() }}
                    placeholder="Add tag..."
                    style={{
                      flex: 1, padding: '5px 8px', background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 4,
                      color: 'var(--text1)', fontSize: 12,
                    }}
                  />
                  <button
                    onClick={addTagToDetail}
                    style={{
                      padding: '5px 10px', background: 'var(--accent)',
                      border: 'none', borderRadius: 4, color: '#fff',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              {/* AI Description */}
              {detailImage.metadata?.ai_analysis?.description && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    AI Description
                  </div>
                  <div style={{
                    padding: '8px 12px', background: 'var(--surface2)',
                    borderRadius: 6, fontSize: 13, color: 'var(--text2)',
                    lineHeight: 1.5, borderLeft: '3px solid var(--purple)',
                  }}>
                    {detailImage.metadata.ai_analysis.description}
                  </div>
                </div>
              )}

              {/* Linked Project */}
              {detailImage.project_id && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Linked Project
                  </div>
                  <a
                    href={`/projects/${detailImage.project_id}`}
                    style={{
                      fontSize: 13, color: 'var(--accent)', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <ExternalLink size={12} />
                    {detailImage.project_title || detailImage.project_id}
                  </a>
                </div>
              )}

              {/* Meta info */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                padding: '12px 0', borderTop: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
                    <Calendar size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Uploaded
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {formatDateFull(detailImage.created_at)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
                    <HardDrive size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    File Size
                  </div>
                  <div style={{ fontSize: 12, fontFamily: MONO_FONT, color: 'var(--text2)' }}>
                    {formatBytes(detailImage.file_size)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
                    <User size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Uploaded By
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {detailImage.uploader_name || detailImage.uploaded_by || '--'}
                  </div>
                </div>
                {detailImage.mime_type && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Type</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{detailImage.mime_type}</div>
                  </div>
                )}
              </div>

              {/* Direct URL */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Direct URL
                </div>
                <div style={{
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  <input
                    readOnly
                    value={getImageUrl(detailImage)}
                    style={{
                      flex: 1, padding: '5px 8px', background: 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 4,
                      color: 'var(--text3)', fontSize: 11, fontFamily: MONO_FONT,
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => copyToClipboard(getImageUrl(detailImage))}
                    style={{
                      padding: '5px 8px', background: copiedUrl ? 'var(--green)' : 'var(--surface2)',
                      border: '1px solid var(--border)', borderRadius: 4,
                      color: copiedUrl ? '#fff' : 'var(--text2)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                paddingTop: 8, borderTop: '1px solid var(--border)',
              }}>
                <button
                  onClick={() => {
                    setSelectedIds(new Set([detailImage.id]))
                    setDetailImage(null)
                    handleShare()
                  }}
                  style={{
                    padding: '8px 12px', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    color: 'var(--text1)', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Link size={14} /> Share
                </button>
                <button
                  onClick={() => {
                    const url = getImageUrl(detailImage)
                    if (url) {
                      const a = document.createElement('a')
                      a.href = url
                      a.download = detailImage.file_name
                      a.target = '_self'
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    }
                  }}
                  style={{
                    padding: '8px 12px', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    color: 'var(--text1)', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={() => toggleStar(detailImage.id)}
                  style={{
                    padding: '8px 12px', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    color: starredIds.has(detailImage.id) ? 'var(--amber)' : 'var(--text1)',
                    fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Star size={14} fill={starredIds.has(detailImage.id) ? 'var(--amber)' : 'none'} />
                  {starredIds.has(detailImage.id) ? 'Starred' : 'Star'}
                </button>
                <button
                  onClick={async () => {
                    await supabase.from('job_images').delete().eq('id', detailImage.id)
                    toast('File deleted', 'success')
                    setDetailImage(null)
                    fetchImages(0)
                  }}
                  style={{
                    padding: '8px 12px', background: 'rgba(242, 90, 90, 0.1)',
                    border: '1px solid rgba(242, 90, 90, 0.3)', borderRadius: 6,
                    color: 'var(--red)', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Share Modal ───────────────────────────────────────────────────── */}
      {showShareModal && (
        <ModalOverlay onClose={() => setShowShareModal(false)}>
          <div style={{
            width: 460, background: 'var(--surface)', borderRadius: 12,
            padding: 24, border: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 700,
              color: 'var(--text1)', marginBottom: 16,
            }}>
              Share Link Created
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              Anyone with this link can view the selected photos. Link expires in 7 days.
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <input
                readOnly
                value={shareLink}
                style={{
                  flex: 1, padding: '8px 12px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text1)', fontSize: 13, fontFamily: MONO_FONT,
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => { copyToClipboard(shareLink); toast('Link copied', 'success') }}
                style={{
                  padding: '8px 16px', background: 'var(--accent)',
                  border: 'none', borderRadius: 6, color: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  padding: '8px 20px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Done
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── Delete Confirm Modal ──────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <ModalOverlay onClose={() => setShowDeleteConfirm(false)}>
          <div style={{
            width: 400, background: 'var(--surface)', borderRadius: 12,
            padding: 24, border: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 700,
              color: 'var(--text1)', marginBottom: 8,
            }}>
              Delete {selectedIds.size} file{selectedIds.size > 1 ? 's' : ''}?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
              This action cannot be undone. The files will be permanently removed from the media library.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '8px 20px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 20px', background: 'var(--red)',
                  border: 'none', borderRadius: 6,
                  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── Assign to Customer Modal ──────────────────────────────────────── */}
      {showAssignModal && (
        <ModalOverlay onClose={() => setShowAssignModal(false)}>
          <div style={{
            width: 440, background: 'var(--surface)', borderRadius: 12,
            padding: 24, border: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 700,
              color: 'var(--text1)', marginBottom: 16,
            }}>
              Assign to Customer
            </div>
            <input
              value={customerSearch}
              onChange={(e) => searchCustomers(e.target.value)}
              placeholder="Search customers..."
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--text1)', fontSize: 14, marginBottom: 8,
              }}
              autoFocus
            />
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={async () => {
                    const ids = [...selectedIds]
                    for (const id of ids) {
                      await supabase.from('job_images').update({
                        metadata: { customer_id: c.id, customer_name: c.name },
                      }).eq('id', id)
                    }
                    toast(`Assigned ${ids.length} file${ids.length > 1 ? 's' : ''} to ${c.name}`, 'success')
                    setShowAssignModal(false)
                  }}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    color: 'var(--text1)', fontSize: 14, cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <User size={14} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--text3)' }} />
                  {c.name}
                </button>
              ))}
              {customerSearch.length >= 2 && customers.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  No customers found
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  padding: '8px 20px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── Move to Folder Modal ──────────────────────────────────────────── */}
      {showMoveModal && (
        <ModalOverlay onClose={() => setShowMoveModal(false)}>
          <div style={{
            width: 400, background: 'var(--surface)', borderRadius: 12,
            padding: 24, border: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 700,
              color: 'var(--text1)', marginBottom: 16,
            }}>
              Move to Category
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setMoveCategory(cat)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 13,
                    background: moveCategory === cat ? 'var(--accent)' : 'var(--surface2)',
                    color: moveCategory === cat ? '#fff' : 'var(--text2)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowMoveModal(false)}
                style={{
                  padding: '8px 20px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMoveCategory}
                style={{
                  padding: '8px 20px', background: 'var(--accent)',
                  border: 'none', borderRadius: 6,
                  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                Move {selectedIds.size} file{selectedIds.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── Bulk Tag Modal ────────────────────────────────────────────────── */}
      {showTagModal && (
        <ModalOverlay onClose={() => setShowTagModal(false)}>
          <div style={{
            width: 420, background: 'var(--surface)', borderRadius: 12,
            padding: 24, border: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: HEADING_FONT, fontSize: 20, fontWeight: 700,
              color: 'var(--text1)', marginBottom: 8,
            }}>
              Add Tags
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Add tags to {selectedIds.size} selected file{selectedIds.size > 1 ? 's' : ''}. Separate multiple tags with commas.
            </div>
            <input
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleBulkTag() }}
              placeholder="e.g. wrap, ford, blue, full-wrap"
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--text1)', fontSize: 14, marginBottom: 16,
              }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setShowTagModal(false)}
                style={{
                  padding: '8px 20px', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkTag}
                style={{
                  padding: '8px 20px', background: 'var(--accent)',
                  border: 'none', borderRadius: 6,
                  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                Apply Tags
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ─── Sub-Components ─────────────────────────────────────────────────────────────

function ToolbarButton({ icon, label, onClick, accent, danger, loading }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  accent?: boolean
  danger?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 10px', borderRadius: 6,
        background: accent ? 'rgba(79, 127, 255, 0.12)' : danger ? 'rgba(242, 90, 90, 0.1)' : 'var(--surface2)',
        border: `1px solid ${accent ? 'rgba(79, 127, 255, 0.3)' : danger ? 'rgba(242, 90, 90, 0.3)' : 'var(--border)'}`,
        color: accent ? 'var(--accent)' : danger ? 'var(--red)' : 'var(--text2)',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.15s',
      }}
    >
      {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function ToolbarToggle({ icon, label, active, onClick }: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '6px 10px', borderRadius: 6,
        background: active ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface2)',
        border: `1px solid ${active ? 'rgba(139, 92, 246, 0.4)' : 'var(--border)'}`,
        color: active ? 'var(--purple)' : 'var(--text3)',
        cursor: 'pointer', fontSize: 12, fontWeight: 500,
        transition: 'all 0.15s',
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function GridCard({ image, isSelected, isStarred, onSelect, onStar, onClick, onCopyLink }: {
  image: MediaImage
  isSelected: boolean
  isStarred: boolean
  onSelect: () => void
  onStar: () => void
  onClick: () => void
  onCopyLink: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const allTags = [...(image.tags || []), ...(image.ai_tags || [])].slice(0, 3)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative', borderRadius: 8, overflow: 'hidden',
        border: isSelected ? '2px solid var(--green)' : '1px solid var(--border)',
        background: 'var(--surface)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hovered ? '0 4px 20px rgba(0, 0, 0, 0.3)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%', aspectRatio: '1', overflow: 'hidden',
        background: 'var(--bg)',
      }}>
        <img
          src={getImageUrl(image)}
          alt={image.file_name}
          loading="lazy"
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.3s',
            transform: hovered ? 'scale(1.03)' : 'scale(1)',
          }}
        />
      </div>

      {/* Checkbox - top left */}
      {(hovered || isSelected) && (
        <div
          onClick={(e) => { e.stopPropagation(); onSelect() }}
          style={{
            position: 'absolute', top: 8, left: 8,
            width: 22, height: 22, borderRadius: 4,
            background: isSelected ? 'var(--accent)' : 'rgba(0, 0, 0, 0.5)',
            border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {isSelected && <Check size={14} color="#fff" />}
        </div>
      )}

      {/* Star - top right */}
      {(hovered || isStarred) && (
        <button
          onClick={(e) => { e.stopPropagation(); onStar() }}
          style={{
            position: 'absolute', top: 8, right: 8,
            padding: 4, borderRadius: 4,
            background: 'rgba(0, 0, 0, 0.5)', border: 'none',
            color: isStarred ? 'var(--amber)' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer', display: 'flex',
          }}
        >
          <Star size={14} fill={isStarred ? 'var(--amber)' : 'none'} />
        </button>
      )}

      {/* Category badge - bottom left */}
      <div style={{
        position: 'absolute', bottom: 56, left: 8,
        padding: '2px 7px', borderRadius: 4,
        background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
        color: '#fff', fontSize: 10, fontWeight: 500,
        textTransform: 'capitalize',
      }}>
        {image.category}
      </div>

      {/* Hover action row */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 56, right: 8,
          display: 'flex', gap: 4,
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onCopyLink() }}
            style={{
              padding: '3px 6px', borderRadius: 4,
              background: 'rgba(0, 0, 0, 0.6)', border: 'none',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 10,
            }}
            title="Copy link"
          >
            <Copy size={11} />
          </button>
        </div>
      )}

      {/* Bottom info */}
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          fontSize: 12, color: 'var(--text1)', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {image.file_name}
        </div>
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {allTags.map((tag, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '1px 5px', borderRadius: 3,
                background: i < (image.tags?.length || 0) ? 'rgba(79, 127, 255, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                color: i < (image.tags?.length || 0) ? 'var(--accent)' : 'var(--purple)',
              }}>
                {truncate(tag, 14)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onUpload, isFiltered }: { onUpload: () => void; isFiltered: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16, padding: 40,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--surface2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <ImageIcon size={32} style={{ color: 'var(--text3)' }} />
      </div>
      <div style={{
        fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22,
        fontWeight: 700, color: 'var(--text1)',
      }}>
        {isFiltered ? 'No files match your filter' : 'Your media library is empty'}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text3)', textAlign: 'center', maxWidth: 360 }}>
        {isFiltered
          ? 'Try adjusting your search or changing the active folder.'
          : 'Upload images to start building your media library. Drag and drop files anywhere on this page or click the button below.'
        }
      </div>
      {!isFiltered && (
        <button
          onClick={onUpload}
          style={{
            padding: '10px 28px', background: 'var(--accent)',
            border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'Barlow Condensed, sans-serif',
          }}
        >
          <Upload size={16} /> Upload Files
        </button>
      )}
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
