'use client'

import { useState, useMemo } from 'react'
import type { Profile } from '@/types'
import { Plus, Users, DollarSign, TrendingUp, UserPlus, Search, CheckCircle, Clock } from 'lucide-react'
import PortalLinkCopier from './PortalLinkCopier'
import AddAffiliateModal from './AddAffiliateModal'

interface SalesAgentHubClientProps {
  profile: Profile
  agents: any[]
  commissions: any[]
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function SalesAgentHubClient({ profile, agents: initial, commissions }: SalesAgentHubClientProps) {
  const [agents, setAgents] = useState(initial)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    if (!search) return agents
    const q = search.toLowerCase()
    return agents.filter(a => a.name?.toLowerCase().includes(q) || a.company?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q))
  }, [agents, search])

  const active = agents.filter(a => a.status === 'active').length
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0)
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0)

  const STATS = [
    { label: 'Total Agents', value: agents.length, color: 'var(--cyan)', Icon: Users },
    { label: 'Active', value: active, color: 'var(--green)', Icon: CheckCircle },
    { label: 'Pending Commission', value: fM(totalPending), color: 'var(--amber)', Icon: Clock },
    { label: 'Total Paid', value: fM(totalPaid), color: 'var(--green)', Icon: TrendingUp },
  ]

  function getJobCount(agentId: string) {
    return commissions.filter(c => c.affiliate_id === agentId).length
  }

  function getAgentCommission(agentId: string) {
    return commissions.filter(c => c.affiliate_id === agentId).reduce((s, c) => s + (c.amount || 0), 0)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', lineHeight: 1 }}>
            Sales Agent Portal
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Manage outbound sales agents and their portal access
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          <Plus size={15} />New Agent
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {STATS.map(({ label, value, color, Icon }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={16} color={color} />
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} color="var(--text3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents..."
          style={{ width: '100%', padding: '9px 12px 9px 34px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Agent', 'Status', 'Jobs Referred', 'Commission', 'Portal Link'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  {search ? 'No agents match your search' : 'No sales agents yet. Add your first outbound agent to get started.'}
                </td>
              </tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{a.name}</div>
                  {a.company && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.company}</div>}
                  {a.email && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.email}</div>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: a.status === 'active' ? 'rgba(34,192,122,.15)' : 'rgba(245,158,11,.15)',
                    color: a.status === 'active' ? 'var(--green)' : 'var(--amber)',
                    textTransform: 'capitalize',
                  }}>
                    {a.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                  {getJobCount(a.id)}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>
                  {fM(getAgentCommission(a.id))}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {a.portal_token
                    ? <PortalLinkCopier token={a.portal_token} portalType="sales-agent" />
                    : <span style={{ fontSize: 11, color: 'var(--text3)' }}>No token</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddAffiliateModal
          type="sales_agent"
          onClose={() => setShowAdd(false)}
          onCreated={(a) => { setAgents(prev => [a, ...prev]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}
