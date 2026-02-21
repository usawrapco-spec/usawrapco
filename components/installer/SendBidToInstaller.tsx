'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

interface SendBidToInstallerProps {
  projectId: string
  orgId: string
  project: any
  teammates: any[]
}

export default function SendBidToInstaller({ projectId, orgId, project, teammates }: SendBidToInstallerProps) {
  const [bids, setBids] = useState<any[]>([])
  const [selectedInstallers, setSelectedInstallers] = useState<Set<string>>(new Set())
  const [bidExpiry, setBidExpiry] = useState('48')
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  const installers = teammates.filter(t => ['installer'].includes(t.role))
  const fd = (project.form_data as any) || {}
  const fin = (project.fin_data as any) || {}

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('installer_bids')
        .select('*, installer:installer_id(id, name, full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (data) setBids(data)
    }
    load()
  }, [projectId])

  const toggleInstaller = (id: string) => {
    const ns = new Set(selectedInstallers)
    ns.has(id) ? ns.delete(id) : ns.add(id)
    setSelectedInstallers(ns)
  }

  const sendBids = async () => {
    if (selectedInstallers.size === 0) return
    setSending(true)

    const expiresAt = new Date(Date.now() + parseInt(bidExpiry) * 60 * 60 * 1000).toISOString()

    const inserts = Array.from(selectedInstallers).map(installerId => ({
      org_id: orgId,
      project_id: projectId,
      installer_id: installerId,
      pay_amount: fin.labor || fin.install_pay || 0,
      hours_budget: fin.hours || 0,
      bid_expires_at: expiresAt,
    }))

    const { data } = await supabase.from('installer_bids').insert(inserts).select('*, installer:installer_id(id, name, full_name)')
    if (data) setBids(prev => [...data, ...prev])

    setSending(false)
    setSelectedInstallers(new Set())
  }

  const acceptedBid = bids.find(b => b.status === 'accepted')
  const activeBids = bids.filter(b => b.status === 'pending')

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text1)', marginBottom: 12 }}>Installer Assignment</div>

      {/* Accepted */}
      {acceptedBid && (
        <div style={{ padding: 12, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', display:'flex', alignItems:'center', gap:4 }}><Check size={11} /> Installer Assigned</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginTop: 4 }}>
            {(acceptedBid.installer as any)?.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Pay: ${acceptedBid.pay_amount} · {acceptedBid.hours_budget}h budget · Liability: {acceptedBid.liability_accepted ? 'Accepted' : 'Pending'}
          </div>
        </div>
      )}

      {/* Active bids */}
      {activeBids.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>
            Pending Bids ({activeBids.length})
          </div>
          {activeBids.map(bid => (
            <div key={bid.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 4,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                {(bid.installer as any)?.name}
              </div>
              <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>Awaiting</span>
            </div>
          ))}
        </div>
      )}

      {/* Send new bids */}
      {!acceptedBid && (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>
              Job Details
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text2)' }}>
              <span>Pay: <strong style={{ color: 'var(--green)' }}>${fin.labor || fin.install_pay || 0}</strong></span>
              <span>Hours: <strong>{fin.hours || 0}h</strong></span>
              <span>Vehicle: <strong>{fd.vehicle || project.vehicle_desc || '—'}</strong></span>
              <span>Type: <strong>{fd.wrapDetail || 'Wrap'}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {installers.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                No installers in your team yet. Add them in the Employees page.
              </div>
            )}
            {installers.map(inst => {
              const alreadySent = bids.some(b => b.installer_id === inst.id)
              return (
                <label key={inst.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: selectedInstallers.has(inst.id) ? 'rgba(34,211,238,0.06)' : 'var(--surface2)',
                  border: `1px solid ${selectedInstallers.has(inst.id) ? '#22d3ee' : 'var(--border)'}`,
                  borderRadius: 8, cursor: alreadySent ? 'default' : 'pointer',
                  opacity: alreadySent ? 0.5 : 1,
                }}>
                  <input type="checkbox" disabled={alreadySent} checked={selectedInstallers.has(inst.id)}
                    onChange={() => toggleInstaller(inst.id)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{inst.name}</div>
                  </div>
                  {alreadySent && <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>Bid Sent</span>}
                </label>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Bid Expires In</label>
              <select value={bidExpiry} onChange={e => setBidExpiry(e.target.value)}
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text1)' }}>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">1 week</option>
              </select>
            </div>
          </div>

          <button onClick={sendBids} disabled={selectedInstallers.size === 0 || sending}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 10, fontWeight: 800, fontSize: 13,
              cursor: 'pointer', border: 'none',
              background: selectedInstallers.size > 0 ? '#22d3ee' : 'var(--surface2)',
              color: selectedInstallers.size > 0 ? '#0a2540' : 'var(--text3)',
            }}>
            {sending ? 'Sending...' : `Send Bid to ${selectedInstallers.size} Installer${selectedInstallers.size !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}
