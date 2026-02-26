'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  ChevronLeft, Phone, MapPin, Clock, CheckCircle2, Circle, Camera, AlertTriangle,
  Play, Pause, Square, Navigation, FileText, Wrench, Star, TriangleAlert,
  ChevronDown, ChevronUp, Plus, Trash2, Send, Mic, MicOff, Flag,
  ArrowRight, Check, X, Package, Car, Fuel, Gauge, Shield,
  DollarSign, Route, ChevronRight, Lock, Unlock, Timer,
} from 'lucide-react'

// ── Haversine distance (meters) ────────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface TimerState {
  jobId: string | null
  sessionId: string | null
  startTime: number | null
  elapsed: number
  paused: boolean
  pausedAt: number | null
}

interface InstallerJobCardProps {
  job: Record<string, any>
  profile: Profile
  onBack: () => void
  timer: TimerState
  onStartTimer: (jobId: string) => Promise<void>
  onPauseTimer: () => void
  onResumeTimer: () => void
  onStopTimer: () => Promise<void>
  formatTimer: (seconds: number) => string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'sales_in', label: 'Sales' },
  { key: 'production', label: 'Prod' },
  { key: 'install', label: 'Install' },
  { key: 'prod_review', label: 'QC' },
  { key: 'sales_close', label: 'Close' },
  { key: 'done', label: 'Done' },
]

const PRE_INSTALL_ITEMS = [
  { id: 'vehicle_doc', label: 'Vehicle condition documented' },
  { id: 'damage_photo', label: 'Existing damage photographed and noted' },
  { id: 'surface_clean', label: 'Surface cleaned and prepped' },
  { id: 'contract_ok', label: 'Contract verified signed' },
  { id: 'proof_reviewed', label: 'Design proof reviewed and understood' },
  { id: 'materials_ok', label: 'Materials confirmed received and correct' },
  { id: 'tools_ready', label: 'Tools ready and accounted for' },
  { id: 'customer_notified', label: 'Customer or contact on site notified' },
]

const PHOTO_ITEMS = [
  // before
  { id: 'b_front', label: 'Full vehicle front', phase: 'before' as const, required: true },
  { id: 'b_driver', label: 'Full vehicle driver side', phase: 'before' as const, required: true },
  { id: 'b_pass', label: 'Full vehicle passenger side', phase: 'before' as const, required: true },
  { id: 'b_rear', label: 'Full vehicle rear', phase: 'before' as const, required: true },
  { id: 'b_damage', label: 'Close up of any existing damage', phase: 'before' as const, required: false },
  { id: 'b_proof', label: 'Design proof held next to vehicle', phase: 'before' as const, required: true },
  { id: 'b_prep', label: 'Surface prep complete', phase: 'before' as const, required: true },
  // during
  { id: 'd_clean', label: 'Surface cleaned and wiped down', phase: 'during' as const, required: false },
  { id: 'd_position', label: 'Design positioned before final application', phase: 'during' as const, required: false },
  { id: 'd_complex', label: 'Any complex areas mid-install', phase: 'during' as const, required: false },
  { id: 'd_seam', label: 'Seam placement', phase: 'during' as const, required: false },
  // after
  { id: 'a_front', label: 'Full vehicle front (wrapped)', phase: 'after' as const, required: true },
  { id: 'a_driver', label: 'Full vehicle driver side (wrapped)', phase: 'after' as const, required: true },
  { id: 'a_pass', label: 'Full vehicle passenger side (wrapped)', phase: 'after' as const, required: true },
  { id: 'a_rear', label: 'Full vehicle rear (wrapped)', phase: 'after' as const, required: true },
  { id: 'a_logo', label: 'Detail shot of logo / main design', phase: 'after' as const, required: true },
  { id: 'a_detail', label: 'Detail shot of complex curves or edges', phase: 'after' as const, required: false },
  { id: 'a_concern', label: 'Any concerns or issues noted with photo', phase: 'after' as const, required: false },
  { id: 'a_beauty', label: 'Final beauty shot', phase: 'after' as const, required: true },
]

const QUALITY_ITEMS = [
  { id: 'no_bubbles', label: 'No bubbles or lifting edges' },
  { id: 'seams_aligned', label: 'All seams properly aligned' },
  { id: 'cutouts_clean', label: 'All cutouts clean (mirrors, handles, lights)' },
  { id: 'vehicle_cleaned', label: 'Vehicle cleaned after install' },
  { id: 'customer_satisfied', label: 'Customer walked through and is satisfied' },
]

const ISSUE_TYPES = [
  { value: 'material_defect', label: 'Material Defect' },
  { value: 'design_error', label: 'Design Error' },
  { value: 'vehicle_surface', label: 'Vehicle Surface Problem' },
  { value: 'customer_issue', label: 'Customer Issue' },
  { value: 'wrong_materials', label: 'Wrong Materials Delivered' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'other', label: 'Other' },
]

const NOTE_TAGS = [
  { value: 'general', label: 'General', color: 'var(--text2)' },
  { value: 'customer', label: 'For Customer', color: 'var(--accent)' },
  { value: 'designer', label: 'For Designer', color: 'var(--purple)' },
  { value: 'production_manager', label: 'For PM', color: 'var(--amber)' },
  { value: 'next_installer', label: 'For Next Installer', color: 'var(--cyan)' },
]

const VINYL_TYPES = [
  'Cast Vinyl', 'Calendered Vinyl', 'Carbon Fiber', 'Chrome / Mirror',
  'Matte', 'Gloss', 'Satin', 'Color Shift', 'Brushed Metal', 'PPF', 'Laminate Only',
]

// ── Shared style helpers ───────────────────────────────────────────────────────
const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  overflow: 'hidden' as const,
}

const inputStyle = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '9px 12px',
  color: 'var(--text1)',
  fontSize: 13,
  boxSizing: 'border-box' as const,
}

