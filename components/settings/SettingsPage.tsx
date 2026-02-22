'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Settings, Calculator, Shield, Database, ToggleLeft, ToggleRight,
  Car, Truck, Bus, Ship, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, Trash2, Download, ChevronRight, Info, Percent,
  Clock, Layers, Zap, BookOpen, Scale, Users, Award, Target,
  Ruler, FileText, Activity, BarChart3, PiggyBank, Building2,
  Wrench, Gauge, Lock
} from 'lucide-react'
import { PermissionsMatrix } from '@/components/settings/PermissionsMatrix'
import PinGate from '@/components/settings/PinGate'
import VisibilitySettings from '@/components/settings/VisibilitySettings'

interface SettingsPageProps {
  profile: Profile
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fM2 = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
const v = (val: any, def = 0) => parseFloat(val) || def

// Vehicle defaults
const VEHICLE_DEFAULTS = [
  { key: 'smallCar', name: 'Small Car', defaultPay: 500, defaultHrs: 14 },
  { key: 'medCar', name: 'Med Car', defaultPay: 550, defaultHrs: 16 },
  { key: 'fullCar', name: 'Full Car', defaultPay: 600, defaultHrs: 17 },
  { key: 'smTruck', name: 'Sm Truck', defaultPay: 525, defaultHrs: 15 },
  { key: 'medTruck', name: 'Med Truck', defaultPay: 565, defaultHrs: 16 },
  { key: 'fullTruck', name: 'Full Truck', defaultPay: 600, defaultHrs: 17 },
  { key: 'medVan', name: 'Med Van', defaultPay: 525, defaultHrs: 15 },
  { key: 'largeVan', name: 'Large Van', defaultPay: 600, defaultHrs: 17 },
  { key: 'xlVan', name: 'XL Van', defaultPay: 625, defaultHrs: 18 },
]

// PPF defaults
const PPF_DEFAULTS = [
  { key: 'standardFront', name: 'Standard Front', defaultSale: 1200, defaultPay: 144, defaultMat: 380, defaultHrs: 5 },
  { key: 'fullFront', name: 'Full Front Package', defaultSale: 1850, defaultPay: 220, defaultMat: 580, defaultHrs: 7 },
  { key: 'trackPack', name: 'Track Pack', defaultSale: 2800, defaultPay: 336, defaultMat: 900, defaultHrs: 10 },
  { key: 'fullBody', name: 'Full Body PPF', defaultSale: 5500, defaultPay: 660, defaultMat: 1800, defaultHrs: 20 },
  { key: 'hoodOnly', name: 'Hood Only', defaultSale: 650, defaultPay: 78, defaultMat: 200, defaultHrs: 3 },
  { key: 'rockerPanels', name: 'Rocker Panels', defaultSale: 550, defaultPay: 66, defaultMat: 150, defaultHrs: 2.5 },
  { key: 'headlights', name: 'Headlights', defaultSale: 350, defaultPay: 42, defaultMat: 80, defaultHrs: 1.5 },
  { key: 'doorCupGuards', name: 'Door Cup Guards', defaultSale: 150, defaultPay: 18, defaultMat: 40, defaultHrs: 0.5 },
]

const OVERHEAD_ROWS = [
  { key: 'rent', label: 'Rent / Lease' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'equipment', label: 'Equipment / Loan Payments' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'salesBase', label: 'Guaranteed Sales Pay' },
  { key: 'prodPay', label: 'Guaranteed Production Pay' },
  { key: 'software', label: 'Software / Subscriptions' },
  { key: 'marketing', label: 'Marketing / Lead Generation' },
  { key: 'vehicleFuel', label: 'Vehicle / Fuel / Misc' },
  { key: 'otherFixed', label: 'Other Fixed Costs' },
]

// Simulation data
const SIM_JOBS = [
  { company: 'Metro Plumbing', vehicle: 'Med Van', price: 4200, type: 'inbound', status: 'active' },
  { company: 'Summit Electric', vehicle: 'Full Truck', price: 5100, type: 'outbound', status: 'active' },
  { company: 'Coastal HVAC', vehicle: 'Large Van', price: 4800, type: 'inbound', status: 'active' },
  { company: 'Peak Roofing', vehicle: 'XL Van', price: 5500, type: 'outbound', status: 'active' },
  { company: 'Atlas Landscaping', vehicle: 'Med Truck', price: 3900, type: 'inbound', status: 'active' },
  { company: 'RedLine Auto', vehicle: 'Full Car', price: 3600, type: 'presold', status: 'active' },
  { company: 'Blue Ocean Cafe', vehicle: 'Small Car', price: 2800, type: 'inbound', status: 'active' },
  { company: 'Iron Forge Gym', vehicle: 'Med Van', price: 4100, type: 'outbound', status: 'active' },
  { company: 'Valley Solar', vehicle: 'Full Truck', price: 5300, type: 'inbound', status: 'active' },
  { company: 'Crown Dental', vehicle: 'Med Car', price: 3200, type: 'inbound', status: 'active' },
  { company: 'Swift Courier', vehicle: 'Large Van', price: 4600, type: 'outbound', status: 'active' },
  { company: 'Pine Tree Homes', vehicle: 'Sm Truck', price: 3500, type: 'inbound', status: 'active' },
  { company: 'Neon Signs Co', vehicle: 'Full Car', price: 3800, type: 'presold', status: 'active' },
  { company: 'Golden Gate Pest', vehicle: 'Med Van', price: 4300, type: 'inbound', status: 'active' },
  { company: 'Arctic Air HVAC', vehicle: 'XL Van', price: 5700, type: 'outbound', status: 'active' },
  { company: 'Brightside Cleaning', vehicle: 'Small Car', price: 2600, type: 'inbound', status: 'active' },
  { company: 'Harbor Marine', vehicle: 'Med Truck', price: 4000, type: 'inbound', status: 'active' },
  { company: 'Apex Construction', vehicle: 'Full Truck', price: 5200, type: 'outbound', status: 'active' },
  { company: 'Zen Wellness', vehicle: 'Med Car', price: 3100, type: 'presold', status: 'active' },
  { company: 'Thunder Electric', vehicle: 'Large Van', price: 4900, type: 'inbound', status: 'active' },
  { company: 'SilverLine Limo', vehicle: 'Full Car', price: 3700, type: 'inbound', status: 'active' },
  { company: 'Maple Leaf Garden', vehicle: 'Sm Truck', price: 3400, type: 'outbound', status: 'active' },
  { company: 'Digital Print Shop', vehicle: 'Med Van', price: 4400, type: 'inbound', status: 'active' },
  { company: 'Cascade Plumbing', vehicle: 'Med Truck', price: 4100, type: 'inbound', status: 'active' },
  { company: 'Phoenix Auto Body', vehicle: 'XL Van', price: 5800, type: 'outbound', status: 'active' },
]

export function SettingsPage({ profile }: SettingsPageProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'defaults' | 'commission' | 'simulation' | 'permissions' | 'visibility' | 'templates'>('defaults')
  const [templates, setTemplates] = useState<any[]>([])
  const [tplLoading, setTplLoading] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplCategory, setTplCategory] = useState('custom')
  const [tplContent, setTplContent] = useState('')
  const [tplSaving, setTplSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingSim, setLoadingSim] = useState(false)

