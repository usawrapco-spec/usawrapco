'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, Undo2, Redo2, Copy } from 'lucide-react'
import { usePhotoEditor } from './PhotoEditorProvider'
import EditorToolbar, { type ToolMode } from './EditorToolbar'
import EditorSaveMenu from './EditorSaveMenu'

export default function PhotoCanvasEditor() {
  const { currentImage, closeEditor, openCopyTo } = usePhotoEditor()
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeTool, setActiveTool] = useState<ToolMode>('select')
  const [brushColor, setBrushColor] = useState('#ff3b30')
  const [brushWidth, setBrushWidth] = useState(4)
  const [zoom, setZoom] = useState(1)
  const [ready, setReady] = useState(false)

  // Undo/redo history
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const isRestoringRef = useRef(false)

  // ── Initialize Fabric.js canvas ──
  useEffect(() => {
    if (!canvasElRef.current || !currentImage) return
    let mounted = true

    const init = async () => {
      try {
        const fabricModule = await import('fabric')
        if (!mounted || !canvasElRef.current) return

        const container = containerRef.current
        const w = container ? container.clientWidth : 1200
        const h = container ? container.clientHeight : 800

        const fc = new (fabricModule as any).Canvas(canvasElRef.current, {
          width: w,
          height: h,
          backgroundColor: '#1a1d27',
          selection: true,
          preserveObjectStacking: true,
        })
        fabricRef.current = fc

        // Load background image
        const imgEl = new Image()
        imgEl.crossOrigin = 'anonymous'
        imgEl.onload = () => {
          if (!mounted || !fabricRef.current) return
          const fabricImg = new (fabricModule as any).Image(imgEl)

          // Scale to fit canvas
          const scale = Math.min(
            (w * 0.85) / (imgEl.width || 1),
            (h * 0.85) / (imgEl.height || 1),
            1
          )
          fabricImg.set({
            scaleX: scale,
            scaleY: scale,
            left: (w - imgEl.width * scale) / 2,
            top: (h - imgEl.height * scale) / 2,
            selectable: false,
            evented: false,
            erasable: false,
          })

          fc.add(fabricImg)
          fc.sendObjectToBack(fabricImg)
          fc.renderAll()
          saveHistory()
          setReady(true)
        }
        imgEl.onerror = () => {
          if (mounted) setReady(true)
        }
        imgEl.src = currentImage.url

        // Track modifications for undo
        fc.on('object:added', () => { if (mounted && !isRestoringRef.current) saveHistory() })
        fc.on('object:modified', () => { if (mounted && !isRestoringRef.current) saveHistory() })
        fc.on('object:removed', () => { if (mounted && !isRestoringRef.current) saveHistory() })
      } catch (err) {
        console.error('Canvas init error:', err)
        if (mounted) setReady(true)
      }
    }

    init()

    return () => {
      mounted = false
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    }
  }, [currentImage])

  // ── Handle window resize ──
  useEffect(() => {
    const handleResize = () => {
      const fc = fabricRef.current
      const container = containerRef.current
      if (!fc || !container) return
      fc.setDimensions({ width: container.clientWidth, height: container.clientHeight })
      fc.renderAll()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── History helpers ──
  function saveHistory() {
    const fc = fabricRef.current
    if (!fc) return
    const json = JSON.stringify(fc.toJSON())
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(json)
    if (historyRef.current.length > 50) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length - 1
  }

  const undo = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || historyIndexRef.current <= 0) return
    isRestoringRef.current = true
    historyIndexRef.current--
    fc.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current]), () => {
      fc.renderAll()
      isRestoringRef.current = false
    })
  }, [])

  const redo = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || historyIndexRef.current >= historyRef.current.length - 1) return
    isRestoringRef.current = true
    historyIndexRef.current++
    fc.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current]), () => {
      fc.renderAll()
      isRestoringRef.current = false
    })
  }, [])

  // ── Tool switching ──
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    // Reset drawing mode
    fc.isDrawingMode = false
    fc.selection = true
    fc.defaultCursor = 'default'

    if (activeTool === 'brush') {
      fc.isDrawingMode = true
      if (fc.freeDrawingBrush) {
        fc.freeDrawingBrush.color = brushColor
        fc.freeDrawingBrush.width = brushWidth
      }
    } else if (activeTool === 'select') {
      fc.selection = true
    } else if (activeTool === 'crop') {
      fc.selection = false
      fc.defaultCursor = 'crosshair'
    } else {
      fc.selection = false
      fc.defaultCursor = 'crosshair'
    }
  }, [activeTool, brushColor, brushWidth])

  // ── Shape drawing on mouse events ──
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    if (!['rect', 'circle', 'arrow', 'crop'].includes(activeTool)) return

    let isDrawing = false
    let startX = 0
    let startY = 0
    let shapeObj: any = null

    const onMouseDown = (opt: any) => {
      const pointer = fc.getPointer(opt.e)
      isDrawing = true
      startX = pointer.x
      startY = pointer.y

      import('fabric').then((fabricModule) => {
        if (activeTool === 'rect' || activeTool === 'crop') {
          shapeObj = new (fabricModule as any).Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: activeTool === 'crop' ? 'rgba(79,127,255,0.15)' : 'transparent',
            stroke: activeTool === 'crop' ? '#4f7fff' : brushColor,
            strokeWidth: activeTool === 'crop' ? 2 : brushWidth,
            strokeDashArray: activeTool === 'crop' ? [6, 4] : undefined,
            selectable: activeTool !== 'crop',
          })
          fc.add(shapeObj)
        } else if (activeTool === 'circle') {
          shapeObj = new (fabricModule as any).Ellipse({
            left: startX,
            top: startY,
            rx: 0,
            ry: 0,
            fill: 'transparent',
            stroke: brushColor,
            strokeWidth: brushWidth,
            selectable: true,
          })
          fc.add(shapeObj)
        } else if (activeTool === 'arrow') {
          shapeObj = new (fabricModule as any).Line([startX, startY, startX, startY], {
            stroke: brushColor,
            strokeWidth: brushWidth,
            selectable: true,
          })
          fc.add(shapeObj)
        }
      })
    }

    const onMouseMove = (opt: any) => {
      if (!isDrawing || !shapeObj) return
      const pointer = fc.getPointer(opt.e)

      if (activeTool === 'rect' || activeTool === 'crop') {
        const w = pointer.x - startX
        const h = pointer.y - startY
        shapeObj.set({
          width: Math.abs(w),
          height: Math.abs(h),
          left: w < 0 ? pointer.x : startX,
          top: h < 0 ? pointer.y : startY,
        })
      } else if (activeTool === 'circle') {
        shapeObj.set({
          rx: Math.abs(pointer.x - startX) / 2,
          ry: Math.abs(pointer.y - startY) / 2,
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
        })
      } else if (activeTool === 'arrow') {
        shapeObj.set({ x2: pointer.x, y2: pointer.y })
      }
      fc.renderAll()
    }

    const onMouseUp = () => {
      if (!isDrawing) return
      isDrawing = false

      if (activeTool === 'crop' && shapeObj) {
        applyCrop(shapeObj)
      }
      shapeObj = null
    }

    fc.on('mouse:down', onMouseDown)
    fc.on('mouse:move', onMouseMove)
    fc.on('mouse:up', onMouseUp)

    return () => {
      fc.off('mouse:down', onMouseDown)
      fc.off('mouse:move', onMouseMove)
      fc.off('mouse:up', onMouseUp)
    }
  }, [activeTool, brushColor, brushWidth])

  // ── Crop apply ──
  async function applyCrop(cropRect: any) {
    const fc = fabricRef.current
    if (!fc) return

    const left = cropRect.left
    const top = cropRect.top
    const width = cropRect.width * cropRect.scaleX
    const height = cropRect.height * cropRect.scaleY

    if (width < 10 || height < 10) {
      fc.remove(cropRect)
      fc.renderAll()
      return
    }

    // Remove crop rect before exporting
    fc.remove(cropRect)
    fc.renderAll()

    // Export cropped area
    const dataUrl = fc.toDataURL({
      left,
      top,
      width,
      height,
      format: 'png',
      multiplier: 1,
    })

    // Reload as new background
    const fabricModule = await import('fabric')
    const imgEl = new Image()
    imgEl.crossOrigin = 'anonymous'
    imgEl.onload = () => {
      fc.clear()
      fc.setDimensions({ width, height })
      const fabricImg = new (fabricModule as any).Image(imgEl)
      fabricImg.set({ left: 0, top: 0, selectable: false, evented: false })
      fc.add(fabricImg)
      fc.sendObjectToBack(fabricImg)
      fc.renderAll()
      saveHistory()
    }
    imgEl.src = dataUrl
    setActiveTool('select')
  }

  // ── Transform handlers ──
  const handleRotate = useCallback((deg: number) => {
    const fc = fabricRef.current
    if (!fc) return
    const objs = fc.getObjects()
    if (!objs.length) return
    // Rotate the background image
    const bg = objs[0]
    bg.rotate((bg.angle || 0) + deg)
    bg.setCoords()
    fc.renderAll()
    saveHistory()
  }, [])

  const handleFlip = useCallback((axis: 'h' | 'v') => {
    const fc = fabricRef.current
    if (!fc) return
    const objs = fc.getObjects()
    if (!objs.length) return
    const bg = objs[0]
    if (axis === 'h') bg.set('flipX', !bg.flipX)
    else bg.set('flipY', !bg.flipY)
    fc.renderAll()
    saveHistory()
  }, [])

  // ── Filter handler ──
  const handleFilter = useCallback(async (filter: string) => {
    const fc = fabricRef.current
    if (!fc) return
    const fabricModule = await import('fabric')
    const objs = fc.getObjects()
    if (!objs.length) return
    const bg = objs[0]
    if (!bg.filters) bg.filters = []

    if (filter === 'grayscale') {
      bg.filters.push(new (fabricModule as any).filters.Grayscale())
    } else if (filter === 'brightness') {
      bg.filters.push(new (fabricModule as any).filters.Brightness({ brightness: 0.12 }))
    } else if (filter === 'contrast') {
      bg.filters.push(new (fabricModule as any).filters.Contrast({ contrast: 0.15 }))
    }

    bg.applyFilters()
    fc.renderAll()
    saveHistory()
  }, [])

  // ── Add text ──
  const handleToolChange = useCallback(async (tool: ToolMode) => {
    setActiveTool(tool)
    if (tool === 'text') {
      const fc = fabricRef.current
      if (!fc) return
      const fabricModule = await import('fabric')
      const text = new (fabricModule as any).IText('Text', {
        left: fc.width / 2 - 50,
        top: fc.height / 2 - 20,
        fontSize: 32,
        fill: brushColor,
        fontFamily: 'Barlow Condensed, sans-serif',
        fontWeight: '700',
      })
      fc.add(text)
      fc.setActiveObject(text)
      text.enterEditing()
      fc.renderAll()
      setActiveTool('select')
    }
  }, [brushColor])

  // ── Zoom ──
  const handleZoom = useCallback((delta: number) => {
    const fc = fabricRef.current
    if (!fc) return
    const newZoom = Math.max(0.25, Math.min(4, zoom + delta))
    setZoom(newZoom)
    fc.setZoom(newZoom)
    fc.renderAll()
  }, [zoom])

  // ── Canvas export for save ──
  const getCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    const fc = fabricRef.current
    if (!fc) return null
    return new Promise((resolve) => {
      const dataUrl = fc.toDataURL({ format: 'png', multiplier: 2 })
      fetch(dataUrl)
        .then((r) => r.blob())
        .then(resolve)
        .catch(() => resolve(null))
    })
  }, [])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture if typing in input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        closeEditor()
        return
      }
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        redo()
        return
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        return
      }
      if (e.key === 'v' || e.key === 'V') setActiveTool('select')
      if (e.key === 'b' || e.key === 'B') setActiveTool('brush')
      if (e.key === 't' || e.key === 'T') handleToolChange('text')
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const fc = fabricRef.current
        if (!fc) return
        const active = fc.getActiveObject()
        if (active && active.selectable) {
          fc.remove(active)
          fc.renderAll()
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeEditor, undo, redo, handleToolChange])

  if (!currentImage) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: '#0d0f14',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid #1e2d4a',
          background: '#13151c',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#e8eaed',
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentImage.fileName}
          </span>
          <span style={{ fontSize: 11, color: '#5a6080' }}>
            {currentImage.category && `(${currentImage.category})`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EditorSaveMenu
            image={currentImage}
            getCanvasBlob={getCanvasBlob}
            onSaved={() => {}}
          />
          <button
            onClick={() => {
              closeEditor()
              openCopyTo(currentImage)
            }}
            title="Copy To..."
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid #1e2d4a',
              background: 'transparent',
              color: '#22d3ee',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Copy size={14} /> Copy To
          </button>
          <button
            onClick={closeEditor}
            title="Close (Esc)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #1e2d4a',
              background: 'transparent',
              color: '#9299b5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Left toolbar ── */}
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        brushColor={brushColor}
        onBrushColorChange={setBrushColor}
        brushWidth={brushWidth}
        onBrushWidthChange={setBrushWidth}
        onRotate={handleRotate}
        onFlip={handleFlip}
        onFilter={handleFilter}
      />

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          marginLeft: 56,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {!ready && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5a6080',
              fontSize: 14,
              zIndex: 5,
            }}
          >
            Loading image...
          </div>
        )}
        <canvas ref={canvasElRef} />
      </div>

      {/* ── Bottom bar ── */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          borderTop: '1px solid #1e2d4a',
          background: '#13151c',
          flexShrink: 0,
        }}
      >
        <button onClick={() => handleZoom(-0.1)} title="Zoom Out" style={bottomBtnStyle}>
          <ZoomOut size={16} />
        </button>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#9299b5',
            fontFamily: 'JetBrains Mono, monospace',
            minWidth: 48,
            textAlign: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => handleZoom(0.1)} title="Zoom In" style={bottomBtnStyle}>
          <ZoomIn size={16} />
        </button>

        <div style={{ width: 1, height: 24, background: '#1e2d4a', margin: '0 8px' }} />

        <button onClick={undo} title="Undo (Ctrl+Z)" style={bottomBtnStyle}>
          <Undo2 size={16} />
        </button>
        <button onClick={redo} title="Redo (Ctrl+Shift+Z)" style={bottomBtnStyle}>
          <Redo2 size={16} />
        </button>
      </div>
    </div>
  )
}

const bottomBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: '1px solid #1e2d4a',
  background: 'transparent',
  color: '#9299b5',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
