'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Save, Send, CheckCircle2, FileText, Plus,
  Trash2, Car, Paintbrush, ChevronDown, ChevronRight,
  ArrowRight, Copy, MoreHorizontal, FileDown, Ban,
  Layers, Mail, Calendar, User, Users, Briefcase, DollarSign,
  ClipboardList, Activity,
  ToggleLeft, ToggleRight, Wrench, CircleDot,
  TrendingUp, Calculator, Settings, Sparkles, ImageIcon,
} from 'lucide-react'
import MockupCreator from '@/components/estimates/MockupCreator'
import type { Profile, Project, LineItem, LineItemSpecs, EstimateStatus } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import EmailComposeModal, { type EmailData } from '@/components/shared/EmailComposeModal'
import vehiclesData from '@/lib/data/vehicles.json'

// ─── Vehicle Database ────────────────────────────────────────────────────────────

interface VehicleEntry {
  year: number; make: string; model: string; sqft: number
  basePrice: number; installHours: number; tier: string
}

const VEHICLES_DB: VehicleEntry[] = vehiclesData as VehicleEntry[]
const ALL_MAKES = [...new Set(VEHICLES_DB.map(v => v.make))].sort()

function getModelsForMake(make: string): string[] {
  return [...new Set(VEHICLES_DB.filter(v => v.make === make).map(v => v.model))].sort()
}

function findVehicle(make: string, model: string, year?: string): VehicleEntry | null {
  const y = year ? parseInt(year) : null
  const match = y
    ? VEHICLES_DB.find(v => v.make === make && v.model === model && v.year === y)
    : VEHICLES_DB.find(v => v.make === make && v.model === model)
  return match || null
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const LABOR_RATE = 30
const DESIGN_FEE_DEFAULT = 150
const DEFAULT_TAX_RATE = 0.0825

interface VehicleCategory {
  label: string
  flatRate: number
  estimatedHours: number
  group: string
}

const VEHICLE_CATEGORIES: Record<string, VehicleCategory> = {
  small_car:    { label: 'Small Car',     flatRate: 500,  estimatedHours: 14, group: 'Cars' },
  med_car:      { label: 'Med Car',       flatRate: 550,  estimatedHours: 16, group: 'Cars' },
  full_car:     { label: 'Full Car',      flatRate: 600,  estimatedHours: 17, group: 'Cars' },
  sm_truck:     { label: 'Sm Truck',      flatRate: 525,  estimatedHours: 15, group: 'Trucks' },
  med_truck:    { label: 'Med Truck',     flatRate: 565,  estimatedHours: 16, group: 'Trucks' },
  full_truck:   { label: 'Full Truck',    flatRate: 600,  estimatedHours: 17, group: 'Trucks' },
  med_van:      { label: 'Med Van',       flatRate: 525,  estimatedHours: 15, group: 'Vans' },
  large_van:    { label: 'Large Van',     flatRate: 600,  estimatedHours: 17, group: 'Vans' },
  box_truck:    { label: 'Box Truck',     flatRate: 0,    estimatedHours: 0,  group: 'Commercial' },
  trailer:      { label: 'Trailer',       flatRate: 0,    estimatedHours: 0,  group: 'Commercial' },
  marine:       { label: 'Marine',        flatRate: 0,    estimatedHours: 0,  group: 'Specialty' },
  ppf:          { label: 'PPF',           flatRate: 0,    estimatedHours: 0,  group: 'Specialty' },
  custom:       { label: 'Custom',        flatRate: 0,    estimatedHours: 0,  group: 'Other' },
}

const COMMISSION_RATES: Record<string, { base: number; max: number; bonuses: boolean }> = {
  inbound:  { base: 0.045, max: 0.075, bonuses: true },
  outbound: { base: 0.07,  max: 0.10,  bonuses: true },
  presold:  { base: 0.05,  max: 0.05,  bonuses: false },
  referral: { base: 0.045, max: 0.075, bonuses: true },
  walk_in:  { base: 0.045, max: 0.075, bonuses: true },
}

type TabKey = 'sales' | 'items' | 'design' | 'production' | 'install' | 'notes' | 'activity'

// ─── Style Constants ────────────────────────────────────────────────────────────

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 0,
  overflow: 'hidden',
}

const sectionPad: React.CSSProperties = {
  padding: '16px 20px',
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: 4,
  fontFamily: headingFont,
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text1)',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
}

const fieldSelectStyle: React.CSSProperties = {
  ...fieldInputStyle,
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239299b5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 28,
}

const monoStyle: React.CSSProperties = {
  fontFamily: monoFont,
  fontVariantNumeric: 'tabular-nums',
}

// ─── Helper Functions ───────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

function calcGPM(item: LineItem, source: string = 'inbound'): { sale: number; materialCost: number; laborCost: number; designFee: number; miscCost: number; cogs: number; gp: number; gpm: number; commission: number; commissionRate: number; estimatedHours: number } {
  const specs = item.specs
  const sale = item.unit_price * item.quantity
  const estimatedHours = (specs.estimatedHours as number) || 0
  const materialCost = specs.materialCost || 0
  const laborCost = estimatedHours * LABOR_RATE
  const designFee = (specs.designFee as number) ?? DESIGN_FEE_DEFAULT
  const miscCost = specs.machineCost || 0
  const cogs = materialCost + laborCost + designFee + miscCost
  const gp = sale - cogs
  const gpm = sale > 0 ? (gp / sale) * 100 : 0
  const rates = COMMISSION_RATES[source] || COMMISSION_RATES.inbound
  const protected_ = gpm < 65
  let commissionRate = rates.base
  if (!protected_ && rates.bonuses) {
    if (gpm > 73) commissionRate += 0.02
    commissionRate = Math.min(commissionRate, rates.max)
  }
  const commission = Math.max(0, gp * commissionRate)
  return { sale, materialCost, laborCost, designFee, miscCost, cogs, gp, gpm, commission, commissionRate, estimatedHours }
}

