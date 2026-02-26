'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Send, CheckCircle2, FileText, Plus,
  Trash2, Car, Paintbrush, ChevronDown, ChevronRight,
  ArrowRight, Copy, AlertTriangle, MoreHorizontal, FileDown, Ban,
  Layers, Mail, Calendar, User, Users, Briefcase, DollarSign,
  ClipboardList, Activity,
  ToggleLeft, ToggleRight, Wrench, CircleDot,
  TrendingUp, Calculator, Settings,
  Package, Image, Link2, UserPlus, Ruler,
  FoldVertical, UnfoldVertical,
  GripVertical, Upload, Camera, Loader2,
} from 'lucide-react'
import type { Profile, Estimate, LineItem, LineItemSpecs, EstimateStatus } from '@/types'
import AreaCalculatorModal from '@/components/estimates/AreaCalculatorModal'
import WrapZoneSelector from '@/components/estimates/WrapZoneSelector'
import DeckingCalculator from '@/components/estimates/DeckingCalculator'
import PhotoInspection from '@/components/estimates/PhotoInspection'
import MockupCreator from '@/components/estimates/MockupCreator'
import EstimateCalculators from '@/components/estimates/EstimateCalculators'
import ProposalBuilder from '@/components/estimates/ProposalBuilder'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import EmailComposeModal, { type EmailData } from '@/components/shared/EmailComposeModal'
import PanelSelector from '@/components/vehicle/PanelSelector'
import type { Panel } from '@/components/vehicle/PanelSelector'
import VinLookupField from '@/components/shared/VinLookupField'
import VehicleLookupModal from '@/components/VehicleLookupModal'
import type { MeasurementResult } from '@/components/VehicleMeasurementPicker'
import vehiclesData from '@/lib/data/vehicles.json'

// ─── Tier-to-panel-key mapping ───────────────────────────────────────────────
const TIER_TO_PANEL_KEY: Record<string, string> = {
  small_car: 'sedan',
  med_car: 'sedan',
  full_car: 'suv_mid',
  sm_truck: 'pickup_regular',
  med_truck: 'pickup_crew',
  full_truck: 'pickup_crew',
  med_van: 'cargo_van_standard',
  large_van: 'cargo_van_standard',
  van: 'cargo_van_standard',
  high_roof_van: 'cargo_van_high_roof',
  truck: 'pickup_crew',
  box_truck: 'box_truck_16',
  trailer: 'trailer_48',
}

// ─── Vehicle Database ────────────────────────────────────────────────────────────

interface VehicleEntry {
  year: number; make: string; model: string; sqft: number
  basePrice: number; installHours: number; tier: string
}

const VEHICLES_DB: VehicleEntry[] = vehiclesData as VehicleEntry[]
const ALL_MAKES = [...new Set(VEHICLES_DB.map(v => v.make))].sort()
const ALL_YEARS = [...new Set(VEHICLES_DB.map(v => v.year))].sort((a, b) => b - a)

function getModelsForMake(make: string): string[] {
  return [...new Set(VEHICLES_DB.filter(v => v.make === make).map(v => v.model))].sort()
}

function getMakesForYear(year: number): string[] {
  return [...new Set(VEHICLES_DB.filter(v => v.year === year).map(v => v.make))].sort()
}

function getModelsForMakeYear(make: string, year: number): string[] {
  return [...new Set(VEHICLES_DB.filter(v => v.make === make && v.year === year).map(v => v.model))].sort()
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
  custom:       { label: 'Custom',        flatRate: 0,    estimatedHours: 0,  group: 'Other' }
}

// â”€â”€â”€ Commercial Vehicle 3Ã—3 Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CVGridCell {
  key: string; size: 'Compact' | 'Mid' | 'Full'
  coverage: 'Partial' | 'Full Wrap' | 'Chrome Delete'
  price: number; estimatedHours: number; vehicleType: string
}
const COMMERCIAL_VEHICLE_GRID: CVGridCell[] = [
  { key: 'compact_partial', size: 'Compact', coverage: 'Partial',       price: 500, estimatedHours: 14, vehicleType: 'small_car' },
  { key: 'compact_full',    size: 'Compact', coverage: 'Full Wrap',     price: 525, estimatedHours: 14, vehicleType: 'small_car' },
  { key: 'compact_chrome',  size: 'Compact', coverage: 'Chrome Delete', price: 625, estimatedHours: 12, vehicleType: 'small_car' },
  { key: 'mid_partial',     size: 'Mid',     coverage: 'Partial',       price: 525, estimatedHours: 16, vehicleType: 'med_car'   },
  { key: 'mid_full',        size: 'Mid',     coverage: 'Full Wrap',     price: 550, estimatedHours: 16, vehicleType: 'med_car'   },
  { key: 'mid_chrome',      size: 'Mid',     coverage: 'Chrome Delete', price: 625, estimatedHours: 14, vehicleType: 'med_car'   },
  { key: 'full_partial',    size: 'Full',    coverage: 'Partial',       price: 550, estimatedHours: 17, vehicleType: 'full_car'  },
  { key: 'full_full',       size: 'Full',    coverage: 'Full Wrap',     price: 575, estimatedHours: 17, vehicleType: 'full_car'  },
  { key: 'full_chrome',     size: 'Full',    coverage: 'Chrome Delete', price: 625, estimatedHours: 16, vehicleType: 'full_car'  },
]

// â”€â”€â”€ Product Type Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PRODUCT_TYPE_OPTIONS = [
  { key: 'commercial_vehicle', label: 'Commercial Vehicle', vehicleType: 'med_car',  calcType: '',        productType: 'wrap'    as const, color: '#4f7fff' },
  { key: 'box_truck',          label: 'Box Truck',          vehicleType: 'box_truck', calcType: '',        productType: 'wrap'    as const, color: '#4f7fff' },
  { key: 'trailer',            label: 'Trailer',            vehicleType: 'trailer',   calcType: '',        productType: 'wrap'    as const, color: '#f59e0b' },
  { key: 'marine',             label: 'Marine',             vehicleType: 'marine',    calcType: 'marine',  productType: 'wrap'    as const, color: '#22d3ee' },
  { key: 'ppf',                label: 'PPF',                vehicleType: 'ppf',       calcType: '',        productType: 'ppf'     as const, color: '#22d3ee' },
  { key: 'boat_decking',       label: 'Boat Decking',       vehicleType: 'marine',    calcType: 'decking', productType: 'decking' as const, color: '#22c07a' },
  { key: 'wall_wrap',          label: 'Wall Wrap',          vehicleType: 'custom',    calcType: 'wall',    productType: 'wrap'    as const, color: '#8b5cf6' },
  { key: 'signage',            label: 'Signage',            vehicleType: 'custom',    calcType: 'signage', productType: 'wrap'    as const, color: '#f59e0b' },
  { key: 'apparel',            label: 'Apparel',            vehicleType: 'custom',    calcType: '',        productType: 'wrap'    as const, color: '#22d3ee' },
  { key: 'print_media',        label: 'Print',              vehicleType: 'custom',    calcType: '',        productType: 'wrap'    as const, color: '#9299b5' },
  { key: 'custom',             label: 'Custom',             vehicleType: 'custom',    calcType: '',        productType: 'wrap'    as const, color: '#8b5cf6' },
]

const SIGNAGE_TYPES = [
  'Banners', 'Yard Signs', 'Coroplast', 'Aluminum Signs',
  'Retractable Banners', 'A-Frame', 'Window Graphics', 'Floor Graphics',
  'Canvas Prints', 'Foam Board',
]

const WALL_WRAP_MATERIALS = [
  { key: 'standard', label: 'Standard Vinyl', costPerSqft: 1.50 },
  { key: 'premium', label: 'Premium Vinyl', costPerSqft: 2.50 },
  { key: 'fabric', label: 'Fabric Wall Covering', costPerSqft: 3.50 },
]

const SIGNAGE_MATERIALS = [
  { key: 'vinyl_banner', label: 'Vinyl Banner (13oz)', costPerSqft: 1.20 },
  { key: 'mesh_banner', label: 'Mesh Banner', costPerSqft: 1.80 },
  { key: 'coroplast', label: 'Coroplast (4mm)', costPerSqft: 2.00 },
  { key: 'aluminum', label: 'Aluminum (.040)', costPerSqft: 4.50 },
  { key: 'acm', label: 'ACM Panel', costPerSqft: 6.00 },
  { key: 'foam_board', label: 'Foam Board', costPerSqft: 1.50 },
]

const STATUS_CONFIG: Record<EstimateStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'DRAFT',    color: 'var(--text3)',  bg: 'rgba(90,96,128,0.18)' },
  sent:     { label: 'SENT',     color: 'var(--accent)', bg: 'rgba(79,127,255,0.18)' },
  viewed:   { label: 'VIEWED',   color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.18)' },
  accepted: { label: 'ACCEPTED', color: 'var(--green)',  bg: 'rgba(34,192,122,0.18)' },
  declined: { label: 'DECLINED', color: 'var(--red)',    bg: 'rgba(242,90,90,0.18)' },
  expired:  { label: 'EXPIRED',  color: 'var(--amber)',  bg: 'rgba(245,158,11,0.18)' },
  rejected: { label: 'REJECTED', color: 'var(--red)',    bg: 'rgba(242,90,90,0.18)' },
  void:     { label: 'VOID',     color: 'var(--text3)',  bg: 'rgba(90,96,128,0.12)' },
}

type TabKey = 'items' | 'photos' | 'calculators' | 'design' | 'production' | 'install' | 'notes' | 'activity' | 'proposal'

// ─── Demo data ──────────────────────────────────────────────────────────────────

const DEMO_ESTIMATE = {
  id: 'demo-est-1', org_id: '', estimate_number: '1001', title: 'Ford F-150 Full Wrap + PPF',
  customer_id: null, status: 'draft', sales_rep_id: null, production_manager_id: null,
  project_manager_id: null, quote_date: '2026-02-18', due_date: '2026-03-01',
  subtotal: 5000, discount: 0, tax_rate: DEFAULT_TAX_RATE, tax_amount: 412.50, total: 5412.50,
  notes: 'Matte black full wrap with chrome delete + PPF hood and fenders', customer_note: null,
  division: 'wraps', form_data: {}, created_at: '2026-02-18T10:00:00Z',
  updated_at: '2026-02-18T10:00:00Z',
  customer: { id: 'c1', name: 'Mike Johnson', email: 'mike@example.com' },
  sales_rep: { id: 's1', name: 'Tyler Reid' },
} as Estimate

const DEMO_LINE_ITEMS: LineItem[] = [
  {
    id: 'li-1', parent_type: 'estimate', parent_id: 'demo-est-1', product_type: 'wrap',
    name: 'Printed Vehicle Wrap', description: 'Full printed wrap on 2024 Ford F-150',
    quantity: 1, unit_price: 3200, unit_discount: 0, total_price: 3200,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', vehicleType: 'full_truck', wrapType: 'Full Wrap',
      vinylType: '3M IJ180Cv3', laminate: '3M 8910',
      windowPerf: false, vinylArea: 280, perfArea: 0, complexity: 3,
      materialCost: 450, laborCost: 510, laborPrice: 510, machineCost: 0,
      estimatedHours: 17, designFee: 150,
    },
    sort_order: 0, created_at: '2026-02-18T10:00:00Z',
  },
  {
    id: 'li-2', parent_type: 'estimate', parent_id: 'demo-est-1', product_type: 'ppf',
    name: 'PPF -- Hood & Fenders Package', description: 'XPEL Ultimate Plus hood and fender protection',
    quantity: 1, unit_price: 1800, unit_discount: 0, total_price: 1800,
    specs: {
      vehicleYear: '2024', vehicleMake: 'Ford', vehicleModel: 'F-150',
      vehicleColor: 'White', vehicleType: 'ppf', wrapType: 'Paint Protection Film',
      vinylType: 'XPEL Ultimate Plus', laminate: 'N/A',
      windowPerf: false, vinylArea: 45, perfArea: 0, complexity: 4,
      materialCost: 600, laborCost: 120, laborPrice: 120, machineCost: 0,
      estimatedHours: 4, designFee: 0,
    },
    sort_order: 1, created_at: '2026-02-18T10:00:00Z',
  },
]

// ─── Style Constants ────────────────────────────────────────────────────────────

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 16,
  padding: 0,
  overflow: 'hidden',
  transition: 'border-color 0.2s',
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
  padding: '8px 12px',
  background: 'var(--bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 10,
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

// Calculator "gadget" panel style
const gadgetStyle: React.CSSProperties = {
  marginTop: 12, padding: 14,
  background: 'linear-gradient(145deg, var(--bg) 0%, rgba(13,15,20,0.95) 100%)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
}

const gadgetHeaderStyle: React.CSSProperties = {
  ...fieldLabelStyle,
  marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
}

const gadgetOutputStyle: React.CSSProperties = {
  display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px',
  borderRadius: 8, fontSize: 12, alignItems: 'center',
  border: '1px solid rgba(255,255,255,0.04)',
}

// ─── Helper Functions ───────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)
}

function fmtPercent(n: number): string {
  return `${n.toFixed(1)}%`
}

