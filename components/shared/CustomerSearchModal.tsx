'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface CustomerRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  lifetime_spend: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  orgId: string
  onSelect: (c: CustomerRow) => void
}

export default function CustomerSearchModal({ open, onClose, orgId, onSelect }: Props) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerRow[]>([])
  const [searching, setSearching] = useState(false)
  const [createMode, setCreateMode] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setCreateMode(false)
      setNewName(''); setNewCompany(''); setNewPhone(''); setNewEmail('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (!q) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const like = `%${q}%`
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, phone, company_name, lifetime_spend')
        .eq('org_id', orgId)
        .or(`name.ilike.${like},company_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
        .order('name')
        .limit(20)
      setResults((data as CustomerRow[]) || [])
      setSearching(false)
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, orgId])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('customers')
      .insert({
        org_id: orgId,
        name: newName.trim(),
        company_name: newCompany.trim() || null,
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
      })
      .select('id, name, email, phone, company_name, lifetime_spend')
      .single()
    setCreating(false)
    if (!error && data) onSelect(data as CustomerRow)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      <div
        style={{
          position: 'relative', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em' }}>
              {createMode ? 'New Customer' : 'Find Customer'}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}>×</button>
          </div>
          {!createMode && (
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search name, company, phone, email…"
                style={inputStyle}
              />
              {searching && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'csm-spin 0.6s linear infinite',
                }} />
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {!createMode ? (
            <>
              {results.length === 0 && !query.trim() && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Type to search customers</div>
              )}
              {results.length === 0 && query.trim() && !searching && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No customers found</div>
              )}
              {results.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,127,255,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,127,255,0.2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{c.name}</span>
                    {c.lifetime_spend != null && c.lifetime_spend > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                        ${c.lifetime_spend.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {c.company_name && <span style={{ fontSize: 11, color: 'var(--cyan)' }}>{c.company_name}</span>}
                    {c.phone && <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>{c.phone}</span>}
                    {c.email && <span style={{ fontSize: 11, color: 'var(--text2)' }}>{c.email}</span>}
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Name *', val: newName, set: setNewName },
                { label: 'Company', val: newCompany, set: setNewCompany },
                { label: 'Phone', val: newPhone, set: setNewPhone },
                { label: 'Email', val: newEmail, set: setNewEmail },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: 'Barlow Condensed, sans-serif' }}>{label}</div>
                  <input value={val} onChange={e => set(e.target.value)} style={inputStyle} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {!createMode ? (
            <>
              <button
                onClick={() => setCreateMode(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)', color: 'var(--green)' }}
              >
                <Plus size={12} /> Create New Customer
              </button>
              <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text2)' }}>Cancel</button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCreateMode(false)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text2)' }}
              >
                Back to Search
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{ padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: newName.trim() ? 'var(--green)' : 'rgba(34,192,122,0.3)', border: 'none', color: '#fff', opacity: creating ? 0.7 : 1 }}
              >
                {creating ? 'Creating…' : 'Create & Link'}
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes csm-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  )
}
