'use client'

import {
  MousePointer2, Pencil, Type, Square, Circle, ArrowRight,
  RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Droplet, Crop, Eraser,
} from 'lucide-react'

export type ToolMode = 'select' | 'brush' | 'text' | 'rect' | 'circle' | 'arrow' | 'crop'

interface EditorToolbarProps {
  activeTool: ToolMode
  onToolChange: (tool: ToolMode) => void
  brushColor: string
  onBrushColorChange: (color: string) => void
  brushWidth: number
  onBrushWidthChange: (w: number) => void
  onRotate: (deg: number) => void
  onFlip: (axis: 'h' | 'v') => void
  onFilter: (filter: string) => void
}

const TOOLS: { key: ToolMode; label: string; Icon: typeof MousePointer2; shortcut: string }[] = [
  { key: 'select', label: 'Select', Icon: MousePointer2, shortcut: 'V' },
  { key: 'brush', label: 'Brush', Icon: Pencil, shortcut: 'B' },
  { key: 'arrow', label: 'Arrow', Icon: ArrowRight, shortcut: 'A' },
  { key: 'rect', label: 'Rectangle', Icon: Square, shortcut: 'R' },
  { key: 'circle', label: 'Circle', Icon: Circle, shortcut: 'C' },
  { key: 'text', label: 'Text', Icon: Type, shortcut: 'T' },
  { key: 'crop', label: 'Crop', Icon: Crop, shortcut: 'X' },
]

const PRESET_COLORS = [
  '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff',
  '#5856d6', '#af52de', '#ffffff', '#000000',
]

export default function EditorToolbar({
  activeTool,
  onToolChange,
  brushColor,
  onBrushColorChange,
  brushWidth,
  onBrushWidthChange,
  onRotate,
  onFlip,
  onFilter,
}: EditorToolbarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 56,
        bottom: 48,
        width: 56,
        background: '#0d0f14',
        borderRight: '1px solid #1e2d4a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        gap: 2,
        overflowY: 'auto',
        zIndex: 10,
      }}
    >
      {/* Drawing tools */}
      {TOOLS.map((t) => (
        <button
          key={t.key}
          title={`${t.label} (${t.shortcut})`}
          onClick={() => onToolChange(t.key)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: activeTool === t.key ? 'rgba(79,127,255,0.2)' : 'transparent',
            color: activeTool === t.key ? '#4f7fff' : '#9299b5',
            transition: 'all 0.15s',
          }}
        >
          <t.Icon size={18} />
        </button>
      ))}

      <div style={{ width: 32, height: 1, background: '#1e2d4a', margin: '4px 0' }} />

      {/* Transform tools */}
      <button title="Rotate CW" onClick={() => onRotate(90)} style={iconBtnStyle}>
        <RotateCw size={16} />
      </button>
      <button title="Rotate CCW" onClick={() => onRotate(-90)} style={iconBtnStyle}>
        <RotateCcw size={16} />
      </button>
      <button title="Flip H" onClick={() => onFlip('h')} style={iconBtnStyle}>
        <FlipHorizontal size={16} />
      </button>
      <button title="Flip V" onClick={() => onFlip('v')} style={iconBtnStyle}>
        <FlipVertical size={16} />
      </button>

      <div style={{ width: 32, height: 1, background: '#1e2d4a', margin: '4px 0' }} />

      {/* Filters */}
      <button title="Brightness" onClick={() => onFilter('brightness')} style={iconBtnStyle}>
        <Sun size={16} />
      </button>
      <button title="Contrast" onClick={() => onFilter('contrast')} style={iconBtnStyle}>
        <Contrast size={16} />
      </button>
      <button title="Grayscale" onClick={() => onFilter('grayscale')} style={iconBtnStyle}>
        <Eraser size={16} />
      </button>

      <div style={{ width: 32, height: 1, background: '#1e2d4a', margin: '4px 0' }} />

      {/* Color picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', padding: '4px 0' }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onBrushColorChange(c)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: brushColor === c ? '2px solid #4f7fff' : '1px solid #2a3f6a',
              background: c,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
        ))}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => onBrushColorChange(e.target.value)}
          title="Custom color"
          style={{
            width: 24,
            height: 24,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        />
      </div>

      <div style={{ width: 32, height: 1, background: '#1e2d4a', margin: '4px 0' }} />

      {/* Stroke width */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
        <Droplet size={12} style={{ color: '#5a6080' }} />
        <input
          type="range"
          min={1}
          max={20}
          value={brushWidth}
          onChange={(e) => onBrushWidthChange(Number(e.target.value))}
          title={`Width: ${brushWidth}px`}
          style={{
            width: 40,
            writingMode: 'vertical-lr',
            direction: 'rtl',
            appearance: 'slider-vertical' as any,
            height: 60,
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: 10, color: '#5a6080', fontFamily: 'JetBrains Mono, monospace' }}>
          {brushWidth}
        </span>
      </div>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  color: '#9299b5',
  transition: 'all 0.15s',
}
