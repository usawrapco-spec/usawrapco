'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const fM = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

export default function Leaderboard({ profile }: { profile: Profile }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [period, setPeriod] = useState<'week'|'month'|'quarter'|'all'>('month')
  const [mode, setMode] = useState<'all'|'wraps'|'ppf'>('all')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('projects').select('*, agent:agent_id(id, name), installer:installer_id(id, name)')
      .eq('org_id', profile.org_id)
      .then(({ data }) => setJobs(data || []))
      .catch(() => setJobs([]))
  }, [profile.org_id])

  // Period filter
  const now = new Date()
  const filtered = jobs.filter(j => {
    if (j.status !== 'closed') return false
    if (mode === 'wraps') { const jt = (j.form_data as any)?.jobType; if (jt === 'PPF') return false }
    if (mode === 'ppf') { const jt = (j.form_data as any)?.jobType; if (jt !== 'PPF') return false }
    if (period === 'all') return true
    const d = new Date(j.updated_at || j.created_at)
    const days = (now.getTime() - d.getTime()) / 86400000
    if (period === 'week') return days <= 7
    if (period === 'month') return days <= 30
    return days <= 90
  })

  function buildBoard(groupFn: (j:any)=>string|null, valFn: (j:any)=>number, labelFn: (name:string,val:number)=>string, color: string, fmt: (v:number)=>string) {
    const map: Record<string, number> = {}
    const countMap: Record<string, number> = {}
    filtered.forEach(j => {
      const k = groupFn(j); if (!k || k === '—') return
      map[k] = (map[k] || 0) + valFn(j)
      countMap[k] = (countMap[k] || 0) + 1
    })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
    if (!sorted.length) return <div style={{ padding:20, textAlign:'center', color:'var(--text3)', fontSize:12 }}>No data yet</div>
    const maxVal = sorted[0][1]
    return (
      <div>
        {sorted.map(([name, val], i) => {
          const pct = Math.round(val / maxVal * 100)
          const medalColor = i === 0 ? '#f59e0b' : i === 1 ? '#9299b5' : i === 2 ? '#cd7f32' : ''
          return (
            <div key={name} style={{ display:'grid', gridTemplateColumns:'36px 1fr 90px 120px', alignItems:'center', padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', background: i < 3 ? `rgba(${i===0?'255,215,0':i===1?'192,192,192':'205,127,50'},.04)` : 'transparent' }}>
              <div style={{ fontSize:13, textAlign:'center', fontFamily:'JetBrains Mono', fontWeight:700, color: medalColor || 'var(--text3)' }}>{i < 3 ? '#' : ''}{i+1}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text1)' }}>{name}</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>{labelFn(name, val)}</div>
              </div>
              <div style={{ textAlign:'right', fontFamily:'JetBrains Mono', fontWeight:700, color, fontSize:14 }}>{fmt(val)}</div>
              <div style={{ paddingLeft:10 }}>
                <div style={{ height:6, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width .5s' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const getAgent = (j: any) => (j.agent as any)?.name || (j.form_data as any)?.agent || null
  const getInstaller = (j: any) => (j.installer as any)?.name || (j.form_data as any)?.installer || null

  const boards = [
    { title: 'Sales Revenue', content: buildBoard(
      j => getAgent(j), j => j.revenue || 0,
      (n) => { const cnt = filtered.filter(j => getAgent(j) === n).length; return `${cnt} jobs` },
      '#4f7fff', v => fM(v)
    )},
    { title: 'Installer Earnings', content: buildBoard(
      j => getInstaller(j), j => (j.fin_data as any)?.labor || (j.form_data as any)?.selectedVehicle?.pay || 0,
      (n) => { const hrs = filtered.filter(j => getInstaller(j) === n).reduce((s,j) => s + ((j.fin_data as any)?.hrs || 0), 0); return `${Math.round(hrs)}h logged` },
      '#22d3ee', v => fM(v)
    )},
    { title: 'Referral Sources', content: buildBoard(
      j => (j.form_data as any)?.referralSource || null, j => j.revenue || 0,
      () => '', '#8b5cf6', v => fM(v)
    )},
    { title: 'GPM by Agent', content: buildBoard(
      j => getAgent(j), j => j.gpm || 0,
      (n) => { const cnt = filtered.filter(j => getAgent(j) === n).length; return `${cnt} jobs (avg)` },
      '#22c07a', v => { const n = filtered.filter(j => getAgent(j) === v.toString()).length; return `${Math.round(v / Math.max(1, n))}%` }
    )},
  ]

  return (
    <div style={{ maxWidth:1200, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:26, fontWeight:900, color:'var(--text1)' }}>Leaderboard</div>
        <div style={{ display:'flex', gap:6 }}>
          {(['week','month','quarter','all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding:'6px 14px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', border:'1px solid',
              background: period===p ? 'var(--accent)' : 'var(--surface2)',
              borderColor: period===p ? 'var(--accent)' : 'var(--border)',
              color: period===p ? '#fff' : 'var(--text3)',
            }}>{p === 'all' ? 'All Time' : p.charAt(0).toUpperCase()+p.slice(1)}</button>
          ))}
          <div style={{ width:1, background:'var(--border)', margin:'0 4px' }} />
          {(['all','wraps','ppf'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', border:'1px solid',
              background: mode===m ? 'var(--surface2)' : 'transparent',
              borderColor: mode===m ? 'var(--border)' : 'transparent',
              color: mode===m ? 'var(--text1)' : 'var(--text3)',
            }}>{m === 'all' ? 'All Types' : m.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {boards.map(b => (
          <div key={b.title} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontFamily:'Barlow Condensed, sans-serif', fontSize:14, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.04em' }}>{b.title}</div>
            {b.content}
          </div>
        ))}
      </div>
    </div>
  )
}
