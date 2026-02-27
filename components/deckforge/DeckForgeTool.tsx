'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import {
  MousePointer2, Square, Circle, Minus, Type, MapPin, Ruler, Eraser,
  Eye, EyeOff, Lock, Unlock, Trash2, ChevronLeft, ChevronRight,
  Download, ZoomIn, ZoomOut, Grid3x3, Cpu, Save, ArrowLeft,
  Upload, RotateCcw, ScanLine,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// Dynamic import for Three.js viewport (SSR: false)
const ThreeViewport = dynamic(
  () => import('./ThreeViewport').then(m => m.ThreeViewport),
  { ssr: false, loading: () => <div style={loadingStyle}>Loading 3D engine...</div> }
)

const loadingStyle: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: '#2dd4bf', fontFamily: 'monospace', fontSize: 13, background: '#141414',
}

// ── Types ──────────────────────────────────────────────────────────────────
type ToolType = 'select' | 'rect' | 'circle' | 'line' | 'text' | 'hardware' | 'measure' | 'eraser'
type HardwareType = 'screw' | 'bolt' | 'cleat' | 'drain' | 'fitting' | 'other'

interface BaseLayer {
  id: string; name: string; visible: boolean; locked: boolean
}
interface RectLayer extends BaseLayer {
  type: 'rect'; x: number; y: number; width: number; height: number
  fill: string; stroke: string; strokeWidth: number
}
interface CircleLayer extends BaseLayer {
  type: 'circle'; cx: number; cy: number; r: number
  fill: string; stroke: string; strokeWidth: number
}
interface LineLayer extends BaseLayer {
  type: 'line'; x1: number; y1: number; x2: number; y2: number
  stroke: string; strokeWidth: number
}
interface TextLayer extends BaseLayer {
  type: 'text'; x: number; y: number; text: string; fill: string; fontSize: number
}
interface HardwareLayer extends BaseLayer {
  type: 'hardware'; hwType: HardwareType
  x: number; y: number  // percentage of bgImage
  label: string; size: string; notes: string; confidence?: number
}
interface MeasureLayer extends BaseLayer {
  type: 'measure'; x1: number; y1: number; x2: number; y2: number
}

type CanvasLayer = RectLayer | CircleLayer | LineLayer | TextLayer | HardwareLayer | MeasureLayer

interface BgImage { src: string; width: number; height: number; fileId?: string }
interface DrawState { startX: number; startY: number; currentX: number; currentY: number }
interface LoadedFile { name: string; fileType: '3d' | 'image'; ext: string; url: string }

