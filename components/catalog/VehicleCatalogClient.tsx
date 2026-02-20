'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Profile } from '@/types'
import { Car, Plus, X, Search, Edit2, Trash2, ArrowUpDown } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface VehicleEntry {
  id: string
  vehicleType: string
  year: string
  make: string
  model: string
  sqft: number
  fullWrapPrice: number
  partialPrice: number
  isDefault: boolean
}

// ─── Default catalog ─────────────────────────────────────────────────────────

const DEFAULT_VEHICLES: VehicleEntry[] = [
  { id: 'def-1', vehicleType: 'Sedan',         year: '', make: '', model: '', sqft: 350, fullWrapPrice: 2500, partialPrice: 1500, isDefault: true },
  { id: 'def-2', vehicleType: 'SUV',            year: '', make: '', model: '', sqft: 400, fullWrapPrice: 3000, partialPrice: 1800, isDefault: true },
  { id: 'def-3', vehicleType: 'Truck',          year: '', make: '', model: '', sqft: 375, fullWrapPrice: 2800, partialPrice: 1700, isDefault: true },
  { id: 'def-4', vehicleType: 'Van / Sprinter', year: '', make: '', model: '', sqft: 500, fullWrapPrice: 4000, partialPrice: 2400, isDefault: true },
  { id: 'def-5', vehicleType: 'Box Truck',      year: '', make: '', model: '', sqft: 600, fullWrapPrice: 5500, partialPrice: 3300, isDefault: true },
  { id: 'def-6', vehicleType: 'Trailer',        year: '', make: '', model: '', sqft: 0,   fullWrapPrice: 3500, partialPrice: 2000, isDefault: true },
  { id: 'def-7', vehicleType: 'Sports Car',     year: '', make: '', model: '', sqft: 300, fullWrapPrice: 3000, partialPrice: 1800, isDefault: true },
  { id: 'def-8', vehicleType: 'Exotic / Luxury',year: '', make: '', model: '', sqft: 300, fullWrapPrice: 5000, partialPrice: 3000, isDefault: true },
]

type SortKey = 'name' | 'price' | 'sqft'
type SortDir = 'asc' | 'desc'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const storageKey = (orgId: string) => `usawrap_catalog_${orgId}`

function loadCustomVehicles(orgId: string): VehicleEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(orgId))
    if (!raw) return []
    return JSON.parse(raw) as VehicleEntry[]
  } catch {
    return []
  }
}

function saveCustomVehicles(orgId: string, vehicles: VehicleEntry[]) {
  localStorage.setItem(storageKey(orgId), JSON.stringify(vehicles))
}

// ─── Component ───────────────────────────────────────────────────────────────

interface VehicleCatalogClientProps {
  profile: Profile
}

