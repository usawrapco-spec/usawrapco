'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Save, Briefcase, FileText, Check, X,
  ChevronRight, Users, User, CheckSquare,
} from 'lucide-react'
import type { LineItemState, ProductType, Proposal } from '@/lib/estimator/types'
import { calcLineItem, calcTotals } from '@/lib/estimator/pricing'
import LineItemCard from './LineItemCard'
import TotalsSidebar from './TotalsSidebar'
import ProposalBuilder from './ProposalBuilder'

interface LineItemsEngineProps {
  projectId: string
  orgId: string
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fP = (n: number) => Math.round(n) + '%'

function gpmColor(gpm: number): string {
  if (gpm >= 73) return 'var(--green)'
  if (gpm >= 65) return 'var(--amber)'
  return 'var(--red)'
}

function createDefaultItem(): LineItemState {
  return {
    id: crypto.randomUUID(),
    isOptional: false,
    type: 'vehicle',
    name: 'Commercial Vehicle',
    collapsed: false,
    showStdRates: false,
    coverage: 'full',
    sqft: 0,
    roofSqft: 0,
    includeRoof: false,
    matId: 'avery1105',
    matRate: 2.10,
    designFee: 150,
    installRateMode: 'pct',
    laborPct: 10,
    laborFlat: 0,
    targetGPM: 75,
    salePrice: 0,
    manualSale: false,
    photos: [],
  }
}

export default function LineItemsEngine({ projectId, orgId }: LineItemsEngineProps) {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState<LineItemState[]>([createDefaultItem()])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [activeTab, setActiveTab] = useState<'items' | 'proposals'>('items')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertMode, setConvertMode] = useState<'single' | 'peritem' | 'custom'>('single')
  const [convertSelected, setConvertSelected] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  // Calculate all items
  const itemsWithCalc = useMemo(() => {
    return items.map(item => ({
      ...item,
      _calc: calcLineItem(item),
    }))
  }, [items])

  // Load existing line items from Supabase
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('estimator_line_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order')