function gpmBadge(gpm: number): { label: string; color: string; bg: string } {
  if (gpm >= 73) return { label: 'Excellent', color: 'var(--green)', bg: 'rgba(34,192,122,0.15)' }
  if (gpm >= 60) return { label: 'Good', color: 'var(--amber)', bg: 'rgba(245,158,11,0.15)' }
  return { label: 'Low', color: 'var(--red)', bg: 'rgba(242,90,90,0.15)' }
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Teammate { id: string; name: string; role: string; email?: string }

interface SalesTabBuilderProps {
  profile: Profile
  project: Project
  teammates: Teammate[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SalesTabBuilder({ profile, project, teammates }: SalesTabBuilderProps) {
  const supabase = createClient()

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')
  const team = teammates as Pick<typeof teammates[number], 'id' | 'name' | 'role'>[]
  const fd = (project.form_data as any) || {}

  // ─── State ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(project.title || '')
  const [notes, setNotes] = useState(fd.salesNotes || '')
  const [customerNote, setCustomerNote] = useState(fd.customerNote || '')
  const [discount, setDiscount] = useState(fd.discount || 0)
  const [taxRate, setTaxRate] = useState(fd.taxRate || DEFAULT_TAX_RATE)
  const [quoteDate, setQuoteDate] = useState(fd.quoteDate || project.created_at?.split('T')[0] || '')
  const [dueDate, setDueDate] = useState(project.due_date || '')
  const [installDate, setInstallDate] = useState(project.install_date || '')
  const [lineItemsList, setLineItemsList] = useState<LineItem[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('items')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showAllInfo, setShowAllInfo] = useState(false)
  const [salesRepId, setSalesRepId] = useState(project.agent_id || '')
  const [prodMgrId, setProdMgrId] = useState(fd.prodMgrId || '')
  const [projMgrId, setProjMgrId] = useState(fd.projMgrId || '')
  const [leadType, setLeadType] = useState<string>(fd.leadType || 'inbound')
  const [clientName, setClientName] = useState(fd.client || fd.clientName || '')
  const [bizName, setBizName] = useState(fd.bizName || '')
  const [phone, setPhone] = useState(fd.phone || fd.clientPhone || '')
  const [clientEmail, setClientEmail] = useState(fd.email || fd.clientEmail || '')
  const [vehicleName, setVehicleName] = useState(fd.vehicle || project.vehicle_desc || '')
  const [vehicleColor, setVehicleColor] = useState(fd.vehicleColor || '')
  const [loading, setLoading] = useState(true)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailModalType, setEmailModalType] = useState<'estimate' | 'invoice' | 'proof' | 'general'>('estimate')

  // Initial Concepts
  const [showConceptCreator, setShowConceptCreator] = useState(false)
  const [savedConcepts, setSavedConcepts] = useState<string[]>((fd.initialConcepts as string[]) || [])
  const [conceptsSentAt, setConceptsSentAt] = useState<string | null>(fd.conceptsSentAt || null)
  const [conceptSpecs, setConceptSpecs] = useState<Record<string, unknown>>({})

  // Collapsible sections per line item
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({})

  // ─── Load line items from DB ────────────────────────────────────────────────
  useEffect(() => {
    async function loadLineItems() {
      const { data } = await supabase
        .from('line_items')
        .select('*')
        .eq('parent_type', 'project')
        .eq('parent_id', project.id)
        .order('sort_order', { ascending: true })
      if (data && data.length > 0) {
        setLineItemsList(data)
        // Open GPM section on first item
        const expanded: Record<string, Record<string, boolean>> = {}
        data.forEach((li: LineItem) => { expanded[li.id] = { gpm: true } })
        setExpandedSections(expanded)
      }
      setLoading(false)
    }
    loadLineItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  // ─── Calculations ───────────────────────────────────────────────────────────
  const subtotal = useMemo(() => lineItemsList.reduce((s, li) => s + li.total_price, 0), [lineItemsList])
  const taxAmount = useMemo(() => (subtotal - discount) * taxRate, [subtotal, discount, taxRate])
  const total = useMemo(() => subtotal - discount + taxAmount, [subtotal, discount, taxAmount])

  // ─── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Section toggle helper ────────────────────────────────────────────────
  function toggleSection(itemId: string, section: string) {
    setExpandedSections(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [section]: !prev[itemId]?.[section] },
    }))
  }

  function isSectionOpen(itemId: string, section: string): boolean {
    return expandedSections[itemId]?.[section] ?? false
  }

  // ─── Save handlers ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canWrite) { showToast('No write permission'); return }
    setSaving(true)
    try {
      // Save project-level data
      const formData = {
        ...fd,
        salesNotes: notes,
        customerNote,
        discount,
        taxRate,
        quoteDate,
        leadType,
        prodMgrId,
        projMgrId,
        subtotal,
        taxAmount,
        total,
        client: clientName,
        clientName,
        bizName,
        phone,
        email: clientEmail,
        clientEmail,
        vehicle: vehicleName,
        vehicleColor,
      }
      await supabase.from('projects').update({
        title,
        install_date: installDate || null,
        due_date: dueDate || null,
        agent_id: salesRepId || null,
        revenue: total || null,
        vehicle_desc: vehicleName || null,
        form_data: formData,
        updated_at: new Date().toISOString(),
      }).eq('id', project.id)

      // Save line items — upsert existing, insert new
      for (const li of lineItemsList) {
        if (li.id.startsWith('new-')) {
          const { data } = await supabase.from('line_items').insert({
            parent_type: 'project' as const,
            parent_id: project.id,
            product_type: li.product_type,
            name: li.name,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            unit_discount: li.unit_discount,
            total_price: li.total_price,
            specs: li.specs,
            sort_order: li.sort_order,
          }).select().single()
          if (data) {
            setLineItemsList(prev => prev.map(x => x.id === li.id ? { ...x, id: data.id, parent_id: project.id } : x))
          }
        } else {
          await supabase.from('line_items').update({
            name: li.name,
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            unit_discount: li.unit_discount,
            total_price: li.total_price,
            specs: li.specs,
            sort_order: li.sort_order,
            product_type: li.product_type,
          }).eq('id', li.id)
        }
      }
      showToast('Saved')
    } catch (err) {
      console.error('Save error:', err)
      showToast('Error saving')
    }
    setSaving(false)
  }

  async function handleLineItemSave(item: LineItem) {
    if (item.id.startsWith('new-')) return
    try {
      await supabase.from('line_items').update({
        name: item.name, description: item.description,
        quantity: item.quantity, unit_price: item.unit_price,
        unit_discount: item.unit_discount, total_price: item.total_price,
        specs: item.specs, sort_order: item.sort_order, product_type: item.product_type,
      }).eq('id', item.id)
    } catch (err) {
      console.error('Line item save error:', err)
    }
  }

  function addNewLineItem() {
    const newItem: LineItem = {
      id: `new-${Date.now()}`, parent_type: 'project' as any, parent_id: project.id,
      product_type: 'wrap', name: '', description: null,
      quantity: 1, unit_price: 0, unit_discount: 0, total_price: 0,
      specs: { estimatedHours: 0, designFee: DESIGN_FEE_DEFAULT }, sort_order: lineItemsList.length,
      created_at: new Date().toISOString(),
    }
    setLineItemsList(prev => [...prev, newItem])
    setExpandedSections(prev => ({ ...prev, [newItem.id]: { gpm: true } }))
  }

  async function removeLineItem(id: string) {
    if (!id.startsWith('new-')) {
      await supabase.from('line_items').delete().eq('id', id)
    }
    setLineItemsList(prev => prev.filter(x => x.id !== id))
  }

  // ─── Initial Concepts handlers ──────────────────────────────────────────────
  function updateConceptSpec(key: string, value: unknown) {
    setConceptSpecs(prev => ({ ...prev, [key]: value }))
    // If a mockup URL is set, save to savedConcepts
    if (key === 'mockupUrl' && typeof value === 'string') {
      setSavedConcepts(prev => prev.includes(value) ? prev : [...prev, value])
    }
    if (key === 'mockupSelected' && value === true) {
      // Persist to project form_data
      const url = conceptSpecs.mockupUrl as string | undefined
      if (url) {
        const allConcepts = savedConcepts.includes(url) ? savedConcepts : [...savedConcepts, url]
        setSavedConcepts(allConcepts)
        supabase.from('projects').update({
          form_data: { ...fd, initialConcepts: allConcepts },
          updated_at: new Date().toISOString(),
        }).eq('id', project.id).then(() => showToast('Concept saved to job'))
      }
    }
  }

  async function handleSendConcepts() {
    if (savedConcepts.length === 0) { showToast('No concepts saved yet'); return }
    const sentAt = new Date().toISOString()
    await supabase.from('projects').update({
      form_data: { ...fd, initialConcepts: savedConcepts, conceptsSentAt: sentAt },
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)
    setConceptsSentAt(sentAt)
    showToast('Portal link ready — share with customer')
  }

  async function handleRemoveConcept(url: string) {
    const updated = savedConcepts.filter(c => c !== url)
    setSavedConcepts(updated)
    await supabase.from('projects').update({
      form_data: { ...fd, initialConcepts: updated },
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)
  }

  // Team helpers
  const findTeamMember = (id: string | null) => id ? team.find(t => t.id === id) : null

  // Customer info from project
  const customerName = (project as any).customer?.name || fd.clientName || fd.client || project.title || ''
  const customerEmail = (project as any).customer?.email || fd.clientEmail || fd.email || ''

  // Vehicle info for MockupCreator (first line item vehicle or project title)
  const conceptVehicleInfo = (() => {
    const li = lineItemsList[0]
    if (!li) return project.title || 'Commercial Vehicle'
    const s = li.specs as any
    if (s?.vehicleYear && s?.vehicleMake && s?.vehicleModel) return `${s.vehicleYear} ${s.vehicleMake} ${s.vehicleModel}`
    if (s?.vehicleMake && s?.vehicleModel) return `${s.vehicleMake} ${s.vehicleModel}`
    if (s?.vehicleCategory) return s.vehicleCategory.replace(/_/g, ' ')
    return li.name || project.title || 'Commercial Vehicle'
  })()

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        Loading quote builder...
      </div>
    )
  }

  return (
    <div>
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HEADER ROW                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{
            fontSize: 20, fontWeight: 900, fontFamily: headingFont,
            color: 'var(--text1)', margin: 0, lineHeight: 1,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <ClipboardList size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
            Quote Builder
          </h2>
        </div>

        {/* Right: Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Download PDF */}
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--text1)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: headingFont, letterSpacing: '0.03em',
            }}
          >
            <FileDown size={13} />
            Download PDF
          </button>

          {/* Email PDF */}
          <button
            onClick={() => { setEmailModalType('estimate'); setEmailModalOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--text1)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: headingFont, letterSpacing: '0.03em',
            }}
          >
            <Mail size={13} />
            Email PDF
          </button>

          {/* Send Quote */}
          <button
            onClick={() => { setEmailModalType('estimate'); setEmailModalOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent)', border: 'none',
              borderRadius: 8, padding: '8px 14px', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: headingFont, letterSpacing: '0.03em',
            }}
          >
            <Send size={13} />
            Send Quote
          </button>

          {/* Save button */}
          {canWrite && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--green)', border: 'none',
                borderRadius: 8, padding: '8px 16px', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1, fontFamily: headingFont, letterSpacing: '0.03em',
              }}
            >
              <Save size={13} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* INFO BANNER                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 0 }}>
          {/* Column 1: Customer */}
          <div style={{ ...sectionPad, borderRight: '1px solid var(--border)' }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <User size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Customer
            </div>
            {customerName ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                  {customerName}
                </div>
                {customerEmail && (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {customerEmail}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => showToast('Add Customer -- use the Client Info fields below')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(79,127,255,0.1)', border: '1px dashed rgba(79,127,255,0.3)',
                  borderRadius: 6, padding: '8px 12px', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
                }}
              >
                <Plus size={12} /> Add Customer
              </button>
            )}
          </div>

          {/* Column 2: Status */}
          <div style={{ ...sectionPad, borderRight: '1px solid var(--border)' }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <CircleDot size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 12px',
                borderRadius: 6, fontSize: 11, fontWeight: 800,
                color: 'var(--accent)', background: 'rgba(79,127,255,0.18)',
                letterSpacing: '0.05em', fontFamily: headingFont,
              }}>
                {(project.pipe_stage || 'sales_in').replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: 'var(--text3)' }}>
                Items: <span style={{ color: 'var(--text2)', fontWeight: 600, ...monoStyle }}>{lineItemsList.length}</span>
              </span>
              <span style={{ color: 'var(--text3)' }}>
                Total: <span style={{ color: 'var(--green)', fontWeight: 600, ...monoStyle }}>{fmtCurrency(total)}</span>
              </span>
            </div>
          </div>

          {/* Column 3: Team Assignments */}
          <div style={{ ...sectionPad, borderRight: '1px solid var(--border)' }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <Users size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Team Assignments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 55 }}>Sales Rep</span>
                <select
                  value={salesRepId}
                  onChange={e => setSalesRepId(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldSelectStyle, padding: '4px 8px', fontSize: 12, flex: 1 }}
                >
                  <option value="">-- None --</option>
                  {team.filter(t => ['owner', 'admin', 'sales_agent'].includes(t.role)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 55 }}>Prod Mgr</span>
                <select
                  value={prodMgrId}
                  onChange={e => setProdMgrId(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldSelectStyle, padding: '4px 8px', fontSize: 12, flex: 1 }}
                >
                  <option value="">-- None --</option>
                  {team.filter(t => ['owner', 'admin', 'production'].includes(t.role)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 55 }}>Proj Mgr</span>
                <select
                  value={projMgrId}
                  onChange={e => setProjMgrId(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldSelectStyle, padding: '4px 8px', fontSize: 12, flex: 1 }}
                >
                  <option value="">-- None --</option>
                  {team.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Column 4: Dates */}
          <div style={sectionPad}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <Calendar size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Dates
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>Quote Date</label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={e => setQuoteDate(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldInputStyle, padding: '4px 8px', fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>Install Date</label>
                <input
                  type="date"
                  value={installDate}
                  onChange={e => setInstallDate(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldInputStyle, padding: '4px 8px', fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)' }}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldInputStyle, padding: '4px 8px', fontSize: 12 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Show All Information toggle */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '8px 20px',
          display: 'flex', alignItems: 'center',
        }}>
          <button
            onClick={() => setShowAllInfo(!showAllInfo)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', color: 'var(--accent)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
            }}
          >
            <ChevronDown size={12} style={{
              transform: showAllInfo ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }} />
            {showAllInfo ? 'Hide All Information' : 'Show All Information'}
          </button>
        </div>

        {/* Extended info panel */}
        <div style={{
          maxHeight: showAllInfo ? 300 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}>
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 20px',
          }}>
            <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
              <div>
                <label style={fieldLabelStyle}>Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={!canWrite}
                  style={fieldInputStyle}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>Division</label>
                <input
                  value={project.division === 'wraps' ? 'Wraps' : 'Decking'}
                  disabled
                  style={{ ...fieldInputStyle, opacity: 0.5 }}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>Lead Source</label>
                <select
                  value={leadType}
                  onChange={e => setLeadType(e.target.value)}
                  disabled={!canWrite}
                  style={fieldSelectStyle}
                >
                  <option value="inbound">Inbound (4.5-7.5%)</option>
                  <option value="outbound">Outbound (7-10%)</option>
                  <option value="presold">Pre-Sold (5% flat)</option>
                  <option value="referral">Referral (4.5-7.5%)</option>
                  <option value="walk_in">Walk-In (4.5-7.5%)</option>
                </select>
              </div>
              <div>
                <label style={fieldLabelStyle}>Created</label>
                <input
                  value={new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  disabled
                  style={{ ...fieldInputStyle, opacity: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TABS                                                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '2px solid var(--border)',
        marginBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {([
          { key: 'sales' as TabKey, label: 'Sales' },
          { key: 'items' as TabKey, label: 'Items', count: lineItemsList.length },
          { key: 'design' as TabKey, label: 'Design' },
          { key: 'production' as TabKey, label: 'Production' },
          { key: 'install' as TabKey, label: 'Install' },
          { key: 'notes' as TabKey, label: 'Notes' },
          { key: 'activity' as TabKey, label: 'Activity' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              background: 'transparent',
              color: activeTab === tab.key ? 'var(--text1)' : 'var(--text3)',
              fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
              fontFamily: headingFont, textTransform: 'uppercase',
              letterSpacing: '0.05em', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                ...monoStyle, fontSize: 11, fontWeight: 700,
                background: activeTab === tab.key ? 'rgba(79,127,255,0.2)' : 'rgba(90,96,128,0.15)',
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text3)',
                padding: '1px 7px', borderRadius: 10,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          <div style={cardStyle}>
            <div style={sectionPad}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                Client Information
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={fieldLabelStyle}>Client Name</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} disabled={!canWrite} placeholder="John Smith" style={fieldInputStyle} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Business Name</label>
                  <input value={bizName} onChange={e => setBizName(e.target.value)} disabled={!canWrite} placeholder="Smith Plumbing LLC" style={fieldInputStyle} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} disabled={!canWrite} placeholder="(555) 000-0000" style={fieldInputStyle} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Email</label>
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} disabled={!canWrite} placeholder="client@email.com" style={fieldInputStyle} />
                </div>
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={sectionPad}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                Vehicle &amp; Deal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={fieldLabelStyle}>Vehicle</label>
                  <input value={vehicleName} onChange={e => setVehicleName(e.target.value)} disabled={!canWrite} placeholder="2024 Ford Transit 350" style={fieldInputStyle} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Vehicle Color</label>
                  <input value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} disabled={!canWrite} placeholder="White" style={fieldInputStyle} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Lead Source</label>
                  <select value={leadType} onChange={e => setLeadType(e.target.value)} disabled={!canWrite} style={fieldSelectStyle}>
                    <option value="inbound">Inbound (4.5–7.5%)</option>
                    <option value="outbound">Outbound (7–10%)</option>
                    <option value="presold">Pre-Sold (5% flat)</option>
                    <option value="referral">Referral (4.5–7.5%)</option>
                    <option value="walk_in">Walk-In (4.5–7.5%)</option>
                  </select>
                </div>
                <div>
                  <label style={fieldLabelStyle}>Sales Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={!canWrite} placeholder="Internal sales notes..." rows={3} style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 64 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div>
          {/* Items header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text1)',
              fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Items
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {canWrite && (
                <button
                  onClick={addNewLineItem}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
                    borderRadius: 8, padding: '7px 14px', color: 'var(--green)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: headingFont, letterSpacing: '0.03em',
                  }}
                >
                  <Plus size={13} />
                  Add New Line Item
                </button>
              )}
            </div>
          </div>

          {/* Line items */}
          {lineItemsList.length === 0 ? (
            <div style={{
              ...cardStyle, padding: 48, textAlign: 'center',
            }}>
              <ClipboardList size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 4 }}>No line items yet</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Click &quot;Add New Line Item&quot; to start building this quote.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lineItemsList.map((li, idx) => (
                <LineItemCard
                  key={li.id}
                  item={li}
                  index={idx}
                  canWrite={canWrite}
                  onChange={(updated) => {
                    setLineItemsList(prev => prev.map(x => x.id === li.id ? updated : x))
                  }}
                  onBlurSave={(updated) => handleLineItemSave(updated)}
                  onRemove={() => removeLineItem(li.id)}
                  expandedSections={expandedSections[li.id] || {}}
                  onToggleSection={(section) => toggleSection(li.id, section)}
                  leadType={leadType}
                  team={team}
                />
              ))}
            </div>
          )}

          {/* ── Bottom Summary ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]" style={{
            gap: 20, marginTop: 24, alignItems: 'flex-start',
          }}>
            {/* Left: Customer Note */}
            <div>
              <label style={fieldLabelStyle}>Customer Note</label>
              <textarea
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                disabled={!canWrite}
                placeholder="Note visible to customer on the quote..."
                rows={4}
                style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 80 }}
              />
            </div>

            {/* Right: Pricing Summary */}
            <div style={cardStyle}>
              <div style={{ ...sectionPad, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SummaryRow label="Subtotal" value={fmtCurrency(subtotal)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Discount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>$</span>
                    <input
                      type="number"
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      disabled={!canWrite}
                      min={0} step={0.01}
                      style={{
                        ...fieldInputStyle, ...monoStyle,
                        width: 90, textAlign: 'right' as const, padding: '4px 8px', fontSize: 13,
                      }}
                    />
                  </div>
                </div>
                <SummaryRow
                  label={`Tax (${(taxRate * 100).toFixed(2)}%)`}
                  value={fmtCurrency(taxAmount)}
                />
                <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--text1)',
                      fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Total
                    </span>
                    <span style={{
                      ...monoStyle, fontSize: 22, fontWeight: 800, color: 'var(--green)',
                    }}>
                      {fmtCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Initial Concepts ──────────────────────────────────────────── */}
          <div style={{ marginTop: 24, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', borderBottom: savedConcepts.length > 0 ? '1px solid var(--border)' : 'none',
              background: 'rgba(139,92,246,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={15} style={{ color: 'var(--purple)' }} />
                <span style={{ fontSize: 13, fontWeight: 800, fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text1)' }}>
                  Initial Concepts
                </span>
                {conceptsSentAt && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)', borderRadius: 20, padding: '2px 8px' }}>
                    Concepts sent — awaiting customer selection
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {savedConcepts.length > 0 && (
                  <button
                    onClick={handleSendConcepts}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                      background: conceptsSentAt ? 'rgba(34,192,122,0.1)' : 'rgba(34,192,122,0.12)',
                      border: '1px solid rgba(34,192,122,0.35)',
                      color: 'var(--green)',
                    }}
                  >
                    <Send size={11} />
                    {conceptsSentAt ? 'Resend Portal Link' : 'Send Concepts to Customer'}
                  </button>
                )}
                <button
                  onClick={() => setShowConceptCreator(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: 'linear-gradient(135deg, rgba(79,127,255,0.15), rgba(139,92,246,0.15))',
                    border: '1px solid rgba(139,92,246,0.35)',
                    color: 'var(--purple)',
                  }}
                >
                  <Sparkles size={11} />
                  Generate Initial Concepts
                </button>
              </div>
            </div>

            {/* Concepts grid */}
            {savedConcepts.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <ImageIcon size={28} style={{ color: 'var(--text3)', margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>No concepts generated yet</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Generate quick concepts during the sales call — customer picks direction before design starts.</div>
              </div>
            ) : (
              <div style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {savedConcepts.map((url, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={url} alt={`Concept ${i + 1}`} style={{ width: '100%', display: 'block' }} />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '4px 8px', background: 'rgba(0,0,0,0.65)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: headingFont }}>Concept {i + 1}</span>
                        <button
                          onClick={() => handleRemoveConcept(url)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 2, display: 'flex' }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowConceptCreator(true)}
                    style={{
                      minHeight: 120, borderRadius: 8, border: '1px dashed var(--border)',
                      background: 'var(--surface2)', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Plus size={18} style={{ color: 'var(--text3)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', fontFamily: headingFont, textTransform: 'uppercase' }}>Add More</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'design' && (
        <div style={cardStyle}>
          <div style={sectionPad}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text1)', marginBottom: 12 }}>
              <Paintbrush size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              Design Notes
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {lineItemsList.map((li, idx) => (
                <div key={li.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, fontFamily: headingFont, textTransform: 'uppercase' as const }}>
                    {li.name || `Line Item ${idx + 1}`}
                  </div>
                  <textarea
                    value={li.specs?.designDetails || ''}
                    onChange={e => {
                      const updated = [...lineItemsList]
                      updated[idx] = { ...li, specs: { ...li.specs, designDetails: e.target.value } }
                      setLineItemsList(updated)
                    }}
                    onBlur={() => handleLineItemSave(lineItemsList[idx])}
                    disabled={!canWrite}
                    placeholder="Design instructions, colors, branding, files needed..."
                    rows={5}
                    style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 100, fontSize: 12 }}
                  />
                </div>
              ))}
            </div>
            {lineItemsList.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
                No line items yet. Add items in the Items tab to enter design notes.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'production' && (
        <div style={cardStyle}>
          <div style={sectionPad}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text1)', marginBottom: 12 }}>
              <Settings size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              Production Notes
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {lineItemsList.map((li, idx) => (
                <div key={li.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, fontFamily: headingFont, textTransform: 'uppercase' as const }}>
                    {li.name || `Line Item ${idx + 1}`}
                  </div>
                  <textarea
                    value={li.specs?.productionDetails || ''}
                    onChange={e => {
                      const updated = [...lineItemsList]
                      updated[idx] = { ...li, specs: { ...li.specs, productionDetails: e.target.value } }
                      setLineItemsList(updated)
                    }}
                    onBlur={() => handleLineItemSave(lineItemsList[idx])}
                    disabled={!canWrite}
                    placeholder="Print specs, material handling, lamination, cut notes..."
                    rows={5}
                    style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 100, fontSize: 12 }}
                  />
                </div>
              ))}
            </div>
            {lineItemsList.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
                No line items yet. Add items in the Items tab to enter production notes.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'install' && (
        <div style={cardStyle}>
          <div style={sectionPad}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text1)', marginBottom: 12 }}>
              <Wrench size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              Install Notes
            </div>
            {installDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'rgba(34,192,122,0.06)', borderRadius: 8, border: '1px solid rgba(34,192,122,0.15)' }}>
                <Calendar size={13} style={{ color: 'var(--green)' }} />
                <span style={{ fontSize: 13, color: 'var(--text1)' }}>
                  Install Date: <strong style={{ fontFamily: monoFont }}>{new Date(installDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {lineItemsList.map((li, idx) => (
                <div key={li.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, fontFamily: headingFont, textTransform: 'uppercase' as const }}>
                    {li.name || `Line Item ${idx + 1}`}
                  </div>
                  <textarea
                    value={li.specs?.installDetails || ''}
                    onChange={e => {
                      const updated = [...lineItemsList]
                      updated[idx] = { ...li, specs: { ...li.specs, installDetails: e.target.value } }
                      setLineItemsList(updated)
                    }}
                    onBlur={() => handleLineItemSave(lineItemsList[idx])}
                    disabled={!canWrite}
                    placeholder="Install instructions, special considerations, access notes..."
                    rows={5}
                    style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 100, fontSize: 12 }}
                  />
                </div>
              ))}
            </div>
            {lineItemsList.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
                No line items yet. Add items in the Items tab to enter install notes.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          <div style={cardStyle}>
            <div style={sectionPad}>
              <label style={fieldLabelStyle}>Internal Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={!canWrite}
                placeholder="Internal notes (not visible to customer)..."
                rows={8}
                style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 120 }}
              />
            </div>
          </div>
          <div style={cardStyle}>
            <div style={sectionPad}>
              <label style={fieldLabelStyle}>Customer Note</label>
              <textarea
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                disabled={!canWrite}
                placeholder="Note visible to customer..."
                rows={8}
                style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 120 }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 48, textAlign: 'center',
        }}>
          <div style={{ color: 'var(--text3)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Activity size={28} />
          </div>
          <div style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text2)',
            fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
          }}>
            Activity
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Activity log and change history for this quote.</div>
        </div>
      )}

      {/* ── Email Compose Modal ──────────────────────────────────────── */}
      <EmailComposeModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={async (data: EmailData) => {
          try {
            const res = await fetch('/api/estimates/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_id: project.id,
                to: data.to,
                subject: data.subject,
                message: data.message,
                sendVia: data.sendVia,
              }),
            })
            const result = await res.json()
            showToast(result.message || `Quote sent to ${data.to}`)
          } catch {
            showToast('Error sending quote')
          }
          setEmailModalOpen(false)
        }}
        recipientEmail={customerEmail}
        recipientName={customerName}
        senderName={profile.name}
        senderEmail={profile.email}
        estimateNumber={project.id.slice(-8)}
        estimateTotal={total}
        vehicleDescription={project.vehicle_desc || title}
        type={emailModalType}
      />

      {/* ── Concept Creator Modal ──────────────────────────────────────── */}
      <MockupCreator
        isOpen={showConceptCreator}
        onClose={() => setShowConceptCreator(false)}
        lineItemId={lineItemsList[0]?.id || project.id}
        specs={conceptSpecs}
        updateSpec={updateConceptSpec}
        vehicleInfo={conceptVehicleInfo}
      />

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 20px',
          color: 'var(--text1)', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
      <span style={{
        fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
        fontSize: 14, color: 'var(--text1)', fontWeight: 600,
      }}>
        {value}
      </span>
    </div>
  )
}

