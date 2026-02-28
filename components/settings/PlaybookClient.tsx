'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, PlaybookCategory } from '@/types'
import {
  BookOpen, DollarSign, Shield, Plus, Trash2, Save, ChevronDown, ChevronRight,
  AlertTriangle, Zap, Bot, TestTube, Send, X, Edit3, ToggleLeft, ToggleRight,
} from 'lucide-react'

const CATEGORIES: { key: PlaybookCategory; label: string; color: string }[] = [
  { key: 'brand_voice', label: 'Brand Voice', color: '#22d3ee' },
  { key: 'greeting', label: 'Greeting', color: '#4f7fff' },
  { key: 'qualification', label: 'Qualification', color: '#8b5cf6' },
  { key: 'pricing', label: 'Pricing', color: '#22c07a' },
  { key: 'objection', label: 'Objection Handling', color: '#f59e0b' },
  { key: 'upsell', label: 'Upsell', color: '#22c07a' },
  { key: 'closing', label: 'Closing', color: '#4f7fff' },
  { key: 'followup', label: 'Follow-up', color: '#8b5cf6' },
  { key: 'faq', label: 'FAQ', color: '#22d3ee' },
  { key: 'policy', label: 'Policy', color: '#f25a5a' },
  { key: 'competitor', label: 'Competitor', color: '#f59e0b' },
]

interface Props {
  profile: Profile
  initialEntries: any[]
  initialPricing: any[]
  initialEscalation: any[]
}