      if (data && data.length > 0) {
        const loaded: LineItemState[] = data.map(row => ({
          id: row.id,
          isOptional: row.is_optional || false,
          type: (row.product_type || 'vehicle') as ProductType,
          name: row.item_name || '',
          collapsed: true,
          showStdRates: false,
          year: row.vehicle_year || undefined,
          make: row.vehicle_make || undefined,
          model: row.vehicle_model || undefined,
          coverage: (row.coverage || 'full') as 'full' | 'threequarter' | 'half',
          sqft: Number(row.sqft) || 0,
          roofSqft: Number(row.roof_sqft) || 0,
          includeRoof: row.include_roof || false,
          btLength: row.bt_length ? Number(row.bt_length) : undefined,
          btHeight: row.bt_height ? Number(row.bt_height) : undefined,
          btSides: row.bt_sides || undefined,
          btCab: row.bt_cab || false,
          trLength: row.tr_length ? Number(row.tr_length) : undefined,
          trHeight: row.tr_height ? Number(row.tr_height) : undefined,
          trSides: row.tr_sides || undefined,
          trFrontCoverage: row.tr_front_coverage || undefined,
          trVnose: row.tr_vnose || undefined,
          trVnoseH: row.tr_vnose_h ? Number(row.tr_vnose_h) : undefined,
          trVnoseL: row.tr_vnose_l ? Number(row.tr_vnose_l) : undefined,
          marHullLength: row.mar_hull_length ? Number(row.mar_hull_length) : undefined,
          marHullHeight: row.mar_hull_height ? Number(row.mar_hull_height) : undefined,
          marPasses: row.mar_passes || 2,
          marTransom: row.mar_transom || false,
          ppfSelected: row.ppf_selected || [],
          matId: row.material_id || 'avery1105',
          matRate: Number(row.material_rate) || 2.10,
          designFee: Number(row.design_fee) || 150,
          installRateMode: (row.install_rate_mode || 'pct') as 'pct' | 'flat',
          laborPct: Number(row.labor_pct) || 10,
          laborFlat: Number(row.labor_flat) || 0,
          targetGPM: Number(row.target_gpm) || 75,
          salePrice: Number(row.sale_price) || 0,
          manualSale: row.manual_sale || false,
          photos: [],
        }))
        setItems(loaded)
      }
      setLoaded(true)
    }
    load()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`estimator_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estimator_line_items', filter: `project_id=eq.${projectId}` },
        () => {
          // Reload on external changes
          // In a production app, we'd diff and merge instead of full reload
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save to Supabase
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Delete existing and re-insert (simple upsert approach)
      await supabase
        .from('estimator_line_items')
        .delete()
        .eq('project_id', projectId)

      const rows = itemsWithCalc.map((item, i) => ({
        id: item.id,
        project_id: projectId,
        org_id: orgId,
        sort_order: i,
        is_optional: item.isOptional,
        product_type: item.type,
        item_name: item.name,
        vehicle_year: item.year || null,
        vehicle_make: item.make || null,
        vehicle_model: item.model || null,
        coverage: item.coverage || null,
        sqft: item.sqft,
        roof_sqft: item.roofSqft,
        include_roof: item.includeRoof,
        bt_length: item.btLength || null,
        bt_height: item.btHeight || null,
        bt_sides: item.btSides || null,
        bt_cab: item.btCab || false,
        tr_length: item.trLength || null,
        tr_height: item.trHeight || null,
        tr_sides: item.trSides || null,
        tr_front_coverage: item.trFrontCoverage || null,
        tr_vnose: item.trVnose || null,
        tr_vnose_h: item.trVnoseH || null,
        tr_vnose_l: item.trVnoseL || null,
        mar_hull_length: item.marHullLength || null,
        mar_hull_height: item.marHullHeight || null,
        mar_passes: item.marPasses || 2,
        mar_transom: item.marTransom || false,
        ppf_selected: item.ppfSelected || [],
        material_id: item.matId,
        material_rate: item.matRate,
        design_fee: item.designFee,
        install_rate_mode: item.installRateMode,
        labor_pct: item.laborPct,
        labor_flat: item.laborFlat,
        target_gpm: item.targetGPM,
        sale_price: item._calc?.salePrice || 0,
        manual_sale: item.manualSale,
        mat_cost: item._calc?.matCost || 0,
        labor_cost: item._calc?.labor || 0,
        cogs: item._calc?.cogs || 0,
        profit: item._calc?.profit || 0,
        gpm: item._calc?.gpm || 0,
      }))

      if (rows.length > 0) {
        await supabase.from('estimator_line_items').insert(rows)
      }

      // Also update project financials
      const totals = calcTotals(itemsWithCalc)
      await supabase
        .from('projects')
        .update({
          revenue: totals.totalRevenue,
          profit: totals.totalProfit,
          gpm: Math.round(totals.blendedGPM),
          fin_data: {
            sales: totals.totalRevenue,
            cogs: totals.totalCogs,
            profit: totals.totalProfit,
            gpm: totals.blendedGPM,
            material: totals.totalMaterial,
            labor: totals.totalLabor,
            designFee: totals.totalDesign,
            commission: 0,
            laborHrs: 0,
            misc: 0,
          },
        })
        .eq('id', projectId)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }, [itemsWithCalc, projectId, orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Item CRUD
  function addItem() {
    setItems(prev => [...prev, createDefaultItem()])
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateItem(id: string, updates: Partial<LineItemState>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  function duplicateItem(id: string) {
    const original = items.find(i => i.id === id)
    if (!original) return
    const copy: LineItemState = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      collapsed: false,
    }
    const idx = items.findIndex(i => i.id === id)
    const next = [...items]
    next.splice(idx + 1, 0, copy)
    setItems(next)
  }

  // Convert to Job modal
  function handleConvertToJob() {
    setConvertSelected(items.filter(i => !i.isOptional).map(i => i.id))
    setConvertMode('single')
    setShowConvertModal(true)
  }

  function handleBuildProposal() {
    setActiveTab('proposals')
  }

  const totals = calcTotals(itemsWithCalc)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ─── Tab Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[
            { id: 'items' as const, label: 'Line Items' },
            { id: 'proposals' as const, label: 'Proposals' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', borderRadius: '8px 8px 0 0',
                border: 'none',
                background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text1)' : 'var(--text3)',
                fontSize: 13, fontWeight: 800, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {tab.label}
              {tab.id === 'items' && (
                <span style={{
                  marginLeft: 6, padding: '1px 6px', borderRadius: 10,
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {items.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--green)', fontWeight: 700,
            }}>
              <Check size={14} /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', borderRadius: 8,
              background: saving ? 'var(--surface2)' : 'var(--accent)',
              border: 'none', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Left: Items or Proposals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeTab === 'items' ? (
            <>
              {itemsWithCalc.map((item, i) => (
                <LineItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  onChange={updateItem}
                  onRemove={removeItem}
                  onDuplicate={duplicateItem}
                />
              ))}

              <button
                onClick={addItem}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '14px', borderRadius: 10,
                  border: '2px dashed var(--border)', background: 'transparent',
                  color: 'var(--text3)', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  minHeight: 52,
                }}
              >
                <Plus size={18} />
                Add Line Item
              </button>
            </>
          ) : (
            <ProposalBuilder
              items={itemsWithCalc}
              proposals={proposals}
              onProposalsChange={setProposals}
            />
          )}
        </div>

        {/* Right: Totals Sidebar (sticky) */}
        <div style={{ position: 'sticky', top: 16 }}>
          <TotalsSidebar
            items={itemsWithCalc}
            onConvertToJob={handleConvertToJob}
            onBuildProposal={handleBuildProposal}
          />
        </div>
      </div>

      {/* ─── Convert to Job Modal ────────────────────────────────────── */}
      {showConvertModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            width: '100%', maxWidth: 560, borderRadius: 16,
            background: 'var(--surface)', border: '1px solid var(--border)',
            padding: 24, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{
                fontSize: 18, fontWeight: 800, color: 'var(--text1)',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase',
              }}>
                Convert to Job
              </span>
              <button
                onClick={() => setShowConvertModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { value: 'single' as const, label: 'Single Job', icon: Briefcase },
                { value: 'peritem' as const, label: 'Per Line Item', icon: Users },
                { value: 'custom' as const, label: 'Custom Selection', icon: CheckSquare },
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => {
                    setConvertMode(mode.value)
                    if (mode.value === 'single') {
                      setConvertSelected(items.filter(i => !i.isOptional).map(i => i.id))
                    } else if (mode.value === 'peritem') {
                      setConvertSelected(items.filter(i => !i.isOptional).map(i => i.id))
                    }
                  }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 8, minHeight: 44,
                    border: convertMode === mode.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: convertMode === mode.value ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                    color: convertMode === mode.value ? 'var(--accent)' : 'var(--text2)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: 'uppercase',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <mode.icon size={16} />
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Item Selection (for custom mode) */}
            {convertMode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {items.map((item, i) => {
                  const isSelected = convertSelected.includes(item.id)
                  const calc = item._calc || calcLineItem(item)
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setConvertSelected(prev =>
                          isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                        )
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: isSelected ? 'none' : '1px solid var(--border)',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <Check size={12} style={{ color: '#fff' }} />}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>
                        {item.name || `Item ${i + 1}`}
                      </span>
                      <span style={{
                        fontSize: 12, color: 'var(--text2)', fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {fM(calc.salePrice)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Summary */}
            {(() => {
              const selected = items.filter(i => convertSelected.includes(i.id))
              const t = calcTotals(selected.map(i => ({ ...i, _calc: calcLineItem(i), isOptional: false })))
              return (
                <div style={{
                  padding: '14px 16px', borderRadius: 10, marginBottom: 16,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Sale Total</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', fontFamily: "'JetBrains Mono', monospace" }}>{fM(t.totalRevenue)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>COGS</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text2)', fontFamily: "'JetBrains Mono', monospace" }}>{fM(t.totalCogs)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>Gross Profit</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: gpmColor(t.blendedGPM), fontFamily: "'JetBrains Mono', monospace" }}>{fM(t.totalProfit)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>GPM</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: gpmColor(t.blendedGPM), fontFamily: "'JetBrains Mono', monospace" }}>{fP(t.blendedGPM)}</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Agent Assignment Note */}
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.15)',
              fontSize: 11, color: 'var(--text3)',
            }}>
              <User size={12} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
              Auto-assignment: Decking items go to <strong style={{ color: 'var(--text1)' }}>Brooks</strong>, everything else to <strong style={{ color: 'var(--text1)' }}>Kevin</strong>.
            </div>

            {/* Create Button */}
            <button
              onClick={async () => {
                // Save estimator data first
                await handleSave()

                if (convertMode === 'peritem') {
                  // Create one project per selected item
                  const selectedItems = items.filter(i => convertSelected.includes(i.id))
                  for (const item of selectedItems) {
                    const calc = item._calc || calcLineItem(item)
                    await supabase.from('projects').insert({
                      org_id: orgId,
                      name: item.name || 'New Job',
                      status: 'sales_in',
                      revenue: calc.salePrice,
                      profit: calc.profit,
                      gpm: Math.round(calc.gpm),
                      fin_data: {
                        sales: calc.salePrice, cogs: calc.cogs,
                        profit: calc.profit, gpm: calc.gpm,
                        material: calc.matCost, labor: calc.labor,
                        designFee: calc.design, commission: 0, laborHrs: 0, misc: 0,
                      },
                    })
                  }
                  setShowConvertModal(false)
                  router.push('/pipeline')
                } else {
                  // Single job OR custom selection — push current project into pipeline
                  const t = calcTotals(
                    items
                      .filter(i => convertSelected.includes(i.id))
                      .map(i => ({ ...i, _calc: calcLineItem(i), isOptional: false }))
                  )
                  await supabase
                    .from('projects')
                    .update({
                      status: 'sales_in',
                      revenue: t.totalRevenue,
                      profit: t.totalProfit,
                      gpm: Math.round(t.blendedGPM),
                      fin_data: {
                        sales: t.totalRevenue, cogs: t.totalCogs,
                        profit: t.totalProfit, gpm: t.blendedGPM,
                        material: t.totalMaterial, labor: t.totalLabor,
                        designFee: t.totalDesign, commission: 0, laborHrs: 0, misc: 0,
                      },
                    })
                    .eq('id', projectId)
                  setShowConvertModal(false)
                  router.push(`/projects/${projectId}`)
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '14px', borderRadius: 10,
                background: 'var(--green)', border: 'none', color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.06em',
                minHeight: 48,
              }}
            >
              <Briefcase size={18} />
              Create {convertMode === 'peritem' ? `${convertSelected.length} Jobs` : 'Job'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
