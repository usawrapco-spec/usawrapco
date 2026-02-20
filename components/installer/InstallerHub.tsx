'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface InstallerHubProps {
  orgId: string
  profileId: string
  installerName: string
}

export default function InstallerHub({ orgId, profileId, installerName }: InstallerHubProps) {
  const [tab, setTab] = useState<'available' | 'my_jobs' | 'earnings'>('available')
  const [availableBids, setAvailableBids] = useState<any[]>([])
  const [myBids, setMyBids] = useState<any[]>([])
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      // Available bids sent to this installer
      const { data: bids } = await supabase
        .from('installer_bids')
        .select('*, project:project_id(id, title, form_data, fin_data, revenue, profit, install_date, vehicle_desc, pipe_stage)')
        .eq('org_id', orgId)
        .eq('installer_id', profileId)
        .order('created_at', { ascending: false })

      if (bids) {
        setAvailableBids(bids.filter(b => b.status === 'pending'))
        setMyBids(bids.filter(b => b.status === 'accepted'))
      }

      // My assigned projects
      const { data: jobs } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', orgId)
        .eq('installer_id', profileId)
        .in('pipe_stage', ['install', 'prod_review', 'sales_close'])
        .order('install_date', { ascending: true, nullsFirst: false })

      if (jobs) setMyJobs(jobs)
      setLoading(false)
    }
    load()

    const channel = supabase.channel('installer-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installer_bids', filter: `installer_id=eq.${profileId}` }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId, profileId])

  const acceptBid = async (bid: any) => {
    await supabase.from('installer_bids').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      liability_accepted: true,
    }).eq('id', bid.id)

    // Assign installer to project
    await supabase.from('projects').update({
      installer_id: profileId,
      updated_at: new Date().toISOString(),
    }).eq('id', bid.project_id)

    setAvailableBids(prev => prev.filter(b => b.id !== bid.id))
    setMyBids(prev => [{ ...bid, status: 'accepted' }, ...prev])
  }

  const declineBid = async (bid: any) => {
    await supabase.from('installer_bids').update({
      status: 'declined',
      declined_at: new Date().toISOString(),
    }).eq('id', bid.id)

    setAvailableBids(prev => prev.filter(b => b.id !== bid.id))
  }

  // Earnings calculation
  const completedJobs = myJobs.filter(j => ['prod_review', 'sales_close'].includes(j.pipe_stage))
  const totalEarned = completedJobs.reduce((sum, j) => {
    const fin = (j.fin_data as any) || {}
    return sum + (fin.labor || fin.install_pay || 0)
  }, 0)
  const pendingPay = myJobs.filter(j => j.pipe_stage === 'install').reduce((sum, j) => {
    const fin = (j.fin_data as any) || {}
    return sum + (fin.labor || fin.install_pay || 0)
  }, 0)
  const totalHours = completedJobs.reduce((sum, j) => sum + (j.actual_hours || 0), 0)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text1)' }}>🔧 Installer Hub</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{installerName}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16,
      }}>
        <StatCard label="Available Bids" value={availableBids.length.toString()} color="#4f7fff" />
        <StatCard label="Active Jobs" value={myJobs.filter(j => j.pipe_stage === 'install').length.toString()} color="#22d3ee" />
        <StatCard label="Completed" value={completedJobs.length.toString()} color="#22c55e" />
        <StatCard label="Earned" value={`$${Math.round(totalEarned).toLocaleString()}`} color="#22c55e" />
        <StatCard label="Pending Pay" value={`$${Math.round(pendingPay).toLocaleString()}`} color="#f59e0b" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: 4, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
        {(['available', 'my_jobs', 'earnings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t ? 800 : 600,
            background: tab === t ? 'var(--accent)15' : 'transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text3)',
          }}>
            {t === 'available' ? `📋 Available (${availableBids.length})` : t === 'my_jobs' ? `🔧 My Jobs (${myJobs.length})` : '💰 Earnings'}
          </button>
        ))}
      </div>

      {/* Available Bids */}
      {tab === 'available' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {availableBids.length === 0 && <Empty msg="No available bids right now. Check back soon!" />}
          {availableBids.map(bid => {
            const proj = bid.project as any
            const fd = (proj?.form_data as any) || {}
            const fin = (proj?.fin_data as any) || {}
            const expiresIn = bid.bid_expires_at ? Math.max(0, Math.ceil((new Date(bid.bid_expires_at).getTime() - Date.now()) / 3600000)) : null

            return (
              <div key={bid.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)' }}>{fd.client || proj?.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fd.vehicle || proj?.vehicle_desc} · {fd.wrapDetail || 'Wrap'}</div>
                  </div>
                  {expiresIn !== null && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6, height: 'fit-content',
                      background: expiresIn < 12 ? '#ef444420' : '#f59e0b15',
                      color: expiresIn < 12 ? '#ef4444' : '#f59e0b',
                    }}>
                      {expiresIn}h left
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  <MiniStat label="Your Pay" value={`$${bid.pay_amount || fin.labor || 0}`} color="var(--green)" />
                  <MiniStat label="Hours Budget" value={`${bid.hours_budget || fin.hours || 0}h`} color="var(--cyan)" />
                  <MiniStat label="$/hr" value={`$${bid.hours_budget ? Math.round((bid.pay_amount || fin.labor) / bid.hours_budget) : 0}`} color="var(--text1)" />
                  <MiniStat label="Install Date" value={proj?.install_date ? new Date(proj.install_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'} color="#4f7fff" />
                </div>

                {/* Scope */}
                {(fd.coverage || fd.exclusions) && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 10px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 12 }}>
                    {fd.coverage && <div>✓ Wrap: {fd.coverage}</div>}
                    {fd.exclusions && <div>✗ Exclude: {fd.exclusions}</div>}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => acceptBid(bid)} style={{
                    flex: 1, padding: '12px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                    cursor: 'pointer', border: 'none', background: '#22c55e', color: '#0d1a10',
                  }}>
                    ✓ Accept Job
                  </button>
                  <button onClick={() => declineBid(bid)} style={{
                    padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)',
                  }}>
                    ✗ Pass
                  </button>
                </div>

                {/* Liability note */}
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>
                  By accepting, you agree to material responsibility per the installer agreement.
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* My Jobs */}
      {tab === 'my_jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myJobs.length === 0 && <Empty msg="No jobs assigned yet." />}
          {myJobs.map(job => {
            const fd = (job.form_data as any) || {}
            const fin = (job.fin_data as any) || {}
            return (
              <div key={job.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{fd.client || job.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fd.vehicle || job.vehicle_desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <MiniStat label="Pay" value={`$${fin.labor || 0}`} color="var(--green)" />
                  <MiniStat label="Date" value={job.install_date ? new Date(job.install_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'} color="#4f7fff" />
                  <StagePill stage={job.pipe_stage} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Earnings */}
      {tab === 'earnings' && (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20,
          }}>
            <StatCard label="Total Earned" value={`$${Math.round(totalEarned).toLocaleString()}`} color="#22c55e" />
            <StatCard label="Total Hours" value={`${Math.round(totalHours)}h`} color="#22d3ee" />
            <StatCard label="Avg $/hr" value={`$${totalHours > 0 ? Math.round(totalEarned / totalHours) : 0}`} color="var(--text1)" />
          </div>

          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>
            Completed Jobs
          </div>
          {completedJobs.map(job => {
            const fd = (job.form_data as any) || {}
            const fin = (job.fin_data as any) || {}
            return (
              <div key={job.id} style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{fd.client || job.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{fd.vehicle}</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <MiniStat label="Paid" value={`$${fin.labor || 0}`} color="var(--green)" />
                  <MiniStat label="Hours" value={`${job.actual_hours || 0}h`} color="var(--cyan)" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function StagePill({ stage }: { stage: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    install: { bg: '#22d3ee15', color: '#22d3ee', label: 'Install' },
    prod_review: { bg: '#f59e0b15', color: '#f59e0b', label: 'QC' },
    sales_close: { bg: '#8b5cf615', color: '#8b5cf6', label: 'Closing' },
  }
  const c = config[stage] || { bg: 'var(--surface2)', color: 'var(--text3)', label: stage }
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: c.bg, color: c.color }}>{c.label}</span>
  )
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>{msg}</div>
}
