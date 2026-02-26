'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  FileBarChart, Plus, X, Clock, ArrowLeft, Check, ChevronDown, ChevronUp,
  AlertCircle, Wrench, Package, Flame, ClipboardList, ShieldCheck,
} from 'lucide-react'

const REPORT_TYPES = [
  { value: 'daily_summary', label: 'Daily Summary', icon: ClipboardList, color: 'var(--accent)' },
  { value: 'inventory_check', label: 'Inventory Check', icon: Package, color: 'var(--purple)' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'var(--amber)' },
  { value: 'incident', label: 'Incident', icon: AlertCircle, color: 'var(--red)' },
  { value: 'equipment', label: 'Equipment', icon: Wrench, color: 'var(--cyan)' },
]

interface ShopReport {
  id: string
  submitted_by: string
  report_type: string
  title: string
  content: any
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  submitter?: { id: string; name: string }
  reviewer?: { id: string; name: string }
}

export default function InstallReportsClient({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const [reports, setReports] = useState<ShopReport[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('daily_summary')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)

  const loadReports = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shop_reports')
      .select('id, submitted_by, report_type, title, content, status, reviewed_by, reviewed_at, created_at')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(50)

    const rows = data || []

    if (rows.length > 0) {
      const userIds = [...new Set([
        ...rows.map(r => r.submitted_by),
        ...rows.map(r => r.reviewed_by).filter(Boolean),
      ])]
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      setReports(rows.map(r => ({
        ...r,
        submitter: profileMap[r.submitted_by],
        reviewer: r.reviewed_by ? profileMap[r.reviewed_by] : undefined,
      })))
    } else {
      setReports([])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadReports() }, [loadReports])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!formTitle.trim()) return
    setSaving(true)
    await supabase.from('shop_reports').insert({
      org_id: ORG_ID,
      submitted_by: profile.id,
      report_type: formType,
      title: formTitle.trim(),
      content: { text: formContent },
      status: 'submitted',
    })
    setSaving(false)
    setShowForm(false)
    setFormTitle('')
    setFormType('daily_summary')
    setFormContent('')
    loadReports()
  }

  const handleMarkReviewed = async (id: string) => {
    await supabase.from('shop_reports').update({
      status: 'reviewed',
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    loadReports()
  }

  const getReportTypeInfo = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type) || { label: type, icon: ClipboardList, color: 'var(--text2)' }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      submitted: { bg: 'rgba(245,158,11,0.15)', text: 'var(--amber)' },
      reviewed: { bg: 'rgba(34,192,122,0.15)', text: 'var(--green)' },
    }
    const c = colors[status] || { bg: 'var(--surface2)', text: 'var(--text2)' }
    return <span style={{ background: c.bg, color: c.text, padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{status}</span>
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/install" style={{ color: 'var(--text3)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text1)', margin: 0 }}>
              <FileBarChart size={22} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--amber)' }} />
              Shop Reports
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: '2px 0 0' }}>Daily summaries, incident reports, and equipment logs</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: '8px 18px', background: showForm ? 'var(--surface2)' : 'var(--accent)', color: showForm ? 'var(--text2)' : '#fff', border: showForm ? '1px solid var(--border)' : 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> New Report</>}
        </button>
      </div>

      {/* New Report Form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text1)', margin: '0 0 16px' }}>New Report</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Report Type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {REPORT_TYPES.map(rt => {
                  const Icon = rt.icon
                  const isActive = formType === rt.value
                  return (
                    <button key={rt.value} onClick={() => setFormType(rt.value)} style={{
                      padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: isActive ? `${rt.color}20` : 'var(--surface2)',
                      color: isActive ? rt.color : 'var(--text2)',
                      border: isActive ? `1px solid ${rt.color}` : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Icon size={14} /> {rt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Title</label>
              <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Report title..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Content</label>
              <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Write your report..." rows={6} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSubmit} disabled={saving || !formTitle.trim()} style={{ padding: '9px 24px', background: !formTitle.trim() ? 'var(--surface2)' : 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <Clock size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} /> Loading reports...
        </div>
      ) : reports.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          No reports found. Click &quot;New Report&quot; to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map(report => {
            const isExpanded = expanded.has(report.id)
            const typeInfo = getReportTypeInfo(report.report_type)
            const TypeIcon = typeInfo.icon
            const contentText = typeof report.content === 'object' ? (report.content.text || JSON.stringify(report.content)) : String(report.content || '')

            return (
              <div key={report.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleExpand(report.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${typeInfo.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: typeInfo.color }}>
                        <TypeIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 14 }}>{report.title}</div>
                        <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                          {report.submitter?.name || 'Unknown'} &middot; {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ background: `${typeInfo.color}15`, color: typeInfo.color, padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
                        {typeInfo.label}
                      </span>
                      {statusBadge(report.status)}
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)' }} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ marginTop: 12, background: 'var(--surface2)', borderRadius: 8, padding: '12px 16px' }}>
                      <p style={{ color: 'var(--text1)', fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {contentText || 'No content'}
                      </p>
                    </div>

                    {report.reviewer && (
                      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={14} style={{ color: 'var(--green)' }} />
                        Reviewed by {report.reviewer.name} on {report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : 'N/A'}
                      </div>
                    )}

                    {report.status === 'submitted' && (
                      <div style={{ marginTop: 12 }}>
                        <button onClick={() => handleMarkReviewed(report.id)} style={{ padding: '7px 16px', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={14} /> Mark as Reviewed
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
