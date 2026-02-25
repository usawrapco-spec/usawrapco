'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Mail,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  Pencil,
  X,
} from 'lucide-react'

interface EmailTemplate {
  id: string
  org_id: string
  name: string
  email_type: string
  subject: string
  body_html: string
}

interface Props {
  profile: Profile
  templates: EmailTemplate[]
}

export default function EmailSettingsClient({ profile, templates: initialTemplates }: Props) {
  const supabase = createClient()
  const orgId = profile.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  const [templates, setTemplates] = useState(initialTemplates)
  const [copied, setCopied] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formBody, setFormBody] = useState('')
  const [saving, setSaving] = useState(false)

  const webhookUrl = 'https://app.usawrapco.com/api/email/webhook'

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startEdit = (tmpl: EmailTemplate) => {
    setEditingTemplate(tmpl)
    setFormName(tmpl.name)
    setFormType(tmpl.email_type)
    setFormSubject(tmpl.subject)
    setFormBody(tmpl.body_html)
    setNewTemplate(false)
  }

  const startNew = () => {
    setEditingTemplate(null)
    setFormName('')
    setFormType('')
    setFormSubject('')
    setFormBody('')
    setNewTemplate(true)
  }

  const cancelEdit = () => {
    setEditingTemplate(null)
    setNewTemplate(false)
  }

  const saveTemplate = async () => {
    setSaving(true)
    if (editingTemplate) {
      const { data } = await supabase
        .from('email_templates')
        .update({
          name: formName,
          email_type: formType,
          subject: formSubject,
          body_html: formBody,
        })
        .eq('id', editingTemplate.id)
        .select()
        .single()
      if (data) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === data.id ? data : t))
        )
      }
    } else {
      const { data } = await supabase
        .from('email_templates')
        .insert({
          org_id: orgId,
          name: formName,
          email_type: formType,
          subject: formSubject,
          body_html: formBody,
        })
        .select()
        .single()
      if (data) {
        setTemplates((prev) => [...prev, data])
      }
    }
    setSaving(false)
    cancelEdit()
  }

  const deleteTemplate = async (id: string) => {
    await supabase.from('email_templates').delete().eq('id', id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const sectionStyle = {
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    border: '1px solid var(--border)',
  }

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--text2)',
    marginBottom: 6,
    display: 'block' as const,
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
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Mail size={22} style={{ color: 'var(--accent)' }} />
        <h1
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: 22,
            color: 'var(--text1)',
            margin: 0,
          }}
        >
          Email Settings
        </h1>
      </div>

      {/* SendGrid webhook */}
      <div style={sectionStyle}>
        <div
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--text1)',
            marginBottom: 12,
          }}
        >
          SendGrid Webhook URL
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, margin: '0 0 10px' }}>
          Add this URL in your SendGrid Event Webhook settings to receive delivery, open, click, bounce, and spam notifications.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <code
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--cyan)',
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhook}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: copied ? 'var(--green)' : 'var(--accent)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Sender details */}
      <div style={sectionStyle}>
        <div
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            color: 'var(--text1)',
            marginBottom: 12,
          }}
        >
          Sender Details
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>From Name</label>
            <input
              type="text"
              defaultValue="USA Wrap Co"
              style={inputStyle}
              readOnly
            />
          </div>
          <div>
            <label style={labelStyle}>From Email</label>
            <input
              type="email"
              defaultValue="shop@usawrapco.com"
              style={inputStyle}
              readOnly
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Reply-To Email</label>
            <input
              type="email"
              defaultValue="shop@usawrapco.com"
              style={inputStyle}
              readOnly
            />
          </div>
        </div>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text3)',
            marginTop: 10,
            margin: '10px 0 0',
          }}
        >
          Sender settings are managed through SendGrid. Update them in your SendGrid dashboard.
        </p>
      </div>

      {/* Email Templates */}
      <div style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text1)',
            }}
          >
            Email Templates ({templates.length})
          </div>
          <button
            onClick={startNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 7,
              background: 'var(--accent)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            New Template
          </button>
        </div>

        {/* Template form */}
        {(editingTemplate || newTemplate) && (
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 10,
              padding: 16,
              marginBottom: 14,
              border: '1px solid var(--accent)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div>
                <label style={labelStyle}>Template Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Follow Up"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <input
                  type="text"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  placeholder="e.g. follow_up"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Subject Line</label>
              <input
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Email subject..."
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Body (HTML)</label>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="<p>Email body...</p>"
                rows={6}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              />
            </div>
            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}
            >
              <button
                onClick={cancelEdit}
                style={{
                  padding: '6px 14px',
                  borderRadius: 7,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text2)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving || !formName || !formSubject}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 14px',
                  borderRadius: 7,
                  background: 'var(--accent)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: saving || !formName || !formSubject ? 0.5 : 1,
                }}
              >
                <Save size={12} />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Template list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: 'var(--bg)',
                borderRadius: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text1)',
                  }}
                >
                  {tmpl.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}
                >
                  {tmpl.subject}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(79,127,255,0.08)',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {tmpl.email_type}
              </span>
              <button
                onClick={() => startEdit(tmpl)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text3)',
                  padding: 4,
                }}
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => deleteTemplate(tmpl.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--red)',
                  padding: 4,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: 'var(--text3)',
                fontSize: 13,
              }}
            >
              No templates yet. Click "New Template" to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