interface Props {
  projectId: string
  projectName: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
const HW_COLORS: Record<HardwareType, string> = {
  screw: '#f25a5a', bolt: '#f59e0b', cleat: '#22c07a',
  drain: '#22d3ee', fitting: '#8b5cf6', other: '#9299b5',
}
const HW_LABELS: Record<HardwareType, string> = {
  screw: 'S', bolt: 'B', cleat: 'C', drain: 'D', fitting: 'F', other: '?',
}

function uid() { return Math.random().toString(36).slice(2, 10) }

function getCursor(tool: ToolType, isPanning: boolean): string {
  if (isPanning) return 'grabbing'
  const map: Record<ToolType, string> = {
    select: 'default', rect: 'crosshair', circle: 'crosshair',
    line: 'crosshair', text: 'text', hardware: 'crosshair',
    measure: 'crosshair', eraser: 'cell',
  }
  return map[tool]
}

// ── Component ──────────────────────────────────────────────────────────────
export default function DeckForgeTool({ projectId, projectName }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [drawing, setDrawing] = useState<DrawState | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [spaceDown, setSpaceDown] = useState(false)
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  // Canvas state
  const [layers, setLayers] = useState<CanvasLayer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bgImage, setBgImage] = useState<BgImage | null>(null)
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null)
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('2d')

  // UI state
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [stretchComp, setStretchComp] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [placingText, setPlacingText] = useState<{ x: number; y: number } | null>(null)

  // Shape defaults
  const [fillColor, setFillColor] = useState('#2dd4bf22')
  const [strokeColor, setStrokeColor] = useState('#2dd4bf')
  const [strokeWidth, setStrokeWidth] = useState(1.5)

  // ── Load saved artboard ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/deckforge/artboards?project_id=${projectId}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.length > 0 && data[0].canvas_data) {
          const cd = data[0].canvas_data as {
            layers?: CanvasLayer[]
            bgImage?: BgImage | null
            loadedFile?: LoadedFile | null
            viewMode?: '3d' | '2d'
          }
          if (cd.layers) setLayers(cd.layers)
          if (cd.bgImage) setBgImage(cd.bgImage)
          if (cd.loadedFile) setLoadedFile(cd.loadedFile)
          if (cd.viewMode) setViewMode(cd.viewMode)
        }
      })
      .catch(() => {})
  }, [projectId])

  // ── Auto-save (debounced) ────────────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(), 5000)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scheduleSave() }, [layers, bgImage, viewMode, scheduleSave])

  const doSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/deckforge/artboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          canvas_data: { layers, bgImage, loadedFile, viewMode },
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const map: Record<string, ToolType> = {
        v: 'select', r: 'rect', c: 'circle', l: 'line', t: 'text',
        h: 'hardware', m: 'measure', e: 'eraser',
      }
      if (map[e.key]) setActiveTool(map[e.key])
      if (e.key === ' ') { e.preventDefault(); setSpaceDown(true) }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          setLayers(ls => ls.filter(l => l.id !== selectedId))
          setSelectedId(null)
        }
      }
      if (e.key === 'Escape') { setSelectedId(null); setDrawing(null); setPlacingText(null) }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') { e.preventDefault(); doSave() }
        if (e.key === 'z') setLayers(ls => ls.slice(0, -1))
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas coordinate helpers ────────────────────────────────────────────
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left - panX) / zoom, y: (clientY - rect.top - panY) / zoom }
  }, [panX, panY, zoom])

  // ── Mouse handlers ───────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || (spaceDown && e.button === 0)) {
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, panX, panY }
      e.preventDefault()
      return
    }
    if (e.button !== 0) return

    const { x, y } = screenToCanvas(e.clientX, e.clientY)

    if (activeTool === 'text') {
      setPlacingText({ x, y })
      return
    }
    if (activeTool === 'eraser') {
      // handled by layer onClick
      return
    }
    if (activeTool === 'select') return
    setDrawing({ startX: x, startY: y, currentX: x, currentY: y })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const canvasX = (e.clientX - rect.left - panX) / zoom
    const canvasY = (e.clientY - rect.top - panY) / zoom
    setCursorPos({ x: Math.round(canvasX), y: Math.round(canvasY) })

    if (isPanning && panStart.current) {
      setPanX(panStart.current.panX + (e.clientX - panStart.current.x))
      setPanY(panStart.current.panY + (e.clientY - panStart.current.y))
      return
    }
    if (drawing) {
      setDrawing(d => d ? { ...d, currentX: canvasX, currentY: canvasY } : null)
    }
  }

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) { setIsPanning(false); panStart.current = null; return }
    if (!drawing) return
    const { startX, startY, currentX, currentY } = drawing
    setDrawing(null)

    const dx = currentX - startX
    const dy = currentY - startY

    if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && activeTool !== 'hardware' && activeTool !== 'measure') return

    switch (activeTool) {
      case 'rect':
        setLayers(ls => [...ls, {
          id: uid(), name: `Rect ${ls.length + 1}`, type: 'rect', visible: true, locked: false,
          x: Math.min(startX, currentX), y: Math.min(startY, currentY),
          width: Math.abs(dx), height: Math.abs(dy),
          fill: fillColor, stroke: strokeColor, strokeWidth,
        }])
        break
      case 'circle': {
        const r = Math.sqrt(dx * dx + dy * dy) / 2
        setLayers(ls => [...ls, {
          id: uid(), name: `Circle ${ls.length + 1}`, type: 'circle', visible: true, locked: false,
          cx: startX + dx / 2, cy: startY + dy / 2, r,
          fill: fillColor, stroke: strokeColor, strokeWidth,
        }])
        break
      }
      case 'line':
        setLayers(ls => [...ls, {
          id: uid(), name: `Line ${ls.length + 1}`, type: 'line', visible: true, locked: false,
          x1: startX, y1: startY, x2: currentX, y2: currentY,
          stroke: strokeColor, strokeWidth,
        }])
        break
      case 'measure': {
        const distPx = Math.sqrt(dx * dx + dy * dy)
        setLayers(ls => [...ls, {
          id: uid(), name: `Measure ${ls.filter(l => l.type === 'measure').length + 1}`,
          type: 'measure', visible: true, locked: false,
          x1: startX, y1: startY, x2: currentX, y2: currentY,
          _distPx: distPx,
        } as MeasureLayer])
        break
      }
      case 'hardware': {
        if (!bgImage) return
        const xPct = Math.max(0, Math.min(100, (startX / bgImage.width) * 100))
        const yPct = Math.max(0, Math.min(100, (startY / bgImage.height) * 100))
        setLayers(ls => [...ls, {
          id: uid(), name: 'Hardware marker', type: 'hardware', visible: true, locked: false,
          hwType: 'screw', x: xPct, y: yPct, label: '', size: '', notes: '',
        }])
        break
      }
    }
  }

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const rect = svgRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    setZoom(z => {
      const nz = Math.max(0.1, Math.min(10, z * factor))
      setPanX(px => mouseX - (mouseX - px) * (nz / z))
      setPanY(py => mouseY - (mouseY - py) * (nz / z))
      return nz
    })
  }

  // ── File upload ──────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const is3D = ['ply', 'obj', 'stl'].includes(ext)
      const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)

      const path = `deckforge/${projectId}/${Date.now()}_${file.name}`
      const { data: storageData, error: storageErr } = await supabase.storage
        .from('project-files')
        .upload(path, file)

      if (storageErr) throw storageErr

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(storageData.path)

      // Save file record
      const { data: fileRecord } = await fetch('/api/deckforge/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId, name: file.name, original_name: file.name,
          file_type: ext, file_size: file.size,
          storage_path: storageData.path, metadata: { publicUrl },
        }),
      }).then(r => r.json())

      const newFile: LoadedFile = {
        name: file.name, fileType: is3D ? '3d' : 'image', ext, url: publicUrl,
      }
      setLoadedFile(newFile)

      if (isImage) {
        const img = new Image()
        img.onload = () => {
          setBgImage({ src: publicUrl, width: img.width, height: img.height, fileId: fileRecord?.id })
          setViewMode('2d')
          fitImage(img.width, img.height)
        }
        img.src = publicUrl
      } else if (is3D) {
        setViewMode('3d')
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const fitImage = (imgW: number, imgH: number) => {
    const area = canvasAreaRef.current
    if (!area) return
    const cw = area.clientWidth - 80
    const ch = area.clientHeight - 80
    const scale = Math.min(cw / imgW, ch / imgH, 1) * 0.95
    setZoom(scale)
    setPanX((area.clientWidth - imgW * scale) / 2)
    setPanY((area.clientHeight - imgH * scale) / 2)
  }

  // ── Hardware detection ───────────────────────────────────────────────────
  const detectHardware = async () => {
    if (!bgImage) return
    setDetecting(true)
    try {
      // Capture bgImage as base64
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = bgImage.src })
      const canvas = document.createElement('canvas')
      const maxDim = 1600
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const b64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]

      const res = await fetch('/api/deckforge/detect-hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, imageType: 'image/jpeg' }),
      })
      const { annotations } = await res.json()

      if (Array.isArray(annotations)) {
        const newLayers: HardwareLayer[] = annotations.map((a: {
          type?: string; x?: number; y?: number; label?: string; confidence?: number
        }) => ({
          id: uid(),
          name: a.label || String(a.type || 'hardware'),
          type: 'hardware' as const,
          visible: true, locked: false,
          hwType: (['screw', 'bolt', 'cleat', 'drain', 'fitting', 'other'].includes(String(a.type))
            ? String(a.type) : 'other') as HardwareType,
          x: Number(a.x) || 50, y: Number(a.y) || 50,
          label: a.label || '', size: '', notes: '',
          confidence: a.confidence,
        }))
        setLayers(ls => [...ls, ...newLayers])
      }
    } catch (err) {
      console.error('Detect hardware failed:', err)
    } finally {
      setDetecting(false)
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────
  const exportSVG = () => {
    if (!svgRef.current) return
    const svgStr = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${projectName}.svg`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportPNG = () => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const w = svg.clientWidth; const h = svg.clientHeight
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    const svgStr = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `${projectName}.png`; a.click()
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const exportDXF = () => {
    let dxf = '0\nSECTION\n2\nENTITIES\n'
    layers.filter(l => l.visible).forEach(layer => {
      if (layer.type === 'rect') {
        const { x, y, width, height } = layer;
        const sides: [number,number,number,number][] = [
          [x, y, x+width, y],
          [x+width, y, x+width, y+height],
          [x+width, y+height, x, y+height],
          [x, y+height, x, y],
        ]
        sides.forEach(([x1,y1,x2,y2]) => {
          dxf += `0\nLINE\n8\n0\n10\n${x1}\n20\n${-y1}\n30\n0.0\n11\n${x2}\n21\n${-y2}\n31\n0.0\n`
        })
      } else if (layer.type === 'line') {
        dxf += `0\nLINE\n8\n0\n10\n${layer.x1}\n20\n${-layer.y1}\n30\n0.0\n11\n${layer.x2}\n21\n${-layer.y2}\n31\n0.0\n`
      } else if (layer.type === 'circle') {
        dxf += `0\nCIRCLE\n8\n0\n10\n${layer.cx}\n20\n${-layer.cy}\n30\n0.0\n40\n${layer.r}\n`
      }
    })
    dxf += '0\nENDSEC\n0\nEOF\n'
    const blob = new Blob([dxf], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${projectName}.dxf`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render helpers ───────────────────────────────────────────────────────
  const selectedLayer = layers.find(l => l.id === selectedId) ?? null

  const renderLayer = (layer: CanvasLayer) => {
    if (!layer.visible) return null
    const sel = selectedId === layer.id
    const onClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (activeTool === 'eraser') { setLayers(ls => ls.filter(l => l.id !== layer.id)); return }
      if (activeTool === 'select') setSelectedId(layer.id)
    }

    switch (layer.type) {
      case 'rect':
        return (
          <g key={layer.id} onClick={onClick} style={{ cursor: activeTool === 'select' ? 'pointer' : undefined }}>
            <rect x={layer.x} y={layer.y} width={layer.width} height={layer.height}
              fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />
            {sel && <rect x={layer.x - 3} y={layer.y - 3} width={layer.width + 6} height={layer.height + 6}
              fill="none" stroke="#2dd4bf" strokeWidth={1} strokeDasharray="4,2" style={{ pointerEvents: 'none' }} />}
          </g>
        )
      case 'circle':
        return (
          <g key={layer.id} onClick={onClick}>
            <circle cx={layer.cx} cy={layer.cy} r={layer.r}
              fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />
            {sel && <circle cx={layer.cx} cy={layer.cy} r={layer.r + 5}
              fill="none" stroke="#2dd4bf" strokeWidth={1} strokeDasharray="4,2" style={{ pointerEvents: 'none' }} />}
          </g>
        )
      case 'line':
        return (
          <g key={layer.id} onClick={onClick}>
            <line x1={layer.x1} y1={layer.y1} x2={layer.x2} y2={layer.y2}
              stroke={layer.stroke} strokeWidth={layer.strokeWidth + 4} strokeOpacity={0} />
            <line x1={layer.x1} y1={layer.y1} x2={layer.x2} y2={layer.y2}
              stroke={sel ? '#2dd4bf' : layer.stroke} strokeWidth={layer.strokeWidth} />
          </g>
        )
      case 'text':
        return (
          <text key={layer.id} x={layer.x} y={layer.y} fill={sel ? '#2dd4bf' : layer.fill}
            fontSize={layer.fontSize} style={{ fontFamily: 'JetBrains Mono, monospace', userSelect: 'none', cursor: 'pointer' }}
            onClick={onClick}>
            {layer.text}
          </text>
        )
      case 'hardware': {
        if (!bgImage) return null
        const hx = (layer.x / 100) * bgImage.width
        const hy = (layer.y / 100) * bgImage.height
        const color = HW_COLORS[layer.hwType]
        return (
          <g key={layer.id} transform={`translate(${hx}, ${hy})`} onClick={onClick}
            style={{ cursor: activeTool === 'select' ? 'pointer' : undefined }}>
            <circle r={sel ? 14 : 11} fill={color} fillOpacity={0.85} stroke={sel ? '#fff' : 'rgba(255,255,255,0.4)'} strokeWidth={sel ? 2 : 1} />
            <text textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#fff" fontWeight="bold"
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {HW_LABELS[layer.hwType]}
            </text>
            {layer.label && (
              <text x={16} y={4} fontSize={10} fill={color} style={{ userSelect: 'none', pointerEvents: 'none' }}>
                {layer.label}
              </text>
            )}
          </g>
        )
      }
      case 'measure': {
        const dx = layer.x2 - layer.x1; const dy = layer.y2 - layer.y1
        const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1)
        const mx = (layer.x1 + layer.x2) / 2; const my = (layer.y1 + layer.y2) / 2
        return (
          <g key={layer.id} onClick={onClick}>
            <line x1={layer.x1} y1={layer.y1} x2={layer.x2} y2={layer.y2}
              stroke="#f59e0b" strokeWidth={sel ? 2 : 1.5} strokeDasharray="5,3" />
            <rect x={mx - 22} y={my - 11} width={44} height={16} rx={3} fill="#0d0f14" fillOpacity={0.85} />
            <text x={mx} y={my + 3} textAnchor="middle" fontSize={10} fill="#f59e0b"
              style={{ fontFamily: 'monospace', userSelect: 'none' }}>
              {dist}px
            </text>
          </g>
        )
      }
    }
  }

  const renderDrawingPreview = () => {
    if (!drawing) return null
    const { startX, startY, currentX, currentY } = drawing
    const dx = currentX - startX; const dy = currentY - startY
    switch (activeTool) {
      case 'rect':
        return <rect x={Math.min(startX, currentX)} y={Math.min(startY, currentY)}
          width={Math.abs(dx)} height={Math.abs(dy)}
          fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray="4,2" />
      case 'circle': {
        const r = Math.sqrt(dx * dx + dy * dy) / 2
        return <circle cx={startX + dx / 2} cy={startY + dy / 2} r={r}
          fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray="4,2" />
      }
      case 'line':
        return <line x1={startX} y1={startY} x2={currentX} y2={currentY}
          stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray="4,2" />
      case 'measure': {
        const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1)
        const mx = (startX + currentX) / 2; const my = (startY + currentY) / 2
        return (
          <g>
            <line x1={startX} y1={startY} x2={currentX} y2={currentY}
              stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" />
            <rect x={mx - 22} y={my - 11} width={44} height={16} rx={3} fill="#0d0f14" fillOpacity={0.85} />
            <text x={mx} y={my + 3} textAnchor="middle" fontSize={10} fill="#f59e0b"
              style={{ fontFamily: 'monospace' }}>
              {dist}px
            </text>
          </g>
        )
      }
      default: return null
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────────
  const TOOL_BTN = (active: boolean): React.CSSProperties => ({
    width: 34, height: 34, borderRadius: 7, border: 'none', cursor: 'pointer',
    background: active ? '#2dd4bf22' : 'transparent',
    color: active ? '#2dd4bf' : '#666',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.1s',
  })

  const PANEL_HEADER: React.CSSProperties = {
    fontSize: 10, color: '#444', letterSpacing: 1.5, fontFamily: 'monospace',
    padding: '10px 12px 6px', textTransform: 'uppercase' as const,
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#141414', overflow: 'hidden', color: '#ccc',
    }}>

      {/* ── TOP TOOLBAR ── */}
      <div style={{
        height: 46, background: '#1a1a1a', borderBottom: '1px solid #222',
        display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px',
        flexShrink: 0, zIndex: 100,
      }}>
        {/* Back + Logo */}
        <button onClick={() => router.push('/deckforge')}
          style={{ ...TOOL_BTN(false), color: '#555', marginRight: 2 }}
          title="Back to projects">
          <ArrowLeft size={14} />
        </button>
        <div style={{ width: 1, height: 22, background: '#2a2a2a', marginRight: 4 }} />
        <span style={{
          fontSize: 13, fontWeight: 700, color: '#2dd4bf',
          fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: 2,
          marginRight: 4,
        }}>DECKFORGE</span>
        <span style={{ fontSize: 11, color: '#444', marginRight: 8, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {projectName}
        </span>

        {/* File menu */}
        <div style={{ position: 'relative', marginRight: 4 }}>
          <button onClick={() => setFileMenuOpen(o => !o)}
            style={{ ...TOOL_BTN(fileMenuOpen), fontSize: 11, width: 'auto', padding: '0 10px', color: '#888' }}>
            File
          </button>
          {fileMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, background: '#1e1e1e',
              border: '1px solid #2a2a2a', borderRadius: 8, zIndex: 200, minWidth: 150, padding: 4,
            }} onMouseLeave={() => setFileMenuOpen(false)}>
              {[
                { label: 'Upload file...', action: () => { fileInputRef.current?.click(); setFileMenuOpen(false) } },
                { label: 'Save (Ctrl+S)', action: () => { doSave(); setFileMenuOpen(false) } },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 12, borderRadius: 5,
                  }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 1, height: 22, background: '#2a2a2a' }} />

        {/* Tools */}
        {([
          { tool: 'select' as ToolType, icon: <MousePointer2 size={14} />, title: 'Select (V)' },
          { tool: 'rect' as ToolType, icon: <Square size={14} />, title: 'Rectangle (R)' },
          { tool: 'circle' as ToolType, icon: <Circle size={14} />, title: 'Circle (C)' },
          { tool: 'line' as ToolType, icon: <Minus size={14} />, title: 'Line (L)' },
          { tool: 'text' as ToolType, icon: <Type size={14} />, title: 'Text (T)' },
          { tool: 'hardware' as ToolType, icon: <MapPin size={14} />, title: 'Hardware marker (H)' },
          { tool: 'measure' as ToolType, icon: <Ruler size={14} />, title: 'Measure (M)' },
          { tool: 'eraser' as ToolType, icon: <Eraser size={14} />, title: 'Eraser (E)' },
        ] as const).map(({ tool, icon, title }) => (
          <button key={tool} onClick={() => setActiveTool(tool)}
            style={TOOL_BTN(activeTool === tool)} title={title}>
            {icon}
          </button>
        ))}

        <div style={{ width: 1, height: 22, background: '#2a2a2a', margin: '0 4px' }} />

        {/* Grid toggle */}
        <button onClick={() => setShowGrid(g => !g)}
          style={TOOL_BTN(showGrid)} title="Toggle grid">
          <Grid3x3 size={14} />
        </button>

        {/* Hardware detect */}
        {bgImage && (
          <button onClick={detectHardware} disabled={detecting}
            style={{ ...TOOL_BTN(detecting), color: detecting ? '#2dd4bf' : '#666' }}
            title="AI detect hardware">
            <Cpu size={14} />
          </button>
        )}

        {/* View mode toggle for 3D files */}
        {loadedFile?.fileType === '3d' && (
          <button
            onClick={() => setViewMode(v => v === '3d' ? '2d' : '3d')}
            style={{ ...TOOL_BTN(false), width: 'auto', padding: '0 10px', fontSize: 11, color: '#aaa' }}>
            {viewMode === '3d' ? '→ 2D' : '→ 3D'}
          </button>
        )}

        {/* Flatten stretch when in flatten mode */}
        {bgImage && bgImage.src.startsWith('data:') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>Stretch</span>
            <input type="range" min={0} max={100} value={stretchComp}
              onChange={e => setStretchComp(Number(e.target.value))}
              style={{ width: 70, accentColor: '#2dd4bf' }} />
            <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{stretchComp}%</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} style={TOOL_BTN(false)} title="Zoom in"><ZoomIn size={14} /></button>
        <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} style={TOOL_BTN(false)} title="Zoom out"><ZoomOut size={14} /></button>
        <button onClick={() => { if (bgImage) fitImage(bgImage.width, bgImage.height); else { setZoom(1); setPanX(0); setPanY(0) } }}
          style={TOOL_BTN(false)} title="Reset view"><RotateCcw size={14} /></button>

        <div style={{ width: 1, height: 22, background: '#2a2a2a', margin: '0 4px' }} />

        {/* Detect / Upload */}
        <button onClick={() => fileInputRef.current?.click()}
          style={{ ...TOOL_BTN(false), color: uploading ? '#2dd4bf' : '#666' }}
          title="Upload file" disabled={uploading}>
          <Upload size={14} />
        </button>

        {/* Save indicator */}
        <button onClick={doSave} style={TOOL_BTN(false)} title="Save (Ctrl+S)">
          <Save size={14} style={{ color: saving ? '#2dd4bf' : '#555' }} />
        </button>

        {/* Export */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setExportOpen(o => !o)}
            style={{ ...TOOL_BTN(false), width: 'auto', padding: '0 12px', color: '#888', fontSize: 12 }}>
            <Download size={13} />
            <span style={{ marginLeft: 5 }}>Export</span>
          </button>
          {exportOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, background: '#1e1e1e',
              border: '1px solid #2a2a2a', borderRadius: 8, zIndex: 200, minWidth: 130, padding: 4,
            }} onMouseLeave={() => setExportOpen(false)}>
              {[
                { label: 'SVG', action: exportSVG },
                { label: 'PNG', action: exportPNG },
                { label: 'DXF', action: exportDXF },
              ].map(item => (
                <button key={item.label} onClick={() => { item.action(); setExportOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 12, borderRadius: 5,
                  }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file"
          accept=".ply,.obj,.stl,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
        />
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LEFT PANEL (Layers) ── */}
        <div style={{
          width: leftOpen ? 220 : 0, flexShrink: 0, overflow: 'hidden',
          background: '#1a1a1a', borderRight: '1px solid #222',
          display: 'flex', flexDirection: 'column', transition: 'width 0.15s',
        }}>
          {leftOpen && (
            <>
              <div style={{ ...PANEL_HEADER, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Layers</span>
                <span style={{ color: '#555' }}>{layers.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {layers.length === 0 ? (
                  <div style={{ padding: '20px 12px', color: '#444', fontSize: 11, textAlign: 'center', fontFamily: 'monospace' }}>
                    No layers yet
                  </div>
                ) : (
                  [...layers].reverse().map(layer => (
                    <div key={layer.id}
                      onClick={() => setSelectedId(selectedId === layer.id ? null : layer.id)}
                      style={{
                        padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 7,
                        background: selectedId === layer.id ? '#2dd4bf11' : 'transparent',
                        borderLeft: selectedId === layer.id ? '2px solid #2dd4bf' : '2px solid transparent',
                        cursor: 'pointer',
                      }}>
                      <span style={{ fontSize: 10, color: HW_COLORS[(layer as HardwareLayer).hwType] ?? '#666', minWidth: 14 }}>
                        {layer.type === 'rect' ? '▭' : layer.type === 'circle' ? '○' :
                          layer.type === 'line' ? '/' : layer.type === 'text' ? 'T' :
                            layer.type === 'hardware' ? '⊕' : layer.type === 'measure' ? '←→' : '?'}
                      </span>
                      <span style={{ fontSize: 11, color: '#bbb', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {layer.name}
                      </span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button onClick={e => { e.stopPropagation(); setLayers(ls => ls.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: layer.visible ? '#555' : '#333', padding: 2 }}>
                          {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                        </button>
                        <button onClick={e => { e.stopPropagation(); setLayers(ls => ls.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: layer.locked ? '#2dd4bf' : '#444', padding: 2 }}>
                          {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                        </button>
                        <button onClick={e => { e.stopPropagation(); setLayers(ls => ls.filter(l => l.id !== layer.id)); if (selectedId === layer.id) setSelectedId(null) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f25a5a44', padding: 2 }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Left panel toggle */}
        <button onClick={() => setLeftOpen(o => !o)} style={{
          width: 14, background: '#1e1e1e', border: 'none', borderRight: '1px solid #222',
          cursor: 'pointer', color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {leftOpen ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
        </button>

        {/* ── CANVAS AREA ── */}
        <div
          ref={canvasAreaRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#141414' }}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) uploadFile(file)
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
        >
          {/* 3D viewport */}
          {viewMode === '3d' && loadedFile?.fileType === '3d' && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <ThreeViewport
                fileUrl={loadedFile.url}
                fileType={loadedFile.ext}
                onFlattenComplete={dataUrl => {
                  const img = new Image()
                  img.onload = () => {
                    setBgImage({ src: dataUrl, width: img.width, height: img.height })
                    setViewMode('2d')
                    fitImage(img.width, img.height)
                  }
                  img.src = dataUrl
                }}
              />
            </div>
          )}

          {/* 2D SVG canvas */}
          {(viewMode === '2d' || loadedFile?.fileType !== '3d') && (
            <svg
              ref={svgRef}
              style={{
                width: '100%', height: '100%',
                cursor: getCursor(activeTool, isPanning),
                userSelect: 'none',
                display: 'block',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onClick={e => { if (e.target === svgRef.current) setSelectedId(null) }}
            >
              {/* Grid background (screen-space) */}
              {showGrid && (
                <defs>
                  <pattern id="df-grid-sm" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse"
                    x={panX % (20 * zoom)} y={panY % (20 * zoom)}>
                    <path d={`M ${20 * zoom} 0 L 0 0 0 ${20 * zoom}`} fill="none" stroke="#1e1e1e" strokeWidth={0.5} />
                  </pattern>
                  <pattern id="df-grid-lg" width={100 * zoom} height={100 * zoom} patternUnits="userSpaceOnUse"
                    x={panX % (100 * zoom)} y={panY % (100 * zoom)}>
                    <path d={`M ${100 * zoom} 0 L 0 0 0 ${100 * zoom}`} fill="none" stroke="#222" strokeWidth={0.5} />
                  </pattern>
                </defs>
              )}
              {showGrid && <rect width="100%" height="100%" fill="url(#df-grid-sm)" />}
              {showGrid && <rect width="100%" height="100%" fill="url(#df-grid-lg)" />}

              {/* All canvas content (transforms for pan/zoom) */}
              <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
                {/* Background image with optional stretch compensation */}
                {bgImage && (
                  <image
                    href={bgImage.src}
                    x={0} y={0}
                    width={bgImage.width}
                    height={bgImage.height}
                    style={{ filter: stretchComp > 0 ? `saturate(${1 + stretchComp / 100})` : undefined }}
                    preserveAspectRatio="none"
                  />
                )}

                {/* Layers */}
                {layers.map(renderLayer)}

                {/* Drawing preview */}
                {renderDrawingPreview()}
              </g>
            </svg>
          )}

          {/* Drop zone overlay (when no file) */}
          {!loadedFile && !bgImage && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                border: `2px dashed ${dragOver ? '#2dd4bf' : '#2a2a2a'}`,
                borderRadius: 20, padding: '48px 60px', textAlign: 'center',
                background: dragOver ? '#2dd4bf08' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <ScanLine size={48} style={{ color: dragOver ? '#2dd4bf' : '#2a2a2a', marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15, color: dragOver ? '#2dd4bf' : '#444', marginBottom: 6 }}>
                  Drop a file here to begin
                </p>
                <p style={{ fontSize: 11, color: '#333' }}>
                  Supports .ply, .obj, .stl, .jpg, .png
                </p>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              background: '#1e1e1e', border: '1px solid #2dd4bf33', borderRadius: 8,
              padding: '8px 16px', color: '#2dd4bf', fontSize: 12, fontFamily: 'monospace',
            }}>
              Uploading...
            </div>
          )}

          {/* Detecting overlay */}
          {detecting && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#2dd4bf', fontSize: 14, fontFamily: 'monospace',
            }}>
              <Cpu size={20} style={{ marginRight: 10, animation: 'spin 1s linear infinite' }} />
              Analyzing deck hardware...
            </div>
          )}

          {/* Text input overlay */}
          {placingText && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
              onClick={() => setPlacingText(null)}
            >
              <div style={{ background: '#1e1e1e', border: '1px solid #2dd4bf', borderRadius: 8, padding: 16 }}
                onClick={e => e.stopPropagation()}>
                <p style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Enter text</p>
                <input autoFocus
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && textInput.trim()) {
                      setLayers(ls => [...ls, {
                        id: uid(), name: textInput, type: 'text', visible: true, locked: false,
                        x: placingText.x, y: placingText.y, text: textInput, fill: strokeColor, fontSize: 16,
                      }])
                      setTextInput(''); setPlacingText(null)
                    }
                    if (e.key === 'Escape') { setTextInput(''); setPlacingText(null) }
                  }}
                  placeholder="Type and press Enter..."
                  style={{
                    background: '#141414', border: '1px solid #333', borderRadius: 6,
                    color: '#ccc', fontSize: 13, padding: '6px 10px', outline: 'none', width: 240,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right panel toggle */}
        <button onClick={() => setRightOpen(o => !o)} style={{
          width: 14, background: '#1e1e1e', border: 'none', borderLeft: '1px solid #222',
          cursor: 'pointer', color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {rightOpen ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
        </button>

        {/* ── RIGHT PANEL (Properties) ── */}
        <div style={{
          width: rightOpen ? 220 : 0, flexShrink: 0, overflow: 'hidden',
          background: '#1a1a1a', borderLeft: '1px solid #222',
          transition: 'width 0.15s',
        }}>
          {rightOpen && (
            <div style={{ padding: 12 }}>
              <div style={PANEL_HEADER}>Properties</div>

              {!selectedLayer ? (
                <>
                  {/* Default shape colors */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Fill</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="color" value={fillColor.slice(0, 7)}
                        onChange={e => setFillColor(e.target.value + '22')}
                        style={{ width: 28, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
                      <input value={fillColor} onChange={e => setFillColor(e.target.value)}
                        style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: 5, color: '#888', fontSize: 11, padding: '3px 6px' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Stroke</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="color" value={strokeColor}
                        onChange={e => setStrokeColor(e.target.value)}
                        style={{ width: 28, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
                      <input value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
                        style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: 5, color: '#888', fontSize: 11, padding: '3px 6px' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Stroke Width</label>
                    <input type="number" value={strokeWidth} step={0.5} min={0.5} max={20}
                      onChange={e => setStrokeWidth(Number(e.target.value))}
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 12, padding: '4px 8px', boxSizing: 'border-box' }} />
                  </div>
                </>
              ) : selectedLayer.type === 'hardware' ? (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Type</label>
                    <select value={selectedLayer.hwType}
                      onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, hwType: e.target.value as HardwareType } : l))}
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 12, padding: '4px 8px' }}>
                      {(['screw', 'bolt', 'cleat', 'drain', 'fitting', 'other'] as HardwareType[]).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {[
                    { key: 'label', label: 'Label' },
                    { key: 'size', label: 'Size' },
                    { key: 'notes', label: 'Notes' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>{label}</label>
                      <input value={(selectedLayer as HardwareLayer)[key as 'label' | 'size' | 'notes']}
                        onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, [key]: e.target.value } : l))}
                        style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 11, padding: '4px 8px', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  {selectedLayer.confidence && (
                    <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
                      AI confidence: {Math.round(selectedLayer.confidence * 100)}%
                    </div>
                  )}
                </>
              ) : selectedLayer.type === 'rect' ? (
                <>
                  {[
                    { key: 'x', label: 'X' }, { key: 'y', label: 'Y' },
                    { key: 'width', label: 'W' }, { key: 'height', label: 'H' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 10, color: '#555', minWidth: 16 }}>{label}</label>
                      <input type="number" value={Math.round((selectedLayer as RectLayer)[key as keyof RectLayer] as number)}
                        onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, [key]: Number(e.target.value) } : l))}
                        style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 11, padding: '3px 6px' }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Fill</label>
                    <input value={(selectedLayer as RectLayer).fill}
                      onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, fill: e.target.value } : l))}
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 11, padding: '4px 8px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Stroke</label>
                    <input value={(selectedLayer as RectLayer).stroke}
                      onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, stroke: e.target.value } : l))}
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 11, padding: '4px 8px', boxSizing: 'border-box' }} />
                  </div>
                </>
              ) : selectedLayer.type === 'text' ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Text</label>
                    <input value={(selectedLayer as TextLayer).text}
                      onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, text: e.target.value, name: e.target.value } : l))}
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 11, padding: '4px 8px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Font size</label>
                    <input type="number" value={(selectedLayer as TextLayer).fontSize}
                      onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, fontSize: Number(e.target.value) } : l))}
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 11, padding: '4px 8px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: '#555', display: 'block', marginBottom: 4 }}>Color</label>
                    <input value={(selectedLayer as TextLayer).fill}
                      onChange={e => setLayers(ls => ls.map(l => l.id === selectedId ? { ...l, fill: e.target.value } : l))}
                      style={{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: 5, color: '#ccc', fontSize: 11, padding: '4px 8px', boxSizing: 'border-box' }} />
                  </div>
                </>
              ) : selectedLayer.type === 'measure' ? (
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>
                  <div>x1: {Math.round(selectedLayer.x1)}, y1: {Math.round(selectedLayer.y1)}</div>
                  <div>x2: {Math.round(selectedLayer.x2)}, y2: {Math.round(selectedLayer.y2)}</div>
                  <div style={{ marginTop: 6, color: '#f59e0b' }}>
                    {Math.round(Math.sqrt(
                      Math.pow(selectedLayer.x2 - selectedLayer.x1, 2) +
                      Math.pow(selectedLayer.y2 - selectedLayer.y1, 2)
                    ))}px
                  </div>
                </div>
              ) : null}

              {/* Delete button */}
              {selectedLayer && (
                <button
                  onClick={() => { setLayers(ls => ls.filter(l => l.id !== selectedId)); setSelectedId(null) }}
                  style={{
                    marginTop: 12, width: '100%', padding: '7px', background: '#f25a5a11',
                    border: '1px solid #f25a5a33', borderRadius: 7, cursor: 'pointer',
                    color: '#f25a5a', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                  <Trash2 size={11} /> Delete layer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{
        height: 26, background: '#111', borderTop: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px',
        fontSize: 10, color: '#444', fontFamily: 'monospace', flexShrink: 0,
      }}>
        <span>X: {cursorPos.x}</span>
        <span>Y: {cursorPos.y}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Layers: {layers.length}</span>
        {loadedFile && <span style={{ color: '#333' }}>{loadedFile.name}</span>}
        {saving && <span style={{ color: '#2dd4bf55' }}>saving...</span>}
        <span style={{ marginLeft: 'auto', color: '#2a2a2a' }}>
          V=select R=rect C=circle L=line T=text H=hw M=measure E=erase | Del=delete | Space=pan
        </span>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
