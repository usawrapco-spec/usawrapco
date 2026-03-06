'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MousePointer2, Move, PenLine, Type, Square, Circle, Minus,
  Pencil, Pipette, Upload, X, Loader2, Download, Sparkles,
  Globe, ChevronDown, ChevronRight, RefreshCw, Plus, Trash2,
  RotateCcw, Image as ImageIcon, Palette, Check, AlertCircle,
  ZoomIn, ZoomOut, Maximize2, Layers, Eye, EyeOff, Lock,
  Unlock, GripVertical, Copy, Scissors, ClipboardPaste,
  Undo2, Redo2, FlipHorizontal, FlipVertical, AlignLeft,
  AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical,
  AlignEndVertical, Grid3X3, Magnet, Save, FileDown, FolderOpen,
  Settings, ChevronUp, Triangle, Hexagon, Star, Eraser,
  LayoutGrid, Car, Shirt, Wand2, Bold, Italic, Underline,
  Ruler, SlidersHorizontal, Hash,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolId = 'select' | 'directSelect' | 'pen' | 'text' | 'rect' | 'ellipse'
  | 'line' | 'brush' | 'eraser' | 'eyedropper' | 'hand' | 'zoom' | 'polygon' | 'star' | 'triangle' | 'image'
type ProductMode = 'vehicle' | 'sign' | 'apparel'
type RightTab = 'properties' | 'layers' | 'color' | 'swatches'

interface LayerItem {
  id: string
  name: string
  visible: boolean
  locked: boolean
  type: string
}

