'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Car,
  Plus,
  X,
  Edit2,
  Trash2,
  Search,
  Package,
  Tag,
  DollarSign,
  Clock,
  Ruler,
  Hash,
} from 'lucide-react'

interface CatalogPageProps {
  profile: any
}

interface CustomVehicle {
  id: string
  org_id: string
  year: string | null
  make: string | null
  model: string | null
  vehicle_type: string
  total_sqft: number | null
  base_price: number | null
  default_hours: number | null
  default_pay: number | null
  created_at: string
}

interface CustomLineItem {
  id: string
  org_id: string
  name: string
  description: string | null
  default_price: number | null
  category: string
  created_at: string
}

const VEHICLE_TYPES = ['car', 'truck', 'van', 'suv']
const LINE_ITEM_CATEGORIES = ['addon', 'service', 'package']

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function CatalogPage({ profile }: CatalogPageProps) {
  const supabase = createClient()

  // Vehicles state
  const [vehicles, setVehicles] = useState<CustomVehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(true)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<CustomVehicle | null>(null)
  const [vehicleSearch, setVehicleSearch] = useState('')

  // Vehicle form
  const [vYear, setVYear] = useState('')
  const [vMake, setVMake] = useState('')
  const [vModel, setVModel] = useState('')
  const [vType, setVType] = useState('car')
  const [vSqft, setVSqft] = useState('')
  const [vPrice, setVPrice] = useState('')
  const [vHours, setVHours] = useState('')
  const [vPay, setVPay] = useState('')
  const [vSaving, setVSaving] = useState(false)

  // Line items state
  const [lineItems, setLineItems] = useState<CustomLineItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CustomLineItem | null>(null)
  const [itemSearch, setItemSearch] = useState('')

  // Line item form
  const [iName, setIName] = useState('')
  const [iDesc, setIDesc] = useState('')
  const [iPrice, setIPrice] = useState('')
  const [iCategory, setICategory] = useState('addon')
  const [iSaving, setISaving] = useState(false)

  // Load data
  useEffect(() => {
    loadVehicles()
    loadLineItems()
  }, [])

  async function loadVehicles() {
    setVehiclesLoading(true)
    const { data } = await supabase
      .from('custom_vehicles')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })

    if (data) setVehicles(data)
    setVehiclesLoading(false)
  }

  async function loadLineItems() {
    setItemsLoading(true)
    const { data } = await supabase
      .from('custom_line_items')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })

    if (data) setLineItems(data)
    setItemsLoading(false)
  }

  // Vehicle filtering
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles
    const q = vehicleSearch.toLowerCase()
    return vehicles.filter(v =>
      (v.make || '').toLowerCase().includes(q) ||
      (v.model || '').toLowerCase().includes(q) ||
      v.vehicle_type.toLowerCase().includes(q) ||
      (v.year || '').includes(q)
    )
  }, [vehicles, vehicleSearch])

  // Line item filtering
  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return lineItems
    const q = itemSearch.toLowerCase()
    return lineItems.filter(li =>
      li.name.toLowerCase().includes(q) ||
      (li.description || '').toLowerCase().includes(q) ||
      li.category.toLowerCase().includes(q)
    )
  }, [lineItems, itemSearch])

  // Vehicle modal handlers
  function resetVehicleForm() {
    setVYear(''); setVMake(''); setVModel(''); setVType('car')
    setVSqft(''); setVPrice(''); setVHours(''); setVPay('')
  }

  function openAddVehicle() {
    setEditingVehicle(null)
    resetVehicleForm()
    setShowVehicleModal(true)
  }

  function openEditVehicle(v: CustomVehicle) {
    setEditingVehicle(v)
    setVYear(v.year || '')
    setVMake(v.make || '')
    setVModel(v.model || '')
    setVType(v.vehicle_type)
    setVSqft(v.total_sqft ? String(v.total_sqft) : '')
    setVPrice(v.base_price ? String(v.base_price) : '')
    setVHours(v.default_hours ? String(v.default_hours) : '')
    setVPay(v.default_pay ? String(v.default_pay) : '')
    setShowVehicleModal(true)
  }

  async function saveVehicle() {
    setVSaving(true)
    const record = {
      org_id: profile.org_id,
      year: vYear.trim() || null,
      make: vMake.trim() || null,
      model: vModel.trim() || null,
      vehicle_type: vType,
      total_sqft: Number(vSqft) || null,
      base_price: Number(vPrice) || null,
      default_hours: Number(vHours) || null,
      default_pay: Number(vPay) || null,
    }

    if (editingVehicle) {
      const { error } = await supabase
        .from('custom_vehicles')
        .update(record)
        .eq('id', editingVehicle.id)

      if (!error) {
        setVehicles(prev => prev.map(v =>
          v.id === editingVehicle.id ? { ...v, ...record } : v
        ))
      }
    } else {
      const { data, error } = await supabase
        .from('custom_vehicles')
        .insert(record)
        .select()
        .single()

      if (!error && data) {
        setVehicles(prev => [data, ...prev])
      }
    }

    setVSaving(false)
    setShowVehicleModal(false)
    setEditingVehicle(null)
    resetVehicleForm()
  }

  async function deleteVehicle(id: string) {
    const { error } = await supabase.from('custom_vehicles').delete().eq('id', id)
    if (!error) setVehicles(prev => prev.filter(v => v.id !== id))
  }

  // Line item modal handlers
  function resetItemForm() {
    setIName(''); setIDesc(''); setIPrice(''); setICategory('addon')
  }

  function openAddItem() {
    setEditingItem(null)
    resetItemForm()
    setShowItemModal(true)
  }

  function openEditItem(li: CustomLineItem) {
    setEditingItem(li)
    setIName(li.name)
    setIDesc(li.description || '')
    setIPrice(li.default_price ? String(li.default_price) : '')
    setICategory(li.category)
    setShowItemModal(true)
  }

  async function saveItem() {
    if (!iName.trim()) return
    setISaving(true)

    const record = {
      org_id: profile.org_id,
      name: iName.trim(),
      description: iDesc.trim() || null,
      default_price: Number(iPrice) || null,
      category: iCategory,
    }

    if (editingItem) {
      const { error } = await supabase
        .from('custom_line_items')
        .update(record)
        .eq('id', editingItem.id)

      if (!error) {
        setLineItems(prev => prev.map(li =>
          li.id === editingItem.id ? { ...li, ...record } : li
        ))
      }
    } else {
      const { data, error } = await supabase
        .from('custom_line_items')
        .insert(record)
        .select()
        .single()

      if (!error && data) {
        setLineItems(prev => [data, ...prev])
      }
    }

    setISaving(false)
    setShowItemModal(false)
    setEditingItem(null)
    resetItemForm()
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from('custom_line_items').delete().eq('id', id)
    if (!error) setLineItems(prev => prev.filter(li => li.id !== id))
  }

  function getCategoryColor(cat: string): string {
    switch (cat) {
      case 'addon': return '#22d3ee'
      case 'service': return '#22c07a'
      case 'package': return '#8b5cf6'
      default: return '#5a6080'
    }
  }

  function getVehicleTypeColor(vt: string): string {
    switch (vt) {
      case 'car': return '#4f7fff'
      case 'truck': return '#22c07a'
      case 'van': return '#f59e0b'
      case 'suv': return '#8b5cf6'
      default: return '#5a6080'
    }
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 28,
          fontWeight: 900,
          color: '#e8eaed',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Package size={26} style={{ color: '#4f7fff' }} />
          Vehicle Catalog
        </h1>
        <p style={{ fontSize: 13, color: '#5a6080', marginTop: 4 }}>
          Manage custom vehicle types and line items for estimates
        </p>
      </div>

      {/* ═══════════════ SECTION 1: CUSTOM VEHICLE TYPES ═══════════════ */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Car size={18} style={{ color: '#22d3ee' }} />
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 18,
              fontWeight: 800,
              color: '#e8eaed',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Custom Vehicle Types
            </h2>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#5a6080',
              background: '#1a1d27',
              padding: '2px 8px',
              borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {vehicles.length}
            </span>
          </div>
          <button
            onClick={openAddVehicle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: '#4f7fff',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Add Vehicle
          </button>
        </div>

        {/* Vehicle Search */}
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }} />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={vehicleSearch}
            onChange={e => setVehicleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 8,
              color: '#e8eaed',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>

        {/* Vehicles Table */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          overflow: 'auto',
        }}>
          {vehiclesLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>Loading vehicles...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1d27' }}>
                  {['Year', 'Make', 'Model', 'Vehicle Type', 'Total SQFT', 'Base Price', 'Default Hours', 'Default Pay', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px',
                      textAlign: h === 'Actions' ? 'center' : 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#5a6080',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>
                      {vehicleSearch ? 'No vehicles match your search.' : 'No custom vehicles added yet.'}
                    </td>
                  </tr>
                ) : filteredVehicles.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(26,29,39,0.8)' }}>
                    <td style={{ padding: '10px 12px', color: '#9299b5', fontSize: 13 }}>{v.year || '--'}</td>
                    <td style={{ padding: '10px 12px', color: '#e8eaed', fontSize: 13, fontWeight: 600 }}>{v.make || '--'}</td>
                    <td style={{ padding: '10px 12px', color: '#e8eaed', fontSize: 13, fontWeight: 600 }}>{v.model || '--'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: `${getVehicleTypeColor(v.vehicle_type)}15`,
                        color: getVehicleTypeColor(v.vehicle_type),
                        textTransform: 'uppercase',
                      }}>
                        {v.vehicle_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#e8eaed' }}>
                      {v.total_sqft || '--'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#22c07a', fontWeight: 600 }}>
                      {v.base_price ? fmtMoney(v.base_price) : '--'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#9299b5' }}>
                      {v.default_hours ? `${v.default_hours}h` : '--'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#22d3ee' }}>
                      {v.default_pay ? fmtMoney(v.default_pay) : '--'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button
                          onClick={() => openEditVehicle(v)}
                          title="Edit"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            fontSize: 11,
                            color: '#9299b5',
                            background: 'transparent',
                            border: '1px solid #1a1d27',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteVehicle(v.id)}
                          title="Delete"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            fontSize: 11,
                            color: '#f25a5a',
                            background: 'transparent',
                            border: '1px solid rgba(242,90,90,0.3)',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ═══════════════ SECTION 2: CUSTOM LINE ITEMS / PRODUCTS ═══════════════ */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={18} style={{ color: '#f59e0b' }} />
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 18,
              fontWeight: 800,
              color: '#e8eaed',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Custom Line Items / Products
            </h2>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#5a6080',
              background: '#1a1d27',
              padding: '2px 8px',
              borderRadius: 10,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {lineItems.length}
            </span>
          </div>
          <button
            onClick={openAddItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: '#4f7fff',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        {/* Item Search */}
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5a6080' }} />
          <input
            type="text"
            placeholder="Search line items..."
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 8,
              color: '#e8eaed',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>

        {/* Line Items Table */}
        <div style={{
          background: '#13151c',
          border: '1px solid #1a1d27',
          borderRadius: 12,
          overflow: 'auto',
        }}>
          {itemsLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>Loading items...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1d27' }}>
                  {['Name', 'Description', 'Default Price', 'Category', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px',
                      textAlign: h === 'Actions' ? 'center' : 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#5a6080',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontFamily: 'Barlow Condensed, sans-serif',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#5a6080', fontSize: 13 }}>
                      {itemSearch ? 'No items match your search.' : 'No custom line items added yet.'}
                    </td>
                  </tr>
                ) : filteredItems.map(li => (
                  <tr key={li.id} style={{ borderBottom: '1px solid rgba(26,29,39,0.8)' }}>
                    <td style={{ padding: '10px 12px', color: '#e8eaed', fontSize: 13, fontWeight: 700 }}>
                      {li.name}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#9299b5', fontSize: 12, maxWidth: 300 }}>
                      {li.description || '--'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#22c07a', fontWeight: 600 }}>
                      {li.default_price ? fmtMoney(li.default_price) : '--'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: `${getCategoryColor(li.category)}15`,
                        color: getCategoryColor(li.category),
                        textTransform: 'capitalize',
                      }}>
                        {li.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button
                          onClick={() => openEditItem(li)}
                          title="Edit"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            fontSize: 11,
                            color: '#9299b5',
                            background: 'transparent',
                            border: '1px solid #1a1d27',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => deleteItem(li.id)}
                          title="Delete"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            fontSize: 11,
                            color: '#f25a5a',
                            background: 'transparent',
                            border: '1px solid rgba(242,90,90,0.3)',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ═══════════════ VEHICLE MODAL ═══════════════ */}
      {showVehicleModal && (
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
          onClick={() => { setShowVehicleModal(false); setEditingVehicle(null); resetVehicleForm() }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 16,
              padding: 24,
              margin: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 18,
                fontWeight: 900,
                color: '#e8eaed',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Car size={18} style={{ color: '#4f7fff' }} />
                {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
              </h2>
              <button onClick={() => { setShowVehicleModal(false); setEditingVehicle(null); resetVehicleForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
                <X size={18} />
              </button>
            </div>

            {/* Year / Make / Model row */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Year</label>
                <input type="text" maxLength={4} placeholder="2024" value={vYear} onChange={e => setVYear(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Make</label>
                <input type="text" placeholder="Ford" value={vMake} onChange={e => setVMake(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Model</label>
                <input type="text" placeholder="F-150" value={vModel} onChange={e => setVModel(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            {/* Vehicle Type */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Vehicle Type</label>
            <select value={vType} onChange={e => setVType(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none', marginBottom: 12 }}>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>

            {/* Sqft / Price / Hours / Pay */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total SQFT</label>
                <input type="number" placeholder="350" value={vSqft} onChange={e => setVSqft(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Base Price</label>
                <input type="number" placeholder="2500" value={vPrice} onChange={e => setVPrice(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Def. Hours</label>
                <input type="number" placeholder="6" value={vHours} onChange={e => setVHours(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Def. Pay</label>
                <input type="number" placeholder="400" value={vPay} onChange={e => setVPay(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowVehicleModal(false); setEditingVehicle(null); resetVehicleForm() }} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#9299b5', background: 'transparent', border: '1px solid #1a1d27', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveVehicle} disabled={vSaving} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4f7fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: vSaving ? 0.6 : 1 }}>
                {vSaving ? 'Saving...' : editingVehicle ? 'Save Changes' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ LINE ITEM MODAL ═══════════════ */}
      {showItemModal && (
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
          onClick={() => { setShowItemModal(false); setEditingItem(null); resetItemForm() }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 16,
              padding: 24,
              margin: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 18,
                fontWeight: 900,
                color: '#e8eaed',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Tag size={18} style={{ color: '#f59e0b' }} />
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h2>
              <button onClick={() => { setShowItemModal(false); setEditingItem(null); resetItemForm() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080' }}>
                <X size={18} />
              </button>
            </div>

            {/* Name */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Name *</label>
            <input type="text" placeholder="Item name" value={iName} onChange={e => setIName(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none', marginBottom: 12 }} />

            {/* Description */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</label>
            <textarea placeholder="Optional description..." value={iDesc} onChange={e => setIDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 12 }} />

            {/* Price / Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Default Price</label>
                <input type="number" placeholder="0" value={iPrice} onChange={e => setIPrice(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Category</label>
                <select value={iCategory} onChange={e => setICategory(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0d0f14', border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed', fontSize: 13, outline: 'none' }}>
                  {LINE_ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowItemModal(false); setEditingItem(null); resetItemForm() }} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#9299b5', background: 'transparent', border: '1px solid #1a1d27', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveItem} disabled={iSaving || !iName.trim()} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4f7fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (iSaving || !iName.trim()) ? 0.5 : 1 }}>
                {iSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