const btnPrimary = {
  padding: '11px 22px',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 9,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function InstallerJobCard({
  job,
  profile,
  onBack,
  timer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  formatTimer,
}: InstallerJobCardProps) {
  const supabase = createClient()

  // ── Derived data ──────────────────────────────────────────────────
  const fd = (job.form_data || {}) as Record<string, string>
  const fin = (job.fin_data || {}) as Record<string, number>
  const jobId: string = job.id
  const isTimerActive = timer.jobId === jobId
  const estHours: number = fin.laborHrs || fin.hours || fin.estimated_hours || 0
  const elapsedHours: number = isTimerActive ? timer.elapsed / 3600 : 0
  const pct = estHours > 0 ? Math.min(100, (elapsedHours / estHours) * 100) : 0
  const timerStatusColor = pct < 75 ? 'var(--green)' : pct < 100 ? 'var(--amber)' : 'var(--red)'

  const installAddr: string | null = job.install_address || fd.install_address || fd.address || null
  const installLat: number | null = job.install_lat || null
  const installLng: number | null = job.install_lng || null
  const accessCode: string | null = fd.access_code || fd.gate_code || fd.building_code || null
  const accessInstructions: string | null = fd.access_instructions || fd.location_notes || fd.site_notes || null
  const siteContact: string | null = fd.site_contact || fd.contact_on_site || null
  const siteContactPhone: string | null = fd.site_contact_phone || fd.site_phone || null

  const customerName: string = fd.client || fd.customer_name || job.title || 'Customer'
  const customerPhone: string | null = fd.phone || fd.customer_phone || fd.cell || null

  const division: string = fd.division || fd.service_category || 'Wrap'
  const wrapType: string = fd.wrapDetail || fd.wrap_type || fd.service_type || 'Full Wrap'

  const currentStageIdx = PIPELINE_STAGES.findIndex(s => s.key === job.pipe_stage)
  const pipelinePct = Math.round(((Math.max(0, currentStageIdx) + 1) / PIPELINE_STAGES.length) * 100)

  // ── State ─────────────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['header', 'contract', 'pre', 'gps'])
  )

  // GPS
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle')
  const [gpsDistance, setGpsDistance] = useState<number | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Contract
  const [contractStatus, setContractStatus] = useState<'loading' | 'signed' | 'unsigned'>('loading')
  const [contractSignedAt, setContractSignedAt] = useState<string | null>(null)

  // Pre-install checklist
  const [preCheck, setPreCheck] = useState<Record<string, boolean>>({})
  const preCheckComplete = PRE_INSTALL_ITEMS.every(i => preCheck[i.id])

  // Photo checklist
  const [photoStatus, setPhotoStatus] = useState<Record<string, boolean>>({})
  const [activePhotoItem, setActivePhotoItem] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [activePhotoPhase, setActivePhotoPhase] = useState<'before' | 'during' | 'after'>('before')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reqBefore = PHOTO_ITEMS.filter(p => p.phase === 'before' && p.required)
  const reqAfter = PHOTO_ITEMS.filter(p => p.phase === 'after' && p.required)
  const beforeComplete = reqBefore.every(p => photoStatus[p.id])
  const afterComplete = reqAfter.every(p => photoStatus[p.id])

  // Issues
  const [issues, setIssues] = useState<any[]>([])
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueType, setIssueType] = useState('')
  const [issueUrgency, setIssueUrgency] = useState('medium')
  const [issueDesc, setIssueDesc] = useState('')
  const [submittingIssue, setSubmittingIssue] = useState(false)

  // Materials
  const [materials, setMaterials] = useState<any[]>([])
  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [matVinylType, setMatVinylType] = useState('')
  const [matVinylColor, setMatVinylColor] = useState('')
  const [matLinFt, setMatLinFt] = useState('')
  const [matSqFt, setMatSqFt] = useState('')
  const [matLaminate, setMatLaminate] = useState(false)
  const [matLaminateSq, setMatLaminateSq] = useState('')
  const [matLeftoverLin, setMatLeftoverLin] = useState('')
  const [matLeftoverSq, setMatLeftoverSq] = useState('')
  const [matEstSq, setMatEstSq] = useState('')
  const [matNotes, setMatNotes] = useState('')
  const [savingMaterial, setSavingMaterial] = useState(false)

  // Notes
  const [notes, setNotes] = useState<any[]>([])
  const [noteText, setNoteText] = useState('')
  const [noteTag, setNoteTag] = useState('general')
  const [savingNote, setSavingNote] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Mileage
  const [mileageLog, setMileageLog] = useState<any[]>([])
  const [showMileageForm, setShowMileageForm] = useState(false)
  const [mileFrom, setMileFrom] = useState('')
  const [mileTo, setMileTo] = useState('')
  const [mileMiles, setMileMiles] = useState('')
  const [mileNotes, setMileNotes] = useState('')
  const [savingMileage, setSavingMileage] = useState(false)

  // Completion flow
  const [showCompletion, setShowCompletion] = useState(false)
  const [completionStep, setCompletionStep] = useState(0)
  const [qualityCheck, setQualityCheck] = useState<Record<string, boolean>>({})
  const [diffRating, setDiffRating] = useState(3)
  const [diffNotes, setDiffNotes] = useState('')
  const [completing, setCompleting] = useState(false)
  const [jobCompleted, setJobCompleted] = useState(false)

  // Customer signature for completion
  const signCanvasRef = useRef<HTMLCanvasElement>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const qualityComplete = QUALITY_ITEMS.every(i => qualityCheck[i.id])

  // ── Load data ─────────────────────────────────────────────────────
  useEffect(() => {
    checkContract()
    loadIssues()
    loadMaterials()
    loadMileage()
    loadNotes()
  }, [jobId])

  const checkContract = async () => {
    // First check signed_documents table
    const { data: docs } = await supabase
      .from('signed_documents')
      .select('id, created_at')
      .eq('project_id', jobId)
      .limit(1)

    if (docs?.length) {
      setContractStatus('signed')
      setContractSignedAt(docs[0].created_at)
      return
    }
    // Fallback: check project checkout or form_data
    if (job.checkout?.contract_signed || fd.contract_signed === 'true') {
      setContractStatus('signed')
      setContractSignedAt(job.checkout?.contract_signed_at || null)
    } else {
      setContractStatus('unsigned')
    }
  }

  const loadIssues = async () => {
    const { data } = await supabase
      .from('installer_issues')
      .select('*')
      .eq('project_id', jobId)
      .order('created_at', { ascending: false })
    if (data) setIssues(data)
  }

  const loadMaterials = async () => {
    const { data } = await supabase
      .from('installer_material_usage')
      .select('*')
      .eq('project_id', jobId)
      .order('created_at', { ascending: false })
    if (data) setMaterials(data)
  }

  const loadNotes = async () => {
    const { data } = await supabase
      .from('installer_notes')
      .select('*')
      .eq('project_id', jobId)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
  }

  const loadMileage = async () => {
    const { data } = await supabase
      .from('installer_mileage_log')
      .select('*')
      .eq('project_id', jobId)
      .eq('installer_id', profile.id)
      .order('created_at', { ascending: false })
    if (data) setMileageLog(data)
  }

  // ── GPS check-in ──────────────────────────────────────────────────
  const handleGPSCheckin = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported on this device.')
      return
    }
    setGpsStatus('checking')
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        let distance: number | null = null
        let verified = true

        if (installLat && installLng) {
          distance = haversineDistance(latitude, longitude, installLat, installLng)
          setGpsDistance(distance)
          if (distance > 152) {
            const ft = Math.round(distance * 3.28084)
            setGpsError(`You are ${ft}ft from the job site. Must be within 500ft (${Math.round(distance)}m) to clock in.`)
            setGpsStatus('failed')
            return
          }
        }

        setGpsStatus('verified')
        fetch('/api/installer/gps-checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: jobId,
            event_type: 'clock_in',
            latitude,
            longitude,
            accuracy_meters: accuracy,
            distance_from_site_meters: distance,
            verified,
          }),
        }).catch(() => {})
      },
      (err) => {
        setGpsError(`GPS error: ${err.message}. Clock-in without GPS verification.`)
        setGpsStatus('failed')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  // ── Photo upload ──────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    setUploadingPhoto(true)

    const file = e.target.files[0]
    const ext = file.name.split('.').pop()
    const itemId = activePhotoItem
    const item = PHOTO_ITEMS.find(p => p.id === itemId)
    const fileName = `${jobId}/checklist_${itemId}_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('project-files')
      .upload(fileName, file, { contentType: file.type })

    if (!upErr) {
      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(fileName)
      await supabase.from('job_images').insert({
        project_id: jobId,
        org_id: profile.org_id,
        user_id: profile.id,
        image_url: urlData.publicUrl,
        category: item?.phase || 'before',
        file_name: item?.label || file.name,
        file_size: file.size,
      })
      if (itemId) setPhotoStatus(prev => ({ ...prev, [itemId]: true }))
    }

    setUploadingPhoto(false)
    setActivePhotoItem(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const triggerPhotoUpload = (itemId: string) => {
    setActivePhotoItem(itemId)
    setTimeout(() => fileInputRef.current?.click(), 50)
  }

  // ── Issue submit ──────────────────────────────────────────────────
  const submitIssue = async () => {
    if (!issueType || !issueDesc.trim()) return
    setSubmittingIssue(true)
    const res = await fetch('/api/installer/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: jobId,
        issue_type: issueType,
        urgency: issueUrgency,
        description: issueDesc,
      }),
    })
    if (res.ok) {
      const issue = await res.json()
      setIssues(prev => [issue, ...prev])
      setIssueType('')
      setIssueUrgency('medium')
      setIssueDesc('')
      setShowIssueModal(false)
    }
    setSubmittingIssue(false)
  }

  // ── Material save ─────────────────────────────────────────────────
  const saveMaterial = async () => {
    setSavingMaterial(true)
    const res = await fetch('/api/installer/material-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: jobId,
        vinyl_type: matVinylType || null,
        vinyl_color: matVinylColor || null,
        linear_feet_used: matLinFt ? parseFloat(matLinFt) : null,
        sq_ft_used: matSqFt ? parseFloat(matSqFt) : null,
        laminate_used: matLaminate,
        laminate_sq_ft: matLaminateSq ? parseFloat(matLaminateSq) : null,
        leftover_linear_ft: matLeftoverLin ? parseFloat(matLeftoverLin) : null,
        leftover_sq_ft: matLeftoverSq ? parseFloat(matLeftoverSq) : null,
        estimated_sq_ft: matEstSq ? parseFloat(matEstSq) : null,
        notes: matNotes || null,
      }),
    })
    if (res.ok) {
      const mat = await res.json()
      setMaterials(prev => [mat, ...prev])
      setMatVinylType(''); setMatVinylColor(''); setMatLinFt(''); setMatSqFt('')
      setMatLaminate(false); setMatLaminateSq(''); setMatLeftoverLin(''); setMatLeftoverSq('')
      setMatEstSq(''); setMatNotes(''); setShowMaterialForm(false)
    }
    setSavingMaterial(false)
  }

  // ── Note save ─────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    const res = await fetch('/api/installer/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: jobId, note_text: noteText, note_tag: noteTag }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes(prev => [note, ...prev])
      setNoteText('')
    }
    setSavingNote(false)
  }

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice input not supported on this device.'); return }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
    } else {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = false
      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results as SpeechRecognitionResultList)
          .map((r: SpeechRecognitionResult) => r[0].transcript)
          .join(' ')
        setNoteText(prev => prev + (prev ? ' ' : '') + transcript)
      }
      rec.onend = () => setListening(false)
      rec.start()
      recognitionRef.current = rec
      setListening(true)
    }
  }

  // ── Mileage save ──────────────────────────────────────────────────
  const saveMileage = async () => {
    if (!mileMiles) return
    setSavingMileage(true)
    const res = await fetch('/api/installer/mileage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: jobId,
        from_address: mileFrom || null,
        to_address: mileTo || null,
        miles: parseFloat(mileMiles),
        notes: mileNotes || null,
      }),
    })
    if (res.ok) {
      const mile = await res.json()
      setMileageLog(prev => [mile, ...prev])
      setMileFrom(''); setMileTo(''); setMileMiles(''); setMileNotes('')
      setShowMileageForm(false)
    }
    setSavingMileage(false)
  }

  // ── Complete job ──────────────────────────────────────────────────
  const completeJob = async () => {
    setCompleting(true)
    if (isTimerActive && timer.startTime) await onStopTimer()
    const res = await fetch('/api/installer/complete-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: jobId,
        difficulty_rating: diffRating,
        difficulty_notes: diffNotes,
        quality_checklist: qualityCheck,
      }),
    })
    if (res.ok) {
      setJobCompleted(true)
      setShowCompletion(false)
    }
    setCompleting(false)
  }

  // ── Signature canvas ──────────────────────────────────────────────
  const initSign = useCallback(() => {
    const c = signCanvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#e8eaed'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => { initSign() }, [initSign, completionStep])

  const signCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const c = signCanvasRef.current
    if (!c) return { x: 0, y: 0 }
    const r = c.getBoundingClientRect()
    if ('touches' in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top }
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top }
  }
  const startSign = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); setIsDrawing(true)
    const ctx = signCanvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = signCoords(e)
    ctx.beginPath(); ctx.moveTo(x, y)
  }
  const drawSign = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = signCanvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = signCoords(e)
    ctx.lineTo(x, y); ctx.stroke()
  }
  const endSign = () => {
    setIsDrawing(false)
    if (signCanvasRef.current) setSignatureData(signCanvasRef.current.toDataURL('image/png'))
  }
  const clearSign = () => {
    const c = signCanvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    setSignatureData(null); initSign()
  }

  // ── Section toggle ────────────────────────────────────────────────
  const toggle = (id: string) =>
    setOpenSections(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const open = (id: string) => openSections.has(id)

  // ── Section header component ──────────────────────────────────────
  const SectionHeader = ({
    id, icon, title, badge, warn,
  }: { id: string; icon: React.ReactNode; title: string; badge?: string; warn?: boolean }) => (
    <button
      onClick={() => toggle(id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: open(id) ? '1px solid var(--border)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: warn ? 'var(--red)' : 'var(--accent)' }}>{icon}</span>
        <span style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 800,
          color: warn ? 'var(--red)' : 'var(--text1)',
        }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
            background: 'rgba(79,127,255,0.15)', color: 'var(--accent)',
          }}>{badge}</span>
        )}
      </div>
      {open(id) ? <ChevronUp size={16} color="var(--text3)" /> : <ChevronDown size={16} color="var(--text3)" />}
    </button>
  )

  // ── Completed state ───────────────────────────────────────────────
  if (jobCompleted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '40px 20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,192,122,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle2 size={44} color="var(--green)" />
        </div>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 30, fontWeight: 900, color: 'var(--green)', margin: 0 }}>
          Job Complete!
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', margin: 0 }}>
          {customerName} — {wrapType} has been moved to QC review. The team has been notified.
        </p>
        <button onClick={onBack} style={{ ...btnPrimary, marginTop: 8 }}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        style={{ display: 'none' }}
      />

      {/* Back */}
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: 'var(--accent)',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '0 0 4px',
      }}>
        <ChevronLeft size={16} /> Back to list
      </button>

      {/* ━━ 1. JOB HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={card}>
        {/* Contract banner - always visible at top */}
        {contractStatus === 'unsigned' && (
          <div style={{
            background: 'rgba(242,90,90,0.12)', borderBottom: '1px solid rgba(242,90,90,0.3)',
            padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Lock size={18} color="var(--red)" />
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--red)' }}>
                CONTRACT NOT SIGNED — CANNOT START
              </div>
              <div style={{ fontSize: 11, color: 'rgba(242,90,90,0.8)' }}>
                Awaiting customer signature before work can begin
              </div>
            </div>
          </div>
        )}
        {contractStatus === 'signed' && (
          <div style={{
            background: 'rgba(34,192,122,0.08)', borderBottom: '1px solid rgba(34,192,122,0.2)',
            padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Unlock size={16} color="var(--green)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
              Contract verified — cleared to proceed
              {contractSignedAt && ` · ${new Date(contractSignedAt).toLocaleDateString()}`}
            </span>
          </div>
        )}

        <div style={{ padding: '16px 18px' }}>
          {/* Vehicle + customer */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: 22, fontWeight: 900, color: 'var(--text1)',
                  }}>
                    {fd.vehicle_year || ''} {fd.vehicle_make || ''} {fd.vehicle_model || job.vehicle_desc || ''}
                  </span>
                  {fd.vehicle_color && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                      background: 'var(--surface2)', color: 'var(--text2)',
                    }}>{fd.vehicle_color}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 2 }}>
                  {customerName}
                  {customerPhone && (
                    <a
                      href={`tel:${customerPhone}`}
                      style={{
                        marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: 'var(--accent)', textDecoration: 'none', fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <Phone size={12} /> {customerPhone}
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{wrapType}</div>
              </div>
              {/* Division badge */}
              <span style={{
                fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 6, flexShrink: 0,
                background: 'rgba(79,127,255,0.12)', color: 'var(--accent)',
                textTransform: 'uppercase' as const, letterSpacing: '0.05em',
              }}>{division}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Install Date</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                {job.install_date
                  ? new Date(job.install_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'TBD'}
              </div>
              {fd.install_time_slot && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{fd.install_time_slot}</div>
              )}
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 2 }}>Est. Hours</div>
              <div style={{
                fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: isTimerActive ? timerStatusColor : 'var(--text1)',
              }}>
                {estHours}h est
                {isTimerActive && <span style={{ color: timerStatusColor }}> / {elapsedHours.toFixed(1)}h actual</span>}
              </div>
            </div>
          </div>

          {/* Location block */}
          {(installAddr || accessCode || accessInstructions || siteContact) && (
            <div style={{
              background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 8 }}>
                Location Details
              </div>
              {installAddr && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(installAddr)}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                    marginBottom: accessCode || accessInstructions || siteContact ? 8 : 0,
                  }}
                >
                  <MapPin size={14} /> {installAddr}
                </a>
              )}
              {accessCode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Lock size={13} color="var(--amber)" />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase' as const }}>Access Code</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 900, color: 'var(--text1)', letterSpacing: '0.15em' }}>
                      {accessCode}
                    </div>
                  </div>
                </div>
              )}
              {accessInstructions && (
                <div style={{ marginBottom: siteContact ? 6 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 3 }}>Instructions</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{accessInstructions}</div>
                </div>
              )}
              {siteContact && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>On-site contact:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{siteContact}</span>
                  {siteContactPhone && (
                    <a href={`tel:${siteContactPhone}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Phone size={11} /> {siteContactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ━━ 2. RACE TRACK PROGRESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ ...card, padding: '14px 18px' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 10 }}>
          Pipeline Progress — {pipelinePct}%
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {PIPELINE_STAGES.map((s, i) => {
            const isPast = i < currentStageIdx
            const isCurrent = i === currentStageIdx
            const isFuture = i > currentStageIdx
            return (
              <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: 6, borderRadius: 3,
                  background: isPast ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--surface2)',
                  position: 'relative' as const,
                  boxShadow: isCurrent ? '0 0 8px rgba(79,127,255,0.5)' : 'none',
                }} />
                <span style={{
                  fontSize: 9, fontWeight: isCurrent ? 900 : 600,
                  color: isPast ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--text3)',
                  textTransform: 'uppercase' as const,
                }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        {/* Installer checkpoints */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
          {[
            { label: 'Pre-check', done: preCheckComplete },
            { label: 'Before Photos', done: beforeComplete },
            { label: 'Clocked In', done: isTimerActive },
            { label: 'After Photos', done: afterComplete },
          ].map(cp => (
            <div key={cp.label} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 5,
              background: cp.done ? 'rgba(34,192,122,0.1)' : 'var(--surface2)',
              border: `1px solid ${cp.done ? 'rgba(34,192,122,0.2)' : 'transparent'}`,
            }}>
              {cp.done
                ? <CheckCircle2 size={11} color="var(--green)" />
                : <Circle size={11} color="var(--text3)" />}
              <span style={{ fontSize: 10, fontWeight: 700, color: cp.done ? 'var(--green)' : 'var(--text3)' }}>
                {cp.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ━━ 3. PRE-INSTALL INSPECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={card}>
        <SectionHeader
          id="pre"
          icon={<Shield size={16} />}
          title="Pre-Install Inspection"
          badge={`${Object.values(preCheck).filter(Boolean).length}/${PRE_INSTALL_ITEMS.length}`}
          warn={!preCheckComplete && isTimerActive}
        />
        {open('pre') && (
          <div style={{ padding: '14px 18px' }}>
            {!preCheckComplete && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                fontSize: 12, color: 'var(--amber)', fontWeight: 600,
              }}>
                Complete all items before clocking in
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {PRE_INSTALL_ITEMS.map(item => (
                <label key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, cursor: 'pointer',
                  background: preCheck[item.id] ? 'rgba(34,192,122,0.06)' : 'var(--surface2)',
                  border: `1px solid ${preCheck[item.id] ? 'rgba(34,192,122,0.15)' : 'transparent'}`,
                  transition: 'background 0.15s',
                }}>
                  <input
                    type="checkbox"
                    checked={!!preCheck[item.id]}
                    onChange={() => setPreCheck(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    style={{ width: 18, height: 18, accentColor: '#22c07a', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 13, fontWeight: preCheck[item.id] ? 600 : 500,
                    color: preCheck[item.id] ? 'var(--green)' : 'var(--text2)',
                    textDecoration: preCheck[item.id] ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            {preCheckComplete && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.2)',
                fontSize: 12, color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <CheckCircle2 size={14} /> Pre-install inspection complete — cleared to clock in
              </div>
            )}
          </div>
        )}
      </div>

      {/* ━━ 4. GPS CHECK-IN + TIME CLOCK ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={card}>
        <SectionHeader id="gps" icon={<Timer size={16} />} title="GPS Check-In & Time Clock" />
        {open('gps') && (
          <div style={{ padding: '14px 18px' }}>
            {/* Contract hard gate */}
            {contractStatus === 'unsigned' && (
              <div style={{
                padding: '14px', borderRadius: 10, marginBottom: 14,
                background: 'rgba(242,90,90,0.08)', border: '2px solid rgba(242,90,90,0.3)',
                textAlign: 'center' as const,
              }}>
                <Lock size={28} color="var(--red)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--red)', marginBottom: 4 }}>
                  LOCKED — Contract Not Signed
                </div>
                <div style={{ fontSize: 12, color: 'rgba(242,90,90,0.7)' }}>
                  Cannot clock in until customer signs the contract
                </div>
              </div>
            )}

            {contractStatus !== 'unsigned' && (
              <>
                {/* GPS check-in */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    GPS Verification
                  </div>
                  {gpsStatus === 'idle' && (
                    <button onClick={handleGPSCheckin} style={{
                      width: '100%', padding: '12px', borderRadius: 10, border: '1px dashed var(--border)',
                      background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <Navigation size={16} /> Verify Location (GPS)
                    </button>
                  )}
                  {gpsStatus === 'checking' && (
                    <div style={{ textAlign: 'center' as const, padding: 12, color: 'var(--amber)', fontSize: 13 }}>
                      Getting your location...
                    </div>
                  )}
                  {gpsStatus === 'verified' && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 8,
                      background: 'rgba(34,192,122,0.08)', border: '1px solid rgba(34,192,122,0.2)',
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)', fontWeight: 700,
                    }}>
                      <CheckCircle2 size={16} />
                      GPS verified — on site
                      {gpsDistance !== null && <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 11 }}>
                        ({Math.round(gpsDistance * 3.28084)}ft from site)
                      </span>}
                    </div>
                  )}
                  {gpsStatus === 'failed' && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)',
                        fontSize: 12, color: 'var(--red)',
                      }}>
                        {gpsError}
                      </div>
                      <button onClick={handleGPSCheckin} style={{
                        padding: '8px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--surface2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
                      }}>
                        Try Again
                      </button>
                    </div>
                  )}
                </div>

                {/* Timer display */}
                <div style={{
                  display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12, padding: '12px 0',
                }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 48, fontWeight: 900, letterSpacing: '0.04em',
                    color: isTimerActive ? timerStatusColor : 'var(--text3)',
                    textShadow: isTimerActive && !timer.paused ? `0 0 20px ${timerStatusColor}40` : 'none',
                    transition: 'color 0.3s',
                  }}>
                    {isTimerActive ? formatTimer(timer.elapsed) : '00:00:00'}
                  </div>

                  {isTimerActive && estHours > 0 && (
                    <div style={{ width: '100%', maxWidth: 280 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
                        <span>0h</span>
                        <span style={{ color: timerStatusColor, fontWeight: 700 }}>
                          {elapsedHours.toFixed(1)}h / {estHours}h est
                        </span>
                        <span>{estHours}h</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' as const }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${Math.min(100, pct)}%`,
                          background: timerStatusColor,
                          transition: 'width 1s, background 0.5s',
                        }} />
                      </div>
                      <div style={{ textAlign: 'center' as const, fontSize: 11, marginTop: 4, color: timerStatusColor, fontWeight: 700 }}>
                        {pct < 75 ? 'On track' : pct < 100 ? 'Nearing time limit' : 'Over estimate'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' as const }}>
                  {!isTimerActive ? (
                    <>
                      {installLat && installLng && gpsStatus !== 'verified' ? (
                        <div style={{ textAlign: 'center' as const }}>
                          <div style={{
                            padding: '10px 20px', borderRadius: 10,
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                            fontSize: 12, color: 'var(--amber)', fontWeight: 700, marginBottom: 8,
                          }}>
                            Verify GPS location above before clocking in
                          </div>
                          <button
                            onClick={handleGPSCheckin}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
                              padding: '12px 28px', borderRadius: 10, border: 'none',
                              background: 'var(--amber)', color: '#1a1400',
                              fontSize: 14, fontWeight: 900, cursor: 'pointer',
                              fontFamily: 'Barlow Condensed, sans-serif',
                            }}
                          >
                            <Navigation size={16} /> {gpsStatus === 'checking' ? 'Getting location...' : 'Verify Location'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onStartTimer(jobId)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '14px 36px', borderRadius: 12, border: 'none',
                            background: 'var(--green)',
                            color: '#0d1a10',
                            fontSize: 15, fontWeight: 900, cursor: 'pointer',
                            fontFamily: 'Barlow Condensed, sans-serif',
                          }}
                        >
                          <Play size={18} /> Clock In
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {!timer.paused ? (
                        <button onClick={onPauseTimer} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '12px 24px', borderRadius: 10, border: 'none',
                          background: 'var(--amber)', color: '#1a1400',
                          fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        }}>
                          <Pause size={16} /> Break
                        </button>
                      ) : (
                        <button onClick={onResumeTimer} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '12px 24px', borderRadius: 10, border: 'none',
                          background: 'var(--green)', color: '#0d1a10',
                          fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        }}>
                          <Play size={16} /> Resume
                        </button>
                      )}
                      <button onClick={onStopTimer} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 24px', borderRadius: 10, border: 'none',
                        background: 'var(--red)', color: '#fff',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      }}>
                        <Square size={16} /> Clock Out
                      </button>
                    </>
                  )}
                </div>

                {timer.paused && (
                  <div style={{ textAlign: 'center' as const, marginTop: 8, fontSize: 12, color: 'var(--amber)', fontWeight: 600 }}>
                    On break — timer paused
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ━━ 5. PHOTO CHECKLIST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={card}>
        <SectionHeader
          id="photos"
          icon={<Camera size={16} />}
          title="Photo Checklist"
          badge={`${PHOTO_ITEMS.filter(p => p.required && photoStatus[p.id]).length}/${PHOTO_ITEMS.filter(p => p.required).length} req`}
        />
        {open('photos') && (
          <div style={{ padding: '14px 18px' }}>
            {/* Phase tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['before', 'during', 'after'] as const).map(ph => {
                const items = PHOTO_ITEMS.filter(p => p.phase === ph)
                const done = items.filter(p => photoStatus[p.id]).length
                const colors = { before: 'var(--accent)', during: 'var(--cyan)', after: 'var(--green)' }
                return (
                  <button key={ph} onClick={() => setActivePhotoPhase(ph)} style={{
                    flex: 1, padding: '8px 6px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: activePhotoPhase === ph ? 800 : 600,
                    background: activePhotoPhase === ph ? `rgba(79,127,255,0.1)` : 'var(--surface2)',
                    color: activePhotoPhase === ph ? colors[ph] : 'var(--text3)',
                    textTransform: 'capitalize' as const,
                  }}>
                    {ph}
                    <span style={{ marginLeft: 4, fontSize: 10, color: done === items.length ? 'var(--green)' : 'var(--text3)' }}>
                      {done}/{items.length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Required label */}
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              Tap camera icon to capture. Required photos marked with *
            </div>

            {/* Photo items */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {PHOTO_ITEMS.filter(p => p.phase === activePhotoPhase).map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: photoStatus[item.id] ? 'rgba(34,192,122,0.06)' : 'var(--surface2)',
                  border: `1px solid ${photoStatus[item.id] ? 'rgba(34,192,122,0.15)' : item.required ? 'rgba(79,127,255,0.1)' : 'transparent'}`,
                }}>
                  {photoStatus[item.id]
                    ? <CheckCircle2 size={18} color="var(--green)" style={{ flexShrink: 0 }} />
                    : <Circle size={18} color="var(--text3)" style={{ flexShrink: 0 }} />}
                  <span style={{
                    flex: 1, fontSize: 13,
                    color: photoStatus[item.id] ? 'var(--green)' : 'var(--text1)',
                    fontWeight: item.required ? 600 : 400,
                    textDecoration: photoStatus[item.id] ? 'line-through' : 'none',
                  }}>
                    {item.label}{item.required ? ' *' : ''}
                  </span>
                  <button
                    onClick={() => triggerPhotoUpload(item.id)}
                    disabled={uploadingPhoto}
                    style={{
                      width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: photoStatus[item.id] ? 'rgba(34,192,122,0.12)' : 'rgba(79,127,255,0.12)',
                      color: photoStatus[item.id] ? 'var(--green)' : 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <Camera size={15} />
                  </button>
                </div>
              ))}
            </div>

            {activePhotoPhase === 'before' && beforeComplete && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(34,192,122,0.08)', fontSize: 12, color: 'var(--green)', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <CheckCircle2 size={14} /> All required before photos captured
              </div>
            )}
            {activePhotoPhase === 'after' && afterComplete && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: 'rgba(34,192,122,0.08)', fontSize: 12, color: 'var(--green)', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <CheckCircle2 size={14} /> All required after photos captured
              </div>
            )}
          </div>
        )}
      </div>

      {/* ━━ 6. ISSUE FLAGGING (always-visible button + section) ━━━━━ */}
      <div style={card}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TriangleAlert size={18} color="var(--red)" />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--text1)' }}>
              Issues
            </span>
            {issues.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                background: 'rgba(242,90,90,0.15)', color: 'var(--red)',
              }}>{issues.length}</span>
            )}
          </div>
          <button
            onClick={() => setShowIssueModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--red)', color: '#fff', fontWeight: 900, fontSize: 13,
            }}
          >
            <Flag size={14} /> Flag Issue
          </button>
        </div>
        {issues.length > 0 && (
          <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {issues.map(issue => {
              const urgencyColors: Record<string, string> = {
                low: 'var(--text3)', medium: 'var(--amber)', high: 'var(--red)', critical: 'var(--red)',
              }
              const statusBg: Record<string, string> = {
                open: 'rgba(242,90,90,0.1)', in_progress: 'rgba(245,158,11,0.1)', resolved: 'rgba(34,192,122,0.1)',
              }
              return (
                <div key={issue.id} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: statusBg[issue.status] || 'var(--surface2)',
                  borderLeft: `3px solid ${urgencyColors[issue.urgency] || 'var(--text3)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 900, color: urgencyColors[issue.urgency], textTransform: 'uppercase' as const }}>
                        {issue.urgency}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                        {issue.issue_type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--surface2)', color: 'var(--text3)', textTransform: 'uppercase' as const,
                    }}>{issue.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, lineHeight: 1.4 }}>
                    {issue.description}
                  </div>
                  {issue.manager_response && (
                    <div style={{ marginTop: 6, padding: '6px 8px', background: 'rgba(79,127,255,0.08)', borderRadius: 5, fontSize: 11, color: 'var(--accent)' }}>
                      Manager: {issue.manager_response}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                    {new Date(issue.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ━━ 7. MATERIAL USAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={card}>
        <SectionHeader
          id="materials"
          icon={<Package size={16} />}
          title="Material Usage"
          badge={materials.length > 0 ? `${materials.length} logged` : undefined}
        />
        {open('materials') && (
          <div style={{ padding: '14px 18px' }}>
            {!showMaterialForm ? (
              <button onClick={() => setShowMaterialForm(true)} style={{
                width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed var(--border)',
                background: 'transparent', color: 'var(--accent)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: materials.length > 0 ? 14 : 0,
              }}>
                <Plus size={15} /> Log Material Usage
              </button>
            ) : (
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Vinyl Type</label>
                    <select value={matVinylType} onChange={e => setMatVinylType(e.target.value)} style={inputStyle}>
                      <option value="">Select...</option>
                      {VINYL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Color / SKU</label>
                    <input value={matVinylColor} onChange={e => setMatVinylColor(e.target.value)} placeholder="e.g. Gloss Black" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Linear Ft Used</label>
                    <input type="number" value={matLinFt} onChange={e => setMatLinFt(e.target.value)} placeholder="0.0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Sq Ft Used</label>
                    <input type="number" value={matSqFt} onChange={e => setMatSqFt(e.target.value)} placeholder="0.0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Est. Sq Ft (from job)</label>
                    <input type="number" value={matEstSq} onChange={e => setMatEstSq(e.target.value)} placeholder="0.0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Leftover Sq Ft</label>
                    <input type="number" value={matLeftoverSq} onChange={e => setMatLeftoverSq(e.target.value)} placeholder="0.0" style={inputStyle} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={matLaminate} onChange={e => setMatLaminate(e.target.checked)} style={{ accentColor: '#22c07a' }} />
                  <span style={{ color: 'var(--text2)' }}>Laminate used</span>
                  {matLaminate && (
                    <input
                      type="number" value={matLaminateSq} onChange={e => setMatLaminateSq(e.target.value)}
                      placeholder="sq ft" style={{ ...inputStyle, width: 90, display: 'inline-block' }}
                    />
                  )}
                </label>
                <textarea
                  value={matNotes} onChange={e => setMatNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const, marginBottom: 10 }}
                />
                {/* Waste indicator */}
                {matSqFt && matEstSq && parseFloat(matEstSq) > 0 && (
                  <div style={{
                    padding: '6px 10px', borderRadius: 6, marginBottom: 10, fontSize: 12,
                    background: ((parseFloat(matSqFt) - parseFloat(matEstSq)) / parseFloat(matEstSq) * 100) > 15
                      ? 'rgba(242,90,90,0.1)' : 'rgba(34,192,122,0.08)',
                    color: ((parseFloat(matSqFt) - parseFloat(matEstSq)) / parseFloat(matEstSq) * 100) > 15
                      ? 'var(--red)' : 'var(--green)',
                    fontWeight: 700,
                  }}>
                    Waste: {(((parseFloat(matSqFt) - parseFloat(matEstSq)) / parseFloat(matEstSq)) * 100).toFixed(1)}%
                    {(((parseFloat(matSqFt) - parseFloat(matEstSq)) / parseFloat(matEstSq) * 100)) > 15 && ' — Over 15%, PM will be notified'}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowMaterialForm(false)} style={{
                    padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Cancel</button>
                  <button onClick={saveMaterial} disabled={savingMaterial} style={{ ...btnPrimary, flex: 1 }}>
                    {savingMaterial ? 'Saving...' : 'Save Material Log'}
                  </button>
                </div>
              </div>
            )}
            {materials.map(m => (
              <div key={m.id} style={{
                padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)', marginBottom: 6,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {m.vinyl_type || 'Vinyl'} {m.vinyl_color ? `— ${m.vinyl_color}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {m.sq_ft_used ? `${m.sq_ft_used} sq ft` : ''}{m.linear_feet_used ? ` · ${m.linear_feet_used} lin ft` : ''}
                    {m.laminate_used ? ' · Laminate' : ''}
                  </div>
                </div>
                {m.waste_percentage != null && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                    background: m.waste_percentage > 15 ? 'rgba(242,90,90,0.1)' : 'rgba(34,192,122,0.1)',
                    color: m.waste_percentage > 15 ? 'var(--red)' : 'var(--green)',
                  }}>
                    {m.waste_percentage.toFixed(1)}% waste
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━ 8. INSTALLER NOTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={card}>
        <SectionHeader
          id="notes"
          icon={<FileText size={16} />}
          title="Installer Notes"
          badge={notes.length > 0 ? `${notes.length}` : undefined}
        />
        {open('notes') && (
          <div style={{ padding: '14px 18px' }}>
            {/* Tag selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
              {NOTE_TAGS.map(t => (
                <button key={t.value} onClick={() => setNoteTag(t.value)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: noteTag === t.value ? 'rgba(79,127,255,0.15)' : 'var(--surface2)',
                  color: noteTag === t.value ? t.color : 'var(--text3)',
                }}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Text input */}
            <div style={{ position: 'relative' as const, marginBottom: 10 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={listening ? 'Listening... speak your note' : 'Type a note or use voice input...'}
                style={{
                  ...inputStyle, minHeight: 80, resize: 'vertical' as const, paddingRight: 44,
                  borderColor: listening ? 'var(--red)' : 'var(--border)',
                }}
              />
              <button onClick={toggleVoice} style={{
                position: 'absolute' as const, right: 8, top: 8,
                width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: listening ? 'rgba(242,90,90,0.15)' : 'var(--surface2)',
                color: listening ? 'var(--red)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
            </div>
            <button onClick={saveNote} disabled={savingNote || !noteText.trim()} style={{
              ...btnPrimary, width: '100%', opacity: !noteText.trim() ? 0.5 : 1,
              marginBottom: notes.length > 0 ? 14 : 0,
            }}>
              <Send size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              {savingNote ? 'Saving...' : 'Save Note'}
            </button>
            {/* Note history */}
            {notes.map(n => {
              const tag = NOTE_TAGS.find(t => t.value === n.note_tag)
              return (
                <div key={n.id} style={{
                  padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)',
                  borderLeft: `3px solid ${tag?.color || 'var(--text3)'}`, marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: tag?.color || 'var(--text3)', textTransform: 'uppercase' as const }}>
                      {tag?.label || n.note_tag}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{n.note_text}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ━━ 9. MILEAGE TRACKING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={card}>
        <SectionHeader
          id="mileage"
          icon={<Route size={16} />}
          title="Mileage Tracking"
          badge={mileageLog.length > 0
            ? `${mileageLog.reduce((s, m) => s + (m.miles || 0), 0).toFixed(1)} mi`
            : undefined}
        />
        {open('mileage') && (
          <div style={{ padding: '14px 18px' }}>
            {!showMileageForm ? (
              <button onClick={() => setShowMileageForm(true)} style={{
                width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed var(--border)',
                background: 'transparent', color: 'var(--accent)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: mileageLog.length > 0 ? 14 : 0,
              }}>
                <Plus size={15} /> Log Drive
              </button>
            ) : (
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>From</label>
                    <input value={mileFrom} onChange={e => setMileFrom(e.target.value)} placeholder="Starting address or location" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>To</label>
                    <input value={mileTo} onChange={e => setMileTo(e.target.value)} placeholder={installAddr || 'Job site address'} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Miles</label>
                    <input type="number" step="0.1" value={mileMiles} onChange={e => setMileMiles(e.target.value)} placeholder="0.0" style={inputStyle} />
                  </div>
                  <div style={{ paddingTop: 18 }}>
                    {mileMiles && (
                      <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
                        ≈ ${(parseFloat(mileMiles) * 0.67).toFixed(2)} reimbursement
                      </div>
                    )}
                  </div>
                </div>
                <textarea value={mileNotes} onChange={e => setMileNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...inputStyle, minHeight: 50, resize: 'vertical' as const, marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowMileageForm(false)} style={{
                    padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Cancel</button>
                  <button onClick={saveMileage} disabled={savingMileage || !mileMiles} style={{ ...btnPrimary, flex: 1, opacity: !mileMiles ? 0.5 : 1 }}>
                    {savingMileage ? 'Saving...' : 'Log Drive'}
                  </button>
                </div>
              </div>
            )}
            {mileageLog.map(m => (
              <div key={m.id} style={{
                padding: '10px 12px', borderRadius: 8, background: 'var(--surface2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                    {m.from_address ? `${m.from_address} → ${m.to_address || 'Job site'}` : 'Drive logged'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {m.trip_date} · {m.miles} miles
                  </div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                    ${m.reimbursement_amount?.toFixed(2) || '0.00'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase' as const }}>
                    {m.reimbursement_status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━ COMPLETE JOB BUTTON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {job.pipe_stage === 'install' && (
        <button
          onClick={() => setShowCompletion(true)}
          style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--green), #16a34a)',
            color: '#0d1a10', fontSize: 17, fontWeight: 900,
            fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.03em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <CheckCircle2 size={20} /> Mark Install Complete
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ISSUE FLAG MODAL                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showIssueModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowIssueModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480,
              padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto' as const,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TriangleAlert size={20} color="var(--red)" />
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--red)', margin: 0 }}>
                  Flag Issue
                </h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Urgency */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>URGENCY</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { value: 'low', label: 'Low', color: 'var(--text2)' },
                  { value: 'medium', label: 'Medium', color: 'var(--amber)' },
                  { value: 'high', label: 'High', color: 'var(--red)' },
                  { value: 'critical', label: 'Critical', color: 'var(--red)' },
                ].map(u => (
                  <button key={u.value} onClick={() => setIssueUrgency(u.value)} style={{
                    padding: '10px 6px', borderRadius: 8, border: `2px solid ${issueUrgency === u.value ? u.color : 'var(--border)'}`,
                    background: issueUrgency === u.value ? `rgba(${u.value === 'critical' || u.value === 'high' ? '242,90,90' : u.value === 'medium' ? '245,158,11' : '100,100,100'},0.1)` : 'var(--surface2)',
                    color: issueUrgency === u.value ? u.color : 'var(--text3)',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    textTransform: 'uppercase' as const,
                  }}>
                    {u.label}
                  </button>
                ))}
              </div>
              {issueUrgency === 'critical' && (
                <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>
                  Critical issues instantly notify production manager and owner. Job will be auto-paused.
                </div>
              )}
            </div>

            {/* Issue type */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>ISSUE TYPE</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ISSUE_TYPES.map(t => (
                  <button key={t.value} onClick={() => setIssueType(t.value)} style={{
                    padding: '10px 12px', borderRadius: 8, border: `1px solid ${issueType === t.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: issueType === t.value ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                    color: issueType === t.value ? 'var(--accent)' : 'var(--text2)',
                    fontSize: 13, fontWeight: issueType === t.value ? 700 : 500, cursor: 'pointer',
                    textAlign: 'left' as const,
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 8 }}>
                DESCRIPTION (required)
              </label>
              <textarea
                value={issueDesc}
                onChange={e => setIssueDesc(e.target.value)}
                placeholder="Describe the issue in detail..."
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical' as const }}
              />
            </div>

            <button
              onClick={submitIssue}
              disabled={submittingIssue || !issueType || !issueDesc.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: issueType && issueDesc.trim() ? 'var(--red)' : 'var(--surface2)',
                color: issueType && issueDesc.trim() ? '#fff' : 'var(--text3)',
                fontSize: 15, fontWeight: 900, cursor: issueType && issueDesc.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              {submittingIssue ? 'Submitting...' : `Submit ${issueUrgency === 'critical' ? 'CRITICAL ' : ''}Issue`}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  JOB COMPLETION FLOW MODAL                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showCompletion && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, overflowY: 'auto' as const }}
          onClick={e => { if (e.target === e.currentTarget) setShowCompletion(false) }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, margin: '20px auto', maxWidth: 480, padding: 24,
          }}>
            {/* Steps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
              {['Final Photos', 'Materials', 'Quality', 'Customer Sign-off', 'Rating'].map((s, i) => (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', border: `2px solid ${i <= completionStep ? 'var(--green)' : 'var(--border)'}`,
                    background: i < completionStep ? 'var(--green)' : i === completionStep ? 'rgba(34,192,122,0.1)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 900,
                    color: i <= completionStep ? (i < completionStep ? '#0d1a10' : 'var(--green)') : 'var(--text3)',
                  }}>
                    {i < completionStep ? <Check size={14} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 8, color: i === completionStep ? 'var(--green)' : 'var(--text3)', textAlign: 'center' as const, fontWeight: 700, textTransform: 'uppercase' as const }}>
                    {s}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 0: Final photo check */}
            {completionStep === 0 && (
              <div>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', margin: '0 0 12px' }}>
                  Final Photo Checklist
                </h3>
                {!afterComplete && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 14, fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
                    Required after-photos not yet complete. Capture them before completing.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 20 }}>
                  {PHOTO_ITEMS.filter(p => p.phase === 'after').map(item => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                      background: photoStatus[item.id] ? 'rgba(34,192,122,0.06)' : 'var(--surface2)',
                    }}>
                      {photoStatus[item.id]
                        ? <CheckCircle2 size={16} color="var(--green)" />
                        : item.required ? <Circle size={16} color="var(--red)" /> : <Circle size={16} color="var(--text3)" />}
                      <span style={{ flex: 1, fontSize: 13, color: photoStatus[item.id] ? 'var(--green)' : item.required ? 'var(--red)' : 'var(--text2)' }}>
                        {item.label}{item.required ? ' *' : ''}
                      </span>
                      {!photoStatus[item.id] && (
                        <button onClick={() => { triggerPhotoUpload(item.id); setShowCompletion(false) }} style={{
                          padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'rgba(79,127,255,0.1)', color: 'var(--accent)', fontSize: 11, fontWeight: 700,
                        }}>
                          Capture
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowCompletion(false)} style={{
                    padding: '11px 20px', borderRadius: 9, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Cancel</button>
                  <button onClick={() => setCompletionStep(1)} style={{ ...btnPrimary, flex: 1 }}>
                    {afterComplete ? 'Continue' : 'Skip (not recommended)'} <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Materials */}
            {completionStep === 1 && (
              <div>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', margin: '0 0 12px' }}>
                  Material Usage
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                  {materials.length > 0
                    ? `${materials.length} material log(s) recorded. Add more or continue.`
                    : 'No material logged yet. Log materials before completing.'}
                </p>
                {materials.length > 0 && materials.slice(0, 2).map(m => (
                  <div key={m.id} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>
                    {m.vinyl_type} {m.vinyl_color} — {m.sq_ft_used} sq ft used
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setCompletionStep(0)} style={{
                    padding: '11px 20px', borderRadius: 9, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Back</button>
                  <button onClick={() => setCompletionStep(2)} style={{ ...btnPrimary, flex: 1 }}>
                    Continue <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Quality checklist */}
            {completionStep === 2 && (
              <div>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', margin: '0 0 16px' }}>
                  Quality Checklist
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 20 }}>
                  {QUALITY_ITEMS.map(item => (
                    <label key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      borderRadius: 10, cursor: 'pointer',
                      background: qualityCheck[item.id] ? 'rgba(34,192,122,0.08)' : 'var(--surface2)',
                      border: `1px solid ${qualityCheck[item.id] ? 'rgba(34,192,122,0.2)' : 'transparent'}`,
                    }}>
                      <input
                        type="checkbox"
                        checked={!!qualityCheck[item.id]}
                        onChange={() => setQualityCheck(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        style={{ width: 20, height: 20, accentColor: '#22c07a', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{
                        fontSize: 14, fontWeight: qualityCheck[item.id] ? 600 : 500,
                        color: qualityCheck[item.id] ? 'var(--green)' : 'var(--text1)',
                        textDecoration: qualityCheck[item.id] ? 'line-through' : 'none',
                      }}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setCompletionStep(1)} style={{
                    padding: '11px 20px', borderRadius: 9, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Back</button>
                  <button onClick={() => setCompletionStep(3)} disabled={!qualityComplete} style={{
                    ...btnPrimary, flex: 1, opacity: !qualityComplete ? 0.5 : 1,
                    cursor: !qualityComplete ? 'not-allowed' : 'pointer',
                  }}>
                    Continue <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Customer sign-off */}
            {completionStep === 3 && (
              <div>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', margin: '0 0 8px' }}>
                  Customer Sign-Off
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
                  Have {customerName} sign below to confirm they approve the completed installation.
                </p>
                <div style={{
                  border: '2px solid var(--border)', borderRadius: 12,
                  background: 'var(--surface2)', overflow: 'hidden' as const, marginBottom: 12, position: 'relative' as const,
                }}>
                  <canvas
                    ref={signCanvasRef}
                    width={500} height={180}
                    style={{ width: '100%', height: 180, cursor: 'crosshair', touchAction: 'none' as const, display: 'block' }}
                    onMouseDown={startSign} onMouseMove={drawSign} onMouseUp={endSign} onMouseLeave={endSign}
                    onTouchStart={startSign} onTouchMove={drawSign} onTouchEnd={endSign}
                  />
                  {!signatureData && (
                    <div style={{
                      position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      color: 'var(--text3)', fontSize: 14, pointerEvents: 'none' as const, opacity: 0.5,
                    }}>
                      Sign here
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={clearSign} style={{
                    padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Clear</button>
                  <button onClick={() => setCompletionStep(2)} style={{
                    padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Back</button>
                  <button onClick={() => setCompletionStep(4)} style={{ ...btnPrimary, flex: 1 }}>
                    {signatureData ? 'Continue' : 'Skip Signature'} <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Installer rating */}
            {completionStep === 4 && (
              <div>
                <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', margin: '0 0 12px' }}>
                  Rate Job Difficulty
                </h3>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setDiffRating(n)} style={{
                      width: 48, height: 48, borderRadius: 10, border: `2px solid ${diffRating >= n ? 'var(--amber)' : 'var(--border)'}`,
                      background: diffRating >= n ? 'rgba(245,158,11,0.12)' : 'var(--surface2)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Star size={22} color={diffRating >= n ? 'var(--amber)' : 'var(--text3)'} fill={diffRating >= n ? 'var(--amber)' : 'none'} />
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center' as const, marginBottom: 16, fontSize: 12, color: 'var(--text3)' }}>
                  {['', 'Easy', 'Below Average', 'Average', 'Challenging', 'Very Difficult'][diffRating]}
                </div>
                <textarea
                  value={diffNotes}
                  onChange={e => setDiffNotes(e.target.value)}
                  placeholder="Any notes about this job for future installers..."
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const, marginBottom: 20 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setCompletionStep(3)} style={{
                    padding: '11px 20px', borderRadius: 9, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                  }}>Back</button>
                  <button
                    onClick={completeJob}
                    disabled={completing}
                    style={{
                      flex: 1, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, var(--green), #16a34a)',
                      color: '#0d1a10', fontSize: 16, fontWeight: 900,
                      fontFamily: 'Barlow Condensed, sans-serif', opacity: completing ? 0.7 : 1,
                    }}
                  >
                    {completing ? 'Completing...' : 'Complete Job'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
