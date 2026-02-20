'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const fM = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

const DEFAULT_ROWS = [
  { label: 'Rent / Lease', key: 'rent', color: '#f25a5a' },
  { label: 'Utilities', key: 'utilities', color: '#f59e0b' },
  { label: 'Equipment / Loans', key: 'equipment', color: '#f59e0b' },
  { label: 'Insurance', key: 'insurance', color: '#f59e0b' },
  { label: 'Guaranteed Sales Pay', key: 'salesBase', color: '#8b5cf6' },
  { label: 'Guaranteed Production Pay', key: 'prodPay', color: '#22c07a' },
  { label: 'Software / Subscriptions', key: 'software', color: '#9299b5' },
  { label: 'Marketing / Leads', key: 'marketing', color: '#22d3ee' },
  { label: 'Vehicle / Fuel', key: 'vehicleFuel', color: '#9299b5' },
  { label: 'Other Fixed', key: 'other', color: '#5a6080' },
]

export default function ShopOverheadCalc({ profile }: { profile: Profile }) {
  const [costs, setCosts] = useState<Record<string, number>>({})
  const [customRows, setCustomRows] = useState<{label:string; amount:number}[]>([])
  const [avgJobRev, setAvgJobRev] = useState(4500)
  const supabase = createClient()

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`usawrap_overhead_${profile.org_id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setCosts(parsed.costs || {})
        setCustomRows(parsed.customRows || [])
        if (parsed.avgJobRev) setAvgJobRev(parsed.avgJobRev)
      }
    } catch {}
  }, [])

  function persist(c: Record<string, number>, cr: {label:string;amount:number}[], ajr: number) {
    localStorage.setItem(`usawrap_overhead_${profile.org_id}`, JSON.stringify({ costs: c, customRows: cr, avgJobRev: ajr }))
  }

  function setCost(key: string, val: number) {
    const next = { ...costs, [key]: val }
    setCosts(next)
    persist(next, customRows, avgJobRev)
  }

  function addCustomRow() {
    const next = [...customRows, { label: 'Custom Cost', amount: 0 }]
    setCustomRows(next)
    persist(costs, next, avgJobRev)
  }

  function updateCustomRow(i: number, field: 'label'|'amount', val: any) {
    const next = [...customRows]
    next[i] = { ...next[i], [field]: field === 'amount' ? parseFloat(val) || 0 : val }
    setCustomRows(next)
    persist(costs, next, avgJobRev)
  }

  function removeCustomRow(i: number) {
    const next = customRows.filter((_, idx) => idx !== i)
    setCustomRows(next)
    persist(costs, next, avgJobRev)
  }

  // Calculate totals
  const fixedItems = DEFAULT_ROWS.map(r => ({ ...r, value: costs[r.key] || 0 })).filter(r => r.value > 0)
  const customItems = customRows.filter(r => r.amount > 0)
  const total = fixedItems.reduce((s, r) => s + r.value, 0) + customItems.reduce((s, r) => s + r.amount, 0)

  const breakEven75 = total > 0 ? total / 0.75 : 0
  const breakEven65 = total > 0 ? total / 0.65 : 0
  const dailyBurn = total / 30
  const jobsNeeded75 = avgJobRev > 0 ? Math.ceil(breakEven75 / avgJobRev) : 0
  const jobsNeeded65 = avgJobRev > 0 ? Math.ceil(breakEven65 / avgJobRev) : 0

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:26, fontWeight:900, color:'var(--text1)', marginBottom:4 }}>
        Shop Overhead Calculator
      </div>
      <div style={{ fontSize:12, color:'var(--text3)', marginBottom:20 }}>Enter your monthly fixed costs to see break-even revenue</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Input column */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:10, fontWeight:900, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Monthly Fixed Costs</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {DEFAULT_ROWS.map(r => (
              <div key={r.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:4, height:32, borderRadius:2, background:r.color, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--text2)' }}>{r.label}</div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text3)' }}>$</span>
                  <input type="number" value={costs[r.key] || ''} onChange={e => setCost(r.key, parseFloat(e.target.value) || 0)}
                    placeholder="0" style={{ width:110, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 10px 7px 22px', fontSize:13, color:'var(--text1)', outline:'none', fontFamily:'JetBrains Mono' }} />
                </div>
              </div>
            ))}

            {/* Custom rows */}
            {customRows.map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:4, height:32, borderRadius:2, background:'var(--text3)', flexShrink:0 }} />
                <input value={r.label} onChange={e => updateCustomRow(i, 'label', e.target.value)}
                  style={{ flex:1, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 10px', fontSize:12, color:'var(--text1)', outline:'none' }} />
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text3)' }}>$</span>
                  <input type="number" value={r.amount || ''} onChange={e => updateCustomRow(i, 'amount', e.target.value)}
                    style={{ width:110, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 10px 7px 22px', fontSize:13, color:'var(--text1)', outline:'none', fontFamily:'JetBrains Mono' }} />
                </div>
                <button onClick={() => removeCustomRow(i)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:14, padding:4 }}>✕</button>
              </div>
            ))}

            <button onClick={addCustomRow} style={{ padding:'8px 14px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', background:'var(--surface2)', border:'1px dashed var(--border)', color:'var(--text3)' }}>
              + Add Custom Cost
            </button>

            {/* Total */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderTop:'1px solid var(--border)', marginTop:6 }}>
              <div style={{ fontWeight:800, fontSize:14 }}>TOTAL MONTHLY OVERHEAD</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:22, fontWeight:800, color:'var(--red)' }}>{fM(total)}</div>
            </div>
          </div>
        </div>

        {/* Results column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Break-even card */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
            <div style={{ fontSize:10, fontWeight:900, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:14 }}>Break-Even Revenue Needed</div>
            {total === 0 ? (
              <div style={{ textAlign:'center', padding:20, color:'var(--text3)', fontSize:12 }}>Enter your monthly costs on the left</div>
            ) : (
              <>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>@ 75% GPM target</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:28, fontWeight:800, color:'#4f7fff' }}>{fM(breakEven75)}/mo</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>≈ {jobsNeeded75} jobs @ avg {fM(avgJobRev)}</div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>@ 65% GPM (low margin)</div>
                  <div style={{ fontFamily:'JetBrains Mono', fontSize:28, fontWeight:800, color:'#f59e0b' }}>{fM(breakEven65)}/mo</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>≈ {jobsNeeded65} jobs @ avg {fM(avgJobRev)}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', marginBottom:4 }}>Avg Job Revenue</div>
                  <input type="number" value={avgJobRev} onChange={e => { const v = parseFloat(e.target.value) || 0; setAvgJobRev(v); persist(costs, customRows, v) }}
                    style={{ width:120, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 10px', fontSize:13, color:'var(--text1)', outline:'none', fontFamily:'JetBrains Mono' }} />
                </div>
              </>
            )}
          </div>

          {/* Daily burn */}
          <div style={{ background:'linear-gradient(140deg,#0e0a14,#180e28)', border:'1px solid rgba(242,90,90,.25)', borderRadius:12, padding:20, textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:900, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>Daily Overhead Burn</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:36, fontWeight:900, color:'var(--red)' }}>{fM(dailyBurn)}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>per day</div>
            {dailyBurn > 0 && (
              <div style={{ marginTop:12, fontSize:12, color:'rgba(242,90,90,.8)', fontWeight:600 }}>
                Every day without a closed job costs you {fM(dailyBurn)}
              </div>
            )}
          </div>

          {/* Cost breakdown visual */}
          {total > 0 && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
              <div style={{ fontSize:10, fontWeight:900, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Cost Breakdown</div>
              {fixedItems.map(r => {
                const pct = Math.round(r.value / total * 100)
                return (
                  <div key={r.key} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                      <span style={{ color:'var(--text2)' }}>{r.label}</span>
                      <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:r.color }}>{fM(r.value)} ({pct}%)</span>
                    </div>
                    <div style={{ height:4, background:'var(--surface2)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:r.color, borderRadius:2 }} />
                    </div>
                  </div>
                )
              })}
              {customItems.map((r, i) => {
                const pct = Math.round(r.amount / total * 100)
                return (
                  <div key={i} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                      <span style={{ color:'var(--text2)' }}>{r.label}</span>
                      <span style={{ fontFamily:'JetBrains Mono', fontWeight:700 }}>{fM(r.amount)} ({pct}%)</span>
                    </div>
                    <div style={{ height:4, background:'var(--surface2)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'var(--text3)', borderRadius:2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
