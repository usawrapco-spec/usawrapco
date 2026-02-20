'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface ProductionHubProps { profile: Profile }

const fM = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

export default function ProductionHub({ profile }: ProductionHubProps) {
  const [tab, setTab] = useState<'material'|'bonus'|'checkout'>('material')
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('projects')
        .select('*')
        .eq('org_id', profile.org_id)
        .in('status', ['active','estimate'])
        .order('updated_at', { ascending: false })
      setJobs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const TABS = [
    { key: 'material' as const, label: '📏 Material Log', color: '#22d3ee' },
    { key: 'bonus' as const, label: '💰 Production Bonus', color: '#22c07a' },
    { key: 'checkout' as const, label: '✅ Checkout', color: '#f59e0b' },
  ]

  // Derived data
  const activeJobs = jobs.filter(j => j.status === 'active')
  const withMaterial = jobs.filter(j => (j.form_data as any)?.linftPrinted)
  const totLinft = withMaterial.reduce((s, j) => s + (parseFloat((j.form_data as any)?.linftPrinted) || 0), 0)
  const totSqftPrinted = totLinft * 4.5
  const totSqftQuoted = withMaterial.reduce((s, j) => s + (parseFloat((j.form_data as any)?.sqft) || 0), 0)
  const bufPct = totSqftQuoted > 0 ? Math.round((totSqftPrinted - totSqftQuoted) / totSqftQuoted * 100) : 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:26, fontWeight:900, color:'var(--text1)', marginBottom:20 }}>
        ⚙ Production Hub
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <StatCard label="Active Jobs" value={activeJobs.length.toString()} color="var(--accent)" />
        <StatCard label="Linear Ft Printed" value={totLinft.toFixed(1)} color="var(--cyan)" />
        <StatCard label="Sqft Printed" value={Math.round(totSqftPrinted).toString()} color="var(--cyan)" />
        <StatCard label="Material Buffer" value={`${bufPct > 0 ? '+' : ''}${bufPct}%`} color={Math.abs(bufPct) > 10 ? 'var(--red)' : 'var(--green)'} sub="10% target" />
      </div>

      {/* Tabs */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'12px 24px', fontSize:13, fontWeight:700, cursor:'pointer', border:'none',
              borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              background:'transparent', color: tab === t.key ? t.color : 'var(--text3)', marginBottom:-1,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding:20 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>Loading...</div>
          ) : tab === 'material' ? (
            <MaterialLogTab jobs={withMaterial} />
          ) : tab === 'bonus' ? (
            <BonusTab jobs={jobs.filter(j => j.status === 'active' || j.status === 'closed')} />
          ) : (
            <CheckoutTab jobs={activeJobs} supabase={supabase} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Material Log ──────────────────────────────────────────────
function MaterialLogTab({ jobs }: { jobs: any[] }) {
  if (!jobs.length) return <div style={{ textAlign:'center', padding:30, color:'var(--text3)', fontSize:13 }}>No material data yet. Log linear feet in each job's Production tab.</div>
  return (
    <table style={{ width:'100%', borderCollapse:'collapse' }}>
      <thead>
        <tr>{['Ref','Client','Vehicle','Linear Ft','Sqft (54")','Quoted Sqft','Buffer','Material'].map(h => (
          <th key={h} style={{ textAlign:'left', padding:'9px 12px', fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {jobs.map(j => {
          const fd = (j.form_data as any) || {}
          const lft = parseFloat(fd.linftPrinted) || 0
          const sqft = lft * 4.5
          const qSqft = parseFloat(fd.sqft) || 0
          const buf = qSqft > 0 ? Math.round((sqft - qSqft) / qSqft * 100) : null
          return (
            <tr key={j.id} style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
              <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', fontSize:11, color:'var(--accent)' }}>#{j.id.slice(-6)}</td>
              <td style={{ padding:'10px 12px', fontSize:12, fontWeight:600 }}>{fd.client || j.title || '—'}</td>
              <td style={{ padding:'10px 12px', fontSize:11, color:'var(--text2)' }}>{fd.vehicle || j.vehicle_desc || '—'}</td>
              <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--cyan)' }}>{lft.toFixed(1)}</td>
              <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono' }}>{Math.round(sqft)}</td>
              <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--text3)' }}>{qSqft ? Math.round(qSqft) : '—'}</td>
              <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color: buf !== null && Math.abs(buf) > 10 ? 'var(--red)' : 'var(--green)' }}>{buf !== null ? `${buf > 0 ? '+' : ''}${buf}%` : '—'}</td>
              <td style={{ padding:'10px 12px', fontSize:11, color:'var(--text2)' }}>{fd.matSku || '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Bonus Tracking ────────────────────────────────────────────
function BonusTab({ jobs }: { jobs: any[] }) {
  const prodBonusPct = 10
  const rows = jobs.filter(j => j.profit && j.profit > 0).map(j => {
    const fd = (j.form_data as any) || {}
    const profit = j.profit || 0
    const design = parseFloat(fd.designFee) || 150
    const bonusRaw = profit * (prodBonusPct / 100)
    const bonus = Math.max(0, bonusRaw - design)
    const hrs = j.fin_data?.hrs || 0
    return { ...j, fd, profit, design, bonusRaw, bonus, hrs, perHr: hrs > 0 ? bonus / hrs : 0 }
  })
  const totBonus = rows.reduce((s, r) => s + r.bonus, 0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Total Production Bonus</div>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:28, fontWeight:700, color:'var(--green)' }}>{fM(totBonus)}</div>
        </div>
        <div style={{ fontSize:11, color:'var(--text3)' }}>{prodBonusPct}% of profit minus design fees</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'var(--text3)' }}>No profitable jobs yet</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Client','Profit','GPM','Design Fee','Bonus (raw)','Bonus (net)','Est Hours','$/hr'].map(h => (
              <th key={h} style={{ textAlign:'left', padding:'9px 12px', fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <td style={{ padding:'10px 12px', fontSize:12, fontWeight:600 }}>{r.fd.client || r.title}</td>
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--green)' }}>{fM(r.profit)}</td>
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color: (r.gpm||0) >= 70 ? 'var(--green)' : 'var(--red)' }}>{Math.round(r.gpm||0)}%</td>
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--amber)' }}>{fM(r.design)}</td>
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--text2)' }}>{fM(r.bonusRaw)}</td>
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--green)', fontWeight:700 }}>{fM(r.bonus)}</td>
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--cyan)' }}>{r.hrs}h</td>
                <td style={{ padding:'10px 12px', fontFamily:'JetBrains Mono', color:'var(--text2)' }}>{r.perHr > 0 ? fM(r.perHr)+'/h' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Checkout ──────────────────────────────────────────────────
function CheckoutTab({ jobs, supabase }: { jobs: any[]; supabase: any }) {
  const STAGES = ['sales_in','production','install','prod_review','sales_close']
  const STAGE_LABELS: Record<string,{label:string;color:string}> = {
    sales_in: { label:'Sales', color:'#4f7fff' },
    production: { label:'Production', color:'#22c07a' },
    install: { label:'Install', color:'#22d3ee' },
    prod_review: { label:'QC', color:'#f59e0b' },
    sales_close: { label:'Close', color:'#8b5cf6' },
  }

  if (!jobs.length) return <div style={{ textAlign:'center', padding:30, color:'var(--text3)' }}>No active jobs</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {jobs.map(j => {
        const curIdx = STAGES.indexOf(j.pipe_stage || 'sales_in')
        const fd = (j.form_data as any) || {}
        return (
          <div key={j.id} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:13 }}>{fd.client || j.title} <span style={{ color:'var(--text3)', fontSize:11, fontWeight:400 }}>— {fd.vehicle || j.vehicle_desc}</span></div>
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>#{j.id.slice(-6)} · {fd.agent} · {fd.installer || 'Unassigned'}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'JetBrains Mono', color:'var(--green)', fontWeight:700 }}>{fM(j.revenue || 0)}</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>{Math.round(j.gpm || 0)}% GPM</div>
              </div>
            </div>
            {/* Stage progress */}
            <div style={{ display:'flex', gap:3, marginBottom:10 }}>
              {STAGES.map((s, i) => (
                <div key={s} style={{ flex:1, height:4, borderRadius:2, background: i <= curIdx ? STAGE_LABELS[s].color : 'var(--border)' }} />
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4 }}>
              {STAGES.map((s, i) => {
                const done = i < curIdx
                const active = i === curIdx
                return (
                  <div key={s} style={{ textAlign:'center', padding:6, background: done ? 'rgba(34,192,122,.1)' : 'var(--surface)', border:`1px solid ${done ? 'rgba(34,192,122,.2)' : 'var(--border)'}`, borderRadius:6 }}>
                    <div style={{ fontSize:9, color: STAGE_LABELS[s].color, fontWeight:700, textTransform:'uppercase' }}>{STAGE_LABELS[s].label}</div>
                    <div style={{ fontSize:10, marginTop:2, color: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--text3)', fontWeight:700 }}>
                      {done ? '✅' : active ? '⏳' : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, color, sub }: { label:string; value:string; color:string; sub?:string }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
      <div style={{ fontSize:9, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:28, fontWeight:800, color }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}
