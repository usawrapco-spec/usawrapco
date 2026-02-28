'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Clock, Circle, CheckCircle2, ListTodo, X, Check, Calendar, Plus, type LucideIcon } from 'lucide-react'
import type { Profile } from '@/types'

interface Task {
  id: string; type: string; person: string; role: string; jobId: string
  client: string; vehicle: string; desc: string; sub: string
  urgency: 'urgent'|'today'|'normal'; date: string
}

export default function AutoTasks({ profile }: { profile: Profile }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [sendBacks, setSendBacks] = useState<any[]>([])
  const [dbTasks, setDbTasks] = useState<any[]>([])
  const [filter, setFilter] = useState<'all'|'sales'|'production'|'installer'>('all')
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newRole, setNewRole] = useState('sales_agent')
  const [newDue, setNewDue] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: j }, { data: sb }, { data: dt }] = await Promise.all([
        supabase.from('projects').select('*').eq('org_id', profile.org_id).neq('status', 'closed'),
        supabase.from('send_backs').select('*').eq('org_id', profile.org_id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*, project:project_id(title)').eq('org_id', profile.org_id).neq('status', 'done').order('due_at', { ascending: true }).limit(50),
      ])
      setJobs(j || [])
      setSendBacks(sb || [])
      setDbTasks(dt || [])
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

  async function markTaskDone(taskId: string) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
    setDbTasks(prev => prev.filter(t => t.id !== taskId))
  }

  async function createTask() {
    if (!newTitle.trim()) return
    setCreating(true)
    const { data, error } = await supabase.from('tasks').insert({
      org_id: profile.org_id,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      type: newRole,
      due_at: newDue || null,
      priority: newPriority,
      status: 'pending',
      source: 'manual',
      created_by: profile.id,
    }).select().single()
    setCreating(false)
    if (!error && data) {
      setDbTasks(prev => [data, ...prev])
      setNewTitle('')
      setNewDesc('')
      setNewDue('')
      setNewRole('sales_agent')
      setNewPriority('medium')
      setShowCreate(false)
    }
  }

  const filteredDbTasks = dbTasks.filter(t => {
    if (filter === 'all') return true
    const roleMap: Record<string, string> = { sales: 'sales_agent', production: 'production', installer: 'installer' }
    return t.type === roleMap[filter]
  })

  const ROLE_COLOR: Record<string, string> = {
    sales_agent: '#4f7fff',
    production: '#22c07a',
    installer: '#22d3ee',
  }

  function dueBadge(due: string) {
    if (!due) return null
    const diff = Math.floor((new Date(due).getTime() - Date.now()) / 86400000)
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: '#f25a5a', bg: 'rgba(242,90,90,.1)' }
    if (diff === 0) return { label: 'Due today', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' }
    return { label: `Due in ${diff}d`, color: 'var(--text3)', bg: 'var(--surface2)' }
  }

  const URGENCY_STYLES: Record<string, {bg:string; border:string; Icon:LucideIcon; color:string}> = {
    urgent: { bg:'rgba(242,90,90,.08)', border:'rgba(242,90,90,.3)', Icon:AlertCircle, color:'#f25a5a' },
    today:  { bg:'rgba(245,158,11,.06)', border:'rgba(245,158,11,.25)', Icon:Clock, color:'#f59e0b' },
    normal: { bg:'var(--surface2)', border:'var(--border)', Icon:Circle, color:'#4f7fff' },
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      {/* Create Task Modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:28, width:'100%', maxWidth:480 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:20, fontWeight:900, color:'var(--text1)', marginBottom:16 }}>New Task</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>Title *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task description..." style={{ width:'100%', padding:'9px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text1)', fontSize:13, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>Details</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional notes..." style={{ width:'100%', padding:'9px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text1)', fontSize:13, outline:'none' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>Assign To</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width:'100%', padding:'9px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text1)', fontSize:12, outline:'none' }}>
                    <option value="sales_agent">Sales</option>
                    <option value="production">Production</option>
                    <option value="installer">Installer</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ width:'100%', padding:'9px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text1)', fontSize:12, outline:'none' }}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:4, textTransform:'uppercase' }}>Due Date</label>
                  <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} style={{ width:'100%', padding:'9px 10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text1)', fontSize:12, outline:'none' }} />
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:20, justifyContent:'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={createTask} disabled={creating || !newTitle.trim()} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, opacity: creating||!newTitle.trim() ? 0.6 : 1 }}>
                <Plus size={13} /> {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:26, fontWeight:900, color:'var(--text1)', display:'flex', alignItems:'center', gap:8 }}><ListTodo size={24} /> Tasks</div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>Auto-generated from job status</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {urgentCount > 0 && <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800, background:'rgba(242,90,90,.15)', color:'#f25a5a', border:'1px solid rgba(242,90,90,.3)', display:'inline-flex', alignItems:'center', gap:4 }}><AlertCircle size={11} /> {urgentCount} urgent</span>}
          {todayCount > 0 && <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800, background:'rgba(245,158,11,.1)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.2)', display:'inline-flex', alignItems:'center', gap:4 }}><Clock size={11} /> {todayCount} today</span>}
          <button onClick={() => setShowCreate(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            <Plus size={13} /> New Task
          </button>
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

      {/* Smart task list */}
      {tasks.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text3)' }}>
          <CheckCircle2 size={32} style={{ margin:'0 auto 8px', color:'var(--text3)' }} />
          <div style={{ fontSize:14, fontWeight:700 }}>All clear! No smart tasks pending.</div>
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
                    {t.sub} · <span style={{ color: ROLE_COLOR[t.role] || '#4f7fff', fontWeight:600 }}>{t.person}</span>
                  </div>
                </div>
                <button onClick={() => setDismissed(p => new Set([...Array.from(p), t.id]))} title="Dismiss" style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', padding:4 }}><X size={13} /></button>
              </div>
            )
          })}
        </div>
      )}

      {/* Assigned Tasks from DB */}
      {filteredDbTasks.length > 0 && (
        <div style={{ marginTop:32 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:18, fontWeight:800, color:'var(--text1)' }}>Assigned Tasks</div>
            <span style={{ fontSize:11, fontWeight:700, background:'var(--surface2)', color:'var(--text3)', padding:'2px 8px', borderRadius:10 }}>{filteredDbTasks.length}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filteredDbTasks.map(t => {
              const badge = dueBadge(t.due_at)
              const roleColor = ROLE_COLOR[t.role] || '#4f7fff'
              return (
                <div key={t.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--text1)' }}>{t.title}</span>
                      {t.priority === 'high' && <span style={{ fontSize:10, fontWeight:800, color:'#f25a5a', background:'rgba(242,90,90,.1)', padding:'1px 6px', borderRadius:4 }}>HIGH</span>}
                    </div>
                    {t.description && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{t.description}</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, flexWrap:'wrap' }}>
                      {t.project?.title && (
                        <span style={{ fontSize:10, color:'var(--text3)', background:'var(--surface2)', padding:'2px 7px', borderRadius:4 }}>{t.project.title}</span>
                      )}
                      <span style={{ fontSize:10, color: roleColor, fontWeight:700 }}>{t.role?.replace('_', ' ')}</span>
                      {badge && (
                        <span style={{ fontSize:10, display:'inline-flex', alignItems:'center', gap:3, color: badge.color, background: badge.bg, padding:'2px 7px', borderRadius:4, fontWeight:700 }}>
                          <Calendar size={9} /> {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => markTaskDone(t.id)}
                    title="Mark done"
                    style={{ flexShrink:0, display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1px solid rgba(34,192,122,.3)', background:'rgba(34,192,122,.08)', color:'#22c07a', fontSize:11, fontWeight:700, cursor:'pointer' }}
                  >
                    <Check size={12} /> Done
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