interface DesignStudioInternalProps {
  orgId: string
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: { id: ToolId; icon: any; label: string; shortcut: string; group?: string }[] = [
  { id: 'select',       icon: MousePointer2,  label: 'Selection Tool',         shortcut: 'V' },
  { id: 'directSelect', icon: Move,           label: 'Direct Selection Tool',  shortcut: 'A' },
  { id: 'pen',          icon: PenLine,         label: 'Pen Tool',              shortcut: 'P' },
  { id: 'text',         icon: Type,            label: 'Type Tool',             shortcut: 'T', group: 'sep' },
  { id: 'line',         icon: Minus,           label: 'Line Segment Tool',     shortcut: '\\' },
  { id: 'rect',         icon: Square,          label: 'Rectangle Tool',        shortcut: 'M' },
  { id: 'ellipse',      icon: Circle,          label: 'Ellipse Tool',          shortcut: 'L' },
  { id: 'polygon',      icon: Hexagon,         label: 'Polygon Tool',          shortcut: '' },
  { id: 'star',         icon: Star,            label: 'Star Tool',             shortcut: '', group: 'sep' },
  { id: 'brush',        icon: Pencil,          label: 'Paintbrush Tool',       shortcut: 'B' },
  { id: 'eraser',       icon: Eraser,          label: 'Eraser Tool',           shortcut: 'E' },
  { id: 'eyedropper',   icon: Pipette,         label: 'Eyedropper Tool',       shortcut: 'I', group: 'sep' },
  { id: 'hand',         icon: Move,            label: 'Hand Tool',             shortcut: 'H' },
  { id: 'zoom',         icon: ZoomIn,          label: 'Zoom Tool',             shortcut: 'Z' },
]

const BODY_TYPES = [
  { id: 'van',       label: 'Cargo Van' },
  { id: 'sprinter',  label: 'Sprinter' },
  { id: 'box_truck', label: 'Box Truck' },
  { id: 'pickup',    label: 'Pickup' },
  { id: 'suv',       label: 'SUV' },
  { id: 'car',       label: 'Sedan' },
  { id: 'trailer',   label: 'Trailer' },
  { id: 'boat',      label: 'Boat' },
]

const SIGN_TYPES = [
  { id: 'coroplast_24x36', label: 'Yard Sign 24x36',   w: 24, h: 36 },
  { id: 'banner_3x8',      label: 'Banner 3x8',        w: 36, h: 96 },
  { id: 'banner_4x8',      label: 'Banner 4x8',        w: 48, h: 96 },
  { id: 'a_frame',         label: 'A-Frame 24x36',     w: 24, h: 36 },
  { id: 'aluminum',        label: 'Aluminum 18x24',    w: 18, h: 24 },
  { id: 'magnet_12x18',    label: 'Magnet 12x18',      w: 12, h: 18 },
  { id: 'custom',          label: 'Custom Size',        w: 0,  h: 0 },
]

const APPAREL_TYPES = [
  { id: 'tshirt', label: 'T-Shirt' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'hat',    label: 'Hat' },
  { id: 'polo',   label: 'Polo' },
]

const SWATCH_COLORS = [
  '#000000','#333333','#666666','#999999','#cccccc','#ffffff',
  '#ff0000','#ff6600','#ffcc00','#33cc33','#0066ff','#9933ff',
  '#cc0000','#cc6600','#cccc00','#009933','#003399','#660099',
  '#ff6666','#ffaa66','#ffff66','#66ff66','#66aaff','#cc66ff',
  '#1a56f0','#e94560','#22c07a','#f59e0b','#8b5cf6','#22d3ee',
]

const FONTS = [
  'Impact', 'Arial', 'Helvetica', 'Barlow Condensed', 'Oswald',
  'Roboto', 'Montserrat', 'Bebas Neue', 'Poppins', 'Inter',
  'Georgia', 'Times New Roman', 'Courier New',
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG = '#1e1e2e'
const BG2 = '#181825'
const SURFACE = '#252536'
const SURFACE2 = '#2a2a3d'
const BORDER = '#313147'
const TEXT1 = '#cdd6f4'
const TEXT2 = '#9399b5'
const TEXT3 = '#6c7086'
const ACCENT = '#4f7fff'
const GREEN = '#22c07a'
const RED = '#f25a5a'

// ─── Component ────────────────────────────────────────────────────────────────

export default function DesignStudioInternal({ orgId }: DesignStudioInternalProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolId>('select')
  const [fillColor, setFillColor] = useState('#4f7fff')
  const [strokeColor, setStrokeColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [opacity, setOpacity] = useState(100)
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState('Impact')
  const [fontBold, setFontBold] = useState(true)
  const [fontItalic, setFontItalic] = useState(false)

  // Canvas
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [zoom, setZoom] = useState(100)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const lastPanPosRef = useRef({ x: 0, y: 0 })

  // Undo/redo
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const isLoadingRef = useRef(false)

  // Selection
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [selectionProps, setSelectionProps] = useState<any>(null)

  // Layers
  const [layers, setLayers] = useState<LayerItem[]>([])

  // Right panels
  const [rightTab, setRightTab] = useState<RightTab>('properties')
  const [showRightPanel, setShowRightPanel] = useState(true)

  // Product mode (docked panel)
  const [productMode, setProductMode] = useState<ProductMode>('vehicle')
  const [showProductPanel, setShowProductPanel] = useState(true)

  // Vehicle state
  const [year, setYear] = useState('2024')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [bodyType, setBodyType] = useState('van')
  const [vehicleRenderUrl, setVehicleRenderUrl] = useState<string | null>(null)
  const [generatingVehicle, setGeneratingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)

  // Sign state
  const [signTypeId, setSignTypeId] = useState('coroplast_24x36')
  const [signW, setSignW] = useState(24)
  const [signH, setSignH] = useState(36)

  // Apparel state
  const [apparelType, setApparelType] = useState('tshirt')
  const [apparelColor, setApparelColor] = useState('#f9fafb')
  const [apparelRenderUrl, setApparelRenderUrl] = useState<string | null>(null)
  const [generatingApparel, setGeneratingApparel] = useState(false)

  // Brand
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null)
  const [brandLogoPreview, setBrandLogoPreview] = useState<string | null>(null)
  const [brandPhone, setBrandPhone] = useState('')
  const [brandWebsite, setBrandWebsite] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Finalize
  const [finalizing, setFinalizing] = useState(false)
  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const [finalError, setFinalError] = useState<string | null>(null)
  const [resultZoomed, setResultZoomed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Menu state
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Grid/snap
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)

  // Canvas cursor position
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [objectCount, setObjectCount] = useState(0)
  const [canvasW, setCanvasW] = useState(1200)
  const [canvasH, setCanvasH] = useState(800)

  // Rulers
  const [showRulers, setShowRulers] = useState(true)

  // Tab hidden panels
  const [panelsHidden, setPanelsHidden] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ── Fabric.js initialization ──────────────────────────────────────────────

  const pushUndo = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || isLoadingRef.current) return
    const json = JSON.stringify(fc.toJSON(['id', 'name', 'selectable', 'evented']))
    undoStackRef.current = [...undoStackRef.current.slice(-50), json]
    redoStackRef.current = []
    setUndoCount(undoStackRef.current.length)
    setRedoCount(0)
  }, [])

  const syncLayers = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const objs = fc.getObjects()
    const items: LayerItem[] = objs.map((o: any, i: number) => ({
      id: o.id || `obj-${i}`,
      name: o.name || o.type || `Object ${i + 1}`,
      visible: o.visible !== false,
      locked: !o.selectable,
      type: o.type || 'unknown',
    })).reverse()
    setLayers(items)
    setObjectCount(objs.length)
  }, [])

  const updateSelectionProps = useCallback((obj: any) => {
    if (!obj) { setSelectionProps(null); setSelectedObj(null); return }
    setSelectedObj(obj)
    setSelectionProps({
      type: obj.type,
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0),
      width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
      height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
      angle: Math.round(obj.angle || 0),
      opacity: Math.round((obj.opacity || 1) * 100),
      fill: obj.fill || 'transparent',
      stroke: obj.stroke || 'none',
      strokeWidth: obj.strokeWidth || 0,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      fontWeight: obj.fontWeight,
      fontStyle: obj.fontStyle,
      text: obj.text,
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
    })
  }, [])

  useEffect(() => {
    if (!isMounted || !canvasElRef.current || fabricRef.current) return
    let mounted = true

    const initCanvas = async () => {
      try {
        const fabric = await import('fabric')
        if (!mounted || !canvasElRef.current) return

        const container = canvasContainerRef.current
        const w = container ? Math.max(container.clientWidth, 600) : 1200
        const h = container ? Math.max(container.clientHeight, 400) : 800
        setCanvasW(w)
        setCanvasH(h)

        const fc = new (fabric as any).Canvas(canvasElRef.current, {
          width: w,
          height: h,
          backgroundColor: '#2a2a3d',
          selection: true,
          preserveObjectStacking: true,
          stopContextMenu: true,
          fireRightClick: true,
        })
        fabricRef.current = fc

        // Draw grid function
        const drawGrid = () => {
          // Grid is rendered via CSS on overlay
        }
        drawGrid()

        // Track changes for undo & layers
        fc.on('object:added', () => { if (mounted) { syncLayers(); pushUndo() } })
        fc.on('object:removed', () => { if (mounted) { syncLayers(); pushUndo() } })
        fc.on('object:modified', () => { if (mounted) { syncLayers(); pushUndo() } })

        // Selection tracking
        fc.on('selection:created', (e: any) => {
          if (mounted) updateSelectionProps(e.selected?.[0] || fc.getActiveObject())
        })
        fc.on('selection:updated', (e: any) => {
          if (mounted) updateSelectionProps(e.selected?.[0] || fc.getActiveObject())
        })
        fc.on('selection:cleared', () => {
          if (mounted) updateSelectionProps(null)
        })

        // Cursor position tracking (throttled)
        let lastMoveTs = 0
        fc.on('mouse:move', (opt: any) => {
          if (!mounted) return
          const now = Date.now()
          if (now - lastMoveTs < 50) return
          lastMoveTs = now
          const ptr = fc.getPointer(opt.e)
          setCursorPos({ x: Math.round(ptr.x), y: Math.round(ptr.y) })
        })

        // Mouse wheel zoom
        fc.on('mouse:wheel', (opt: any) => {
          opt.e.preventDefault()
          opt.e.stopPropagation()
          const delta = opt.e.deltaY
          let z = fc.getZoom()
          z *= 0.999 ** delta
          z = Math.min(Math.max(z, 0.1), 10)
          fc.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, z)
          setZoom(Math.round(z * 100))
        })

        // Pan with middle mouse or space+drag
        fc.on('mouse:down', (opt: any) => {
          if (opt.e.button === 1 || (opt.e.button === 0 && opt.e.altKey)) {
            isPanningRef.current = true
            lastPanPosRef.current = { x: opt.e.clientX, y: opt.e.clientY }
            fc.selection = false
            fc.defaultCursor = 'grabbing'
            fc.setCursor('grabbing')
          }
        })
        fc.on('mouse:move', (opt: any) => {
          if (isPanningRef.current) {
            const vpt = fc.viewportTransform
            if (vpt) {
              vpt[4] += opt.e.clientX - lastPanPosRef.current.x
              vpt[5] += opt.e.clientY - lastPanPosRef.current.y
              lastPanPosRef.current = { x: opt.e.clientX, y: opt.e.clientY }
              fc.requestRenderAll()
            }
          }
        })
        fc.on('mouse:up', () => {
          if (isPanningRef.current) {
            isPanningRef.current = false
            fc.selection = true
            fc.defaultCursor = 'default'
          }
        })

        // Initial undo state
        const json = JSON.stringify(fc.toJSON())
        undoStackRef.current = [json]
        setUndoCount(1)

        // Window resize
        const handleResize = () => {
          const c = canvasContainerRef.current
          if (!c || !fabricRef.current) return
          const nw = Math.max(c.clientWidth, 600)
          const nh = Math.max(c.clientHeight, 400)
          fabricRef.current.setWidth(nw)
          fabricRef.current.setHeight(nh)
          fabricRef.current.renderAll()
          setCanvasW(nw)
          setCanvasH(nh)
        }
        window.addEventListener('resize', handleResize)

        fc.renderAll()
        syncLayers()

        return () => {
          window.removeEventListener('resize', handleResize)
        }
      } catch (err) {
        console.error('Fabric init error:', err)
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
  }, [isMounted])

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || undoStackRef.current.length <= 1) return
    const current = undoStackRef.current.pop()!
    redoStackRef.current.push(current)
    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    isLoadingRef.current = true
    fc.loadFromJSON(JSON.parse(prev), () => {
      fc.renderAll()
      isLoadingRef.current = false
      syncLayers()
      setUndoCount(undoStackRef.current.length)
      setRedoCount(redoStackRef.current.length)
    })
  }, [syncLayers])

  const redo = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || redoStackRef.current.length === 0) return
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    isLoadingRef.current = true
    fc.loadFromJSON(JSON.parse(next), () => {
      fc.renderAll()
      isLoadingRef.current = false
      syncLayers()
      setUndoCount(undoStackRef.current.length)
      setRedoCount(redoStackRef.current.length)
    })
  }, [syncLayers])

  // ── Object operations ─────────────────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active) return
    if (active.type === 'activeSelection') {
      (active as any).forEachObject((obj: any) => fc.remove(obj))
      fc.discardActiveObject()
    } else {
      fc.remove(active)
    }
    fc.renderAll()
  }, [])

  const duplicateSelected = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (!active) return
    active.clone((cloned: any) => {
      cloned.set({ left: (active.left || 0) + 20, top: (active.top || 0) + 20 })
      fc.add(cloned)
      fc.setActiveObject(cloned)
      fc.renderAll()
    })
  }, [])

  const copyToClipboard = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObject()
    if (active) (window as any).__studioClip = active
  }, [])

  const pasteFromClipboard = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const clip = (window as any).__studioClip
    if (!clip) return
    clip.clone((cloned: any) => {
      cloned.set({ left: (clip.left || 0) + 20, top: (clip.top || 0) + 20 })
      fc.add(cloned)
      fc.setActiveObject(cloned)
      fc.renderAll()
    })
  }, [])

  const cutSelected = useCallback(() => {
    copyToClipboard()
    deleteSelected()
  }, [copyToClipboard, deleteSelected])

  const selectAll = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc) return
    fc.discardActiveObject()
    const objs = fc.getObjects().filter((o: any) => o.selectable !== false)
    if (objs.length === 0) return
    if (objs.length === 1) {
      fc.setActiveObject(objs[0]); fc.renderAll()
    } else {
      try {
        const fabric = await import('fabric')
        const sel = new (fabric as any).ActiveSelection(objs, { canvas: fc })
        fc.setActiveObject(sel); fc.renderAll()
      } catch {
        // Fallback: just select first object
        fc.setActiveObject(objs[0]); fc.renderAll()
      }
    }
  }, [])

  const bringForward = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const a = fc.getActiveObject(); if (a) { fc.bringObjectForward(a); fc.renderAll(); syncLayers() }
  }, [syncLayers])

  const sendBackward = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const a = fc.getActiveObject(); if (a) { fc.sendObjectBackwards(a); fc.renderAll(); syncLayers() }
  }, [syncLayers])

  const bringToFront = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const a = fc.getActiveObject(); if (a) { fc.bringObjectToFront(a); fc.renderAll(); syncLayers() }
  }, [syncLayers])

  const sendToBack = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const a = fc.getActiveObject(); if (a) { fc.sendObjectToBack(a); fc.renderAll(); syncLayers() }
  }, [syncLayers])

  const groupSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const active = fc.getActiveObject() as any
    if (active?.type === 'activeSelection') {
      const group = active.toGroup()
      fc.setActiveObject(group)
      fc.renderAll()
    }
  }, [])

  const ungroupSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const active = fc.getActiveObject() as any
    if (active?.type === 'group') {
      active.toActiveSelection()
      fc.renderAll()
    }
  }, [])

  const flipH = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const a = fc.getActiveObject(); if (a) { a.set('flipX', !a.flipX); fc.renderAll() }
  }, [])

  const flipV = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const a = fc.getActiveObject(); if (a) { a.set('flipY', !a.flipY); fc.renderAll() }
  }, [])

  // ── Alignment ────────────────────────────────────────────────────────────

  const alignObjects = useCallback((dir: string) => {
    const fc = fabricRef.current; if (!fc) return
    const active = fc.getActiveObject()
    if (!active) return
    const cw = fc.width || 1200
    const ch = fc.height || 800
    if (dir === 'left') active.set('left', 0)
    else if (dir === 'center-h') active.set('left', (cw - (active.width || 0) * (active.scaleX || 1)) / 2)
    else if (dir === 'right') active.set('left', cw - (active.width || 0) * (active.scaleX || 1))
    else if (dir === 'top') active.set('top', 0)
    else if (dir === 'center-v') active.set('top', (ch - (active.height || 0) * (active.scaleY || 1)) / 2)
    else if (dir === 'bottom') active.set('top', ch - (active.height || 0) * (active.scaleY || 1))
    active.setCoords()
    fc.renderAll()
  }, [])

  // ── Add objects ─────────────────────────────────────────────────────────

  const addRect = useCallback(async (x?: number, y?: number) => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const rect = new (fabric as any).Rect({
      left: x ?? 200 + Math.random() * 100,
      top: y ?? 150 + Math.random() * 100,
      width: 200, height: 120,
      fill: fillColor, stroke: strokeColor, strokeWidth,
      rx: 0, ry: 0, opacity: opacity / 100,
      name: 'Rectangle',
    })
    fc.add(rect); fc.setActiveObject(rect); fc.renderAll()
  }, [fillColor, strokeColor, strokeWidth, opacity])

  const addEllipse = useCallback(async (x?: number, y?: number) => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const ellipse = new (fabric as any).Ellipse({
      left: x ?? 200 + Math.random() * 100,
      top: y ?? 150 + Math.random() * 100,
      rx: 100, ry: 60,
      fill: fillColor, stroke: strokeColor, strokeWidth,
      opacity: opacity / 100, name: 'Ellipse',
    })
    fc.add(ellipse); fc.setActiveObject(ellipse); fc.renderAll()
  }, [fillColor, strokeColor, strokeWidth, opacity])

  const addLine = useCallback(async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const line = new (fabric as any).Line([100, 200, 400, 200], {
      stroke: strokeColor, strokeWidth: Math.max(strokeWidth, 2),
      opacity: opacity / 100, name: 'Line',
    })
    fc.add(line); fc.setActiveObject(line); fc.renderAll()
  }, [strokeColor, strokeWidth, opacity])

  const addText = useCallback(async (x?: number, y?: number) => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const text = new (fabric as any).IText('Type here', {
      left: x ?? 200 + Math.random() * 100,
      top: y ?? 200 + Math.random() * 100,
      fontSize, fontFamily,
      fontWeight: fontBold ? 'bold' : 'normal',
      fontStyle: fontItalic ? 'italic' : 'normal',
      fill: fillColor, opacity: opacity / 100,
      name: 'Text',
    })
    fc.add(text); fc.setActiveObject(text)
    text.enterEditing(); fc.renderAll()
  }, [fontSize, fontFamily, fontBold, fontItalic, fillColor, opacity])

  const addTriangle = useCallback(async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const tri = new (fabric as any).Triangle({
      left: 200, top: 150, width: 160, height: 140,
      fill: fillColor, stroke: strokeColor, strokeWidth,
      opacity: opacity / 100, name: 'Triangle',
    })
    fc.add(tri); fc.setActiveObject(tri); fc.renderAll()
  }, [fillColor, strokeColor, strokeWidth, opacity])

  const addPolygon = useCallback(async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const sides = 6; const r = 80
    const pts = Array.from({ length: sides }, (_, i) => ({
      x: r * Math.cos((2 * Math.PI * i) / sides - Math.PI / 2),
      y: r * Math.sin((2 * Math.PI * i) / sides - Math.PI / 2),
    }))
    const poly = new (fabric as any).Polygon(pts, {
      left: 300, top: 200,
      fill: fillColor, stroke: strokeColor, strokeWidth,
      opacity: opacity / 100, name: 'Polygon',
    })
    fc.add(poly); fc.setActiveObject(poly); fc.renderAll()
  }, [fillColor, strokeColor, strokeWidth, opacity])

  const addStar = useCallback(async () => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    const points = 5; const outer = 80; const inner = 35
    const pts = Array.from({ length: points * 2 }, (_, i) => {
      const r = i % 2 === 0 ? outer : inner
      const angle = (Math.PI * i) / points - Math.PI / 2
      return { x: r * Math.cos(angle), y: r * Math.sin(angle) }
    })
    const star = new (fabric as any).Polygon(pts, {
      left: 300, top: 200,
      fill: fillColor, stroke: strokeColor, strokeWidth,
      opacity: opacity / 100, name: 'Star',
    })
    fc.add(star); fc.setActiveObject(star); fc.renderAll()
  }, [fillColor, strokeColor, strokeWidth, opacity])

  const addImage = useCallback(async (url: string) => {
    const fabric = await import('fabric')
    const fc = fabricRef.current; if (!fc) return
    try {
      const img = await (fabric as any).FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      const maxW = (fc.width || 1200) * 0.5
      if ((img.width || 0) > maxW) img.scaleToWidth(maxW)
      img.set({ left: 100, top: 100, name: 'Image' })
      fc.add(img); fc.setActiveObject(img); fc.renderAll()
    } catch (err) {
      console.error('Image load error:', err)
    }
  }, [])

  // ── Canvas click handler for shape tools ──────────────────────────────────

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !isMounted) return

    const handler = async (opt: any) => {
      // Don't create shapes if we clicked an existing object
      if (opt.target) return
      if (opt.e.button !== 0) return

      const ptr = fc.getPointer(opt.e)
      const x = ptr.x
      const y = ptr.y

      switch (activeTool) {
        case 'rect': await addRect(x, y); setActiveTool('select'); break
        case 'ellipse': await addEllipse(x, y); setActiveTool('select'); break
        case 'text': await addText(x, y); setActiveTool('select'); break
        case 'line': await addLine(); setActiveTool('select'); break
        case 'polygon': await addPolygon(); setActiveTool('select'); break
        case 'star': await addStar(); setActiveTool('select'); break
        case 'triangle': await addTriangle(); setActiveTool('select'); break
        case 'eyedropper': {
          try {
            const canvasEl = canvasElRef.current
            if (canvasEl) {
              const ctx = canvasEl.getContext('2d')
              if (ctx) {
                const pixel = ctx.getImageData(Math.round(opt.e.offsetX), Math.round(opt.e.offsetY), 1, 1).data
                const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`
                setFillColor(hex)
              }
            }
          } catch { /* cross-origin */ }
          break
        }
      }
    }
    fc.on('mouse:down', handler)
    return () => { fc.off('mouse:down', handler) }
  }, [activeTool, isMounted, addRect, addEllipse, addText, addLine, addPolygon, addStar, addTriangle])

  // ── Sync tool mode with fabric ──────────────────────────────────────────

  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return
    fc.isDrawingMode = activeTool === 'brush' || activeTool === 'eraser'
    if (fc.isDrawingMode && fc.freeDrawingBrush) {
      fc.freeDrawingBrush.color = activeTool === 'eraser' ? '#2a2a3d' : fillColor
      fc.freeDrawingBrush.width = strokeWidth
    }
    fc.selection = activeTool === 'select' || activeTool === 'directSelect'
    const cursors: Record<string, string> = {
      select: 'default', directSelect: 'default', hand: 'grab',
      zoom: 'zoom-in', eyedropper: 'crosshair', pen: 'crosshair',
      text: 'text', brush: 'crosshair', eraser: 'crosshair',
      rect: 'crosshair', ellipse: 'crosshair', line: 'crosshair',
      polygon: 'crosshair', star: 'crosshair', triangle: 'crosshair', image: 'default',
    }
    fc.defaultCursor = cursors[activeTool] || 'default'
    fc.hoverCursor = activeTool === 'select' ? 'move' : cursors[activeTool] || 'default'
  }, [activeTool, fillColor, strokeWidth])

  // ── Keyboard shortcuts (Illustrator-standard) ─────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const inInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable
      const fc = fabricRef.current
      if (!fc) return

      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      // Ctrl combos (work even in input)
      if (ctrl && e.key === 'z' && !shift) { e.preventDefault(); undo(); return }
      if (ctrl && e.key === 'z' && shift) { e.preventDefault(); redo(); return }
      if (ctrl && e.key === 'y') { e.preventDefault(); redo(); return }
      if (ctrl && e.key === 's') { e.preventDefault(); exportCanvas('png'); return }

      if (inInput) return // Single-key shortcuts only outside inputs

      if (ctrl && e.key === 'c') { e.preventDefault(); copyToClipboard(); return }
      if (ctrl && e.key === 'v') { e.preventDefault(); pasteFromClipboard(); return }
      if (ctrl && e.key === 'x') { e.preventDefault(); cutSelected(); return }
      if (ctrl && e.key === 'd') { e.preventDefault(); duplicateSelected(); return }
      if (ctrl && e.key === 'a') { e.preventDefault(); selectAll(); return }
      if (ctrl && e.key === 'g' && !shift) { e.preventDefault(); groupSelected(); return }
      if (ctrl && e.key === 'g' && shift) { e.preventDefault(); ungroupSelected(); return }
      if (ctrl && e.key === ']' && !shift) { e.preventDefault(); bringForward(); return }
      if (ctrl && e.key === '[' && !shift) { e.preventDefault(); sendBackward(); return }
      if (ctrl && e.key === ']' && shift) { e.preventDefault(); bringToFront(); return }
      if (ctrl && e.key === '[' && shift) { e.preventDefault(); sendToBack(); return }
      if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomIn(); return }
      if (ctrl && e.key === '-') { e.preventDefault(); zoomOut(); return }
      if (ctrl && e.key === '0') { e.preventDefault(); zoomFit(); return }
      if (ctrl && e.key === '1') { e.preventDefault(); zoom100(); return }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); return }

      // Escape
      if (e.key === 'Escape') { fc.discardActiveObject(); fc.renderAll(); setOpenMenu(null); return }

      // Tab = toggle panels
      if (e.key === 'Tab') { e.preventDefault(); setPanelsHidden(p => !p); return }

      // Single-key tool shortcuts
      const toolMap: Record<string, ToolId> = {
        v: 'select', a: 'directSelect', p: 'pen', t: 'text',
        m: 'rect', l: 'ellipse', b: 'brush', e: 'eraser',
        i: 'eyedropper', h: 'hand', z: 'zoom', r: 'rect',
        n: 'brush',
      }
      const toolKey = toolMap[e.key.toLowerCase()]
      if (toolKey) { setActiveTool(toolKey); return }

      // Brush size shortcuts
      if (e.key === '[') { setStrokeWidth(w => Math.max(1, w - 1)); return }
      if (e.key === ']') { setStrokeWidth(w => Math.min(100, w + 1)); return }

      // X = swap fill/stroke
      if (e.key === 'x' || e.key === 'X') {
        const f = fillColor; setFillColor(strokeColor); setStrokeColor(f); return
      }

      // D = default colors
      if (e.key === 'd' || e.key === 'D') {
        setFillColor('#ffffff'); setStrokeColor('#000000'); return
      }

      // Arrow keys = nudge
      const nudge = shift ? 10 : 1
      const active = fc.getActiveObject()
      if (active && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        if (e.key === 'ArrowUp') active.set('top', (active.top || 0) - nudge)
        if (e.key === 'ArrowDown') active.set('top', (active.top || 0) + nudge)
        if (e.key === 'ArrowLeft') active.set('left', (active.left || 0) - nudge)
        if (e.key === 'ArrowRight') active.set('left', (active.left || 0) + nudge)
        active.setCoords()
        fc.renderAll()
        updateSelectionProps(active)
      }

      // Space = temporary hand tool
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        // Could restore previous tool here
      }
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [undo, redo, copyToClipboard, pasteFromClipboard, cutSelected, duplicateSelected,
      selectAll, groupSelected, ungroupSelected, bringForward, sendBackward,
      bringToFront, sendToBack, deleteSelected, fillColor, strokeColor, updateSelectionProps])

  // ── Zoom controls ─────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const z = Math.min(fc.getZoom() * 1.25, 10)
    fc.setZoom(z); setZoom(Math.round(z * 100)); fc.renderAll()
  }, [])

  const zoomOut = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    const z = Math.max(fc.getZoom() * 0.8, 0.1)
    fc.setZoom(z); setZoom(Math.round(z * 100)); fc.renderAll()
  }, [])

  const zoom100 = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    fc.setZoom(1); setZoom(100); fc.renderAll()
  }, [])

  const zoomFit = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return
    fc.setZoom(0.5); setZoom(50)
    if (fc.viewportTransform) { fc.viewportTransform[4] = 0; fc.viewportTransform[5] = 0 }
    fc.renderAll()
  }, [])

  // ── Export ──────────────────────────────────────────────────────────────────

  const exportCanvas = useCallback((format: 'png' | 'jpg' | 'svg') => {
    const fc = fabricRef.current; if (!fc) return
    let dataUrl: string
    if (format === 'svg') {
      const svg = fc.toSVG()
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      dataUrl = URL.createObjectURL(blob)
    } else {
      dataUrl = fc.toDataURL({ format: format === 'jpg' ? 'jpeg' : 'png', quality: 0.95, multiplier: 2 })
    }
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `design-${Date.now()}.${format}`
    a.click()
    if (format === 'svg') URL.revokeObjectURL(dataUrl)
  }, [])

  // ── Image upload handler ──────────────────────────────────────────────────

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    await addImage(url)
  }, [addImage])

  // ── Brand / Vehicle / AI operations (preserved from original) ──────────────

  const handleGenerateVehicle = async () => {
    setGeneratingVehicle(true); setVehicleError(null); setVehicleRenderUrl(null)
    try {
      const res = await fetch('/api/mockup/generate-vehicle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, make, model, body_type: bodyType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Render failed')
      setVehicleRenderUrl(data.render_url)
      await addImage(data.render_url)
    } catch (err: any) { setVehicleError(err.message) }
    finally { setGeneratingVehicle(false) }
  }

  const handleScrape = async () => {
    if (!websiteUrl.trim()) return
    setScraping(true)
    try {
      const res = await fetch('/api/mockup/scrape-brand', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      })
      const data = await res.json()
      if (data.phone) setBrandPhone(data.phone)
      if (data.website) setBrandWebsite(data.website)
      if (data.logo_url) { setBrandLogoUrl(data.logo_url); setBrandLogoPreview(data.logo_url) }
    } finally { setScraping(false) }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setBrandLogoPreview(URL.createObjectURL(f)); setLogoUploading(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const res = await fetch('/api/mockup/public-upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setBrandLogoUrl(data.url)
    } finally { setLogoUploading(false) }
  }

  const handleFinalize = async () => {
    const fc = fabricRef.current; if (!fc) return
    setFinalizing(true); setFinalError(null); setFinalUrl(null)
    try {
      const dataUrl = fc.toDataURL({ format: 'png', quality: 0.85, multiplier: 1 })
      const blob = await (await fetch(dataUrl)).blob()
      const fd = new FormData()
      fd.append('file', new File([blob], 'sketch.png', { type: 'image/png' }))
      const upRes = await fetch('/api/mockup/public-upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      const body: Record<string, unknown> = {
        sketch_url: upData.url,
        vehicle_photo_url: vehicleRenderUrl,
        logo_url: brandLogoUrl, phone: brandPhone, website: brandWebsite,
        product_type: productMode === 'sign' ? 'signage' : productMode,
        org_id: orgId,
      }
      const res = await fetch('/api/mockup/customer-start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`/api/mockup/status/${data.mockup_id}`)
          const sd = await sr.json()
          if (sd.status === 'concept_ready' || sd.status === 'complete') {
            clearInterval(pollRef.current!); setFinalUrl(sd.final_mockup_url || sd.concept_url); setFinalizing(false)
          } else if (sd.status === 'failed') {
            clearInterval(pollRef.current!); setFinalError(sd.error_message || 'Failed'); setFinalizing(false)
          }
        } catch { /* retry */ }
      }, 2500)
    } catch (err: any) { setFinalError(err.message); setFinalizing(false) }
  }

  // Update selection properties in real-time
  const updateProp = useCallback((key: string, value: any) => {
    const fc = fabricRef.current
    if (!fc || !selectedObj) return
    if (key === 'left' || key === 'top') {
      selectedObj.set(key, Number(value))
    } else if (key === 'width') {
      const scale = Number(value) / (selectedObj.width || 1)
      selectedObj.set('scaleX', scale)
    } else if (key === 'height') {
      const scale = Number(value) / (selectedObj.height || 1)
      selectedObj.set('scaleY', scale)
    } else if (key === 'angle') {
      selectedObj.set('angle', Number(value))
    } else if (key === 'opacity') {
      selectedObj.set('opacity', Number(value) / 100)
    } else if (key === 'fill') {
      selectedObj.set('fill', value)
    } else if (key === 'stroke') {
      selectedObj.set('stroke', value)
    } else if (key === 'strokeWidth') {
      selectedObj.set('strokeWidth', Number(value))
    } else if (key === 'fontSize') {
      selectedObj.set('fontSize', Number(value))
    } else if (key === 'fontFamily') {
      selectedObj.set('fontFamily', value)
    } else if (key === 'fontWeight') {
      selectedObj.set('fontWeight', value)
    } else if (key === 'fontStyle') {
      selectedObj.set('fontStyle', value)
    }
    selectedObj.setCoords()
    fc.renderAll()
    updateSelectionProps(selectedObj)
  }, [selectedObj, updateSelectionProps])

  // ── Styles ──────────────────────────────────────────────────────────────

  const menuBtnStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', color: TEXT2,
    fontSize: 11, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'system-ui', fontWeight: 500,
  }

  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 16px 6px 12px', fontSize: 11, color: TEXT1, cursor: 'pointer',
    background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
    fontFamily: 'system-ui',
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: 9, fontWeight: 800, color: TEXT3, textTransform: 'uppercase',
    letterSpacing: '0.1em', padding: '8px 10px 4px', fontFamily: 'system-ui',
  }

  const propLabel: React.CSSProperties = {
    fontSize: 10, color: TEXT3, fontWeight: 600, minWidth: 20,
  }

  const propInput: React.CSSProperties = {
    width: '100%', padding: '3px 6px', background: BG2, border: `1px solid ${BORDER}`,
    borderRadius: 3, color: TEXT1, fontSize: 11, outline: 'none',
    fontFamily: 'JetBrains Mono, monospace',
  }

  // ── Menu definitions ──────────────────────────────────────────────────────

  const MENUS: Record<string, { label: string; action?: () => void; shortcut?: string; divider?: boolean }[]> = {
    File: [
      { label: 'New Canvas', action: () => { fabricRef.current?.clear(); fabricRef.current?.set('backgroundColor', '#2a2a3d'); fabricRef.current?.renderAll(); syncLayers() } },
      { label: 'Open Image...', action: () => fileInputRef.current?.click() },
      { label: 'divider', divider: true },
      { label: 'Export as PNG', action: () => exportCanvas('png'), shortcut: 'Ctrl+S' },
      { label: 'Export as JPG', action: () => exportCanvas('jpg') },
      { label: 'Export as SVG', action: () => exportCanvas('svg') },
      { label: 'divider', divider: true },
      { label: 'AI Finalize', action: handleFinalize, shortcut: '' },
    ],
    Edit: [
      { label: 'Undo', action: undo, shortcut: 'Ctrl+Z' },
      { label: 'Redo', action: redo, shortcut: 'Ctrl+Shift+Z' },
      { label: 'divider', divider: true },
      { label: 'Cut', action: cutSelected, shortcut: 'Ctrl+X' },
      { label: 'Copy', action: copyToClipboard, shortcut: 'Ctrl+C' },
      { label: 'Paste', action: pasteFromClipboard, shortcut: 'Ctrl+V' },
      { label: 'Duplicate', action: duplicateSelected, shortcut: 'Ctrl+D' },
      { label: 'Delete', action: deleteSelected, shortcut: 'Del' },
      { label: 'divider', divider: true },
      { label: 'Select All', action: selectAll, shortcut: 'Ctrl+A' },
    ],
    Object: [
      { label: 'Group', action: groupSelected, shortcut: 'Ctrl+G' },
      { label: 'Ungroup', action: ungroupSelected, shortcut: 'Ctrl+Shift+G' },
      { label: 'divider', divider: true },
      { label: 'Bring Forward', action: bringForward, shortcut: 'Ctrl+]' },
      { label: 'Send Backward', action: sendBackward, shortcut: 'Ctrl+[' },
      { label: 'Bring to Front', action: bringToFront, shortcut: 'Ctrl+Shift+]' },
      { label: 'Send to Back', action: sendToBack, shortcut: 'Ctrl+Shift+[' },
      { label: 'divider', divider: true },
      { label: 'Flip Horizontal', action: flipH },
      { label: 'Flip Vertical', action: flipV },
    ],
    View: [
      { label: 'Zoom In', action: zoomIn, shortcut: 'Ctrl+=' },
      { label: 'Zoom Out', action: zoomOut, shortcut: 'Ctrl+-' },
      { label: 'Fit to Window', action: zoomFit, shortcut: 'Ctrl+0' },
      { label: 'Actual Size', action: zoom100, shortcut: 'Ctrl+1' },
      { label: 'divider', divider: true },
      { label: showGrid ? 'Hide Grid' : 'Show Grid', action: () => setShowGrid(g => !g) },
      { label: showRulers ? 'Hide Rulers' : 'Show Rulers', action: () => setShowRulers(r => !r) },
      { label: snapToGrid ? 'Disable Snap' : 'Enable Snap to Grid', action: () => setSnapToGrid(s => !s) },
      { label: 'divider', divider: true },
      { label: panelsHidden ? 'Show Panels' : 'Hide Panels', action: () => setPanelsHidden(p => !p), shortcut: 'Tab' },
    ],
    Window: [
      { label: 'Properties', action: () => { setShowRightPanel(true); setRightTab('properties') } },
      { label: 'Layers', action: () => { setShowRightPanel(true); setRightTab('layers') } },
      { label: 'Color', action: () => { setShowRightPanel(true); setRightTab('color') } },
      { label: 'Swatches', action: () => { setShowRightPanel(true); setRightTab('swatches') } },
      { label: 'divider', divider: true },
      { label: showProductPanel ? 'Hide Product Panel' : 'Show Product Panel', action: () => setShowProductPanel(p => !p) },
    ],
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────

  if (!isMounted) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: TEXT2 }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif', background: BG, color: TEXT1 }}
      onClick={() => setOpenMenu(null)}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .studio-menu-item:hover { background: ${ACCENT} !important; color: #fff !important; }
        .studio-tool-btn:hover { background: ${SURFACE2} !important; }
        .studio-tool-btn.active { background: ${ACCENT} !important; color: #fff !important; }
        .studio-layer:hover { background: ${SURFACE2} !important; }
        .studio-swatch:hover { transform: scale(1.2); }
        .studio-right-tab:hover { background: ${SURFACE2} !important; }
        .studio-right-tab.active { background: ${ACCENT} !important; color: #fff !important; }
        input[type="color"] { -webkit-appearance: none; border: none; padding: 0; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: 1px solid ${BORDER}; border-radius: 3px; }
        input[type="range"] { -webkit-appearance: none; height: 3px; background: ${BORDER}; border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: ${ACCENT}; border-radius: 50%; cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
      `}</style>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />

      {/* ═══ MENU BAR ═══════════════════════════════════════════════════════════ */}
      <div style={{ height: 28, background: BG2, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', paddingLeft: 8, flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 16 }}>
          <Wand2 size={13} style={{ color: ACCENT }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: TEXT1, letterSpacing: '0.03em' }}>STUDIO</span>
        </div>

        {Object.entries(MENUS).map(([name, items]) => (
          <div key={name} style={{ position: 'relative' }}>
            <button
              style={{ ...menuBtnStyle, background: openMenu === name ? SURFACE : 'transparent', color: openMenu === name ? TEXT1 : TEXT2 }}
              onMouseEnter={() => { if (openMenu) setOpenMenu(name) }}
              onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === name ? null : name) }}
            >{name}</button>
            {openMenu === name && (
              <div style={{ position: 'absolute', top: '100%', left: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4, minWidth: 200, padding: '4px 0', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                onClick={e => e.stopPropagation()}>
                {items.map((item, i) => item.divider ? (
                  <div key={i} style={{ height: 1, background: BORDER, margin: '4px 8px' }} />
                ) : (
                  <button key={i} className="studio-menu-item" style={menuItemStyle}
                    onClick={() => { item.action?.(); setOpenMenu(null) }}>
                    <span>{item.label}</span>
                    {item.shortcut && <span style={{ color: TEXT3, fontSize: 10, marginLeft: 24 }}>{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Right side of menu bar */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, paddingRight: 10 }}>
          <span style={{ fontSize: 10, color: TEXT3, fontFamily: 'JetBrains Mono, monospace' }}>{zoom}%</span>
          <button onClick={zoomOut} style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 2 }}><ZoomOut size={12} /></button>
          <input type="range" min={10} max={500} value={zoom} onChange={e => {
            const z = Number(e.target.value) / 100
            fabricRef.current?.setZoom(z); fabricRef.current?.renderAll(); setZoom(Number(e.target.value))
          }} style={{ width: 80 }} />
          <button onClick={zoomIn} style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 2 }}><ZoomIn size={12} /></button>
        </div>
      </div>

      {/* ═══ OPTION BAR (context-sensitive) ══════════════════════════════════════ */}
      <div style={{ height: 32, background: BG2, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
        {/* Fill / Stroke */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={propLabel}>Fill</span>
          <input type="color" value={fillColor} onChange={e => { setFillColor(e.target.value); if (selectedObj) updateProp('fill', e.target.value) }}
            style={{ width: 22, height: 18, cursor: 'pointer', borderRadius: 2, border: `1px solid ${BORDER}` }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={propLabel}>Stroke</span>
          <input type="color" value={strokeColor} onChange={e => { setStrokeColor(e.target.value); if (selectedObj) updateProp('stroke', e.target.value) }}
            style={{ width: 22, height: 18, cursor: 'pointer', borderRadius: 2, border: `1px solid ${BORDER}` }} />
          <input type="number" value={strokeWidth} min={0} max={50}
            onChange={e => { setStrokeWidth(Number(e.target.value)); if (selectedObj) updateProp('strokeWidth', e.target.value) }}
            style={{ ...propInput, width: 36 }} />
        </div>
        <div style={{ width: 1, height: 16, background: BORDER }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={propLabel}>Opacity</span>
          <input type="range" min={0} max={100} value={opacity}
            onChange={e => { setOpacity(Number(e.target.value)); if (selectedObj) updateProp('opacity', e.target.value) }}
            style={{ width: 60 }} />
          <span style={{ fontSize: 10, color: TEXT3, fontFamily: 'JetBrains Mono, monospace', width: 28 }}>{opacity}%</span>
        </div>
        <div style={{ width: 1, height: 16, background: BORDER }} />

        {/* Text options (show when text tool or text selected) */}
        {(activeTool === 'text' || selectionProps?.type === 'i-text' || selectionProps?.type === 'text') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); if (selectedObj) updateProp('fontFamily', e.target.value) }}
              style={{ ...propInput, width: 120, fontSize: 10 }}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input type="number" value={fontSize} min={8} max={200}
              onChange={e => { setFontSize(Number(e.target.value)); if (selectedObj) updateProp('fontSize', e.target.value) }}
              style={{ ...propInput, width: 40 }} />
            <button onClick={() => { const v = !fontBold; setFontBold(v); if (selectedObj) updateProp('fontWeight', v ? 'bold' : 'normal') }}
              style={{ background: fontBold ? ACCENT : 'transparent', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '2px 5px', cursor: 'pointer', color: fontBold ? '#fff' : TEXT2 }}>
              <Bold size={12} />
            </button>
            <button onClick={() => { const v = !fontItalic; setFontItalic(v); if (selectedObj) updateProp('fontStyle', v ? 'italic' : 'normal') }}
              style={{ background: fontItalic ? ACCENT : 'transparent', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '2px 5px', cursor: 'pointer', color: fontItalic ? '#fff' : TEXT2 }}>
              <Italic size={12} />
            </button>
          </div>
        )}

        {/* Alignment buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          {[
            { icon: AlignStartVertical, dir: 'left', tip: 'Align Left' },
            { icon: AlignCenterVertical, dir: 'center-h', tip: 'Align Center H' },
            { icon: AlignEndVertical, dir: 'right', tip: 'Align Right' },
            { icon: AlignLeft, dir: 'top', tip: 'Align Top' },
            { icon: AlignCenter, dir: 'center-v', tip: 'Align Center V' },
            { icon: AlignRight, dir: 'bottom', tip: 'Align Bottom' },
          ].map(a => (
            <button key={a.dir} title={a.tip} onClick={() => alignObjects(a.dir)}
              style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 3, borderRadius: 3 }}>
              <a.icon size={13} />
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: BORDER, margin: '0 4px' }} />
          <button title="Flip H" onClick={flipH} style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 3 }}><FlipHorizontal size={13} /></button>
          <button title="Flip V" onClick={flipV} style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 3 }}><FlipVertical size={13} /></button>
        </div>
      </div>

      {/* ═══ MAIN AREA ══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT TOOLBAR ── */}
        {!panelsHidden && (
          <div style={{ width: 36, flexShrink: 0, background: BG2, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, gap: 1, overflowY: 'auto' }}>
            {TOOLS.map((t, i) => (
              <React.Fragment key={t.id}>
                {t.group === 'sep' && i > 0 && <div style={{ width: 20, height: 1, background: BORDER, margin: '3px 0' }} />}
                <button
                  className={`studio-tool-btn ${activeTool === t.id ? 'active' : ''}`}
                  title={`${t.label} (${t.shortcut})`}
                  onClick={() => setActiveTool(t.id)}
                  style={{
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: activeTool === t.id ? ACCENT : 'transparent',
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                    color: activeTool === t.id ? '#fff' : TEXT2,
                  }}
                >
                  <t.icon size={14} />
                </button>
              </React.Fragment>
            ))}

            <div style={{ width: 20, height: 1, background: BORDER, margin: '3px 0' }} />

            {/* Fill/Stroke color chips */}
            <div style={{ position: 'relative', width: 24, height: 24, margin: '2px 0' }}>
              <div title={`Fill: ${fillColor}`}
                style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 16, background: fillColor, border: `1.5px solid ${BORDER}`, borderRadius: 2, cursor: 'pointer', zIndex: 1 }}
                onClick={() => { const el = document.getElementById('fill-picker'); el?.click() }} />
              <div title={`Stroke: ${strokeColor}`}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, background: strokeColor, border: `1.5px solid ${BORDER}`, borderRadius: 2, cursor: 'pointer' }}
                onClick={() => { const el = document.getElementById('stroke-picker'); el?.click() }} />
              <input id="fill-picker" type="color" value={fillColor} onChange={e => setFillColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
              <input id="stroke-picker" type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </div>

            <button title="Swap Fill/Stroke (X)" onClick={() => { const f = fillColor; setFillColor(strokeColor); setStrokeColor(f) }}
              style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 2, fontSize: 9 }}>
              <SlidersHorizontal size={10} />
            </button>
          </div>
        )}

        {/* ── PRODUCT PANEL (collapsible left dock) ── */}
        {!panelsHidden && showProductPanel && (
          <div style={{ width: 240, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Mode tabs */}
            <div style={{ padding: '8px 8px 4px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', gap: 2, background: BG, borderRadius: 6, padding: 2 }}>
                {([
                  { id: 'vehicle' as const, icon: Car, label: 'Wrap' },
                  { id: 'sign' as const, icon: LayoutGrid, label: 'Sign' },
                  { id: 'apparel' as const, icon: Shirt, label: 'Apparel' },
                ]).map(m => (
                  <button key={m.id} onClick={() => setProductMode(m.id)}
                    style={{ flex: 1, padding: '5px 2px', borderRadius: 4, border: 'none', cursor: 'pointer', background: productMode === m.id ? ACCENT : 'transparent', color: productMode === m.id ? '#fff' : TEXT3, fontSize: 10, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <m.icon size={12} />{m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle inputs */}
            {productMode === 'vehicle' && (
              <div style={{ padding: '10px 10px' }}>
                <div style={sectionTitle}>Vehicle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 4, marginBottom: 6 }}>
                  <input style={propInput} placeholder="Year" value={year} onChange={e => setYear(e.target.value)} />
                  <input style={propInput} placeholder="Make" value={make} onChange={e => setMake(e.target.value)} />
                </div>
                <input style={{ ...propInput, marginBottom: 6 }} placeholder="Model" value={model} onChange={e => setModel(e.target.value)} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
                  {BODY_TYPES.map(b => (
                    <button key={b.id} onClick={() => setBodyType(b.id)}
                      style={{ padding: '3px 7px', borderRadius: 4, border: `1px solid ${bodyType === b.id ? ACCENT : BORDER}`, background: bodyType === b.id ? `${ACCENT}22` : 'transparent', color: bodyType === b.id ? ACCENT : TEXT2, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
                      {b.label}
                    </button>
                  ))}
                </div>
                {vehicleError && <div style={{ fontSize: 10, color: RED, marginBottom: 6 }}>{vehicleError}</div>}
                <button onClick={handleGenerateVehicle} disabled={generatingVehicle}
                  style={{ width: '100%', padding: '7px', borderRadius: 6, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: generatingVehicle ? 0.6 : 1 }}>
                  {generatingVehicle ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Rendering...</> : <><Sparkles size={12} /> Generate Vehicle</>}
                </button>
              </div>
            )}

            {/* Sign inputs */}
            {productMode === 'sign' && (
              <div style={{ padding: '10px 10px' }}>
                <div style={sectionTitle}>Sign Type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                  {SIGN_TYPES.map(st => (
                    <button key={st.id} onClick={() => { setSignTypeId(st.id); if (st.w > 0) { setSignW(st.w); setSignH(st.h) } }}
                      style={{ padding: '5px 8px', borderRadius: 4, border: `1px solid ${signTypeId === st.id ? ACCENT : BORDER}`, background: signTypeId === st.id ? `${ACCENT}22` : 'transparent', color: signTypeId === st.id ? ACCENT : TEXT2, fontSize: 10, cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
                      {st.label}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '6px 8px', borderRadius: 4, background: BG, fontSize: 10, color: TEXT2 }}>
                  {signW}&quot; x {signH}&quot; &middot; {(signW * 300).toLocaleString()} x {(signH * 300).toLocaleString()}px
                </div>
              </div>
            )}

            {/* Brand */}
            <div style={{ padding: '10px 10px', borderTop: `1px solid ${BORDER}` }}>
              <div style={sectionTitle}>Brand</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                <input style={{ ...propInput, flex: 1 }} placeholder="website.com" value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleScrape() }} />
                <button onClick={handleScrape} disabled={scraping || !websiteUrl.trim()}
                  style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${BORDER}`, background: ACCENT, color: '#fff', cursor: 'pointer' }}>
                  {scraping ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={11} />}
                </button>
              </div>

              {/* Logo */}
              <div onClick={() => logoInputRef.current?.click()}
                style={{ minHeight: 48, border: brandLogoPreview ? `1px solid ${BORDER}` : `1px dashed ${BORDER}`, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, position: 'relative', padding: 6, marginBottom: 6 }}>
                {brandLogoPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={brandLogoPreview} alt="logo" style={{ maxHeight: 36, maxWidth: '100%', objectFit: 'contain' }} />
                    <button onClick={e => { e.stopPropagation(); setBrandLogoUrl(null); setBrandLogoPreview(null) }}
                      style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: RED, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={8} style={{ color: '#fff' }} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: TEXT3 }}>{logoUploading ? 'Uploading...' : 'Upload Logo'}</span>
                )}
              </div>
              {brandLogoUrl && (
                <button onClick={() => addImage(brandLogoUrl)}
                  style={{ width: '100%', padding: '5px', borderRadius: 4, border: `1px solid ${BORDER}`, background: 'transparent', color: ACCENT, fontSize: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ImageIcon size={10} /> Place on Canvas
                </button>
              )}
            </div>

            {/* AI Finalize */}
            <div style={{ marginTop: 'auto', padding: '10px', borderTop: `1px solid ${BORDER}` }}>
              <button onClick={handleFinalize} disabled={finalizing}
                style={{ width: '100%', padding: '9px', borderRadius: 6, border: 'none', background: finalizing ? `${ACCENT}88` : `linear-gradient(135deg, ${ACCENT} 0%, #7c3aed 100%)`, color: '#fff', fontWeight: 800, fontSize: 12, cursor: finalizing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {finalizing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={14} /> Finalize with AI</>}
              </button>
              {finalError && <div style={{ fontSize: 10, color: RED, marginTop: 4 }}>{finalError}</div>}
              {finalUrl && (
                <div style={{ marginTop: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={finalUrl} alt="result" style={{ width: '100%', borderRadius: 6, border: `1px solid ${BORDER}` }} />
                  <a href={finalUrl} download style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4, padding: '5px', borderRadius: 4, background: GREEN, color: '#fff', fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>
                    <Download size={11} /> Download
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CANVAS AREA ── */}
        <div ref={canvasContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#1a1a2e' }}>
          {/* Grid overlay */}
          {showGrid && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
              backgroundImage: `linear-gradient(${BORDER}40 1px, transparent 1px), linear-gradient(90deg, ${BORDER}40 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
            }} />
          )}

          {/* Rulers */}
          {showRulers && !panelsHidden && (
            <>
              {/* Horizontal ruler */}
              <div style={{ position: 'absolute', top: 0, left: 20, right: 0, height: 20, background: BG2, borderBottom: `1px solid ${BORDER}`, zIndex: 2, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                {Array.from({ length: Math.ceil(canvasW / 100) + 1 }, (_, i) => (
                  <div key={i} style={{ position: 'absolute', left: i * 100, bottom: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 8, color: TEXT3, fontFamily: 'JetBrains Mono, monospace', paddingLeft: 2 }}>{i * 100}</span>
                    <div style={{ width: 1, height: 6, background: TEXT3 }} />
                  </div>
                ))}
              </div>
              {/* Vertical ruler */}
              <div style={{ position: 'absolute', top: 20, left: 0, bottom: 0, width: 20, background: BG2, borderRight: `1px solid ${BORDER}`, zIndex: 2, overflow: 'hidden' }}>
                {Array.from({ length: Math.ceil(canvasH / 100) + 1 }, (_, i) => (
                  <div key={i} style={{ position: 'absolute', top: i * 100, left: 0, width: '100%', display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 8, color: TEXT3, fontFamily: 'JetBrains Mono, monospace', writingMode: 'vertical-rl', transform: 'rotate(180deg)', paddingTop: 2 }}>{i * 100}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <canvas ref={canvasElRef} style={{ display: 'block', marginLeft: showRulers && !panelsHidden ? 20 : 0, marginTop: showRulers && !panelsHidden ? 20 : 0 }} />

          {/* Drag and drop overlay */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
            onDragOver={e => { e.preventDefault() }}
            onDrop={async e => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file?.type.startsWith('image/')) {
                const url = URL.createObjectURL(file)
                await addImage(url)
              }
            }} />
        </div>

        {/* ── RIGHT PANEL ── */}
        {!panelsHidden && showRightPanel && (
          <div style={{ width: 260, flexShrink: 0, background: SURFACE, borderLeft: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              {([
                { id: 'properties' as const, label: 'Properties' },
                { id: 'layers' as const, label: 'Layers' },
                { id: 'color' as const, label: 'Color' },
                { id: 'swatches' as const, label: 'Swatches' },
              ]).map(tab => (
                <button key={tab.id}
                  className={`studio-right-tab ${rightTab === tab.id ? 'active' : ''}`}
                  onClick={() => setRightTab(tab.id)}
                  style={{ flex: 1, padding: '6px 2px', border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: rightTab === tab.id ? ACCENT : 'transparent', color: rightTab === tab.id ? '#fff' : TEXT3 }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
              {/* ── Properties Panel ── */}
              {rightTab === 'properties' && (
                selectionProps ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={sectionTitle}>Transform</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div>
                        <span style={propLabel}>X</span>
                        <input type="number" value={selectionProps.left} onChange={e => updateProp('left', e.target.value)} style={propInput} />
                      </div>
                      <div>
                        <span style={propLabel}>Y</span>
                        <input type="number" value={selectionProps.top} onChange={e => updateProp('top', e.target.value)} style={propInput} />
                      </div>
                      <div>
                        <span style={propLabel}>W</span>
                        <input type="number" value={selectionProps.width} onChange={e => updateProp('width', e.target.value)} style={propInput} />
                      </div>
                      <div>
                        <span style={propLabel}>H</span>
                        <input type="number" value={selectionProps.height} onChange={e => updateProp('height', e.target.value)} style={propInput} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div>
                        <span style={propLabel}>Rotation</span>
                        <input type="number" value={selectionProps.angle} onChange={e => updateProp('angle', e.target.value)} style={propInput} />
                      </div>
                      <div>
                        <span style={propLabel}>Opacity</span>
                        <input type="number" value={selectionProps.opacity} min={0} max={100} onChange={e => updateProp('opacity', e.target.value)} style={propInput} />
                      </div>
                    </div>

                    <div style={sectionTitle}>Appearance</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div>
                        <span style={propLabel}>Fill</span>
                        <input type="color" value={typeof selectionProps.fill === 'string' ? selectionProps.fill : '#000000'} onChange={e => updateProp('fill', e.target.value)} style={{ width: '100%', height: 24, cursor: 'pointer', borderRadius: 3, border: `1px solid ${BORDER}` }} />
                      </div>
                      <div>
                        <span style={propLabel}>Stroke</span>
                        <input type="color" value={typeof selectionProps.stroke === 'string' && selectionProps.stroke !== 'none' ? selectionProps.stroke : '#000000'} onChange={e => updateProp('stroke', e.target.value)} style={{ width: '100%', height: 24, cursor: 'pointer', borderRadius: 3, border: `1px solid ${BORDER}` }} />
                      </div>
                    </div>
                    <div>
                      <span style={propLabel}>Stroke Width</span>
                      <input type="number" value={selectionProps.strokeWidth} min={0} onChange={e => updateProp('strokeWidth', e.target.value)} style={propInput} />
                    </div>

                    {/* Text props */}
                    {(selectionProps.type === 'i-text' || selectionProps.type === 'text') && (
                      <>
                        <div style={sectionTitle}>Character</div>
                        <select value={selectionProps.fontFamily || 'Impact'} onChange={e => updateProp('fontFamily', e.target.value)} style={{ ...propInput, marginBottom: 4 }}>
                          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <input type="number" value={selectionProps.fontSize || 48} min={8} max={300} onChange={e => updateProp('fontSize', e.target.value)} style={propInput} />
                      </>
                    )}

                    {/* Actions */}
                    <div style={sectionTitle}>Actions</div>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <button onClick={duplicateSelected} title="Duplicate" style={{ padding: '4px 8px', borderRadius: 3, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT2, cursor: 'pointer', fontSize: 10 }}><Copy size={11} /> Dup</button>
                      <button onClick={deleteSelected} title="Delete" style={{ padding: '4px 8px', borderRadius: 3, border: `1px solid ${BORDER}`, background: 'transparent', color: RED, cursor: 'pointer', fontSize: 10 }}><Trash2 size={11} /> Del</button>
                      <button onClick={bringToFront} title="To Front" style={{ padding: '4px 8px', borderRadius: 3, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT2, cursor: 'pointer', fontSize: 10 }}>Front</button>
                      <button onClick={sendToBack} title="To Back" style={{ padding: '4px 8px', borderRadius: 3, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT2, cursor: 'pointer', fontSize: 10 }}>Back</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 16, textAlign: 'center', color: TEXT3, fontSize: 11 }}>
                    Select an object to see its properties
                  </div>
                )
              )}

              {/* ── Layers Panel ── */}
              {rightTab === 'layers' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ ...sectionTitle, marginBottom: 0, padding: 0 }}>Layers ({layers.length})</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button title="Add Rectangle" onClick={() => addRect()} style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 2 }}><Plus size={12} /></button>
                      <button title="Delete Selected" onClick={deleteSelected} style={{ background: 'transparent', border: 'none', color: TEXT3, cursor: 'pointer', padding: 2 }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {layers.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: TEXT3, fontSize: 11 }}>
                      Canvas is empty
                    </div>
                  ) : (
                    layers.map((layer, idx) => (
                      <div key={layer.id} className="studio-layer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 4, cursor: 'pointer', background: 'transparent', marginBottom: 1 }}
                        onClick={() => {
                          const fc = fabricRef.current; if (!fc) return
                          const objs = fc.getObjects()
                          const objIdx = objs.length - 1 - idx
                          if (objs[objIdx]) { fc.setActiveObject(objs[objIdx]); fc.renderAll() }
                        }}>
                        <button onClick={e => {
                          e.stopPropagation()
                          const fc = fabricRef.current; if (!fc) return
                          const objs = fc.getObjects()
                          const objIdx = objs.length - 1 - idx
                          if (objs[objIdx]) { objs[objIdx].visible = !objs[objIdx].visible; fc.renderAll(); syncLayers() }
                        }} style={{ background: 'transparent', border: 'none', color: layer.visible ? TEXT2 : TEXT3, cursor: 'pointer', padding: 0 }}>
                          {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                        </button>
                        <button onClick={e => {
                          e.stopPropagation()
                          const fc = fabricRef.current; if (!fc) return
                          const objs = fc.getObjects()
                          const objIdx = objs.length - 1 - idx
                          if (objs[objIdx]) {
                            objs[objIdx].selectable = layer.locked
                            objs[objIdx].evented = layer.locked
                            fc.renderAll(); syncLayers()
                          }
                        }} style={{ background: 'transparent', border: 'none', color: layer.locked ? RED : TEXT3, cursor: 'pointer', padding: 0 }}>
                          {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                        </button>
                        <span style={{ fontSize: 10, color: TEXT1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {layer.name}
                        </span>
                        <span style={{ fontSize: 9, color: TEXT3, textTransform: 'capitalize' }}>{layer.type}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Color Panel ── */}
              {rightTab === 'color' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={sectionTitle}>Fill Color</div>
                  <input type="color" value={fillColor} onChange={e => { setFillColor(e.target.value); if (selectedObj) updateProp('fill', e.target.value) }}
                    style={{ width: '100%', height: 40, cursor: 'pointer', borderRadius: 4, border: `1px solid ${BORDER}` }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...propLabel, fontSize: 10 }}>HEX</span>
                    <input value={fillColor} onChange={e => setFillColor(e.target.value)}
                      style={{ ...propInput, flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                  </div>

                  <div style={sectionTitle}>Stroke Color</div>
                  <input type="color" value={strokeColor} onChange={e => { setStrokeColor(e.target.value); if (selectedObj) updateProp('stroke', e.target.value) }}
                    style={{ width: '100%', height: 40, cursor: 'pointer', borderRadius: 4, border: `1px solid ${BORDER}` }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...propLabel, fontSize: 10 }}>HEX</span>
                    <input value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
                      style={{ ...propInput, flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
                  </div>

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                    <button onClick={() => { const f = fillColor; setFillColor(strokeColor); setStrokeColor(f) }}
                      style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT2, cursor: 'pointer', fontSize: 10 }}>
                      Swap (X)
                    </button>
                    <button onClick={() => { setFillColor('#ffffff'); setStrokeColor('#000000') }}
                      style={{ padding: '4px 10px', borderRadius: 3, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT2, cursor: 'pointer', fontSize: 10 }}>
                      Default (D)
                    </button>
                  </div>
                </div>
              )}

              {/* ── Swatches Panel ── */}
              {rightTab === 'swatches' && (
                <div>
                  <div style={sectionTitle}>Color Swatches</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, marginBottom: 12 }}>
                    {SWATCH_COLORS.map(c => (
                      <button key={c} className="studio-swatch"
                        onClick={() => { setFillColor(c); if (selectedObj) updateProp('fill', c) }}
                        onContextMenu={e => { e.preventDefault(); setStrokeColor(c); if (selectedObj) updateProp('stroke', c) }}
                        title={`Left: fill / Right: stroke — ${c}`}
                        style={{ width: '100%', aspectRatio: '1', borderRadius: 3, background: c, border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'transform 0.1s' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: TEXT3, textAlign: 'center' }}>Left-click = Fill / Right-click = Stroke</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ STATUS BAR ═══════════════════════════════════════════════════════════ */}
      <div style={{ height: 22, background: BG2, borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: TEXT3, fontFamily: 'JetBrains Mono, monospace' }}>
          {TOOLS.find(t => t.id === activeTool)?.label || activeTool}
        </span>
        <span style={{ fontSize: 9, color: TEXT3, fontFamily: 'JetBrains Mono, monospace' }}>
          X: {cursorPos.x} Y: {cursorPos.y}
        </span>
        <span style={{ fontSize: 9, color: TEXT3, fontFamily: 'JetBrains Mono, monospace' }}>
          {canvasW} x {canvasH}px
        </span>
        <span style={{ fontSize: 9, color: TEXT3, fontFamily: 'JetBrains Mono, monospace' }}>
          {objectCount} objects
        </span>
        <span style={{ fontSize: 9, color: TEXT3, fontFamily: 'JetBrains Mono, monospace' }}>
          Zoom: {zoom}%
        </span>
        {selectionProps && (
          <span style={{ fontSize: 9, color: ACCENT, fontFamily: 'JetBrains Mono, monospace' }}>
            Sel: {selectionProps.width} x {selectionProps.height}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {showGrid && <span style={{ fontSize: 9, color: GREEN }}>GRID</span>}
          {snapToGrid && <span style={{ fontSize: 9, color: GREEN }}>SNAP</span>}
          <span style={{ fontSize: 9, color: TEXT3, fontFamily: 'JetBrains Mono, monospace' }}>
            Undo: {undoCount - 1} | Redo: {redoCount}
          </span>
        </div>
      </div>
    </div>
  )
}
