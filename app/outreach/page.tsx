'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Zap,
  Megaphone,
  FileText,
  Activity,
  Plus,
  Pencil,
  Pause,
  Play,
  Trash2,
  Send,
  ChevronDown,
  X,
  Loader2,
  Save,
} from 'lucide-react'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

type TabKey = 'sequences' | 'campaigns' | 'templates' | 'activity'

interface Sequence {
  id: string
  name: string
  trigger_type: string | null
  channel: string
  is_active: boolean
  created_at: string
}

interface Step {
  id: string
  sequence_id: string
  step_number: number
  channel: string
  delay_minutes: number
  subject: string | null
  body: string | null
}

interface Campaign {
  id: string
  name: string
  channel: string
  message_body: string | null
  subject: string | null
  recipient_count: number
  sent_count: number
  reply_count: number
  status: string
  sent_at: string | null
  created_at: string
}

interface Template {
  id: string
  name: string
  body: string
  category: string | null
}

export default function OutreachPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabKey>('sequences')
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [smsTemplates, setSmsTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  // Sequence editor
  const [editingSeq, setEditingSeq] = useState<string | null>(null)
  const [seqSteps, setSeqSteps] = useState<Step[]>([])
  const [seqName, setSeqName] = useState('')
  const [seqTrigger, setSeqTrigger] = useState('')
  const [seqChannel, setSeqChannel] = useState('sms')

  // Campaign editor
  const [showCampaignEditor, setShowCampaignEditor] = useState(false)
  const [campName, setCampName] = useState('')
  const [campChannel, setCampChannel] = useState('sms')
  const [campBody, setCampBody] = useState('')
  const [campSubject, setCampSubject] = useState('')

  // Template editor
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplBody, setTplBody] = useState('')
  const [tplCategory, setTplCategory] = useState('general')
  const [editingTplId, setEditingTplId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [seqRes, campRes, tplRes] = await Promise.all([
      supabase
        .from('email_sequences')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('created_at', { ascending: false }),
      supabase
        .from('broadcast_campaigns')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('created_at', { ascending: false }),
      supabase
        .from('sms_templates')
        .select('*')
        .eq('org_id', ORG_ID)
        .order('name'),
    ])
    if (seqRes.data) setSequences(seqRes.data)
    if (campRes.data) setCampaigns(campRes.data)
    if (tplRes.data) setSmsTemplates(tplRes.data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const openSequenceEditor = async (seq: Sequence) => {
    setEditingSeq(seq.id)
    setSeqName(seq.name)
    setSeqTrigger(seq.trigger_type || '')
    setSeqChannel(seq.channel || 'sms')
    const { data } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', seq.id)
      .order('step_number')
    setSeqSteps(data || [])
  }

  const saveSequence = async () => {
    if (!editingSeq) return
    await supabase
      .from('email_sequences')
      .update({
        name: seqName,
        trigger_type: seqTrigger,
        channel: seqChannel,
      })
      .eq('id', editingSeq)

    for (const step of seqSteps) {
      await supabase
        .from('sequence_steps')
        .update({
          channel: step.channel,
          delay_minutes: step.delay_minutes,
          subject: step.subject,
          body: step.body,
          step_number: step.step_number,
        })
        .eq('id', step.id)
    }

    setEditingSeq(null)
    fetchAll()
  }

  const toggleSequenceActive = async (seq: Sequence) => {
    await supabase
      .from('email_sequences')
      .update({ is_active: !seq.is_active })
      .eq('id', seq.id)
    fetchAll()
  }

  const addStep = async () => {
    if (!editingSeq) return
    const nextNum = seqSteps.length + 1
    const { data } = await supabase
      .from('sequence_steps')
      .insert({
        sequence_id: editingSeq,
        step_number: nextNum,
        channel: seqChannel,
        delay_minutes: nextNum === 1 ? 0 : 1440,
        body: '',
      })
      .select()
      .single()
    if (data) setSeqSteps((prev) => [...prev, data])
  }

  const deleteStep = async (stepId: string) => {
    await supabase.from('sequence_steps').delete().eq('id', stepId)
    setSeqSteps((prev) => prev.filter((s) => s.id !== stepId))
  }

  const saveCampaign = async () => {
    await supabase.from('broadcast_campaigns').insert({
      org_id: ORG_ID,
      name: campName || 'Untitled Campaign',
      channel: campChannel,
      message_body: campBody,
      subject: campSubject || null,
      status: 'draft',
    })
    setShowCampaignEditor(false)
    setCampName('')
    setCampBody('')
    setCampSubject('')
    fetchAll()
  }

  const saveTemplate = async () => {
    if (editingTplId) {
      await supabase
        .from('sms_templates')
        .update({ name: tplName, body: tplBody, category: tplCategory })
        .eq('id', editingTplId)
    } else {
      await supabase.from('sms_templates').insert({
        org_id: ORG_ID,
        name: tplName || 'Untitled',
        body: tplBody,
        category: tplCategory,
      })
    }
    setShowTemplateEditor(false)
    setEditingTplId(null)
    setTplName('')
    setTplBody('')
    fetchAll()
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('sms_templates').delete().eq('id', id)
    fetchAll()
  }

  const TABS: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'sequences', label: 'Sequences', Icon: Zap },
    { key: 'campaigns', label: 'Campaigns', Icon: Megaphone },
    { key: 'templates', label: 'Templates', Icon: FileText },
    { key: 'activity', label: 'Activity', Icon: Activity },
  ]

  const TRIGGERS = [
    { value: 'new_lead', label: 'New Lead' },
    { value: 'no_response_24h', label: '24hr No Response' },
    { value: 'job_complete', label: 'Job Complete' },
    { value: 'proposal_viewed', label: 'Proposal Viewed' },
    { value: 'missed_call', label: 'Missed Call' },
    { value: 'custom', label: 'Custom / Manual' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text1)',
    outline: 'none',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 28,
          fontWeight: 900,
          color: 'var(--text1)',
          marginBottom: 20,
        }}
      >
        Outreach Hub
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          background: 'var(--surface)',
          borderRadius: 12,
          padding: 4,
          border: '1px solid var(--border)',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              background: tab === t.key ? 'var(--card-bg)' : 'transparent',
              border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
              color: tab === t.key ? 'var(--text1)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            <t.Icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            color: 'var(--text3)',
          }}
        >
          <Loader2
            size={20}
            style={{ animation: 'spin 1s linear infinite' }}
          />
        </div>
      )}

      {/* ═══ SEQUENCES TAB ═══ */}
      {!loading && tab === 'sequences' && !editingSeq && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Automated drip sequences that run on triggers
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sequences.map((seq) => (
              <div
                key={seq.id}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text1)',
                      marginBottom: 4,
                    }}
                  >
                    {seq.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text3)',
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    <span>
                      Trigger:{' '}
                      {TRIGGERS.find((t) => t.value === seq.trigger_type)
                        ?.label || seq.trigger_type || 'None'}
                    </span>
                    <span>Channel: {seq.channel || 'SMS'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openSequenceEditor(seq)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text2)',
                    }}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => toggleSequenceActive(seq)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: seq.is_active
                        ? 'rgba(34,192,122,0.12)'
                        : 'rgba(242,90,90,0.12)',
                      border: `1px solid ${seq.is_active ? 'rgba(34,192,122,0.3)' : 'rgba(242,90,90,0.3)'}`,
                      color: seq.is_active ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {seq.is_active ? (
                      <>
                        <Pause size={11} /> Pause
                      </>
                    ) : (
                      <>
                        <Play size={11} /> Activate
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sequence Editor */}
      {!loading && tab === 'sequences' && editingSeq && (
        <div>
          <button
            onClick={() => setEditingSeq(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            &larr; Back to Sequences
          </button>

          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text3)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  Sequence Name
                </label>
                <input
                  value={seqName}
                  onChange={(e) => setSeqName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ width: 180 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text3)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  Trigger
                </label>
                <select
                  value={seqTrigger}
                  onChange={(e) => setSeqTrigger(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">None</option>
                  {TRIGGERS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: 120 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text3)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  Channel
                </label>
                <select
                  value={seqChannel}
                  onChange={(e) => setSeqChannel(e.target.value)}
                  style={selectStyle}
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {/* Steps */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {seqSteps.map((step, i) => (
                <div
                  key={step.id}
                  style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: 'var(--text1)',
                      }}
                    >
                      Step {i + 1}{' '}
                      {step.delay_minutes === 0
                        ? '- Immediate'
                        : `- ${step.delay_minutes >= 1440 ? Math.round(step.delay_minutes / 1440) + ' day(s)' : step.delay_minutes + ' min'} later`}
                    </div>
                    <button
                      onClick={() => deleteStep(step.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--red)',
                        padding: 2,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 120 }}>
                      <label
                        style={{
                          fontSize: 10,
                          color: 'var(--text3)',
                          display: 'block',
                          marginBottom: 2,
                        }}
                      >
                        Delay (min)
                      </label>
                      <input
                        type="number"
                        value={step.delay_minutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          setSeqSteps((prev) =>
                            prev.map((s) =>
                              s.id === step.id
                                ? { ...s, delay_minutes: val }
                                : s
                            )
                          )
                        }}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          fontSize: 10,
                          color: 'var(--text3)',
                          display: 'block',
                          marginBottom: 2,
                        }}
                      >
                        Subject (email only)
                      </label>
                      <input
                        value={step.subject || ''}
                        onChange={(e) =>
                          setSeqSteps((prev) =>
                            prev.map((s) =>
                              s.id === step.id
                                ? { ...s, subject: e.target.value }
                                : s
                            )
                          )
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <textarea
                    value={step.body || ''}
                    onChange={(e) =>
                      setSeqSteps((prev) =>
                        prev.map((s) =>
                          s.id === step.id
                            ? { ...s, body: e.target.value }
                            : s
                        )
                      )
                    }
                    placeholder="Message body... Use {{name}}, {{business}}"
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: 60,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text3)',
                      marginTop: 4,
                    }}
                  >
                    Variables: {'{{name}}'} {'{{business}}'} {'{{phone}}'}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'var(--surface)',
                border: '1px dashed var(--border)',
                color: 'var(--text2)',
                marginBottom: 16,
              }}
            >
              <Plus size={13} /> Add Step
            </button>

            <button
              onClick={saveSequence}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 24px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                background: 'var(--accent)',
                border: 'none',
                color: '#fff',
              }}
            >
              <Save size={14} /> Save Sequence
            </button>
          </div>
        </div>
      )}

      {/* ═══ CAMPAIGNS TAB ═══ */}
      {!loading && tab === 'campaigns' && !showCampaignEditor && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              One-time broadcast messages to customer lists
            </div>
            <button
              onClick={() => setShowCampaignEditor(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'var(--accent)',
                border: 'none',
                color: '#fff',
              }}
            >
              <Plus size={13} /> New Campaign
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: 13,
                background: 'var(--surface)',
                borderRadius: 14,
                border: '1px solid var(--border)',
              }}
            >
              No campaigns yet. Create one to blast a message to your customer
              list.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--text1)',
                        marginBottom: 4,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text3)',
                        display: 'flex',
                        gap: 12,
                      }}
                    >
                      <span>{c.channel.toUpperCase()}</span>
                      <span>
                        {c.sent_count}/{c.recipient_count} sent
                      </span>
                      <span>{c.reply_count} replies</span>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      background:
                        c.status === 'sent'
                          ? 'rgba(34,192,122,0.12)'
                          : c.status === 'draft'
                            ? 'rgba(245,158,11,0.12)'
                            : 'rgba(79,127,255,0.12)',
                      color:
                        c.status === 'sent'
                          ? 'var(--green)'
                          : c.status === 'draft'
                            ? 'var(--amber)'
                            : 'var(--accent)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaign Editor */}
      {!loading && tab === 'campaigns' && showCampaignEditor && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--text1)',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              New Campaign
            </div>
            <button
              onClick={() => setShowCampaignEditor(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text3)',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  marginBottom: 4,
                  display: 'block',
                }}
              >
                Campaign Name
              </label>
              <input
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                placeholder="Spring Promo 2026"
                style={inputStyle}
              />
            </div>
            <div style={{ width: 120 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  marginBottom: 4,
                  display: 'block',
                }}
              >
                Channel
              </label>
              <select
                value={campChannel}
                onChange={(e) => setCampChannel(e.target.value)}
                style={selectStyle}
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          {campChannel === 'email' && (
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text3)',
                  marginBottom: 4,
                  display: 'block',
                }}
              >
                Subject
              </label>
              <input
                value={campSubject}
                onChange={(e) => setCampSubject(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Message
            </label>
            <textarea
              value={campBody}
              onChange={(e) => setCampBody(e.target.value)}
              placeholder="Hey {{name}}! ..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
            {campChannel === 'sms' && (
              <div
                style={{
                  fontSize: 10,
                  color:
                    campBody.length > 160 ? 'var(--amber)' : 'var(--text3)',
                  marginTop: 4,
                }}
              >
                {campBody.length}/160 characters
                {campBody.length > 160 &&
                  ` (${Math.ceil(campBody.length / 160)} segments)`}
              </div>
            )}
          </div>

          <button
            onClick={saveCampaign}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
            }}
          >
            Save Campaign
          </button>
        </div>
      )}

      {/* ═══ TEMPLATES TAB ═══ */}
      {!loading && tab === 'templates' && !showTemplateEditor && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Reusable message templates for SMS and email
            </div>
            <button
              onClick={() => {
                setEditingTplId(null)
                setTplName('')
                setTplBody('')
                setTplCategory('general')
                setShowTemplateEditor(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'var(--accent)',
                border: 'none',
                color: '#fff',
              }}
            >
              <Plus size={13} /> New Template
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {smsTemplates.map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 12,
                  padding: '14px 18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text1)',
                    }}
                  >
                    {t.name}
                    {t.category && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--text3)',
                          marginLeft: 8,
                          padding: '2px 6px',
                          background: 'var(--surface2)',
                          borderRadius: 4,
                        }}
                      >
                        {t.category}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        setEditingTplId(t.id)
                        setTplName(t.name)
                        setTplBody(t.body)
                        setTplCategory(t.category || 'general')
                        setShowTemplateEditor(true)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text3)',
                        padding: 2,
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text3)',
                        padding: 2,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text2)',
                    lineHeight: 1.5,
                  }}
                >
                  {t.body.length > 120
                    ? t.body.substring(0, 120) + '...'
                    : t.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Editor */}
      {!loading && tab === 'templates' && showTemplateEditor && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--text1)',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}
            >
              {editingTplId ? 'Edit Template' : 'New Template'}
            </div>
            <button
              onClick={() => setShowTemplateEditor(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text3)',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Template Name
            </label>
            <input
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="New Lead Response"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Category
            </label>
            <select
              value={tplCategory}
              onChange={(e) => setTplCategory(e.target.value)}
              style={selectStyle}
            >
              <option value="lead">Lead</option>
              <option value="followup">Follow-up</option>
              <option value="design">Design</option>
              <option value="scheduling">Scheduling</option>
              <option value="completion">Completion</option>
              <option value="review">Review</option>
              <option value="payment">Payment</option>
              <option value="general">General</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text3)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Message Body
            </label>
            <textarea
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              placeholder="Hey {{name}}! ..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
            <div
              style={{
                fontSize: 10,
                color: 'var(--text3)',
                marginTop: 4,
              }}
            >
              Variables: {'{{name}}'} {'{{business}}'} {'{{vehicle}}'}{' '}
              {'{{proof_link}}'} {'{{portal_link}}'}
            </div>
          </div>

          <button
            onClick={saveTemplate}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
            }}
          >
            <Save
              size={14}
              style={{
                display: 'inline',
                verticalAlign: 'middle',
                marginRight: 5,
              }}
            />
            Save Template
          </button>
        </div>
      )}

      {/* ═══ ACTIVITY TAB ═══ */}
      {!loading && tab === 'activity' && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: 13,
            background: 'var(--surface)',
            borderRadius: 14,
            border: '1px solid var(--border)',
          }}
        >
          Activity feed coming soon. View sequence sends and campaign performance
          here.
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
