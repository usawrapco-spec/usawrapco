'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Pin, Pencil, ArrowRight, Square, Type, Eraser, Trash2, Mic,
  Video, Check, CheckSquare, X, ChevronDown,
  ChevronUp, Plus, Play, Pause, Send,
  ListChecks, StopCircle, Loader2, Volume2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface DesignPin {
  id: string
  design_project_id: string
  layer: 'customer' | 'designer' | 'manager'
  x_pct: number
  y_pct: number
  content: string
  author_id: string
  author_name: string
  author_avatar?: string
  pin_number: number
  resolved: boolean
  created_at: string
  replies?: DesignPinReply[]
}
interface DesignPinReply {
  id: string
  pin_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}
interface DesignMarkup {
  id: string
  design_project_id: string
  layer: 'customer' | 'designer' | 'manager'
  markup_type: 'draw' | 'arrow' | 'rect' | 'text'
  data: any
  color: string
  stroke_width?: number
  created_by: string
  created_at: string
}
interface DesignVoiceNote {
  id: string
  design_project_id: string
  pin_id?: string
  layer: string
  audio_url: string
  transcript?: string
  duration_seconds?: number
  created_at: string
}
interface DesignVideoWalkthrough {
  id: string
  design_project_id: string
  title?: string
  video_url: string
  duration_seconds?: number
  created_at: string
}
interface DesignInstruction {
  id: string
  design_project_id: string
  title: string
  created_by: string
  created_at: string
  created_by_profile?: { name: string }
  items?: DesignInstructionItem[]
}
interface DesignInstructionItem {
  id: string
  instruction_id: string
  text: string
  assigned_to?: string
  completed_by?: string
  completed_at?: string
  approved_by?: string
  approved_at?: string
  sort_order: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const LAYER_CFG = {
  customer: { label: 'Customer', color: '#4f7fff', bg: 'rgba(79,127,255,0.15)', border: 'rgba(79,127,255,0.4)' },
  designer: { label: 'Designer', color: '#22c07a', bg: 'rgba(34,192,122,0.15)', border: 'rgba(34,192,122,0.4)' },
  manager:  { label: 'Manager',  color: '#f25a5a', bg: 'rgba(242,90,90,0.15)',  border: 'rgba(242,90,90,0.4)'  },
} as const

type LayerKey = 'customer' | 'designer' | 'manager'
type AnnotMode = 'none' | 'pin' | 'draw' | 'arrow' | 'rect' | 'text' | 'erase'

function getDefaultLayer(role: string): LayerKey {
  if (role === 'designer') return 'designer'
  if (['owner', 'admin', 'production'].includes(role)) return 'manager'
  return 'customer'
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface AnnotationSystemProps {
  designProjectId: string
  profile: Profile
  canvasContainerRef: React.RefObject<HTMLDivElement>
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AnnotationSystem({ designProjectId, profile, canvasContainerRef }: AnnotationSystemProps) {
  const supabase = createClient()

  // ── Layer visibility + opacity
  const [layerVisible, setLayerVisible] = useState<Record<LayerKey, boolean>>({ customer: true, designer: true, manager: true })
  const [layerOpacity, setLayerOpacity] = useState<Record<LayerKey, number>>({ customer: 100, designer: 100, manager: 100 })
  const [activeLayer, setActiveLayer] = useState<LayerKey>(() => getDefaultLayer(profile.role))
  const [annotMode, setAnnotMode] = useState<AnnotMode>('none')
  const [showToolbar, setShowToolbar] = useState(true)

  // ── Pins
  const [pins, setPins] = useState<DesignPin[]>([])
  const [selectedPin, setSelectedPin] = useState<DesignPin | null>(null)
  const [newPinDraft, setNewPinDraft] = useState<{ x_pct: number; y_pct: number } | null>(null)
  const [newPinContent, setNewPinContent] = useState('')
  const [newReply, setNewReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // ── Markups
  const [markups, setMarkups] = useState<DesignMarkup[]>([])
  const markupCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const currentPathRef = useRef<{ x: number; y: number }[]>([])
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<{ x_pct: number; y_pct: number } | null>(null)
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null)
  const [pendingTextVal, setPendingTextVal] = useState('')

  // ── Voice notes
  const [voiceNotes, setVoiceNotes] = useState<DesignVoiceNote[]>([])
  const [showVoicePanel, setShowVoicePanel] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [voiceRecordTime, setVoiceRecordTime] = useState(0)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const voiceRecordTimeRef = useRef(0)

  // ── Video walkthroughs
  const [videoWalkthroughs, setVideoWalkthroughs] = useState<DesignVideoWalkthrough[]>([])
  const [showVideoPanel, setShowVideoPanel] = useState(false)
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [videoRecordTime, setVideoRecordTime] = useState(0)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const videoRecorderRef = useRef<MediaRecorder | null>(null)
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const videoRecordTimeRef = useRef(0)

  // ── Instructions
  const [instructions, setInstructions] = useState<DesignInstruction[]>([])
  const [showInstructionsPanel, setShowInstructionsPanel] = useState(false)
  const [newInstrTitle, setNewInstrTitle] = useState('')
  const [newInstrItems, setNewInstrItems] = useState<string[]>([''])
  const [savingInstr, setSavingInstr] = useState(false)
  const [expandedInstrId, setExpandedInstrId] = useState<string | null>(null)

  // ── Load data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    loadAll()
  }, [designProjectId])

  async function loadAll() {
    const [pinsRes, markupsRes, voiceRes, videoRes, instrRes] = await Promise.all([
      fetch(`/api/annotations/pins?design_project_id=${designProjectId}`),
      fetch(`/api/annotations/markups?design_project_id=${designProjectId}`),
      fetch(`/api/annotations/voice-notes?design_project_id=${designProjectId}`),
      fetch(`/api/annotations/video-walkthroughs?design_project_id=${designProjectId}`),
      fetch(`/api/annotations/instructions?design_project_id=${designProjectId}`),
    ])
    const [pd, md, vd, vid, id] = await Promise.all([
      pinsRes.json(), markupsRes.json(), voiceRes.json(), videoRes.json(), instrRes.json(),
    ])
    if (pd.pins)           setPins(pd.pins)
    if (md.markups)        setMarkups(md.markups)
    if (vd.voiceNotes)     setVoiceNotes(vd.voiceNotes)
    if (vid.walkthroughs)  setVideoWalkthroughs(vid.walkthroughs)
    if (id.instructions)   setInstructions(id.instructions)
  }

  // ── Realtime subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    const pinSub = supabase
      .channel(`annotation-pins-${designProjectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_pin_comments', filter: `design_project_id=eq.${designProjectId}` },
        () => { fetch(`/api/annotations/pins?design_project_id=${designProjectId}`).then(r => r.json()).then(d => { if (d.pins) setPins(d.pins) }) }
      )
      .subscribe()

    const markupSub = supabase
      .channel(`annotation-markups-${designProjectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_markups', filter: `design_project_id=eq.${designProjectId}` },
        () => { fetch(`/api/annotations/markups?design_project_id=${designProjectId}`).then(r => r.json()).then(d => { if (d.markups) setMarkups(d.markups) }) }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(pinSub)
      supabase.removeChannel(markupSub)
    }
  }, [designProjectId])

