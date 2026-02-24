'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import {
  ArrowLeft, Save, Type, Square, Circle, Upload, Minus,
  Undo2, Redo2, Trash2, Move, Palette, Send, MessageCircle,
  FileText, Lightbulb, ZoomIn, ZoomOut, Layers, ChevronDown,
  Eye, EyeOff, Lock, Unlock, GripVertical, Plus, X, Download,
  Check, AlertTriangle, ExternalLink, Copy, Image as ImageIcon,
  ArrowRight, PenLine, Ruler, Droplet, Bold, Italic, Underline,
  AlignLeft, Package, Printer, Wand2, Pencil, RefreshCw,
  Settings2, MousePointer2, Sparkles, Globe, ChevronRight,
  ChevronLeft,
} from 'lucide-react'

interface DesignCanvasClientProps {
  profile: Profile
  design: any
  jobImages: any[]
  comments: any[]
}

type ToolMode = 'select' | 'draw' | 'arrow' | 'rect' | 'circle' | 'text' | 'image' | 'measure' | 'eyedropper'
type RightPanel = 'layers' | 'coverage' | 'print' | 'files' | 'comments'

const VEHICLE_PANELS: Record<string, { label: string; sqft: number }[]> = {
  'Pickup Truck Crew Cab': [
    { label: 'Driver Side', sqft: 65 },
    { label: 'Passenger Side', sqft: 65 },
    { label: 'Hood', sqft: 30 },
    { label: 'Roof', sqft: 22 },
    { label: 'Rear / Tailgate', sqft: 18 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Rear Bumper', sqft: 8 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Pickup Truck Regular Cab': [
    { label: 'Driver Side', sqft: 48 },
    { label: 'Passenger Side', sqft: 48 },
    { label: 'Hood', sqft: 28 },
    { label: 'Roof', sqft: 16 },
    { label: 'Rear / Tailgate', sqft: 16 },
    { label: 'Front Bumper', sqft: 8 },
    { label: 'Rear Bumper', sqft: 7 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'SUV Full Size': [
    { label: 'Driver Side', sqft: 62 },
    { label: 'Passenger Side', sqft: 62 },
    { label: 'Hood', sqft: 28 },
    { label: 'Roof', sqft: 26 },
    { label: 'Rear', sqft: 18 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Rear Bumper', sqft: 8 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'SUV Medium': [
    { label: 'Driver Side', sqft: 52 },
    { label: 'Passenger Side', sqft: 52 },
    { label: 'Hood', sqft: 24 },
    { label: 'Roof', sqft: 20 },
    { label: 'Rear', sqft: 16 },
    { label: 'Front Bumper', sqft: 8 },
    { label: 'Rear Bumper', sqft: 7 },
    { label: 'Mirrors', sqft: 3 },
  ],
  'Sedan': [
    { label: 'Driver Side', sqft: 45 },
    { label: 'Passenger Side', sqft: 45 },
    { label: 'Hood', sqft: 22 },
    { label: 'Roof', sqft: 18 },
    { label: 'Trunk', sqft: 14 },
    { label: 'Front Bumper', sqft: 8 },
    { label: 'Rear Bumper', sqft: 7 },
    { label: 'Mirrors', sqft: 3 },
  ],
  'Cargo Van Standard': [
    { label: 'Driver Side', sqft: 80 },
    { label: 'Passenger Side', sqft: 80 },
    { label: 'Rear Doors', sqft: 38 },
    { label: 'Hood', sqft: 22 },
    { label: 'Roof', sqft: 48 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Cargo Van High Roof': [
    { label: 'Driver Side', sqft: 110 },
    { label: 'Passenger Side', sqft: 110 },
    { label: 'Rear Doors', sqft: 48 },
    { label: 'Hood', sqft: 22 },
    { label: 'Roof', sqft: 55 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Sprinter Van': [
    { label: 'Driver Side', sqft: 120 },
    { label: 'Passenger Side', sqft: 120 },
    { label: 'Rear Doors', sqft: 50 },
    { label: 'Hood', sqft: 24 },
    { label: 'Roof', sqft: 60 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Box Truck 16ft': [
    { label: 'Driver Side', sqft: 140 },
    { label: 'Passenger Side', sqft: 140 },
    { label: 'Rear Doors', sqft: 65 },
    { label: 'Cab Hood', sqft: 20 },
    { label: 'Cab Roof', sqft: 18 },
    { label: 'Cab Sides', sqft: 40 },
    { label: 'Front', sqft: 30 },
  ],
  'Box Truck 24ft': [
    { label: 'Driver Side', sqft: 200 },
    { label: 'Passenger Side', sqft: 200 },
    { label: 'Rear Doors', sqft: 80 },
    { label: 'Cab Hood', sqft: 22 },
    { label: 'Cab Roof', sqft: 20 },
    { label: 'Cab Sides', sqft: 48 },
    { label: 'Front', sqft: 36 },
  ],
  'Semi Trailer 48ft': [
    { label: 'Driver Side', sqft: 680 },
    { label: 'Passenger Side', sqft: 680 },
    { label: 'Rear Doors', sqft: 120 },
    { label: 'Nose', sqft: 80 },
  ],
}

const VEHICLE_TYPES = Object.keys(VEHICLE_PANELS)

const STYLE_CARDS = [
  'Bold & Aggressive', 'Corporate Professional', 'Minimalist Clean',
  'Racing Livery', 'Chrome & Metallic', 'Color Fade/Gradient',
  'Matte & Stealthy', 'Bright & Playful', 'Luxury Premium',
  'Industrial Rugged', 'Nature/Outdoors', 'Tech/Digital',
]

const COVERAGE_LABEL = (panels: string[], allPanels: string[]): string => {
  if (panels.length === 0) return 'No Coverage'
  if (panels.length === allPanels.length) return 'Full Wrap'
  const hasSides = panels.some(p => p.includes('Side'))
  const hasRoof = panels.some(p => p.includes('Roof'))
  const hasHood = panels.some(p => p.includes('Hood'))
  if (hasSides && hasRoof) return '3/4 Wrap'
  if (hasSides && !hasRoof && !hasHood) return 'Partial Wrap'
  if (hasHood && panels.length === 1) return 'Hood Wrap'
  return 'Custom Coverage'
}

const PRINT_CHECKS = [
  { key: 'bleed', label: 'Bleed added (0.125" all sides)', default: true },
  { key: 'resolution', label: 'Resolution ≥ 150 DPI at print size', default: false },
  { key: 'colorMode', label: 'Color mode CMYK', default: false },
  { key: 'fontOutline', label: 'No unoutlined fonts detected', default: true },
  { key: 'panelWidth', label: 'Panels within 54" material width', default: true },
  { key: 'seams', label: 'Seam marks placed correctly', default: true },
  { key: 'approved', label: 'Customer approved this design', default: false },
  { key: 'sqftMatch', label: 'Sqft matches estimate line item', default: false },
]

export default function DesignCanvasClient({ profile, design, jobImages, comments: initialComments }: DesignCanvasClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadFileRef = useRef<HTMLInputElement>(null)

  // UI state
  const [tool, setTool] = useState<ToolMode>('select')
  const [rightPanel, setRightPanel] = useState<RightPanel>('layers')
  const [zoom, setZoom] = useState(0.5)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(design.client_name || 'Untitled Canvas')
  const [designStatus, setDesignStatus] = useState<string>(design.status || 'brief')
  const [showStatusDrop, setShowStatusDrop] = useState(false)

  // Tool state
  const [fillColor, setFillColor] = useState('#4f7fff')
  const [strokeColor, setStrokeColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [opacity, setOpacity] = useState(100)
  const [fontSize, setFontSize] = useState(36)
  const [fontFamily, setFontFamily] = useState('Barlow Condensed')
  const [fontBold, setFontBold] = useState(false)
  const [fontItalic, setFontItalic] = useState(false)

  // Layer state
  const [layers, setLayers] = useState([
    { id: 'bg', name: 'Background Photo', visible: true, locked: false, opacity: 100 },
    { id: 'template', name: 'Vehicle Template', visible: true, locked: false, opacity: 100 },
    { id: 'coverage', name: 'Wrap Coverage', visible: true, locked: false, opacity: 60 },
    { id: 'design', name: 'Design Elements', visible: true, locked: false, opacity: 100 },
    { id: 'text', name: 'Text Layer', visible: true, locked: false, opacity: 100 },
    { id: 'annotations', name: 'Annotations', visible: true, locked: false, opacity: 100 },
  ])
  const [activeLayer, setActiveLayer] = useState('design')

  // Coverage state
  const [vehicleType, setVehicleType] = useState<string>(design.vehicle_type || VEHICLE_TYPES[0])
  const [selectedPanels, setSelectedPanels] = useState<string[]>([])
  const [wasteBuffer, setWasteBuffer] = useState(10)
  const [materialCostPerSqft, setMaterialCostPerSqft] = useState(3.5)

  // Files state
  const [designFiles, setDesignFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [fileDragOver, setFileDragOver] = useState(false)

  // Comments state
  const [comments, setComments] = useState<any[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  // AI Modal state
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiForm, setAiForm] = useState({
    brief: '',
    styles: [] as string[],
    colors: ['#4f7fff', '#22c07a', '', '', ''],
    websiteUrl: '',
    internalNotes: '',
  })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResults, setAiResults] = useState<string[]>([])
  const [aiScraping, setAiScraping] = useState(false)
  const [scrapedBrand, setScrapedBrand] = useState<any>(null)
  const [aiProgress, setAiProgress] = useState(0)

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    panels: true, brief: true, cutList: false,
    installGuide: false, customerProof: true, approvalForm: false,
  })
  const [exporting, setExporting] = useState(false)

  // High-res export state
  const [savingHighRes, setSavingHighRes] = useState(false)
  const [highResExportUrl, setHighResExportUrl] = useState<string | null>(design.print_export_url || null)

  // Prepare for print state (AI upscale + vectorize)
  const [preparingForPrint, setPreparingForPrint] = useState(false)
  const [printReadyUrl, setPrintReadyUrl] = useState<string | null>(null)

  // Vehicle template picker
  const [showVehicleTemplatePicker, setShowVehicleTemplatePicker] = useState(false)
  const VEHICLE_SILHOUETTES: Record<string, string> = {
    'pickup_crew': 'Pickup Truck — Crew Cab',
    'cargo_van_standard': 'Cargo Van — Standard',
    'cargo_van_high_roof': 'Cargo Van — High Roof',
    'box_truck_16': 'Box Truck — 16ft',
    'sedan': 'Sedan',
    'suv_mid': 'SUV — Mid Size',
  }

  // Undo/redo
  const [undoStack, setUndoStack] = useState<any[]>([])
  const [redoStack, setRedoStack] = useState<any[]>([])
  const [objectCount, setObjectCount] = useState(0)

  // Portal link
  const [portalLink, setPortalLink] = useState<string | null>(
    design.portal_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${design.portal_token}` : null
  )
  const [portalCopied, setPortalCopied] = useState(false)

  const linkedJob = design.linked_project || null

  // ── Coverage calculator ──
  const panelList = VEHICLE_PANELS[vehicleType] || VEHICLE_PANELS[VEHICLE_TYPES[0]]
  const netSqft = panelList
    .filter(p => selectedPanels.includes(p.label))
    .reduce((s, p) => s + p.sqft, 0)
  const bufferSqft = Math.ceil(netSqft * wasteBuffer / 100)
  const totalToOrder = netSqft + bufferSqft
  const materialCOGS = totalToOrder * materialCostPerSqft
  const coverageLabel = COVERAGE_LABEL(selectedPanels, panelList.map(p => p.label))

  // ── Fabric.js initialization ──
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return
    let mounted = true

    const initCanvas = async () => {
      try {
        const fabric = await import('fabric')
        if (!mounted || !canvasElRef.current) return

        const container = canvasContainerRef.current
        const w = container ? Math.max(container.clientWidth || 1200, 800) : 1200
        const h = container ? Math.max(container.clientHeight || 800, 600) : 800

        const fc = new (fabric as any).Canvas(canvasElRef.current, {
          width: w,
          height: h,
          backgroundColor: '#1a1d27',
          selection: true,
          preserveObjectStacking: true,
        })
        fabricRef.current = fc

        // Load saved canvas data
        if (design.canvas_data && typeof design.canvas_data === 'object' && Object.keys(design.canvas_data).length > 0) {
          try {
            fc.loadFromJSON(design.canvas_data, () => {
              if (mounted) {
                fc.renderAll()
                setObjectCount(fc.getObjects().length)
              }
            })
          } catch { /* ignore load errors */ }
        }

        // Track object count
        fc.on('object:added', () => { if (mounted) setObjectCount(fc.getObjects().length); setHasUnsaved(true) })
        fc.on('object:removed', () => { if (mounted) setObjectCount(fc.getObjects().length); setHasUnsaved(true) })
        fc.on('object:modified', () => { if (mounted) setHasUnsaved(true) })

        // Keyboard shortcuts
        const handleKey = (e: KeyboardEvent) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
            const active = fc.getActiveObject()
            if (active) { fc.remove(active); fc.discardActiveObject(); fc.renderAll() }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoCanvas() }
          if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redoCanvas() }
          if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCanvas() }
          if (e.key === 'v') setTool('select')
          if (e.key === 'r') setTool('rect')
          if (e.key === 'c') setTool('circle')
          if (e.key === 't') setTool('text')
          if (e.key === 'p') setTool('draw')
          if (e.key === 'a') setTool('arrow')
          if (e.key === 'm') setTool('measure')
        }
        window.addEventListener('keydown', handleKey)

        // Resize canvas when container changes size
        const handleResize = () => {
          const container = canvasContainerRef.current
          if (!container || !fabricRef.current) return
          const newW = Math.max(container.clientWidth || 800, 800)
          const newH = Math.max(container.clientHeight || 600, 600)
          fabricRef.current.setWidth(newW)
          fabricRef.current.setHeight(newH)
          fabricRef.current.renderAll()
        }
        window.addEventListener('resize', handleResize)

        if (mounted) {
          fc.renderAll()
        }

        return () => {
          window.removeEventListener('keydown', handleKey)
          window.removeEventListener('resize', handleResize)
        }
      } catch (err) {
        console.error('Fabric.js init error:', err)
      }
    }

    initCanvas()

    return () => {
      mounted = false
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync tool mode with fabric ──
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    fc.isDrawingMode = tool === 'draw'
    if (tool === 'draw') {
      if (fc.freeDrawingBrush) {
        fc.freeDrawingBrush.color = fillColor
        fc.freeDrawingBrush.width = strokeWidth
      }
    }
    fc.defaultCursor = tool === 'select' ? 'default' : 'crosshair'
  }, [tool, fillColor, strokeWidth])

  // ── Canvas click handlers for non-draw tools ──
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const fc = fabricRef.current
    if (!fc) return
    if (tool === 'rect') {
      addRect()
    } else if (tool === 'circle') {
      addCircle()
    } else if (tool === 'text') {
      addText()
    }
  }, [tool])

  // ── Autosave every 30s ──
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsaved) saveCanvas()
    }, 30000)
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsaved])

  // ── Save canvas ──
  const saveCanvas = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || saving) return
    setSaving(true)
    try {
      const canvasData = fc.toJSON(['id', 'layerId', 'selectable'])
      const updatePayload: Record<string, any> = {
        canvas_data: canvasData,
        status: designStatus,
        vehicle_type: vehicleType,
        panels: selectedPanels as any,
        vehicle_sqft: totalToOrder,
        updated_at: new Date().toISOString(),
      }
      // Only update title if the column exists (added by design_studio.sql migration)
      if (titleValue && titleValue !== 'Untitled Canvas') {
        updatePayload.title = titleValue
      }
      const { error } = await supabase.from('design_projects').update(updatePayload).eq('id', design.id)
      if (!error) {
        setLastSaved(new Date())
        setHasUnsaved(false)
      }
    } catch (err) { console.error('Save error:', err) }
    setSaving(false)
  }, [saving, titleValue, designStatus, vehicleType, selectedPanels, totalToOrder, design.id, supabase])

  // ── Undo/Redo ──
  const pushUndo = () => {
    const fc = fabricRef.current
    if (!fc) return
    setUndoStack(prev => [...prev.slice(-30), fc.toJSON()])
    setRedoStack([])
  }

  const undoCanvas = () => {
    const fc = fabricRef.current
    if (!fc || undoStack.length === 0) return
    const current = fc.toJSON()
    setRedoStack(prev => [...prev, current])
    const last = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    fc.loadFromJSON(last, () => fc.renderAll())
  }

  const redoCanvas = () => {
    const fc = fabricRef.current
    if (!fc || redoStack.length === 0) return
    const current = fc.toJSON()
    setUndoStack(prev => [...prev, current])
    const last = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    fc.loadFromJSON(last, () => fc.renderAll())
  }

  // ── Add objects ──
  const addRect = async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current
    if (!fc) return
    pushUndo()
    const rect = new (fabric as any).Rect({
      left: 200 + Math.random() * 100,
      top: 150 + Math.random() * 100,
      width: 200,
      height: 120,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth,
      opacity: opacity / 100,
      cornerSize: 8,
      transparentCorners: false,
    })
    fc.add(rect)
    fc.setActiveObject(rect)
    fc.renderAll()
    setTool('select')
  }

  const addCircle = async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current
    if (!fc) return
    pushUndo()
    const circle = new (fabric as any).Ellipse({
      left: 200 + Math.random() * 100,
      top: 150 + Math.random() * 100,
      rx: 80,
      ry: 60,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth,
      opacity: opacity / 100,
    })
    fc.add(circle)
    fc.setActiveObject(circle)
    fc.renderAll()
    setTool('select')
  }

  const addText = async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current
    if (!fc) return
    pushUndo()
    const text = new (fabric as any).IText('Edit Text Here', {
      left: 200 + Math.random() * 100,
      top: 200 + Math.random() * 100,
      fontSize,
      fontFamily: fontFamily + ', sans-serif',
      fontWeight: fontBold ? 'bold' : 'normal',
      fontStyle: fontItalic ? 'italic' : 'normal',
      underline: false,
      fill: fillColor,
      opacity: opacity / 100,
      editable: true,
    })
    fc.add(text)
    fc.setActiveObject(text)
    fc.renderAll()
    setTool('select')
  }

  const addArrow = async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current
    if (!fc) return
    pushUndo()
    const line = new (fabric as any).Line([100, 300, 400, 300], {
      stroke: fillColor,
      strokeWidth: strokeWidth + 1,
      selectable: true,
    })
    // Arrowhead triangle
    const triangle = new (fabric as any).Triangle({
      left: 386,
      top: 292,
      width: 20,
      height: 20,
      fill: fillColor,
      angle: 90,
    })
    const group = new (fabric as any).Group([line, triangle])
    fc.add(group)
    fc.setActiveObject(group)
    fc.renderAll()
    setTool('select')
  }

  const deleteSelected = () => {
    const fc = fabricRef.current
    if (!fc) return
    pushUndo()
    const active = fc.getActiveObject()
    if (active) {
      fc.remove(active)
      fc.discardActiveObject()
      fc.renderAll()
    }
  }

  const duplicateSelected = async () => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active) return
    pushUndo()
    active.clone((cloned: any) => {
      cloned.set({ left: (active.left || 0) + 20, top: (active.top || 0) + 20 })
      fc.add(cloned)
      fc.setActiveObject(cloned)
      fc.renderAll()
    })
  }

  const bringForward = () => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (active) { fc.bringObjectForward(active); fc.renderAll() }
  }

  const sendBackward = () => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (active) { fc.sendObjectBackwards(active); fc.renderAll() }
  }

  // ── Zoom ──
  const zoomIn = () => {
    const fc = fabricRef.current
    if (!fc) return
    const newZoom = Math.min(zoom + 0.1, 3)
    fc.setZoom(newZoom)
    setZoom(newZoom)
  }

  const zoomOut = () => {
    const fc = fabricRef.current
    if (!fc) return
    const newZoom = Math.max(zoom - 0.1, 0.1)
    fc.setZoom(newZoom)
    setZoom(newZoom)
  }

  // ── Image placement ──
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    // Upload to storage for persistence
    let imageUrl = ''
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `designs/${design.id}/files/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('job-images').upload(path, file, { upsert: false })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(path)
        imageUrl = urlData?.publicUrl || ''
        // Update brand_files array
        const currentBrandFiles: string[] = design.brand_files || []
        await supabase.from('design_projects').update({ brand_files: [...currentBrandFiles, imageUrl] }).eq('id', design.id)
      }
    } catch { /* use data URL fallback */ }

    const fabric = await import('fabric')
    const fc = fabricRef.current
    if (!fc) return
    pushUndo()

    if (imageUrl) {
      // Use storage URL for persistent reference
      const imgEl = document.createElement('img')
      imgEl.crossOrigin = 'anonymous'
      imgEl.onload = () => {
        const img = new (fabric as any).Image(imgEl, {
          left: 100, top: 100,
          scaleX: Math.min(1, 400 / imgEl.width),
          scaleY: Math.min(1, 400 / imgEl.width),
          opacity: opacity / 100,
        })
        fc.add(img)
        fc.setActiveObject(img)
        fc.renderAll()
        setTool('select')
      }
      imgEl.src = imageUrl
    } else {
      // Fallback: data URL
      const reader = new FileReader()
      reader.onload = (ev) => {
        const imgEl = document.createElement('img')
        imgEl.onload = () => {
          const img = new (fabric as any).Image(imgEl, {
            left: 100, top: 100,
            scaleX: Math.min(1, 400 / imgEl.width),
            scaleY: Math.min(1, 400 / imgEl.width),
            opacity: opacity / 100,
          })
          fc.add(img)
          fc.setActiveObject(img)
          fc.renderAll()
          setTool('select')
        }
        imgEl.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  // ── Load vehicle template ──
  const loadVehicleTemplate = async (vType: string) => {
    const fc = fabricRef.current
    if (!fc) return
    const fabric = await import('fabric')
    pushUndo()

    // Remove existing template objects
    const existing = fc.getObjects().filter((o: any) => o.layerId === 'template')
    existing.forEach((o: any) => fc.remove(o))

    // Create simple schematic using fabric shapes
    const panels = VEHICLE_PANELS[vType] || []
    const colors = ['#4f7fff', '#22c07a', '#22d3ee', '#f59e0b', '#8b5cf6', '#f25a5a', '#ec4899', '#14b8a6']
    const cols = 4
    const cellW = 240
    const cellH = 80
    const startX = 80
    const startY = 80

    panels.forEach((panel, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const color = colors[i % colors.length]
      const rect = new (fabric as any).Rect({
        left: startX + col * (cellW + 20),
        top: startY + row * (cellH + 20),
        width: cellW,
        height: cellH,
        fill: color + '22',
        stroke: color,
        strokeWidth: 2,
        rx: 8,
        ry: 8,
        selectable: true,
        layerId: 'template',
        hasControls: false,
      })
      const text = new (fabric as any).Text(`${panel.label}\n${panel.sqft} sqft`, {
        left: startX + col * (cellW + 20) + 12,
        top: startY + row * (cellH + 20) + 14,
        fontSize: 14,
        fontFamily: 'Barlow Condensed, sans-serif',
        fill: color,
        selectable: false,
        layerId: 'template',
      })
      fc.add(rect)
      fc.add(text)
    })

    fc.renderAll()
    setVehicleType(vType)
    setHasUnsaved(true)
  }

  // ── File upload ──
  const handleDesignFileUpload = async (files: FileList | File[]) => {
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'file'
      const path = `design/${design.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('job-images').upload(path, file, { upsert: false })
      if (error) { console.error('Upload error:', error); continue }
      const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(path)
      const { data: inserted } = await supabase.from('design_project_files').insert({
        design_project_id: design.id,
        file_name: file.name,
        file_url: urlData?.publicUrl || '',
        file_type: file.type,
        file_size: file.size,
        version: 1,
        uploaded_by: profile.id,
      }).select().single()
      if (inserted) {
        setDesignFiles(prev => [{ ...inserted, url: urlData?.publicUrl || '' }, ...prev])
      }
    }
    setUploading(false)
  }

  // ── Add comment ──
  const addComment = async () => {
    if (!newComment.trim()) return
    setSendingComment(true)
    const { data } = await supabase.from('design_project_comments').insert({
      design_project_id: design.id,
      author_id: profile.id,
      content: newComment.trim(),
      author_name: profile.name,
      author_type: 'team',
    }).select('*, author:author_id(id, name)').single()
    if (data) setComments(prev => [data, ...prev])
    setNewComment('')
    setSendingComment(false)
  }

  // ── Send to Customer (portal link) ──
  const handleSendToCustomer = async () => {
    if (portalLink) {
      navigator.clipboard.writeText(portalLink)
      setPortalCopied(true)
      setTimeout(() => setPortalCopied(false), 2000)
      return
    }
    const token = design.portal_token || crypto.randomUUID()
    await supabase.from('design_projects').update({ portal_token: token }).eq('id', design.id)
    const link = `${window.location.origin}/portal/${token}`
    setPortalLink(link)
    navigator.clipboard.writeText(link)
    setPortalCopied(true)
    setTimeout(() => setPortalCopied(false), 2000)
  }

  // ── AI Generate ──
  const handleAIGenerate = async () => {
    if (!aiForm.brief.trim()) { alert('Please enter a design brief first'); return }
    setAiGenerating(true)
    setAiProgress(0)
    setAiResults([])

    const progressInterval = setInterval(() => {
      setAiProgress(p => Math.min(p + 3, 90))
    }, 600)

    try {
      const res = await fetch('/api/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: aiForm.brief,
          vehicleType,
          coverageLabel,
          styles: aiForm.styles,
          colors: aiForm.colors.filter(Boolean),
          internalNotes: aiForm.internalNotes,
          scrapedBrand,
          designId: design.id,
          clientName: design.client_name,
        }),
      })
      const data = await res.json()
      clearInterval(progressInterval)
      setAiProgress(100)
      if (data.images) {
        setAiResults(data.images)
      } else if (data.error) {
        console.error('AI generate error:', data.error)
        alert('AI generation failed: ' + data.error)
      }
    } catch (err) {
      clearInterval(progressInterval)
      console.error('AI generate error:', err)
      alert('AI generation failed. Check console for details.')
    }
    setAiGenerating(false)
  }

  // ── Scrape website ──
  const handleScrapeWebsite = async () => {
    if (!aiForm.websiteUrl) { alert('Enter a website URL first'); return }
    setAiScraping(true)
    try {
      const res = await fetch('/api/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: aiForm.websiteUrl }),
      })
      const data = await res.json()
      if (data.brand) {
        setScrapedBrand(data.brand)
        if (data.brand.colors?.length) {
          setAiForm(prev => ({ ...prev, colors: [...data.brand.colors.slice(0, 5), '', '', '', '', ''].slice(0, 5) }))
        }
      }
    } catch (err) { console.error('Scrape error:', err) }
    setAiScraping(false)
  }

  // ── Use AI result on canvas ──
  const useAIResult = async (imageUrl: string) => {
    const fabric = await import('fabric')
    const fc = fabricRef.current
    if (!fc) return
    pushUndo()
    const imgEl = document.createElement('img')
    imgEl.crossOrigin = 'anonymous'
    imgEl.onload = () => {
      const img = new (fabric as any).Image(imgEl, {
        left: 0,
        top: 0,
        scaleX: fc.width! / imgEl.width,
        scaleY: fc.height! / imgEl.height,
        layerId: 'bg',
        selectable: true,
      })
      const existingBg = fc.getObjects().find((o: any) => o.layerId === 'bg')
      if (existingBg) fc.remove(existingBg)
      fc.insertAt(img, 0, false)
      fc.renderAll()
    }
    imgEl.src = imageUrl
  }

  // ── Export ──
  const handleExport = async () => {
    const fc = fabricRef.current
    if (!fc) return
    setExporting(true)
    try {
      const res = await fetch('/api/export-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: design.id,
          canvasJson: fc.toJSON(),
          panels: selectedPanels,
          vehicleType,
          totalSqft: totalToOrder,
          options: exportOptions,
        }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${design.client_name || 'design'}-export.zip`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Fallback: export canvas as PNG
        const dataUrl = fc.toDataURL({ format: 'png', multiplier: 2 })
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${design.client_name || 'design'}-canvas.png`
        a.click()
      }
    } catch (err) {
      console.error('Export error:', err)
      // Fallback PNG export
      const fc2 = fabricRef.current
      if (fc2) {
        const dataUrl = fc2.toDataURL({ format: 'png', multiplier: 2 })
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${design.client_name || 'design'}-canvas.png`
        a.click()
      }
    }
    setExporting(false)
    setShowExportModal(false)
  }

  // ── Save High-Res Export ──
  const saveHighResExport = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || savingHighRes) return
    setSavingHighRes(true)
    try {
      const dataUrl = fc.toDataURL({ format: 'png', multiplier: 4 })
      // Convert data URL to blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const path = `designs/${design.id}/canvas-print-export.png`
      const { error: upErr } = await supabase.storage.from('job-images').upload(path, blob, { upsert: true, contentType: 'image/png' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(path)
      const url = urlData?.publicUrl || ''
      await supabase.from('design_projects').update({ print_export_url: url }).eq('id', design.id)
      setHighResExportUrl(url)
      alert('High-res export saved — ready for print layout')
    } catch (err: any) {
      console.error('High-res export error:', err)
      alert('Failed to save high-res export: ' + (err.message || err))
    }
    setSavingHighRes(false)
  }, [savingHighRes, design.id, supabase])

  // ── Prepare for Print (AI Upscale + Vectorize) ──
  const prepareForPrint = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc || preparingForPrint) return

    // Use existing high-res export or generate new one
    let imageUrl = highResExportUrl
    if (!imageUrl) {
      const dataUrl = fc.toDataURL({ format: 'png', multiplier: 4 })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const path = `designs/${design.id}/canvas-temp-${Date.now()}.png`
      const { error: upErr } = await supabase.storage.from('job-images').upload(path, blob, { upsert: true, contentType: 'image/png' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('job-images').getPublicUrl(path)
      imageUrl = urlData?.publicUrl || ''
    }

    setPreparingForPrint(true)
    try {
      const apiRes = await fetch('/api/prepare-for-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          designId: design.id,
          targetWidth: 8192,
          targetHeight: 8192,
          saveToProject: true,
        }),
      })
      const data = await apiRes.json()
      if (data.error) throw new Error(data.error)

      setPrintReadyUrl(data.vectorFileUrl)
      await supabase.from('design_projects').update({
        approval_status: 'print_ready',
        print_ready_url: data.vectorFileUrl,
      }).eq('id', design.id)

      alert(`✨ Print-ready file generated!\n\nUpscaled: ${data.models.upscale}\nVectorized: ${data.models.vectorize}\n\nFile saved to design files.`)
    } catch (err: any) {
      console.error('Prepare for print error:', err)
      alert('Failed to prepare for print: ' + (err.message || err))
    }
    setPreparingForPrint(false)
  }, [preparingForPrint, highResExportUrl, design.id, supabase])

  // ── Load vehicle SVG template ──
  const loadVehicleSVGTemplate = async (svgKey: string) => {
    const fc = fabricRef.current
    if (!fc) return
    const fabric = await import('fabric')
    pushUndo()
    const existing = fc.getObjects().filter((o: any) => o.layerId === 'svgTemplate')
    existing.forEach((o: any) => fc.remove(o))
    try {
      (fabric as any).loadSVGFromURL(`/templates/${svgKey}.svg`, (objects: any[], options: any) => {
        if (!objects || objects.length === 0) return
        const group = (fabric as any).util.groupSVGElements(objects, options)
        group.set({
          left: 50, top: 50,
          scaleX: Math.min(1, (fc.width! - 100) / (group.width || 800)),
          scaleY: Math.min(1, (fc.height! - 100) / (group.height || 500)),
          selectable: true,
          layerId: 'svgTemplate',
          opacity: 0.5,
        })
        fc.add(group)
        fc.sendObjectToBack(group)
        fc.renderAll()
        setHasUnsaved(true)
      })
    } catch (err) {
      console.error('SVG load error:', err)
    }
    setShowVehicleTemplatePicker(false)
    setVehicleType(VEHICLE_SILHOUETTES[svgKey] || vehicleType)
  }

  // ── Status display ──
  const statusMeta: Record<string, { label: string; color: string }> = {
    brief: { label: 'Brief', color: '#f59e0b' },
    in_progress: { label: 'In Progress', color: '#4f7fff' },
    proof_sent: { label: 'Proof Sent', color: '#22d3ee' },
    customer_review: { label: 'Customer Review', color: '#8b5cf6' },
    revision: { label: 'Revision', color: '#f97316' },
    approved: { label: 'Approved', color: '#22c07a' },
    print_ready: { label: 'Print Ready', color: '#ec4899' },
  }
  const STATUS_OPTIONS = Object.entries(statusMeta)

  const saveStatus = (status: string) => {
    setDesignStatus(status)
    setShowStatusDrop(false)
    supabase.from('design_projects').update({ status, updated_at: new Date().toISOString() }).eq('id', design.id)
  }

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<'brief' | 'canvas' | 'files' | 'proofing'>('canvas')
  const [proofHistory, setProofHistory] = useState<any[]>([])
  const [proofGenerating, setProofGenerating] = useState(false)
  const [proofLink, setProofLink] = useState<string | null>(null)
  const [proofLinkCopied, setProofLinkCopied] = useState(false)

  useEffect(() => {
    supabase.from('proofing_tokens').select('*')
      .eq('design_project_id', design.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setProofHistory(data) })
  }, [design.id])

  const handleGenerateProof = async () => {
    setProofGenerating(true)
    const { data: existing } = await supabase.from('proofing_tokens').select('token')
      .eq('design_project_id', design.id).eq('status', 'pending').maybeSingle()
    if (existing) {
      const link = `${window.location.origin}/proof/${existing.token}`
      setProofLink(link)
      setProofGenerating(false)
      return
    }
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('proofing_tokens').insert({
      token, design_project_id: design.id, org_id: design.org_id,
      status: 'pending', expires_at: expiresAt,
    })
    const link = `${window.location.origin}/proof/${token}`
    setProofLink(link)
    setProofHistory(prev => [{ token, status: 'pending', created_at: new Date().toISOString() }, ...prev])
    saveStatus('proof_sent')
    setProofGenerating(false)
  }

  // ── Autosave indicator ──
  const autosaveText = hasUnsaved
    ? 'Unsaved changes'
    : lastSaved
    ? `Saved ${Math.round((Date.now() - lastSaved.getTime()) / 1000)}s ago`
    : 'Auto-saved'

  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  // ── Load design files on mount ──
  useEffect(() => {
    supabase
      .from('design_project_files')
      .select('*')
      .eq('design_project_id', design.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDesignFiles(data) })
  }, [design.id, supabase])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d0f14' }}>

      {/* ─── TOP BAR ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        background: '#13151c', borderBottom: '1px solid #1a1d27',
        flexShrink: 0, flexWrap: 'wrap', minHeight: 52,
      }}>
        {/* Back */}
        <button onClick={() => router.push('/design')} style={topBtnStyle} title="Back to Design Studio">
          <ArrowLeft size={16} />
        </button>
        <div style={{ width: 1, height: 20, background: '#1a1d27' }} />

        {/* Title */}
        {titleEditing ? (
          <input
            autoFocus
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={() => { setTitleEditing(false); setHasUnsaved(true) }}
            onKeyDown={e => { if (e.key === 'Enter') { setTitleEditing(false); setHasUnsaved(true) } }}
            style={{
              background: '#0d0f14', border: '1px solid #4f7fff', borderRadius: 6,
              color: '#e8eaed', fontSize: 14, fontWeight: 700, padding: '4px 8px', outline: 'none',
              fontFamily: 'Barlow Condensed, sans-serif', minWidth: 200,
            }}
          />
        ) : (
          <button
            onClick={() => setTitleEditing(true)}
            style={{
              background: 'transparent', border: 'none', cursor: 'text',
              color: '#e8eaed', fontSize: 14, fontWeight: 700, padding: '4px 8px',
              fontFamily: 'Barlow Condensed, sans-serif', maxWidth: 240, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title="Click to edit title"
          >
            {titleValue}
          </button>
        )}

        {/* Autosave */}
        <span style={{
          fontSize: 10, color: hasUnsaved ? '#f59e0b' : '#5a6080',
          fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
        }}>
          {autosaveText}
        </span>

        <div style={{ flex: 1 }} />

        {/* Status badge */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowStatusDrop(!showStatusDrop)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: `${statusMeta[designStatus]?.color || '#5a6080'}20`,
              color: statusMeta[designStatus]?.color || '#5a6080',
              fontSize: 11, fontWeight: 800,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            {statusMeta[designStatus]?.label || designStatus}
            <ChevronDown size={12} />
          </button>
          {showStatusDrop && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 100, minWidth: 180,
            }}>
              {STATUS_OPTIONS.map(([key, meta]) => (
                <button key={key} onClick={() => saveStatus(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '10px 14px', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    color: key === designStatus ? meta.color : '#9299b5', fontSize: 12, fontWeight: 600,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                  {meta.label}
                  {key === designStatus && <Check size={12} style={{ marginLeft: 'auto', color: meta.color }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <button onClick={handleSendToCustomer} style={{ ...accentBtnStyle, background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)' }}>
          <Send size={13} />
          {portalCopied ? 'Link Copied!' : 'Send to Customer'}
        </button>

        <button onClick={() => setShowAIModal(true)} style={{ ...accentBtnStyle, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(79,127,255,0.2))', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' }}>
          <Sparkles size={13} />
          AI Generate
        </button>

        <button onClick={() => setShowExportModal(true)} style={{ ...accentBtnStyle, background: 'rgba(34,192,122,0.1)', color: '#22c07a', border: '1px solid rgba(34,192,122,0.25)' }}>
          <Package size={13} />
          Export Print-Ready
        </button>

        <button
          onClick={prepareForPrint}
          disabled={preparingForPrint}
          title="AI upscale + vectorize for print production"
          style={{
            ...accentBtnStyle,
            background: preparingForPrint ? 'rgba(139,92,246,0.05)' : printReadyUrl ? 'rgba(34,192,122,0.1)' : 'rgba(139,92,246,0.1)',
            color: printReadyUrl ? '#22c07a' : '#8b5cf6',
            border: `1px solid ${printReadyUrl ? 'rgba(34,192,122,0.25)' : 'rgba(139,92,246,0.25)'}`,
          }}
        >
          <Sparkles size={13} />
          {preparingForPrint ? 'Preparing...' : printReadyUrl ? '✓ Print-Ready' : 'Prepare for Print'}
        </button>

        <button onClick={() => router.push(`/design/${design.id}/print-layout`)} style={{ ...accentBtnStyle, background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
          <Printer size={13} />
          Print Layout
        </button>

        <button
          onClick={saveHighResExport}
          disabled={savingHighRes}
          title="Render canvas at 4x and save for print use"
          style={{ ...accentBtnStyle, background: savingHighRes ? 'rgba(79,127,255,0.05)' : highResExportUrl ? 'rgba(34,192,122,0.08)' : 'rgba(79,127,255,0.1)', color: highResExportUrl ? '#22c07a' : '#4f7fff', border: `1px solid ${highResExportUrl ? 'rgba(34,192,122,0.2)' : 'rgba(79,127,255,0.2)'}` }}>
          <Download size={13} />
          {savingHighRes ? 'Exporting...' : highResExportUrl ? 'High-Res Saved' : 'Save High-Res Export'}
        </button>

        <button onClick={saveCanvas} disabled={saving} style={{ ...accentBtnStyle, background: '#4f7fff', color: '#fff', border: 'none' }}>
          <Save size={13} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* ─── INFO CHIPS ─── */}
      <div style={{
        display: 'flex', gap: 8, padding: '6px 16px',
        background: '#0d0f14', borderBottom: '1px solid #1a1d27',
        flexShrink: 0, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {linkedJob && (
          <button onClick={() => router.push(`/jobs/${linkedJob.id}`)} style={chipStyle}>
            <FileText size={10} style={{ color: '#4f7fff' }} />
            <span style={{ color: '#4f7fff' }}>{linkedJob.vehicle_desc || linkedJob.title}</span>
          </button>
        )}
        <div style={chipStyle}>
          <Package size={10} style={{ color: '#22d3ee' }} />
          <span>{vehicleType}</span>
        </div>
        {selectedPanels.length > 0 && (
          <div style={chipStyle}>
            <Layers size={10} style={{ color: '#22c07a' }} />
            <span style={{ color: '#22c07a' }}>
              {selectedPanels.length} panels · {netSqft} sqft net · {totalToOrder} sqft to order (+{wasteBuffer}% buffer) · {coverageLabel}
            </span>
          </div>
        )}
        <div style={{ ...chipStyle, marginLeft: 'auto' }}>
          <Layers size={10} />
          <span>{objectCount} objects</span>
        </div>
      </div>

      {/* ─── TAB BAR ─── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a1d27', background: '#13151c', flexShrink: 0 }}>
        {(['brief', 'canvas', 'files', 'proofing'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #4f7fff' : '2px solid transparent',
              color: activeTab === tab ? '#4f7fff' : '#9299b5',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.03em',
              textTransform: 'capitalize',
            }}>
            {tab === 'files' ? 'Files & Versions' : tab}
          </button>
        ))}
      </div>

      {/* ─── BRIEF TAB ─── */}
      {activeTab === 'brief' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {linkedJob && (
              <div style={{ background: '#13151c', borderRadius: 12, border: '1px solid #1a1d27', padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Linked Job</div>
                <button onClick={() => router.push(`/jobs/${linkedJob.id}`)}
                  style={{ background: 'none', border: 'none', color: '#4f7fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 }}>
                  {linkedJob.vehicle_desc || linkedJob.title}
                </button>
              </div>
            )}
            <div style={{ background: '#13151c', borderRadius: 12, border: '1px solid #1a1d27', padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Project Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Vehicle Type', vehicleType],
                  ['Design Type', design.design_type || '—'],
                  ['Client', design.client_name || '—'],
                  ['Status', statusMeta[designStatus]?.label || designStatus],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: '#5a6080', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#e8eaed' }}>{val}</div>
                  </div>
                ))}
              </div>
              {design.design_notes && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, color: '#5a6080', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Design Notes</div>
                  <div style={{ fontSize: 13, color: '#9299b5', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{design.design_notes}</div>
                </div>
              )}
            </div>
            {(VEHICLE_PANELS[vehicleType] || []).length > 0 && (
              <div style={{ background: '#13151c', borderRadius: 12, border: '1px solid #1a1d27', padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Coverage Checklist</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(VEHICLE_PANELS[vehicleType] || []).map(panel => (
                    <label key={panel.label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: selectedPanels.includes(panel.label) ? '#22c07a' : '#9299b5' }}>
                      <input type="checkbox" checked={selectedPanels.includes(panel.label)}
                        onChange={e => setSelectedPanels(prev => e.target.checked ? [...prev, panel.label] : prev.filter(p => p !== panel.label))}
                        style={{ accentColor: '#22c07a' }} />
                      {panel.label} <span style={{ color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>({panel.sqft} sqft)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {jobImages.length > 0 && (
              <div style={{ background: '#13151c', borderRadius: 12, border: '1px solid #1a1d27', padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Brand Assets</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {jobImages.map(img => (
                    <img key={img.id} src={img.url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #1a1d27' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── FILES TAB ─── */}
      {activeTab === 'files' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div
              onDragOver={e => { e.preventDefault(); setFileDragOver(true) }}
              onDragLeave={() => setFileDragOver(false)}
              onDrop={async e => {
                e.preventDefault()
                setFileDragOver(false)
                const files = Array.from(e.dataTransfer.files)
                for (const f of files) {
                  setUploading(true)
                  const path = `designs/${design.id}/${Date.now()}_${f.name}`
                  const { data: up } = await supabase.storage.from('job-images').upload(path, f)
                  if (up) {
                    const { data: { publicUrl } } = supabase.storage.from('job-images').getPublicUrl(path)
                    const maxVer = designFiles.reduce((m, df) => Math.max(m, df.version || 0), 0)
                    await supabase.from('design_project_files').insert({
                      design_project_id: design.id, file_name: f.name, file_url: publicUrl,
                      file_type: f.type, file_size: f.size, version: maxVer + 1,
                    })
                    const { data: refreshed } = await supabase.from('design_project_files').select('*')
                      .eq('design_project_id', design.id).order('created_at', { ascending: false })
                    if (refreshed) setDesignFiles(refreshed)
                  }
                  setUploading(false)
                }
              }}
              style={{
                border: `2px dashed ${fileDragOver ? '#4f7fff' : '#1a1d27'}`,
                borderRadius: 12, padding: '28px 20px', textAlign: 'center',
                marginBottom: 20, background: fileDragOver ? 'rgba(79,127,255,0.05)' : '#13151c',
                transition: 'all 0.15s',
              }}>
              <Upload size={24} style={{ color: '#5a6080', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 14, color: '#9299b5', fontWeight: 700 }}>Drop files here</div>
              <div style={{ fontSize: 12, color: '#5a6080', marginTop: 4 }}>PNG, JPG, PDF, AI, SVG</div>
              {uploading && <div style={{ fontSize: 12, color: '#4f7fff', marginTop: 8 }}>Uploading...</div>}
            </div>
            {Object.entries(
              designFiles.reduce((groups: Record<number, any[]>, f) => {
                const v = f.version || 1
                if (!groups[v]) groups[v] = []
                groups[v].push(f)
                return groups
              }, {})
            ).sort(([a], [b]) => Number(b) - Number(a)).map(([ver, files]) => (
              <div key={ver} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                  Version {ver}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 8 }}>
                  {files.filter(f => f.file_type?.startsWith('image') || f.file_url?.match(/\.(png|jpg|jpeg|gif|webp)$/i)).map(f => (
                    <img key={f.id} src={f.file_url} alt={f.file_name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: '1px solid #1a1d27' }} />
                  ))}
                </div>
                {files.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#13151c', borderRadius: 8, border: '1px solid #1a1d27', marginBottom: 4 }}>
                    <div style={{ flex: 1, fontSize: 12, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</div>
                    <div style={{ fontSize: 10, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>
                      {f.file_size ? `${(f.file_size / 1024).toFixed(0)} KB` : ''}
                    </div>
                    <a href={f.file_url} download={f.file_name} target="_blank" rel="noreferrer"
                      style={{ color: '#4f7fff', padding: 4 }}>
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            ))}
            {designFiles.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#5a6080', fontSize: 13 }}>No files uploaded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ─── PROOFING TAB ─── */}
      {activeTab === 'proofing' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ background: '#13151c', borderRadius: 12, border: '1px solid #1a1d27', padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e8eaed' }}>Current Status</div>
                <span style={{
                  padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                  background: `${statusMeta[designStatus]?.color || '#5a6080'}20`,
                  color: statusMeta[designStatus]?.color || '#5a6080',
                }}>
                  {statusMeta[designStatus]?.label || designStatus}
                </span>
              </div>
              <button
                onClick={handleGenerateProof}
                disabled={proofGenerating}
                style={{
                  width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
                  background: '#4f7fff', color: '#fff', fontWeight: 800, fontSize: 14,
                  cursor: proofGenerating ? 'wait' : 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.03em',
                }}>
                {proofGenerating ? 'Generating...' : 'Generate Proof Link'}
              </button>
              {proofLink && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#0d0f14', borderRadius: 8, border: '1px solid #1a1d27', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 12, color: '#9299b5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                    {proofLink}
                  </span>
                  <button onClick={() => { navigator.clipboard.writeText(proofLink); setProofLinkCopied(true); setTimeout(() => setProofLinkCopied(false), 2000) }}
                    style={{ background: 'none', border: 'none', color: proofLinkCopied ? '#22c07a' : '#4f7fff', cursor: 'pointer', flexShrink: 0 }}>
                    {proofLinkCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>
            {proofHistory.length > 0 && (
              <div style={{ background: '#13151c', borderRadius: 12, border: '1px solid #1a1d27', padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Proof History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {proofHistory.map((p, i) => (
                    <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0d0f14', borderRadius: 8 }}>
                      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#5a6080', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.token?.slice(0, 16)}...
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                        background: p.status === 'approved' ? '#22c07a20' : p.status === 'revision_requested' ? '#f9731620' : '#f59e0b20',
                        color: p.status === 'approved' ? '#22c07a' : p.status === 'revision_requested' ? '#f97316' : '#f59e0b',
                      }}>
                        {p.status}
                      </span>
                      <span style={{ fontSize: 10, color: '#5a6080' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MAIN 3-COLUMN LAYOUT ─── */}
      {activeTab === 'canvas' && <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT TOOL PANEL ── */}
        <div style={{
          width: 64, flexShrink: 0, background: '#13151c',
          borderRight: '1px solid #1a1d27', display: 'flex',
          flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 4,
          overflowY: 'auto',
        }}>
          <ToolBtn icon={MousePointer2} label="Select (V)" active={tool === 'select'} onClick={() => setTool('select')} />
          <ToolBtn icon={PenLine} label="Draw (P)" active={tool === 'draw'} onClick={() => setTool('draw')} />
          <ToolBtn icon={ArrowRight} label="Arrow (A)" active={tool === 'arrow'} onClick={() => { setTool('arrow'); addArrow() }} />
          <ToolBtn icon={Square} label="Rectangle (R)" active={tool === 'rect'} onClick={() => setTool('rect')} />
          <ToolBtn icon={Circle} label="Circle (C)" active={tool === 'circle'} onClick={() => setTool('circle')} />
          <ToolBtn icon={Type} label="Text (T)" active={tool === 'text'} onClick={() => setTool('text')} />
          <ToolBtn icon={ImageIcon} label="Image (L)" active={tool === 'image'} onClick={() => { setTool('image'); fileInputRef.current?.click() }} />
          <ToolBtn icon={Ruler} label="Measure (M)" active={tool === 'measure'} onClick={() => setTool('measure')} />
          <ToolBtn icon={Droplet} label="Eyedropper" active={tool === 'eyedropper'} onClick={() => setTool('eyedropper')} />

          <div style={{ width: '80%', height: 1, background: '#1a1d27', margin: '4px 0' }} />

          {/* Color */}
          <div style={{ position: 'relative' }}>
            <input
              type="color"
              value={fillColor}
              onChange={e => {
                setFillColor(e.target.value)
                const fc = fabricRef.current
                const obj = fc?.getActiveObject()
                if (obj) { obj.set('fill', e.target.value); fc.renderAll() }
              }}
              title="Fill Color"
              style={{ width: 32, height: 32, borderRadius: 8, border: '2px solid #1a1d27', cursor: 'pointer', padding: 0 }}
            />
          </div>

          <div style={{ width: '80%', height: 1, background: '#1a1d27', margin: '4px 0' }} />

          {/* Stroke width */}
          {[1, 3, 6, 12].map(w => (
            <button
              key={w}
              onClick={() => {
                setStrokeWidth(w)
                const fc = fabricRef.current
                const obj = fc?.getActiveObject()
                if (obj) { obj.set('strokeWidth', w); fc.renderAll() }
              }}
              title={`Stroke ${w}px`}
              style={{
                width: 40, height: 24, borderRadius: 6, border: 'none',
                background: strokeWidth === w ? '#4f7fff22' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: 28, height: w, background: strokeWidth === w ? '#4f7fff' : '#5a6080', borderRadius: 2 }} />
            </button>
          ))}

          <div style={{ width: '80%', height: 1, background: '#1a1d27', margin: '4px 0' }} />

          {/* Actions */}
          <ToolBtn icon={Undo2} label="Undo (Ctrl+Z)" active={false} onClick={undoCanvas} />
          <ToolBtn icon={Redo2} label="Redo (Ctrl+Y)" active={false} onClick={redoCanvas} />
          <ToolBtn icon={Trash2} label="Delete" active={false} onClick={deleteSelected} />
          <ToolBtn icon={Copy} label="Duplicate" active={false} onClick={duplicateSelected} />
          <ToolBtn icon={ChevronRight} label="Bring Forward" active={false} onClick={bringForward} />
          <ToolBtn icon={ChevronLeft} label="Send Backward" active={false} onClick={sendBackward} />

          <div style={{ width: '80%', height: 1, background: '#1a1d27', margin: '4px 0' }} />

          {/* Vehicle Template SVG */}
          <ToolBtn icon={Package} label="Vehicle Template" active={showVehicleTemplatePicker} onClick={() => setShowVehicleTemplatePicker(v => !v)} />
        </div>

        {/* ── CENTER CANVAS ── */}
        <div
          ref={canvasContainerRef}
          style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#0a0c11' }}
          onClick={handleCanvasClick}
        >
          <canvas ref={canvasElRef} style={{ display: 'block' }} />

          {/* Zoom controls overlay */}
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            background: 'rgba(13,15,20,0.9)', borderRadius: 20, border: '1px solid #1a1d27',
          }}>
            <button onClick={zoomOut} style={miniBtn}>
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#9299b5', minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn} style={miniBtn}>
              <ZoomIn size={14} />
            </button>
            <div style={{ width: 1, height: 14, background: '#1a1d27' }} />
            <button onClick={() => {
              const fc = fabricRef.current
              if (!fc) return
              fc.setZoom(0.5)
              setZoom(0.5)
            }} style={{ ...miniBtn, fontSize: 10 }}>Fit</button>
          </div>

          {/* Tool hint */}
          {tool !== 'select' && tool !== 'draw' && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              padding: '4px 12px', background: 'rgba(79,127,255,0.9)', borderRadius: 20,
              fontSize: 11, color: '#fff', fontWeight: 600, pointerEvents: 'none',
            }}>
              Click canvas to place {tool}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          width: 300, flexShrink: 0, background: '#13151c',
          borderLeft: '1px solid #1a1d27', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Panel tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1d27', flexShrink: 0 }}>
            {([
              { key: 'layers' as const, icon: Layers, label: 'Layers' },
              { key: 'coverage' as const, icon: Package, label: 'SqFt' },
              { key: 'print' as const, icon: Printer, label: 'Print' },
              { key: 'files' as const, icon: ImageIcon, label: 'Files' },
              { key: 'comments' as const, icon: MessageCircle, label: 'Chat' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setRightPanel(tab.key)}
                title={tab.label}
                style={{
                  flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
                  background: 'transparent', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 2,
                  color: rightPanel === tab.key ? '#4f7fff' : '#5a6080',
                  borderBottom: rightPanel === tab.key ? '2px solid #4f7fff' : '2px solid transparent',
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* LAYERS PANEL */}
            {rightPanel === 'layers' && (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={panelTitleStyle}>Layers (bottom → top)</div>
                {[...layers].reverse().map(layer => (
                  <div
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 8, cursor: 'pointer', border: '1px solid',
                      background: activeLayer === layer.id ? 'rgba(79,127,255,0.08)' : 'transparent',
                      borderColor: activeLayer === layer.id ? 'rgba(79,127,255,0.25)' : '#1a1d27',
                    }}
                  >
                    <GripVertical size={12} style={{ color: '#3a3f55', flexShrink: 0 }} />
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l))
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: layer.visible ? '#4f7fff' : '#3a3f55', flexShrink: 0 }}
                    >
                      {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 12, color: activeLayer === layer.id ? '#e8eaed' : '#9299b5', fontWeight: activeLayer === layer.id ? 700 : 400 }}>
                      {layer.name}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l))
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: layer.locked ? '#f59e0b' : '#3a3f55', flexShrink: 0 }}
                    >
                      {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                    <input
                      type="number"
                      value={layer.opacity}
                      onChange={e => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, opacity: +e.target.value } : l))}
                      onClick={e => e.stopPropagation()}
                      min={0} max={100}
                      style={{ width: 36, background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 4, color: '#9299b5', fontSize: 10, padding: '2px 4px', textAlign: 'center', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* COVERAGE PANEL */}
            {rightPanel === 'coverage' && (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={panelTitleStyle}>Coverage & Sqft</div>
                <div>
                  <label style={labelSt}>Vehicle Type</label>
                  <select value={vehicleType} onChange={e => loadVehicleTemplate(e.target.value)} style={selectSt}>
                    {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <button onClick={() => setSelectedPanels(panelList.map(p => p.label))} style={smallBtnStyle}>Select All</button>
                  <button onClick={() => setSelectedPanels([])} style={smallBtnStyle}>Clear All</button>
                </div>
                {panelList.map(panel => (
                  <label key={panel.label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={selectedPanels.includes(panel.label)}
                      onChange={e => {
                        if (e.target.checked) setSelectedPanels(prev => [...prev, panel.label])
                        else setSelectedPanels(prev => prev.filter(p => p !== panel.label))
                      }}
                      style={{ accentColor: '#4f7fff' }}
                    />
                    <span style={{ flex: 1, fontSize: 12, color: '#e8eaed' }}>{panel.label}</span>
                    <span style={{ fontSize: 11, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>{panel.sqft} sqft</span>
                  </label>
                ))}
                <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 12 }}>
                  <div>
                    <label style={labelSt}>Waste Buffer</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[5, 10, 15, 20].map(b => (
                        <button key={b} onClick={() => setWasteBuffer(b)}
                          style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                            background: wasteBuffer === b ? '#4f7fff' : '#1a1d27', color: wasteBuffer === b ? '#fff' : '#9299b5' }}
                        >{b}%</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#5a6080' }}>Net Sqft</span>
                    <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#e8eaed', fontWeight: 700 }}>{netSqft}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#5a6080' }}>Waste Buffer (+{wasteBuffer}%)</span>
                    <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>+{bufferSqft}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed' }}>Total to Order</span>
                    <span style={{ fontSize: 18, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a', fontWeight: 800 }}>{totalToOrder} sqft</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#5a6080' }}>Coverage Type</span>
                    <span style={{ fontSize: 11, color: '#22d3ee', fontWeight: 700 }}>{coverageLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#5a6080' }}>Material COGS</span>
                    <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>{fmtMoney(materialCOGS)}</span>
                  </div>
                </div>
                <div>
                  <label style={labelSt}>Material Cost ($/sqft)</label>
                  <input type="number" step="0.25" value={materialCostPerSqft} onChange={e => setMaterialCostPerSqft(+e.target.value)} style={inputSt} />
                </div>
              </div>
            )}

            {/* PRINT SPECS PANEL */}
            {rightPanel === 'print' && (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={panelTitleStyle}>Print Specifications</div>
                {PRINT_CHECKS.map(check => (
                  <div key={check.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#0d0f14', border: '1px solid #1a1d27' }}>
                    <span style={{ color: check.default ? '#22c07a' : '#f25a5a', flexShrink: 0 }}>
                      {check.default ? <Check size={14} /> : <X size={14} />}
                    </span>
                    <span style={{ fontSize: 11, color: check.default ? '#9299b5' : '#f25a5a' }}>{check.label}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 10 }}>
                  <div style={labelSt}>Material Width</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="text" defaultValue="54" style={{ ...inputSt, width: 60 }} />
                    <span style={{ fontSize: 12, color: '#9299b5' }}>inches</span>
                  </div>
                </div>
                <div>
                  <div style={labelSt}>Number of Print Panels</div>
                  <div style={{ fontSize: 22, fontFamily: 'JetBrains Mono, monospace', color: '#e8eaed', fontWeight: 700 }}>
                    {Math.max(1, Math.ceil(totalToOrder / 30))}
                  </div>
                </div>
                <div>
                  <div style={labelSt}>Total Print Area (with bleed)</div>
                  <div style={{ fontSize: 22, fontFamily: 'JetBrains Mono, monospace', color: '#22c07a', fontWeight: 700 }}>
                    {Math.ceil(totalToOrder * 1.05)} sqft
                  </div>
                </div>
                <button style={{ ...accentBtnStyle, width: '100%', justifyContent: 'center', background: 'rgba(34,192,122,0.08)', color: '#22c07a', border: '1px solid rgba(34,192,122,0.2)' }}>
                  <Settings2 size={13} />
                  Fix All Issues
                </button>
              </div>
            )}

            {/* FILES PANEL */}
            {rightPanel === 'files' && (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={panelTitleStyle}>Design Files</div>
                <input ref={uploadFileRef} type="file" multiple accept="image/*,.pdf,.ai,.svg,.eps,.psd" style={{ display: 'none' }}
                  onChange={e => e.target.files && handleDesignFileUpload(e.target.files)} />
                <div
                  onDragOver={e => { e.preventDefault(); setFileDragOver(true) }}
                  onDragLeave={() => setFileDragOver(false)}
                  onDrop={e => { e.preventDefault(); setFileDragOver(false); e.dataTransfer.files && handleDesignFileUpload(e.dataTransfer.files) }}
                  onClick={() => uploadFileRef.current?.click()}
                  style={{
                    border: `2px dashed ${fileDragOver ? '#4f7fff' : '#2a2f3d'}`, borderRadius: 10,
                    padding: '20px 12px', textAlign: 'center', cursor: 'pointer',
                    background: fileDragOver ? 'rgba(79,127,255,0.05)' : 'transparent',
                    color: fileDragOver ? '#4f7fff' : '#5a6080', fontSize: 12, transition: 'all 0.15s',
                  }}
                >
                  {uploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <div style={{ width: 14, height: 14, border: '2px solid #4f7fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      Uploading...
                    </div>
                  ) : (
                    <>
                      <Upload size={20} style={{ margin: '0 auto 6px', display: 'block' }} />
                      <div style={{ fontWeight: 600 }}>Drop files or click to upload</div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>JPG, PNG, PDF, AI, SVG, EPS</div>
                    </>
                  )}
                </div>
                {designFiles.map(file => (
                  <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#0d0f14', borderRadius: 8, border: '1px solid #1a1d27' }}>
                    <ImageIcon size={12} style={{ color: '#22d3ee', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
                      <div style={{ fontSize: 9, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>
                        v{file.version} · {file.file_size ? Math.round(file.file_size / 1024) + 'KB' : ''}
                      </div>
                    </div>
                    {file.file_url && (
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#4f7fff', display: 'flex', alignItems: 'center' }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
                {designFiles.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#5a6080', fontSize: 12, padding: '16px 0' }}>No files uploaded yet</div>
                )}
              </div>
            )}

            {/* COMMENTS PANEL */}
            {rightPanel === 'comments' && (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
                <div style={panelTitleStyle}>Comments & History</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                    placeholder="Add a comment..."
                    style={{ ...inputSt, flex: 1, fontSize: 12 }}
                  />
                  <button onClick={addComment} disabled={sendingComment || !newComment.trim()}
                    style={{ padding: '6px 10px', background: '#4f7fff', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: sendingComment || !newComment.trim() ? 0.4 : 1 }}>
                    <Send size={13} />
                  </button>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                  {comments.map((c: any) => (
                    <div key={c.id} style={{
                      padding: '8px 10px', borderRadius: 8, background: '#0d0f14', border: '1px solid #1a1d27',
                      borderLeft: c.author_type === 'customer' ? '3px solid #22c07a' : '3px solid #4f7fff',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.author_type === 'customer' ? '#22c07a' : '#4f7fff' }}>
                          {c.author_name || c.author?.name || 'Team'}
                        </span>
                        <span style={{ fontSize: 9, color: '#5a6080' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.4 }}>{c.content}</div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#5a6080', fontSize: 12, padding: '20px 0' }}>No comments yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>}

      {/* Hidden file input for image placement */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />

      {/* ─── VEHICLE TEMPLATE PICKER ─── */}
      {showVehicleTemplatePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowVehicleTemplatePicker(false)}>
          <div style={{ background: '#13151c', borderRadius: 14, border: '1px solid #1a1d27', padding: 20, minWidth: 360, maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: '#e8eaed' }}>Vehicle Template</span>
              <button onClick={() => setShowVehicleTemplatePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 11, color: '#5a6080', marginBottom: 14 }}>
              Loads an SVG silhouette as a background template layer. Use it to plan panel coverage.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(VEHICLE_SILHOUETTES).map(([key, label]) => (
                <button key={key} onClick={() => loadVehicleSVGTemplate(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8,
                    cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#4f7fff')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a1d27')}>
                  <Package size={14} style={{ color: '#4f7fff', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#e8eaed' }}>{label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 10, color: '#5a6080' }}>
              Template loads at 50% opacity on a locked layer. Use the Layers panel to adjust visibility.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ─── AI GENERATE MODAL ─── */}
      {/* ═══════════════════════════════════════ */}
      {showAIModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{
            width: '100%', maxWidth: 1000, maxHeight: '90vh',
            background: '#13151c', borderRadius: 16, border: '1px solid #1a1d27',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a1d27', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} style={{ color: '#8b5cf6' }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>AI Mockup Generator</div>
                  <div style={{ fontSize: 11, color: '#5a6080' }}>Generates 4 photorealistic wrap design variations</div>
                </div>
              </div>
              <button onClick={() => setShowAIModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal body — 2 columns */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              {/* LEFT: Form */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid #1a1d27' }}>

                {/* Vehicle & Coverage */}
                <div>
                  <label style={labelSt}>Vehicle & Coverage</label>
                  <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#0d0f14', borderRadius: 8, border: '1px solid #1a1d27' }}>
                    <span style={{ fontSize: 12, color: '#22d3ee' }}>{vehicleType}</span>
                    <span style={{ fontSize: 12, color: '#5a6080' }}>·</span>
                    <span style={{ fontSize: 12, color: '#22c07a' }}>{coverageLabel}</span>
                    <span style={{ fontSize: 12, color: '#5a6080' }}>·</span>
                    <span style={{ fontSize: 12, color: '#9299b5', fontFamily: 'JetBrains Mono, monospace' }}>{totalToOrder} sqft</span>
                  </div>
                </div>

                {/* Design Brief */}
                <div>
                  <label style={labelSt}>Design Brief *</label>
                  <textarea
                    value={aiForm.brief}
                    onChange={e => setAiForm(prev => ({ ...prev, brief: e.target.value }))}
                    rows={5}
                    placeholder={`Describe the wrap design you want...\n\nExample: Red and black aggressive design with Apex Plumbing logo. Bold geometric shapes on the sides. Phone number large on rear. Professional but eye-catching. Similar to racing livery style.`}
                    style={{ ...inputSt, resize: 'vertical' as const, lineHeight: 1.5 }}
                  />
                  <div style={{ fontSize: 10, color: '#5a6080', textAlign: 'right', marginTop: 4 }}>{aiForm.brief.length} chars</div>
                </div>

                {/* Style Direction */}
                <div>
                  <label style={labelSt}>Style Direction (pick multiple)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STYLE_CARDS.map(style => {
                      const active = aiForm.styles.includes(style)
                      return (
                        <button
                          key={style}
                          onClick={() => setAiForm(prev => ({
                            ...prev,
                            styles: active ? prev.styles.filter(s => s !== style) : [...prev.styles, style],
                          }))}
                          style={{
                            padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            background: active ? 'rgba(139,92,246,0.15)' : '#0d0f14',
                            border: `1px solid ${active ? 'rgba(139,92,246,0.4)' : '#1a1d27'}`,
                            color: active ? '#8b5cf6' : '#9299b5',
                          }}
                        >
                          {style}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Color Palette */}
                <div>
                  <label style={labelSt}>Color Palette (up to 5)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {aiForm.colors.map((color, i) => (
                      <input
                        key={i}
                        type="color"
                        value={color || '#4f7fff'}
                        onChange={e => setAiForm(prev => {
                          const colors = [...prev.colors]
                          colors[i] = e.target.value
                          return { ...prev, colors }
                        })}
                        style={{ width: 36, height: 36, borderRadius: 8, border: '2px solid #1a1d27', cursor: 'pointer', padding: 0 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Website Scraper */}
                <div>
                  <label style={labelSt}>Scrape Customer Website (auto-extract brand colors)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="url"
                      value={aiForm.websiteUrl}
                      onChange={e => setAiForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      placeholder="https://customersite.com"
                      style={{ ...inputSt, flex: 1 }}
                    />
                    <button
                      onClick={handleScrapeWebsite}
                      disabled={aiScraping || !aiForm.websiteUrl}
                      style={{ ...accentBtnStyle, background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)', flexShrink: 0, opacity: (aiScraping || !aiForm.websiteUrl) ? 0.5 : 1 }}
                    >
                      <Globe size={13} />
                      {aiScraping ? 'Analyzing...' : 'Analyze'}
                    </button>
                  </div>
                  {scrapedBrand && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: '#22c07a', fontWeight: 700 }}>Brand extracted: {scrapedBrand.name}</div>
                      {scrapedBrand.tagline && <div style={{ fontSize: 11, color: '#9299b5', marginTop: 2 }}>{scrapedBrand.tagline}</div>}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {scrapedBrand.colors?.map((c: string, i: number) => (
                          <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid #1a1d27' }} title={c} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Internal Notes */}
                <div>
                  <label style={labelSt}>Internal Design Notes (team only)</label>
                  <textarea
                    value={aiForm.internalNotes}
                    onChange={e => setAiForm(prev => ({ ...prev, internalNotes: e.target.value }))}
                    rows={3}
                    placeholder="Make the sides really pop. Use a swoosh shape. They love the Roush Mustang wrap style..."
                    style={{ ...inputSt, resize: 'vertical' as const }}
                  />
                </div>

                {/* Generate button */}
                <button
                  onClick={handleAIGenerate}
                  disabled={aiGenerating || !aiForm.brief.trim()}
                  style={{
                    padding: '14px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: aiGenerating ? '#1a1d27' : 'linear-gradient(135deg, #8b5cf6, #4f7fff)',
                    color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8, opacity: (!aiForm.brief.trim() || aiGenerating) ? 0.7 : 1,
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}
                >
                  <Wand2 size={18} />
                  {aiGenerating ? 'Generating with AI — 20-40 seconds...' : 'Generate 4 Variations'}
                </button>

                {aiGenerating && (
                  <div style={{ background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#9299b5' }}>Analyzing brief & generating...</span>
                      <span style={{ fontSize: 11, color: '#4f7fff', fontFamily: 'JetBrains Mono, monospace' }}>{aiProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#1a1d27', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${aiProgress}%`, height: '100%', background: 'linear-gradient(90deg, #4f7fff, #8b5cf6)', borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Preview */}
              <div style={{ width: 380, flexShrink: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                <div style={panelTitleStyle}>Generated Variations</div>
                {aiResults.length === 0 ? (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 12, color: '#5a6080', textAlign: 'center',
                    border: '2px dashed #1a1d27', borderRadius: 12, padding: 24,
                  }}>
                    <Wand2 size={32} style={{ opacity: 0.4 }} />
                    <div style={{ fontSize: 13 }}>Fill in the brief and click Generate to create AI mockups</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {aiResults.map((imgUrl, i) => (
                      <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #1a1d27', background: '#0d0f14' }}>
                        <img src={imgUrl} alt={`Variation ${i + 1}`} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                        <div style={{ padding: 8, display: 'flex', gap: 4 }}>
                          <button onClick={() => useAIResult(imgUrl)} style={{ flex: 1, padding: '5px 8px', background: '#22c07a', color: '#0d1a10', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                            Use This
                          </button>
                          <button onClick={handleAIGenerate} style={{ padding: '5px 8px', background: '#1a1d27', color: '#9299b5', border: 'none', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>
                            <RefreshCw size={10} />
                          </button>
                          <a href={imgUrl} download={`variation-${i + 1}.jpg`} style={{ padding: '5px 8px', background: '#1a1d27', color: '#9299b5', border: 'none', borderRadius: 6, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                            <Download size={10} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {aiResults.length > 0 && (
                  <button onClick={handleAIGenerate} style={{ ...accentBtnStyle, justifyContent: 'center', width: '100%', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <Sparkles size={13} />
                    Generate More Variations
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* ─── EXPORT MODAL ─── */}
      {/* ═══════════════════════════════════════ */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 600, background: '#13151c', borderRadius: 16, border: '1px solid #1a1d27', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a1d27', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Package size={18} style={{ color: '#22c07a' }} />
                <div style={{ fontSize: 18, fontWeight: 900, color: '#e8eaed', fontFamily: 'Barlow Condensed, sans-serif' }}>Export Print-Ready Files</div>
              </div>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Pre-export checklist */}
              <div>
                <div style={panelTitleStyle}>Pre-Export Checklist</div>
                {PRINT_CHECKS.map(check => (
                  <div key={check.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <span style={{ color: check.default ? '#22c07a' : '#f25a5a' }}>
                      {check.default ? <Check size={14} /> : <AlertTriangle size={14} />}
                    </span>
                    <span style={{ fontSize: 12, color: check.default ? '#9299b5' : '#f25a5a' }}>{check.label}</span>
                  </div>
                ))}
              </div>
              {/* Export options */}
              <div>
                <div style={panelTitleStyle}>Production Files</div>
                {[
                  { key: 'panels' as const, label: `All Panels Combined PDF (${selectedPanels.length || 'N/A'} panels · ${totalToOrder} sqft)` },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={exportOptions[opt.key]} onChange={e => setExportOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))} style={{ accentColor: '#4f7fff' }} />
                    <span style={{ fontSize: 12, color: '#e8eaed' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <div style={panelTitleStyle}>Shop Documents</div>
                {[
                  { key: 'brief' as const, label: 'Production Brief PDF (panel list, sqft, seam notes, install order)' },
                  { key: 'cutList' as const, label: 'Material Cut List (rolls needed per panel)' },
                  { key: 'installGuide' as const, label: 'Install Guide (panel order, seam locations, temp notes)' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={exportOptions[opt.key]} onChange={e => setExportOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))} style={{ accentColor: '#4f7fff' }} />
                    <span style={{ fontSize: 12, color: '#e8eaed' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <div style={panelTitleStyle}>Customer Documents</div>
                {[
                  { key: 'customerProof' as const, label: 'Customer Proof PDF (clean, branded)' },
                  { key: 'approvalForm' as const, label: 'Approval Form with Signature Line' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
                    <input type="checkbox" checked={exportOptions[opt.key]} onChange={e => setExportOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))} style={{ accentColor: '#4f7fff' }} />
                    <span style={{ fontSize: 12, color: '#e8eaed' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #1a1d27', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => setShowExportModal(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1a1d27', borderRadius: 8, color: '#9299b5', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={handleExport} disabled={exporting} style={{ flex: 2, padding: '10px', background: '#22c07a', border: 'none', borderRadius: 8, color: '#0d1a10', cursor: 'pointer', fontSize: 13, fontWeight: 800, opacity: exporting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={14} />
                {exporting ? 'Exporting...' : 'Export Selected Files'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Sub-components ──
function ToolBtn({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 44, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? '#4f7fff22' : 'transparent',
        color: active ? '#4f7fff' : '#5a6080',
        transition: 'all 0.15s',
      }}
    >
      <Icon size={16} />
    </button>
  )
}

// ── Styles ──
const topBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '6px 8px', borderRadius: 8, border: 'none',
  background: 'transparent', color: '#9299b5', cursor: 'pointer', fontSize: 12,
}

const accentBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', borderRadius: 8, border: 'none',
  cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0,
  whiteSpace: 'nowrap' as const,
}

const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '3px 8px', borderRadius: 20, border: '1px solid #1a1d27',
  background: '#13151c', fontSize: 10, color: '#9299b5', cursor: 'default',
  fontFamily: 'JetBrains Mono, monospace',
}

const panelTitleStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 900, color: '#5a6080',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
  fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8,
}

const miniBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#9299b5', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 4, borderRadius: 4,
}

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#5a6080',
  textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6,
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: '#0d0f14',
  border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed',
  fontSize: 12, outline: 'none', boxSizing: 'border-box' as const,
}

const selectSt: React.CSSProperties = {
  ...inputSt,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%235a6080' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 8px center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '16px 16px',
  paddingRight: 28,
}

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: '#1a1d27', border: 'none',
  borderRadius: 6, color: '#9299b5', fontSize: 11, cursor: 'pointer',
}