function GPMStat({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: headingFont }}>{label}</span>
      <div style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: bold ? 16 : 13, fontWeight: bold ? 800 : 600, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function CollapsibleHeader({
  icon, label, isOpen, onToggle, color,
}: {
  icon: React.ReactNode; label: string; isOpen: boolean; onToggle: () => void; color?: string
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        background: 'transparent', border: 'none', padding: '8px 0',
        cursor: 'pointer', color: color || 'var(--text2)',
      }}
    >
      <ChevronRight size={13} style={{
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
        color: 'var(--text3)',
      }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
        letterSpacing: '0.06em', fontFamily: headingFont,
      }}>
        {label}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════════════════════

function VehicleAutocomplete({
  specs, updateSpec, handleBlur, canWrite, onVehicleSelect,
}: {
  specs: LineItemSpecs
  updateSpec: (key: string, value: unknown) => void
  handleBlur: () => void
  canWrite: boolean
  onVehicleSelect: (v: VehicleEntry) => void
}) {
  const [makeOpen, setMakeOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [makeFilter, setMakeFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const makeRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) setMakeOpen(false)
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentMake = (specs.vehicleMake as string) || ''
  const currentModel = (specs.vehicleModel as string) || ''

  const filteredMakes = makeFilter
    ? ALL_MAKES.filter(m => m.toLowerCase().includes(makeFilter.toLowerCase()))
    : ALL_MAKES

  const availableModels = currentMake ? getModelsForMake(currentMake) : []
  const filteredModels = modelFilter
    ? availableModels.filter(m => m.toLowerCase().includes(modelFilter.toLowerCase()))
    : availableModels

  function selectMake(make: string) {
    updateSpec('vehicleMake', make)
    setMakeOpen(false)
    setMakeFilter('')
    if (make !== currentMake) {
      updateSpec('vehicleModel', '')
    }
  }

  function selectModel(model: string) {
    updateSpec('vehicleModel', model)
    setModelOpen(false)
    setModelFilter('')
    const v = findVehicle(currentMake, model, specs.vehicleYear as string)
    if (v) onVehicleSelect(v)
    handleBlur()
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, marginTop: 2, maxHeight: 200, overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  }
  const optionStyle: React.CSSProperties = {
    padding: '7px 12px', fontSize: 12, color: 'var(--text1)', cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Car size={11} style={{ color: 'var(--accent)' }} /> Vehicle Info
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
        <div>
          <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Year</label>
          <input
            value={specs.vehicleYear || ''}
            onChange={e => updateSpec('vehicleYear', e.target.value)}
            onBlur={() => {
              if (currentMake && currentModel) {
                const v = findVehicle(currentMake, currentModel, specs.vehicleYear as string)
                if (v) onVehicleSelect(v)
              }
              handleBlur()
            }}
            style={{ ...fieldInputStyle, fontSize: 12 }}
            disabled={!canWrite}
            placeholder="2024"
          />
        </div>
        <div ref={makeRef} style={{ position: 'relative' }}>
          <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Make</label>
          <input
            value={makeOpen ? makeFilter : currentMake}
            onChange={e => { setMakeFilter(e.target.value); if (!makeOpen) setMakeOpen(true) }}
            onFocus={() => setMakeOpen(true)}
            style={{ ...fieldInputStyle, fontSize: 12 }}
            disabled={!canWrite}
            placeholder="Search makes..."
          />
          {makeOpen && filteredMakes.length > 0 && (
            <div style={dropdownStyle}>
              {filteredMakes.map(m => (
                <div key={m} style={optionStyle}
                  onMouseDown={() => selectMake(m)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>
        <div ref={modelRef} style={{ position: 'relative' }}>
          <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Model</label>
          <input
            value={modelOpen ? modelFilter : currentModel}
            onChange={e => { setModelFilter(e.target.value); if (!modelOpen) setModelOpen(true) }}
            onFocus={() => { if (currentMake) setModelOpen(true) }}
            style={{ ...fieldInputStyle, fontSize: 12 }}
            disabled={!canWrite || !currentMake}
            placeholder={currentMake ? 'Search models...' : 'Select make first'}
          />
          {modelOpen && filteredModels.length > 0 && (
            <div style={dropdownStyle}>
              {filteredModels.map(m => {
                const v = findVehicle(currentMake, m)
                return (
                  <div key={m} style={{ ...optionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseDown={() => selectModel(m)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span>{m}</span>
                    {v && v.sqft > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: monoFont }}>
                        {v.sqft}sqft · ${v.basePrice}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div>
          <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Color</label>
          <input
            value={specs.vehicleColor || ''}
            onChange={e => updateSpec('vehicleColor', e.target.value)}
            onBlur={handleBlur}
            style={{ ...fieldInputStyle, fontSize: 12 }}
            disabled={!canWrite}
            placeholder="White"
          />
        </div>
      </div>
      {currentMake && currentModel && (() => {
        const v = findVehicle(currentMake, currentModel, specs.vehicleYear as string)
        if (!v || v.sqft === 0) return null
        return (
          <div style={{
            display: 'flex', gap: 12, marginTop: 6, padding: '4px 10px',
            background: 'rgba(34,192,122,0.06)', borderRadius: 6,
            border: '1px solid rgba(34,192,122,0.12)', alignItems: 'center',
          }}>
            <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
              PVO Data
            </span>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>{v.sqft} sqft</span>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>${v.basePrice}</span>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>{v.installHours}hrs</span>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{v.tier.replace('_', ' ')}</span>
          </div>
        )
      })()}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINE ITEM CARD
// ═══════════════════════════════════════════════════════════════════════════════

function LineItemCard({
  item, index, canWrite, onChange, onBlurSave, onRemove,
  expandedSections, onToggleSection, leadType, team,
}: {
  item: LineItem; index: number; canWrite: boolean
  onChange: (item: LineItem) => void; onBlurSave: (item: LineItem) => void; onRemove: () => void
  expandedSections: Record<string, boolean>; onToggleSection: (section: string) => void
  leadType: string; team: { id: string; name: string; role: string }[]
}) {
  const latestRef = useRef(item)
  latestRef.current = item

  const [showDescription, setShowDescription] = useState(!!item.description)
  const [isCardExpanded, setIsCardExpanded] = useState(item.id.startsWith('new-'))

  function updateField<K extends keyof LineItem>(key: K, value: LineItem[K]) {
    const updated = { ...latestRef.current, [key]: value }
    if (key === 'quantity' || key === 'unit_price' || key === 'unit_discount') {
      updated.total_price = (updated.quantity * updated.unit_price) - updated.unit_discount
    }
    onChange(updated)
  }

  function updateSpec(key: string, value: unknown) {
    const updated = { ...latestRef.current, specs: { ...latestRef.current.specs, [key]: value } }
    onChange(updated)
  }

  function handleBlur() {
    onBlurSave(latestRef.current)
  }

  function handleCategoryChange(catKey: string) {
    const cat = VEHICLE_CATEGORIES[catKey]
    if (!cat) return
    const current = latestRef.current
    const newSpecs = { ...current.specs, vehicleType: catKey, estimatedHours: cat.estimatedHours }
    const newPrice = cat.flatRate > 0 ? cat.flatRate : current.unit_price
    const updated: LineItem = {
      ...current,
      unit_price: newPrice,
      total_price: (current.quantity * newPrice) - current.unit_discount,
      specs: newSpecs,
    }
    onChange(updated)
  }

  const specs = item.specs as LineItemSpecs
  const gpm = calcGPM(item, leadType)
  const badge = gpmBadge(gpm.gpm)
  const vehicleDesc = [specs.vehicleYear, specs.vehicleMake, specs.vehicleModel].filter(Boolean).join(' ')

  const productTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
    wrap:    { label: 'WRAP',    color: 'var(--accent)', bg: 'rgba(79,127,255,0.12)' },
    ppf:     { label: 'PPF',     color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.12)' },
    decking: { label: 'DECKING', color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)' },
    design:  { label: 'DESIGN',  color: 'var(--purple)', bg: 'rgba(139,92,246,0.12)' },
  }
  const ptc = productTypeConfig[item.product_type] || { label: item.product_type.toUpperCase(), color: 'var(--text3)', bg: 'rgba(90,96,128,0.12)' }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* ── Header Row ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <button
            onClick={() => setIsCardExpanded(!isCardExpanded)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', padding: 2, display: 'flex', alignItems: 'center',
            }}
          >
            <ChevronRight size={14} style={{
              transform: isCardExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }} />
          </button>
          <span style={{
            ...monoStyle, fontSize: 12, color: 'var(--text3)', fontWeight: 700, minWidth: 20,
          }}>
            {index + 1}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
            borderRadius: 4, fontSize: 10, fontWeight: 800,
            letterSpacing: '0.05em', fontFamily: headingFont,
            color: ptc.color, background: ptc.bg,
          }}>
            {ptc.label}
          </span>
          <span style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text1)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>
            {item.name || 'Untitled Item'}
          </span>
          {vehicleDesc && (
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              -- {vehicleDesc}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <span style={{
            ...monoStyle, fontSize: 16, fontWeight: 800, color: 'var(--text1)',
          }}>
            {fmtCurrency(item.total_price)}
          </span>
          {canWrite && (
            <button
              onClick={onRemove}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 4, display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded Content ───────────────────────────────────────────── */}
      <div style={{
        maxHeight: isCardExpanded ? 3000 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 16px 16px' }}>

          {/* ── Core Fields Row ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_80px_120px_120px]" style={{ gap: 10, marginTop: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Product Name</label>
              <input
                value={item.name}
                onChange={e => updateField('name', e.target.value)}
                onBlur={handleBlur}
                style={fieldInputStyle}
                disabled={!canWrite}
                placeholder="e.g. Full Body Wrap"
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Category</label>
              <select
                value={(specs.vehicleType as string) || ''}
                onChange={e => handleCategoryChange(e.target.value)}
                onBlur={handleBlur}
                style={fieldSelectStyle}
                disabled={!canWrite}
              >
                <option value="">Select Category</option>
                {Object.entries(
                  Object.entries(VEHICLE_CATEGORIES).reduce((groups, [key, cat]) => {
                    if (!groups[cat.group]) groups[cat.group] = []
                    groups[cat.group].push({ key, ...cat })
                    return groups
                  }, {} as Record<string, (VehicleCategory & { key: string })[]>)
                ).map(([group, cats]) => (
                  <optgroup key={group} label={group}>
                    {cats.map(cat => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}{cat.flatRate > 0 ? ` ($${cat.flatRate}/${cat.estimatedHours}h)` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>Qty</label>
              <input
                type="number"
                value={item.quantity}
                onChange={e => updateField('quantity', Number(e.target.value))}
                onBlur={handleBlur}
                style={{ ...fieldInputStyle, ...monoStyle, textAlign: 'center' as const }}
                disabled={!canWrite}
                min={0} step={1}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Unit Price</label>
              <input
                type="number"
                value={item.unit_price}
                onChange={e => updateField('unit_price', Number(e.target.value))}
                onBlur={handleBlur}
                style={{ ...fieldInputStyle, ...monoStyle, textAlign: 'right' as const }}
                disabled={!canWrite}
                min={0} step={0.01}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Total</label>
              <div style={{
                ...monoStyle,
                padding: '7px 10px', fontSize: 14, fontWeight: 700,
                color: 'var(--text1)', textAlign: 'right' as const,
                background: 'rgba(34,192,122,0.06)', borderRadius: 6,
                border: '1px solid rgba(34,192,122,0.15)',
              }}>
                {fmtCurrency(item.total_price)}
              </div>
            </div>
          </div>

          {/* ── Quick Specs Row ─────────────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 16, marginTop: 10, padding: '6px 0',
            fontSize: 12, color: 'var(--text2)',
          }}>
            {specs.wrapType && (
              <span>Wrap Type: <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{specs.wrapType}</span></span>
            )}
            {specs.vinylType && (
              <span>Material: <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{specs.vinylType}</span></span>
            )}
            {specs.vinylArea && (
              <span>Sqft: <span style={{ ...monoStyle, color: 'var(--text1)', fontWeight: 600 }}>{specs.vinylArea}</span></span>
            )}
          </div>

          {/* ── Vehicle Quick-Select Grid ───────────────────────────────── */}
          {specs.vehicleType && ['small_car', 'med_car', 'full_car', 'sm_truck', 'med_truck', 'full_truck', 'med_van', 'large_van'].includes(specs.vehicleType as string) && (
            <div style={{
              marginTop: 12, padding: 14, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <Car size={12} style={{ color: 'var(--accent)' }} /> Vehicle Size -- Quick Select
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9" style={{ gap: 6 }}>
                {Object.entries(VEHICLE_CATEGORIES).filter(([, cat]) => ['Cars', 'Trucks', 'Vans'].includes(cat.group)).map(([key, cat]) => {
                  const isSelected = (specs.vehicleType as string) === key
                  return (
                    <button
                      key={key}
                      onClick={() => { if (canWrite) handleCategoryChange(key) }}
                      style={{
                        padding: '8px 4px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'default',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
                        textAlign: 'center' as const, minHeight: 44,
                        display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text2)', lineHeight: 1.2 }}>
                        {cat.label}
                      </div>
                      <div style={{ fontFamily: monoFont, fontSize: 12, fontWeight: 800, color: isSelected ? 'var(--accent)' : 'var(--text1)' }}>
                        ${cat.flatRate}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text3)' }}>
                        {cat.estimatedHours}h
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Add Description Link ───────────────────────────────────── */}
          {!showDescription && (
            <button
              onClick={() => setShowDescription(true)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--accent)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginTop: 4,
              }}
            >
              + Add Description For Customer
            </button>
          )}
          {showDescription && (
            <div style={{ marginTop: 8 }}>
              <label style={fieldLabelStyle}>Customer Description</label>
              <textarea
                value={item.description || ''}
                onChange={e => updateField('description', e.target.value)}
                onBlur={handleBlur}
                style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 50 }}
                disabled={!canWrite}
                placeholder="Description visible on the estimate..."
                rows={2}
              />
            </div>
          )}

          {/* ═══ GPM PRICING ENGINE (Collapsible) ═══ */}
          <div style={{ marginTop: 14 }}>
            <CollapsibleHeader
              icon={<Calculator size={13} style={{ color: 'var(--green)' }} />}
              label="GPM Pricing Engine"
              isOpen={expandedSections.gpm ?? false}
              onToggle={() => onToggleSection('gpm')}
              color="var(--text2)"
            />
            <div style={{
              maxHeight: expandedSections.gpm ? 400 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.2s ease',
            }}>
              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 16, marginTop: 4,
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 12, fontSize: 13 }}>
                  <GPMStat label="Sale" value={fmtCurrency(gpm.sale)} color="var(--text1)" />
                  <GPMStat label="Material" value={fmtCurrency(gpm.materialCost)} color="var(--red)" />
                  <GPMStat
                    label="Install"
                    value={`${fmtCurrency(gpm.laborCost)} (${gpm.estimatedHours}h x $${LABOR_RATE}/hr)`}
                    color="var(--amber)"
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 12, fontSize: 13 }}>
                  <GPMStat label="Design" value={fmtCurrency(gpm.designFee)} color="var(--purple)" />
                  <GPMStat label="Misc" value={fmtCurrency(gpm.miscCost)} color="var(--text3)" />
                  <GPMStat label="COGS" value={fmtCurrency(gpm.cogs)} color="var(--red)" bold />
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
                  paddingTop: 12, borderTop: '1px solid var(--border)',
                }}>
                  <GPMStat label="GP" value={fmtCurrency(gpm.gp)} color="var(--green)" bold />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: headingFont }}>GPM</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{
                        fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
                        fontSize: 18, fontWeight: 800, color: badge.color,
                      }}>
                        {fmtPercent(gpm.gpm)}
                      </span>
                      <span style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                        fontFamily: headingFont, textTransform: 'uppercase' as const,
                        color: badge.color, background: badge.bg,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  <GPMStat
                    label="Commission"
                    value={`${fmtCurrency(gpm.commission)} (${(gpm.commissionRate * 100).toFixed(1)}% rate)`}
                    color="var(--cyan)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ PRICING BREAKDOWN (Collapsible) ═══ */}
          <div style={{ marginTop: 6 }}>
            <CollapsibleHeader
              icon={<DollarSign size={13} style={{ color: 'var(--amber)' }} />}
              label="Pricing Breakdown"
              isOpen={expandedSections.pricing ?? false}
              onToggle={() => onToggleSection('pricing')}
              color="var(--text2)"
            />
            <div style={{
              maxHeight: expandedSections.pricing ? 500 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.2s ease',
            }}>
              <div style={{ padding: '8px 0' }}>
                {/* Material Totals */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paintbrush size={11} style={{ color: 'var(--purple)' }} /> Material Totals
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material Cost</label>
                      <input type="number" value={specs.materialCost || ''} onChange={e => updateSpec('materialCost', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...monoStyle, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vinyl Type</label>
                      <input value={specs.vinylType || ''} onChange={e => updateSpec('vinylType', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vinyl Area (sqft)</label>
                      <input type="number" value={specs.vinylArea || ''} onChange={e => updateSpec('vinylArea', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...monoStyle, fontSize: 12 }} disabled={!canWrite} min={0} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Laminate</label>
                      <input value={specs.laminate || ''} onChange={e => updateSpec('laminate', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} />
                    </div>
                  </div>
                </div>
                {/* Labor Totals */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wrench size={11} style={{ color: 'var(--amber)' }} /> Labor Totals
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Est. Hours</label>
                      <input type="number" value={(specs.estimatedHours as number) || ''} onChange={e => updateSpec('estimatedHours', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...monoStyle, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Labor Rate ($/hr)</label>
                      <div style={{ ...monoStyle, padding: '7px 10px', fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        ${LABOR_RATE}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Labor Cost</label>
                      <div style={{ ...monoStyle, padding: '7px 10px', fontSize: 12, color: 'var(--amber)', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {fmtCurrency(gpm.laborCost)}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Design Fee</label>
                      <input type="number" value={(specs.designFee as number) ?? DESIGN_FEE_DEFAULT} onChange={e => updateSpec('designFee', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...monoStyle, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ ADDITIONAL INFO (Collapsible) ═══ */}
          <div style={{ marginTop: 6 }}>
            <CollapsibleHeader
              icon={<FileText size={13} style={{ color: 'var(--cyan)' }} />}
              label="Additional Info"
              isOpen={expandedSections.additional ?? false}
              onToggle={() => onToggleSection('additional')}
              color="var(--text2)"
            />
            <div style={{
              maxHeight: expandedSections.additional ? 500 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.2s ease',
            }}>
              <div style={{ padding: '8px 0' }}>
                <VehicleAutocomplete
                  specs={specs}
                  updateSpec={updateSpec}
                  handleBlur={handleBlur}
                  canWrite={canWrite}
                  onVehicleSelect={(v) => {
                    const updated = { ...latestRef.current }
                    const newSpecs = { ...updated.specs, vinylArea: v.sqft, vehicleYear: String(v.year), vehicleMake: v.make, vehicleModel: v.model }
                    if (v.basePrice > 0) {
                      updated.unit_price = v.basePrice
                      updated.total_price = (updated.quantity * v.basePrice) - updated.unit_discount
                      newSpecs.estimatedHours = v.installHours
                    }
                    updated.specs = newSpecs
                    onChange(updated)
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Internal Notes</label>
                    <textarea
                      value={specs.notes || ''}
                      onChange={e => updateSpec('notes', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Internal notes for this line item..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Wrap Type</label>
                    <input
                      value={specs.wrapType || ''}
                      onChange={e => updateSpec('wrapType', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Full Wrap, Partial, etc."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