export default function PlaybookClient({ profile, initialEntries, initialPricing, initialEscalation }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'playbook' | 'pricing' | 'escalation' | 'test'>('playbook')
  const [entries, setEntries] = useState<any[]>(initialEntries)
  const [pricing, setPricing] = useState<any[]>(initialPricing)
  const [escalation, setEscalation] = useState<any[]>(initialEscalation)
  const [expandedCat, setExpandedCat] = useState<string | null>('brand_voice')
  const [saving, setSaving] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)

  // Default entries if empty
  const hasEntries = entries.length > 0
  const defaultEntries: any[] = !hasEntries ? [
    { id: 'def-1', category: 'brand_voice', title: null, content: 'Professional but conversational. Friendly, knowledgeable about vehicle wraps. Not pushy but always move toward booking. Use customer name when known.', active: true, sort_order: 1 },
    { id: 'def-2', category: 'greeting', title: 'first message', content: 'Welcome them warmly, introduce yourself as V.I.N.Y.L. from USA Wrap Co, ask what vehicle they have and what kind of wrap they want.', active: true, sort_order: 2 },
    { id: 'def-3', category: 'pricing', title: 'how much / price / cost / quote', content: 'Provide pricing based on vehicle type and wrap type. Always mention what is included (design, print, laminate, install). Offer to send a formal quote.', active: true, sort_order: 3 },
    { id: 'def-4', category: 'objection', title: 'too expensive / cheaper', content: 'Emphasize quality (3M/Avery vinyl, 5-year warranty, professional install). Compare to paint cost. Mention fleet discounts if applicable.', active: true, sort_order: 4 },
    { id: 'def-5', category: 'closing', title: 'next step / ready / lets do it', content: 'Guide them to pay the $250 design deposit. Explain the timeline: deposit -> design -> proof approval -> production -> install.', active: true, sort_order: 5 },
    { id: 'def-6', category: 'faq', title: 'how long / timeline', content: 'Typical timeline is 2-3 weeks from design approval. Install usually takes 1-2 days depending on vehicle size.', active: true, sort_order: 6 },
  ] : []

  const allEntries = hasEntries ? entries : defaultEntries

  const c = {
    bg: '#0d0f14', surface: '#161920', surface2: '#1a1d27',
    border: '#1e2330', accent: '#4f7fff', green: '#22c07a',
    amber: '#f59e0b', red: '#f25a5a', purple: '#8b5cf6',
    cyan: '#22d3ee', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
  }

  // Default pricing rules
  const defaultPricing = pricing.length > 0 ? pricing : [
    { id: 'dp-1', vehicle_category: 'Sedan', wrap_type: 'Full Wrap', base_price: 3000, price_per_sqft: 12, max_discount_pct: 10, is_active: true },
    { id: 'dp-2', vehicle_category: 'SUV', wrap_type: 'Full Wrap', base_price: 3800, price_per_sqft: 12, max_discount_pct: 10, is_active: true },
    { id: 'dp-3', vehicle_category: 'Truck', wrap_type: 'Full Wrap', base_price: 4200, price_per_sqft: 12, max_discount_pct: 10, is_active: true },
    { id: 'dp-4', vehicle_category: 'Van', wrap_type: 'Full Wrap', base_price: 4500, price_per_sqft: 11, max_discount_pct: 15, is_active: true },
    { id: 'dp-5', vehicle_category: 'Box Truck', wrap_type: 'Full Wrap', base_price: 5500, price_per_sqft: 10, max_discount_pct: 15, is_active: true },
    { id: 'dp-6', vehicle_category: 'Sedan', wrap_type: 'Partial Wrap', base_price: 1500, price_per_sqft: 14, max_discount_pct: 10, is_active: true },
    { id: 'dp-7', vehicle_category: 'Any', wrap_type: 'Color Change', base_price: 3500, price_per_sqft: 15, max_discount_pct: 5, is_active: true },
    { id: 'dp-8', vehicle_category: 'Any', wrap_type: 'PPF', base_price: 1800, price_per_sqft: 25, max_discount_pct: 5, is_active: true },
  ]

  // Default escalation rules
  const defaultEscalation = escalation.length > 0 ? escalation : [
    { id: 'de-1', trigger_type: 'explicit_request', conditions: {}, active: true, priority: 1 },
    { id: 'de-2', trigger_type: 'keyword', conditions: { keywords: ['speak to someone', 'manager', 'real person', 'human', 'supervisor', 'complaint', 'lawsuit', 'attorney'] }, active: true, priority: 2 },
    { id: 'de-3', trigger_type: 'confidence', conditions: { threshold: 0.5 }, active: true, priority: 3 },
    { id: 'de-4', trigger_type: 'dollar_threshold', conditions: { max_amount: 15000 }, active: true, priority: 4 },
  ]

  async function savePlaybookEntries() {
    setSaving(true)
    try {
      for (const entry of allEntries) {
        if (entry.id.startsWith('def-') || entry.id.startsWith('new-')) {
          await supabase.from('sales_playbook').insert({
            org_id: profile.org_id,
            category: entry.category,
            title: entry.title,
            content: entry.content,
            active: entry.active,
            sort_order: entry.sort_order,
          })
        } else {
          await supabase.from('sales_playbook').update({
            category: entry.category,
            title: entry.title,
            content: entry.content,
            active: entry.active,
            sort_order: entry.sort_order,
          }).eq('id', entry.id)
        }
      }
    } catch {}
    setSaving(false)
  }

  async function savePricingRules() {
    setSaving(true)
    try {
      for (let i = 0; i < defaultPricing.length; i++) {
        const rule = defaultPricing[i]
        const dbRow = {
          name: `${rule.vehicle_category} - ${rule.wrap_type}`,
          rule_type: 'wrap_pricing',
          value: rule.base_price,
          applies_to: rule.vehicle_category,
          conditions: { wrap_type: rule.wrap_type, price_per_sqft: rule.price_per_sqft, max_discount_pct: rule.max_discount_pct },
          active: rule.is_active,
          priority: i + 1,
          org_id: profile.org_id,
        }
        if (rule.id.startsWith('dp-') || rule.id.startsWith('new-')) {
          await supabase.from('pricing_rules').insert(dbRow)
        } else {
          const { org_id, ...updateRow } = dbRow
          await supabase.from('pricing_rules').update(updateRow).eq('id', rule.id)
        }
      }
    } catch {}
    setSaving(false)
  }

  async function runTest() {
    if (!testMessage.trim()) return
    setTesting(true)
    setTestResult('')
    try {
      const res = await fetch('/api/ai-broker/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'test@test.com', message: testMessage, channel: 'email' }),
      })
      const data = await res.json()
      setTestResult(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setTestResult('Error: ' + err.message)
    }
    setTesting(false)
  }

  const tabStyle = (key: string) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: '0.04em',
    background: activeTab === key ? `${c.accent}20` : 'transparent',
    color: activeTab === key ? c.accent : c.text3,
    minHeight: 36,
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={20} style={{ color: c.cyan }} />
          <h1 style={{ fontSize: 22, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text1, margin: 0 }}>
            V.I.N.Y.L. AI Command Center
          </h1>
        </div>
        <button onClick={activeTab === 'pricing' ? savePricingRules : savePlaybookEntries} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: c.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: c.surface, padding: 4, borderRadius: 10 }}>
        <button onClick={() => setActiveTab('playbook')} style={tabStyle('playbook')}><BookOpen size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Playbook</button>
        <button onClick={() => setActiveTab('pricing')} style={tabStyle('pricing')}><DollarSign size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Pricing</button>
        <button onClick={() => setActiveTab('escalation')} style={tabStyle('escalation')}><Shield size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Escalation</button>
        <button onClick={() => setActiveTab('test')} style={tabStyle('test')}><TestTube size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Test</button>
      </div>

      {/* ─── Playbook Tab ─────────────────────────────────────────── */}
      {activeTab === 'playbook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CATEGORIES.map(cat => {
            const catEntries = allEntries.filter(e => e.category === cat.key)
            const isExpanded = expandedCat === cat.key

            return (
              <div key={cat.key} style={{ background: c.surface, borderRadius: 10, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
                <button onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: 'none', background: 'transparent', color: c.text1, cursor: 'pointer', minHeight: 40 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cat.label}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: c.text3 }}>{catEntries.length}</span>
                  </span>
                  {isExpanded ? <ChevronDown size={14} style={{ color: c.text3 }} /> : <ChevronRight size={14} style={{ color: c.text3 }} />}
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 14px 14px' }}>
                    {catEntries.map((entry, i) => (
                      <div key={entry.id} style={{ padding: '10px 0', borderTop: i > 0 ? `1px solid ${c.border}` : 'none' }}>
                        {entry.title && (
                          <div style={{ fontSize: 11, color: c.text3, marginBottom: 4 }}>
                            Trigger: <span style={{ color: cat.color }}>{entry.title}</span>
                          </div>
                        )}
                        <textarea
                          value={entry.content || ''}
                          onChange={e => {
                            const updated = allEntries.map(en => en.id === entry.id ? { ...en, content: e.target.value } : en)
                            hasEntries ? setEntries(updated) : setEntries(updated)
                          }}
                          style={{ width: '100%', minHeight: 60, padding: 8, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, color: c.text1, fontSize: 12, lineHeight: 1.5, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                      </div>
                    ))}
                    {catEntries.length === 0 && (
                      <div style={{ padding: '12px 0', color: c.text3, fontSize: 12 }}>No entries for this category yet.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Pricing Tab ──────────────────────────────────────────── */}
      {activeTab === 'pricing' && (
        <div style={{ background: c.surface, borderRadius: 10, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                {['Vehicle', 'Wrap Type', 'Base Price', '$/sqft', 'Max Discount', 'Active'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.text3, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {defaultPricing.map(rule => (
                <tr key={rule.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: '8px 12px', color: c.text1, fontWeight: 500 }}>{rule.vehicle_category}</td>
                  <td style={{ padding: '8px 12px', color: c.text2 }}>{rule.wrap_type}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.green }}>${rule.base_price.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.text2 }}>${rule.price_per_sqft}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.amber }}>{rule.max_discount_pct}%</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: rule.is_active ? c.green : c.red, display: 'inline-block' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Escalation Tab ───────────────────────────────────────── */}
      {activeTab === 'escalation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {defaultEscalation.map(rule => (
            <div key={rule.id} style={{ background: c.surface, borderRadius: 10, border: `1px solid ${c.border}`, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 36, height: 36, minWidth: 36, borderRadius: 8, background: `${c.amber}15`, color: c.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, textTransform: 'capitalize' }}>{(rule.trigger_type || '').replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>
                  {rule.trigger_type === 'keyword' && <>Keywords: {(rule.conditions?.keywords || []).join(', ')}</>}
                  {rule.trigger_type === 'confidence' && <>Escalate when AI confidence drops below <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.amber }}>{(rule.conditions?.threshold || 0.5) * 100}%</span></>}
                  {rule.trigger_type === 'dollar_threshold' && <>Escalate for deals over <span style={{ fontFamily: 'JetBrains Mono, monospace', color: c.green }}>${(rule.conditions?.max_amount || 15000).toLocaleString()}</span></>}
                  {rule.trigger_type === 'explicit_request' && <>Always escalate when customer asks for a human or manager</>}
                </div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: rule.active ? c.green : c.red, marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {/* ─── Test Tab ─────────────────────────────────────────────── */}
      {activeTab === 'test' && (
        <div style={{ background: c.surface, borderRadius: 10, border: `1px solid ${c.border}`, padding: 16 }}>
          <div style={{ marginBottom: 12, fontSize: 13, color: c.text2 }}>
            Test how V.I.N.Y.L. would respond to a customer message:
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={testMessage}
              onChange={e => setTestMessage(e.target.value)}
              placeholder="Type a sample customer message..."
              onKeyDown={e => { if (e.key === 'Enter') runTest() }}
              style={{ flex: 1, padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text1, fontSize: 13, outline: 'none' }}
            />
            <button onClick={runTest} disabled={testing || !testMessage.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: c.cyan, color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {testing ? 'Testing...' : <><Send size={14} /> Test</>}
            </button>
          </div>
          {testResult && (
            <pre style={{ padding: 12, background: c.bg, borderRadius: 8, border: `1px solid ${c.border}`, color: c.text2, fontSize: 12, lineHeight: 1.5, overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap' }}>
              {testResult}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
