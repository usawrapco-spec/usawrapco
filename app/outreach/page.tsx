'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Zap,
  Users,
  BarChart2,
  Inbox,
  Plus,
  Pause,
  Play,
  Trash2,
  Save,
  X,
  Upload,
  Clock,
  Loader2,
  Mail,
  ArrowLeft,
  UserPlus,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Send,
} from 'lucide-react'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailSequence {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'paused'
  sequence_type: string
  enrolled_count: number
  active_count: number
  replied_count: number
  ab_test_enabled: boolean
  stop_on_reply: boolean
  mailbox_id: string | null
  created_at: string
}

interface SequenceStep {
  id: string
  sequence_id: string
  step_number: number
  step_type: 'email' | 'sms' | 'task'
  delay_days: number
  delay_hours: number
  subject_a: string | null
  body_a: string | null
  subject_b: string | null
  body_b: string | null
  sms_body: string | null
  task_title: string | null
  task_note: string | null
  condition_type: string
}

interface ContactList {
  id: string
  name: string
  description: string | null
  list_type: string
  source: string | null
  member_count: number
  created_at: string
}

interface ContactListMember {
  id: string
  list_id: string
  contact_type: string
  email: string
  name: string | null
  company: string | null
  phone: string | null
  unsubscribed: boolean
  added_at: string
}

interface SequenceEnrollment {
  id: string
  sequence_id: string
  email: string
  name: string | null
  company: string | null
  status: string
  current_step: number
  next_send_at: string | null
  enrolled_at: string
  replied_at: string | null
  sequence_name?: string
}

interface OutreachMailbox {
  id: string
  name: string
  email: string
  from_name: string
  purpose: string | null
  warmup_status: string
  daily_send_limit: number
  current_daily_sent: number
  is_default: boolean
  is_active: boolean
  resend_from: string | null
  created_at: string
}

type TabKey = 'sequences' | 'lists' | 'campaigns' | 'mailboxes'

// ─── Shared styles ───────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--text1)',
  outline: 'none',
  boxSizing: 'border-box',
}

const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }

const txa: React.CSSProperties = {
  ...inp,
  resize: 'vertical',
  minHeight: 80,
}

const lbl: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text3)',
  display: 'block',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 14,
  padding: '16px 20px',
}

const btn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  border: 'none',
}

