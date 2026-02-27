'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Save, Send, ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle, X, Check, Copy, ExternalLink, User, Calendar,
  DollarSign, AlignLeft, Star,
} from 'lucide-react'
import { PROPOSAL_STATUS_CONFIG, BADGE_OPTIONS, COMMON_UPSELLS, type Proposal, type ProposalPackage, type ProposalUpsell } from '@/lib/proposals'
import { createClient } from '@/lib/supabase/client'

interface LocalPackage extends Partial<ProposalPackage> {
  _key: string
  includes: string[]
  photos: string[]
}

interface LocalUpsell extends Partial<ProposalUpsell> {
  _key: string
}

interface CustomerOption {
  id: string
  name: string
  email: string
  phone: string | null
}

interface Props {
  proposal: Proposal
  packages: ProposalPackage[]
  upsells: ProposalUpsell[]
  initialCustomer: CustomerOption | null
}

let _keyCounter = 0
function newKey() { return `k${++_keyCounter}` }

function toLocal(pkgs: ProposalPackage[]): LocalPackage[] {
  return pkgs.map(p => ({ ...p, _key: newKey(), includes: p.includes || [], photos: p.photos || [] }))
}

function toLocalUpsells(ups: ProposalUpsell[]): LocalUpsell[] {
  return ups.map(u => ({ ...u, _key: newKey() }))
}

