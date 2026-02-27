'use client'

import DOMPurify from 'dompurify'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Plus, X, Play, Pause, Mail, BarChart3, Send, MessageSquare, Sparkles } from 'lucide-react'

interface CampaignsClientProps {
  profile: Profile
  initialCampaigns: any[]
  prospects: any[]
}

const INDUSTRIES = [
  'Fleet Companies', 'Plumbers', 'Electricians', 'HVAC', 'Landscapers', 'Contractors',
  'Restaurants', 'Food Trucks', 'Real Estate', 'Car Dealerships', 'Boat Dealerships',
  'Moving Companies', 'Pest Control', 'Cleaning Services', 'Delivery Services', 'Towing',
  'Construction', 'General',
]

export default function CampaignsClient({ profile, initialCampaigns, prospects }: CampaignsClientProps) {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [generating, setGenerating] = useState(false)

  // Create campaign form
  const [formName, setFormName] = useState('')
  const [formIndustry, setFormIndustry] = useState('General')
  const [formAutoReply, setFormAutoReply] = useState(false)
  const [formSaving, setFormSaving] = useState(false)

  async function handleCreate() {
    if (!formName.trim()) return
    setFormSaving(true)

    const defaultSequence = [
      { step_number: 1, subject: '', body: '', delay_days: 0 },
      { step_number: 2, subject: '', body: '', delay_days: 3 },
      { step_number: 3, subject: '', body: '', delay_days: 5 },
      { step_number: 4, subject: '', body: '', delay_days: 7 },
    ]

    const { data, error } = await supabase.from('campaigns').insert({
      org_id: profile.org_id,
      name: formName.trim(),
      industry_target: formIndustry,
      status: 'draft',
      email_sequence: defaultSequence,
      auto_reply: formAutoReply,
      stats: { sent: 0, opened: 0, replied: 0, bounced: 0, conversions: 0 },
      created_by: profile.id,
    }).select().single()

    if (!error && data) {
      setCampaigns(prev => [data, ...prev])
      setShowCreate(false)
      setFormName('')
      setFormIndustry('General')
    }
    setFormSaving(false)
  }

  async function generateEmails(campaign: any) {
    setGenerating(true)
    const sequence = campaign.email_sequence || []

    for (let i = 0; i < sequence.length; i++) {
      try {
        const res = await fetch('/api/ai/write-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect: { business_name: '[Business Name]', industry: campaign.industry_target },
            step: i + 1,
            campaign_name: campaign.name,
            industry: campaign.industry_target,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          sequence[i] = { ...sequence[i], subject: data.subject, body: data.body }
        }
      } catch {}
    }

    await supabase.from('campaigns').update({ email_sequence: sequence }).eq('id', campaign.id)
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, email_sequence: sequence } : c))
    if (selectedCampaign?.id === campaign.id) setSelectedCampaign({ ...campaign, email_sequence: sequence })
    setGenerating(false)
  }

  async function toggleStatus(campaign: any) {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaign.id)
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c))
  }

  const statusColor: Record<string, string> = {
    draft: 'var(--text3)',
    active: 'var(--green)',
    paused: 'var(--amber)',
    completed: 'var(--accent)',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={22} style={{ color: 'var(--accent)' }} />
            CAMPAIGNS
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
            AI-powered email outreach sequences
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, color: 'var(--green)' },
          { label: 'Total Sent', value: campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0), color: 'var(--accent)' },
          { label: 'Replies', value: campaigns.reduce((s, c) => s + (c.stats?.replied || 0), 0), color: 'var(--cyan)' },
          { label: 'Conversions', value: campaigns.reduce((s, c) => s + (c.stats?.conversions || 0), 0), color: 'var(--green)' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign List + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCampaign ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Campaign Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {campaigns.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
              No campaigns yet. Create one to start AI outreach.
            </div>
          )}
          {campaigns.map(c => (
            <div key={c.id} onClick={() => setSelectedCampaign(c)} style={{
              padding: '14px 16px', background: selectedCampaign?.id === c.id ? 'rgba(79,127,255,0.08)' : 'var(--surface)',
              border: `1px solid ${selectedCampaign?.id === c.id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{c.industry_target}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', color: statusColor[c.status] || 'var(--text3)',
                    background: `${statusColor[c.status] || 'var(--text3)'}15`,
                    border: `1px solid ${statusColor[c.status] || 'var(--text3)'}30`,
                  }}>
                    {c.status}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); toggleStatus(c) }} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: c.status === 'active' ? 'var(--amber)' : 'var(--green)', padding: 4,
                  }}>
                    {c.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                <span>{c.stats?.sent || 0} sent</span>
                <span>{c.stats?.replied || 0} replies</span>
                <span>{c.stats?.conversions || 0} conv</span>
                <span>{(c.email_sequence || []).length} steps</span>
              </div>
            </div>
          ))}
        </div>

        {/* Campaign Detail */}
        {selectedCampaign && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, overflowY: 'auto', maxHeight: 'calc(100vh - 280px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
                  {selectedCampaign.name}
                </h2>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selectedCampaign.industry_target}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => generateEmails(selectedCampaign)} disabled={generating} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', opacity: generating ? 0.5 : 1,
                }}>
                  <Sparkles size={12} /> {generating ? 'Writing...' : 'AI Write Emails'}
                </button>
                <button onClick={() => setSelectedCampaign(null)} style={{
                  background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4,
                }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Email Sequence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(selectedCampaign.email_sequence || []).map((step: any, i: number) => (
                <div key={i} style={{
                  padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10,
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: 'rgba(79,127,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: 'var(--accent)',
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                        Step {i + 1} {step.delay_days > 0 ? `(+${step.delay_days} days)` : '(Immediate)'}
                      </span>
                    </div>
                    <Send size={12} style={{ color: 'var(--text3)' }} />
                  </div>
                  {step.subject ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                        {step.subject}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
                        maxHeight: 120, overflow: 'hidden',
                      }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(step.body.slice(0, 300)) }} />
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                      Click &quot;AI Write Emails&quot; to generate this step
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Prospects in Campaign */}
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', textTransform: 'uppercase', marginBottom: 10 }}>
                Prospects ({prospects.filter(p => p.campaign_id === selectedCampaign.id).length} assigned)
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Assign prospects to this campaign from the Prospects page.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
            width: '100%', maxWidth: 480, boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)' }}>
                New Campaign
              </h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Campaign Name *
                </label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Fleet Companies Q1 2026"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  Industry Target
                </label>
                <select value={formIndustry} onChange={e => setFormIndustry(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 13, outline: 'none' }}>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={formAutoReply} onChange={e => setFormAutoReply(e.target.checked)} />
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Auto-send AI replies (vs queue for review)</span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={formSaving || !formName.trim()} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: (formSaving || !formName.trim()) ? 0.5 : 1,
              }}>
                {formSaving ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
