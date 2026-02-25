'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { MessageSquare, Plus, Trash2, Pencil, X, Save, Copy, Check } from 'lucide-react'

interface SmsTemplate {
  id: string
  org_id: string
  name: string
  body: string
  created_at: string
}

interface Props {
  profile: Profile
  templates: SmsTemplate[]
}

const VARIABLES = [
  { token: '{{contact_name}}', label: 'Contact Name' },
  { token: '{{company_name}}', label: 'Company Name' },
  { token: '{{job_title}}', label: 'Job Title' },
  { token: '{{agent_name}}', label: 'Agent Name' },
]

export default function SmsTemplatesClient({ profile, templates: initialTemplates }: Props) {
  const supabase = createClient()
  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  const [templates, setTemplates] = useState(initialTemplates)
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [formName, setFormName] = useState('')
  const [formBody, setFormBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const startEdit = (tmpl: SmsTemplate) => {
    setEditingTemplate(tmpl)
    setFormName(tmpl.name)
    setFormBody(tmpl.body)
    setIsNew(false)
  }

  const startNew = () => {
    setEditingTemplate(null)
    setFormName('')
    setFormBody('')
    setIsNew(true)
  }

  const cancelEdit = () => {
    setEditingTemplate(null)
    setIsNew(false)
  }

  const insertVariable = (token: string) => {
    setFormBody((prev) => prev + token)
  }

  const saveTemplate = async () => {
    if (!formName.trim() || !formBody.trim()) return
    setSaving(true)

    if (editingTemplate) {
      const { data } = await supabase
        .from('sms_templates')
        .update({ name: formName.trim(), body: formBody.trim() })
        .eq('id', editingTemplate.id)
        .select()
        .single()
      if (data) setTemplates((prev) => prev.map((t) => (t.id === data.id ? data : t)))
    } else {
      const { data } = await supabase
        .from('sms_templates')
        .insert({ org_id: orgId, name: formName.trim(), body: formBody.trim() })
        .select()
        .single()
      if (data) setTemplates((prev) => [...prev, data])
    }

    setSaving(false)
    cancelEdit()
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('sms_templates').delete().eq('id', id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const copyBody = (id: string, body: string) => {
    navigator.clipboard.writeText(body)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const sectionStyle = {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    border: '1px solid var(--border)',
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text1)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text2)',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <MessageSquare size={22} style={{ color: 'var(--accent)' }} />
        <h1
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: 22,
            color: 'var(--text1)',
            margin: 0,
          }}
        >
          SMS Templates
        </h1>
      </div>

      {/* How variables work */}
      <div style={{ ...sectionStyle, background: 'rgba(79,127,255,0.06)', border: '1px solid rgba(79,127,255,0.2)' }}>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
          Use merge tags to personalize messages. Available variables:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {VARIABLES.map((v) => (
            <span
              key={v.token}
              style={{
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(79,127,255,0.12)',
                color: 'var(--accent)',
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid rgba(79,127,255,0.25)',
              }}
            >
              {v.token}
            </span>
          ))}
        </div>
      </div>

      {/* Template list */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
            Templates ({templates.length})
          </span>
          {!isNew && !editingTemplate && (
            <button
              onClick={startNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--accent)',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              New Template
            </button>
          )}
        </div>

        {/* Inline edit / new form */}
        {(isNew || editingTemplate) && (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Template Name</label>
              <input
                type="text"
                placeholder="e.g. Appointment Reminder"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Message Body</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      onClick={() => insertVariable(v.token)}
                      title={`Insert ${v.label}`}
                      style={{
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(79,127,255,0.1)',
                        border: '1px solid rgba(79,127,255,0.2)',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                      }}
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Hi {{contact_name}}, this is a reminder..."
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: formBody.length > 160 ? 'var(--amber)' : 'var(--text3)',
                  }}
                >
                  {formBody.length} chars
                  {formBody.length > 160 ? ` · ${Math.ceil(formBody.length / 160)} SMS` : ' · 1 SMS'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={cancelEdit}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text2)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <X size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving || !formName.trim() || !formBody.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: saving ? 'var(--surface2)' : 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: (!formName.trim() || !formBody.trim()) ? 0.5 : 1,
                }}
              >
                <Save size={13} />
                {saving ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        )}

        {/* Template rows */}
        {templates.length === 0 && !isNew ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
            No templates yet. Create one to speed up SMS replies.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map((tmpl) => {
              const isEditing = editingTemplate?.id === tmpl.id
              if (isEditing) return null // shown in edit form above
              return (
                <div
                  key={tmpl.id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                      {tmpl.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text2)',
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {tmpl.body}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: 'var(--text3)',
                        }}
                      >
                        {tmpl.body.length} chars
                        {tmpl.body.length > 160 ? ` · ${Math.ceil(tmpl.body.length / 160)} SMS` : ' · 1 SMS'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => copyBody(tmpl.id, tmpl.body)}
                      title="Copy body"
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        cursor: 'pointer',
                        color: copiedId === tmpl.id ? 'var(--green)' : 'var(--text3)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {copiedId === tmpl.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <button
                      onClick={() => startEdit(tmpl)}
                      title="Edit"
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        cursor: 'pointer',
                        color: 'var(--text2)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteTemplate(tmpl.id)}
                      title="Delete"
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '5px 8px',
                        cursor: 'pointer',
                        color: 'var(--red)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
