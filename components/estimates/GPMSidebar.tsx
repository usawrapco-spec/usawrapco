'use client'

import type { LineItem } from '@/types'
import { TrendingUp, DollarSign } from 'lucide-react'

interface Props {
  lineItems: LineItem[]
  leadType: string
  onLeadTypeChange: (lt: string) => void
  torqBonus: boolean
  onTorqChange: (v: boolean) => void
}

const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const mono = 'JetBrains Mono, monospace'
const heading = 'Barlow Condensed, sans-serif'

function calcItemCOGS(item: LineItem): { mat: number; install: number; design: number; other: number } {
  const s = item.specs as Record<string, unknown>
  const mat     = (s.materialCost as number) || 0
  const install = (s.installerPay as number) || ((s.estimatedHours as number) || 0) * 30
  const design  = (s.designFee as number) || 0
  const other   = (s.machineCost as number) || 0
  return { mat, install, design, other }
}

function gpmColor(gpm: number): string {
  if (gpm >= 73) return 'var(--green)'
  if (gpm >= 65) return 'var(--amber)'
  return 'var(--red)'
}

const COMMISSION_RATES: Record<string, { base: number; gpMax: number; torqBonus: number; gpmBonus: number; hasBonus: boolean }> = {
  inbound:  { base: 0.045, gpMax: 0.075, torqBonus: 0.01, gpmBonus: 0.02, hasBonus: true },
  outbound: { base: 0.07,  gpMax: 0.10,  torqBonus: 0.01, gpmBonus: 0.02, hasBonus: true },
  presold:  { base: 0.05,  gpMax: 0.05,  torqBonus: 0,    gpmBonus: 0,    hasBonus: false },
  referral: { base: 0.045, gpMax: 0.075, torqBonus: 0.01, gpmBonus: 0.02, hasBonus: true },
  walk_in:  { base: 0.045, gpMax: 0.075, torqBonus: 0.01, gpmBonus: 0.02, hasBonus: true },
}

export default function GPMSidebar({ lineItems, leadType, onLeadTypeChange, torqBonus, onTorqChange }: Props) {
  const revenue   = lineItems.reduce((s, li) => s + li.total_price, 0)
  const costBreak = lineItems.reduce((acc, li) => {
    const c = calcItemCOGS(li)
    acc.mat     += c.mat
    acc.install += c.install
    acc.design  += c.design
    acc.other   += c.other
    return acc
  }, { mat: 0, install: 0, design: 0, other: 0 })

  const totalCOGS = costBreak.mat + costBreak.install + costBreak.design + costBreak.other
  const gp        = revenue - totalCOGS
  const gpm       = revenue > 0 ? (gp / revenue) * 100 : 0

  const rates  = COMMISSION_RATES[leadType] || COMMISSION_RATES.inbound
  const lowGPM = gpm < 65
  let commRate  = rates.base
  if (!lowGPM && rates.hasBonus) {
    if (gpm >= 73) commRate += rates.gpmBonus
    if (torqBonus) commRate += rates.torqBonus
    commRate = Math.min(commRate, rates.gpMax)
  }
  const commission = Math.max(0, gp * commRate)

  const color = gpmColor(gpm)

  const row = (label: string, value: string, bold = false) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
      <span style={{ color: bold ? 'var(--text1)' : 'var(--text2)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontFamily: mono, fontVariantNumeric: 'tabular-nums', color: bold ? 'var(--text1)' : 'var(--text2)', fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  )

  return (
    <div style={{
      position: 'sticky', top: 16, width: 220, flexShrink: 0,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <TrendingUp size={13} style={{ color: color }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: heading }}>
          GPM Breakdown
        </span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* Revenue */}
        {row('Revenue', fmtC(revenue))}

        {/* COGS breakdown */}
        {costBreak.mat > 0 && row('  Material Cost', fmtC(costBreak.mat))}
        {costBreak.install > 0 && row('  Installer Pay', fmtC(costBreak.install))}
        {costBreak.design > 0 && row('  Design Fees', fmtC(costBreak.design))}
        {costBreak.other > 0 && row('  Other COGS', fmtC(costBreak.other))}

        <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
        {row('Total COGS', fmtC(totalCOGS), true)}
        {row('Gross Profit', fmtC(gp), true)}

        {/* GPM big display */}
        <div style={{ margin: '10px 0', padding: '10px 12px', borderRadius: 8, border: `1px solid ${color}33`, background: `${color}11`, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: mono }}>
            {gpm.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: heading, letterSpacing: '0.06em' }}>
            {gpm >= 73 ? 'Excellent' : gpm >= 65 ? 'Good' : 'Low Margin'}
          </div>
        </div>

        {/* Commission Preview */}
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: heading }}>
            Commission Preview
          </div>

          {/* Lead Type Toggle */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: heading }}>Lead Type</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { key: 'inbound', label: 'In' },
                { key: 'outbound', label: 'Out' },
                { key: 'presold', label: 'Pre-sold' },
              ].map(opt => (
                <button key={opt.key}
                  onClick={() => onLeadTypeChange(opt.key)}
                  style={{
                    flex: 1, padding: '4px 6px', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700,
                    fontFamily: heading, letterSpacing: '0.04em', textTransform: 'uppercase',
                    border: leadType === opt.key ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: leadType === opt.key ? 'rgba(79,127,255,0.12)' : 'var(--bg)',
                    color: leadType === opt.key ? 'var(--accent)' : 'var(--text3)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Torq Bonus */}
          {rates.hasBonus && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: torqBonus ? 'var(--text1)' : 'var(--text2)', marginBottom: 8 }}>
              <input type="checkbox" checked={torqBonus} onChange={() => onTorqChange(!torqBonus)} />
              Torq Training Bonus (+1%)
            </label>
          )}

          {/* Commission breakdown */}
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
            {row('Commission Rate', `${(commRate * 100).toFixed(1)}%`)}
            {lowGPM && (
              <div style={{ fontSize: 10, color: 'var(--amber)', padding: '4px 0', fontStyle: 'italic' }}>
                Low margin — base rate only
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, marginTop: 4, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Est. Commission</span>
              <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>
                <DollarSign size={12} style={{ display: 'inline', verticalAlign: '-1px' }} />
                {fmtC(commission).replace('$', '')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