  // ── Cleanup timers on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
      if (videoTimerRef.current) clearInterval(videoTimerRef.current)
      voiceRecorderRef.current?.stop()
      videoRecorderRef.current?.stop()
    }
  }, [])

  // ── Draw markups on overlay canvas ─────────────────────────────────────
  useEffect(() => {
    renderMarkupCanvas()
  }, [markups, layerVisible, layerOpacity])

  const renderMarkupCanvas = useCallback(() => {
    const canvas = markupCanvasRef.current
    const container = canvasContainerRef.current
    if (!canvas || !container) return

    const W = container.clientWidth
    const H = container.clientHeight
    if (!W || !H) return
    canvas.width = W
    canvas.height = H

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)

    markups.forEach(m => {
      if (!layerVisible[m.layer as LayerKey]) return
      const opacity = (layerOpacity[m.layer as LayerKey] || 100) / 100
      ctx.globalAlpha = opacity
      ctx.strokeStyle = m.color || LAYER_CFG[m.layer as LayerKey]?.color || '#fff'
      ctx.fillStyle   = m.color || LAYER_CFG[m.layer as LayerKey]?.color || '#fff'
      ctx.lineWidth   = m.stroke_width || 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (m.markup_type === 'draw') {
        const pts: { x: number; y: number }[] = m.data.points || []
        if (pts.length < 2) return
        ctx.beginPath()
        ctx.moveTo((pts[0].x / 100) * W, (pts[0].y / 100) * H)
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo((pts[i].x / 100) * W, (pts[i].y / 100) * H)
        }
        ctx.stroke()
      } else if (m.markup_type === 'arrow') {
        const { x1, y1, x2, y2 } = m.data
        const ax1 = (x1 / 100) * W, ay1 = (y1 / 100) * H
        const ax2 = (x2 / 100) * W, ay2 = (y2 / 100) * H
        drawArrow(ctx, ax1, ay1, ax2, ay2, m.stroke_width || 2)
      } else if (m.markup_type === 'rect') {
        const { x, y, width, height } = m.data
        const rx = (x / 100) * W, ry = (y / 100) * H
        const rw = (width / 100) * W, rh = (height / 100) * H
        ctx.beginPath()
        ctx.strokeRect(rx, ry, rw, rh)
      } else if (m.markup_type === 'text') {
        const { x, y, text } = m.data
        const tx = (x / 100) * W, ty = (y / 100) * H
        ctx.font = `bold 14px 'Barlow Condensed', sans-serif`
        ctx.fillStyle = m.color || '#fff'
        ctx.globalAlpha = opacity
        // Background pill
        const metrics = ctx.measureText(text)
        ctx.fillStyle = 'rgba(13,15,20,0.8)'
        ctx.fillRect(tx - 4, ty - 16, metrics.width + 8, 22)
        ctx.fillStyle = m.color || '#fff'
        ctx.fillText(text, tx, ty)
      }
    })
    ctx.globalAlpha = 1
  }, [markups, layerVisible, layerOpacity, canvasContainerRef])

  function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number) {
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const headLen = Math.max(12, w * 4)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
  }

  // ── Pointer events for markup drawing ──────────────────────────────────
  function getRelPct(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const container = canvasContainerRef.current
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (annotMode === 'none' || annotMode === 'pin' || annotMode === 'erase') return
    if (annotMode === 'text') return // handled on click
    e.stopPropagation()
    const pos = getRelPct(e)
    isDrawingRef.current = true
    drawStartRef.current = pos
    currentPathRef.current = [pos]
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawingRef.current) return
    const pos = getRelPct(e)
    const canvas = markupCanvasRef.current
    const container = canvasContainerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = container.clientWidth
    const H = container.clientHeight
    const color = LAYER_CFG[activeLayer].color

    if (annotMode === 'draw') {
      currentPathRef.current.push(pos)
      // Draw incremental segment
      const pts = currentPathRef.current
      ctx.globalAlpha = 1
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const last = pts[pts.length - 2]
      if (last) {
        ctx.beginPath()
        ctx.moveTo((last.x / 100) * W, (last.y / 100) * H)
        ctx.lineTo((pos.x / 100) * W, (pos.y / 100) * H)
        ctx.stroke()
      }
    } else if (annotMode === 'arrow' || annotMode === 'rect') {
      // Redraw canvas + preview
      renderMarkupCanvas()
      const start = drawStartRef.current!
      const sx = (start.x / 100) * W, sy = (start.y / 100) * H
      const ex = (pos.x / 100) * W,  ey = (pos.y / 100) * H
      ctx.globalAlpha = 0.8
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 2
      if (annotMode === 'arrow') {
        drawArrow(ctx, sx, sy, ex, ey, 2)
      } else {
        ctx.strokeRect(sx, sy, ex - sx, ey - sy)
      }
    }
  }

  async function onPointerUp(e: React.PointerEvent) {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const pos = getRelPct(e)
    const color = LAYER_CFG[activeLayer].color

    if (annotMode === 'draw') {
      const pts = currentPathRef.current
      if (pts.length < 2) return
      const saved = await saveMarkup({ type: 'draw', data: { points: pts }, color })
      if (saved) setMarkups(prev => [...prev, saved])
      currentPathRef.current = []
    } else if (annotMode === 'arrow') {
      const start = drawStartRef.current!
      const saved = await saveMarkup({ type: 'arrow', data: { x1: start.x, y1: start.y, x2: pos.x, y2: pos.y }, color })
      if (saved) setMarkups(prev => [...prev, saved])
    } else if (annotMode === 'rect') {
      const start = drawStartRef.current!
      const saved = await saveMarkup({
        type: 'rect',
        data: { x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y), width: Math.abs(pos.x - start.x), height: Math.abs(pos.y - start.y) },
        color,
      })
      if (saved) setMarkups(prev => [...prev, saved])
    }
  }

  function onOverlayClick(e: React.MouseEvent) {
    if (annotMode === 'none') return
    e.stopPropagation()
    const pos = getRelPct(e)
    const posPct = { x_pct: pos.x, y_pct: pos.y }

    if (annotMode === 'pin') {
      setNewPinDraft(posPct)
      setNewPinContent('')
    } else if (annotMode === 'text') {
      const container = canvasContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setPendingTextPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setPendingTextVal('')
      textInputRef.current = posPct
    } else if (annotMode === 'erase') {
      eraseNearestMarkup(pos.x, pos.y)
    }
  }

  function eraseNearestMarkup(clickX: number, clickY: number) {
    const container = canvasContainerRef.current
    if (!container) return
    const W = container.clientWidth
    const H = container.clientHeight
    // Convert click pct to pixels for distance math
    const cx = (clickX / 100) * W
    const cy = (clickY / 100) * H
    const HIT = 20 // pixel hit radius

    // Find the first matching markup for the active layer
    const layerMarkups = markups.filter(m => m.layer === activeLayer)
    for (const m of layerMarkups) {
      let hit = false
      if (m.markup_type === 'draw') {
        const pts: { x: number; y: number }[] = m.data.points || []
        hit = pts.some(p => {
          const dx = (p.x / 100) * W - cx
          const dy = (p.y / 100) * H - cy
          return Math.sqrt(dx * dx + dy * dy) < HIT
        })
      } else if (m.markup_type === 'arrow') {
        const { x1, y1, x2, y2 } = m.data
        // Hit test: distance from click to line segment
        const ax = (x1 / 100) * W, ay = (y1 / 100) * H
        const bx = (x2 / 100) * W, by = (y2 / 100) * H
        hit = distToSegment(cx, cy, ax, ay, bx, by) < HIT
      } else if (m.markup_type === 'rect') {
        const { x, y, width, height } = m.data
        const rx = (x / 100) * W, ry = (y / 100) * H
        const rw = (width / 100) * W, rh = (height / 100) * H
        // Hit if inside rect or within HIT px of border
        hit = cx >= rx - HIT && cx <= rx + rw + HIT && cy >= ry - HIT && cy <= ry + rh + HIT
      } else if (m.markup_type === 'text') {
        const { x, y } = m.data
        const tx = (x / 100) * W, ty = (y / 100) * H
        const dx = tx - cx, dy = ty - cy
        hit = Math.sqrt(dx * dx + dy * dy) < HIT * 2
      }
      if (hit) {
        deleteMarkup(m.id)
        return
      }
    }
  }

  function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2)
  }

  async function saveMarkup({ type, data, color }: { type: string; data: any; color: string }) {
    try {
      const res = await fetch('/api/annotations/markups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_project_id: designProjectId, layer: activeLayer, markup_type: type, data, color }),
      })
      const json = await res.json()
      return json.markup || null
    } catch { return null }
  }

  async function deleteMarkup(id: string) {
    await fetch('/api/annotations/markups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMarkups(prev => prev.filter(m => m.id !== id))
  }

  async function clearLayerMarkups(layer: LayerKey) {
    await fetch('/api/annotations/markups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design_project_id: designProjectId, layer }),
    })
    setMarkups(prev => prev.filter(m => m.layer !== layer))
  }

  // ── Text annotation commit ─────────────────────────────────────────────
  async function commitTextAnnotation() {
    if (!pendingTextVal.trim() || !textInputRef.current) { setPendingTextPos(null); return }
    const saved = await saveMarkup({
      type: 'text',
      data: { x: textInputRef.current.x_pct, y: textInputRef.current.y_pct, text: pendingTextVal.trim() },
      color: LAYER_CFG[activeLayer].color,
    })
    if (saved) setMarkups(prev => [...prev, saved])
    setPendingTextPos(null)
    setPendingTextVal('')
    textInputRef.current = null
  }

  // ── Pin actions ────────────────────────────────────────────────────────
  async function submitPin() {
    if (!newPinContent.trim() || !newPinDraft) return
    const res = await fetch('/api/annotations/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        design_project_id: designProjectId,
        layer: activeLayer,
        x_pct: newPinDraft.x_pct,
        y_pct: newPinDraft.y_pct,
        content: newPinContent.trim(),
      }),
    })
    const { pin } = await res.json()
    if (pin) {
      setPins(prev => [...prev, pin])
      setSelectedPin(pin)
    }
    setNewPinDraft(null)
    setNewPinContent('')
  }

  async function resolvePin(pin: DesignPin) {
    const res = await fetch(`/api/annotations/pins/${pin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: !pin.resolved }),
    })
    const { pin: updated } = await res.json()
    if (updated) {
      setPins(prev => prev.map(p => p.id === updated.id ? updated : p))
      if (selectedPin?.id === updated.id) setSelectedPin(updated)
    }
  }

  async function deletePin(pin: DesignPin) {
    await fetch(`/api/annotations/pins/${pin.id}`, { method: 'DELETE' })
    setPins(prev => prev.filter(p => p.id !== pin.id))
    if (selectedPin?.id === pin.id) setSelectedPin(null)
  }

  async function submitReply() {
    if (!newReply.trim() || !selectedPin) return
    setSendingReply(true)
    const res = await fetch(`/api/annotations/pins/${selectedPin.id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newReply.trim() }),
    })
    const { reply } = await res.json()
    if (reply) {
      const updated = { ...selectedPin, replies: [...(selectedPin.replies || []), reply] }
      setPins(prev => prev.map(p => p.id === selectedPin.id ? updated : p))
      setSelectedPin(updated)
    }
    setNewReply('')
    setSendingReply(false)
  }

  // ── Voice recording ────────────────────────────────────────────────────
  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      voiceChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = e => { if (e.data.size > 0) voiceChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(voiceChunksRef.current, { type: mimeType })
        setVoiceBlob(blob)
        setVoicePreviewUrl(URL.createObjectURL(blob))
      }
      recorder.start(100)
      voiceRecorderRef.current = recorder
      setIsRecordingVoice(true)
      setVoiceRecordTime(0)
      voiceRecordTimeRef.current = 0
      let t = 0
      voiceTimerRef.current = setInterval(() => {
        t++
        voiceRecordTimeRef.current = t
        setVoiceRecordTime(t)
        if (t >= 120) stopVoiceRecording()
      }, 1000)
    } catch (err) {
      alert('Microphone access denied')
    }
  }

  function stopVoiceRecording() {
    voiceRecorderRef.current?.stop()
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null }
    setIsRecordingVoice(false)
  }

  async function uploadVoiceNote() {
    if (!voiceBlob) return
    setUploadingVoice(true)
    const fd = new FormData()
    fd.append('audio', voiceBlob, 'voice_note.webm')
    fd.append('design_project_id', designProjectId)
    fd.append('layer', activeLayer)
    fd.append('duration', String(voiceRecordTime))
    if (selectedPin) fd.append('pin_id', selectedPin.id)

    const res = await fetch('/api/annotations/voice-notes', { method: 'POST', body: fd })
    const { voiceNote } = await res.json()
    if (voiceNote) setVoiceNotes(prev => [voiceNote, ...prev])
    setVoiceBlob(null)
    setVoicePreviewUrl(null)
    setVoiceRecordTime(0)
    setUploadingVoice(false)
  }

  function discardVoiceNote() {
    setVoiceBlob(null)
    setVoicePreviewUrl(null)
    setVoiceRecordTime(0)
  }

  // ── Video recording ────────────────────────────────────────────────────
  async function startVideoRecording() {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { cursor: 'always' }, audio: true })
      videoChunksRef.current = []
      const videoMimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4'
      const recorder = new MediaRecorder(stream, { mimeType: videoMimeType })
      recorder.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop())
        const blob = new Blob(videoChunksRef.current, { type: videoMimeType })
        uploadVideo(blob)
      }
      // Auto-stop when screen share ends
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (videoRecorderRef.current?.state === 'recording') {
          videoRecorderRef.current.stop()
        }
      })
      recorder.start(100)
      videoRecorderRef.current = recorder
      setIsRecordingVideo(true)
      setVideoRecordTime(0)
      videoRecordTimeRef.current = 0
      let t = 0
      videoTimerRef.current = setInterval(() => { t++; videoRecordTimeRef.current = t; setVideoRecordTime(t) }, 1000)
    } catch (err) {
      alert('Screen recording not available or permission denied')
    }
  }

  function stopVideoRecording() {
    videoRecorderRef.current?.stop()
    if (videoTimerRef.current) { clearInterval(videoTimerRef.current); videoTimerRef.current = null }
    setIsRecordingVideo(false)
  }

  async function uploadVideo(blob: Blob) {
    setUploadingVideo(true)
    const fd = new FormData()
    fd.append('video', blob, 'walkthrough.webm')
    fd.append('design_project_id', designProjectId)
    fd.append('title', `Design Walkthrough — ${new Date().toLocaleDateString()}`)
    fd.append('duration', String(videoRecordTimeRef.current))
    const res = await fetch('/api/annotations/video-walkthroughs', { method: 'POST', body: fd })
    const { walkthrough } = await res.json()
    if (walkthrough) setVideoWalkthroughs(prev => [walkthrough, ...prev])
    setUploadingVideo(false)
  }

  // ── Instructions ───────────────────────────────────────────────────────
  async function saveInstruction() {
    if (!newInstrTitle.trim()) return
    setSavingInstr(true)
    const items = newInstrItems.filter(s => s.trim())
    const res = await fetch('/api/annotations/instructions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design_project_id: designProjectId, title: newInstrTitle.trim(), items }),
    })
    const { instruction } = await res.json()
    if (instruction) {
      setInstructions(prev => [instruction, ...prev])
      setExpandedInstrId(instruction.id)
    }
    setNewInstrTitle('')
    setNewInstrItems([''])
    setSavingInstr(false)
  }

  async function toggleInstructionItem(instrId: string, item: DesignInstructionItem, action: 'complete' | 'uncomplete' | 'approve' | 'unapprove') {
    const res = await fetch(`/api/annotations/instructions/${instrId}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, action }),
    })
    const { item: updated } = await res.json()
    if (updated) {
      setInstructions(prev => prev.map(instr =>
        instr.id === instrId
          ? { ...instr, items: (instr.items || []).map(it => it.id === updated.id ? updated : it) }
          : instr
      ))
    }
  }

  // ── Visible pins (filtered by layer visibility and resolved state) ──────
  const visiblePins = pins.filter(p => layerVisible[p.layer as LayerKey])

  // ── Active annotation color ─────────────────────────────────────────────
  const activeColor = LAYER_CFG[activeLayer].color

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}
    >
      {/* ─── Markup canvas overlay ─────────────────────────────────────── */}
      <canvas
        ref={markupCanvasRef}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: ['draw', 'arrow', 'rect'].includes(annotMode) ? 'all' : 'none',
          cursor: annotMode === 'draw' ? 'crosshair' : annotMode === 'arrow' ? 'crosshair' : annotMode === 'rect' ? 'crosshair' : 'default',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />

      {/* ─── Click overlay (for pin + text modes) ─────────────────────── */}
      <div
        ref={overlayRef}
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: ['pin', 'text', 'erase'].includes(annotMode) ? 'all' : 'none',
          cursor: annotMode === 'pin' ? 'crosshair' : annotMode === 'text' ? 'text' : annotMode === 'erase' ? 'cell' : 'default',
        }}
        onClick={onOverlayClick}
      />

      {/* ─── PIN MARKERS ──────────────────────────────────────────────── */}
      {visiblePins.map(pin => {
        const cfg = LAYER_CFG[pin.layer as LayerKey]
        const isSelected = selectedPin?.id === pin.id
        return (
          <div
            key={pin.id}
            style={{
              position: 'absolute',
              left: `${pin.x_pct}%`,
              top: `${pin.y_pct}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
              pointerEvents: 'all',
              cursor: 'pointer',
              opacity: pin.resolved ? 0.4 : 1,
              transition: 'opacity 0.2s, transform 0.15s',
            }}
            onClick={e => { e.stopPropagation(); setSelectedPin(isSelected ? null : pin) }}
            title={`Pin ${pin.pin_number}: ${pin.content.slice(0, 60)}`}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50% 50% 50% 0',
              background: pin.resolved ? '#5a6080' : cfg.color,
              border: `2px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: '#fff',
              transform: 'rotate(-45deg)',
              boxShadow: isSelected ? `0 0 0 3px ${cfg.color}60` : '0 2px 8px rgba(0,0,0,0.5)',
              transition: 'transform 0.15s',
            }}>
              <span style={{ transform: 'rotate(45deg)' }}>{pin.pin_number}</span>
            </div>
          </div>
        )
      })}

      {/* ─── NEW PIN DRAFT INDICATOR ──────────────────────────────────── */}
      {newPinDraft && (
        <div
          style={{
            position: 'absolute',
            left: `${newPinDraft.x_pct}%`,
            top: `${newPinDraft.y_pct}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 30, pointerEvents: 'none',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50% 50% 50% 0',
            background: activeColor, border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900, color: '#fff',
            transform: 'rotate(-45deg)',
            animation: 'pulse 1s infinite',
          }}>
            <span style={{ transform: 'rotate(45deg)' }}>+</span>
          </div>
        </div>
      )}

      {/* ─── TEXT INPUT (for text annotation) ───────────────────────── */}
      {pendingTextPos && (
        <div
          style={{
            position: 'absolute',
            left: pendingTextPos.x,
            top: pendingTextPos.y,
            zIndex: 35, pointerEvents: 'all',
          }}
        >
          <input
            autoFocus
            value={pendingTextVal}
            onChange={e => setPendingTextVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitTextAnnotation()
              if (e.key === 'Escape') { setPendingTextPos(null); setPendingTextVal('') }
            }}
            onBlur={commitTextAnnotation}
            placeholder="Type note..."
            style={{
              background: 'rgba(13,15,20,0.9)', border: `2px solid ${activeColor}`,
              color: activeColor, borderRadius: 6, padding: '4px 8px',
              fontSize: 13, outline: 'none', fontFamily: 'Barlow Condensed, sans-serif',
              minWidth: 140,
            }}
          />
        </div>
      )}

      {/* ─── FLOATING TOOLBAR ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'all', zIndex: 40,
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        }}
      >
        {/* Layer toggles */}
        <div style={{
          display: 'flex', gap: 4, padding: '6px 10px',
          background: 'rgba(13,15,20,0.92)', backdropFilter: 'blur(12px)',
          borderRadius: 50, border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {(Object.entries(LAYER_CFG) as [LayerKey, typeof LAYER_CFG.customer][]).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setLayerVisible(prev => ({ ...prev, [key]: !prev[key] }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  background: layerVisible[key] ? cfg.bg : 'transparent',
                  color: layerVisible[key] ? cfg.color : '#5a6080',
                  fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                  outline: activeLayer === key ? `2px solid ${cfg.color}` : 'none',
                  outlineOffset: 1,
                }}
                title={`Toggle ${cfg.label} layer (click to hide/show)`}
                onContextMenu={e => { e.preventDefault(); setActiveLayer(key) }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: layerVisible[key] ? cfg.color : '#5a6080' }} />
                {cfg.label}
              </button>
            </div>
          ))}
          {/* Opacity for active layer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
            <span style={{ fontSize: 10, color: '#5a6080' }}>Opacity</span>
            <input
              type="range" min={20} max={100}
              value={layerOpacity[activeLayer]}
              onChange={e => setLayerOpacity(prev => ({ ...prev, [activeLayer]: Number(e.target.value) }))}
              style={{ width: 60, accentColor: activeColor }}
            />
            <span style={{ fontSize: 10, color: activeColor, fontFamily: 'JetBrains Mono, monospace' }}>
              {layerOpacity[activeLayer]}%
            </span>
          </div>
        </div>

        {/* Annotation mode tools */}
        {showToolbar && (
          <div style={{
            display: 'flex', gap: 2, padding: '5px 8px',
            background: 'rgba(13,15,20,0.92)', backdropFilter: 'blur(12px)',
            borderRadius: 50, border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}>
            {/* Active layer selector (right-click layer toggles or use this) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 8, borderRight: '1px solid #1a1d27' }}>
              <span style={{ fontSize: 10, color: '#5a6080' }}>Draw as:</span>
              {(Object.keys(LAYER_CFG) as LayerKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => setActiveLayer(key)}
                  title={`Set active annotation layer to ${LAYER_CFG[key].label}`}
                  style={{
                    width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: LAYER_CFG[key].color,
                    outline: activeLayer === key ? '2px solid #fff' : 'none',
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>

            {/* Tool buttons */}
            {([
              { mode: 'pin'  as AnnotMode, Icon: Pin,      label: 'Drop Pin Comment' },
              { mode: 'draw' as AnnotMode, Icon: Pencil,   label: 'Freehand Draw' },
              { mode: 'arrow'as AnnotMode, Icon: ArrowRight,label: 'Arrow Tool' },
              { mode: 'rect' as AnnotMode, Icon: Square,   label: 'Rectangle Highlight' },
              { mode: 'text' as AnnotMode, Icon: Type,     label: 'Text Annotation' },
              { mode: 'erase'as AnnotMode, Icon: Eraser,   label: 'Erase Markup' },
            ] as const).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => setAnnotMode(prev => prev === mode ? 'none' : mode)}
                title={label}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: annotMode === mode ? `${activeColor}30` : 'transparent',
                  color: annotMode === mode ? activeColor : '#9299b5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                }}
              >
                <Icon size={15} />
              </button>
            ))}

            <div style={{ width: 1, height: 20, background: '#1a1d27', margin: '0 4px' }} />

            {/* Clear active layer markups */}
            <button
              onClick={() => { if (confirm(`Clear all ${LAYER_CFG[activeLayer].label} markups?`)) clearLayerMarkups(activeLayer) }}
              title={`Clear all ${LAYER_CFG[activeLayer].label} layer markups`}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', color: '#5a6080',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Trash2 size={13} />
            </button>

            <div style={{ width: 1, height: 20, background: '#1a1d27', margin: '0 4px' }} />

            {/* Voice note */}
            <button
              onClick={() => setShowVoicePanel(v => !v)}
              title="Voice Notes"
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: showVoicePanel ? 'rgba(242,90,90,0.15)' : 'transparent',
                color: showVoicePanel ? '#f25a5a' : '#9299b5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Mic size={15} />
            </button>

            {/* Video walkthrough */}
            <button
              onClick={() => setShowVideoPanel(v => !v)}
              title="Video Walkthroughs"
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: showVideoPanel ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: showVideoPanel ? '#8b5cf6' : '#9299b5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Video size={15} />
            </button>

            {/* Instructions */}
            <button
              onClick={() => setShowInstructionsPanel(v => !v)}
              title="Design Instructions"
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: showInstructionsPanel ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: showInstructionsPanel ? '#f59e0b' : '#9299b5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}
            >
              <ListChecks size={15} />
              {instructions.some(i => (i.items || []).some(it => !it.completed_at)) && (
                <span style={{
                  position: 'absolute', top: 4, right: 4, width: 6, height: 6,
                  borderRadius: '50%', background: '#f59e0b',
                }} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* ─── PIN COMMENT FORM (drop + type) ───────────────────────────── */}
      {newPinDraft && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(newPinDraft.x_pct, 75)}%`,
            top: `${Math.min(newPinDraft.y_pct + 4, 80)}%`,
            zIndex: 50, pointerEvents: 'all',
            background: '#13151c', border: `2px solid ${activeColor}`,
            borderRadius: 12, padding: 12, minWidth: 240,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeColor }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: activeColor }}>{LAYER_CFG[activeLayer].label} Comment</span>
            <button onClick={() => setNewPinDraft(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
              <X size={13} />
            </button>
          </div>
          <textarea
            autoFocus
            value={newPinContent}
            onChange={e => setNewPinContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitPin() }}
            placeholder="Add your comment... (Ctrl+Enter to save)"
            rows={3}
            style={{
              width: '100%', background: '#0d0f14', border: '1px solid #1a1d27',
              borderRadius: 8, color: '#e8eaed', fontSize: 12, padding: '8px 10px',
              outline: 'none', resize: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              onClick={submitPin}
              disabled={!newPinContent.trim()}
              style={{
                flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none',
                background: activeColor, color: '#fff', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, opacity: !newPinContent.trim() ? 0.4 : 1,
              }}
            >
              <Send size={12} style={{ marginRight: 4 }} /> Post Pin
            </button>
            <button onClick={() => setNewPinDraft(null)}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #1a1d27', background: 'transparent', color: '#9299b5', cursor: 'pointer', fontSize: 12 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── PIN THREAD PANEL ─────────────────────────────────────────── */}
      {selectedPin && (
        <div
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 320,
            background: '#13151c', borderLeft: `3px solid ${LAYER_CFG[selectedPin.layer as LayerKey].color}`,
            display: 'flex', flexDirection: 'column', zIndex: 45, pointerEvents: 'all',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1d27', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50% 50% 50% 0',
              background: selectedPin.resolved ? '#5a6080' : LAYER_CFG[selectedPin.layer as LayerKey].color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 900, color: '#fff', transform: 'rotate(-45deg)', flexShrink: 0,
            }}>
              <span style={{ transform: 'rotate(45deg)' }}>{selectedPin.pin_number}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: LAYER_CFG[selectedPin.layer as LayerKey].color }}>
                  {LAYER_CFG[selectedPin.layer as LayerKey].label} Pin #{selectedPin.pin_number}
                </span>
                {selectedPin.resolved && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#22c07a', background: '#22c07a20', padding: '1px 6px', borderRadius: 4 }}>RESOLVED</span>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#5a6080' }}>{selectedPin.author_name} · {fmtDate(selectedPin.created_at)}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => resolvePin(selectedPin)}
                title={selectedPin.resolved ? 'Unresolve' : 'Resolve'}
                style={{ background: selectedPin.resolved ? '#22c07a20' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px', color: '#22c07a' }}>
                <Check size={13} />
              </button>
              <button onClick={() => deletePin(selectedPin)}
                title="Delete pin"
                style={{ background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px', color: '#f25a5a' }}>
                <Trash2 size={13} />
              </button>
              <button onClick={() => setSelectedPin(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#5a6080', padding: '4px 6px' }}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Original comment */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1d27' }}>
            <div style={{ fontSize: 13, color: '#e8eaed', lineHeight: 1.5 }}>{selectedPin.content}</div>
          </div>

          {/* Replies */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(selectedPin.replies || []).map(reply => (
              <div key={reply.id} style={{
                padding: '8px 10px', borderRadius: 8,
                background: '#0d0f14', border: '1px solid #1a1d27',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9299b5' }}>{reply.author_name}</span>
                  <span style={{ fontSize: 9, color: '#5a6080' }}>{fmtDate(reply.created_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#e8eaed', lineHeight: 1.4 }}>{reply.content}</div>
              </div>
            ))}
            {(selectedPin.replies || []).length === 0 && (
              <div style={{ fontSize: 11, color: '#5a6080', textAlign: 'center', padding: '12px 0' }}>No replies yet</div>
            )}
          </div>

          {/* Reply box */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #1a1d27' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={newReply}
                onChange={e => setNewReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitReply() }}
                placeholder="Reply... (@mention teammates)"
                style={{
                  flex: 1, padding: '7px 10px', background: '#0d0f14',
                  border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed',
                  fontSize: 12, outline: 'none',
                }}
              />
              <button
                onClick={submitReply}
                disabled={sendingReply || !newReply.trim()}
                style={{
                  padding: '7px 10px', borderRadius: 8, border: 'none',
                  background: LAYER_CFG[selectedPin.layer as LayerKey].color,
                  color: '#fff', cursor: 'pointer', opacity: !newReply.trim() ? 0.4 : 1,
                }}
              >
                <Send size={12} />
              </button>
            </div>
          </div>

          {/* Voice notes attached to this pin */}
          {voiceNotes.filter(v => v.pin_id === selectedPin.id).length > 0 && (
            <div style={{ padding: '0 14px 12px', borderTop: '1px solid #1a1d27' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', padding: '10px 0 6px' }}>Voice Notes</div>
              {voiceNotes.filter(v => v.pin_id === selectedPin.id).map(note => (
                <VoiceNotePlayer key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── VOICE PANEL ──────────────────────────────────────────────── */}
      {showVoicePanel && (
        <div
          style={{
            position: 'absolute', bottom: 16, left: 80, width: 320,
            background: '#13151c', border: '1px solid #1a1d27',
            borderRadius: 14, zIndex: 45, pointerEvents: 'all',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1d27', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mic size={14} style={{ color: '#f25a5a' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed' }}>Voice Notes</span>
            </div>
            <button onClick={() => setShowVoicePanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}><X size={13} /></button>
          </div>

          <div style={{ padding: 14 }}>
            {/* Recorder */}
            {!voiceBlob ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                {isRecordingVoice && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(242,90,90,0.1)', borderRadius: 8, border: '1px solid rgba(242,90,90,0.3)', width: '100%' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f25a5a', animation: 'blink 1s infinite' }} />
                    <span style={{ fontSize: 12, color: '#f25a5a', fontFamily: 'JetBrains Mono, monospace' }}>REC {fmtTime(voiceRecordTime)}</span>
                    <span style={{ fontSize: 10, color: '#5a6080', marginLeft: 'auto' }}>Max 2:00</span>
                  </div>
                )}
                {/* Simple waveform visualization */}
                {isRecordingVoice && (
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 32 }}>
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} style={{
                        width: 3, borderRadius: 2,
                        background: '#f25a5a',
                        height: `${20 + Math.sin(Date.now() / 200 + i * 0.7) * 12}%`,
                        animation: `waveBar ${0.3 + (i % 4) * 0.1}s ease-in-out infinite alternate`,
                        minHeight: 4, maxHeight: 28,
                      }} />
                    ))}
                  </div>
                )}
                <button
                  onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: 50, border: 'none', cursor: 'pointer',
                    background: isRecordingVoice ? '#f25a5a' : 'rgba(242,90,90,0.15)',
                    color: '#f25a5a', fontWeight: 700, fontSize: 13,
                  }}
                >
                  {isRecordingVoice ? <StopCircle size={16} /> : <Mic size={16} />}
                  {isRecordingVoice ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#9299b5' }}>Preview: {fmtTime(voiceRecordTime)}</div>
                {voicePreviewUrl && <audio src={voicePreviewUrl} controls style={{ width: '100%' }} />}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={uploadVoiceNote} disabled={uploadingVoice}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: '#22c07a', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                    {uploadingVoice ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Note'}
                  </button>
                  <button onClick={discardVoiceNote}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #1a1d27', background: 'transparent', color: '#9299b5', cursor: 'pointer', fontSize: 12 }}>
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Existing voice notes */}
            {voiceNotes.filter(v => !v.pin_id).length > 0 && (
              <div style={{ marginTop: 14, borderTop: '1px solid #1a1d27', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Saved Notes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {voiceNotes.filter(v => !v.pin_id).map(note => (
                    <VoiceNotePlayer key={note.id} note={note} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VIDEO WALKTHROUGH PANEL ───────────────────────────────────── */}
      {showVideoPanel && (
        <div
          style={{
            position: 'absolute', bottom: 16, left: 80, width: 340,
            background: '#13151c', border: '1px solid #1a1d27',
            borderRadius: 14, zIndex: 45, pointerEvents: 'all',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1d27', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={14} style={{ color: '#8b5cf6' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed' }}>Screen Walkthroughs</span>
            </div>
            <button onClick={() => setShowVideoPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}><X size={13} /></button>
          </div>

          <div style={{ padding: 14 }}>
            {/* Record button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              {isRecordingVideo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(139,92,246,0.1)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', width: '100%' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', animation: 'blink 1s infinite' }} />
                  <span style={{ fontSize: 12, color: '#8b5cf6', fontFamily: 'JetBrains Mono, monospace' }}>RECORDING {fmtTime(videoRecordTime)}</span>
                </div>
              )}
              {uploadingVideo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8b5cf6' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Uploading video...
                </div>
              )}
              <button
                onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                disabled={uploadingVideo}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  background: isRecordingVideo ? '#8b5cf6' : 'rgba(139,92,246,0.15)',
                  color: '#8b5cf6', fontWeight: 700, fontSize: 13,
                  opacity: uploadingVideo ? 0.4 : 1,
                }}
              >
                {isRecordingVideo ? <StopCircle size={16} /> : <Video size={16} />}
                {isRecordingVideo ? 'Stop Recording' : 'Record Screen Walkthrough'}
              </button>
              <div style={{ fontSize: 10, color: '#5a6080', textAlign: 'center' }}>
                Records your screen + audio. Share with your team.
              </div>
            </div>

            {/* Existing walkthroughs */}
            {videoWalkthroughs.length > 0 && (
              <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Saved Walkthroughs</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                  {videoWalkthroughs.map(v => (
                    <div key={v.id} style={{ background: '#0d0f14', borderRadius: 8, border: '1px solid #1a1d27', overflow: 'hidden' }}>
                      <video src={v.video_url} controls style={{ width: '100%', maxHeight: 120, display: 'block' }} />
                      <div style={{ padding: '6px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed' }}>{v.title || 'Design Walkthrough'}</div>
                        <div style={{ fontSize: 9, color: '#5a6080' }}>
                          {v.duration_seconds ? fmtTime(v.duration_seconds) : ''} · {fmtDate(v.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── INSTRUCTIONS PANEL ───────────────────────────────────────── */}
      {showInstructionsPanel && (
        <div
          style={{
            position: 'absolute', top: 0, right: selectedPin ? 320 : 0, bottom: 0, width: 340,
            background: '#13151c', borderLeft: '1px solid #1a1d27',
            display: 'flex', flexDirection: 'column', zIndex: 44, pointerEvents: 'all',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a1d27', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ListChecks size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#e8eaed' }}>Design Instructions</span>
            </div>
            <button onClick={() => setShowInstructionsPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}><X size={13} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Create new instruction set */}
            <div style={{ padding: 14, borderBottom: '1px solid #1a1d27' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>New Instruction Set</div>
              <input
                value={newInstrTitle}
                onChange={e => setNewInstrTitle(e.target.value)}
                placeholder="e.g. Revision 2 Requirements"
                style={{
                  width: '100%', padding: '8px 10px', background: '#0d0f14',
                  border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed',
                  fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {newInstrItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 4 }}>
                    <input
                      value={item}
                      onChange={e => setNewInstrItems(prev => prev.map((it, idx) => idx === i ? e.target.value : it))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') setNewInstrItems(prev => [...prev, ''])
                        if (e.key === 'Backspace' && !item && i > 0) setNewInstrItems(prev => prev.filter((_, idx) => idx !== i))
                      }}
                      placeholder={`Checklist item ${i + 1}...`}
                      style={{
                        flex: 1, padding: '6px 8px', background: '#0d0f14',
                        border: '1px solid #1a1d27', borderRadius: 6, color: '#e8eaed',
                        fontSize: 12, outline: 'none',
                      }}
                    />
                    {newInstrItems.length > 1 && (
                      <button onClick={() => setNewInstrItems(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: '0 4px' }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setNewInstrItems(prev => [...prev, ''])}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4f7fff', fontSize: 11, padding: 0 }}
                >
                  <Plus size={12} /> Add item (Enter)
                </button>
              </div>
              <button
                onClick={saveInstruction}
                disabled={savingInstr || !newInstrTitle.trim()}
                style={{
                  width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                  background: '#f59e0b', color: '#000', cursor: 'pointer',
                  fontWeight: 800, fontSize: 12, opacity: !newInstrTitle.trim() ? 0.4 : 1,
                }}
              >
                {savingInstr ? 'Creating...' : 'Create Instruction Set'}
              </button>
            </div>

            {/* Existing instructions */}
            <div style={{ padding: 14 }}>
              {instructions.length === 0 && (
                <div style={{ textAlign: 'center', color: '#5a6080', fontSize: 12, padding: '20px 0' }}>No instruction sets yet</div>
              )}
              {instructions.map(instr => {
                const items = instr.items || []
                const completed = items.filter(it => it.completed_at).length
                const approved = items.filter(it => it.approved_at).length
                const allDone = items.length > 0 && completed === items.length
                const isExpanded = expandedInstrId === instr.id

                return (
                  <div key={instr.id} style={{
                    background: '#0d0f14', borderRadius: 10, border: '1px solid #1a1d27', marginBottom: 10,
                    overflow: 'hidden',
                    borderLeft: allDone ? '3px solid #22c07a' : '3px solid #f59e0b',
                  }}>
                    <button
                      onClick={() => setExpandedInstrId(isExpanded ? null : instr.id)}
                      style={{
                        width: '100%', padding: '10px 12px', background: 'transparent', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#e8eaed' }}>{instr.title}</div>
                        <div style={{ fontSize: 10, color: '#5a6080', marginTop: 2 }}>
                          {completed}/{items.length} done · {approved}/{items.length} approved
                          {instr.created_by_profile && ` · by ${instr.created_by_profile.name}`}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ width: 40, height: 4, background: '#1a1d27', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${items.length > 0 ? (completed / items.length) * 100 : 0}%`, height: '100%', background: allDone ? '#22c07a' : '#f59e0b', borderRadius: 2 }} />
                      </div>
                      {isExpanded ? <ChevronUp size={12} style={{ color: '#5a6080', flexShrink: 0 }} /> : <ChevronDown size={12} style={{ color: '#5a6080', flexShrink: 0 }} />}
                    </button>

                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #1a1d27', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {items.length === 0 && <div style={{ fontSize: 11, color: '#5a6080', padding: '4px 0' }}>No items</div>}
                        {items.map(item => (
                          <div key={item.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
                            borderBottom: '1px solid #0d0f14',
                          }}>
                            {/* Completion checkbox */}
                            <button
                              onClick={() => toggleInstructionItem(instr.id, item, item.completed_at ? 'uncomplete' : 'complete')}
                              style={{
                                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                                border: `2px solid ${item.completed_at ? '#22c07a' : '#5a6080'}`,
                                background: item.completed_at ? '#22c07a' : 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {item.completed_at && <Check size={10} style={{ color: '#fff' }} />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: 12, color: item.completed_at ? '#5a6080' : '#e8eaed',
                                textDecoration: item.completed_at ? 'line-through' : 'none',
                                lineHeight: 1.4,
                              }}>
                                {item.text}
                              </div>
                              {item.completed_at && (
                                <div style={{ fontSize: 9, color: '#5a6080', marginTop: 2 }}>Completed</div>
                              )}
                            </div>
                            {/* Manager approve button */}
                            {item.completed_at && (
                              <button
                                onClick={() => toggleInstructionItem(instr.id, item, item.approved_at ? 'unapprove' : 'approve')}
                                title={item.approved_at ? 'Approved — click to revoke' : 'Approve this item'}
                                style={{
                                  background: item.approved_at ? 'rgba(34,192,122,0.15)' : 'transparent',
                                  border: 'none', cursor: 'pointer', borderRadius: 4, padding: '2px 4px',
                                  color: item.approved_at ? '#22c07a' : '#5a6080', flexShrink: 0,
                                }}
                              >
                                <CheckSquare size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        {allDone && (
                          <div style={{
                            marginTop: 6, padding: '8px 10px', borderRadius: 8,
                            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.2)',
                            fontSize: 11, fontWeight: 700, color: '#22c07a', textAlign: 'center',
                          }}>
                            All items complete!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── CSS KEYFRAMES ────────────────────────────────────────────── */}
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes waveBar {
          from { transform: scaleY(0.4) }
          to   { transform: scaleY(1) }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(79,127,255,0.4) }
          50%       { box-shadow: 0 0 0 8px rgba(79,127,255,0) }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Note Player Sub-component
// ─────────────────────────────────────────────────────────────────────────────
function VoiceNotePlayer({ note }: { note: DesignVoiceNote }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    audioRef.current = new Audio(note.audio_url)
    audioRef.current.onended = () => setPlaying(false)
    return () => { audioRef.current?.pause() }
  }, [note.audio_url])

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const layerColor = LAYER_CFG[note.layer as LayerKey]?.color || '#9299b5'

  return (
    <div style={{
      background: '#13151c', borderRadius: 8, border: '1px solid #1a1d27',
      padding: '8px 10px', borderLeft: `3px solid ${layerColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={togglePlay}
          style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: `${layerColor}20`, color: layerColor,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#5a6080' }}>
            {note.duration_seconds ? fmtTime(note.duration_seconds) : 'Voice note'} · {fmtDate(note.created_at)}
          </div>
          {/* Simple waveform bars (static decoration) */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 16, marginTop: 2 }}>
            {[4, 8, 6, 12, 8, 10, 6, 14, 8, 6, 10, 8, 12, 6, 8, 4].map((h, i) => (
              <div key={i} style={{
                width: 2, height: h, borderRadius: 1,
                background: playing ? layerColor : '#1a1d27',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        </div>
        {note.transcript && (
          <button
            onClick={() => setShowTranscript(v => !v)}
            title="Show transcript"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: '2px 4px' }}
          >
            <Volume2 size={12} />
          </button>
        )}
        {!note.transcript && (
          <span style={{ fontSize: 9, color: '#5a6080' }}>
            <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
          </span>
        )}
      </div>
      {showTranscript && note.transcript && (
        <div style={{
          marginTop: 8, padding: '6px 8px', background: '#0d0f14', borderRadius: 6,
          fontSize: 11, color: '#9299b5', lineHeight: 1.5, borderLeft: `2px solid ${layerColor}`,
        }}>
          {note.transcript}
        </div>
      )}
    </div>
  )
}
