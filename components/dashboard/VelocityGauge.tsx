'use client'

import { useState } from 'react'
import { Pencil, Sparkles, X, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  totalRevenue:  number
  closedCount:   number
  estimateCount: number
  pipelineValue: number
  daysElapsed:   number
  daysInPeriod:  number
  periodLabel:   string
}

const fM = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

const PERIOD_DEFAULTS: Record<string, number> = {
  week: 15000, month: 65000, quarter: 195000, year: 780000,
}

export default function VelocityGauge({
  totalRevenue, closedCount, estimateCount, pipelineValue,
  daysElapsed, daysInPeriod, periodLabel,
}: Props) {
  const defaultTarget = PERIOD_DEFAULTS[periodLabel] ?? 65000
  const [target, setTarget]           = useState(defaultTarget)
  const [editingTarget, setEditing]   = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [forecast, setForecast]       = useState<any>(null)
  const [forecasting, setForecasting] = useState(false)

  const dailyPace = daysElapsed > 0 ? totalRevenue / daysElapsed : 0
  const projected = dailyPace * daysInPeriod
  const pctRaw    = target > 0 ? projected / target : 0
  const pct       = Math.min(pctRaw, 1)

  const color       = pctRaw >= 1 ? '#22c07a' : pctRaw >= 0.8 ? '#f59e0b' : '#f25a5a'
  const statusLabel = pctRaw >= 1 ? 'On Track' : pctRaw >= 0.8 ? 'Near Target' : 'Behind'

  const totalOpps       = closedCount + estimateCount
  const winRate         = totalOpps > 0 ? closedCount / totalOpps : 0
  const avgDeal         = closedCount > 0 ? totalRevenue / closedCount : 0
  const velocityMonthly = totalOpps > 0 ? (totalOpps * winRate * avgDeal) / 14 * 30 : 0

  // SVG semi-circle gauge — M (20,100) counterclockwise through top to (180,100), r=80
  const r         = 80
  const arcLen    = Math.PI * r     // ≈ 251.3
  const filledArc = pct * arcLen

  // Needle: pct=0 → left, pct=1 → right
  const needleAngle = Math.PI * (1 - pct)
  const needleLen   = 58
  const needleX     = (100 + needleLen * Math.cos(needleAngle)).toFixed(2)
  const needleY     = (100 - needleLen * Math.sin(needleAngle)).toFixed(2)

  function saveTarget() {
    const v = parseFloat(targetInput.replace(/[^0-9.]/g, ''))
    if (!isNaN(v) && v > 0) setTarget(v)
    setEditing(false)
  }

  async function runForecast() {
    setForecasting(true)
    try {
      const res = await fetch('/api/ai/sales-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentRevenue: totalRevenue,
          monthlyTarget: target,
          pipeline: { totalValue: pipelineValue, byStage: {} },
          historicalData: [],
        }),
      })
      const data = await res.json()
      if (data.forecast) setForecast(data.forecast)
    } catch {}
    setForecasting(false)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 24px',
      display: 'flex', gap: 28, alignItems: 'flex-start',
    }}>

      {/* ── Gauge ─────────────────────────────── */}
      <div style={{ flexShrink: 0, textAlign: 'center' }}>
        <svg viewBox="0 0 200 115" width={200} height={115}>
          {/* Track */}
          <path d="M 20,100 A 80,80 0 0 0 180,100"
            fill="none" stroke="var(--surface2)" strokeWidth={14} strokeLinecap="round" />
          {/* Fill */}
          <path d="M 20,100 A 80,80 0 0 0 180,100"
            fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
            strokeDasharray={`${filledArc.toFixed(1)} ${arcLen.toFixed(1)}`} />
          {/* Needle */}
          <line x1={100} y1={100} x2={needleX} y2={needleY}
            stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={100} cy={100} r={5} fill={color} />
          {/* Value */}
          <text x={100} y={74} textAnchor="middle"
            fontSize={21} fontWeight={900} fontFamily="JetBrains Mono, monospace" fill={color}>
            {(pctRaw * 100).toFixed(0)}%
          </text>
          <text x={100} y={89} textAnchor="middle"
            fontSize={9} fill="var(--text3)">
            of {periodLabel} target
          </text>
          {/* Tick labels */}
          <text x={18}  y={113} textAnchor="middle" fontSize={7.5} fill="var(--text3)">0%</text>
          <text x={100} y={17}  textAnchor="middle" fontSize={7.5} fill="var(--text3)">50%</text>
          <text x={182} y={113} textAnchor="middle" fontSize={7.5} fill="var(--text3)">100%</text>
        </svg>

        {/* Status pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 12px', borderRadius: 20,
          background: `${color}22`, border: `1px solid ${color}44`,
          fontSize: 11, fontWeight: 700, color, marginTop: 4,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          {statusLabel}
        </div>
      </div>

      {/* ── Stats ─────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 2 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 16, fontWeight: 900, color: 'var(--text1)',
            letterSpacing: '0.01em',
          }}>
            Sales Velocity
          </div>
          {editingTarget ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTarget() }}
                placeholder={fM(target)}
                autoFocus
                style={{
                  width: 110, padding: '4px 8px',
                  background: 'var(--surface2)', border: '1px solid var(--accent)',
                  borderRadius: 6, color: 'var(--text1)', fontSize: 12, outline: 'none',
                }}
              />
              <button onClick={saveTarget} style={{
                padding: '4px 10px', borderRadius: 6, background: 'var(--accent)',
                border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>Set</button>
              <button onClick={() => setEditing(false)} style={{
                padding: '4px 8px', borderRadius: 6, background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--text3)', fontSize: 11, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => { setTargetInput(target.toString()); setEditing(true) }}
              style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text3)', cursor: 'pointer' }}>
              Target: {fM(target)} <Pencil size={10} style={{ display:'inline', verticalAlign:'middle' }} />
            </button>
          )}
        </div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            { label: 'Daily Pace',    val: fM(dailyPace),       col: color },
            { label: 'Projected',     val: fM(projected),       col: 'var(--text1)' },
            { label: 'Win Rate',      val: `${(winRate * 100).toFixed(0)}%`, col: 'var(--cyan)' },
            { label: 'Avg Deal',      val: fM(avgDeal),         col: 'var(--accent)' },
            { label: 'Pipeline',      val: fM(pipelineValue),   col: 'var(--purple)' },
            { label: 'Velocity/mo',   val: fM(velocityMonthly), col: 'var(--amber)' },
          ] as const).map(({ label, val, col }) => (
            <div key={label} style={{
              background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
              }}>
                {label}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 900,
                fontFamily: 'JetBrains Mono, monospace', color: col,
              }}>
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* Formula line */}
        <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>
          Velocity = {totalOpps} opportunities × {(winRate * 100).toFixed(0)}% win rate × {fM(avgDeal)} avg
          {daysElapsed > 0 && <>&nbsp;·&nbsp;{daysElapsed}d elapsed of {daysInPeriod}</>}
        </div>

        {/* AI Forecast button */}
        {!forecast && (
          <button
            onClick={runForecast}
            disabled={forecasting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.3)',
              color: 'var(--accent)', transition: 'all 0.15s',
              opacity: forecasting ? 0.7 : 1,
            }}
          >
            <Sparkles size={13} />
            {forecasting ? 'Forecasting...' : 'AI Forecast'}
          </button>
        )}

        {/* AI Forecast panel */}
        {forecast && (
          <div style={{
            background: 'rgba(79,127,255,0.05)', border: '1px solid rgba(79,127,255,0.2)',
            borderRadius: 10, padding: '12px 14px', position: 'relative',
          }}>
            <button
              onClick={() => setForecast(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
            >
              <X size={13} />
            </button>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={11} /> AI Forecast
            </div>
            {forecast.summary && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
                {forecast.summary}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
              {forecast.projected_monthly_revenue != null && (
                <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Projected</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>{fM(forecast.projected_monthly_revenue)}</div>
                </div>
              )}
              {forecast.confidence_percent != null && (
                <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Confidence</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}>{forecast.confidence_percent}%</div>
                </div>
              )}
              {forecast.velocity_score != null && (
                <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Velocity</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--purple)', fontFamily: 'JetBrains Mono, monospace' }}>{forecast.velocity_score}/100</div>
                </div>
              )}
            </div>
            {forecast.recommended_actions?.length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5 }}>Recommendations</div>
                {forecast.recommended_actions.slice(0, 2).map((action: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, fontSize: 11, color: 'var(--text2)' }}>
                    <CheckCircle size={11} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                    {action}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
