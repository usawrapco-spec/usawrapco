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
  PenLine,
  Zap,
  ArrowDownToLine,
  ExternalLink,
} from 'lucide-react'

const BASE_URL = 'https://usawrapco.com'

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

  // Signature state
  const [signature, setSignature] = useState(profile.email_signature || '')
  const [savingSignature, setSavingSignature] = useState(false)
  const [signatureSaved, setSignatureSaved] = useState(false)

  const saveSignature = async () => {
    setSavingSignature(true)
    await supabase
      .from('profiles')
      .update({ email_signature: signature || null })
      .eq('id', profile.id)
    setSavingSignature(false)
    setSignatureSaved(true)
    setTimeout(() => setSignatureSaved(false), 2500)
  }

  const resendWebhookUrl = `${BASE_URL}/api/email/resend-webhook`
  const inboundWebhookUrl = `${BASE_URL}/api/inbox/inbound-email`
  const [copiedResend, setCopiedResend] = useState(false)
  const [copiedInbound, setCopiedInbound] = useState(false)

  const copyResendWebhook = () => {
    navigator.clipboard.writeText(resendWebhookUrl)
    setCopiedResend(true)
    setTimeout(() => setCopiedResend(false), 2000)
  }

  const copyInboundWebhook = () => {
    navigator.clipboard.writeText(inboundWebhookUrl)
    setCopiedInbound(true)
    setTimeout(() => setCopiedInbound(false), 2000)
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

      {/* Resend — Outbound Tracking Webhook */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Zap size={15} style={{ color: 'var(--accent)' }} />
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>
            Resend — Email Tracking Webhook
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 10px' }}>
          Tracks opens, clicks, bounces, and delivery on every email you send. Add this URL in{' '}
          <a href="https://resend.com/webhooks" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            resend.com → Webhooks <ExternalLink size={11} />
          </a>
          {' '}and subscribe to: <code style={{ fontSize: 11, color: 'var(--cyan)' }}>email.sent email.delivered email.opened email.clicked email.bounced email.complained</code>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <code style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--cyan)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {resendWebhookUrl}
          </code>
          <button onClick={copyResendWebhook} style={{ padding: '8px 12px', borderRadius: 8, background: copiedResend ? 'var(--green)' : 'var(--accent)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            {copiedResend ? <Check size={13} /> : <Copy size={13} />}
            {copiedResend ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: 'var(--text3)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text2)' }}>After adding the webhook:</strong> copy the <strong>Signing Secret</strong> from Resend and add it to Vercel as{' '}
          <code style={{ color: 'var(--cyan)', fontSize: 10 }}>RESEND_WEBHOOK_SECRET</code>. This verifies each event is genuinely from Resend.
        </div>
      </div>

      {/* Resend — Inbound Email */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <ArrowDownToLine size={15} style={{ color: 'var(--green)' }} />
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>
            Resend — Receive Inbound Replies
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 12px' }}>
          When customers reply to your emails, replies land directly in the inbox. Requires DNS setup for your domain.
        </p>

        {/* Step 1 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>1</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>Add MX records to usawrapco.com</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
              In{' '}
              <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                resend.com → Domains <ExternalLink size={10} />
              </a>
              {' '}→ click <strong>usawrapco.com</strong> → <strong>Inbound</strong> tab → copy the MX records and add them to your domain registrar (GoDaddy / Cloudflare / etc.).
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>2</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>Add the inbound webhook URL in Resend</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              In Resend → Domains → usawrapco.com → Inbound → <strong>Add Webhook</strong> → paste this URL:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, padding: '7px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--cyan)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inboundWebhookUrl}
              </code>
              <button onClick={copyInboundWebhook} style={{ padding: '7px 12px', borderRadius: 8, background: copiedInbound ? 'var(--green)' : 'var(--surface2)', border: '1px solid var(--border)', color: copiedInbound ? '#fff' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                {copiedInbound ? <Check size={13} /> : <Copy size={13} />}
                {copiedInbound ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(34,192,122,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--green)', lineHeight: 1.6, border: '1px solid rgba(34,192,122,0.2)' }}>
          Once active, customer replies to <strong>shop@usawrapco.com</strong> will appear in the inbox and be threaded with the original conversation automatically.
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
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, margin: '10px 0 0' }}>
          Sender settings are managed through Resend. Verify your domain at{' '}
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>resend.com → Domains</a>.
        </p>
      </div>

      {/* My Email Signature */}
      <div style={sectionStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <PenLine size={15} style={{ color: 'var(--accent)' }} />
          <div
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text1)',
            }}
          >
            My Email Signature
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 12px' }}>
          Automatically appended below every email you send. Supports plain text and line breaks.
        </p>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder={'John Smith\nUSA Wrap Co — Sales\n(253) 555-0123'}
          rows={5}
          style={{
            ...inputStyle,
            resize: 'vertical',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            minHeight: 80,
          }}
        />
        {/* Preview */}
        {signature && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              background: 'var(--bg)',
              border: '1px dashed var(--border)',
              borderRadius: 7,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>
              Preview
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>-- </div>
            <pre
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                margin: 0,
                fontFamily: 'inherit',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}
            >
              {signature}
            </pre>
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={saveSignature}
            disabled={savingSignature}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 7,
              background: signatureSaved ? 'var(--green)' : 'var(--accent)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: savingSignature ? 'not-allowed' : 'pointer',
              opacity: savingSignature ? 0.7 : 1,
            }}
          >
            {signatureSaved ? <Check size={13} /> : <Save size={13} />}
            {savingSignature ? 'Saving...' : signatureSaved ? 'Saved!' : 'Save Signature'}
          </button>
          {signature && (
            <button
              onClick={() => setSignature('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 12px',
                borderRadius: 7,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text3)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>
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
