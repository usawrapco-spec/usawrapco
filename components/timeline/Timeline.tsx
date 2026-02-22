'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'


export default function Timeline({ profile }: { profile: Profile }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [groupBy, setGroupBy] = useState<'installer'|'agent'|'stage'>('installer')
  const [timeWindow, setTimeWindow] = useState<'2w'|'1m'|'3m'>('2w')
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('projects').select('*, agent:agent_id(id, name), installer:installer_id(id, name)')
      .eq('org_id', profile.org_id)
      .neq('status', 'closed').order('install_date', { ascending: true })
      .then(({ data }) => setJobs(data || []))
      .catch(() => setJobs([]))
  }, [profile.org_id])

  const today = new Date()
  const days = timeWindow === '2w' ? 14 : timeWindow === '1m' ? 30 : 90
  const dates: Date[] = []
  for (let i = 0; i < days; i++) { const d = new Date(today); d.setDate(d.getDate() + i); dates.push(d) }

  // Group jobs
  const groupMap: Record<string, any[]> = {}
  jobs.forEach(j => {
    const fd = (j.form_data as any) || {}
    let key = '—'
    if (groupBy === 'installer') key = fd.installer || '—'
    else if (groupBy === 'agent') key = fd.agent || '—'
    else key = (j.pipe_stage || 'sales_in').replace('_', ' ')
    if (!key || key === '—') return
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(j)
  })
  const groups = Object.keys(groupMap).sort()

  const dayW = 38
  const labelW = 160

  const JOB_COLORS: Record<string, string> = {
    Commercial: '#4f7fff', Marine: '#22d3ee', PPF: '#8b5cf6', Decking: '#06b6d4'
  }

  return (
    <div style={{ maxWidth:1400, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:26, fontWeight:900, color:'var(--text1)' }}>Timeline</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Group:</span>
          {(['installer','agent','stage'] as const).map(g => (
            <button key={g} onClick={() => setGroupBy(g)} style={{
              padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', border:'1px solid',
              background: groupBy===g ? 'var(--accent)' : 'var(--surface2)',
              borderColor: groupBy===g ? 'var(--accent)' : 'var(--border)',
              color: groupBy===g ? '#fff' : 'var(--text3)',
            }}>{g.charAt(0).toUpperCase()+g.slice(1)}</button>
          ))}
          <div style={{ width:1, height:20, background:'var(--border)', margin:'0 4px' }} />
          <span style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase' }}>Window:</span>
          {(['2w','1m','3m'] as const).map(w => (
            <button key={w} onClick={() => setTimeWindow(w)} style={{
              padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', border:'1px solid',
              background: timeWindow===w ? 'var(--surface2)' : 'transparent',
              borderColor: timeWindow===w ? 'var(--border)' : 'transparent',
              color: timeWindow===w ? 'var(--text1)' : 'var(--text3)',
            }}>{w === '2w' ? '2 Weeks' : w === '1m' ? '1 Month' : '3 Months'}</button>
          ))}
        </div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div ref={containerRef} style={{ overflowX:'auto', padding:16 }}>
          <div style={{ minWidth: labelW + days * dayW }}>
            {/* Date header */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', paddingBottom:6, marginBottom:8 }}>
              <div style={{ width:labelW, flexShrink:0, fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', paddingLeft:8 }}>
                {groupBy.toUpperCase()}
              </div>
              <div style={{ display:'flex', flex:1 }}>
                {dates.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString()
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div key={i} style={{ width:dayW, fontSize:9, textAlign:'center', flexShrink:0, fontWeight: isToday ? 900 : 500, color: isToday ? '#4f7fff' : isWeekend ? 'var(--text3)' : 'var(--text3)' }}>
                      {d.getMonth()+1}/{d.getDate()}
                      {isToday && <div style={{ color:'#4f7fff', fontSize:8 }}>▼</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rows */}
            {groups.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text3)', fontSize:13 }}>No active jobs with install dates to display</div>
            ) : groups.map(grpName => (
              <div key={grpName} style={{ display:'flex', alignItems:'center', marginBottom:6, minHeight:36 }}>
                <div style={{ width:labelW, flexShrink:0, fontSize:12, fontWeight:700, color:'var(--text1)', padding:'4px 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {grpName}
                </div>
                <div style={{ flex:1, position:'relative', height:32 }}>
                  {/* Weekend bands */}
                  {dates.map((d, i) => {
                    if (d.getDay() !== 0 && d.getDay() !== 6) return null
                    return <div key={`w${i}`} style={{ position:'absolute', left:i*dayW, width:dayW, height:'100%', background:'rgba(255,255,255,.02)', borderRadius:2 }} />
                  })}
                  {/* Job bars */}
                  {groupMap[grpName].map(j => {
                    const fd = (j.form_data as any) || {}
                    const installD = fd.installDate || j.install_date
                    if (!installD) return null
                    const iDate = new Date(installD + 'T00:00:00')
                    const diffDays = Math.round((iDate.getTime() - today.getTime()) / 86400000)
                    if (diffDays < 0 || diffDays >= days) return null
                    const hrs = j.fin_data?.hrs || fd.selectedVehicle?.hrs || 4
                    const barDays = Math.max(1, Math.ceil(hrs / 8))
                    const left = diffDays * dayW
                    const width = Math.min(barDays * dayW, (days - diffDays) * dayW) - 2
                    const color = JOB_COLORS[fd.jobType] || '#4f7fff'
                    return (
                      <div key={j.id} title={`${fd.client || j.title} — ${fd.vehicle || j.vehicle_desc} (${hrs}h)`} style={{
                        position:'absolute', left, width, height:28, borderRadius:5, background:color, opacity:.85, cursor:'pointer',
                        display:'flex', alignItems:'center', padding:'0 6px', overflow:'hidden', top:2,
                      }}>
                        <span style={{ fontSize:9, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {(fd.client || j.title || '').split(' ')[0]} {hrs}h
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