export function VehicleCatalogClient({ profile }: VehicleCatalogClientProps) {
  const [customVehicles, setCustomVehicles] = useState<VehicleEntry[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleEntry | null>(null)

  // Form state
  const [formYear, setFormYear] = useState('')
  const [formMake, setFormMake] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formType, setFormType] = useState('')
  const [formSqft, setFormSqft] = useState('')
  const [formFullPrice, setFormFullPrice] = useState('')
  const [formPartialPrice, setFormPartialPrice] = useState('')

  // Load custom vehicles from localStorage on mount
  useEffect(() => {
    setCustomVehicles(loadCustomVehicles(profile.org_id))
  }, [profile.org_id])

  // Persist custom vehicles
  function persistCustom(next: VehicleEntry[]) {
    setCustomVehicles(next)
    saveCustomVehicles(profile.org_id, next)
  }

  // Merge defaults + custom
  const allVehicles = useMemo(() => {
    return [...DEFAULT_VEHICLES, ...customVehicles]
  }, [customVehicles])

  // Filter
  const filtered = useMemo(() => {
    let list = [...allVehicles]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.vehicleType.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.year.includes(q)
      )
    }
    // Sort
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        const nameA = a.vehicleType + ' ' + a.make + ' ' + a.model
        const nameB = b.vehicleType + ' ' + b.make + ' ' + b.model
        cmp = nameA.localeCompare(nameB)
      } else if (sortKey === 'price') {
        cmp = a.fullWrapPrice - b.fullWrapPrice
      } else if (sortKey === 'sqft') {
        cmp = a.sqft - b.sqft
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [allVehicles, search, sortKey, sortDir])

  // Stats
  const totalDefaults = DEFAULT_VEHICLES.length
  const totalCustom = customVehicles.length

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function resetForm() {
    setFormYear('')
    setFormMake('')
    setFormModel('')
    setFormType('')
    setFormSqft('')
    setFormFullPrice('')
    setFormPartialPrice('')
  }

  function openAdd() {
    resetForm()
    setEditingVehicle(null)
    setShowAddModal(true)
  }

  function openEdit(v: VehicleEntry) {
    setFormYear(v.year)
    setFormMake(v.make)
    setFormModel(v.model)
    setFormType(v.vehicleType)
    setFormSqft(String(v.sqft))
    setFormFullPrice(String(v.fullWrapPrice))
    setFormPartialPrice(String(v.partialPrice))
    setEditingVehicle(v)
    setShowAddModal(true)
  }

  function handleSave() {
    const vehicleType = formType.trim() || 'Custom'
    const entry: VehicleEntry = {
      id: editingVehicle ? editingVehicle.id : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vehicleType,
      year: formYear.trim(),
      make: formMake.trim(),
      model: formModel.trim(),
      sqft: Number(formSqft) || 0,
      fullWrapPrice: Number(formFullPrice) || 0,
      partialPrice: Number(formPartialPrice) || 0,
      isDefault: false,
    }

    let next: VehicleEntry[]
    if (editingVehicle) {
      next = customVehicles.map(v => (v.id === editingVehicle.id ? entry : v))
    } else {
      next = [...customVehicles, entry]
    }
    persistCustom(next)
    setShowAddModal(false)
    resetForm()
    setEditingVehicle(null)
  }

  function handleDelete(id: string) {
    persistCustom(customVehicles.filter(v => v.id !== id))
  }

  function displayName(v: VehicleEntry): string {
    const parts: string[] = []
    if (v.year) parts.push(v.year)
    if (v.make) parts.push(v.make)
    if (v.model) parts.push(v.model)
    return parts.length > 0 ? parts.join(' ') : '--'
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Car size={22} style={{ color: 'var(--accent)' }} />
            <h1 className="section-label" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', margin: 0 }}>
              Vehicle Catalog
            </h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>
            Reference pricing for common vehicle types. Used as lookup when creating estimates.
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card" style={{ padding: '16px' }}>
          <div className="text-xs" style={{ color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Default Types</div>
          <div className="mono" style={{ fontSize: '1.5rem', color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{totalDefaults}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div className="text-xs" style={{ color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Vehicles</div>
          <div className="mono" style={{ fontSize: '1.5rem', color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace" }}>{totalCustom}</div>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div className="text-xs" style={{ color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Catalog</div>
          <div className="mono" style={{ fontSize: '1.5rem', color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>{totalDefaults + totalCustom}</div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="field"
            placeholder="Search by name, make, model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '34px', width: '100%' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text3)' }}>Sort:</span>
          {(['name', 'price', 'sqft'] as SortKey[]).map(key => (
            <button
              key={key}
              className="btn-ghost"
              onClick={() => toggleSort(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                color: sortKey === key ? 'var(--accent)' : 'var(--text2)',
                borderColor: sortKey === key ? 'var(--accent)' : undefined,
              }}
            >
              {key}
              {sortKey === key && <ArrowUpDown size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* Note about estimates */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderLeft: '3px solid var(--amber)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Car size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
        <span className="text-xs" style={{ color: 'var(--text2)' }}>
          This catalog is referenced when creating project estimates. Prices shown are base rates and can be adjusted per job.
        </span>
      </div>

      {/* Table view */}
      <div className="card" style={{ overflow: 'auto', marginBottom: '24px' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{ cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--text3)', padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--surface2)' }}
                onClick={() => toggleSort('name')}
              >
                Vehicle Type {sortKey === 'name' && <ArrowUpDown size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />}
              </th>
              <th style={{ fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--text3)', padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--surface2)' }}>
                Year / Make / Model
              </th>
              <th
                style={{ cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--text3)', padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--surface2)' }}
                onClick={() => toggleSort('sqft')}
              >
                Sqft {sortKey === 'sqft' && <ArrowUpDown size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />}
              </th>
              <th
                style={{ cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--text3)', padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--surface2)' }}
                onClick={() => toggleSort('price')}
              >
                Full Wrap {sortKey === 'price' && <ArrowUpDown size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />}
              </th>
              <th style={{ fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--text3)', padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--surface2)' }}>
                Partial
              </th>
              <th style={{ fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--text3)', padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--surface2)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: '0.875rem' }}>
                  No vehicles match your search.
                </td>
              </tr>
            )}
            {filtered.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--surface2)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text1)', fontWeight: 600, fontSize: '0.875rem' }}>{v.vehicleType}</span>
                    {v.isDefault ? (
                      <span className="badge" style={{ fontSize: '0.6rem', background: 'var(--surface2)', color: 'var(--text3)' }}>DEFAULT</span>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.6rem', background: 'rgba(34,208,238,0.12)', color: 'var(--cyan)' }}>CUSTOM</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text2)', fontSize: '0.875rem' }}>
                  {displayName(v)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text1)', fontSize: '0.85rem' }}>
                  {v.sqft > 0 ? v.sqft : 'Varies'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600 }}>
                  {fmtMoney(v.fullWrapPrice)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text2)', fontSize: '0.85rem' }}>
                  {fmtMoney(v.partialPrice)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  {!v.isDefault ? (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="btn-ghost"
                        onClick={() => openEdit(v)}
                        style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => handleDelete(v.id)}
                        style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--red)' }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards view */}
      <div className="mb-2">
        <h2 className="section-label" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Quick Reference Cards
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {filtered.map(v => (
          <div key={`card-${v.id}`} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--text1)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {v.vehicleType}
                </span>
              </div>
              {v.isDefault ? (
                <span className="badge" style={{ fontSize: '0.55rem', background: 'var(--surface2)', color: 'var(--text3)' }}>DEFAULT</span>
              ) : (
                <span className="badge" style={{ fontSize: '0.55rem', background: 'rgba(34,208,238,0.12)', color: 'var(--cyan)' }}>CUSTOM</span>
              )}
            </div>

            {(v.year || v.make || v.model) && (
              <div style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>
                {displayName(v)}
              </div>
            )}

            <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--surface2)', paddingTop: '8px' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sqft</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text1)', fontSize: '0.85rem' }}>
                  {v.sqft > 0 ? v.sqft : 'Varies'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Wrap</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600 }}>
                  {fmtMoney(v.fullWrapPrice)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partial</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text2)', fontSize: '0.85rem' }}>
                  {fmtMoney(v.partialPrice)}
                </div>
              </div>
            </div>

            {!v.isDefault && (
              <div className="flex items-center gap-2" style={{ borderTop: '1px solid var(--surface2)', paddingTop: '8px' }}>
                <button
                  className="btn-ghost"
                  onClick={() => openEdit(v)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', padding: '6px' }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => handleDelete(v.id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', padding: '6px', color: 'var(--red)' }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => { setShowAddModal(false); setEditingVehicle(null); resetForm() }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '520px', padding: '24px', margin: '16px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
                {editingVehicle ? 'Edit Vehicle' : 'Add Custom Vehicle'}
              </h2>
              <button
                className="btn-ghost"
                onClick={() => { setShowAddModal(false); setEditingVehicle(null); resetForm() }}
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Vehicle Type */}
              <div>
                <label style={{ fontSize: '0.7rem', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '4px', display: 'block' }}>
                  Vehicle Type *
                </label>
                <input
                  className="field"
                  placeholder="e.g. Sedan, SUV, Box Truck..."
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Year / Make / Model row */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '4px', display: 'block' }}>
                    Year
                  </label>
                  <input
                    className="field"
                    placeholder="2024"
                    value={formYear}
                    onChange={e => setFormYear(e.target.value)}
                    style={{ width: '100%' }}
                    maxLength={4}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '4px', display: 'block' }}>
                    Make
                  </label>
                  <input
                    className="field"
                    placeholder="Ford"
                    value={formMake}
                    onChange={e => setFormMake(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '4px', display: 'block' }}>
                    Model
                  </label>
                  <input
                    className="field"
                    placeholder="F-150"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Sqft / Full Price / Partial Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '4px', display: 'block' }}>
                    Wrap Sqft
                  </label>
                  <input
                    className="field"
                    type="number"
                    placeholder="350"
                    value={formSqft}
                    onChange={e => setFormSqft(e.target.value)}
                    style={{ width: '100%', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '4px', display: 'block' }}>
                    Full Wrap ($)
                  </label>
                  <input
                    className="field"
                    type="number"
                    placeholder="2500"
                    value={formFullPrice}
                    onChange={e => setFormFullPrice(e.target.value)}
                    style={{ width: '100%', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: '4px', display: 'block' }}>
                    Partial ($)
                  </label>
                  <input
                    className="field"
                    type="number"
                    placeholder="1500"
                    value={formPartialPrice}
                    onChange={e => setFormPartialPrice(e.target.value)}
                    style={{ width: '100%', fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3" style={{ marginTop: '6px' }}>
                <button
                  className="btn-ghost"
                  onClick={() => { setShowAddModal(false); setEditingVehicle(null); resetForm() }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={!formType.trim()}
                  style={{ opacity: formType.trim() ? 1 : 0.5 }}
                >
                  {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