const COMMISSION_RATES: Record<string, { base: number; max: number; bonuses: boolean }> = {
  inbound:  { base: 0.045, max: 0.075, bonuses: true },
  outbound: { base: 0.07,  max: 0.10,  bonuses: true },
  presold:  { base: 0.05,  max: 0.05,  bonuses: false },
  referral: { base: 0.045, max: 0.075, bonuses: true },
  walk_in:  { base: 0.045, max: 0.075, bonuses: true },
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
  // Protection: if GPM < 65%, base rate only, no bonuses
  const protected_ = gpm < 65
  let commissionRate = rates.base
  // Apply bonuses if eligible and not protected
  if (!protected_ && rates.bonuses) {
    if (gpm > 73) commissionRate += 0.02  // +2% high GPM bonus
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

interface Props {
  profile: Profile
  estimate: Estimate | null
  employees: any[]
  customers: any[]
  isNew?: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function EstimateDetailClient({ profile, estimate, employees, customers, isNew }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isNewEstimate = !!isNew

  const isDemo = !estimate && !isNew
  const est = isNew ? {
    ...DEMO_ESTIMATE,
    id: `new-${Date.now()}`,
    title: 'New Estimate',
    estimate_number: '',
    subtotal: 0, discount: 0, tax_rate: DEFAULT_TAX_RATE, tax_amount: 0, total: 0,
    notes: '', customer_note: null, customer: null, sales_rep: null,
    sales_rep_id: profile.id, org_id: profile.org_id,
    quote_date: new Date().toISOString().split('T')[0],
    line_items: [],
  } : (estimate || DEMO_ESTIMATE)
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : est.id)
  const estimateId = savedId || est.id
  const team = employees as Pick<Profile, 'id' | 'name' | 'role'>[]
  const initialLineItems = est.line_items && est.line_items.length > 0
    ? est.line_items
    : isDemo ? DEMO_LINE_ITEMS : []

  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  // ─── State ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(est.title)
  const [status, setStatus] = useState<EstimateStatus>(est.status)
  const [notes, setNotes] = useState(est.notes || '')
  const [customerNote, setCustomerNote] = useState(est.customer_note || '')
  const [discount, setDiscount] = useState(est.discount)
  const [taxRate, setTaxRate] = useState(est.tax_rate)
  const [quoteDate, setQuoteDate] = useState(est.quote_date || '')
  const [dueDate, setDueDate] = useState(est.due_date || '')
  const [installDate, setInstallDate] = useState((est.form_data?.installDate as string) || '')
  const [lineItemsList, setLineItemsList] = useState<LineItem[]>(initialLineItems)
  const [activeTab, setActiveTab] = useState<TabKey>('items')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [showAllInfo, setShowAllInfo] = useState(false)
  const [proposalMode, setProposalMode] = useState(false)
  const [proposalOptions, setProposalOptions] = useState<{ label: string; itemIds: string[] }[]>(
    (est.form_data?.proposalOptions as { label: string; itemIds: string[] }[]) || []
  )
  const [salesRepId, setSalesRepId] = useState(est.sales_rep_id || '')
  const [prodMgrId, setProdMgrId] = useState(est.production_manager_id || '')
  const [projMgrId, setProjMgrId] = useState(est.project_manager_id || '')
  const [leadType, setLeadType] = useState<string>((est.form_data?.leadType as string) || 'inbound')
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailModalType, setEmailModalType] = useState<'estimate' | 'invoice' | 'proof' | 'general'>('estimate')

  // Collapsible sections per line item
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({})

  // Products from DB
  const [products, setProducts] = useState<{ id: string; name: string; category: string; calculator_type: string; default_price: number; default_hours: number; description: string }[]>([])

  // Area calculator
  const [areaCalcOpen, setAreaCalcOpen] = useState(false)
  const [areaCalcItemId, setAreaCalcItemId] = useState<string | null>(null)

  // Templates
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string; line_items: unknown[] }[]>([])
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false)
  const templateMenuRef = useRef<HTMLDivElement>(null)

  const moreMenuRef = useRef<HTMLDivElement>(null)
  const pdfMenuRef = useRef<HTMLDivElement>(null)

  // ─── Auto-add first line item for new estimates ────────────────────────────
  const didAutoAdd = useRef(false)
  useEffect(() => {
    if (isNewEstimate && !isDemo && lineItemsList.length === 0 && !didAutoAdd.current) {
      didAutoAdd.current = true
      addNewLineItem()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewEstimate, isDemo])

  // ─── Load products + templates from DB ──────────────────────────────────────
  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from('products')
        .select('id, name, category, calculator_type, default_price, default_hours, description')
        .eq('active', true)
        .order('sort_order')
      if (data) setProducts(data)
    }
    async function loadTemplates() {
      const { data } = await supabase
        .from('estimate_templates')
        .select('id, name, description, line_items')
        .order('use_count', { ascending: false })
        .limit(20)
      if (data) setTemplates(data as typeof templates)
    }
    loadProducts().catch(() => {})
    loadTemplates().catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Close menus on outside click ───────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setPdfMenuOpen(false)
      }
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setTemplateMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Calculations ───────────────────────────────────────────────────────────
  const subtotal = useMemo(() => lineItemsList.reduce((s, li) => s + li.total_price, 0), [lineItemsList])
  const taxAmount = useMemo(() => (subtotal - discount) * taxRate, [subtotal, discount, taxRate])
  const total = useMemo(() => subtotal - discount + taxAmount, [subtotal, discount, taxAmount])

  // Aggregate GP / COGS / commission across all line items
  const totalCOGS = useMemo(() => lineItemsList.reduce((s, li) => s + calcGPM(li, leadType).cogs, 0), [lineItemsList, leadType])
  const totalGP = useMemo(() => subtotal - totalCOGS, [subtotal, totalCOGS])
  const overallGPM = useMemo(() => subtotal > 0 ? (totalGP / subtotal) * 100 : 0, [totalGP, subtotal])
  const totalCommission = useMemo(() => lineItemsList.reduce((s, li) => s + calcGPM(li, leadType).commission, 0), [lineItemsList, leadType])
  const commRows = (() => {
    const rows: { label: string; val: number }[] = [{ label: 'Base Commission', val: totalCommission }]
    if (leadType === 'inbound' || leadType === 'outbound') {
      if (overallGPM >= 73) rows.push({ label: 'GPM Bonus (+2%)', val: subtotal * 0.02 })
      rows.push({ label: 'Torq Bonus (+1%)', val: subtotal * 0.01 })
    }
    return rows
  })()
  const totalComm = commRows.reduce((s, r) => s + r.val, 0)

  // Convert to Job modal state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertMode, setConvertMode] = useState<'combined' | 'per_item'>('combined')
  const [convertSelected, setConvertSelected] = useState<Set<string>>(new Set<string>())

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
    if (!canWrite || isDemo) { showToast('Demo mode -- cannot save'); return }
    setSaving(true)
    try {
      const payload = {
        title, notes, customer_note: customerNote, discount, tax_rate: taxRate,
        subtotal, tax_amount: taxAmount, total, status,
        quote_date: quoteDate || null, due_date: dueDate || null,
        sales_rep_id: salesRepId || null,
        production_manager_id: prodMgrId || null,
        project_manager_id: projMgrId || null,
        form_data: { ...est.form_data, leadType, installDate: installDate || undefined, proposalOptions: proposalMode ? proposalOptions : undefined },
      }
      if (!savedId) {
        // First save — create estimate in DB
        const { data, error } = await supabase.from('estimates').insert({
          org_id: profile.org_id,
          division: 'wraps',
          ...payload,
        }).select().single()
        if (error) throw error
        if (data) {
          setSavedId(data.id)
          // Save any pending line items
          const pendingItems = lineItemsList.filter(li => li.id.startsWith('new-'))
          if (pendingItems.length > 0) {
            const dbItems = pendingItems.map(li => ({
              parent_type: 'estimate' as const,
              parent_id: data.id,
              product_type: li.product_type,
              name: li.name, description: li.description,
              quantity: li.quantity, unit_price: li.unit_price,
              unit_discount: li.unit_discount, total_price: li.total_price,
              specs: li.specs, sort_order: li.sort_order,
            }))
            const { data: savedItems } = await supabase.from('line_items').insert(dbItems).select()
            if (savedItems) {
              setLineItemsList(prev => prev.map((li, i) => {
                const saved = savedItems[i]
                return saved ? { ...li, id: saved.id, parent_id: data.id } : li
              }))
            }
          }
          showToast('Estimate created')
          router.replace(`/estimates/${data.id}`)
        }
      } else {
        const { error } = await supabase.from('estimates').update(payload).eq('id', savedId)
        if (error) throw error
        showToast('Estimate saved')
      }
    } catch (err) {
      console.error('Save error:', err)
      showToast('Error saving estimate')
    }
    setSaving(false)
  }

  async function handleLineItemSave(item: LineItem) {
    if (isDemo || item.id.startsWith('new-')) return
    try {
      // Rollup state is stored in specs (rolledUp, parentItemId) for compatibility.
      // The DB columns rolled_up_into / is_rolled_up are added if the migration has run;
      // Supabase ignores unknown columns gracefully, so we always send them.
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

  async function handleStatusChange(newStatus: EstimateStatus) {
    if (!canWrite) return
    setStatus(newStatus)
    setMoreMenuOpen(false)
    if (!isDemo) {
      try {
        await supabase.from('estimates').update({ status: newStatus }).eq('id', estimateId)
        showToast(`Status changed to ${STATUS_CONFIG[newStatus].label}`)
      } catch { /* swallow */ }
    } else {
      showToast(`Status changed to ${STATUS_CONFIG[newStatus].label} (demo)`)
    }
  }

  async function handleConvertToSO() {
    if (!canWrite) return
    setMoreMenuOpen(false)
    showToast('Converting to Sales Order...')
    try {
      const { data, error } = await supabase.from('sales_orders').insert({
        org_id: est.org_id || profile.org_id,
        title: est.title,
        estimate_id: isDemo ? null : estimateId,
        customer_id: est.customer_id,
        sales_rep_id: est.sales_rep_id || profile.id,
        subtotal, discount, tax_rate: taxRate, tax_amount: taxAmount, total,
        notes: est.notes,
        so_date: new Date().toISOString().split('T')[0],
      }).select().single()
      if (error) throw error
      if (data) {
        if (lineItemsList.length > 0 && !isDemo) {
          const soItems = lineItemsList.map(li => ({
            parent_type: 'sales_order' as const,
            parent_id: data.id,
            product_type: li.product_type,
            name: li.name, description: li.description,
            quantity: li.quantity, unit_price: li.unit_price,
            unit_discount: li.unit_discount, total_price: li.total_price,
            specs: li.specs, sort_order: li.sort_order,
          }))
          await supabase.from('line_items').insert(soItems)
        }
        if (!isDemo) {
          await supabase.from('estimates').update({ status: 'accepted' }).eq('id', estimateId)
        }
        router.push(`/sales-orders/${data.id}`)
      }
    } catch (err) {
      console.error('Convert error:', err)
      showToast('Could not convert. Run the v6 migration first.')
    }
  }

  async function handleConvertToInvoice() {
    setMoreMenuOpen(false)
    if (!canWrite) {
      showToast('You do not have permission to create invoices')
      return
    }
    showToast('Creating invoice...')
    try {
      // Create invoice from estimate
      const { data: invoiceData, error: invError } = await supabase.from('invoices').insert({
        org_id: est.org_id || profile.org_id,
        title: est.title,
        estimate_id: isDemo ? null : estimateId,
        customer_id: est.customer_id,
        status: 'draft',
        subtotal,
        discount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        balance_due: total,
        invoice_date: new Date().toISOString().split('T')[0],
        notes: est.notes,
      }).select().single()

      if (invError) throw invError
      if (!invoiceData) throw new Error('No invoice data returned')

      // Copy line items to invoice
      if (lineItemsList.length > 0 && !isDemo) {
        const invItems = lineItemsList.map(li => ({
          parent_type: 'invoice' as const,
          parent_id: invoiceData.id,
          product_type: li.product_type,
          name: li.name,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          unit_discount: li.unit_discount,
          total_price: li.total_price,
          specs: li.specs,
          sort_order: li.sort_order,
        }))
        const { error: itemsError } = await supabase.from('line_items').insert(invItems)
        if (itemsError) throw itemsError
      }

      // Mark estimate as converted (optional - update status or add flag)
      if (!isDemo) {
        await supabase.from('estimates').update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        }).eq('id', estimateId)
      }

      // Navigate to the new invoice
      router.push(`/invoices/${invoiceData.id}`)
    } catch (err) {
      console.error('Invoice conversion error:', err)
      showToast('Could not create invoice. Check permissions and try again.')
    }
  }

  async function handleDuplicate() {
    setMoreMenuOpen(false)
    if (!canWrite) {
      showToast('You do not have permission to create estimates')
      return
    }
    const customerName = prompt('Enter customer name for the duplicate estimate:')
    if (!customerName || !customerName.trim()) {
      showToast('Customer name is required')
      return
    }
    showToast('Creating duplicate estimate...')
    try {
      // Create new estimate with same data but no customer_id (for new customer)
      const { data: newEst, error: estError } = await supabase.from('estimates').insert({
        org_id: est.org_id || profile.org_id,
        title: `${est.title} (Copy for ${customerName.trim()})`,
        customer_id: null, // New customer
        status: 'draft',
        sales_rep_id: profile.id,
        subtotal,
        discount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: est.notes,
        customer_note: `Estimate created for ${customerName.trim()}`,
        division: est.division,
        form_data: est.form_data,
      }).select().single()

      if (estError) throw estError
      if (!newEst) throw new Error('No estimate data returned')

      // Copy line items
      if (lineItemsList.length > 0 && !isDemo) {
        const newItems = lineItemsList.map(li => ({
          parent_type: 'estimate' as const,
          parent_id: newEst.id,
          product_type: li.product_type,
          name: li.name,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          unit_discount: li.unit_discount,
          total_price: li.total_price,
          specs: li.specs,
          sort_order: li.sort_order,
        }))
        const { error: itemsError } = await supabase.from('line_items').insert(newItems)
        if (itemsError) throw itemsError
      }

      router.push(`/estimates/${newEst.id}`)
    } catch (err) {
      console.error('Duplicate estimate error:', err)
      showToast('Could not duplicate estimate. Check permissions and try again.')
    }
  }

  async function handleCreateCopy() {
    setMoreMenuOpen(false)
    if (!canWrite) {
      showToast('You do not have permission to create estimates')
      return
    }
    showToast('Creating copy...')
    try {
      // Create exact copy with same customer
      const { data: newEst, error: estError } = await supabase.from('estimates').insert({
        org_id: est.org_id || profile.org_id,
        title: `${est.title} (Copy)`,
        customer_id: est.customer_id,
        status: 'draft',
        sales_rep_id: profile.id,
        subtotal,
        discount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: est.notes,
        customer_note: est.customer_note,
        division: est.division,
        form_data: est.form_data,
      }).select().single()

      if (estError) throw estError
      if (!newEst) throw new Error('No estimate data returned')

      // Copy line items
      if (lineItemsList.length > 0 && !isDemo) {
        const newItems = lineItemsList.map(li => ({
          parent_type: 'estimate' as const,
          parent_id: newEst.id,
          product_type: li.product_type,
          name: li.name,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          unit_discount: li.unit_discount,
          total_price: li.total_price,
          specs: li.specs,
          sort_order: li.sort_order,
        }))
        const { error: itemsError } = await supabase.from('line_items').insert(newItems)
        if (itemsError) throw itemsError
      }

      router.push(`/estimates/${newEst.id}`)
    } catch (err) {
      console.error('Copy estimate error:', err)
      showToast('Could not create copy. Check permissions and try again.')
    }
  }

  async function handleSaveAsTemplate() {
    setMoreMenuOpen(false)
    if (lineItemsList.length === 0) { showToast('No line items to save'); return }
    const name = prompt('Template name:', title || 'My Template')
    if (!name) return
    try {
      const { error } = await supabase.from('estimate_templates').insert({
        org_id: profile.org_id,
        name,
        description: `${lineItemsList.length} items - ${fmtCurrency(subtotal)}`,
        category: 'custom',
        line_items: lineItemsList.map(li => ({
          product_type: li.product_type, name: li.name, description: li.description,
          quantity: li.quantity, unit_price: li.unit_price, unit_discount: li.unit_discount,
          total_price: li.total_price, specs: li.specs, sort_order: li.sort_order,
        })),
        form_data: { leadType, discount, taxRate, notes, customerNote },
        created_by: profile.id,
      })
      if (error) throw error
      showToast(`Template "${name}" saved`)
      // Reload templates
      const { data } = await supabase.from('estimate_templates').select('id, name, description, line_items').order('use_count', { ascending: false }).limit(20)
      if (data) setTemplates(data as typeof templates)
    } catch (err) {
      console.error('Save template error:', err)
      showToast('Error saving template')
    }
  }

  async function handleLoadTemplate(tmpl: typeof templates[0]) {
    setTemplateMenuOpen(false)
    const items: LineItem[] = (tmpl.line_items as Partial<LineItem>[]).map((li, i) => ({
      id: `tmpl-${Date.now()}-${i}`,
      parent_type: 'estimate' as const,
      parent_id: estimateId,
      product_type: (li.product_type as LineItem['product_type']) || 'wrap',
      name: li.name || '',
      description: li.description || null,
      quantity: li.quantity || 1,
      unit_price: li.unit_price || 0,
      unit_discount: li.unit_discount || 0,
      total_price: li.total_price || 0,
      specs: (li.specs || {}) as LineItemSpecs,
      sort_order: li.sort_order || i,
      created_at: new Date().toISOString(),
    }))
    setLineItemsList(items)
    showToast(`Template "${tmpl.name}" loaded`)
    // Increment use count
    await supabase.rpc('increment_template_use', { template_id: tmpl.id })
  }

  async function handleDelete() {
    setMoreMenuOpen(false)
    if (isDemo) { showToast('Cannot delete demo estimate'); return }
    if (!confirm('Are you sure you want to delete this estimate? This cannot be undone.')) return
    try {
      await supabase.from('line_items').delete().eq('parent_type', 'estimate').eq('parent_id', estimateId)
      await supabase.from('estimates').delete().eq('id', estimateId)
      router.push('/estimates')
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Error deleting estimate')
    }
  }

  function handleCreateJob() {
    if (!canWrite) return
    setConvertSelected(new Set(lineItemsList.map(li => li.id)))
    setConvertMode('combined')
    setShowConvertModal(true)
  }

  function handleSendEstimate() {
    setEmailModalType('estimate')
    setEmailModalOpen(true)
  }

  async function executeConvertToJob(mode: 'combined' | 'per_item', selectedIds: Set<string>) {
    if (!canWrite) return
    setShowConvertModal(false)
    showToast('Creating job(s)...')
    const items = lineItemsList.filter(li => selectedIds.has(li.id))
    if (items.length === 0) { showToast('No items selected'); return }

    async function createOneJob(jobItems: LineItem[], jobTitle: string) {
      const firstSpecs = jobItems[0]?.specs || {}
      const vDesc = [firstSpecs.vehicleYear, firstSpecs.vehicleMake, firstSpecs.vehicleModel].filter(Boolean).join(' ').trim() || null
      const jobRevenue = jobItems.reduce((s, li) => s + li.total_price, 0)
      const jobCOGS = jobItems.reduce((s, li) => s + calcGPM(li, leadType).cogs, 0)
      const { data, error } = await supabase.from('projects').insert({
        org_id: est.org_id || profile.org_id,
        type: 'wrap',
        title: jobTitle,
        status: 'estimate',
        agent_id: salesRepId || profile.id,
        division: 'wraps',
        pipe_stage: 'sales_in',
        vehicle_desc: vDesc,
        install_date: installDate || null,
        priority: 'normal',
        revenue: jobRevenue,
        fin_data: { sales: jobRevenue, revenue: jobRevenue, cogs: jobCOGS, profit: jobRevenue - jobCOGS, gpm: jobRevenue > 0 ? ((jobRevenue - jobCOGS) / jobRevenue) * 100 : 0, commission: 0, labor: 0, laborHrs: 0, material: 0, designFee: 0, misc: 0 },
        form_data: {
          clientName: est.customer?.name || est.title,
          clientEmail: est.customer?.email || '',
          estimateId: isDemo ? null : estimateId,
          notes: notes,
        },
        actuals: {}, checkout: {}, send_backs: [],
      }).select().single()
      if (error) throw error
      return data
    }

    try {
      if (mode === 'combined') {
        const data = await createOneJob(items, title || 'Untitled Job')
        if (data) { showToast('Job created!'); router.push(`/projects/${data.id}`) }
      } else {
        const created: Array<{ id: string }> = []
        for (const li of items) {
          const data = await createOneJob([li], li.name || title || 'Untitled Job')
          if (data) created.push(data)
        }
        showToast(`${created.length} jobs created!`)
        if (created.length === 1) router.push(`/projects/${created[0].id}`)
        else router.push('/pipeline')
      }
    } catch (err) {
      console.error('Create Job error:', err)
      showToast('Error creating job(s)')
    }
  }

  function addNewLineItem(product?: typeof products[0]) {
    // Map product calculator_type to vehicleType for the calculator system
    const calcToVehicleType: Record<string, string> = {
      'vehicle': '', 'box-truck': 'box_truck', 'trailer': 'trailer',
      'marine': 'marine', 'ppf': 'ppf', 'simple': 'custom',
    }
    const calcToProductType: Record<string, string> = {
      'vehicle': 'wrap', 'box-truck': 'wrap', 'trailer': 'wrap',
      'marine': 'decking', 'ppf': 'ppf', 'simple': 'wrap',
    }
    const vehicleType = product ? (calcToVehicleType[product.calculator_type] || '') : ''
    const productType = product ? (calcToProductType[product.calculator_type] || 'wrap') : 'wrap'
    const newItem: LineItem = {
      id: `new-${Date.now()}`, parent_type: 'estimate', parent_id: estimateId,
      product_type: productType as LineItem['product_type'],
      name: product?.name || '', description: product?.description || null,
      quantity: 1, unit_price: product?.default_price || 0,
      unit_discount: 0, total_price: product?.default_price || 0,
      specs: {
        estimatedHours: product?.default_hours || 0,
        designFee: DESIGN_FEE_DEFAULT,
        vehicleType: vehicleType || undefined,
        productId: product?.id,
        calculatorType: product?.calculator_type,
      },
      sort_order: lineItemsList.length,
      created_at: new Date().toISOString(),
    }
    setLineItemsList(prev => [...prev, newItem])
    // Auto-expand the new item so user can fill in details
    setExpandedSections(prev => ({ ...prev, [newItem.id]: { gpm: true } }))
  }

  // ─── Proposal mode helpers ──────────────────────────────────────────────────
  function addProposalOption() {
    const letter = String.fromCharCode(65 + proposalOptions.length)
    setProposalOptions(prev => [...prev, { label: `Option ${letter}`, itemIds: [] }])
  }

  function toggleItemInOption(optionIdx: number, itemId: string) {
    setProposalOptions(prev => prev.map((opt, i) => {
      if (i !== optionIdx) return opt
      const has = opt.itemIds.includes(itemId)
      return { ...opt, itemIds: has ? opt.itemIds.filter(id => id !== itemId) : [...opt.itemIds, itemId] }
    }))
  }

  const sc = STATUS_CONFIG[status]

  // Team helper
  const findTeamMember = (id: string | null) => id ? team.find(t => t.id === id) : null

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="anim-fade-up" style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Print styles + print-only logo header */}
      <style>{`
        @media print {
          nav, header, aside, [data-no-print], .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .estimate-print-logo { display: flex !important; }
        }
        .estimate-print-logo { display: none; }
      `}</style>
      <div className="estimate-print-logo" style={{
        alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 12, borderBottom: '2px solid #1a1d27', marginBottom: 16,
      }}>
        <img
          src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp"
          alt="USA WRAP CO"
          style={{ height: 40, width: 'auto' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <span style={{ fontSize: 11, color: '#5a6080' }}>ESTIMATE — CONFIDENTIAL</span>
      </div>

      {/* ── Demo Banner ──────────────────────────────────────────────────── */}
      {isDemo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10, marginBottom: 16, fontSize: 13, color: 'var(--amber)',
        }}>
          <AlertTriangle size={14} />
          <span>Showing demo data. Run the v6 migration to enable live estimates.</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HEADER ROW                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
        background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(79,127,255,0.03) 100%)',
        border: '1px solid var(--card-border)', borderRadius: 20,
        padding: '18px 22px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Accent glow */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${STATUS_CONFIG[est.status as EstimateStatus]?.color || 'var(--accent)'}, transparent)`, opacity: 0.5 }} />
        {/* Left: Back + QT number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/estimates')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', color: 'var(--text2)',
              fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              minHeight: 44, minWidth: 44, justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 900, fontFamily: headingFont,
              color: 'var(--text1)', margin: 0, lineHeight: 1,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span style={{ color: 'var(--text3)', fontWeight: 600 }}>QT</span>{' '}
              <span style={{ ...monoStyle }}>#{est.estimate_number}</span>
            </h1>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Download PDF dropdown */}
          <div ref={pdfMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setPdfMenuOpen(!pdfMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 14px', color: 'var(--text1)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: headingFont, letterSpacing: '0.03em',
              }}
            >
              <FileDown size={14} />
              Download PDF
              <ChevronDown size={12} style={{ marginLeft: 2, color: 'var(--text3)' }} />
            </button>
            {pdfMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 6, minWidth: 180, zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <MenuButton icon={<FileText size={13} />} label="Estimate PDF" onClick={() => { setPdfMenuOpen(false); window.location.href = `/api/pdf/estimate/${estimateId}` }} />
                <MenuButton icon={<Layers size={13} />} label="Proposal PDF" onClick={() => { setPdfMenuOpen(false); window.location.href = `/api/pdf/proposal/${estimateId}` }} />
                <MenuButton icon={<DollarSign size={13} />} label="Quick Print" onClick={() => { setPdfMenuOpen(false); window.print() }} />
              </div>
            )}
          </div>

          {/* Email PDF */}
          <button
            onClick={() => { setEmailModalType('estimate'); setEmailModalOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--text1)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: headingFont, letterSpacing: '0.03em',
            }}
          >
            <Mail size={14} />
            Email PDF
          </button>

          {/* Status-based action button */}
          {status === 'draft' && (
            <button
              onClick={() => { setEmailModalType('estimate'); setEmailModalOpen(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--accent)', border: 'none',
                borderRadius: 8, padding: '8px 14px', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: headingFont, letterSpacing: '0.03em',
              }}
            >
              <Send size={14} />
              Send Quote
            </button>
          )}
          {status === 'sent' && (
            <button
              onClick={() => handleStatusChange('accepted')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--green)', border: 'none',
                borderRadius: 8, padding: '8px 14px', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: headingFont, letterSpacing: '0.03em',
              }}
            >
              <CheckCircle2 size={14} />
              Mark Accepted
            </button>
          )}
          {status === 'accepted' && (
            <button
              onClick={handleConvertToSO}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--green)', border: 'none',
                borderRadius: 8, padding: '8px 14px', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: headingFont, letterSpacing: '0.03em',
              }}
            >
              <ArrowRight size={14} />
              Convert to Sales Order
            </button>
          )}

          {/* ... More menu */}
          <div ref={moreMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 10px', color: 'var(--text2)',
                cursor: 'pointer',
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            {moreMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 6, minWidth: 230, zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {canWrite && (status === 'draft' || status === 'sent' || status === 'accepted') && (
                  <MenuButton icon={<ArrowRight size={13} style={{ color: 'var(--green)' }} />} label="Convert to Sales Order" onClick={handleConvertToSO} />
                )}
                <MenuButton icon={<FileText size={13} style={{ color: 'var(--accent)' }} />} label="Convert to Invoice" onClick={handleConvertToInvoice} />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <MenuButton icon={<Copy size={13} style={{ color: 'var(--cyan)' }} />} label="Duplicate for New Customer" onClick={handleDuplicate} />
                <MenuButton icon={<Copy size={13} style={{ color: 'var(--text2)' }} />} label="Create Copy" onClick={handleCreateCopy} />
                <MenuButton icon={<Layers size={13} style={{ color: 'var(--purple)' }} />} label="Save as Template" onClick={handleSaveAsTemplate} />
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                {canWrite && status !== 'void' && (
                  <MenuButton icon={<Ban size={13} style={{ color: 'var(--amber)' }} />} label="Void" onClick={() => handleStatusChange('void')} />
                )}
                {canWrite && (
                  <MenuButton icon={<Trash2 size={13} style={{ color: 'var(--red)' }} />} label="Delete" onClick={handleDelete} danger />
                )}
              </div>
            )}
          </div>

          {/* Save button */}
          {canWrite && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--green)', border: 'none',
                borderRadius: 12, padding: '9px 18px', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1, fontFamily: headingFont, letterSpacing: '0.03em',
                boxShadow: '0 2px 12px rgba(34,192,122,0.25)', transition: 'all 0.15s',
              }}
            >
              <Save size={14} />
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
            {est.customer ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                  {est.customer.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  {est.customer.email}
                </div>
              </div>
            ) : (
              <button
                onClick={() => router.push('/customers')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(79,127,255,0.1)', border: '1px dashed rgba(79,127,255,0.3)',
                  borderRadius: 6, padding: '8px 12px', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
                }}
                title="Go to Customers page to create or select a customer, then return here to link them"
              >
                <Plus size={12} /> Add Customer
              </button>
            )}
          </div>

          {/* Column 2: Status + Onboarding */}
          <div style={{ ...sectionPad, borderRight: '1px solid var(--border)' }}>
            <div style={{ ...fieldLabelStyle, marginBottom: 8 }}>
              <CircleDot size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 12px',
                borderRadius: 6, fontSize: 11, fontWeight: 800, color: sc.color,
                background: sc.bg, letterSpacing: '0.05em', fontFamily: headingFont,
              }}>
                {sc.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: 'var(--text3)' }}>
                Ordered: <span style={{ color: 'var(--text2)', fontWeight: 600 }}>No</span>
              </span>
              <span style={{ color: 'var(--text3)' }}>
                Invoiced: <span style={{ color: 'var(--text2)', fontWeight: 600 }}>No</span>
              </span>
            </div>
            {/* Onboarding link */}
            {est.customer_id && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/onboard/${estimateId}`
                  navigator.clipboard.writeText(url).then(() => showToast('Onboarding link copied!')).catch(() => showToast(url))
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid rgba(79,127,255,0.25)',
                  background: 'rgba(79,127,255,0.06)', color: 'var(--accent)',
                }}
              >
                <UserPlus size={11} /> Onboarding Link
              </button>
            )}
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
                value={est.division === 'wraps' ? 'Wraps' : 'Decking'}
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
                value={new Date(est.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                disabled
                style={{ ...fieldInputStyle, opacity: 0.5 }}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Proposal Mode</label>
              <button
                onClick={() => setProposalMode(!proposalMode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: 'none', color: proposalMode ? 'var(--green)' : 'var(--text3)',
                  fontSize: 13, cursor: 'pointer', padding: '4px 0',
                }}
              >
                {proposalMode
                  ? <ToggleRight size={20} style={{ color: 'var(--green)' }} />
                  : <ToggleLeft size={20} style={{ color: 'var(--text3)' }} />
                }
                {proposalMode ? 'Enabled' : 'Disabled'}
              </button>
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
          { key: 'items' as TabKey, label: 'Items', count: lineItemsList.length },
          { key: 'photos' as TabKey, label: 'Photos' },
          { key: 'calculators' as TabKey, label: 'Calculators' },
          { key: 'design' as TabKey, label: 'Design' },
          { key: 'production' as TabKey, label: 'Production' },
          { key: 'install' as TabKey, label: 'Install' },
          { key: 'notes' as TabKey, label: 'Notes' },
          { key: 'proposal' as TabKey, label: 'Proposal' },
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

      {activeTab === 'items' && (
        <div>
          {/* Items header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text1)',
              fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Items
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Templates dropdown */}
              <div ref={templateMenuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: 8, padding: '7px 12px', color: 'var(--purple)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: headingFont, letterSpacing: '0.03em',
                  }}
                >
                  <Layers size={12} />
                  Templates
                  <ChevronDown size={10} />
                </button>
                {templateMenuOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 4,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 6, minWidth: 240, zIndex: 100,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont }}>
                      Load Template
                    </div>
                    {templates.length === 0 && (
                      <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text3)' }}>No templates saved yet</div>
                    )}
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleLoadTemplate(t)}
                        style={{
                          display: 'block', width: '100%', padding: '8px 12px',
                          border: 'none', borderRadius: 6, cursor: 'pointer',
                          background: 'transparent', color: 'var(--text1)',
                          fontSize: 12, textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                        {t.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{t.description}</div>}
                      </button>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                    <button
                      onClick={handleSaveAsTemplate}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                        padding: '8px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                        background: 'transparent', color: 'var(--purple)',
                        fontSize: 12, fontWeight: 600, textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Save size={12} /> Save Current as Template
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateJob}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.25)',
                  borderRadius: 8, padding: '7px 14px', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: headingFont, letterSpacing: '0.03em',
                }}
              >
                <Briefcase size={13} />
                Create Job
              </button>
              {canWrite && (
                <button
                  onClick={() => addNewLineItem()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
                    borderRadius: 8, padding: '7px 14px', color: 'var(--green)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: headingFont, letterSpacing: '0.03em',
                  }}
                >
                  <Plus size={13} />
                  Add Line Item
                </button>
              )}
            </div>
          </div>

          {/* ── Product Quick-Add Bar ──────────────────────────────────────── */}
          {products.length > 0 && canWrite && (
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12,
              padding: '10px 14px', background: 'var(--bg)', borderRadius: 10,
              border: '1px solid var(--border)',
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                fontFamily: headingFont, display: 'flex', alignItems: 'center', gap: 4,
                marginRight: 4,
              }}>
                <Package size={10} /> Quick Add
              </span>
              {products.slice(0, 10).map(p => (
                <button
                  key={p.id}
                  onClick={() => addNewLineItem(p)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text2)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Proposal mode options */}
          {proposalMode && (
            <div style={{
              ...cardStyle, marginBottom: 16, padding: 16,
              background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--purple)',
                  fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <Layers size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                  Proposal Options
                </div>
                <button
                  onClick={addProposalOption}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'transparent', border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: 6, padding: '4px 10px', color: 'var(--purple)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Plus size={11} /> Add Option
                </button>
              </div>
              {proposalOptions.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: 12 }}>
                  No options yet. Add options and assign line items to each.
                </div>
              )}
              {proposalOptions.map((opt, oi) => (
                <div key={oi} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 12, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      ...monoStyle, fontSize: 13, fontWeight: 800, color: 'var(--purple)',
                      background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      value={opt.label}
                      onChange={e => setProposalOptions(prev => prev.map((p, i) => i === oi ? { ...p, label: e.target.value } : p))}
                      style={{ ...fieldInputStyle, fontSize: 13, fontWeight: 600, flex: 1 }}
                      disabled={!canWrite}
                    />
                    <button
                      onClick={() => setProposalOptions(prev => prev.filter((_, i) => i !== oi))}
                      style={{
                        background: 'transparent', border: 'none',
                        color: 'var(--red)', cursor: 'pointer', padding: 4,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {lineItemsList.map(li => {
                      const included = opt.itemIds.includes(li.id)
                      return (
                        <button
                          key={li.id}
                          onClick={() => toggleItemInOption(oi, li.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6,
                            border: included ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: included ? 'rgba(79,127,255,0.12)' : 'transparent',
                            color: included ? 'var(--accent)' : 'var(--text3)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {included ? <CheckCircle2 size={11} /> : <CircleDot size={11} />}
                          {li.name || 'Untitled'}
                        </button>
                      )
                    })}
                  </div>
                  {opt.itemIds.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', ...monoStyle }}>
                      Option total: {fmtCurrency(lineItemsList.filter(li => opt.itemIds.includes(li.id)).reduce((s, li) => s + li.total_price, 0))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── 2-col layout: items on left, financial sidebar on right ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]" style={{ gap: 20, alignItems: 'start' }}>
            <div>{/* left column */}
          {/* Line items */}
          {lineItemsList.length === 0 ? (
            <div style={{
              ...cardStyle, padding: 48, textAlign: 'center',
            }}>
              <ClipboardList size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 4 }}>No line items yet</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Click &quot;Add New Line Item&quot; to start building this estimate.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lineItemsList.map((li, idx) => {
                // Compute rolled-up children total for parent items
                const childrenTotal = lineItemsList
                  .filter(child => {
                    const isChild = child.is_rolled_up || (child.specs as Record<string, unknown>)?.rolledUp
                    const parentId = child.rolled_up_into || (child.specs as Record<string, unknown>)?.parentItemId
                    return isChild && parentId === li.id
                  })
                  .reduce((sum, child) => sum + child.total_price, 0)

                return (
                  <LineItemCard
                    key={li.id}
                    item={li}
                    index={idx}
                    canWrite={canWrite}
                    onChange={(updated) => {
                      setLineItemsList(prev => prev.map(x => x.id === li.id ? updated : x))
                    }}
                    onBlurSave={(updated) => handleLineItemSave(updated)}
                    onRemove={() => {
                      // When removing a parent, unroll its children first
                      setLineItemsList(prev => {
                        const children = prev.filter(child => {
                          const parentId = child.rolled_up_into || (child.specs as Record<string, unknown>)?.parentItemId
                          return parentId === li.id
                        })
                        let updated = prev.filter(x => x.id !== li.id)
                        if (children.length > 0) {
                          updated = updated.map(x => {
                            const parentId = x.rolled_up_into || (x.specs as Record<string, unknown>)?.parentItemId
                            if (parentId === li.id) {
                              return {
                                ...x,
                                is_rolled_up: false,
                                rolled_up_into: null,
                                specs: { ...x.specs, rolledUp: false, parentItemId: null },
                              }
                            }
                            return x
                          })
                        }
                        return updated
                      })
                    }}
                    expandedSections={expandedSections[li.id] || {}}
                    onToggleSection={(section) => toggleSection(li.id, section)}
                    leadType={leadType}
                    team={team}
                    products={products}
                    allItems={lineItemsList}
                    onOpenAreaCalc={() => { setAreaCalcItemId(li.id); setAreaCalcOpen(true) }}
                    rolledUpChildrenTotal={childrenTotal}
                    onRollUp={() => {
                      // Find the nearest non-rolled-up item above this one
                      let parentItem: LineItem | null = null
                      for (let i = idx - 1; i >= 0; i--) {
                        const candidate = lineItemsList[i]
                        const candidateRolledUp = candidate.is_rolled_up || (candidate.specs as Record<string, unknown>)?.rolledUp
                        if (!candidateRolledUp) {
                          parentItem = candidate
                          break
                        }
                      }
                      if (!parentItem) return
                      const updatedItem: LineItem = {
                        ...li,
                        is_rolled_up: true,
                        rolled_up_into: parentItem.id,
                        specs: { ...li.specs, rolledUp: true, parentItemId: parentItem.id },
                      }
                      setLineItemsList(prev => prev.map(x => x.id === li.id ? updatedItem : x))
                      handleLineItemSave(updatedItem)
                    }}
                    onUnroll={() => {
                      const updatedItem: LineItem = {
                        ...li,
                        is_rolled_up: false,
                        rolled_up_into: null,
                        specs: { ...li.specs, rolledUp: false, parentItemId: null },
                      }
                      setLineItemsList(prev => prev.map(x => x.id === li.id ? updatedItem : x))
                      handleLineItemSave(updatedItem)
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Customer Note */}
          <div style={{ marginTop: 16 }}>
            <label style={fieldLabelStyle}>Customer Note</label>
            <textarea
              value={customerNote}
              onChange={e => setCustomerNote(e.target.value)}
              disabled={!canWrite}
              placeholder="Note visible to customer on the estimate..."
              rows={4}
              style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </div>
            </div>{/* end left column */}

            {/* Right: Financial Sidebar */}
            <div style={{ position: 'sticky', top: 16 }}>
            <div style={{ ...cardStyle }}>
              {/* GP Summary */}
              <div style={{ ...sectionPad, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 10 }}>
                  Financial Summary
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SummaryRow label='Revenue' value={fmtCurrency(subtotal)} />
                  <SummaryRow label='COGS' value={fmtCurrency(totalCOGS)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>Gross Profit</span>
                    <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: totalGP >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtCurrency(totalGP)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>Overall GPM</span>
                    <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 800, color: overallGPM >= 73 ? 'var(--green)' : overallGPM >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                      {fmtPercent(overallGPM)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Commission Section */}
              <div style={{ ...sectionPad, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>
                  Commission
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {(['inbound', 'outbound', 'presold'] as const).map(lt => (
                    <button key={lt} onClick={() => setLeadType(lt)} style={{ flex: 1, padding: '5px 2px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em', border: leadType === lt ? '2px solid var(--accent)' : '1px solid var(--border)', background: leadType === lt ? 'rgba(79,127,255,0.12)' : 'var(--bg)', color: leadType === lt ? 'var(--accent)' : 'var(--text3)' }}>
                      {lt === 'presold' ? 'Pre-Sold' : lt.charAt(0).toUpperCase() + lt.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {commRows.map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{r.label}</span>
                      <span style={{ fontFamily: monoFont, fontSize: 13, color: r.val >= 0 ? 'var(--text1)' : 'var(--red)' }}>{fmtCurrency(r.val)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Total Commission</span>
                    <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{fmtCurrency(totalComm)}</span>
                  </div>
                </div>
              </div>
              {/* Subtotal / Discount / Tax / Total */}
              <div style={{ ...sectionPad, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SummaryRow label='Subtotal' value={fmtCurrency(subtotal)} />
                  {discount > 0 && <SummaryRow label='Discount' value={fmtCurrency(-discount)} />}
                  <SummaryRow label={`Tax (${(taxRate * 100).toFixed(2)}%)`} value={fmtCurrency(taxAmount)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Total</span>
                    <span style={{ fontFamily: monoFont, fontSize: 16, fontWeight: 800, color: 'var(--text1)' }}>{fmtCurrency(total)}</span>
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div style={{ ...sectionPad, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {canWrite && (
                  <button
                    onClick={handleCreateJob}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                      background: 'var(--green)', color: '#fff', cursor: 'pointer',
                      fontWeight: 700, fontFamily: headingFont, fontSize: 14,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}
                  >
                    Convert to Job
                  </button>
                )}
                <button
                  onClick={handleSendEstimate}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    border: '1px solid var(--accent)',
                    background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
                    fontWeight: 700, fontFamily: headingFont, fontSize: 14,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}
                >
                  Send Estimate
                </button>
              </div>
            </div>
            </div>{/* end sticky right column */}
          </div>{/* end 2-col grid */}
        </div>
      )}

      {activeTab === 'photos' && (
        <div style={{ ...cardStyle }}>
          <div style={{ ...sectionPad }}>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text1)', marginBottom: 16 }}>
              <Camera size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              Photos
            </div>

            {/* Intake Photos */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  <Upload size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                  Intake Photos
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 32, border: '2px dashed var(--border)', borderRadius: 10,
                background: 'var(--bg)', cursor: 'pointer', color: 'var(--text3)', fontSize: 13,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Upload size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                  <div>Drop photos here or click to upload</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Customer vehicle intake photos</div>
                </div>
              </div>
              {/* Vehicle profiles from intake */}
              {!!est.form_data?.vehicleProfiles && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, fontFamily: headingFont, textTransform: 'uppercase' as const }}>
                    Vehicle Profiles from Intake
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    Vehicle profile data from intake forms will appear here.
                  </div>
                </div>
              )}
            </div>

            {/* Before Photos */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10 }}>
                <Image size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                Before Photos
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24, border: '2px dashed var(--border)', borderRadius: 10,
                background: 'var(--bg)', cursor: 'pointer', color: 'var(--text3)', fontSize: 13,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Upload size={20} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
                  <div>Upload before photos</div>
                </div>
              </div>
            </div>

            {/* After Photos */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 10 }}>
                <Image size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                After Photos
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24, border: '2px dashed var(--border)', borderRadius: 10,
                background: 'var(--bg)', cursor: 'pointer', color: 'var(--text3)', fontSize: 13,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Upload size={20} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
                  <div>Upload after photos</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calculators' && (
        <EstimateCalculators
          onAddLineItems={(newItems) => {
            const items = newItems.map((item, idx) => ({
              id: `calc-${Date.now()}-${idx}`,
              parent_type: 'estimate' as const,
              parent_id: estimateId,
              product_type: (item.product_type || 'wrap') as any,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              unit_discount: 0,
              total_price: item.total_price,
              specs: item.specs as any,
              sort_order: lineItemsList.length + idx,
              created_at: new Date().toISOString(),
            }))
            setLineItemsList(prev => [...prev, ...items])
            setActiveTab('items')
          }}
          onClose={() => setActiveTab('items')}
        />
      )}

      {activeTab === 'design' && (
        <div style={{ ...cardStyle }}>
          <div style={{ ...sectionPad }}>
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
        <div style={{ ...cardStyle }}>
          <div style={{ ...sectionPad }}>
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
        <div style={{ ...cardStyle }}>
          <div style={{ ...sectionPad }}>
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
          <div style={{ ...cardStyle }}>
            <div style={{ ...sectionPad }}>
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
          <div style={{ ...cardStyle }}>
            <div style={{ ...sectionPad }}>
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
      {activeTab === 'proposal' && (
        <ProposalBuilder
          estimateId={estimateId}
          customerId={est.customer_id}
          customerEmail={est.customer?.email || null}
          customerName={est.customer?.name || null}
          customerPhone={null}
        />
      )}
      {activeTab === 'activity' && (
        <PlaceholderTab icon={<Activity size={28} />} label="Activity" description="Activity log and change history." />
      )}

            {/* â”€â”€ Convert to Job Modal */}
      {showConvertModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, padding: 28, width: 520,
            maxHeight: '80vh', overflow: 'auto', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: headingFont }}>Convert to Job</span>
              <button onClick={() => setShowConvertModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20 }}>x</button>
            </div>
            {/* Mode Select */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['combined', 'per_item'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setConvertMode(m)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                    fontFamily: headingFont, fontWeight: 700, fontSize: 13,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    border: convertMode === m ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: convertMode === m ? 'rgba(79,127,255,0.12)' : 'var(--bg)',
                    color: convertMode === m ? 'var(--accent)' : 'var(--text2)',
                  }}
                >
                  {m === 'combined' ? 'Single Job' : 'Per Line Item'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
              {convertMode === 'combined'
                ? 'All selected line items will be combined into one job.'
                : 'Each selected line item becomes a separate job.'}
            </p>
            {/* Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {lineItemsList.map(li => {
                const liCogs = (li.cogs ?? 0) * (li.qty ?? 1)
                const liRev = (li.price ?? 0) * (li.qty ?? 1)
                const liGP = liRev - liCogs
                const liGPM = liRev > 0 ? (liGP / liRev) * 100 : 0
                const sel = convertSelected.has(li.id)
                return (
                  <div
                    key={li.id}
                    onClick={() => {
                      const ns = new Set(convertSelected)
                      if (sel) ns.delete(li.id); else ns.add(li.id)
                      setConvertSelected(ns)
                    }}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      border: sel ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: sel ? 'rgba(79,127,255,0.07)' : 'var(--bg)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{li.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>COGS: {fmtCurrency(liCogs)} Â· GPM: {fmtPercent(liGPM)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{fmtCurrency(liRev)}</div>
                      <div style={{ fontSize: 11, color: liGP >= 0 ? 'var(--green)' : 'var(--red)' }}>GP: {fmtCurrency(liGP)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConvertModal(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text2)',
                  cursor: 'pointer', fontWeight: 600, fontFamily: headingFont, fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeConvertToJob(convertMode, convertSelected)}
                disabled={convertSelected.size === 0}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: 'var(--green)', color: '#fff',
                  cursor: convertSelected.size === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontFamily: headingFont, fontSize: 14,
                  opacity: convertSelected.size === 0 ? 0.5 : 1,
                }}
              >
                Create Job
              </button>
            </div>
          </div>
        </div>
      )}
{/* ── Area Calculator Modal ──────────────────────────────────── */}
      <AreaCalculatorModal
        isOpen={areaCalcOpen}
        onClose={() => { setAreaCalcOpen(false); setAreaCalcItemId(null) }}
        onUseSqft={(sqft) => {
          if (areaCalcItemId) {
            setLineItemsList(prev => prev.map(li => {
              if (li.id !== areaCalcItemId) return li
              return { ...li, specs: { ...li.specs, vinylArea: sqft } }
            }))
          }
        }}
        currentSqft={areaCalcItemId ? (lineItemsList.find(li => li.id === areaCalcItemId)?.specs?.vinylArea as number) : undefined}
      />

      {/* ── Email Compose Modal ──────────────────────────────────────── */}
      <EmailComposeModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={async (data: EmailData) => {
          try {
            if (!isDemo) {
              const res = await fetch('/api/estimates/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  estimate_id: estimateId,
                  to: data.to,
                  subject: data.subject,
                  message: data.message,
                  sendVia: data.sendVia,
                }),
              })
              const result = await res.json()
              showToast(result.message || `Estimate sent to ${data.to}`)
            } else {
              showToast(`Demo: Estimate marked as sent`)
            }
            handleStatusChange('sent')
          } catch {
            showToast('Error sending estimate')
          }
          setEmailModalOpen(false)
        }}
        recipientEmail={est.customer?.email || ''}
        recipientName={est.customer?.name || ''}
        senderName={profile.name}
        senderEmail={profile.email}
        estimateNumber={String(est.estimate_number)}
        estimateTotal={total}
        vehicleDescription={est.title}
        type={emailModalType}
      />

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 20px',
          color: 'var(--text1)', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideInUp 0.2s ease',
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

// ─── Menu Button ────────────────────────────────────────────────────────────

function MenuButton({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
        background: 'transparent', color: danger ? 'var(--red)' : 'var(--text1)',
        fontSize: 13, fontWeight: 500, textAlign: 'left' as const,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Summary Row ────────────────────────────────────────────────────────────

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

// ─── Placeholder Tab ────────────────────────────────────────────────────────

function PlaceholderTab({ icon, label, description }: { icon: React.ReactNode; label: string; description: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 48, textAlign: 'center',
    }}>
      <div style={{ color: 'var(--text3)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: 'var(--text2)',
        fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>{description}</div>
    </div>
  )
}

// ─── Collapsible Section Header ─────────────────────────────────────────────

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

// Vehicle silhouette SVG based on tier
function VehicleSilhouette({ tier }: { tier: string }) {
  const t = tier.toLowerCase()
  if (t.includes('truck') || t.includes('pickup')) {
    return <svg width="60" height="32" viewBox="0 0 60 32" fill="none"><path d="M4 24h4a4 4 0 008 0h16a4 4 0 008 0h8V16l-6-8H30l-2-2H8L4 10v14z" stroke="var(--text3)" strokeWidth="1.5" fill="rgba(79,127,255,0.08)"/><circle cx="12" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/><circle cx="40" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/></svg>
  }
  if (t.includes('van') || t.includes('high_roof')) {
    return <svg width="60" height="32" viewBox="0 0 60 32" fill="none"><path d="M4 24h6a4 4 0 008 0h20a4 4 0 008 0h4V8a4 4 0 00-4-4H14L4 12v12z" stroke="var(--text3)" strokeWidth="1.5" fill="rgba(79,127,255,0.08)"/><circle cx="14" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/><circle cx="42" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/></svg>
  }
  if (t.includes('suv') || t.includes('full_car')) {
    return <svg width="60" height="32" viewBox="0 0 60 32" fill="none"><path d="M6 24h4a4 4 0 008 0h20a4 4 0 008 0h4V14l-8-8H18l-8 6L6 18v6z" stroke="var(--text3)" strokeWidth="1.5" fill="rgba(79,127,255,0.08)"/><circle cx="14" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/><circle cx="42" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/></svg>
  }
  // default: sedan / small car
  return <svg width="60" height="32" viewBox="0 0 60 32" fill="none"><path d="M6 24h6a4 4 0 008 0h16a4 4 0 008 0h6v-6l-4-4-6-6H22l-8 6-4 4L6 22v2z" stroke="var(--text3)" strokeWidth="1.5" fill="rgba(79,127,255,0.08)"/><circle cx="16" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/><circle cx="40" cy="24" r="3" stroke="var(--text3)" strokeWidth="1.5"/></svg>
}

function VehicleAutocomplete({
  specs, updateSpec, handleBlur, canWrite, onVehicleSelect,
}: {
  specs: LineItemSpecs
  updateSpec: (key: string, value: unknown) => void
  handleBlur: () => void
  canWrite: boolean
  onVehicleSelect: (v: VehicleEntry) => void
}) {
  const currentYear = (specs.vehicleYear as string) || ''
  const currentMake = (specs.vehicleMake as string) || ''
  const currentModel = (specs.vehicleModel as string) || ''

  const yearNum = currentYear ? parseInt(currentYear) : 0
  const availableMakes = yearNum > 0 ? getMakesForYear(yearNum) : ALL_MAKES
  const availableModels = currentMake
    ? (yearNum > 0 ? getModelsForMakeYear(currentMake, yearNum) : getModelsForMake(currentMake))
    : []

  const [dbMeas, setDbMeas] = useState<{
    total_sqft: number | null; side_sqft: number | null
    hood_sqft: number | null; roof_sqft: number | null; back_sqft: number | null
  } | null>(null)
  const [measLoading, setMeasLoading] = useState(false)

  async function fetchDbMeasurement(make: string, model: string, year: string) {
    if (!make || !model) return
    setMeasLoading(true)
    try {
      const params = new URLSearchParams({ make, model })
      if (year) params.set('year', year)
      const res = await fetch(`/api/vehicles/lookup?${params}`)
      const data = await res.json()
      const m = data.measurement ?? null
      setDbMeas(m)
      if (m?.total_sqft) updateSpec('vinylArea', m.total_sqft)
    } catch { setDbMeas(null) }
    finally { setMeasLoading(false) }
  }

  function selectYear(yr: string) {
    updateSpec('vehicleYear', yr)
    const y = parseInt(yr)
    if (currentMake && y > 0) {
      const makes = getMakesForYear(y)
      if (!makes.includes(currentMake)) {
        updateSpec('vehicleMake', '')
        updateSpec('vehicleModel', '')
      } else if (currentModel) {
        const models = getModelsForMakeYear(currentMake, y)
        if (!models.includes(currentModel)) {
          updateSpec('vehicleModel', '')
        } else {
          const v = findVehicle(currentMake, currentModel, yr)
          if (v) onVehicleSelect(v)
          fetchDbMeasurement(currentMake, currentModel, yr)
        }
      }
    }
  }

  function selectMake(make: string) {
    updateSpec('vehicleMake', make)
    if (make !== currentMake) {
      updateSpec('vehicleModel', '')
    }
  }

  function selectModel(model: string) {
    updateSpec('vehicleModel', model)
    const v = findVehicle(currentMake, model, currentYear)
    if (v) onVehicleSelect(v)
    fetchDbMeasurement(currentMake, model, currentYear)
    handleBlur()
  }

  const matchedVehicle = currentMake && currentModel ? findVehicle(currentMake, currentModel, currentYear) : null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Car size={11} style={{ color: 'var(--accent)' }} /> Vehicle Info
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {/* Vehicle silhouette */}
        {matchedVehicle && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 64 }}>
            <VehicleSilhouette tier={matchedVehicle.tier} />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 100px', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Year - dropdown */}
          <div>
            <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Year</label>
            <select
              value={currentYear}
              onChange={e => selectYear(e.target.value)}
              style={{ ...fieldSelectStyle, fontSize: 12 }}
              disabled={!canWrite}
            >
              <option value="">Year</option>
              {ALL_YEARS.map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>

          {/* Make - dropdown */}
          <div>
            <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Make</label>
            <select
              value={currentMake}
              onChange={e => selectMake(e.target.value)}
              style={{ ...fieldSelectStyle, fontSize: 12 }}
              disabled={!canWrite}
            >
              <option value="">Select Make</option>
              {availableMakes.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Model - dropdown */}
          <div>
            <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Model</label>
            <select
              value={currentModel}
              onChange={e => selectModel(e.target.value)}
              style={{ ...fieldSelectStyle, fontSize: 12 }}
              disabled={!canWrite || !currentMake}
            >
              <option value="">{currentMake ? 'Select Model' : 'Select make first'}</option>
              {availableModels.map(m => {
                const v = findVehicle(currentMake, m, currentYear)
                return (
                  <option key={m} value={m}>
                    {m}{v && v.sqft > 0 ? ` (${v.sqft}sqft)` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Color */}
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
      </div>

      {/* Auto-populated info badge */}
      {matchedVehicle && matchedVehicle.sqft > 0 && (
        <div style={{
          display: 'flex', gap: 12, marginTop: 6, padding: '4px 10px',
          background: 'rgba(34,192,122,0.06)', borderRadius: 6,
          border: '1px solid rgba(34,192,122,0.12)', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            PVO Data
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
            {matchedVehicle.sqft} sqft
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
            ${matchedVehicle.basePrice}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
            {matchedVehicle.installHours}hrs
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
            {matchedVehicle.tier.replace('_', ' ')}
          </span>
        </div>
      )}
      {measLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
          <Loader2 size={11} className="animate-spin" /> Looking up measurements...
        </div>
      )}
      {!measLoading && dbMeas && dbMeas.total_sqft && (
        <div style={{
          display: 'flex', gap: 12, marginTop: 6, padding: '4px 10px',
          background: 'rgba(79,127,255,0.06)', borderRadius: 6,
          border: '1px solid rgba(79,127,255,0.15)', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, fontFamily: headingFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            Auto-calculated
          </span>
          <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>
            Total: {dbMeas.total_sqft} sqft
          </span>
          {!!dbMeas.side_sqft && <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>Side: {dbMeas.side_sqft}</span>}
          {!!dbMeas.hood_sqft && <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>Hood: {dbMeas.hood_sqft}</span>}
          {!!dbMeas.roof_sqft && <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: monoFont }}>Roof: {dbMeas.roof_sqft}</span>}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE INFO BLOCK (VIN + Year/Make/Model at top of line item)
// ═══════════════════════════════════════════════════════════════════════════════

function VehicleInfoBlock({
  specs, updateSpec, handleBlur, canWrite, onVehicleSelect, onVehicleDecoded,
}: {
  specs: LineItemSpecs
  updateSpec: (key: string, value: unknown) => void
  handleBlur: () => void
  canWrite: boolean
  onVehicleSelect: (v: VehicleEntry) => void
  onVehicleDecoded?: (data: Record<string, string | undefined>) => void
}) {
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)

  return (
    <div style={{
      marginTop: 12, padding: 14, background: 'var(--bg)',
      border: '1px solid var(--border)', borderRadius: 10,
    }}>
      <div style={{ ...fieldLabelStyle, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Car size={12} style={{ color: 'var(--accent)' }} /> Vehicle Information
        </div>
        <button
          onClick={() => setShowMeasurementModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            color: 'var(--amber)', cursor: 'pointer', fontFamily: headingFont,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}
        >
          <Ruler size={10} /> Sq Ft Lookup
        </button>
      </div>

      {/* VIN Lookup Field */}
      <div style={{ marginBottom: 10, maxWidth: 400 }}>
        <VinLookupField
          value={(specs.vin as string) || ''}
          onChange={(vin) => {
            updateSpec('vin', vin)
          }}
          onVehicleDecoded={(data) => {
            // Delegate batch update to parent (has latestRef in scope)
            onVehicleDecoded?.(data)
            // Cross-reference vehicles.json for sqft/pricing
            const v = findVehicle(data.make, data.model, data.year)
            if (v) onVehicleSelect(v)
          }}
          showCamera
          showManualFallback={false}
          disabled={!canWrite}
        />
      </div>

      {/* Year / Make / Model / Color */}
      <VehicleAutocomplete
        specs={specs}
        updateSpec={updateSpec}
        handleBlur={handleBlur}
        canWrite={canWrite}
        onVehicleSelect={onVehicleSelect}
      />

      {/* Vehicle Measurement Lookup Modal */}
      <VehicleLookupModal
        open={showMeasurementModal}
        onClose={() => setShowMeasurementModal(false)}
        onSelect={(m: MeasurementResult) => {
          updateSpec('vinylArea', m.full_wrap_sqft)
          updateSpec('partialSqft', m.partial_wrap_sqft)
          updateSpec('hoodSqft', m.hood_sqft)
          updateSpec('roofSqft', m.roof_sqft)
          updateSpec('rearSqft', m.back_sqft)
          updateSpec('sideSqft', m.side_sqft)
          updateSpec('measurementSource', 'vehicle_measurements')
          handleBlur()
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINE ITEM CARD
// ═══════════════════════════════════════════════════════════════════════════════

function LineItemCard({
  item, index, canWrite, onChange, onBlurSave, onRemove,
  expandedSections, onToggleSection, leadType, team,
  products, allItems, onOpenAreaCalc,
  onRollUp, onUnroll, rolledUpChildrenTotal,
}: {
  item: LineItem; index: number; canWrite: boolean
  onChange: (item: LineItem) => void; onBlurSave: (item: LineItem) => void; onRemove: () => void
  expandedSections: Record<string, boolean>; onToggleSection: (section: string) => void
  leadType: string; team: Pick<Profile, 'id' | 'name' | 'role'>[]
  products: { id: string; name: string; category: string; calculator_type: string; default_price: number; default_hours: number; description: string }[]
  allItems: LineItem[]
  onOpenAreaCalc: () => void
  onRollUp?: () => void
  onUnroll?: () => void
  rolledUpChildrenTotal?: number
}) {
  const router = useRouter()
  const latestRef = useRef(item)
  latestRef.current = item

  const [showDescription, setShowDescription] = useState(!!item.description)
  const [isCardExpanded, setIsCardExpanded] = useState(false)

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

  // Determine if this product involves a vehicle (show VIN + Y/M/M)
  const calcType = (specs.calculatorType as string) || ''
  const vType = (specs.vehicleType as string) || ''
  const productLineType = (specs.productLineType as string) || ''
  const isBoatProduct = calcType === 'marine' || calcType === 'decking' || vType === 'marine' || productLineType === 'boat_decking'
  const NON_VEHICLE_TYPES = ['wall_wrap', 'signage', 'ppf', 'custom', 'boat_decking', 'apparel', 'print_media']
  const VEHICLE_LINE_TYPES = ['commercial_vehicle', 'box_truck', 'trailer', 'marine']
  const isVehicleProduct = VEHICLE_LINE_TYPES.includes(productLineType) || (!NON_VEHICLE_TYPES.includes(productLineType) && !isBoatProduct && ['vehicle', 'box-truck', 'trailer', 'commercial_vehicle', 'box_truck'].includes(calcType))

  const productTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
    wrap:    { label: 'WRAP',    color: 'var(--accent)', bg: 'rgba(79,127,255,0.12)' },
    ppf:     { label: 'PPF',     color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.12)' },
    decking: { label: 'DECKING', color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)' },
    design:  { label: 'DESIGN',  color: 'var(--purple)', bg: 'rgba(139,92,246,0.12)' },
  }
  // Override label based on productLineType for new types
  const lineTypeLabels: Record<string, { label: string; color: string; bg: string }> = {
    wall_wrap:    { label: 'WALL WRAP', color: 'var(--purple)', bg: 'rgba(139,92,246,0.12)' },
    signage:      { label: 'SIGNAGE',   color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)' },
    apparel:      { label: 'APPAREL',   color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.12)' },
    print_media:  { label: 'PRINT',     color: 'var(--text2)',  bg: 'rgba(90,96,128,0.15)' },
    box_truck:    { label: 'BOX TRUCK', color: 'var(--accent)', bg: 'rgba(79,127,255,0.12)' },
    trailer:      { label: 'TRAILER',   color: 'var(--amber)',  bg: 'rgba(245,158,11,0.12)' },
    marine:       { label: 'MARINE',    color: 'var(--cyan)',   bg: 'rgba(34,211,238,0.12)' },
    boat_decking: { label: 'DECKING',   color: 'var(--green)',  bg: 'rgba(34,192,122,0.12)' },
    commercial_vehicle: { label: 'VEHICLE', color: 'var(--accent)', bg: 'rgba(79,127,255,0.12)' },
  }
  const ptc = (productLineType && lineTypeLabels[productLineType]) || productTypeConfig[item.product_type] || { label: item.product_type.toUpperCase(), color: 'var(--text3)', bg: 'rgba(90,96,128,0.12)' }

  const isRolledUp = !!(item.is_rolled_up || (item.specs as Record<string, unknown>)?.rolledUp)
  const hasRolledUpChildren = (rolledUpChildrenTotal ?? 0) > 0
  const displayTotal = hasRolledUpChildren ? item.total_price + (rolledUpChildrenTotal ?? 0) : item.total_price

  return (
    <div style={{
      background: isRolledUp ? 'var(--bg)' : 'var(--card-bg)',
      border: isRolledUp ? '1px solid var(--border, #2a2d3a)' : '1px solid var(--card-border)',
      borderLeft: isRolledUp ? '3px solid var(--text3)' : undefined,
      borderRadius: isRolledUp ? 8 : 14,
      overflow: 'hidden', transition: 'all 0.2s',
      marginLeft: isRolledUp ? 24 : 0,
      opacity: isRolledUp ? 0.75 : 1,
    }}>
      {/* ── Header Row (Compact ShopVox-style) ──────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: isRolledUp ? '6px 10px' : '8px 12px',
          cursor: 'pointer',
        }}
        onClick={() => setIsCardExpanded(!isCardExpanded)}
      >
        {/* Drag handle */}
        {canWrite && !isRolledUp && (
          <GripVertical size={14} style={{ color: 'var(--text3)', opacity: 0.4, flexShrink: 0, cursor: 'grab' }} onClick={e => e.stopPropagation()} />
        )}
        {/* Expand chevron */}
        <ChevronRight size={13} style={{
          transform: isCardExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', color: 'var(--text3)', flexShrink: 0,
        }} />
        {/* Line item number */}
        <span style={{
          fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
          fontSize: 11, color: 'var(--text3)', fontWeight: 700, minWidth: 18, textAlign: 'center' as const, flexShrink: 0,
        }}>
          {index + 1}
        </span>
        {/* Rolled-up badge */}
        {isRolledUp && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '1px 5px',
            borderRadius: 3, fontSize: 8, fontWeight: 800,
            letterSpacing: '0.05em', fontFamily: headingFont,
            color: 'var(--text3)', background: 'rgba(90,96,128,0.15)', flexShrink: 0,
          }}>
            ROLLED UP
          </span>
        )}
        {/* Type badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
          borderRadius: 4, fontSize: 9, fontWeight: 800,
          letterSpacing: '0.05em', fontFamily: headingFont,
          color: ptc.color, background: ptc.bg, flexShrink: 0,
        }}>
          {ptc.label}
        </span>
        {/* Product name */}
        <span style={{
          fontSize: isRolledUp ? 12 : 13, fontWeight: 700, color: isRolledUp ? 'var(--text3)' : 'var(--text1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          minWidth: 0, flexShrink: 1,
        }}>
          {item.name || 'Untitled Item'}
        </span>
        {/* Collapsed summary chips */}
        {!isCardExpanded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
            {vehicleDesc && (
              <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' as const }}>
                {vehicleDesc}
              </span>
            )}
            {Boolean(specs.wrapType || specs.trailerCoverage) && (
              <span style={{ fontSize: 10, color: 'var(--text2)', background: 'rgba(90,96,128,0.1)', padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap' as const }}>
                {(specs.wrapType as string) || ((specs.trailerCoverage as string) || '').replace('_', ' ')}
              </span>
            )}
            {(specs.vinylArea as number) > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: monoFont, whiteSpace: 'nowrap' as const }}>
                {specs.vinylArea}sqft
              </span>
            )}
            {(specs.estimatedHours as number) > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: monoFont, whiteSpace: 'nowrap' as const }}>
                {specs.estimatedHours}h
              </span>
            )}
            {item.quantity > 1 && (
              <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: monoFont }}>
                x{item.quantity}
              </span>
            )}
            {!!(specs.mockupImages as unknown) && (
              <Paintbrush size={12} style={{ color: 'var(--purple)', flexShrink: 0 }} />
            )}
          </div>
        )}
        {/* Price */}
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: isCardExpanded ? 'auto' : 8 }}>
          <span style={{
            fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
            fontSize: isRolledUp ? 13 : 15, fontWeight: 800, color: isRolledUp ? 'var(--text3)' : 'var(--text1)',
          }}>
            {fmtCurrency(isRolledUp ? item.total_price : displayTotal)}
          </span>
          {hasRolledUpChildren && !isRolledUp && (
            <div style={{ fontSize: 8, color: 'var(--text3)', fontFamily: monoFont }}>
              incl. rolled-up
            </div>
          )}
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {canWrite && isRolledUp && onUnroll && (
            <button
              onClick={onUnroll}
              title="Unroll this item"
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 6px',
                background: 'rgba(90,96,128,0.15)', border: 'none',
                borderRadius: 4, cursor: 'pointer', color: 'var(--text2)',
              }}
            >
              <UnfoldVertical size={11} />
            </button>
          )}
          {canWrite && !isRolledUp && onRollUp && index > 0 && (
            <button
              onClick={onRollUp}
              title="Roll up into previous item"
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 6px',
                background: 'rgba(79,127,255,0.1)', border: 'none',
                borderRadius: 4, cursor: 'pointer', color: 'var(--accent)',
              }}
            >
              <FoldVertical size={11} />
            </button>
          )}
          {canWrite && (
            <button
              onClick={onRemove}
              title="Delete"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 3, display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded Content ───────────────────────────────────────────── */}
      <div style={{
        maxHeight: isCardExpanded ? 5000 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 16px 16px' }}>

                    {/* Product Type Selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: headingFont }}>
              Product Type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRODUCT_TYPE_OPTIONS.map(opt => {
                const isSel = (specs.productLineType as string) === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (!canWrite) return
                      const updated: LineItem = {
                        ...latestRef.current,
                        product_type: opt.productType,
                        specs: {
                          ...latestRef.current.specs,
                          productLineType: opt.key,
                          vehicleType: opt.vehicleType || latestRef.current.specs.vehicleType,
                          calculatorType: opt.calcType || '',
                        },
                      }
                      onChange(updated)
                    }}
                    style={{
                      padding: '5px 10px', borderRadius: 6, cursor: canWrite ? 'pointer' : 'default',
                      border: isSel ? '2px solid ' + opt.color : '1px solid var(--border)',
                      background: isSel ? opt.color + '22' : 'var(--surface)',
                      color: isSel ? opt.color : 'var(--text2)',
                      fontSize: 12, fontWeight: 700, fontFamily: headingFont,
                      textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
{/* ── VIN + Vehicle Info (vehicle products only) ────────────── */}
          {isVehicleProduct && (
            <>
              <VehicleInfoBlock
                specs={specs}
                updateSpec={updateSpec}
                handleBlur={handleBlur}
                canWrite={canWrite}
                onVehicleDecoded={(data) => {
                  // Batch all spec updates into a single onChange to prevent stale-ref data loss
                  const batchSpecs: Record<string, unknown> = { ...latestRef.current.specs }
                  batchSpecs.vehicleYear = data.year
                  batchSpecs.vehicleMake = data.make
                  batchSpecs.vehicleModel = data.model
                  if (data.trim) batchSpecs.vehicleTrim = data.trim
                  if (data.bodyClass) batchSpecs.bodyClass = data.bodyClass
                  if (data.driveType) batchSpecs.driveType = data.driveType
                  if (data.engineCylinders && data.engineLiters) {
                    batchSpecs.engine = `${data.engineLiters}L ${data.engineCylinders}cyl`
                  }
                  const updated = { ...latestRef.current, specs: batchSpecs as typeof latestRef.current.specs }
                  onChange(updated)
                }}
                onVehicleSelect={(v) => {
                  const updated = { ...latestRef.current }
                  const newSpecs = { ...updated.specs, vinylArea: v.sqft, vehicleYear: String(v.year), vehicleMake: v.make, vehicleModel: v.model, vehicleTier: v.tier }
                  if (v.basePrice > 0) {
                    updated.unit_price = v.basePrice
                    updated.total_price = (updated.quantity * v.basePrice) - updated.unit_discount
                    newSpecs.estimatedHours = v.installHours
                  }
                  updated.specs = newSpecs
                  onChange(updated)
                }}
              />

              {/* ── Panel Selector (after vehicle is selected) ──────────── */}
              {specs.vehicleMake && specs.vehicleModel && (() => {
                const tier = (specs.vehicleTier as string) || (specs.vehicleType as string) || ''
                const panelKey = TIER_TO_PANEL_KEY[tier] || ''
                if (!panelKey && !tier) return null
                return (
                  <div style={{ marginTop: 10 }}>
                    <PanelSelector
                      vehicleType={panelKey || tier}
                      onPanelsChange={(_panels: Panel[], totalSqft: number) => {
                        if (totalSqft > 0) {
                          const updated = { ...latestRef.current }
                          updated.specs = { ...updated.specs, vinylArea: totalSqft }
                          onChange(updated)
                        }
                      }}
                    />
                  </div>
                )
              })()}
            </>
          )}

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
                style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, textAlign: 'center' as const }}
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
                style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, textAlign: 'right' as const }}
                disabled={!canWrite}
                min={0} step={0.01}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Total</label>
              <div style={{
                ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
                padding: '7px 10px', fontSize: 14, fontWeight: 700,
                color: 'var(--text1)', textAlign: 'right' as const,
                background: 'rgba(34,192,122,0.06)', borderRadius: 6,
                border: '1px solid rgba(34,192,122,0.15)',
              }}>
                {fmtCurrency(item.total_price)}
              </div>
            </div>
          </div>

          {/* ── Product Selector + Quick Actions ─────────────────────── */}
          {products.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', maxWidth: 280 }}>
                <label style={fieldLabelStyle}>
                  <Package size={10} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                  Product
                </label>
                <select
                  value={(specs.productId as string) || ''}
                  onChange={e => {
                    const prod = products.find(p => p.id === e.target.value)
                    if (!prod) return
                    const calcToVT: Record<string, string> = { 'vehicle': '', 'box-truck': 'box_truck', 'trailer': 'trailer', 'marine': 'marine', 'ppf': 'ppf', 'simple': 'custom' }
                    const calcToPT: Record<string, string> = { 'vehicle': 'wrap', 'box-truck': 'wrap', 'trailer': 'wrap', 'marine': 'decking', 'ppf': 'ppf', 'simple': 'wrap' }
                    const updated: LineItem = {
                      ...latestRef.current,
                      name: prod.name,
                      product_type: (calcToPT[prod.calculator_type] || 'wrap') as LineItem['product_type'],
                      unit_price: prod.default_price || latestRef.current.unit_price,
                      total_price: ((prod.default_price || latestRef.current.unit_price) * latestRef.current.quantity) - latestRef.current.unit_discount,
                      specs: {
                        ...latestRef.current.specs,
                        productId: prod.id,
                        calculatorType: prod.calculator_type,
                        vehicleType: calcToVT[prod.calculator_type] || latestRef.current.specs.vehicleType,
                        estimatedHours: prod.default_hours || latestRef.current.specs.estimatedHours,
                      },
                    }
                    onChange(updated)
                  }}
                  style={fieldSelectStyle}
                  disabled={!canWrite}
                >
                  <option value="">Select Product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.default_price > 0 ? ` ($${p.default_price})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={onOpenAreaCalc}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid rgba(34,211,238,0.3)',
                  background: 'rgba(34,211,238,0.06)', color: 'var(--cyan)',
                }}
              >
                <Ruler size={12} /> Area Calculator
              </button>
              <button
                onClick={() => showToast('Design link -- select from Design Studio')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid rgba(139,92,246,0.3)',
                  background: 'rgba(139,92,246,0.06)', color: 'var(--purple)',
                }}
              >
                <Link2 size={12} /> Design Link
              </button>
              <button
                onClick={() => router.push('/media')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.06)', color: 'var(--amber)',
                }}
                title="Go to Media Library"
              >
                <Image size={12} /> Photos
              </button>
            </div>
          )}

          {/* ── Rollup toggle ────────────────────────────────────────────── */}
          {allItems.length > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
              padding: '6px 10px', background: 'var(--bg)', borderRadius: 6,
              border: '1px solid var(--border)',
            }}>
              <button
                onClick={() => {
                  if (!canWrite) return
                  updateSpec('rolledUp', !specs.rolledUp)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                  color: specs.rolledUp ? 'var(--green)' : 'var(--text3)', fontSize: 11, fontWeight: 600,
                }}
              >
                {specs.rolledUp
                  ? <ToggleRight size={16} style={{ color: 'var(--green)' }} />
                  : <ToggleLeft size={16} />}
                Roll up into parent
              </button>
              {!!specs.rolledUp && (
                <select
                  value={(specs.parentItemId as string) || ''}
                  onChange={e => updateSpec('parentItemId', e.target.value)}
                  style={{ ...fieldSelectStyle, fontSize: 11, padding: '3px 8px', flex: 1, maxWidth: 240 }}
                  disabled={!canWrite}
                >
                  <option value="">Select parent item...</option>
                  {allItems.filter(li => li.id !== item.id && !li.specs?.rolledUp).map(li => (
                    <option key={li.id} value={li.id}>{li.name || 'Untitled'}</option>
                  ))}
                </select>
              )}
            </div>
          )}

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
              <span>Sqft: <span style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, color: 'var(--text1)', fontWeight: 600 }}>{specs.vinylArea}</span></span>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PRODUCT-TYPE CALCULATORS (conditional on category)           */}
          {/* ═══════════════════════════════════════════════════════════════ */}

          {/* â”€â”€ Commercial Vehicle 3Ã—3 Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {isVehicleProduct && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Car size={12} style={{ color: 'var(--accent)' }} /> Quick Select
              </div>
              {(['Compact', 'Mid', 'Full'] as const).map(size => (
                <div key={size} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{size}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {COMMERCIAL_VEHICLE_GRID.filter(c => c.size === size).map(cell => {
                      const isSelected = (specs.cvGridKey as string) === cell.key
                      return (
                        <button
                          key={cell.key}
                          onClick={() => {
                            if (!canWrite) return
                            updateSpec('cvGridKey', cell.key)
                            updateSpec('vehicleType', cell.vehicleType)
                            handleCategoryChange(cell.vehicleType)
                          }}
                          style={{
                            flex: 1, padding: '6px 4px', borderRadius: 6, cursor: canWrite ? 'pointer' : 'default',
                            border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(79,127,255,0.1)' : 'var(--surface)',
                            textAlign: 'center' as const,
                          }}
                        >
                          <div style={{ fontSize: 9, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text2)', textTransform: 'uppercase' as const }}>
                            {cell.coverage}
                          </div>
                          <div style={{ fontFamily: monoFont, fontSize: 11, fontWeight: 800, color: isSelected ? 'var(--accent)' : 'var(--text1)' }}>
                            ${cell.price}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text3)' }}>{cell.estimatedHours}h</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

{/* ── Wrap Zone Selector (vehicle wraps with sqft data) ──────── */}
          {isVehicleProduct && (specs.vinylArea as number) > 0 && !isBoatProduct && (
            <div style={{ marginTop: 12 }}>
              <WrapZoneSelector
                specs={specs}
                updateSpec={updateSpec}
                canWrite={canWrite}
                vehicleSqft={(specs.vinylArea as number) || 0}
              />
            </div>
          )}

          {/* ── Decking Calculator ──────────────────────────────────────── */}
          {(calcType === 'decking' || isBoatProduct) && (
            <div style={{ marginTop: 12 }}>
              <DeckingCalculator
                specs={specs}
                updateSpec={updateSpec}
                canWrite={canWrite}
                onPriceUpdate={(totalPrice, materialCost, laborCost, totalSqft) => {
                  const updated = { ...latestRef.current }
                  updated.unit_price = totalPrice
                  updated.total_price = (updated.quantity * totalPrice) - updated.unit_discount
                  updated.specs = { ...updated.specs, materialCost, laborCost, vinylArea: totalSqft }
                  onChange(updated)
                }}
              />
            </div>
          )}

          {/* ── Custom Product Calculator Gadget ──────────────────────── */}
          {specs.vehicleType === 'custom' && !['wall_wrap', 'signage', 'apparel', 'print_media'].includes(productLineType) && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Wrench size={12} style={{ color: 'var(--purple)' }} /> Custom Product
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Width (ft)</label>
                  <input type="number" value={(specs.customWidth as number) || ''} onChange={e => {
                    const w = Number(e.target.value)
                    const h = (specs.customHeight as number) || 0
                    updateSpec('customWidth', w)
                    if (w > 0 && h > 0) setTimeout(() => updateSpec('vinylArea', Math.round(w * h)), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (ft)</label>
                  <input type="number" value={(specs.customHeight as number) || ''} onChange={e => {
                    const h = Number(e.target.value)
                    const w = (specs.customWidth as number) || 0
                    updateSpec('customHeight', h)
                    if (w > 0 && h > 0) setTimeout(() => updateSpec('vinylArea', Math.round(w * h)), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Total Sqft</label>
                  <input type="number" value={specs.vinylArea || ''} onChange={e => updateSpec('vinylArea', Number(e.target.value))} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Est. Hours</label>
                  <input type="number" value={(specs.estimatedHours as number) || ''} onChange={e => updateSpec('estimatedHours', Number(e.target.value))} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Description</label>
                <input value={(specs.customDescription as string) || ''} onChange={e => updateSpec('customDescription', e.target.value)} placeholder="Describe the custom product..." style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} />
              </div>
            </div>
          )}

          {/* ── Box Truck Calculator Gadget ──────────────────────────── */}
          {specs.vehicleType === 'box_truck' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Car size={12} style={{ color: 'var(--accent)' }} /> Box Truck Dimensions
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Length (ft)</label>
                  <input type="number" value={(specs.boxLength as number) || ''} onChange={e => {
                    const l = Number(e.target.value)
                    const w = (specs.boxWidth as number) || 8
                    const h = (specs.boxHeight as number) || 7
                    const cab = (specs.cabWrap as boolean) ? 60 : 0
                    const sides = 2 * l * h
                    const back = w * h
                    const sqft = sides + back + cab
                    updateSpec('boxLength', l)
                    setTimeout(() => {
                      updateSpec('vinylArea', Math.round(sqft))
                      updateSpec('estimatedHours', Math.round(sqft / 30))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Width (ft)</label>
                  <input type="number" value={(specs.boxWidth as number) || ''} onChange={e => {
                    const w = Number(e.target.value)
                    const l = (specs.boxLength as number) || 0
                    const h = (specs.boxHeight as number) || 7
                    const cab = (specs.cabWrap as boolean) ? 60 : 0
                    const sides = 2 * l * h
                    const back = w * h
                    const sqft = sides + back + cab
                    updateSpec('boxWidth', w)
                    setTimeout(() => { updateSpec('vinylArea', Math.round(sqft)) }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (ft)</label>
                  <input type="number" value={(specs.boxHeight as number) || 7} onChange={e => {
                    const h = Number(e.target.value)
                    const l = (specs.boxLength as number) || 0
                    const w = (specs.boxWidth as number) || 8
                    const cab = (specs.cabWrap as boolean) ? 60 : 0
                    const sides = 2 * l * h
                    const back = w * h
                    const sqft = sides + back + cab
                    updateSpec('boxHeight', h)
                    setTimeout(() => {
                      updateSpec('vinylArea', Math.round(sqft))
                      updateSpec('estimatedHours', Math.round(sqft / 30))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Cab Wrap</label>
                  <button
                    onClick={() => {
                      if (!canWrite) return
                      const newCab = !(specs.cabWrap as boolean)
                      const cab = newCab ? 60 : 0
                      const l = (specs.boxLength as number) || 0
                      const w = (specs.boxWidth as number) || 8
                      const h = (specs.boxHeight as number) || 7
                      const sqft = 2 * l * h + w * h + cab
                      updateSpec('cabWrap', newCab)
                      setTimeout(() => { updateSpec('vinylArea', Math.round(sqft)) }, 0)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.cabWrap as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.cabWrap as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.cabWrap as boolean) ? 'Yes (+60 sqft)' : 'No'}
                  </button>
                </div>
              </div>
              {(specs.boxLength as number) > 0 && (
                <div style={{
                  display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px',
                  background: 'rgba(79,127,255,0.06)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>Sides: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{Math.round(2 * ((specs.boxLength as number) || 0) * ((specs.boxHeight as number) || 7))} sqft</span></span>
                  <span style={{ color: 'var(--text2)' }}>Back: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{Math.round(((specs.boxWidth as number) || 8) * ((specs.boxHeight as number) || 7))} sqft</span></span>
                  {(specs.cabWrap as boolean) && <span style={{ color: 'var(--text2)' }}>Cab: <span style={{ fontFamily: monoFont, color: 'var(--green)', fontWeight: 700 }}>60 sqft</span></span>}
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Total: <span style={{ fontFamily: monoFont }}>{specs.vinylArea || 0} sqft</span></span>
                </div>
              )}
            </div>
          )}

          {/* ── Trailer Calculator Gadget ────────────────────────────── */}
          {specs.vehicleType === 'trailer' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Car size={12} style={{ color: 'var(--amber)' }} /> Trailer Dimensions
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Coverage</label>
                  <select
                    value={(specs.trailerCoverage as string) || 'full'}
                    onChange={e => {
                      const cov = e.target.value
                      const mult = cov === 'full' ? 1 : cov === 'three_quarter' ? 0.75 : 0.5
                      const l = (specs.trailerLength as number) || 0
                      const h = (specs.trailerHeight as number) || 7.5
                      const sqft = Math.round(l * h * 2 * mult)
                      updateSpec('trailerCoverage', cov)
                      setTimeout(() => {
                        updateSpec('vinylArea', sqft)
                        updateSpec('estimatedHours', Math.round(sqft / 25))
                      }, 0)
                    }}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="full">Full (100%)</option>
                    <option value="three_quarter">3/4 (75%)</option>
                    <option value="half">1/2 (50%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Length (ft)</label>
                  <input type="number" value={(specs.trailerLength as number) || ''} onChange={e => {
                    const l = Number(e.target.value)
                    const h = (specs.trailerHeight as number) || 7.5
                    const cov = (specs.trailerCoverage as string) || 'full'
                    const mult = cov === 'full' ? 1 : cov === 'three_quarter' ? 0.75 : 0.5
                    const sqft = Math.round(l * h * 2 * mult)
                    updateSpec('trailerLength', l)
                    setTimeout(() => {
                      updateSpec('vinylArea', sqft)
                      updateSpec('estimatedHours', Math.round(sqft / 25))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (ft)</label>
                  <input type="number" value={(specs.trailerHeight as number) || 7.5} onChange={e => {
                    const h = Number(e.target.value)
                    const l = (specs.trailerLength as number) || 0
                    const cov = (specs.trailerCoverage as string) || 'full'
                    const mult = cov === 'full' ? 1 : cov === 'three_quarter' ? 0.75 : 0.5
                    const sqft = Math.round(l * h * 2 * mult)
                    updateSpec('trailerHeight', h)
                    setTimeout(() => {
                      updateSpec('vinylArea', sqft)
                      updateSpec('estimatedHours', Math.round(sqft / 25))
                    }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>V-Nose</label>
                  <button
                    onClick={() => { if (canWrite) updateSpec('vNose', !(specs.vNose as boolean)) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.vNose as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.vNose as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.vNose as boolean) ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>
              {(specs.vNose as boolean) && (
                <div className="grid grid-cols-2" style={{ gap: 10, marginTop: 8 }}>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>V-Nose Height (ft)</label>
                    <input type="number" value={(specs.vNoseHeight as number) || ''} onChange={e => updateSpec('vNoseHeight', Number(e.target.value))} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>V-Nose Length (ft)</label>
                    <input type="number" value={(specs.vNoseLength as number) || ''} onChange={e => updateSpec('vNoseLength', Number(e.target.value))} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                  </div>
                </div>
              )}
              {(specs.trailerLength as number) > 0 && (
                <div style={{
                  display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px',
                  background: 'rgba(245,158,11,0.06)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>Per Side: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{Math.round(((specs.trailerLength as number) || 0) * ((specs.trailerHeight as number) || 7.5))} sqft</span></span>
                  <span style={{ color: 'var(--text2)' }}>Coverage: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{((specs.trailerCoverage as string) || 'full').replace('_', ' ')}</span></span>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Total: <span style={{ fontFamily: monoFont }}>{specs.vinylArea || 0} sqft</span></span>
                </div>
              )}
            </div>
          )}

          {/* ── Marine/Decking Calculator Gadget ─────────────────────── */}
          {specs.vehicleType === 'marine' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Layers size={12} style={{ color: 'var(--cyan)' }} /> Marine / Decking
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Section</label>
                  <select
                    value={(specs.marineSection as string) || 'main_deck'}
                    onChange={e => updateSpec('marineSection', e.target.value)}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="main_deck">Main Deck</option>
                    <option value="swim_platform">Swim Platform</option>
                    <option value="helm_pad">Helm Pad</option>
                    <option value="bow_pad">Bow Pad</option>
                    <option value="gunnels">Gunnels</option>
                    <option value="full_boat">Full Boat</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Linear Feet</label>
                  <input type="number" value={(specs.linearFeet as number) || ''} onChange={e => {
                    const lf = Number(e.target.value)
                    const passes = (specs.marinePasses as number) || 1
                    const width = (specs.marineWidth as number) || 54
                    const sqft = Math.round(lf * (width / 12) * passes)
                    updateSpec('linearFeet', lf)
                    setTimeout(() => { updateSpec('vinylArea', sqft) }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Passes</label>
                  <input type="number" value={(specs.marinePasses as number) || 1} onChange={e => {
                    const passes = Number(e.target.value)
                    const lf = (specs.linearFeet as number) || 0
                    const width = (specs.marineWidth as number) || 54
                    const sqft = Math.round(lf * (width / 12) * passes)
                    updateSpec('marinePasses', passes)
                    setTimeout(() => { updateSpec('vinylArea', sqft) }, 0)
                  }} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={1} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 10, marginTop: 8 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material Width (in)</label>
                  <input type="number" value={(specs.marineWidth as number) || 54} onChange={e => updateSpec('marineWidth', Number(e.target.value))} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont }, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vertical Gunnels</label>
                  <button
                    onClick={() => { if (canWrite) updateSpec('verticalGunnels', !(specs.verticalGunnels as boolean)) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.verticalGunnels as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.verticalGunnels as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.verticalGunnels as boolean) ? 'Yes' : 'No'}
                  </button>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Installer</label>
                  <select
                    value={(specs.marineInstaller as string) || ''}
                    onChange={e => updateSpec('marineInstaller', e.target.value)}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="">Select Installer</option>
                    {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              {(specs.linearFeet as number) > 0 && (
                <div style={{
                  display: 'flex', gap: 16, marginTop: 10, padding: '8px 12px',
                  background: 'rgba(34,211,238,0.06)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ color: 'var(--text2)' }}>Linear Ft: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{specs.linearFeet as number}</span></span>
                  <span style={{ color: 'var(--text2)' }}>Passes: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{(specs.marinePasses as number) || 1}</span></span>
                  <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>Total: <span style={{ fontFamily: monoFont }}>{specs.vinylArea || 0} sqft</span></span>
                </div>
              )}
            </div>
          )}

          {/* ── PPF Calculator Gadget ────────────────────────────────── */}
          {specs.vehicleType === 'ppf' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <CircleDot size={12} style={{ color: 'var(--cyan)' }} /> PPF Packages
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
                {([
                  { key: 'standard_front', name: 'Standard Front', price: 1200, pay: 400, material: 250, hours: 4 },
                  { key: 'full_front', name: 'Full Front', price: 2500, pay: 750, material: 500, hours: 6 },
                  { key: 'track_pack', name: 'Track Pack', price: 4500, pay: 1200, material: 900, hours: 10 },
                  { key: 'full_body', name: 'Full Body', price: 7000, pay: 2000, material: 1600, hours: 16 },
                  { key: 'hood_only', name: 'Hood Only', price: 800, pay: 250, material: 150, hours: 2 },
                  { key: 'rocker_panels', name: 'Rocker Panels', price: 600, pay: 200, material: 100, hours: 2 },
                  { key: 'headlights', name: 'Headlights', price: 350, pay: 100, material: 50, hours: 1 },
                  { key: 'door_cups', name: 'Door Cup Guards', price: 200, pay: 60, material: 30, hours: 0.5 },
                ] as const).map(pkg => {
                  const isSelected = (specs.ppfPackage as string) === pkg.key
                  return (
                    <button
                      key={pkg.key}
                      onClick={() => {
                        if (!canWrite) return
                        updateSpec('ppfPackage', pkg.key)
                        const updated = {
                          ...latestRef.current,
                          name: item.name || pkg.name,
                          unit_price: pkg.price,
                          total_price: (latestRef.current.quantity * pkg.price) - latestRef.current.unit_discount,
                          specs: {
                            ...latestRef.current.specs,
                            ppfPackage: pkg.key,
                            materialCost: pkg.material,
                            laborCost: pkg.pay,
                            laborPrice: pkg.pay,
                            estimatedHours: pkg.hours,
                          },
                        }
                        onChange(updated)
                      }}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: canWrite ? 'pointer' : 'default',
                        border: isSelected ? '2px solid var(--cyan)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(34,211,238,0.08)' : 'var(--surface)',
                        textAlign: 'left' as const,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'var(--cyan)' : 'var(--text1)', marginBottom: 4 }}>
                        {pkg.name}
                      </div>
                      <div style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: isSelected ? 'var(--cyan)' : 'var(--text1)' }}>
                        {fmtCurrency(pkg.price)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                        {pkg.hours}h / ${pkg.pay} pay
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Wall Wrap Calculator Gadget (NEW) ──────────────────────── */}
          {productLineType === 'wall_wrap' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Layers size={12} style={{ color: 'var(--purple)' }} /> Wall Wrap Calculator
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Width (ft)</label>
                  <input type="number" value={(specs.wallWidth as number) || ''} onChange={e => {
                    const w = Number(e.target.value)
                    const h = (specs.wallHeight as number) || 0
                    const numWalls = (specs.numWalls as number) || 1
                    const deduction = (specs.windowDoorDeduction as boolean) ? 0.85 : 1
                    const sqft = Math.round(w * h * numWalls * deduction)
                    updateSpec('wallWidth', w)
                    setTimeout(() => updateSpec('vinylArea', sqft), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (ft)</label>
                  <input type="number" value={(specs.wallHeight as number) || ''} onChange={e => {
                    const h = Number(e.target.value)
                    const w = (specs.wallWidth as number) || 0
                    const numWalls = (specs.numWalls as number) || 1
                    const deduction = (specs.windowDoorDeduction as boolean) ? 0.85 : 1
                    const sqft = Math.round(w * h * numWalls * deduction)
                    updateSpec('wallHeight', h)
                    setTimeout(() => updateSpec('vinylArea', sqft), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Num Walls</label>
                  <input type="number" value={(specs.numWalls as number) || 1} onChange={e => {
                    const n = Number(e.target.value)
                    const w = (specs.wallWidth as number) || 0
                    const h = (specs.wallHeight as number) || 0
                    const deduction = (specs.windowDoorDeduction as boolean) ? 0.85 : 1
                    const sqft = Math.round(w * h * n * deduction)
                    updateSpec('numWalls', n)
                    setTimeout(() => updateSpec('vinylArea', sqft), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={1} max={20} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Win/Door Deduct</label>
                  <button
                    onClick={() => {
                      if (!canWrite) return
                      const newVal = !(specs.windowDoorDeduction as boolean)
                      const w = (specs.wallWidth as number) || 0
                      const h = (specs.wallHeight as number) || 0
                      const n = (specs.numWalls as number) || 1
                      const deduction = newVal ? 0.85 : 1
                      updateSpec('windowDoorDeduction', newVal)
                      setTimeout(() => updateSpec('vinylArea', Math.round(w * h * n * deduction)), 0)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.windowDoorDeduction as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.windowDoorDeduction as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.windowDoorDeduction as boolean) ? '-15%' : 'No'}
                  </button>
                </div>
              </div>
              {/* Material selector */}
              <div style={{ marginTop: 10 }}>
                <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {WALL_WRAP_MATERIALS.map(mat => {
                    const selected = (specs.wallMaterial as string) === mat.key
                    return (
                      <button key={mat.key} onClick={() => {
                        if (!canWrite) return
                        updateSpec('wallMaterial', mat.key)
                        const sqft = (specs.vinylArea as number) || 0
                        if (sqft > 0) updateSpec('materialCost', Math.round(sqft * mat.costPerSqft * 100) / 100)
                      }} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        cursor: canWrite ? 'pointer' : 'default',
                        border: selected ? '2px solid var(--purple)' : '1px solid var(--border)',
                        background: selected ? 'rgba(139,92,246,0.08)' : 'transparent',
                        color: selected ? 'var(--purple)' : 'var(--text3)',
                      }}>
                        {mat.label} <span style={{ fontFamily: monoFont }}>${mat.costPerSqft}</span>/sqft
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Outputs */}
              {(specs.wallWidth as number) > 0 && (specs.wallHeight as number) > 0 && (
                <div style={{ ...gadgetOutputStyle, background: 'rgba(139,92,246,0.06)' }}>
                  <span style={{ color: 'var(--text2)' }}>Total Sqft: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{specs.vinylArea || 0}</span></span>
                  <span style={{ color: 'var(--text2)' }}>Panels (4x8): <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{Math.ceil(((specs.vinylArea as number) || 0) / 32)}</span></span>
                  {specs.materialCost && (
                    <span style={{ color: 'var(--purple)', fontWeight: 700 }}>Material: <span style={{ fontFamily: monoFont }}>{fmtCurrency(specs.materialCost || 0)}</span></span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Signage Calculator Gadget (NEW) ─────────────────────────── */}
          {productLineType === 'signage' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Layers size={12} style={{ color: 'var(--amber)' }} /> Signage Calculator
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Sign Type</label>
                  <select
                    value={(specs.signType as string) || ''}
                    onChange={e => updateSpec('signType', e.target.value)}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="">Select Type</option>
                    {SIGNAGE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Width (in)</label>
                  <input type="number" value={(specs.signWidth as number) || ''} onChange={e => {
                    const w = Number(e.target.value)
                    const h = (specs.signHeight as number) || 0
                    const qty = (specs.signQuantity as number) || 1
                    const sqft = Math.round((w * h / 144) * 100) / 100
                    updateSpec('signWidth', w)
                    setTimeout(() => updateSpec('vinylArea', sqft * qty), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (in)</label>
                  <input type="number" value={(specs.signHeight as number) || ''} onChange={e => {
                    const h = Number(e.target.value)
                    const w = (specs.signWidth as number) || 0
                    const qty = (specs.signQuantity as number) || 1
                    const sqft = Math.round((w * h / 144) * 100) / 100
                    updateSpec('signHeight', h)
                    setTimeout(() => updateSpec('vinylArea', sqft * qty), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Quantity</label>
                  <input type="number" value={(specs.signQuantity as number) || 1} onChange={e => {
                    const qty = Number(e.target.value)
                    const w = (specs.signWidth as number) || 0
                    const h = (specs.signHeight as number) || 0
                    const sqft = Math.round((w * h / 144) * 100) / 100
                    updateSpec('signQuantity', qty)
                    setTimeout(() => updateSpec('vinylArea', sqft * qty), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={1} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 10, marginTop: 8 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Double-Sided</label>
                  <button
                    onClick={() => { if (canWrite) updateSpec('doubleSided', !(specs.doubleSided as boolean)) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.doubleSided as boolean) ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.doubleSided as boolean) ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                    {(specs.doubleSided as boolean) ? 'Yes' : 'No'}
                  </button>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Rush Order</label>
                  <button
                    onClick={() => { if (canWrite) updateSpec('rushOrder', !(specs.rushOrder as boolean)) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: 'none', cursor: canWrite ? 'pointer' : 'default',
                      padding: '4px 0', color: (specs.rushOrder as boolean) ? 'var(--red)' : 'var(--text3)', fontSize: 12,
                    }}
                  >
                    {(specs.rushOrder as boolean) ? <ToggleRight size={18} style={{ color: 'var(--red)' }} /> : <ToggleLeft size={18} />}
                    {(specs.rushOrder as boolean) ? 'Rush (+25%)' : 'No'}
                  </button>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material</label>
                  <select
                    value={(specs.signMaterial as string) || ''}
                    onChange={e => {
                      const matKey = e.target.value
                      updateSpec('signMaterial', matKey)
                      const mat = SIGNAGE_MATERIALS.find(m => m.key === matKey)
                      if (mat) {
                        const sqft = (specs.vinylArea as number) || 0
                        const doubleSided = (specs.doubleSided as boolean) ? 2 : 1
                        updateSpec('materialCost', Math.round(sqft * mat.costPerSqft * doubleSided * 100) / 100)
                      }
                    }}
                    style={fieldSelectStyle} disabled={!canWrite}
                  >
                    <option value="">Select Material</option>
                    {SIGNAGE_MATERIALS.map(m => (
                      <option key={m.key} value={m.key}>{m.label} (${m.costPerSqft}/sqft)</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Outputs */}
              {(specs.signWidth as number) > 0 && (specs.signHeight as number) > 0 && (
                <div style={{ ...gadgetOutputStyle, background: 'rgba(245,158,11,0.06)' }}>
                  <span style={{ color: 'var(--text2)' }}>Size: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{specs.signWidth as number}&quot;x{specs.signHeight as number}&quot;</span></span>
                  <span style={{ color: 'var(--text2)' }}>Sqft: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{((specs.vinylArea as number) || 0).toFixed(1)}</span></span>
                  <span style={{ color: 'var(--text2)' }}>Qty: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{(specs.signQuantity as number) || 1}</span></span>
                  {(specs.doubleSided as boolean) && <span style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 700 }}>2-SIDED</span>}
                  {(specs.rushOrder as boolean) && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>RUSH</span>}
                  {specs.materialCost && (
                    <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Material: <span style={{ fontFamily: monoFont }}>{fmtCurrency(specs.materialCost || 0)}</span></span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Print Media Calculator ──────────────────────────────────── */}
          {productLineType === 'print_media' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Image size={12} style={{ color: 'var(--text2)' }} /> Print Media Calculator
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Width (in)</label>
                  <input type="number" value={(specs.printWidth as number) || ''} onChange={e => {
                    const w = Number(e.target.value); const h = (specs.printHeight as number) || 0; const qty = (specs.printQuantity as number) || 1
                    updateSpec('printWidth', w); setTimeout(() => updateSpec('vinylArea', Math.round((w * h / 144) * qty * 100) / 100), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Height (in)</label>
                  <input type="number" value={(specs.printHeight as number) || ''} onChange={e => {
                    const h = Number(e.target.value); const w = (specs.printWidth as number) || 0; const qty = (specs.printQuantity as number) || 1
                    updateSpec('printHeight', h); setTimeout(() => updateSpec('vinylArea', Math.round((w * h / 144) * qty * 100) / 100), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={0} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Quantity</label>
                  <input type="number" value={(specs.printQuantity as number) || 1} onChange={e => {
                    const qty = Number(e.target.value); const w = (specs.printWidth as number) || 0; const h = (specs.printHeight as number) || 0
                    updateSpec('printQuantity', qty); setTimeout(() => updateSpec('vinylArea', Math.round((w * h / 144) * qty * 100) / 100), 0)
                  }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12 }} disabled={!canWrite} min={1} />
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Finish</label>
                  <select value={(specs.printFinish as string) || 'matte'} onChange={e => updateSpec('printFinish', e.target.value)} style={fieldSelectStyle} disabled={!canWrite}>
                    <option value="matte">Matte</option><option value="gloss">Gloss</option><option value="satin">Satin</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[{ key: 'vinyl', label: 'Vinyl', cost: 1.20 }, { key: 'canvas', label: 'Canvas', cost: 3.50 }, { key: 'coroplast', label: 'Coroplast', cost: 2.00 }, { key: 'foam_board', label: 'Foam Board', cost: 1.50 }, { key: 'mesh', label: 'Mesh', cost: 1.80 }].map(mat => {
                    const sel = (specs.printMaterial as string) === mat.key
                    return <button key={mat.key} onClick={() => { if (!canWrite) return; updateSpec('printMaterial', mat.key); const sq = (specs.vinylArea as number) || 0; if (sq > 0) updateSpec('materialCost', Math.round(sq * mat.cost * 100) / 100) }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: canWrite ? 'pointer' : 'default', border: sel ? '2px solid var(--text2)' : '1px solid var(--border)', background: sel ? 'rgba(90,96,128,0.15)' : 'transparent', color: sel ? 'var(--text1)' : 'var(--text3)' }}>{mat.label} <span style={{ fontFamily: monoFont }}>${mat.cost}</span>/sqft</button>
                  })}
                </div>
              </div>
              {(specs.printWidth as number) > 0 && (specs.printHeight as number) > 0 && (
                <div style={{ ...gadgetOutputStyle, background: 'rgba(90,96,128,0.08)' }}>
                  <span style={{ color: 'var(--text2)' }}>Size: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{specs.printWidth as number}&quot;×{specs.printHeight as number}&quot;</span></span>
                  <span style={{ color: 'var(--text2)' }}>Qty: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{(specs.printQuantity as number) || 1}</span></span>
                  <span style={{ color: 'var(--text2)' }}>Sqft: <span style={{ fontFamily: monoFont, color: 'var(--text1)', fontWeight: 700 }}>{((specs.vinylArea as number) || 0).toFixed(1)}</span></span>
                  {!!specs.materialCost && <span style={{ color: 'var(--text2)', fontWeight: 700 }}>Material: <span style={{ fontFamily: monoFont }}>{fmtCurrency(specs.materialCost as number)}</span></span>}
                </div>
              )}
            </div>
          )}

          {/* ── Apparel Calculator ──────────────────────────────────────── */}
          {productLineType === 'apparel' && (
            <div style={gadgetStyle}>
              <div style={gadgetHeaderStyle}>
                <Package size={12} style={{ color: 'var(--cyan)' }} /> Apparel Calculator
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Garment Type</label>
                  <select value={(specs.apparelType as string) || ''} onChange={e => updateSpec('apparelType', e.target.value)} style={fieldSelectStyle} disabled={!canWrite}>
                    <option value="">Select Type</option>
                    {['T-Shirt', 'Long Sleeve', 'Hoodie', 'Polo', 'Hat', 'Jacket', 'Vest'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Print Method</label>
                  <select value={(specs.apparelMethod as string) || ''} onChange={e => updateSpec('apparelMethod', e.target.value)} style={fieldSelectStyle} disabled={!canWrite}>
                    <option value="">Select Method</option>
                    {['Screen Print', 'DTG', 'HTV', 'Embroidery', 'Sublimation'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Print Location</label>
                  <select value={(specs.apparelLocation as string) || ''} onChange={e => updateSpec('apparelLocation', e.target.value)} style={fieldSelectStyle} disabled={!canWrite}>
                    <option value="">Select Location</option>
                    {['Left Chest', 'Full Front', 'Full Back', 'Front+Back', 'Sleeve'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Total Units</label>
                  <input type="number" value={(specs.apparelTotal as number) || 0} readOnly style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12, background: 'var(--bg)', color: 'var(--text3)' }} />
                </div>
              </div>
              <div>
                <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Size Breakdown</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['S', 'M', 'L', 'XL', '2XL', '3XL'] as const).map(sz => {
                    const key = `apparel_${sz.toLowerCase()}` as keyof typeof specs
                    return (
                      <div key={sz} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 48 }}>
                        <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: headingFont, fontWeight: 700 }}>{sz}</span>
                        <input type="number" value={(specs[key] as number) || 0} onChange={e => {
                          const val = Number(e.target.value); updateSpec(key as string, val)
                          const total = ['s','m','l','xl','2xl','3xl'].reduce((sum, s) => { const k = `apparel_${s}` as keyof typeof specs; return sum + (s === sz.toLowerCase() ? val : ((specs[k] as number) || 0)) }, 0)
                          setTimeout(() => updateSpec('apparelTotal', total), 0)
                        }} style={{ ...fieldInputStyle, fontFamily: monoFont, fontSize: 12, textAlign: 'center' as const, width: 52 }} disabled={!canWrite} min={0} />
                      </div>
                    )
                  })}
                </div>
              </div>
              {((specs.apparelTotal as number) || 0) > 0 && (
                <div style={{ ...gadgetOutputStyle, background: 'rgba(34,211,238,0.06)' }}>
                  <span style={{ color: 'var(--text2)' }}>Units: <span style={{ fontFamily: monoFont, color: 'var(--cyan)', fontWeight: 700 }}>{specs.apparelTotal as number}</span></span>
                  {!!(specs.apparelType as string) && <span style={{ color: 'var(--text2)' }}>Type: <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{specs.apparelType as string}</span></span>}
                  {!!(specs.apparelMethod as string) && <span style={{ color: 'var(--text2)' }}>Method: <span style={{ color: 'var(--text1)', fontWeight: 700 }}>{specs.apparelMethod as string}</span></span>}
                </div>
              )}
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PRICING BREAKDOWN (Collapsible)                               */}
          {/* ═══════════════════════════════════════════════════════════════ */}
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
                  {/* Material type quick-select */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {([
                      { key: 'avery_mpi1105', name: 'Avery MPI 1105', cost: 2.10 },
                      { key: 'avery_mpi1005', name: 'Avery MPI 1005', cost: 1.85 },
                      { key: '3m_2080', name: '3M 2080 Series', cost: 2.50 },
                      { key: '3m_ij180', name: '3M IJ180', cost: 2.30 },
                      { key: 'avery_supreme', name: 'Avery Supreme', cost: 2.75 },
                      { key: 'arlon_slx', name: 'Arlon SLX', cost: 2.20 },
                      { key: 'hexis', name: 'Hexis Skintac', cost: 2.00 },
                    ]).map(mat => {
                      const selected = specs.vinylType === mat.name
                      return (
                        <button key={mat.key} onClick={() => {
                          if (!canWrite) return
                          updateSpec('vinylType', mat.name)
                          const sqft = (specs.vinylArea as number) || 0
                          if (sqft > 0) updateSpec('materialCost', Math.round(sqft * mat.cost * 100) / 100)
                        }} style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                          cursor: canWrite ? 'pointer' : 'default',
                          border: selected ? '2px solid var(--purple)' : '1px solid var(--border)',
                          background: selected ? 'rgba(139,92,246,0.08)' : 'transparent',
                          color: selected ? 'var(--purple)' : 'var(--text3)',
                        }}>
                          {mat.name} <span style={{ fontFamily: monoFont }}>${mat.cost}</span>/sqft
                        </button>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Material Cost</label>
                      <input type="number" value={specs.materialCost || ''} onChange={e => updateSpec('materialCost', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vinyl Type</label>
                      <input value={specs.vinylType || ''} onChange={e => updateSpec('vinylType', e.target.value)} onBlur={handleBlur} style={{ ...fieldInputStyle, fontSize: 12 }} disabled={!canWrite} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Vinyl Area (sqft)</label>
                      <input type="number" value={specs.vinylArea || ''} onChange={e => updateSpec('vinylArea', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} />
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
                      <input type="number" value={(specs.estimatedHours as number) || ''} onChange={e => updateSpec('estimatedHours', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.5} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Labor Rate ($/hr)</label>
                      <div style={{
                        ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
                        padding: '7px 10px', fontSize: 12, color: 'var(--text2)',
                        background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)',
                      }}>
                        ${LABOR_RATE}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Labor Cost</label>
                      <div style={{
                        ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' },
                        padding: '7px 10px', fontSize: 12, color: 'var(--amber)',
                        background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)',
                      }}>
                        {fmtCurrency(gpm.laborCost)}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Design Fee</label>
                      <input type="number" value={(specs.designFee as number) ?? DESIGN_FEE_DEFAULT} onChange={e => updateSpec('designFee', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                  </div>
                </div>

                {/* Machine Totals */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Settings size={11} style={{ color: 'var(--cyan)' }} /> Machine Totals
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Machine Cost</label>
                      <input type="number" value={specs.machineCost || ''} onChange={e => updateSpec('machineCost', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Complexity</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="range" min={1} max={5} step={1}
                          value={specs.complexity || 1}
                          onChange={e => updateSpec('complexity', Number(e.target.value))}
                          onBlur={handleBlur}
                          disabled={!canWrite}
                          style={{ flex: 1, height: 4, appearance: 'none', WebkitAppearance: 'none', borderRadius: 2, background: 'linear-gradient(to right, var(--green), var(--amber), var(--red))', cursor: canWrite ? 'pointer' : 'default' }}
                        />
                        <span style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 14, fontWeight: 800, color: (specs.complexity || 1) <= 2 ? 'var(--green)' : (specs.complexity || 1) <= 3 ? 'var(--amber)' : 'var(--red)', minWidth: 20, textAlign: 'center' as const }}>
                          {specs.complexity || 1}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Window Perf</label>
                      <button
                        onClick={() => { if (canWrite) updateSpec('windowPerf', !specs.windowPerf) }}
                        onBlur={handleBlur}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: 'transparent', border: 'none',
                          cursor: canWrite ? 'pointer' : 'default', padding: '4px 0',
                          color: specs.windowPerf ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                        }}
                      >
                        {specs.windowPerf ? <ToggleRight size={18} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={18} />}
                        {specs.windowPerf ? 'Yes' : 'No'}
                      </button>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Perf Area (sqft)</label>
                      <input type="number" value={specs.perfArea || ''} onChange={e => updateSpec('perfArea', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} />
                    </div>
                  </div>
                </div>

                {/* Price Totals */}
                <div>
                  <div style={{ ...fieldLabelStyle, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={11} style={{ color: 'var(--green)' }} /> Price Totals
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 8 }}>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Unit Price</label>
                      <div style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, padding: '7px 10px', fontSize: 12, color: 'var(--text1)', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {fmtCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Quantity</label>
                      <div style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, padding: '7px 10px', fontSize: 12, color: 'var(--text1)', background: 'var(--surface2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {item.quantity}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Discount</label>
                      <input type="number" value={item.unit_discount} onChange={e => updateField('unit_discount', Number(e.target.value))} onBlur={handleBlur} style={{ ...fieldInputStyle, ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, fontSize: 12 }} disabled={!canWrite} min={0} step={0.01} />
                    </div>
                    <div>
                      <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Line Total</label>
                      <div style={{ ...{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums' }, padding: '7px 10px', fontSize: 13, fontWeight: 700, color: 'var(--green)', background: 'rgba(34,192,122,0.06)', borderRadius: 6, border: '1px solid rgba(34,192,122,0.15)' }}>
                        {fmtCurrency(item.total_price)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ADDITIONAL INFO (Collapsible)                                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
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
                {/* Notes */}
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
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Design Details</label>
                    <textarea
                      value={specs.designDetails || ''}
                      onChange={e => updateSpec('designDetails', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Design instructions, colors, branding..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Production Details</label>
                    <textarea
                      value={specs.productionDetails || ''}
                      onChange={e => updateSpec('productionDetails', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Print specs, material handling notes..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label style={{ ...fieldLabelStyle, fontSize: 9 }}>Install Details</label>
                    <textarea
                      value={specs.installDetails || ''}
                      onChange={e => updateSpec('installDetails', e.target.value)}
                      onBlur={handleBlur}
                      style={{ ...fieldInputStyle, resize: 'vertical', minHeight: 60, fontSize: 12 }}
                      disabled={!canWrite}
                      placeholder="Install instructions, special considerations..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Generate Mockup button ─────────────────────────────────── */}
          {isVehicleProduct && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button
                onClick={() => updateSpec('_mockupOpen', true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: 8, padding: '7px 14px', color: 'var(--purple)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Paintbrush size={12} /> Generate Mockup
              </button>
            </div>
          )}
          <MockupCreator
            isOpen={!!(specs._mockupOpen)}
            onClose={() => updateSpec('_mockupOpen', false)}
            lineItemId={item.id}
            specs={specs}
            updateSpec={updateSpec}
            vehicleInfo={vehicleDesc || item.name}
          />

          {/* ── Save This Line Item ────────────────────────────────────── */}
          {canWrite && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => { handleBlur(); setIsCardExpanded(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--green)', border: 'none',
                  borderRadius: 10, padding: '10px 28px', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: headingFont, letterSpacing: '0.04em',
                  textTransform: 'uppercase' as const,
                  boxShadow: '0 2px 12px rgba(34,192,122,0.3)',
                }}
              >
                <Save size={14} />
                Save This Line Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── showToast helper for sub-components (uses window event) ────────────────
// We use a simple approach: sub-components that need toast will call
// a module-level function that dispatches a custom event caught by the parent.
// However for simplicity here, we pass it inline where needed.

function showToast(msg: string) {
  // Fallback for sub-components - in production this would be a context
  console.log('[toast]', msg)
}

// ─── GPM Stat ───────────────────────────────────────────────────────────────

function GPMStat({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div>
      <span style={{
        fontSize: 10, fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        fontFamily: headingFont, display: 'block',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: monoFont, fontVariantNumeric: 'tabular-nums',
        fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, color,
        marginTop: 2, display: 'block',
      }}>
        {value}
      </span>
    </div>
  )
}