export default function ProposalBuilder({ proposal, packages: initPkgs, upsells: initUpsells, initialCustomer }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ── Form state
  const [title, setTitle] = useState(proposal.title || '')
  const [message, setMessage] = useState(proposal.message || '')
  const [closingMessage, setClosingMessage] = useState((proposal as any).closing_message || '')
  const [terms, setTerms] = useState((proposal as any).terms_conditions || '')
  const [expDate, setExpDate] = useState(
    proposal.expiration_date ? proposal.expiration_date.slice(0, 10) : ''
  )
  const [depositAmount, setDepositAmount] = useState(String(proposal.deposit_amount || 250))

  const [packages, setPackages] = useState<LocalPackage[]>(toLocal(initPkgs))
  const [upsells, setUpsells] = useState<LocalUpsell[]>(toLocalUpsells(initUpsells))

  // ── Customer selector
  const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer)
  const [customerSearch, setCustomerSearch] = useState(initialCustomer?.name || '')
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Save state
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState('')

  // ── Send modal
  const [showSend, setShowSend] = useState(false)
  const [sendEmail, setSendEmail] = useState(initialCustomer?.email || '')
  const [sendSms, setSendSms] = useState(false)
  const [sendPhone, setSendPhone] = useState(initialCustomer?.phone || '')
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)

  // ── Preview state (interactive)
  const [previewPkgId, setPreviewPkgId] = useState<string | null>(null)
  const [previewUpsellKeys, setPreviewUpsellKeys] = useState<string[]>([])

  // ── Collapsed packages
  const [collapsedPkgs, setCollapsedPkgs] = useState<Record<string, boolean>>({})

  const proposalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.usawrapco.com'}/proposal/${proposal.public_token}`
  const status = proposal.status
  const cfg = PROPOSAL_STATUS_CONFIG[status]

  // ── Customer search
  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) { setCustomerResults([]); return }
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8)
    setCustomerResults((data as CustomerOption[]) || [])
  }, [supabase])

  function onCustomerInput(val: string) {
    setCustomerSearch(val)
    setShowCustomerDropdown(true)
    if (customerDebounce.current) clearTimeout(customerDebounce.current)
    customerDebounce.current = setTimeout(() => searchCustomers(val), 280)
  }

  function selectCustomer(c: CustomerOption) {
    setCustomer(c)
    setCustomerSearch(c.name)
    setSendEmail(c.email || '')
    setSendPhone(c.phone || '')
    setShowCustomerDropdown(false)
    setCustomerResults([])
  }

  function clearCustomer() {
    setCustomer(null)
    setCustomerSearch('')
    setShowCustomerDropdown(false)
  }

  // ── Package helpers
  function addPackage() {
    setPackages(prev => [...prev, {
      _key: newKey(), name: 'New Package', description: '', price: 0,
      includes: [], photos: [], badge: '', sort_order: prev.length,
    }])
  }

  function removePackage(key: string) {
    setPackages(prev => prev.filter(p => p._key !== key))
    if (previewPkgId === key) setPreviewPkgId(null)
  }

  function updatePkg(key: string, field: string, value: unknown) {
    setPackages(prev => prev.map(p => p._key === key ? { ...p, [field]: value } : p))
  }

  function addInclude(key: string) {
    setPackages(prev => prev.map(p =>
      p._key === key ? { ...p, includes: [...p.includes, ''] } : p
    ))
  }

  function updateInclude(key: string, idx: number, val: string) {
    setPackages(prev => prev.map(p => {
      if (p._key !== key) return p
      const inc = [...p.includes]
      inc[idx] = val
      return { ...p, includes: inc }
    }))
  }

  function removeInclude(key: string, idx: number) {
    setPackages(prev => prev.map(p => {
      if (p._key !== key) return p
      return { ...p, includes: p.includes.filter((_, i) => i !== idx) }
    }))
  }

  // ── Upsell helpers
  function addUpsell(preset?: typeof COMMON_UPSELLS[0]) {
    setUpsells(prev => [...prev, {
      _key: newKey(),
      name: preset?.name || 'New Add-on',
      description: preset?.description || '',
      price: preset?.price || 0,
      badge: preset?.badge || '',
      photo_url: '',
    }])
  }

  function removeUpsell(key: string) {
    setUpsells(prev => prev.filter(u => u._key !== key))
    setPreviewUpsellKeys(prev => prev.filter(k => k !== key))
  }

  function updateUpsell(key: string, field: string, value: unknown) {
    setUpsells(prev => prev.map(u => u._key === key ? { ...u, [field]: value } : u))
  }

  // ── Save
  const save = useCallback(async () => {
    setSaving(true)
    setSaveError('')
    try {
      const body = {
        title,
        message,
        closing_message: closingMessage,
        terms_conditions: terms,
        expiration_date: expDate ? new Date(expDate).toISOString() : null,
        deposit_amount: Number(depositAmount) || 250,
        customer_id: customer?.id || null,
        packages: packages.map((p, i) => ({
          name: p.name || '',
          badge: p.badge || null,
          description: p.description || null,
          price: Number(p.price) || 0,
          includes: p.includes.filter(Boolean),
          photos: p.photos || [],
          video_url: (p as any).video_url || null,
          sort_order: i,
        })),
        upsells: upsells.map((u, i) => ({
          name: u.name || '',
          description: u.description || null,
          price: Number(u.price) || 0,
          photo_url: u.photo_url || null,
          badge: u.badge || null,
          sort_order: i,
        })),
      }

      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Save failed')
      setSavedAt(new Date())
    } catch (e: any) {
      setSaveError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [title, message, closingMessage, terms, expDate, depositAmount, customer, packages, upsells, proposal.id])

  // ── Send
  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sendEmail, send_sms: sendSms, phone: sendPhone }),
      })
      if (res.ok) {
        setSentOk(true)
        setTimeout(() => { setShowSend(false); setSentOk(false) }, 2000)
      }
    } finally {
      setSending(false)
    }
  }

  // ── Preview calculations
  const previewPkg = packages.find(p => p._key === previewPkgId)
  const previewUpsells = upsells.filter(u => previewUpsellKeys.includes(u._key))
  const previewTotal =
    (Number(previewPkg?.price) || 0) +
    previewUpsells.reduce((s, u) => s + (Number(u.price) || 0), 0)

  function copyLink() {
    navigator.clipboard.writeText(proposalUrl).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', color: 'var(--text1)' }}>
      {/* ── Top toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        background: 'var(--surface)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.push('/proposals')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, padding: 0 }}
        >
          <ArrowLeft size={15} /> Proposals
        </button>

        <span style={{ color: 'var(--text3)' }}>/</span>

        <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || 'Untitled'}
        </span>

        {/* Status badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20,
          background: cfg.bg, color: cfg.color,
          fontSize: 11, fontWeight: 600,
        }}>
          {cfg.label}
        </span>

        {/* Proposal URL */}
        <button
          onClick={copyLink}
          title="Copy proposal link"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}
        >
          <Copy size={12} /> Copy Link
        </button>

        <Link
          href={proposalUrl}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'var(--text2)', fontSize: 11, textDecoration: 'none' }}
        >
          <ExternalLink size={12} /> Preview
        </Link>

        {/* Save state */}
        {savedAt && !saving && !saveError && (
          <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={12} /> Saved
          </span>
        )}
        {saveError && <span style={{ fontSize: 11, color: 'var(--red)' }}>{saveError}</span>}

        <button
          onClick={save}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
            background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 7, color: 'var(--text1)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={() => setShowSend(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
            background: 'var(--accent)', border: 'none',
            borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Send size={14} /> Send to Customer
        </button>
      </div>

      {/* ── Body: editor + preview ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left: Editor ── */}
        <div style={{ width: '46%', minWidth: 360, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '24px 28px', scrollbarWidth: 'thin' }}>

          {/* Title */}
          <Section icon={<AlignLeft size={14} />} label="Proposal Title">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Your Custom Wrap Proposal"
              style={inputStyle}
            />
          </Section>

          {/* Details */}
          <Section icon={<User size={14} />} label="Customer">
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={customerSearch}
                  onChange={e => onCustomerInput(e.target.value)}
                  onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  placeholder="Search by name or email…"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {customer && (
                  <button onClick={clearCustomer} style={{ ...iconBtnStyle }}>
                    <X size={13} />
                  </button>
                )}
              </div>
              {showCustomerDropdown && customerResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, marginTop: 4, overflow: 'hidden',
                }}>
                  {customerResults.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => selectCustomer(c)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.email}</div>
                    </button>
                  ))}
                </div>
              )}
              {customer && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(79,127,255,0.1)', borderRadius: 6, fontSize: 12, color: 'var(--accent)' }}>
                  {customer.name} — {customer.email}
                </div>
              )}
            </div>
          </Section>

          <Section icon={<Calendar size={14} />} label="Valid Until">
            <input
              type="date"
              value={expDate}
              onChange={e => setExpDate(e.target.value)}
              style={inputStyle}
            />
          </Section>

          <Section icon={<DollarSign size={14} />} label="Deposit Amount">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 12, color: 'var(--text3)', fontSize: 13 }}>$</span>
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 24 }}
              />
            </div>
          </Section>

          {/* Intro message */}
          <Section icon={<AlignLeft size={14} />} label="Intro Message">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write a personal message to the customer…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Section>

          {/* Packages */}
          <SectionHeader label="Packages" onAdd={addPackage} addLabel="Add Package" />
          {packages.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0', marginBottom: 16 }}>
              No packages yet. Add at least one for customers to choose from.
            </div>
          )}
          {packages.map(pkg => (
            <PackageEditor
              key={pkg._key}
              pkg={pkg}
              collapsed={!!collapsedPkgs[pkg._key]}
              onToggleCollapse={() => setCollapsedPkgs(p => ({ ...p, [pkg._key]: !p[pkg._key] }))}
              onChange={(f, v) => updatePkg(pkg._key, f, v)}
              onRemove={() => removePackage(pkg._key)}
              onAddInclude={() => addInclude(pkg._key)}
              onUpdateInclude={(i, v) => updateInclude(pkg._key, i, v)}
              onRemoveInclude={(i) => removeInclude(pkg._key, i)}
            />
          ))}

          {/* Upsells */}
          <SectionHeader label="Add-Ons / Upsells" onAdd={() => addUpsell()} addLabel="Add Upsell" />
          {upsells.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0 8px', marginBottom: 8 }}>
              No add-ons yet.
            </div>
          )}
          {/* Quick-add presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {COMMON_UPSELLS.filter(cu => !upsells.some(u => u.name === cu.name)).map(cu => (
              <button
                key={cu.name}
                onClick={() => addUpsell(cu)}
                style={{
                  padding: '4px 10px', background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.2)',
                  borderRadius: 6, color: 'var(--accent)', fontSize: 11, cursor: 'pointer',
                }}
              >
                + {cu.name}
              </button>
            ))}
          </div>
          {upsells.map(u => (
            <UpsellEditor
              key={u._key}
              upsell={u}
              onChange={(f, v) => updateUpsell(u._key, f, v)}
              onRemove={() => removeUpsell(u._key)}
            />
          ))}

          {/* Closing message */}
          <Section icon={<AlignLeft size={14} />} label="Closing Message">
            <textarea
              value={closingMessage}
              onChange={e => setClosingMessage(e.target.value)}
              placeholder="Thank you for considering USA Wrap Co…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Section>

          {/* Terms */}
          <Section icon={<AlignLeft size={14} />} label="Terms & Conditions">
            <textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              placeholder="By accepting this proposal, you agree to…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, fontSize: 12 }}
            />
          </Section>

        </div>

        {/* ── Right: Live Preview ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#0A0A0A', scrollbarWidth: 'thin' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 24px' }}>
            {/* Preview header */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 20 }}>
                Customer Preview
              </span>
            </div>

            {/* Logo */}
            <div style={{ textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, color: '#f5f5f5', letterSpacing: '0.02em', marginBottom: 20, marginTop: 16 }}>
              USA WRAP CO
            </div>

            {/* Title */}
            <h2 style={{ textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 800, color: '#f5f5f5', margin: '0 0 8px', lineHeight: 1.2 }}>
              {title || 'Your Custom Wrap Proposal'}
            </h2>

            {customer && (
              <div style={{ textAlign: 'center', fontSize: 14, color: '#a0a0a0', marginBottom: 4 }}>
                Prepared for <strong style={{ color: '#f5f5f5' }}>{customer.name}</strong>
              </div>
            )}

            {expDate && (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 20 }}>
                Valid until {new Date(expDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}

            {message && (
              <div style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12,
                padding: '16px 18px', marginBottom: 20, fontSize: 14, color: '#a0a0a0',
                lineHeight: 1.7, fontStyle: 'italic',
              }}>
                &ldquo;{message}&rdquo;
              </div>
            )}

            {/* Packages */}
            {packages.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginBottom: 12 }}>
                  Choose a Package
                </div>
                {packages.map(pkg => {
                  const sel = previewPkgId === pkg._key
                  return (
                    <div
                      key={pkg._key}
                      onClick={() => setPreviewPkgId(sel ? null : pkg._key)}
                      style={{
                        background: sel ? 'rgba(245,158,11,0.08)' : '#1a1a1a',
                        border: `2px solid ${sel ? '#f59e0b' : '#2a2a2a'}`,
                        borderRadius: 14, padding: '16px 18px', marginBottom: 10,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%',
                              border: `2px solid ${sel ? '#f59e0b' : '#555'}`,
                              background: sel ? '#f59e0b' : 'transparent',
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f5' }}>{pkg.name || 'Package'}</span>
                            {pkg.badge && (
                              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 600 }}>
                                {pkg.badge}
                              </span>
                            )}
                          </div>
                          {pkg.description && <div style={{ fontSize: 13, color: '#a0a0a0', marginLeft: 26, marginBottom: 6 }}>{pkg.description}</div>}
                          {pkg.includes.length > 0 && (
                            <ul style={{ margin: '6px 0 0 26px', padding: 0, listStyle: 'none' }}>
                              {pkg.includes.filter(Boolean).map((inc, i) => (
                                <li key={i} style={{ fontSize: 12, color: '#888', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <CheckCircle size={11} color="#22c07a" style={{ flexShrink: 0 }} />{inc}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                          ${Number(pkg.price || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Upsells */}
            {upsells.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginBottom: 12 }}>
                  Optional Add-Ons
                </div>
                {upsells.map(u => {
                  const sel = previewUpsellKeys.includes(u._key)
                  return (
                    <div
                      key={u._key}
                      onClick={() => setPreviewUpsellKeys(prev => sel ? prev.filter(k => k !== u._key) : [...prev, u._key])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: sel ? 'rgba(34,192,122,0.08)' : '#1a1a1a',
                        border: `1px solid ${sel ? '#22c07a' : '#2a2a2a'}`,
                        borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: `2px solid ${sel ? '#22c07a' : '#555'}`,
                        background: sel ? '#22c07a' : 'transparent',
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {sel && <Check size={11} color="#000" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f5f5' }}>{u.name}</span>
                          {u.badge && (
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(34,192,122,0.2)', color: '#22c07a', fontWeight: 600 }}>{u.badge}</span>
                          )}
                        </div>
                        {u.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{u.description}</div>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#22c07a', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                        +${Number(u.price || 0).toLocaleString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Total calculator */}
            {(previewPkg || previewUpsells.length > 0) && (
              <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginBottom: 10 }}>
                  Summary
                </div>
                {previewPkg && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a0a0a0', marginBottom: 4 }}>
                    <span>{previewPkg.name}</span>
                    <span>${Number(previewPkg.price || 0).toLocaleString()}</span>
                  </div>
                )}
                {previewUpsells.map(u => (
                  <div key={u._key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#a0a0a0', marginBottom: 4 }}>
                    <span>{u.name}</span>
                    <span>+${Number(u.price || 0).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #333', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: '#f5f5f5' }}>
                  <span>Total</span>
                  <span style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>${previewTotal.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4, textAlign: 'right' }}>
                  Deposit to secure: ${Number(depositAmount || 250).toLocaleString()}
                </div>
              </div>
            )}

            {closingMessage && (
              <div style={{ textAlign: 'center', fontSize: 14, color: '#888', lineHeight: 1.7, marginBottom: 16 }}>
                {closingMessage}
              </div>
            )}

            {terms && (
              <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6, borderTop: '1px solid #222', paddingTop: 12, marginTop: 8 }}>
                {terms}
              </div>
            )}

            {/* Accept / Decline preview buttons */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                width: '100%', padding: '15px', border: 'none', borderRadius: 12,
                background: 'linear-gradient(135deg, #22c07a, #16a35e)',
                color: '#fff', fontSize: 15, fontWeight: 800, textAlign: 'center',
                fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em', textTransform: 'uppercase',
                opacity: 0.6,
              }}>
                Accept Proposal
              </div>
              <div style={{
                width: '100%', padding: '12px', border: '1px solid #333', borderRadius: 12,
                background: 'transparent', color: '#666', fontSize: 14, fontWeight: 600, textAlign: 'center',
                opacity: 0.6,
              }}>
                Decline
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#444' }}>
              USA WRAP CO — This preview is interactive. Select packages and add-ons above to see the total.
            </div>
          </div>
        </div>
      </div>

      {/* ── Send Modal ── */}
      {showSend && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowSend(false) }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '28px 28px', width: '100%', maxWidth: 480,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text1)' }}>Send Proposal</h3>
              <button onClick={() => setShowSend(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {sentOk ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={36} color="var(--green)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text1)' }}>Proposal sent!</div>
              </div>
            ) : (
              <>
                {/* Proposal link */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Proposal Link</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input readOnly value={proposalUrl} style={{ ...inputStyle, flex: 1, fontSize: 11, color: 'var(--text3)' }} />
                    <button onClick={copyLink} style={{ ...iconBtnStyle, padding: '0 12px' }}>
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Send Email To</label>
                  <input
                    type="email"
                    value={sendEmail}
                    onChange={e => setSendEmail(e.target.value)}
                    placeholder="customer@email.com"
                    style={inputStyle}
                  />
                </div>

                {/* SMS toggle */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <div
                      onClick={() => setSendSms(!sendSms)}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: sendSms ? 'var(--accent)' : 'var(--surface2)',
                        position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2, left: sendSms ? 18 : 2,
                        transition: 'left 0.2s',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>Also send SMS</span>
                  </label>
                  {sendSms && (
                    <input
                      type="tel"
                      value={sendPhone}
                      onChange={e => setSendPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      style={{ ...inputStyle, marginTop: 8 }}
                    />
                  )}
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending || !sendEmail}
                  style={{
                    width: '100%', padding: '12px', background: 'var(--accent)',
                    border: 'none', borderRadius: 8, color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    opacity: sending || !sendEmail ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Send size={15} />
                  {sending ? 'Sending…' : 'Send Proposal'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, color: 'var(--text2)', fontSize: 12, fontWeight: 600 }}>
        {icon} {label}
      </div>
      {children}
    </div>
  )
}

function SectionHeader({ label, onAdd, addLabel }: { label: string; onAdd: () => void; addLabel: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', letterSpacing: '0.01em' }}>{label}</div>
      <button onClick={onAdd} style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
        background: 'rgba(79,127,255,0.12)', border: '1px solid rgba(79,127,255,0.2)',
        borderRadius: 6, color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>
        <Plus size={12} /> {addLabel}
      </button>
    </div>
  )
}

interface PackageEditorProps {
  pkg: LocalPackage
  collapsed: boolean
  onToggleCollapse: () => void
  onChange: (f: string, v: unknown) => void
  onRemove: () => void
  onAddInclude: () => void
  onUpdateInclude: (i: number, v: string) => void
  onRemoveInclude: (i: number) => void
}

function PackageEditor({ pkg, collapsed, onToggleCollapse, onChange, onRemove, onAddInclude, onUpdateInclude, onRemoveInclude }: PackageEditorProps) {
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      {/* Package header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onToggleCollapse} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        <input
          value={pkg.name || ''}
          onChange={e => onChange('name', e.target.value)}
          placeholder="Package name"
          style={{ ...inputStyle, flex: 1, padding: '5px 10px', fontSize: 13, fontWeight: 600 }}
          onClick={e => e.stopPropagation()}
        />
        <input
          type="number"
          value={pkg.price || ''}
          onChange={e => onChange('price', e.target.value)}
          placeholder="Price"
          style={{ ...inputStyle, width: 90, padding: '5px 10px', fontSize: 13, textAlign: 'right' }}
          onClick={e => e.stopPropagation()}
        />
        <button onClick={onRemove} style={{ ...iconBtnStyle, color: 'var(--red)' }}>
          <Trash2 size={13} />
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: '12px 14px' }}>
          {/* Description */}
          <textarea
            value={pkg.description || ''}
            onChange={e => onChange('description', e.target.value)}
            placeholder="Package description…"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }}
          />

          {/* Badge */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Badge</div>
              <select value={pkg.badge || ''} onChange={e => onChange('badge', e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
                {BADGE_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>

          {/* What's included */}
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>What&apos;s Included</div>
          {pkg.includes.map((inc, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={inc}
                onChange={e => onUpdateInclude(i, e.target.value)}
                placeholder={`Item ${i + 1}`}
                style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              />
              <button onClick={() => onRemoveInclude(i)} style={iconBtnStyle}>
                <X size={12} />
              </button>
            </div>
          ))}
          <button onClick={onAddInclude} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            + Add item
          </button>
        </div>
      )}
    </div>
  )
}

function UpsellEditor({ upsell, onChange, onRemove }: { upsell: LocalUpsell; onChange: (f: string, v: unknown) => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={upsell.name || ''}
            onChange={e => onChange('name', e.target.value)}
            placeholder="Add-on name"
            style={{ ...inputStyle, flex: 1, fontSize: 13, fontWeight: 600 }}
          />
          <input
            type="number"
            value={upsell.price || ''}
            onChange={e => onChange('price', e.target.value)}
            placeholder="Price"
            style={{ ...inputStyle, width: 90, textAlign: 'right' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={upsell.description || ''}
            onChange={e => onChange('description', e.target.value)}
            placeholder="Description (optional)"
            style={{ ...inputStyle, flex: 1, fontSize: 12 }}
          />
          <select value={upsell.badge || ''} onChange={e => onChange('badge', e.target.value)} style={{ ...inputStyle, width: 120, fontSize: 12 }}>
            {BADGE_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </div>
      <button onClick={onRemove} style={{ ...iconBtnStyle, color: 'var(--red)', marginTop: 2 }}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Shared styles ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 7, color: 'var(--text1)', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, background: 'var(--surface2)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
  color: 'var(--text3)', cursor: 'pointer', flexShrink: 0,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text2)', marginBottom: 6,
}