  // ===== Defaults & Equations state =====
  const [bonusPoolEnabled, setBonusPoolEnabled] = useState(true)

  // Vehicle pay defaults
  const [vehicleDefaults, setVehicleDefaults] = useState<Record<string, { pay: number; hrs: number }>>({})

  // Trailer & Box Truck defaults
  const [trailerWidth, setTrailerWidth] = useState('8.5')
  const [trailerHeight, setTrailerHeight] = useState('7')
  const [trailerLaborPct, setTrailerLaborPct] = useState('10')
  const [boxTruckWidth, setBoxTruckWidth] = useState('8')
  const [boxTruckHeight, setBoxTruckHeight] = useState('84')
  const [boxTruckLaborPct, setBoxTruckLaborPct] = useState('10')

  // PPF defaults
  const [ppfDefaults, setPpfDefaults] = useState<Record<string, { sale: number; pay: number; mat: number; hrs: number }>>({})
  const [ppfLaborPct, setPpfLaborPct] = useState('12')

  // What-If calculator
  const [wiSalePrice, setWiSalePrice] = useState('')
  const [wiMaterialCost, setWiMaterialCost] = useState('')
  const [wiInstallerPay, setWiInstallerPay] = useState('')
  const [wiDesignFee, setWiDesignFee] = useState('')
  const [wiLeadType, setWiLeadType] = useState('inbound')
  const [wiMiscCosts, setWiMiscCosts] = useState('')

  // Shop Fixed Costs
  const [overheadCosts, setOverheadCosts] = useState<Record<string, number>>({})
  const [targetGPM, setTargetGPM] = useState('75')
  const [avgJobRevenue, setAvgJobRevenue] = useState('4500')

  // Conversion Rate
  const [minConversionRate, setMinConversionRate] = useState('20')
  const [conversionTrackingEnabled, setConversionTrackingEnabled] = useState(true)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('org_id', profile.org_id)
      .single()

