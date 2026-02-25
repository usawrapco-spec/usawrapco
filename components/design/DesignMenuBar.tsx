'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Save, Image as ImageIcon, FileText, Send, Undo2, Redo2, Trash2, Copy,
  ZoomIn, ZoomOut, Maximize2, Grid3x3, ChevronUp, ChevronDown, Lock, Unlock,
  Group, Ungroup, Download, Upload, Box, Layers, FileCode,
} from 'lucide-react'
import type { CanvasMode } from './design-types'

interface MenuAction {
  label: string
  icon: any
  shortcut?: string
  onClick: () => void
  separator?: boolean
}

interface DesignMenuBarProps {
  canvasMode: CanvasMode
  onModeChange: (mode: CanvasMode) => void
  onSave: () => void
  onExportPNG: () => void
  onExportSVG: () => void
  onExportPrint: () => void
  onPrintLayout: () => void
  onImportImage: () => void
  onImportFile3D: () => void
  onSendToCustomer: () => void
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onDuplicate: () => void
  onSelectAll: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onToggleGrid: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}

function MenuDropdown({ label, items }: { label: string; items: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          padding: '4px 10px', background: open ? 'rgba(79,127,255,0.12)' : 'transparent',
          border: 'none', borderRadius: 6, color: open ? '#4f7fff' : '#9299b5',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.03em',
        }}
      >
        {label}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 2,
          background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)', zIndex: 3000, minWidth: 220,
          padding: '4px 0',
        }}>
          {items.map((item, i) => (
            <div key={i}>
              {item.separator && i > 0 && (
                <div style={{ height: 1, background: '#1a1d27', margin: '4px 0' }} />
              )}
              <button
                onClick={() => { item.onClick(); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 14px', background: 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  color: '#9299b5', fontSize: 12,
                  transition: 'background 0.1s, color 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(79,127,255,0.08)'
                  e.currentTarget.style.color = '#e8eaed'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#9299b5'
                }}
              >
                <item.icon size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#5a6080' }}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DesignMenuBar({
  canvasMode, onModeChange,
  onSave, onExportPNG, onExportSVG, onExportPrint, onPrintLayout, onImportImage, onImportFile3D, onSendToCustomer,
  onUndo, onRedo, onDelete, onDuplicate, onSelectAll,
  onZoomIn, onZoomOut, onZoomFit, onToggleGrid,
  onBringForward, onSendBackward, onBringToFront, onSendToBack,
}: DesignMenuBarProps) {
  const fileMenuItems: MenuAction[] = [
    { label: 'Save', icon: Save, shortcut: 'Ctrl+S', onClick: onSave },
    { label: 'Export PNG', icon: Download, shortcut: 'Ctrl+Shift+P', onClick: onExportPNG, separator: true },
    { label: 'Export SVG', icon: FileCode, onClick: onExportSVG },
    { label: 'Export Print-Ready', icon: FileText, onClick: onExportPrint },
    { label: 'Print Layout', icon: FileText, onClick: onPrintLayout, separator: true },
    { label: 'Import Image', icon: ImageIcon, onClick: onImportImage, separator: true },
    { label: 'Import 3D File (.PLY / .OBJ)', icon: Box, onClick: onImportFile3D, separator: true },
    { label: 'Send to Customer', icon: Send, onClick: onSendToCustomer },
  ]

  const editMenuItems: MenuAction[] = [
    { label: 'Undo', icon: Undo2, shortcut: 'Ctrl+Z', onClick: onUndo },
    { label: 'Redo', icon: Redo2, shortcut: 'Ctrl+Y', onClick: onRedo, separator: false },
    { label: 'Delete', icon: Trash2, shortcut: 'Del', onClick: onDelete, separator: true },
    { label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', onClick: onDuplicate },
    { label: 'Select All', icon: Layers, shortcut: 'Ctrl+A', onClick: onSelectAll },
  ]

  const viewMenuItems: MenuAction[] = [
    { label: 'Zoom In', icon: ZoomIn, shortcut: 'Ctrl++', onClick: onZoomIn },
    { label: 'Zoom Out', icon: ZoomOut, shortcut: 'Ctrl+-', onClick: onZoomOut },
    { label: 'Zoom to Fit', icon: Maximize2, shortcut: 'Ctrl+0', onClick: onZoomFit, separator: true },
    { label: 'Toggle Grid', icon: Grid3x3, onClick: onToggleGrid },
  ]

  const objectMenuItems: MenuAction[] = [
    { label: 'Bring Forward', icon: ChevronUp, onClick: onBringForward },
    { label: 'Send Backward', icon: ChevronDown, onClick: onSendBackward },
    { label: 'Bring to Front', icon: ChevronUp, onClick: onBringToFront, separator: true },
    { label: 'Send to Back', icon: ChevronDown, onClick: onSendToBack, separator: false },
    { label: 'Lock / Unlock', icon: Lock, onClick: () => {}, separator: true },
    { label: 'Group', icon: Group, shortcut: 'Ctrl+G', onClick: () => {} },
    { label: 'Ungroup', icon: Ungroup, shortcut: 'Ctrl+Shift+G', onClick: () => {} },
  ]

  const MODES: { id: CanvasMode; label: string; icon: any }[] = [
    { id: '2d', label: '2D Canvas', icon: Layers },
    { id: '3d-configurator', label: '3D Wrap', icon: Box },
    { id: '3d-viewer', label: '3D Viewer', icon: Upload },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '4px 12px', background: '#0d0f14',
      borderBottom: '1px solid #1a1d27', flexShrink: 0, flexWrap: 'wrap',
    }}>
      {/* Menus */}
      <MenuDropdown label="File" items={fileMenuItems} />
      <MenuDropdown label="Edit" items={editMenuItems} />
      <MenuDropdown label="View" items={viewMenuItems} />
      <MenuDropdown label="Object" items={objectMenuItems} />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Mode switcher */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#13151c', borderRadius: 8, border: '1px solid #1a1d27',
        padding: 2, gap: 2,
      }}>
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: canvasMode === mode.id ? '#4f7fff' : 'transparent',
              color: canvasMode === mode.id ? '#fff' : '#5a6080',
              fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
              fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            <mode.icon size={12} />
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  )
}
