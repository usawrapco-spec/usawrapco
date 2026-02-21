'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Check, ToggleLeft, ToggleRight, Calculator, TrendingUp, TrendingDown, DollarSign, Clock, Ruler, Printer } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

interface CloseJobModalProps {
  project: any
  profile: any
  onClose: () => void
  onUpdate: (project: any) => void
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fM2 = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
const fP = (n: number) => Math.round(n) + '%'
const v = (val: any, def = 0) => parseFloat(val) || def

export default function CloseJobModal({ project, profile, onClose, onUpdate }: CloseJobModalProps) {
  const supabase = createClient()
  const { xpToast } = useToast()
  const fd = (project.form_data as any) || {}
  const fin = project.fin_data || {}

  // Quoted values from the project
  const quotedSale = v(project.revenue) || v(fin.sale) || v(fin.sales)
  const quotedMaterial = v(fin.material) || v(fin.material_cost)
  const quotedLabor = v(fin.labor) || v(fin.labor_cost) || v(fin.install_pay)
  const quotedHrs = v(fin.hrs) || v(fin.laborHrs) || v(fin.hrs_budget)
  const quotedDesignFee = v(fin.designFee) || v(fin.design_fee) || v(fd.designFee, 150)
  const quotedCOGS = v(fin.cogs) || (quotedMaterial + quotedLabor + quotedDesignFee)
  const quotedProfit = v(fin.profit) || v(project.profit) || (quotedSale - quotedCOGS)
  const quotedGPM = quotedSale > 0 ? (quotedProfit / quotedSale) * 100 : 0
  const quotedSqft = v(fd.sqft)

  // Actual job costs state
  const [actualInstallerHrs, setActualInstallerHrs] = useState(fd.actualHrs || '')
  const [actualInstallerPay, setActualInstallerPay] = useState(fd.actualInstallerPay || '')
  const [finalSalePrice, setFinalSalePrice] = useState(fd.finalSalePrice || quotedSale.toString())
  const [actualMaterialCost, setActualMaterialCost] = useState(fd.actualMaterialCost || '')
  const [designFeesPaid, setDesignFeesPaid] = useState(fd.designFeesPaid || quotedDesignFee.toString())
  const [prodBonusDeduction, setProdBonusDeduction] = useState(fd.prodBonusDeduction || '')
  const [prodBonusAuto, setProdBonusAuto] = useState(fd.prodBonusAuto !== false)

  // Material usage tracking state
  const [quotedNetSqft, setQuotedNetSqft] = useState(fd.quotedNetSqft || quotedSqft.toString())
  const [actualSqftUsed, setActualSqftUsed] = useState(fd.actualSqftUsed || '')
  const [linearFtPrinted, setLinearFtPrinted] = useState(fd.linearFtPrinted || fd.linftPrinted || '')

  const [saving, setSaving] = useState(false)

  // Derived actual calculations
  const calcActuals = useCallback(() => {
    const sale = v(finalSalePrice)
    const matCost = v(actualMaterialCost)
    const instPay = v(actualInstallerPay)
    const instHrs = v(actualInstallerHrs)
    const design = v(designFeesPaid)

    const cogs = matCost + instPay + design
    const profit = sale - cogs
    const gpm = sale > 0 ? (profit / sale) * 100 : 0
    const installPerHr = instHrs > 0 ? instPay / instHrs : 0

    // Production bonus: (Job Profit * 5%) - Design Fees
    const autoProdBonus = Math.max(0, (profit * 0.05) - design)
    const prodBonus = prodBonusAuto ? autoProdBonus : v(prodBonusDeduction)

    // Material: 54in wide roll
    const lf = v(linearFtPrinted)
    const sqftPrinted = lf * (54 / 12) // 54 inches = 4.5 ft
    const qSqft = v(quotedNetSqft)
    const buffer = qSqft > 0 ? ((sqftPrinted - qSqft) / qSqft) * 100 : 0

    return { sale, matCost, instPay, instHrs, design, cogs, profit, gpm, installPerHr, prodBonus, sqftPrinted, buffer, lf, qSqft }
  }, [finalSalePrice, actualMaterialCost, actualInstallerPay, actualInstallerHrs, designFeesPaid, prodBonusAuto, prodBonusDeduction, linearFtPrinted, quotedNetSqft])

  const actuals = calcActuals()

  // Variance calculation helper
  function variance(quoted: number, actual: number) {
    return actual - quoted
  }

  function varianceColor(diff: number, invertGood = false) {
    if (diff === 0) return 'var(--text2)'
    if (invertGood) {
      return diff < 0 ? '#22c07a' : '#f25a5a'
    }
    return diff > 0 ? '#22c07a' : '#f25a5a'
  }

  function formatVariance(diff: number, isMoney = true) {
    const prefix = diff > 0 ? '+' : ''
    if (isMoney) return prefix + fM(diff)
    return prefix + Math.round(diff) + '%'
  }

  // Comparison table rows
  const comparisonRows = [
    { label: 'Sale Price', quoted: quotedSale, actual: actuals.sale, isMoney: true, invertGood: false },
    { label: 'Material Cost', quoted: quotedMaterial, actual: actuals.matCost, isMoney: true, invertGood: true },
    { label: 'Installer Pay', quoted: quotedLabor, actual: actuals.instPay, isMoney: true, invertGood: true },
    { label: 'Installer Hours', quoted: quotedHrs, actual: actuals.instHrs, isMoney: false, invertGood: true },
    { label: 'Design Fees', quoted: quotedDesignFee, actual: actuals.design, isMoney: true, invertGood: true },
    { label: 'COGS', quoted: quotedCOGS, actual: actuals.cogs, isMoney: true, invertGood: true },
    { label: 'Profit', quoted: quotedProfit, actual: actuals.profit, isMoney: true, invertGood: false },
    { label: 'GPM %', quoted: quotedGPM, actual: actuals.gpm, isMoney: false, invertGood: false },
  ]

  async function handleClose() {
    setSaving(true)

    const actualsData = {
      actualInstallerHrs: v(actualInstallerHrs),
      actualInstallerPay: v(actualInstallerPay),
      finalSalePrice: actuals.sale,
      actualMaterialCost: actuals.matCost,
      designFeesPaid: actuals.design,
      prodBonusDeduction: actuals.prodBonus,
      prodBonusAuto,
      quotedNetSqft: v(quotedNetSqft),
      actualSqftUsed: v(actualSqftUsed),
      linearFtPrinted: v(linearFtPrinted),
      actualCOGS: actuals.cogs,
      actualProfit: actuals.profit,
      actualGPM: actuals.gpm,
      actualInstallPerHr: actuals.installPerHr,
      closedAt: new Date().toISOString(),
      closedBy: profile.id,
    }

    const updatedFormData = {
      ...fd,
      ...actualsData,
      finalApproved: true,
    }

    const { error } = await supabase.from('projects').update({
      status: 'closed',
      pipe_stage: 'done',
      revenue: actuals.sale,
      profit: actuals.profit,
      gpm: actuals.gpm,
      commission: actuals.profit > 0 ? actuals.profit * (fd.leadType === 'outbound' ? 0.10 : fd.leadType === 'presold' ? 0.05 : 0.075) : 0,
      form_data: updatedFormData,
      actuals: actualsData,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id)

    if (!error) {
      // Log stage approval
      await supabase.from('stage_approvals').insert({
        project_id: project.id,
        org_id: project.org_id,
        stage: 'sales_close',
        approved_by: profile.id,
        notes: 'Job closed with actuals entered',
        checklist: actualsData,
      })

      onUpdate({
        ...project,
        status: 'closed',
        pipe_stage: 'done',
        revenue: actuals.sale,
        profit: actuals.profit,
        gpm: actuals.gpm,
        form_data: updatedFormData,
        actuals: actualsData,
      })

      // Award deal_won XP
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deal_won', sourceType: 'project', sourceId: project.id }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number } | null) => {
          if (res?.amount) xpToast(res.amount, 'Deal closed!', res.leveledUp, res.newLevel)
        })
        .catch(() => {})

      // Also award job_fully_completed XP (separate action, same source)
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'job_fully_completed', sourceType: 'project', sourceId: `${project.id}_completed` }),
      }).catch(() => {})
    }

    setSaving(false)
  }

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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,.85)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#13151c',
          border: '1px solid rgba(90,96,128,.25)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 960,
          padding: 0,
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 28px',
          borderBottom: '1px solid rgba(90,96,128,.2)',
        }}>
          <div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 22,
              fontWeight: 900,
              color: '#e8eaed',
            }}>
              Close Job &mdash; Enter Actuals
            </div>
            <div style={{
              fontSize: 12,
              color: '#9299b5',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontWeight: 700, color: '#e8eaed' }}>{project.title || fd.client || 'Untitled'}</span>
              <span style={{ color: '#5a6080' }}>|</span>
              <span>Quoted Sale: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4f7fff', fontWeight: 700 }}>{fM(quotedSale)}</span></span>
              <span style={{ color: '#5a6080' }}>|</span>
              <span>Quoted Profit: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#22c07a', fontWeight: 700 }}>{fM(quotedProfit)}</span></span>
              <span style={{ color: '#5a6080' }}>|</span>
              <span>Quoted GPM: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: quotedGPM >= 70 ? '#22c07a' : '#f25a5a', fontWeight: 700 }}>{fP(quotedGPM)}</span></span>
              <span style={{ color: '#5a6080' }}>|</span>
              <span>Quoted Hrs: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#e8eaed', fontWeight: 700 }}>{Math.round(quotedHrs)}h</span></span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1a1d27',
              border: '1px solid rgba(90,96,128,.3)',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: '#9299b5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ACTUAL JOB COSTS */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#22d3ee',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              paddingBottom: 8,
              marginBottom: 14,
              borderBottom: '1px solid rgba(90,96,128,.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <DollarSign size={14} />
              Actual Job Costs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {/* Row 1 */}
              <div>
                <label style={labelStyle}>Actual Installer Hours</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={actualInstallerHrs}
                  onChange={e => setActualInstallerHrs(e.target.value)}
                  placeholder={Math.round(quotedHrs).toString()}
                />
              </div>
              <div>
                <label style={labelStyle}>Actual Installer Pay ($)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={actualInstallerPay}
                  onChange={e => setActualInstallerPay(e.target.value)}
                  placeholder={fM(quotedLabor).replace('$', '').replace(',', '')}
                />
              </div>
              <div>
                <label style={labelStyle}>Final Sale Price ($)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={finalSalePrice}
                  onChange={e => setFinalSalePrice(e.target.value)}
                  placeholder={fM(quotedSale).replace('$', '').replace(',', '')}
                />
              </div>
              {/* Row 2 */}
              <div>
                <label style={labelStyle}>Actual Material Cost ($)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={actualMaterialCost}
                  onChange={e => setActualMaterialCost(e.target.value)}
                  placeholder={fM(quotedMaterial).replace('$', '').replace(',', '')}
                />
              </div>
              <div>
                <label style={labelStyle}>Design Fees Paid ($)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={designFeesPaid}
                  onChange={e => setDesignFeesPaid(e.target.value)}
                  placeholder={quotedDesignFee.toString()}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Prod Bonus Deduction ($)</span>
                    <button
                      onClick={() => setProdBonusAuto(!prodBonusAuto)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 9,
                        fontWeight: 800,
                        color: prodBonusAuto ? '#22c07a' : '#9299b5',
                        textTransform: 'uppercase',
                        padding: 0,
                      }}
                    >
                      {prodBonusAuto ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      auto
                    </button>
                  </span>
                </label>
                {prodBonusAuto ? (
                  <div style={{
                    ...inputStyle,
                    background: 'rgba(34,192,122,.06)',
                    border: '1px solid rgba(34,192,122,.2)',
                    color: '#22c07a',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    {fM(actuals.prodBonus)}
                    <span style={{ fontSize: 10, color: '#5a6080', marginLeft: 8 }}>(auto)</span>
                  </div>
                ) : (
                  <input
                    style={inputStyle}
                    type="number"
                    value={prodBonusDeduction}
                    onChange={e => setProdBonusDeduction(e.target.value)}
                    placeholder="0"
                  />
                )}
              </div>
            </div>
          </div>

          {/* MATERIAL USAGE TRACKING */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#f59e0b',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              paddingBottom: 8,
              marginBottom: 14,
              borderBottom: '1px solid rgba(90,96,128,.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Ruler size={14} />
              Material Usage Tracking
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div>
                <label style={labelStyle}>Quoted Net SQFT</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={quotedNetSqft}
                  onChange={e => setQuotedNetSqft(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={labelStyle}>Actual SQFT Used</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={actualSqftUsed}
                  onChange={e => setActualSqftUsed(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={labelStyle}>Linear Ft Printed (54&quot; Wide)</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={linearFtPrinted}
                  onChange={e => setLinearFtPrinted(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            {/* Auto-calc line */}
            {v(linearFtPrinted) > 0 && (
              <div style={{
                marginTop: 10,
                padding: '10px 14px',
                background: 'rgba(245,158,11,.06)',
                border: '1px solid rgba(245,158,11,.2)',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Printer size={14} />
                54 in @ {v(linearFtPrinted).toFixed(1)}lf = {Math.round(actuals.sqftPrinted)} sqft printed
                <span style={{ color: '#5a6080' }}>|</span>
                Quoted: {Math.round(actuals.qSqft)} sqft
                <span style={{ color: '#5a6080' }}>|</span>
                Buffer: <span style={{ color: actuals.buffer > 15 ? '#f25a5a' : '#22c07a', fontWeight: 700 }}>
                  {actuals.buffer > 0 ? '+' : ''}{Math.round(actuals.buffer)}%
                </span>
              </div>
            )}
          </div>

          {/* QUOTED VS ACTUAL COMPARISON TABLE */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#8b5cf6',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              paddingBottom: 8,
              marginBottom: 14,
              borderBottom: '1px solid rgba(90,96,128,.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Calculator size={14} />
              Quoted vs Actual Comparison
            </div>
            <div style={{
              background: '#0d0f14',
              borderRadius: 10,
              border: '1px solid rgba(90,96,128,.2)',
              overflow: 'hidden',
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                gap: 0,
                padding: '10px 16px',
                background: '#1a1d27',
                borderBottom: '1px solid rgba(90,96,128,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em' }}>Metric</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', textAlign: 'right' }}>Quoted</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', textAlign: 'right' }}>Actual</div>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.08em', textAlign: 'right' }}>Variance</div>
              </div>
              {/* Table rows */}
              {comparisonRows.map((row, i) => {
                const diff = row.label === 'GPM %'
                  ? variance(row.quoted, row.actual)
                  : variance(row.quoted, row.actual)
                const isGood = row.invertGood ? diff < 0 : diff > 0
                const isNeutral = Math.abs(diff) < 0.5
                const color = isNeutral ? '#9299b5' : (isGood ? '#22c07a' : '#f25a5a')
                const icon = isNeutral ? null : (isGood ? <TrendingUp size={12} /> : <TrendingDown size={12} />)
                return (
                  <div
                    key={row.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      gap: 0,
                      padding: '10px 16px',
                      borderBottom: i < comparisonRows.length - 1 ? '1px solid rgba(90,96,128,.1)' : 'none',
                      background: row.label === 'Profit' || row.label === 'GPM %' ? 'rgba(139,92,246,.04)' : 'transparent',
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      fontWeight: row.label === 'Profit' || row.label === 'GPM %' ? 800 : 600,
                      color: row.label === 'Profit' || row.label === 'GPM %' ? '#e8eaed' : '#9299b5',
                    }}>
                      {row.label}
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      color: '#9299b5',
                      textAlign: 'right',
                    }}>
                      {row.label === 'GPM %' ? fP(row.quoted) : row.label === 'Installer Hours' ? Math.round(row.quoted) + 'h' : fM(row.quoted)}
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: '#e8eaed',
                      textAlign: 'right',
                    }}>
                      {row.label === 'GPM %' ? fP(row.actual) : row.label === 'Installer Hours' ? Math.round(row.actual) + 'h' : fM(row.actual)}
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color,
                      textAlign: 'right',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 4,
                    }}>
                      {icon}
                      {row.label === 'GPM %'
                        ? formatVariance(diff, false)
                        : row.label === 'Installer Hours'
                          ? (diff > 0 ? '+' : '') + Math.round(diff) + 'h'
                          : formatVariance(diff, true)
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* BOTTOM SUMMARY - 6 metric cards */}
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#4f7fff',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              paddingBottom: 8,
              marginBottom: 14,
              borderBottom: '1px solid rgba(90,96,128,.2)',
            }}>
              Job Close Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {/* Row 1 */}
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'rgba(34,211,238,.05)',
                borderRadius: 12,
                border: '1px solid rgba(34,211,238,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Actual Profit</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 800, color: '#22d3ee' }}>
                  {fM(actuals.profit)}
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'rgba(34,192,122,.05)',
                borderRadius: 12,
                border: '1px solid rgba(34,192,122,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Actual GPM</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 800, color: actuals.gpm >= 70 ? '#22c07a' : '#f25a5a' }}>
                  {fP(actuals.gpm)}
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'rgba(90,96,128,.06)',
                borderRadius: 12,
                border: '1px solid rgba(90,96,128,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Actual Hrs</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 800, color: '#e8eaed' }}>
                  {Math.round(actuals.instHrs)}h
                </div>
              </div>
              {/* Row 2 */}
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'rgba(90,96,128,.06)',
                borderRadius: 12,
                border: '1px solid rgba(90,96,128,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Install $/Hr</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 800, color: '#e8eaed' }}>
                  {actuals.installPerHr > 0 ? fM(actuals.installPerHr) : '--'}
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'rgba(90,96,128,.06)',
                borderRadius: 12,
                border: '1px solid rgba(90,96,128,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Prod Bonus (Est)</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 800, color: '#e8eaed' }}>
                  {fM(actuals.prodBonus)}
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '16px 12px',
                background: 'rgba(90,96,128,.06)',
                borderRadius: 12,
                border: '1px solid rgba(90,96,128,.2)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>54&quot; Mat Printed</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 800, color: '#e8eaed' }}>
                  {v(linearFtPrinted) > 0 ? `${Math.round(v(linearFtPrinted))}lf` : '--'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Action Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 12,
          padding: '16px 28px',
          borderTop: '1px solid rgba(90,96,128,.2)',
          background: '#0d0f14',
          borderRadius: '0 0 16px 16px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '11px 24px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              background: '#1a1d27',
              border: '1px solid rgba(90,96,128,.3)',
              color: '#9299b5',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleClose}
            disabled={saving}
            style={{
              padding: '11px 28px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              background: '#22c07a',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Check size={16} />
            {saving ? 'Closing...' : 'Mark Paid / Closed'}
          </button>
        </div>
      </div>
    </div>
  )
}