    if (data?.settings) {
      const s = data.settings as any
      if (s.bonusPoolEnabled !== undefined) setBonusPoolEnabled(s.bonusPoolEnabled)
      if (s.vehicleDefaults) setVehicleDefaults(s.vehicleDefaults)
      if (s.trailerWidth) setTrailerWidth(s.trailerWidth)
      if (s.trailerHeight) setTrailerHeight(s.trailerHeight)
      if (s.trailerLaborPct) setTrailerLaborPct(s.trailerLaborPct)
      if (s.boxTruckWidth) setBoxTruckWidth(s.boxTruckWidth)
      if (s.boxTruckHeight) setBoxTruckHeight(s.boxTruckHeight)
      if (s.boxTruckLaborPct) setBoxTruckLaborPct(s.boxTruckLaborPct)
      if (s.ppfDefaults) setPpfDefaults(s.ppfDefaults)
      if (s.ppfLaborPct) setPpfLaborPct(s.ppfLaborPct)
      if (s.overheadCosts) setOverheadCosts(s.overheadCosts)
      if (s.targetGPM) setTargetGPM(s.targetGPM)
      if (s.avgJobRevenue) setAvgJobRevenue(s.avgJobRevenue)
      if (s.minConversionRate) setMinConversionRate(s.minConversionRate)
      if (s.conversionTrackingEnabled !== undefined) setConversionTrackingEnabled(s.conversionTrackingEnabled)
    }
  }

  async function saveSettings() {
    setSaving(true)
    const settings = {
      bonusPoolEnabled,
      vehicleDefaults,
      trailerWidth, trailerHeight, trailerLaborPct,
      boxTruckWidth, boxTruckHeight, boxTruckLaborPct,
      ppfDefaults, ppfLaborPct,
      overheadCosts, targetGPM, avgJobRevenue,
      minConversionRate, conversionTrackingEnabled,
      updatedAt: new Date().toISOString(),
      updatedBy: profile.id,
    }

    await supabase.from('shop_settings').upsert({
      org_id: profile.org_id,
      settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'org_id' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function getVehicleDefault(key: string, field: 'pay' | 'hrs') {
    const vd = VEHICLE_DEFAULTS.find(v => v.key === key)
    if (vehicleDefaults[key]) return vehicleDefaults[key][field]
    return field === 'pay' ? vd?.defaultPay || 0 : vd?.defaultHrs || 0
  }

  function setVehicleDefault(key: string, field: 'pay' | 'hrs', val: number) {
    const vd = VEHICLE_DEFAULTS.find(v => v.key === key)
    setVehicleDefaults(prev => ({
      ...prev,
      [key]: {
        pay: field === 'pay' ? val : (prev[key]?.pay ?? vd?.defaultPay ?? 0),
        hrs: field === 'hrs' ? val : (prev[key]?.hrs ?? vd?.defaultHrs ?? 0),
      }
    }))
  }

  function getPpfDefault(key: string, field: 'sale' | 'pay' | 'mat' | 'hrs') {
    const pd = PPF_DEFAULTS.find(p => p.key === key)
    if (ppfDefaults[key]) return ppfDefaults[key][field]
    if (field === 'sale') return pd?.defaultSale || 0
    if (field === 'pay') return pd?.defaultPay || 0
    if (field === 'mat') return pd?.defaultMat || 0
    return pd?.defaultHrs || 0
  }

  function setPpfDefault(key: string, field: 'sale' | 'pay' | 'mat' | 'hrs', val: number) {
    const pd = PPF_DEFAULTS.find(p => p.key === key)
    setPpfDefaults(prev => ({
      ...prev,
      [key]: {
        sale: field === 'sale' ? val : (prev[key]?.sale ?? pd?.defaultSale ?? 0),
        pay: field === 'pay' ? val : (prev[key]?.pay ?? pd?.defaultPay ?? 0),
        mat: field === 'mat' ? val : (prev[key]?.mat ?? pd?.defaultMat ?? 0),
        hrs: field === 'hrs' ? val : (prev[key]?.hrs ?? pd?.defaultHrs ?? 0),
      }
    }))
  }

  // What-If calculator
  const wiCalc = useCallback(() => {
    const sale = v(wiSalePrice)
    const mat = v(wiMaterialCost)
    const instPay = v(wiInstallerPay)
    const design = v(wiDesignFee)
    const misc = v(wiMiscCosts)
    const cogs = mat + instPay + design + misc
    const gp = sale - cogs
    const gpm = sale > 0 ? (gp / sale) * 100 : 0

    // Commission calc
    let commRate = 0
    let commTier = ''
    if (wiLeadType === 'inbound') {
      commRate = 0.045
      commTier = 'Base 4.5%'
      if (gpm > 73) { commRate += 0.02; commTier += ' + 2% GPM bonus' }
      commRate = Math.min(commRate + 0.01, 0.075) // +1% torq cap
      commTier += ' (+1% Torq cap 7.5%)'
    } else if (wiLeadType === 'outbound') {
      commRate = 0.07
      commTier = 'Base 7%'
      if (gpm > 73) { commRate += 0.02; commTier += ' + 2% GPM bonus' }
      commRate = Math.min(commRate + 0.01, 0.10)
      commTier += ' (+1% Torq cap 10%)'
    } else {
      commRate = 0.05
      commTier = 'Flat 5% (Pre-sold)'
    }

    const commission = gp * commRate
    const prodBonus = Math.max(0, (gp * 0.05) - design)
    const netToShop = gp - commission - prodBonus

    return { sale, cogs, gp, gpm, commission, commRate, commTier, prodBonus, netToShop, mat, instPay, design, misc }
  }, [wiSalePrice, wiMaterialCost, wiInstallerPay, wiDesignFee, wiLeadType, wiMiscCosts])

  const wi = wiCalc()

  // Overhead calc
  const overheadTotal = OVERHEAD_ROWS.reduce((sum, row) => sum + (overheadCosts[row.key] || 0), 0)
  const breakEvenRevenue = overheadTotal > 0 ? overheadTotal / (v(targetGPM, 75) / 100) : 0
  const breakEvenJobs = v(avgJobRevenue) > 0 ? Math.ceil(breakEvenRevenue / v(avgJobRevenue)) : 0

  // Simulation
  async function loadSimJobs() {
    setLoadingSim(true)
    const jobs = SIM_JOBS.map((job, i) => ({
      org_id: profile.org_id,
      title: `[SIM] ${job.company}`,
      type: 'wrap',
      status: 'active',
      pipe_stage: ['sales_in', 'production', 'install', 'prod_review', 'sales_close'][i % 5],
      vehicle_desc: job.vehicle,
      revenue: job.price,
      division: 'wraps',
      form_data: {
        client: `[SIM] ${job.company}`,
        vehicle: job.vehicle,
        leadType: job.type,
        salesPrice: job.price.toString(),
        isSimulation: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    for (const job of jobs) {
      await supabase.from('projects').insert(job)
    }
    setLoadingSim(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function clearSimJobs() {
    setLoadingSim(true)
    await supabase
      .from('projects')
      .delete()
      .eq('org_id', profile.org_id)
      .like('title', '[SIM]%')
    setLoadingSim(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // Styles
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1a1d27',
    border: '1px solid rgba(90,96,128,.3)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    color: '#e8eaed',
    outline: 'none',
    fontFamily: 'JetBrains Mono, monospace',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 800,
    color: '#9299b5',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    marginBottom: 6,
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    paddingBottom: 8,
    marginBottom: 14,
    borderBottom: '1px solid rgba(90,96,128,.2)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  const cardStyle: React.CSSProperties = {
    background: '#13151c',
    border: '1px solid rgba(90,96,128,.2)',
    borderRadius: 12,
    padding: 20,
  }

  // Load templates when tab opens
  useEffect(() => {
    if (activeTab !== 'templates') return
    setTplLoading(true)
    fetch('/api/templates').then(r => r.json()).then(d => {
      setTemplates(d.templates || [])
      setTplLoading(false)
    }).catch(() => setTplLoading(false))
  }, [activeTab])

  async function createTemplate() {
    if (!tplName.trim() || !tplContent.trim()) return
    setTplSaving(true)
    const r = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tplName, category: tplCategory, content: tplContent }),
    })
    const d = await r.json()
    if (d.template) setTemplates(prev => [d.template, ...prev])
    setTplName(''); setTplContent(''); setTplCategory('custom')
    setTplSaving(false)
  }

  async function deleteTemplate(id: string) {
    await fetch('/api/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const tabs = [
    { key: 'defaults'    as const, label: 'Defaults & Equations', icon: <Settings size={14} /> },
    { key: 'commission'  as const, label: 'Commission Rules',     icon: <Shield size={14} /> },
    { key: 'simulation'  as const, label: 'Simulation Data',      icon: <Database size={14} /> },
    { key: 'permissions' as const, label: 'Role Permissions',     icon: <Lock size={14} /> },
    { key: 'visibility'  as const, label: 'Visibility',           icon: <Activity size={14} /> },
    { key: 'templates'   as const, label: 'Message Templates',    icon: <FileText size={14} /> },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28,
            fontWeight: 900,
            color: '#e8eaed',
            margin: 0,
          }}>
            Shop Settings
          </h1>
          <p style={{ fontSize: 12, color: '#5a6080', margin: '4px 0 0' }}>
            Configure defaults, equations, commission rules, and simulation data
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#22c07a' }}>Saved</span>
          )}
          {activeTab === 'defaults' && (
            <button
              onClick={saveSettings}
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                background: '#4f7fff',
                border: 'none',
                color: '#fff',
                opacity: saving ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Settings size={14} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(90,96,128,.2)', marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #4f7fff' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? '#4f7fff' : '#5a6080',
              marginBottom: -1,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB 1: Defaults & Equations ===== */}
      {activeTab === 'defaults' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* BONUS POOL SETTINGS */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#22c07a' }}>
              <PiggyBank size={14} />
              Bonus Pool Settings
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', marginBottom: 4 }}>
                  Production Bonus Pool
                </div>
                <div style={{ fontSize: 11, color: '#5a6080' }}>
                  Pool accumulates when jobs exceed the GPM threshold. Distributed quarterly.
                </div>
              </div>
              <button
                onClick={() => setBonusPoolEnabled(!bonusPoolEnabled)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: bonusPoolEnabled ? '#22c07a' : '#5a6080',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {bonusPoolEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                {bonusPoolEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* VEHICLE PAY DEFAULTS */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#4f7fff' }}>
              <Car size={14} />
              Vehicle Pay Defaults
            </div>
            <div style={{ fontSize: 11, color: '#5a6080', marginBottom: 16 }}>
              Edit default installer pay & hours for each commercial vehicle size.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {VEHICLE_DEFAULTS.map(veh => {
                const pay = getVehicleDefault(veh.key, 'pay')
                const hrs = getVehicleDefault(veh.key, 'hrs')
                const perHr = hrs > 0 ? pay / hrs : 0
                return (
                  <div key={veh.key} style={{
                    background: '#0d0f14',
                    border: '1px solid rgba(90,96,128,.2)',
                    borderRadius: 10,
                    padding: 14,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed', marginBottom: 10 }}>
                      {veh.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 9 }}>PAY ($)</label>
                        <input
                          style={{ ...inputStyle, fontSize: 12, padding: '7px 10px' }}
                          type="number"
                          value={pay || ''}
                          onChange={e => setVehicleDefault(veh.key, 'pay', v(e.target.value))}
                          placeholder={veh.defaultPay.toString()}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 9 }}>HRS</label>
                        <input
                          style={{ ...inputStyle, fontSize: 12, padding: '7px 10px' }}
                          type="number"
                          value={hrs || ''}
                          onChange={e => setVehicleDefault(veh.key, 'hrs', v(e.target.value))}
                          placeholder={veh.defaultHrs.toString()}
                        />
                      </div>
                    </div>
                    <div style={{
                      marginTop: 8,
                      textAlign: 'center',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#22d3ee',
                    }}>
                      {fM2(perHr)}/hr
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* TRAILER & BOX TRUCK DEFAULTS */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#f59e0b' }}>
              <Truck size={14} />
              Trailer & Box Truck Defaults
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Trailer */}
              <div style={{
                background: '#0d0f14',
                border: '1px solid rgba(90,96,128,.2)',
                borderRadius: 10,
                padding: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed', marginBottom: 12 }}>Trailer</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Default Width (FT)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={trailerWidth}
                      onChange={e => setTrailerWidth(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Height (FT)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={trailerHeight}
                      onChange={e => setTrailerHeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Labor %</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={trailerLaborPct}
                      onChange={e => setTrailerLaborPct(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {/* Box Truck */}
              <div style={{
                background: '#0d0f14',
                border: '1px solid rgba(90,96,128,.2)',
                borderRadius: 10,
                padding: 16,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed', marginBottom: 12 }}>Box Truck</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Default Width (FT)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={boxTruckWidth}
                      onChange={e => setBoxTruckWidth(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Height (IN)</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={boxTruckHeight}
                      onChange={e => setBoxTruckHeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Labor %</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={boxTruckLaborPct}
                      onChange={e => setBoxTruckLaborPct(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PPF PACKAGE DEFAULTS */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#8b5cf6' }}>
              <Shield size={14} />
              PPF Package Defaults
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {PPF_DEFAULTS.map(pkg => (
                <div key={pkg.key} style={{
                  background: '#0d0f14',
                  border: '1px solid rgba(90,96,128,.2)',
                  borderRadius: 10,
                  padding: 14,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#e8eaed', marginBottom: 10 }}>
                    {pkg.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>SALE ($)</label>
                      <input
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }}
                        type="number"
                        value={getPpfDefault(pkg.key, 'sale') || ''}
                        onChange={e => setPpfDefault(pkg.key, 'sale', v(e.target.value))}
                        placeholder={pkg.defaultSale.toString()}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>INST PAY ($)</label>
                      <input
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }}
                        type="number"
                        value={getPpfDefault(pkg.key, 'pay') || ''}
                        onChange={e => setPpfDefault(pkg.key, 'pay', v(e.target.value))}
                        placeholder={pkg.defaultPay.toString()}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>MAT COST ($)</label>
                      <input
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }}
                        type="number"
                        value={getPpfDefault(pkg.key, 'mat') || ''}
                        onChange={e => setPpfDefault(pkg.key, 'mat', v(e.target.value))}
                        placeholder={pkg.defaultMat.toString()}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9 }}>HRS</label>
                      <input
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }}
                        type="number"
                        step="0.5"
                        value={getPpfDefault(pkg.key, 'hrs') || ''}
                        onChange={e => setPpfDefault(pkg.key, 'hrs', v(e.target.value))}
                        placeholder={pkg.defaultHrs.toString()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Default PPF Labor %</label>
              <input
                style={{ ...inputStyle, maxWidth: 200 }}
                type="number"
                value={ppfLaborPct}
                onChange={e => setPpfLaborPct(e.target.value)}
                placeholder="12"
              />
            </div>
          </div>

          {/* WHAT-IF PROFITABILITY CALCULATOR */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#22d3ee' }}>
              <Calculator size={14} />
              What-If Profitability Calculator
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Input side */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Total Sale Price</label>
                    <input style={inputStyle} type="number" value={wiSalePrice} onChange={e => setWiSalePrice(e.target.value)} placeholder="5000" />
                  </div>
                  <div>
                    <label style={labelStyle}>Material Cost</label>
                    <input style={inputStyle} type="number" value={wiMaterialCost} onChange={e => setWiMaterialCost(e.target.value)} placeholder="450" />
                  </div>
                  <div>
                    <label style={labelStyle}>Installer Pay</label>
                    <input style={inputStyle} type="number" value={wiInstallerPay} onChange={e => setWiInstallerPay(e.target.value)} placeholder="550" />
                  </div>
                  <div>
                    <label style={labelStyle}>Design Fee</label>
                    <input style={inputStyle} type="number" value={wiDesignFee} onChange={e => setWiDesignFee(e.target.value)} placeholder="150" />
                  </div>
                  <div>
                    <label style={labelStyle}>Lead Type</label>
                    <select
                      style={inputStyle}
                      value={wiLeadType}
                      onChange={e => setWiLeadType(e.target.value)}
                    >
                      <option value="inbound">Inbound</option>
                      <option value="outbound">Outbound</option>
                      <option value="presold">Pre-sold</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Misc Costs</label>
                    <input style={inputStyle} type="number" value={wiMiscCosts} onChange={e => setWiMiscCosts(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Output side */}
              <div style={{
                background: '#0d0f14',
                border: '1px solid rgba(90,96,128,.2)',
                borderRadius: 10,
                padding: 16,
              }}>
                {v(wiSalePrice) === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5a6080', fontSize: 12, fontStyle: 'italic' }}>
                    Enter a sale price to see breakdown
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(90,96,128,.1)' }}>
                      <span style={{ fontSize: 11, color: '#9299b5' }}>Revenue</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>{fM(wi.sale)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(90,96,128,.1)' }}>
                      <span style={{ fontSize: 11, color: '#9299b5' }}>COGS</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#f25a5a' }}>-{fM(wi.cogs)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(90,96,128,.1)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed' }}>Gross Profit</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 800, color: '#22c07a' }}>{fM(wi.gp)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(90,96,128,.1)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed' }}>GPM %</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 800, color: wi.gpm >= 70 ? '#22c07a' : '#f25a5a' }}>{Math.round(wi.gpm)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(90,96,128,.1)' }}>
                      <div>
                        <span style={{ fontSize: 11, color: '#9299b5' }}>Commission</span>
                        <div style={{ fontSize: 9, color: '#5a6080' }}>{wi.commTier}</div>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>-{fM(wi.commission)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(90,96,128,.1)' }}>
                      <span style={{ fontSize: 11, color: '#9299b5' }}>Production Bonus</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>-{fM(wi.prodBonus)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4, borderTop: '2px solid rgba(90,96,128,.2)' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#e8eaed' }}>Net to Shop</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 900, color: '#22d3ee' }}>{fM(wi.netToShop)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SHOP FIXED COSTS & BREAK-EVEN */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#f25a5a' }}>
              <Building2 size={14} />
              Shop Fixed Costs & Break-Even
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Cost inputs */}
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {OVERHEAD_ROWS.map(row => (
                    <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#9299b5' }}>{row.label}</div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#5a6080' }}>$</span>
                        <input
                          type="number"
                          value={overheadCosts[row.key] || ''}
                          onChange={e => setOverheadCosts(prev => ({ ...prev, [row.key]: v(e.target.value) }))}
                          placeholder="0"
                          style={{
                            width: 120,
                            background: '#1a1d27',
                            border: '1px solid rgba(90,96,128,.3)',
                            borderRadius: 7,
                            padding: '7px 10px 7px 22px',
                            fontSize: 13,
                            color: '#e8eaed',
                            outline: 'none',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '2px solid rgba(90,96,128,.2)', marginTop: 6 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, color: '#e8eaed' }}>MONTHLY TOTAL</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 800, color: '#f25a5a' }}>{fM(overheadTotal)}</div>
                  </div>
                </div>
              </div>

              {/* Output */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  background: '#0d0f14',
                  border: '1px solid rgba(79,127,255,.2)',
                  borderRadius: 10,
                  padding: 16,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', marginBottom: 6 }}>Break-Even Revenue (at target GPM)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>Target GPM %</label>
                      <input
                        style={{ ...inputStyle, width: 80, textAlign: 'center', fontSize: 12, padding: '6px 8px' }}
                        type="number"
                        value={targetGPM}
                        onChange={e => setTargetGPM(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900, color: '#4f7fff' }}>
                    {fM(breakEvenRevenue)}/mo
                  </div>
                </div>

                <div style={{
                  background: '#0d0f14',
                  border: '1px solid rgba(90,96,128,.2)',
                  borderRadius: 10,
                  padding: 16,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', marginBottom: 6 }}>Break-Even Jobs / Month</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 9, marginBottom: 4 }}>Avg Job Revenue</label>
                      <input
                        style={{ ...inputStyle, width: 100, textAlign: 'center', fontSize: 12, padding: '6px 8px' }}
                        type="number"
                        value={avgJobRevenue}
                        onChange={e => setAvgJobRevenue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>
                    {breakEvenJobs} jobs
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CONVERSION RATE SETTINGS */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#22c07a' }}>
              <Target size={14} />
              Conversion Rate Settings
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div>
                <label style={labelStyle}>Min Required Rate (%)</label>
                <input
                  style={{ ...inputStyle, width: 120 }}
                  type="number"
                  value={minConversionRate}
                  onChange={e => setMinConversionRate(e.target.value)}
                  placeholder="20"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9299b5' }}>Conversion Tracking</span>
                <button
                  onClick={() => setConversionTrackingEnabled(!conversionTrackingEnabled)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: conversionTrackingEnabled ? '#22c07a' : '#5a6080',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {conversionTrackingEnabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  {conversionTrackingEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* CALCULATION EQUATIONS REFERENCE */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#9299b5' }}>
              <BookOpen size={14} />
              Calculation Equations Reference
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{
                background: 'rgba(79,127,255,.04)',
                border: '1px solid rgba(79,127,255,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#4f7fff', textTransform: 'uppercase', marginBottom: 8 }}>Gross Profit</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  GP = Sale Price - COGS<br />
                  COGS = Material + Installer Pay + Design Fee + Misc
                </div>
              </div>
              <div style={{
                background: 'rgba(34,192,122,.04)',
                border: '1px solid rgba(34,192,122,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#22c07a', textTransform: 'uppercase', marginBottom: 8 }}>Gross Profit Margin</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  GPM = (GP / Sale Price) * 100<br />
                  Target: 70%+ (non-PPF)
                </div>
              </div>
              <div style={{
                background: 'rgba(139,92,246,.04)',
                border: '1px solid rgba(139,92,246,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', marginBottom: 8 }}>Commission</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  Commission = GP * Commission Rate<br />
                  Rate varies by lead type & GPM tier
                </div>
              </div>
              <div style={{
                background: 'rgba(245,158,11,.04)',
                border: '1px solid rgba(245,158,11,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 8 }}>Production Bonus</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  Prod Bonus = (Job Profit * 5%) - Design Fees<br />
                  Min: $0 (never negative)
                </div>
              </div>
              <div style={{
                background: 'rgba(34,211,238,.04)',
                border: '1px solid rgba(34,211,238,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#22d3ee', textTransform: 'uppercase', marginBottom: 8 }}>Material Cost</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  Material = Net SQFT * Rate/SQFT<br />
                  SQFT = Linear Ft * (Width / 12)<br />
                  10% buffer standard
                </div>
              </div>
              <div style={{
                background: 'rgba(242,90,90,.04)',
                border: '1px solid rgba(242,90,90,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#f25a5a', textTransform: 'uppercase', marginBottom: 8 }}>Break-Even</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  Break-Even Rev = Overhead / GPM%<br />
                  Break-Even Jobs = Rev / Avg Job Rev
                </div>
              </div>
              <div style={{
                background: 'rgba(90,96,128,.06)',
                border: '1px solid rgba(90,96,128,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#9299b5', textTransform: 'uppercase', marginBottom: 8 }}>Auto Sale Price (Vehicle)</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  Sale = COGS / (1 - Target GPM%)<br />
                  Override with manual sale price
                </div>
              </div>
              <div style={{
                background: 'rgba(90,96,128,.06)',
                border: '1px solid rgba(90,96,128,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#9299b5', textTransform: 'uppercase', marginBottom: 8 }}>Install $/Hr</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
                  $/Hr = Installer Pay / Actual Hours<br />
                  Track quoted vs actual variance
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ===== TAB 2: Commission Rules ===== */}
      {activeTab === 'commission' && (
        <PinGate orgId={profile.org_id || 'default'} sectionKey="commission" sectionLabel="Commission Rules">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* COMMISSION STRUCTURE */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#8b5cf6' }}>
              <Award size={14} />
              Commission Structure &mdash; GP-Based
            </div>
            <div style={{ fontSize: 12, color: '#9299b5', marginBottom: 16, lineHeight: 1.6 }}>
              All commissions are calculated as a percentage of Gross Profit (GP), not revenue. Commission rates vary based on lead source, GPM performance, and monthly GP tier.
            </div>

            {/* Inbound */}
            <div style={{
              background: 'rgba(79,127,255,.04)',
              border: '1px solid rgba(79,127,255,.15)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#4f7fff', textTransform: 'uppercase', marginBottom: 10 }}>
                Inbound Leads
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#4f7fff" />
                  <span style={{ fontSize: 12, color: '#e8eaed' }}>Base Rate: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#4f7fff' }}>4.5%</span> of GP</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#4f7fff" />
                  <span style={{ fontSize: 12, color: '#e8eaed' }}>+1% Torq Bonus (activity/hustle metric)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#4f7fff" />
                  <span style={{ fontSize: 12, color: '#e8eaed' }}>+2% GPM Bonus when job GPM exceeds 73%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#f59e0b" />
                  <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>Max: 7.5% of GP</span>
                </div>
              </div>
            </div>

            {/* Outbound */}
            <div style={{
              background: 'rgba(34,192,122,.04)',
              border: '1px solid rgba(34,192,122,.15)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#22c07a', textTransform: 'uppercase', marginBottom: 10 }}>
                Outbound Leads
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#22c07a" />
                  <span style={{ fontSize: 12, color: '#e8eaed' }}>Base Rate: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#22c07a' }}>7%</span> of GP</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#22c07a" />
                  <span style={{ fontSize: 12, color: '#e8eaed' }}>+1% Torq Bonus</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#22c07a" />
                  <span style={{ fontSize: 12, color: '#e8eaed' }}>+2% GPM Bonus when job GPM exceeds 73%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#f59e0b" />
                  <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>Max: 10% of GP</span>
                </div>
              </div>
            </div>

            {/* Pre-sold */}
            <div style={{
              background: 'rgba(245,158,11,.04)',
              border: '1px solid rgba(245,158,11,.15)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 10 }}>
                Pre-Sold / Referral Leads
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ChevronRight size={12} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#e8eaed' }}>Flat Rate: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#f59e0b' }}>5%</span> of GP (no bonuses apply)</span>
              </div>
            </div>
          </div>

          {/* MONTHLY GP TIER TABLE */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#22d3ee' }}>
              <BarChart3 size={14} />
              Monthly GP Tier Table
            </div>
            <div style={{
              background: '#0d0f14',
              borderRadius: 10,
              border: '1px solid rgba(90,96,128,.2)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '10px 16px',
                background: '#1a1d27',
                borderBottom: '1px solid rgba(90,96,128,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase' }}>Monthly GP Range</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', textAlign: 'center' }}>Inbound Rate</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', textAlign: 'center' }}>Outbound Rate</div>
              </div>
              {/* Rows */}
              {[
                { range: '$0 - $50k', inbound: '4.5% - 7.5%', outbound: '7% - 10%' },
                { range: '$50k - $100k', inbound: '5% - 7.5%', outbound: '7.5% - 10%' },
                { range: '$100k+', inbound: '5.5% - 7.5%', outbound: '8% - 10%' },
              ].map((tier, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '12px 16px',
                  borderBottom: i < 2 ? '1px solid rgba(90,96,128,.1)' : 'none',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>{tier.range}</div>
                  <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#4f7fff', textAlign: 'center' }}>{tier.inbound}</div>
                  <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#22c07a', textAlign: 'center' }}>{tier.outbound}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PROTECTION RULE */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#f25a5a' }}>
              <AlertTriangle size={14} />
              Protection Rule
            </div>
            <div style={{
              background: 'rgba(242,90,90,.06)',
              border: '1px solid rgba(242,90,90,.2)',
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontSize: 13, color: '#e8eaed', lineHeight: 1.8 }}>
                <span style={{ fontWeight: 800, color: '#f25a5a' }}>Under 70% GPM (non-PPF jobs):</span> Sales rep receives <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#f25a5a' }}>base rate only</span>. No Torq bonus, no GPM bonus. This protects shop profitability on low-margin jobs.
              </div>
            </div>
          </div>

          {/* INSTALLER PAY RULES */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#22d3ee' }}>
              <Wrench size={14} />
              Installer Pay Rules
            </div>
            <div style={{ fontSize: 12, color: '#e8eaed', lineHeight: 1.8 }}>
              <div style={{ marginBottom: 8 }}>Installer pay is a <span style={{ fontWeight: 700, color: '#22d3ee' }}>fixed amount per vehicle type</span>, not hourly. This incentivizes efficiency:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#22d3ee" />
                  <span>Faster installs = higher effective $/hr for installer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#22d3ee" />
                  <span>Pay rates are set per vehicle size in Defaults tab</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#22d3ee" />
                  <span>Track quoted vs actual hours for performance metrics</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={12} color="#22d3ee" />
                  <span>Box trucks and trailers use labor % of COGS instead</span>
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCTION BONUS RULES */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#f59e0b' }}>
              <Zap size={14} />
              Production Bonus Rules
            </div>
            <div style={{
              background: 'rgba(245,158,11,.04)',
              border: '1px solid rgba(245,158,11,.15)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
                Production Bonus = (Job Profit * 5%) - Design Fees
              </div>
              <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.6 }}>
                The production bonus rewards the production team for profitable job execution. Design fees are deducted because they represent outside costs, not production effort. Minimum bonus is $0 (never goes negative).
              </div>
            </div>
          </div>

          {/* GUARANTEED PAY */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#8b5cf6' }}>
              <Users size={14} />
              Guaranteed Pay
            </div>
            <div style={{
              background: 'rgba(139,92,246,.04)',
              border: '1px solid rgba(139,92,246,.15)',
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#8b5cf6', marginBottom: 8 }}>
                40 hrs * $20/hr = $800/week
              </div>
              <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.6 }}>
                Sales reps receive a guaranteed base pay of $800/week (40 hours at $20/hr). Commission earnings above this amount are paid as additional compensation. If commission earnings in a pay period are less than the guaranteed amount, the rep receives the guaranteed amount.
              </div>
            </div>
          </div>

          {/* CONVERSION RATE */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#22c07a' }}>
              <Target size={14} />
              Conversion Rate Requirement
            </div>
            <div style={{
              background: 'rgba(34,192,122,.04)',
              border: '1px solid rgba(34,192,122,.15)',
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#22c07a', marginBottom: 8 }}>
                Minimum Conversion Rate: &gt;= 20%
              </div>
              <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.6 }}>
                Sales reps must maintain a minimum 20% conversion rate (closed deals / total estimates). Falling below this threshold triggers a review. Conversion rate is tracked monthly and displayed on the leaderboard.
              </div>
            </div>
          </div>

          {/* MATERIAL PRICING */}
          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#9299b5' }}>
              <Layers size={14} />
              Material Pricing
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{
                background: 'rgba(90,96,128,.06)',
                border: '1px solid rgba(90,96,128,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#9299b5', textTransform: 'uppercase', marginBottom: 8 }}>Buffer Standard</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 800, color: '#e8eaed', marginBottom: 4 }}>10%</div>
                <div style={{ fontSize: 11, color: '#5a6080' }}>Add 10% buffer to quoted SQFT for waste, overlap, and reprints</div>
              </div>
              <div style={{
                background: 'rgba(90,96,128,.06)',
                border: '1px solid rgba(90,96,128,.15)',
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#9299b5', textTransform: 'uppercase', marginBottom: 8 }}>Roll Width Standard</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 800, color: '#e8eaed', marginBottom: 4 }}>54&quot; Wide</div>
                <div style={{ fontSize: 11, color: '#5a6080' }}>Standard print roll width. SQFT = Linear Ft * (54/12)</div>
              </div>
            </div>
          </div>

        </div>
        </PinGate>
      )}

      {/* ===== TAB 3: Simulation Data ===== */}
      {activeTab === 'simulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={cardStyle}>
            <div style={{ ...sectionHeaderStyle, color: '#f25a5a' }}>
              <Database size={14} />
              Monthly Simulation
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button
                onClick={loadSimJobs}
                disabled={loadingSim}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: '#f25a5a',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: loadingSim ? 0.6 : 1,
                }}
              >
                <Download size={14} />
                {loadingSim ? 'Loading...' : 'Load Sample Jobs'}
              </button>
              <button
                onClick={clearSimJobs}
                disabled={loadingSim}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid rgba(90,96,128,.3)',
                  color: '#9299b5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: loadingSim ? 0.6 : 1,
                }}
              >
                <Trash2 size={14} />
                Clear Sim Jobs
              </button>
            </div>

            {/* Warning banner */}
            <div style={{
              background: 'rgba(245,158,11,.08)',
              border: '1px solid rgba(245,158,11,.3)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <div style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 800 }}>Simulation Mode:</span> Loading sample jobs will create 25 projects in your database with the <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>[SIM]</span> prefix. These jobs will appear in your pipeline and analytics. Use &ldquo;Clear Sim Jobs&rdquo; to remove them all.
              </div>
            </div>

            {/* Job cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {SIM_JOBS.map((job, i) => {
                const stages = ['sales_in', 'production', 'install', 'prod_review', 'sales_close']
                const stage = stages[i % 5]
                const stageColors: Record<string, string> = {
                  sales_in: '#4f7fff',
                  production: '#22c07a',
                  install: '#22d3ee',
                  prod_review: '#f59e0b',
                  sales_close: '#8b5cf6',
                }
                const stageLabels: Record<string, string> = {
                  sales_in: 'Sales',
                  production: 'Prod',
                  install: 'Install',
                  prod_review: 'QC',
                  sales_close: 'Close',
                }
                const typeColors: Record<string, string> = {
                  inbound: '#4f7fff',
                  outbound: '#22c07a',
                  presold: '#f59e0b',
                }

                return (
                  <div key={i} style={{
                    background: '#0d0f14',
                    border: '1px solid rgba(90,96,128,.15)',
                    borderRadius: 8,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#e8eaed', lineHeight: 1.2, marginBottom: 2 }}>
                      {job.company}
                    </div>
                    <div style={{ fontSize: 10, color: '#5a6080' }}>{job.vehicle}</div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#e8eaed',
                    }}>
                      {fM(job.price)}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: `${typeColors[job.type]}15`,
                        color: typeColors[job.type],
                        border: `1px solid ${typeColors[job.type]}30`,
                      }}>
                        {job.type}
                      </span>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: `${stageColors[stage]}15`,
                        color: stageColors[stage],
                        border: `1px solid ${stageColors[stage]}30`,
                      }}>
                        {stageLabels[stage]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}

      {/* ===== TAB 4: Role Permissions ===== */}
      {activeTab === 'permissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #1a1d27',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 800,
                  color: '#e8eaed', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Lock size={16} style={{ color: '#4f7fff' }} />
                  Role Permissions Matrix
                </div>
                <div style={{ fontSize: 12, color: '#5a6080', marginTop: 4 }}>
                  Read-only reference. Assign roles to team members in the Team page.
                  Roles with all permissions automatically bypass individual checks.
                </div>
              </div>
            </div>
            <PermissionsMatrix />
          </div>
        </div>
      )}

      {/* ===== TAB 5: Visibility ===== */}
      {activeTab === 'visibility' && (
        <div style={cardStyle}>
          <VisibilitySettings orgId={profile.org_id} />
        </div>
      )}

      {/* ===== TAB 6: Message Templates ===== */}
      {activeTab === 'templates' && (
        <div style={cardStyle}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, color: '#e8eaed', margin: '0 0 4px' }}>Message Templates</h2>
            <p style={{ fontSize: 12, color: '#5a6080', margin: 0 }}>Pre-written messages for customer follow-ups, status updates, and onboarding.</p>
          </div>

          {/* Create form */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#e8eaed', marginBottom: 12 }}>New Template</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Template Name</label>
                <input
                  value={tplName}
                  onChange={e => setTplName(e.target.value)}
                  placeholder="e.g. Job Ready for Pickup"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: '#e8eaed', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Category</label>
                <select
                  value={tplCategory}
                  onChange={e => setTplCategory(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: '#e8eaed', fontSize: 13, outline: 'none' }}
                >
                  <option value="custom">Custom</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="status_update">Status Update</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Message Content</label>
              <textarea
                value={tplContent}
                onChange={e => setTplContent(e.target.value)}
                placeholder="Hi {customer_name}, your wrap is ready! Come pick up your {vehicle_type} at..."
                rows={4}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: '#e8eaed', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ fontSize: 10, color: '#5a6080', marginTop: 4 }}>Variables: {'{customer_name}'}, {'{vehicle_type}'}, {'{job_title}'}, {'{install_date}'}</div>
            </div>
            <button
              onClick={createTemplate}
              disabled={tplSaving || !tplName.trim() || !tplContent.trim()}
              style={{ padding: '8px 18px', borderRadius: 8, background: '#4f7fff', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: tplSaving ? 0.6 : 1 }}
            >
              {tplSaving ? 'Saving...' : '+ Save Template'}
            </button>
          </div>

          {/* Templates list */}
          {tplLoading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#5a6080', fontSize: 13 }}>Loading templates...</div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#5a6080', fontSize: 13 }}>No templates yet. Create your first one above.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templates.map(t => (
                <div key={t.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed' }}>{t.name}</span>
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: t.category === 'onboarding' ? 'rgba(34,192,122,0.15)' : t.category === 'follow_up' ? 'rgba(245,158,11,0.15)' : t.category === 'status_update' ? 'rgba(79,127,255,0.15)' : 'rgba(90,96,128,0.2)',
                        color: t.category === 'onboarding' ? '#22c07a' : t.category === 'follow_up' ? '#f59e0b' : t.category === 'status_update' ? '#4f7fff' : '#9299b5',
                      }}>
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6080', padding: 2 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f25a5a')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#5a6080')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{t.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SettingsPage
