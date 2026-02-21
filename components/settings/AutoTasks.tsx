'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Clock, Circle, CheckCircle2, ListTodo, X, type LucideIcon } from 'lucide-react'
import type { Profile } from '@/types'

interface Task {
  id: string; type: string; person: string; role: string; jobId: string
  client: string; vehicle: string; desc: string; sub: string
  urgency: 'urgent'|'today'|'normal'; date: string
}

export default function AutoTasks({ profile }: { profile: Profile }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [sendBacks, setSendBacks] = useState<any[]>([])
  const [filter, setFilter] = useState<'all'|'sales'|'production'|'installer'>('all')
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: j }, { data: sb }] = await Promise.all([
        supabase.from('projects').select('*').eq('org_id', profile.org_id).neq('status', 'closed'),
        supabase.from('send_backs').select('*').eq('org_id', profile.org_id).order('created_at', { ascending: false }),
      ])
      setJobs(j || [])
      setSendBacks(sb || [])
    }
    load()
  }, [])

  const today = new Date().toISOString().split('T')[0]

  function generateTasks(): Task[] {
    const tasks: Task[] = []

    jobs.forEach(q => {
      const fd = (q.form_data as any) || {}
      const stage = q.pipe_stage || 'sales_in'
      if (stage === 'done') return

      const iDate = fd.installDate || q.install_date || ''
      const isToday = iDate === today
      const jobSbs = sendBacks.filter(s => s.project_id === q.id)
      const lastSB = jobSbs[0]

      const agent = fd.agent || ''
      const installer = fd.installer || ''
      const prod = fd.productionPerson || 'Production'

      // ── SALES TASKS ──
      if (agent) {
        if (stage === 'sales_in' && lastSB?.to_stage === 'sales_in') {
          tasks.push({ id:`sb-${q.id}`, type:'sales_send_back', person:agent, role:'sales_agent', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`SENT BACK: ${fd.client||q.title} — ${(lastSB.reason||'').substring(0,60)}`, sub:`Was in ${lastSB.from_stage?.replace('_',' ')}`, urgency:'urgent', date:today })
        }
        if (stage === 'sales_in' && !fd.deposit && !fd.contractSigned) {
          tasks.push({ id:`intake-${q.id}`, type:'sales_intake', person:agent, role:'sales_agent', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`Complete Sales Intake: ${fd.client||q.title}`, sub:`Missing deposit or contract`, urgency:'normal', date:today })
        }
        if (q.status === 'active' && !iDate) {
          tasks.push({ id:`sched-${q.id}`, type:'sales_schedule', person:agent, role:'sales_agent', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`Schedule install date: ${fd.client||q.title}`, sub:`No install date set`, urgency:'today', date:today })
        }
        if (q.status === 'estimate') {
          const estDate = q.created_at?.split('T')[0] || ''
          const daysSince = estDate ? Math.floor((Date.now() - new Date(estDate).getTime()) / 86400000) : 0
          tasks.push({ id:`est-${q.id}`, type:'sales_follow_up', person:agent, role:'sales_agent', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`Follow up on estimate: ${fd.client||q.title}`, sub:`${daysSince > 0 ? daysSince+'d ago' : 'Today'} · ${q.revenue ? '$'+Math.round(q.revenue) : ''}`, urgency: daysSince >= 3 ? 'today' : 'normal', date:estDate||today })
        }
        if (stage === 'sales_close') {
          tasks.push({ id:`close-${q.id}`, type:'sales_close', person:agent, role:'sales_agent', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`Final sign-off needed: ${fd.client||q.title}`, sub:`All stages complete — awaiting close`, urgency:'today', date:today })
        }
      }

      // ── PRODUCTION TASKS ──
      if (stage === 'production' && lastSB?.to_stage === 'production') {
        tasks.push({ id:`psb-${q.id}`, type:'prod_send_back', person:prod, role:'production', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`SENT BACK: ${fd.client||q.title} — ${(lastSB.reason||'').substring(0,55)}`, sub:`From ${lastSB.from_stage?.replace('_',' ')}`, urgency:'urgent', date:today })
      } else if (stage === 'production') {
        tasks.push({ id:`print-${q.id}`, type:'prod_queue', person:prod, role:'production', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`Print queue: ${fd.client||q.title} — ${fd.vehicle||''}`, sub:`${fd.sqft||'?'} sqft · ${fd.matSku||'Check details'}`, urgency:'urgent', date:today })
      }
      if (stage === 'prod_review') {
        tasks.push({ id:`qc-${q.id}`, type:'prod_review', person:prod, role:'production', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`QC Review: ${fd.client||q.title}`, sub:`Check wrap quality, log final linft`, urgency:'today', date:today })
      }

      // ── INSTALLER TASKS ──
      if (installer) {
        if (stage === 'install' && isToday) {
          tasks.push({ id:`inst-today-${q.id}`, type:'install_today', person:installer, role:'installer', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`INSTALL TODAY: ${fd.client||q.title}`, sub:`${fd.selectedVehicle?.hrs||'?'}h · ${q.fin_data?.labor ? '$'+Math.round(q.fin_data.labor) : ''} pay`, urgency:'today', date:today })
        }
        if (stage === 'install' && iDate && iDate > today) {
          tasks.push({ id:`inst-up-${q.id}`, type:'install_upcoming', person:installer, role:'installer', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`Upcoming: ${fd.client||q.title} — ${iDate}`, sub:`Pre-install checklist required day-of`, urgency:'normal', date:iDate })
        }
        if (stage === 'install' && lastSB?.to_stage === 'install') {
          tasks.push({ id:`isb-${q.id}`, type:'install_send_back', person:installer, role:'installer', jobId:q.id, client:fd.client||q.title, vehicle:fd.vehicle||'', desc:`VINYL ISSUE: ${fd.client||q.title}`, sub:(lastSB.reason||'').substring(0,50), urgency:'urgent', date:today })
        }
      }
    })

    // Sort
    const urgencyOrder = { urgent:0, today:1, normal:2 }
    tasks.sort((a, b) => (urgencyOrder[a.urgency] - urgencyOrder[b.urgency]) || a.date.localeCompare(b.date))
    return tasks
  }

  const tasks = generateTasks().filter(t => {
    if (dismissed.has(t.id)) return false
    if (filter === 'all') return true
    return t.role === filter
  })

  const urgentCount = tasks.filter(t => t.urgency === 'urgent').length
  const todayCount = tasks.filter(t => t.urgency === 'today').length

  const URGENCY_STYLES: Record<string, {bg:string; border:string; Icon:LucideIcon; color:string}> = {
    urgent: { bg:'rgba(242,90,90,.08)', border:'rgba(242,90,90,.3)', Icon:AlertCircle, color:'#f25a5a' },
    today:  { bg:'rgba(245,158,11,.06)', border:'rgba(245,158,11,.25)', Icon:Clock, color:'#f59e0b' },
    normal: { bg:'var(--surface2)', border:'var(--border)', Icon:Circle, color:'#4f7fff' },
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:26, fontWeight:900, color:'var(--text1)', display:'flex', alignItems:'center', gap:8 }}><ListTodo size={24} /> Tasks</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Auto-generated from job status</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {urgentCount > 0 && <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800, background:'rgba(242,90,90,.15)', color:'#f25a5a', border:'1px solid rgba(242,90,90,.3)', display:'inline-flex', alignItems:'center', gap:4 }}><AlertCircle size={11} /> {urgentCount} urgent</span>}
          {todayCount > 0 && <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800, background:'rgba(245,158,11,.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)', display:'inline-flex', alignItems:'center', gap:4 }}><Clock size={11} /> {todayCount} today</span>}
        </div>
      </div>

      {/* Role filter */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {([{k:'all',l:'All',c:'var(--text1)'},{k:'sales',l:'Sales',c:'#4f7fff'},{k:'production',l:'Production',c:'#22c07a'},{k:'installer',l:'Install',c:'#22d3ee'}] as const).map(f => (
          <button key={f.k} onClick={() => setFilter(f.k as any)} style={{
            padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', border:'1px solid',
            background: filter===f.k ? 'var(--surface)' : 'transparent',
            borderColor: filter===f.k ? 'var(--border)' : 'transparent',
            color: filter===f.k ? f.c : 'var(--text3)',
          }}>{f.l} <span style={{ fontSize:10, opacity:.7 }}>({generateTasks().filter(t => f.k==='all'||t.role===f.k).length})</span></button>
        ))}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text3)' }}>
          <CheckCircle2 size={32} style={{ margin:'0 auto 8px', color:'var(--text3)' }} />
          <div style={{ fontSize:14, fontWeight:700 }}>All clear! No pending tasks.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {tasks.map(t => {
            const s = URGENCY_STYLES[t.urgency]
            return (
              <div key={t.id} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <s.Icon size={18} style={{ flexShrink:0, color: s.color }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text1)' }}>{t.desc}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                    {t.sub} · <span style={{ color: t.role === 'sales' ? '#4f7fff' : t.role === 'production' ? '#22c07a' : '#22d3ee', fontWeight:600 }}>{t.person}</span>
                  </div>
                </div>
                <button onClick={() => setDismissed(p => new Set([...Array.from(p), t.id]))} title="Dismiss" style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:4 }}><X size={13} /></button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
