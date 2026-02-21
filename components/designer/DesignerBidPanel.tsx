'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Package, AlertTriangle, Star, Send } from 'lucide-react'

interface DesignerBidPanelProps {
  projectId: string
  orgId: string
  project: any
  teammates: any[]
}

const SPECIALTIES = [
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'boats', label: 'Boats' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'complex_curves', label: 'Complex Curves' },
  { key: 'lettering', label: 'Lettering' },
  { key: 'color_change', label: 'Color Change' },
  { key: 'ppf', label: 'PPF' },
]

export default function DesignerBidPanel({ projectId, orgId, project, teammates }: DesignerBidPanelProps) {
  const [bids, setBids] = useState<any[]>([])
  const [designers, setDesigners] = useState<any[]>([])
  const [selectedDesigners, setSelectedDesigners] = useState<Set<string>>(new Set())
  const [firstChoice, setFirstChoice] = useState<string | null>(null)
  const [deadline, setDeadline] = useState('')
  const [bidExpiry, setBidExpiry] = useState('48') // hours
  const [allowCounter, setAllowCounter] = useState(true)
  const [sending, setSending] = useState(false)
  const [showPackage, setShowPackage] = useState(false)
  const supabase = createClient()

  const fd = (project.form_data as any) || {}

  useEffect(() => {
    const load = async () => {
      // Load existing bids
      const { data: b } = await supabase
        .from('designer_bids')
        .select('*, designer:designer_id(id, name, email)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (b) setBids(b)

      // Load designers
      const designerTeam = teammates.filter(t => ['designer', 'production', 'admin'].includes(t.role))
      setDesigners(designerTeam)
    }
    load()
  }, [projectId])

  // Build design package from job data
  const designPackage = {
    client: fd.client || project.title,
    vehicle: fd.vehicle || project.vehicle_desc,
    vehicleColor: fd.vehicleColor || '',
    jobType: fd.jobType || 'Commercial',
    wrapDetail: fd.wrapDetail || 'Full Wrap',
    coverage: fd.coverage || '',
    exclusions: fd.exclusions || '',
    designNotes: fd.designNotes || '',
    brandColors: fd.brandColors || '',
    brandFonts: fd.brand_fonts || '',
    driveLink: fd.driveLink || '',
    sqft: fd.sqft || '',
  }

  const packageComplete = designPackage.client && designPackage.vehicle && designPackage.wrapDetail

  const toggleDesigner = (id: string) => {
    const ns = new Set(selectedDesigners)
    ns.has(id) ? ns.delete(id) : ns.add(id)
    setSelectedDesigners(ns)
  }

  const sendBids = async () => {
    if (selectedDesigners.size === 0) return
    setSending(true)

    const expiresAt = new Date(Date.now() + parseInt(bidExpiry) * 60 * 60 * 1000).toISOString()

    const inserts = Array.from(selectedDesigners).map(designerId => ({
      org_id: orgId,
      project_id: projectId,
      designer_id: designerId,
      is_first_choice: designerId === firstChoice,
      package_data: designPackage,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      bid_expires_at: expiresAt,
    }))

    const { data } = await supabase.from('designer_bids').insert(inserts).select('*, designer:designer_id(id, name)')
    if (data) setBids(prev => [...data, ...prev])

    // Update production status
    const newFd = { ...fd, production_status: 'needed' }
    await supabase.from('projects').update({ form_data: newFd, updated_at: new Date().toISOString() }).eq('id', projectId)

    setSending(false)
    setSelectedDesigners(new Set())
  }

  const activeBids = bids.filter(b => ['pending', 'counter'].includes(b.status))
  const acceptedBid = bids.find(b => b.status === 'accepted' || b.status === 'assigned')

  const acceptBid = async (bidId: string) => {
    await supabase.from('designer_bids').update({ status: 'assigned', accepted_at: new Date().toISOString() }).eq('id', bidId)
    // Decline others
    const otherBids = bids.filter(b => b.id !== bidId && b.status === 'pending')
    for (const b of otherBids) {
      await supabase.from('designer_bids').update({ status: 'declined' }).eq('id', b.id)
    }
    setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: 'assigned' } : b.status === 'pending' ? { ...b, status: 'declined' } : b))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Accepted designer */}
      {acceptedBid && (
        <div style={{ padding: 16, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 8, display:'flex', alignItems:'center', gap:4 }}><Check size={12} /> Designer Assigned</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)' }}>
            {(acceptedBid.designer as any)?.name}
          </div>
          {acceptedBid.deadline && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Art due: {new Date(acceptedBid.deadline).toLocaleDateString()}</div>
          )}
        </div>
      )}

      {/* Design Package Preview */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <button onClick={() => setShowPackage(!showPackage)} style={{
          width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)', display:'flex', alignItems:'center', gap:4 }}><Package size={13} /> Design Package</span>
          <span style={{ fontSize: 10, color: packageComplete ? 'var(--green)' : '#f59e0b', fontWeight: 700, display:'flex', alignItems:'center', gap:4 }}>
            {packageComplete ? <><Check size={10} /> Ready to send</> : <><AlertTriangle size={10} /> Missing required info</>}
          </span>
        </button>
        {showPackage && (
          <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <PackageField label="Client" value={designPackage.client} />
            <PackageField label="Vehicle" value={designPackage.vehicle} />
            <PackageField label="Type" value={`${designPackage.jobType} · ${designPackage.wrapDetail}`} />
            <PackageField label="Sqft" value={designPackage.sqft || 'Not set'} />
            <PackageField label="Colors" value={designPackage.brandColors || 'Not set'} />
            <PackageField label="Drive Link" value={designPackage.driveLink || 'None'} />
            <div style={{ gridColumn: '1 / -1' }}>
              <PackageField label="Coverage" value={designPackage.coverage || 'Not specified'} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <PackageField label="Design Notes" value={designPackage.designNotes || 'None'} />
            </div>
          </div>
        )}
      </div>

      {/* Active bids */}
      {activeBids.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>
            Active Bids ({activeBids.length})
          </div>
          {activeBids.map(bid => (
            <div key={bid.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 6,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                  {(bid.designer as any)?.name}
                  {bid.is_first_choice && <span style={{ fontSize: 9, color: '#f59e0b', marginLeft: 6, display:'inline-flex', alignItems:'center', gap:3 }}><Star size={9} fill="#f59e0b" /> FIRST CHOICE</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                  {bid.status === 'counter' ? `Counter: ${bid.counter_terms}` : 'Awaiting response'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {bid.status === 'counter' && (
                  <button onClick={() => acceptBid(bid.id)} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: 'var(--green)', color: '#0d1a10', border: 'none', cursor: 'pointer',
                  }}>Accept</button>
                )}
                <button onClick={() => acceptBid(bid.id)} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                }}>Assign</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send new bids */}
      {!acceptedBid && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>
            Send to Designers
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {designers.map(d => (
              <label key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: selectedDesigners.has(d.id) ? 'rgba(79,127,255,0.06)' : 'var(--surface2)',
                border: `1px solid ${selectedDesigners.has(d.id) ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
              }}>
                <input type="checkbox" checked={selectedDesigners.has(d.id)} onChange={() => toggleDesigner(d.id)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{d.role}</div>
                </div>
                <button onClick={e => { e.preventDefault(); setFirstChoice(firstChoice === d.id ? null : d.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: firstChoice === d.id ? 1 : 0.3, color: '#f59e0b' }}>
                  <Star size={16} fill={firstChoice === d.id ? '#f59e0b' : 'none'} />
                </button>
              </label>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Art Due By</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text1)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Bid Expires In</label>
              <select value={bidExpiry} onChange={e => setBidExpiry(e.target.value)}
                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text1)' }}>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)', cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={allowCounter} onChange={e => setAllowCounter(e.target.checked)} />
            Allow counter-terms from designers
          </label>

          <button onClick={sendBids} disabled={selectedDesigners.size === 0 || !packageComplete || sending}
            style={{
              width: '100%', padding: '12px 24px', borderRadius: 10, fontWeight: 800, fontSize: 13,
              cursor: 'pointer', border: 'none',
              background: selectedDesigners.size > 0 && packageComplete ? '#8b5cf6' : 'var(--surface2)',
              color: selectedDesigners.size > 0 && packageComplete ? '#fff' : 'var(--text3)',
            }}>
            {sending ? 'Sending...' : <><Send size={13} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} /> Send Package to {selectedDesigners.size} Designer{selectedDesigners.size !== 1 ? 's' : ''}</>}
          </button>
        </div>
      )}
    </div>
  )
}

function PackageField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>{value}</div>
    </div>
  )
}
