'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Camera,
  Trash2,
  GripVertical,
  Package,
  FileText,
} from 'lucide-react'

interface LineItemEnhancedProps {
  item: any
  index: number
  onUpdate: (index: number, updates: any) => void
  onDelete: (index: number) => void
  allItems: any[]
}

export default function LineItemEnhanced({
  item,
  index,
  onUpdate,
  onDelete,
  allItems,
}: LineItemEnhancedProps) {
  const [collapsed, setCollapsed] = useState(item.collapsed !== false)
  const [showPhotoInspection, setShowPhotoInspection] = useState(false)

  const handleToggleCollapsed = () => {
    setCollapsed(!collapsed)
    onUpdate(index, { collapsed: !collapsed })
  }

  const handleRollupToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(index, { rollupTo: e.target.checked ? (item.rollupTo || null) : null })
  }

  const handleMaterialTrackingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(index, { trackMaterials: e.target.checked })
  }

  // Get parent items (for rollup dropdown)
  const parentItems = allItems
    .map((itm, idx) => ({ ...itm, index: idx }))
    .filter((itm) => itm.index !== index && !itm.rollupTo)

  return (
    <div className="card p-4 mb-3">
      {/* Collapsed View */}
      {collapsed && (
        <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={handleToggleCollapsed}>
          <div className="flex items-center gap-3 flex-1">
            <ChevronRight size={16} className="text-text3 shrink-0" />
            <GripVertical size={16} className="text-text3 shrink-0 cursor-grab" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-700 text-text1 mb-0.5">{item.product || 'Line Item'}</div>
              {item.vehicle && <div className="text-xs text-text3">{item.vehicle}</div>}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-xs text-text3">Qty: {item.qty || 1}</div>
            <div className="text-sm font-700 text-text1">
              ${((item.total || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(index)
              }}
              className="p-1.5 hover:bg-red/10 rounded text-red"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {!collapsed && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={handleToggleCollapsed} className="p-1 hover:bg-surface2 rounded">
                <ChevronDown size={16} />
              </button>
              <GripVertical size={16} className="text-text3 cursor-grab" />
              <span className="text-sm font-700 text-text2">Line Item {index + 1}</span>
            </div>
            <button onClick={() => onDelete(index)} className="btn-secondary text-sm text-red">
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          {/* Main Calculator Area */}
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Product</label>
              <input
                type="text"
                value={item.product || ''}
                onChange={(e) => onUpdate(index, { product: e.target.value })}
                className="field w-full"
                placeholder="Product name"
              />
            </div>

            {/* Vehicle / Description */}
            <div>
              <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Vehicle / Description</label>
              <input
                type="text"
                value={item.vehicle || ''}
                onChange={(e) => onUpdate(index, { vehicle: e.target.value })}
                className="field w-full"
                placeholder="e.g., 2023 Ford F-150, Blue"
              />
            </div>

            {/* Qty & Price */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Qty</label>
                <input
                  type="number"
                  value={item.qty || 1}
                  onChange={(e) => {
                    const qty = parseFloat(e.target.value) || 1
                    onUpdate(index, { qty, total: qty * (item.price || 0) })
                  }}
                  className="field w-full"
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Unit Price</label>
                <input
                  type="number"
                  value={item.price || 0}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0
                    onUpdate(index, { price, total: (item.qty || 1) * price })
                  }}
                  className="field w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Total</label>
                <input
                  type="number"
                  value={item.total || 0}
                  readOnly
                  className="field w-full bg-surface2"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Notes</label>
              <textarea
                value={item.notes || ''}
                onChange={(e) => onUpdate(index, { notes: e.target.value })}
                className="field w-full"
                rows={2}
                placeholder="Internal notes"
              />
            </div>

            {/* Advanced Options */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-xs font-700 text-text2 uppercase">Advanced Options</h4>

              {/* Rollup to Parent */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!item.rollupTo}
                  onChange={handleRollupToggle}
                  className="w-4 h-4"
                />
                <span className="text-sm text-text1">Roll up into parent line item</span>
              </label>

              {item.rollupTo !== undefined && item.rollupTo !== null && (
                <div className="ml-6">
                  <label className="block text-xs font-700 text-text2 mb-1.5 uppercase">Parent Line Item</label>
                  <select
                    value={item.rollupTo || ''}
                    onChange={(e) => onUpdate(index, { rollupTo: parseInt(e.target.value) })}
                    className="field w-full"
                  >
                    <option value="">Select parent...</option>
                    {parentItems.map((parent) => (
                      <option key={parent.index} value={parent.index}>
                        Line {parent.index + 1}: {parent.product || 'Untitled'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Material Tracking */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!item.trackMaterials}
                  onChange={handleMaterialTrackingToggle}
                  className="w-4 h-4"
                />
                <span className="text-sm text-text1">Track actual material usage</span>
              </label>

              {item.trackMaterials && (
                <div className="ml-6 space-y-2">
                  <div className="text-xs text-text3">
                    Quoted: {item.sqft || 0} sqft • {item.rolls || 0} rolls
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-text3 mb-1">Actual Sqft</label>
                      <input
                        type="number"
                        value={item.actualSqft || 0}
                        onChange={(e) => onUpdate(index, { actualSqft: parseFloat(e.target.value) || 0 })}
                        className="field w-full text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text3 mb-1">Actual Rolls</label>
                      <input
                        type="number"
                        value={item.actualRolls || 0}
                        onChange={(e) => onUpdate(index, { actualRolls: parseFloat(e.target.value) || 0 })}
                        className="field w-full text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Inspection */}
              <button
                onClick={() => setShowPhotoInspection(!showPhotoInspection)}
                className="btn-secondary text-sm w-full"
              >
                <Camera size={14} />
                {showPhotoInspection ? 'Hide' : 'Show'} Photo Inspection
              </button>

              {showPhotoInspection && (
                <div className="ml-6 p-3 bg-surface2 rounded-lg">
                  <div className="text-xs text-text3 mb-2">Upload vehicle photos and mark up issues</div>
                  <input type="file" multiple accept="image/*" className="text-xs" />
                  <div className="mt-2 text-xs text-text3">
                    Feature: Canvas markup with annotations (Cannot Wrap, Prep Required, Damage, Note, Good)
                  </div>
                </div>
              )}

              {/* Design Link */}
              <button className="btn-secondary text-sm w-full">
                <LinkIcon size={14} />
                Link Design Project
              </button>

              {/* Media Gallery Link */}
              <button className="btn-secondary text-sm w-full">
                <ImageIcon size={14} />
                Add Reference Photos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