const btnPrimary: React.CSSProperties = { ...btn, background: 'var(--accent)', color: '#fff' }
const btnGhost: React.CSSProperties = {
  ...btn,
  background: 'var(--surface2)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text2)',
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active:       ['rgba(34,192,122,0.12)',   'var(--green)'],
    draft:        ['rgba(245,158,11,0.12)',   'var(--amber)'],
    paused:       ['rgba(90,96,128,0.2)',     'var(--text3)'],
    completed:    ['rgba(34,192,122,0.12)',   'var(--green)'],
    unsubscribed: ['rgba(242,90,90,0.12)',    'var(--red)'],
    bounced:      ['rgba(242,90,90,0.12)',    'var(--red)'],
    replied:      ['rgba(79,127,255,0.12)',   'var(--accent)'],
    warmed:       ['rgba(34,192,122,0.12)',   'var(--green)'],
    warming:      ['rgba(245,158,11,0.12)',   'var(--amber)'],
    cold:         ['rgba(90,96,128,0.2)',     'var(--text3)'],
  }
  const [bg, color] = map[status] ?? map.draft
  return (
    <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.06em', background: bg, color }}>
      {status}
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabKey>('sequences')
  const [loading, setLoading] = useState(true)

  // Sequences
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [stepCounts, setStepCounts] = useState<Record<string, number>>({})
  const [editingSeq, setEditingSeq] = useState<EmailSequence | null>(null)
  const [seqSteps, setSeqSteps] = useState<SequenceStep[]>([])
  const [showNewSeq, setShowNewSeq] = useState(false)
  const [newSeqName, setNewSeqName] = useState('')
  const [newSeqDesc, setNewSeqDesc] = useState('')
  const [newSeqType, setNewSeqType] = useState('cold_outreach')
  const [showEnrollModal, setShowEnrollModal] = useState(false)

  // Contact lists
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [viewingList, setViewingList] = useState<ContactList | null>(null)
  const [listMembers, setListMembers] = useState<ContactListMember[]>([])
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDesc, setNewListDesc] = useState('')
  const [newListSource, setNewListSource] = useState('manual')
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvRows, setCsvRows] = useState<{ name: string; email: string; company: string }[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [showAddCustomers, setShowAddCustomers] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string | null }[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Campaigns / enrollments
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([])
  const [enrollFilter, setEnrollFilter] = useState('all')

  // Mailboxes
  const [mailboxes, setMailboxes] = useState<OutreachMailbox[]>([])
  const [showNewMailbox, setShowNewMailbox] = useState(false)
  const [mbName, setMbName] = useState('')
  const [mbEmail, setMbEmail] = useState('')
  const [mbFromName, setMbFromName] = useState('USA Wrap Co')
  const [mbResendFrom, setMbResendFrom] = useState('')

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSequences = useCallback(async () => {
    const [seqRes, stepRes] = await Promise.all([
      supabase.from('email_sequences').select('*').eq('org_id', ORG_ID).order('created_at', { ascending: false }),
      supabase.from('sequence_steps').select('sequence_id'),
    ])
    if (seqRes.data) setSequences(seqRes.data as EmailSequence[])
    if (stepRes.data) {
      const counts: Record<string, number> = {}
      stepRes.data.forEach((s: { sequence_id: string }) => {
        counts[s.sequence_id] = (counts[s.sequence_id] || 0) + 1
      })
      setStepCounts(counts)
    }
  }, [supabase])

  const fetchContactLists = useCallback(async () => {
    const { data } = await supabase.from('contact_lists').select('*').eq('org_id', ORG_ID).order('created_at', { ascending: false })
    if (data) setContactLists(data as ContactList[])
  }, [supabase])

  const fetchEnrollments = useCallback(async () => {
    const { data } = await supabase
      .from('sequence_enrollments')
      .select('*, sequence:sequence_id(name)')
      .eq('org_id', ORG_ID)
      .order('enrolled_at', { ascending: false })
      .limit(200)
    if (data) {
      setEnrollments(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((e: any) => ({ ...e, sequence_name: e.sequence?.name ?? '—' }))
      )
    }
  }, [supabase])

  const fetchMailboxes = useCallback(async () => {
    const { data } = await supabase.from('outreach_mailboxes').select('*').eq('org_id', ORG_ID).order('created_at')
    if (data) setMailboxes(data as OutreachMailbox[])
  }, [supabase])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      await Promise.all([fetchSequences(), fetchContactLists(), fetchEnrollments(), fetchMailboxes()])
      setLoading(false)
    }
    run()
  }, [fetchSequences, fetchContactLists, fetchEnrollments, fetchMailboxes])

  // ─── Sequence actions ────────────────────────────────────────────────────────

  const openSeqEditor = async (seq: EmailSequence) => {
    setEditingSeq(seq)
    const { data } = await supabase.from('sequence_steps').select('*').eq('sequence_id', seq.id).order('step_number')
    setSeqSteps((data as SequenceStep[]) || [])
  }

  const createSequence = async () => {
    if (!newSeqName.trim()) return
    const { data } = await supabase
      .from('email_sequences')
      .insert({ org_id: ORG_ID, name: newSeqName.trim(), description: newSeqDesc || null, sequence_type: newSeqType, status: 'draft' })
      .select().single()
    setShowNewSeq(false); setNewSeqName(''); setNewSeqDesc(''); setNewSeqType('cold_outreach')
    await fetchSequences()
    if (data) openSeqEditor(data as EmailSequence)
  }

  const saveSeqSettings = async () => {
    if (!editingSeq) return
    await supabase.from('email_sequences')
      .update({ name: editingSeq.name, description: editingSeq.description, stop_on_reply: editingSeq.stop_on_reply, ab_test_enabled: editingSeq.ab_test_enabled })
      .eq('id', editingSeq.id)
  }

  const setSeqStatus = async (seqId: string, status: 'active' | 'paused' | 'draft') => {
    await supabase.from('email_sequences').update({ status, is_active: status === 'active' }).eq('id', seqId)
    await fetchSequences()
    if (editingSeq?.id === seqId) setEditingSeq((p) => p ? { ...p, status } : p)
  }

  const addStep = async () => {
    if (!editingSeq) return
    const nextNum = seqSteps.length + 1
    const { data } = await supabase.from('sequence_steps')
      .insert({ sequence_id: editingSeq.id, step_number: nextNum, step_type: 'email', delay_days: nextNum === 1 ? 0 : 2, delay_hours: 0, condition_type: 'always' })
      .select().single()
    if (data) setSeqSteps((prev) => [...prev, data as SequenceStep])
  }

  const updateStep = (id: string, patch: Partial<SequenceStep>) =>
    setSeqSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const saveStep = async (step: SequenceStep) => {
    await supabase.from('sequence_steps').upsert(step)
  }

  const deleteStep = async (stepId: string) => {
    await supabase.from('sequence_steps').delete().eq('id', stepId)
    setSeqSteps((prev) => prev.filter((s) => s.id !== stepId))
  }

  const enrollContacts = async (listId: string) => {
    if (!editingSeq) return
    const { data: members } = await supabase.from('contact_list_members').select('*').eq('list_id', listId).eq('unsubscribed', false)
    if (!members || members.length === 0) return
    const rows = (members as ContactListMember[]).map((m) => ({
      sequence_id: editingSeq.id, org_id: ORG_ID, contact_type: m.contact_type || 'manual',
      contact_list_member_id: m.id, email: m.email, name: m.name, company: m.company,
      status: 'active', current_step: 1, next_send_at: new Date().toISOString(),
    }))
    await supabase.from('sequence_enrollments').insert(rows)
    await supabase.from('email_sequences').update({ enrolled_count: (editingSeq.enrolled_count || 0) + rows.length }).eq('id', editingSeq.id)
    setShowEnrollModal(false)
    await fetchSequences()
  }

  // ─── Contact list actions ────────────────────────────────────────────────────

  const openList = async (list: ContactList) => {
    setViewingList(list)
    const { data } = await supabase.from('contact_list_members').select('*').eq('list_id', list.id).order('added_at', { ascending: false })
    setListMembers((data as ContactListMember[]) || [])
  }

  const createList = async () => {
    if (!newListName.trim()) return
    await supabase.from('contact_lists').insert({ org_id: ORG_ID, name: newListName.trim(), description: newListDesc || null, list_type: newListSource === 'manual' ? 'manual' : 'imported', source: newListSource })
    setShowNewList(false); setNewListName(''); setNewListDesc(''); setNewListSource('manual')
    await fetchContactLists()
  }

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) return
      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''))
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = vals[i] || '' })
        const name = obj.name || obj['full name'] || `${obj.first_name || ''} ${obj.last_name || ''}`.trim()
        return { name, email: obj.email || obj['e-mail'] || '', company: obj.company || obj.organization || '' }
      })
      setCsvRows(rows.filter((r) => r.email))
    }
    reader.readAsText(file)
  }

  const importCsv = async () => {
    if (!viewingList || csvRows.length === 0) return
    setCsvImporting(true)
    const rows = csvRows.map((r) => ({ list_id: viewingList.id, contact_type: 'manual', email: r.email, name: r.name || null, company: r.company || null }))
    await supabase.from('contact_list_members').insert(rows)
    await supabase.from('contact_lists').update({ member_count: (viewingList.member_count || 0) + rows.length }).eq('id', viewingList.id)
    setCsvRows([]); setShowCsvImport(false); setCsvImporting(false)
    if (fileRef.current) fileRef.current.value = ''
    await openList(viewingList); await fetchContactLists()
  }

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name, email').eq('org_id', ORG_ID).order('name').limit(200)
    setCustomers((data || []) as { id: string; name: string; email: string | null }[])
    setShowAddCustomers(true)
  }

  const addCustomersToList = async () => {
    if (!viewingList || selectedCustomers.length === 0) return
    const selected = customers.filter((c) => selectedCustomers.includes(c.id) && c.email)
    const rows = selected.map((c) => ({ list_id: viewingList.id, contact_type: 'customer', customer_id: c.id, email: c.email!, name: c.name }))
    await supabase.from('contact_list_members').insert(rows)
    await supabase.from('contact_lists').update({ member_count: (viewingList.member_count || 0) + rows.length }).eq('id', viewingList.id)
    setSelectedCustomers([]); setShowAddCustomers(false)
    await openList(viewingList); await fetchContactLists()
  }

  const removeMember = async (memberId: string) => {
    await supabase.from('contact_list_members').delete().eq('id', memberId)
    setListMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  // ─── Enrollment actions ──────────────────────────────────────────────────────

  const unenroll = async (id: string) => {
    await supabase.from('sequence_enrollments').update({ status: 'unsubscribed', completed_at: new Date().toISOString() }).eq('id', id)
    await fetchEnrollments()
  }

  const togglePause = async (id: string, currentStatus: string) => {
    await supabase.from('sequence_enrollments').update({ status: currentStatus === 'paused' ? 'active' : 'paused' }).eq('id', id)
    await fetchEnrollments()
  }

  // ─── Mailbox actions ─────────────────────────────────────────────────────────

  const createMailbox = async () => {
    if (!mbEmail.trim()) return
    await supabase.from('outreach_mailboxes').insert({ org_id: ORG_ID, name: mbName || mbEmail, email: mbEmail.trim(), from_name: mbFromName || 'USA Wrap Co', resend_from: mbResendFrom || null, warmup_status: 'cold', daily_send_limit: 20 })
    setShowNewMailbox(false); setMbName(''); setMbEmail(''); setMbFromName('USA Wrap Co'); setMbResendFrom('')
    await fetchMailboxes()
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filteredEnrollments = enrollments.filter((e) => enrollFilter === 'all' || e.status === enrollFilter)

  const TABS: { key: TabKey; label: string; Icon: React.ElementType }[] = [
    { key: 'sequences', label: 'Sequences', Icon: Zap },
    { key: 'lists',     label: 'Contact Lists', Icon: Users },
    { key: 'campaigns', label: 'Active Campaigns', Icon: BarChart2 },
    { key: 'mailboxes', label: 'Mailboxes', Icon: Inbox },
  ]

  const SEQ_TYPES = [
    { value: 'cold_outreach', label: 'Prospect (Cold Outreach)' },
    { value: 'nurture',       label: 'Nurture' },
    { value: 'reactivation',  label: 'Reactivate' },
    { value: 'follow_up',     label: 'Follow-Up' },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', marginBottom: 20 }}>
        Outreach Hub
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: tab === t.key ? 'var(--surface2)' : 'transparent',
            border: tab === t.key ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
            color: tab === t.key ? 'var(--text1)' : 'var(--text3)' }}>
            <t.Icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text3)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* ══════════════════════ TAB 1 — SEQUENCES ══════════════════════ */}
      {!loading && tab === 'sequences' && !editingSeq && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{sequences.length} sequence{sequences.length !== 1 ? 's' : ''}</div>
            <button style={btnPrimary} onClick={() => setShowNewSeq(true)}><Plus size={13} /> New Sequence</button>
          </div>

          {showNewSeq && (
            <div style={{ ...card, marginBottom: 16, borderColor: 'rgba(79,127,255,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>New Sequence</div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }} onClick={() => setShowNewSeq(false)}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>Name</label>
                  <input value={newSeqName} onChange={(e) => setNewSeqName(e.target.value)} placeholder="e.g. New Lead Follow-Up" style={inp} autoFocus />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Goal</label>
                  <select value={newSeqType} onChange={(e) => setNewSeqType(e.target.value)} style={sel}>
                    {SEQ_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Description (optional)</label>
                <input value={newSeqDesc} onChange={(e) => setNewSeqDesc(e.target.value)} placeholder="What's this sequence for?" style={inp} />
              </div>
              <button style={btnPrimary} onClick={createSequence}><Save size={13} /> Create &amp; Edit Steps</button>
            </div>
          )}

          {sequences.length === 0 && !showNewSeq && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)' }}>
              No sequences yet. Create one to start automating outreach.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sequences.map((seq) => {
              const replyRate = seq.enrolled_count > 0 ? Math.round((seq.replied_count / seq.enrolled_count) * 100) : 0
              return (
                <div key={seq.id} style={{ ...card, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => openSeqEditor(seq)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{seq.name}</div>
                      <Badge status={seq.status} />
                    </div>
                    {seq.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>{seq.description}</div>}
                    <div style={{ display: 'flex', gap: 18, fontSize: 11, color: 'var(--text3)' }}>
                      <span><strong style={{ color: 'var(--text2)' }}>{stepCounts[seq.id] || 0}</strong> steps</span>
                      <span><strong style={{ color: 'var(--text2)' }}>{seq.enrolled_count}</strong> enrolled</span>
                      <span><strong style={{ color: 'var(--text2)' }}>{seq.active_count}</strong> active</span>
                      <span><strong style={{ color: replyRate > 0 ? 'var(--green)' : 'var(--text2)' }}>{replyRate}%</strong> reply rate</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      style={{ ...btn, padding: '6px 10px',
                        background: seq.status === 'active' ? 'rgba(34,192,122,0.1)' : 'rgba(79,127,255,0.1)',
                        border: `1px solid ${seq.status === 'active' ? 'rgba(34,192,122,0.25)' : 'rgba(79,127,255,0.25)'}`,
                        color: seq.status === 'active' ? 'var(--green)' : 'var(--accent)' }}
                      onClick={() => setSeqStatus(seq.id, seq.status === 'active' ? 'paused' : 'active')}>
                      {seq.status === 'active' ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Activate</>}
                    </button>
                    <ChevronRight size={16} style={{ color: 'var(--text3)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ SEQUENCE EDITOR ══ */}
      {!loading && tab === 'sequences' && editingSeq && (
        <div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={async () => { await saveSeqSettings(); setEditingSeq(null); setSeqSteps([]); await fetchSequences() }}>
            <ArrowLeft size={13} /> Back to Sequences
          </button>

          {/* Settings */}
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 2 }}>
                <label style={lbl}>Sequence Name</label>
                <input value={editingSeq.name} onChange={(e) => setEditingSeq((p) => p ? { ...p, name: e.target.value } : p)} style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Status</label>
                <select value={editingSeq.status} onChange={(e) => setSeqStatus(editingSeq.id, e.target.value as EmailSequence['status'])} style={sel}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Description</label>
              <input value={editingSeq.description || ''} onChange={(e) => setEditingSeq((p) => p ? { ...p, description: e.target.value } : p)} placeholder="Optional description" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)' }}
                onClick={() => setEditingSeq((p) => p ? { ...p, stop_on_reply: !p.stop_on_reply } : p)}>
                {editingSeq.stop_on_reply ? <ToggleRight size={20} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={20} style={{ color: 'var(--text3)' }} />}
                Stop on reply
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)' }}
                onClick={() => setEditingSeq((p) => p ? { ...p, ab_test_enabled: !p.ab_test_enabled } : p)}>
                {editingSeq.ab_test_enabled ? <ToggleRight size={20} style={{ color: 'var(--accent)' }} /> : <ToggleLeft size={20} style={{ color: 'var(--text3)' }} />}
                A/B testing
              </button>
            </div>
          </div>

          {/* Steps timeline */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Email Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 12 }}>
            {seqSteps.map((step, i) => (
              <div key={step.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: i > 0 ? 12 : 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                  <Clock size={12} style={{ color: 'var(--text3)' }} />
                  {step.delay_days === 0 && step.delay_hours === 0
                    ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>Immediately</span>
                    : <span style={{ fontSize: 12, color: 'var(--text2)' }}>{step.delay_days > 0 && `${step.delay_days}d `}{step.delay_hours > 0 && `${step.delay_hours}h `}after previous</span>}
                </div>
                <div style={{ ...card, marginLeft: 36, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
                    <div style={{ width: 100 }}>
                      <label style={lbl}>Type</label>
                      <select value={step.step_type} onChange={(e) => updateStep(step.id, { step_type: e.target.value as SequenceStep['step_type'] })} style={sel}>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="task">Task</option>
                      </select>
                    </div>
                    <div style={{ width: 80 }}>
                      <label style={lbl}>Days</label>
                      <input type="number" min={0} value={step.delay_days} onChange={(e) => updateStep(step.id, { delay_days: parseInt(e.target.value) || 0 })} style={inp} />
                    </div>
                    <div style={{ width: 80 }}>
                      <label style={lbl}>Hours</label>
                      <input type="number" min={0} max={23} value={step.delay_hours} onChange={(e) => updateStep(step.id, { delay_hours: parseInt(e.target.value) || 0 })} style={inp} />
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button style={{ ...btnPrimary, padding: '6px 12px' }} onClick={() => saveStep(step)}><Save size={11} /> Save</button>
                      <button style={{ ...btn, padding: '6px 10px', background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)', color: 'var(--red)' }} onClick={() => deleteStep(step.id)}><Trash2 size={11} /></button>
                    </div>
                  </div>

                  {step.step_type === 'email' && (
                    <div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={lbl}>Subject{editingSeq.ab_test_enabled ? ' — Variant A' : ''}</label>
                        <input value={step.subject_a || ''} onChange={(e) => updateStep(step.id, { subject_a: e.target.value })} placeholder="Subject line..." style={inp} />
                      </div>
                      <div style={{ marginBottom: editingSeq.ab_test_enabled ? 10 : 0 }}>
                        <label style={lbl}>Body{editingSeq.ab_test_enabled ? ' — Variant A' : ''}</label>
                        <textarea value={step.body_a || ''} onChange={(e) => updateStep(step.id, { body_a: e.target.value })} placeholder="Email body... Use {{first_name}}, {{company}}, {{vehicle}}" style={txa} rows={4} />
                      </div>
                      {editingSeq.ab_test_enabled && (
                        <>
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ ...lbl, color: 'var(--amber)' }}>Subject — Variant B</label>
                            <input value={step.subject_b || ''} onChange={(e) => updateStep(step.id, { subject_b: e.target.value })} placeholder="Alternate subject..." style={inp} />
                          </div>
                          <div>
                            <label style={{ ...lbl, color: 'var(--amber)' }}>Body — Variant B</label>
                            <textarea value={step.body_b || ''} onChange={(e) => updateStep(step.id, { body_b: e.target.value })} placeholder="Alternate body..." style={txa} rows={4} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {step.step_type === 'sms' && (
                    <div>
                      <label style={lbl}>SMS Body</label>
                      <textarea value={step.sms_body || ''} onChange={(e) => updateStep(step.id, { sms_body: e.target.value })} placeholder="Message... Use {{first_name}}, {{company}}" style={txa} rows={3} />
                      <div style={{ fontSize: 10, color: (step.sms_body?.length || 0) > 160 ? 'var(--amber)' : 'var(--text3)', marginTop: 4 }}>
                        {step.sms_body?.length || 0}/160 chars
                      </div>
                    </div>
                  )}

                  {step.step_type === 'task' && (
                    <div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={lbl}>Task Title</label>
                        <input value={step.task_title || ''} onChange={(e) => updateStep(step.id, { task_title: e.target.value })} placeholder="Call prospect..." style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Task Note</label>
                        <textarea value={step.task_note || ''} onChange={(e) => updateStep(step.id, { task_note: e.target.value })} placeholder="Additional context..." style={txa} rows={2} />
                      </div>
                    </div>
                  )}

                  {step.step_type !== 'task' && (
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8 }}>
                      Variables: {['{{first_name}}', '{{company}}', '{{vehicle}}'].map((v) => (
                        <code key={v} style={{ background: 'var(--surface2)', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>{v}</code>
                      ))}
                    </div>
                  )}
                </div>
                {i < seqSteps.length - 1 && <div style={{ marginLeft: 49, width: 2, height: 12, background: 'rgba(255,255,255,0.06)' }} />}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button style={{ ...btn, background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text2)' }} onClick={addStep}><Plus size={13} /> Add Step</button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={async () => { await saveSeqSettings(); await setSeqStatus(editingSeq.id, 'active') }}><Play size={13} /> Activate Sequence</button>
            <button style={btnGhost} onClick={() => setShowEnrollModal(true)}><UserPlus size={13} /> Enroll Contacts</button>
          </div>

          {/* Enroll modal */}
          {showEnrollModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowEnrollModal(false)}>
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: 400, maxHeight: '60vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', marginBottom: 16 }}>Enroll Contacts from List</div>
                {contactLists.length === 0
                  ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>No contact lists yet. Create one in the Contact Lists tab.</div>
                  : contactLists.map((list) => (
                    <div key={list.id} style={{ ...card, marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => enrollContacts(list.id)}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{list.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{list.member_count} contacts</div>
                      </div>
                      <Send size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ TAB 2 — CONTACT LISTS ══════════════════════ */}
      {!loading && tab === 'lists' && !viewingList && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{contactLists.length} list{contactLists.length !== 1 ? 's' : ''}</div>
            <button style={btnPrimary} onClick={() => setShowNewList(true)}><Plus size={13} /> New List</button>
          </div>

          {showNewList && (
            <div style={{ ...card, marginBottom: 16, borderColor: 'rgba(79,127,255,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>New Contact List</div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }} onClick={() => setShowNewList(false)}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>List Name</label>
                  <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. Q1 Prospects" style={inp} autoFocus />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Source</label>
                  <select value={newListSource} onChange={(e) => setNewListSource(e.target.value)} style={sel}>
                    <option value="manual">Manual</option>
                    <option value="imported">Imported</option>
                    <option value="customers">Customers</option>
                    <option value="leads">Leads</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Description (optional)</label>
                <input value={newListDesc} onChange={(e) => setNewListDesc(e.target.value)} placeholder="What is this list for?" style={inp} />
              </div>
              <button style={btnPrimary} onClick={createList}><Save size={13} /> Create List</button>
            </div>
          )}

          {contactLists.length === 0 && !showNewList && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)' }}>
              No contact lists yet. Create one to manage your outreach contacts.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contactLists.map((list) => (
              <div key={list.id} style={{ ...card, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => openList(list)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>{list.name}</div>
                  {list.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{list.description}</div>}
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text3)' }}>
                    <span><strong style={{ color: 'var(--text2)' }}>{list.member_count}</strong> contacts</span>
                    <span style={{ textTransform: 'capitalize' }}>{list.source || list.list_type}</span>
                    <span>{new Date(list.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text3)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ LIST MEMBERS ══ */}
      {!loading && tab === 'lists' && viewingList && (
        <div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => { setViewingList(null); setListMembers([]) }}>
            <ArrowLeft size={13} /> Back to Lists
          </button>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 4 }}>{viewingList.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{listMembers.length} contact{listMembers.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button style={btnGhost} onClick={() => setShowCsvImport(true)}><Upload size={13} /> Import CSV</button>
            <button style={btnGhost} onClick={loadCustomers}><UserPlus size={13} /> Add from Customers</button>
          </div>

          {showCsvImport && (
            <div style={{ ...card, marginBottom: 16, borderColor: 'rgba(79,127,255,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Import CSV</div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }} onClick={() => { setShowCsvImport(false); setCsvRows([]) }}><X size={14} /></button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>CSV columns: <code>name, email, company</code> (email required)</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvFile} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }} />
              {csvRows.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>{csvRows.length} valid rows found</div>
                  {csvRows.slice(0, 3).map((r, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text3)' }}>{r.name || '(no name)'} — {r.email}</div>)}
                  {csvRows.length > 3 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>...and {csvRows.length - 3} more</div>}
                  <button style={{ ...btnPrimary, marginTop: 12 }} onClick={importCsv} disabled={csvImporting}>
                    {csvImporting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
                    Import {csvRows.length} contacts
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Add from Customers modal */}
          {showAddCustomers && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddCustomers(false)}>
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: 460, maxHeight: '70vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', marginBottom: 4 }}>Add from Customers</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>Only customers with an email address are shown.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {customers.filter((c) => c.email).map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: selectedCustomers.includes(c.id) ? 'rgba(79,127,255,0.12)' : 'var(--surface2)', cursor: 'pointer', fontSize: 13, color: 'var(--text1)' }}>
                      <input type="checkbox" checked={selectedCustomers.includes(c.id)} onChange={(e) => setSelectedCustomers((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <button style={btnPrimary} onClick={addCustomersToList} disabled={selectedCustomers.length === 0}><UserPlus size={13} /> Add {selectedCustomers.length} Selected</button>
              </div>
            </div>
          )}

          {listMembers.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.07)' }}>No contacts yet. Import a CSV or add from Customers.</div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: 'var(--text2)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>
                      {['Name', 'Email', 'Company', 'Type', 'Status', ''].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listMembers.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--text1)', fontWeight: 600 }}>{m.name || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>{m.email}</td>
                        <td style={{ padding: '10px 12px' }}>{m.company || '—'}</td>
                        <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{m.contact_type}</td>
                        <td style={{ padding: '10px 12px' }}><Badge status={m.unsubscribed ? 'unsubscribed' : 'active'} /></td>
                        <td style={{ padding: '10px 12px' }}>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }} onClick={() => removeMember(m.id)}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ══════════════════════ TAB 3 — ACTIVE CAMPAIGNS ══════════════════════ */}
      {!loading && tab === 'campaigns' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{filteredEnrollments.length} enrollment{filteredEnrollments.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'active', 'completed', 'paused', 'unsubscribed', 'bounced'].map((f) => (
                <button key={f} style={{ ...btn, padding: '5px 10px', fontSize: 10, textTransform: 'capitalize',
                  background: enrollFilter === f ? 'var(--accent)' : 'var(--surface2)',
                  border: enrollFilter === f ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: enrollFilter === f ? '#fff' : 'var(--text3)' }}
                  onClick={() => setEnrollFilter(f)}>{f}</button>
              ))}
            </div>
          </div>

          {filteredEnrollments.length === 0
            ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)' }}>
                No{enrollFilter !== 'all' ? ` ${enrollFilter}` : ''} enrollments.{enrollFilter === 'all' && ' Enroll contacts from the Sequences tab.'}
              </div>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: 'var(--text2)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>
                      {['Contact', 'Sequence', 'Step', 'Next Send', 'Status', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrollments.map((e) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text1)' }}>{e.name || e.email}</div>
                          {e.name && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{e.email}</div>}
                          {e.company && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{e.company}</div>}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{e.sequence_name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ background: 'rgba(79,127,255,0.12)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 6, fontWeight: 800, fontSize: 11 }}>{e.current_step}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 11 }}>
                          {e.next_send_at
                            ? new Date(e.next_send_at) <= new Date()
                              ? <span style={{ color: 'var(--green)' }}>Now</span>
                              : new Date(e.next_send_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}><Badge status={e.replied_at ? 'replied' : e.status} /></td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {e.status !== 'completed' && e.status !== 'unsubscribed' && (
                              <button style={{ ...btn, padding: '4px 8px', fontSize: 10, background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text3)' }} onClick={() => togglePause(e.id, e.status)}>
                                {e.status === 'paused' ? <Play size={10} /> : <Pause size={10} />}
                              </button>
                            )}
                            {e.status !== 'unsubscribed' && (
                              <button style={{ ...btn, padding: '4px 8px', fontSize: 10, background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)', color: 'var(--red)' }} onClick={() => unenroll(e.id)}><X size={10} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ══════════════════════ TAB 4 — MAILBOXES ══════════════════════ */}
      {!loading && tab === 'mailboxes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Connected sending addresses</div>
            <button style={btnPrimary} onClick={() => setShowNewMailbox(true)}><Plus size={13} /> Add Mailbox</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {mailboxes.map((mb) => (
              <div key={mb.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {mb.name}
                      {mb.is_default && <span style={{ fontSize: 9, background: 'rgba(79,127,255,0.15)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>DEFAULT</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)' }}>{mb.from_name} &lt;{mb.email}&gt;</div>
                    {mb.resend_from && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Resend: {mb.resend_from}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Badge status={mb.warmup_status} />
                    <Badge status={mb.is_active ? 'active' : 'paused'} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Sent Today', value: mb.current_daily_sent },
                    { label: 'Daily Limit', value: mb.daily_send_limit },
                    { label: 'Utilization', value: mb.daily_send_limit > 0 ? `${Math.round((mb.current_daily_sent / mb.daily_send_limit) * 100)}%` : '—' },
                    { label: 'Purpose', value: mb.purpose || 'outbound' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showNewMailbox && (
            <div style={{ ...card, borderColor: 'rgba(79,127,255,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Connect New Mailbox</div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }} onClick={() => setShowNewMailbox(false)}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Display Name</label>
                  <input value={mbName} onChange={(e) => setMbName(e.target.value)} placeholder="Shop Outreach" style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>From Name</label>
                  <input value={mbFromName} onChange={(e) => setMbFromName(e.target.value)} placeholder="USA Wrap Co" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Email Address</label>
                  <input value={mbEmail} onChange={(e) => setMbEmail(e.target.value)} placeholder="outreach@yourdomain.com" type="email" style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Resend Domain (optional)</label>
                  <input value={mbResendFrom} onChange={(e) => setMbResendFrom(e.target.value)} placeholder="outreach@resend.dev" style={inp} />
                </div>
              </div>
              <button style={btnPrimary} onClick={createMailbox}><Mail size={13} /> Add Mailbox</button>
            </div>
          )}

          {mailboxes.length === 0 && !showNewMailbox && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13, background: 'var(--surface)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)' }}>
              No mailboxes connected. Add one to start sending outreach emails.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } input[type=number]::-webkit-inner-spin-button { opacity: 0.4 }`}</style>
    </div>
  )
}
