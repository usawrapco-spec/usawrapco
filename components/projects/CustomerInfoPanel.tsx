'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Building2, Phone, Mail, TrendingUp, History, X, ExternalLink, Copy } from 'lucide-react'
import ClickToCallButton from '@/components/phone/ClickToCallButton'
import type { Profile } from '@/types'

interface CustomerInfoPanelProps {
  project: any
  profile: Profile
}

export default function CustomerInfoPanel({ project, profile }: CustomerInfoPanelProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const customer = project.customer || {}
  const supabase = createClient()

  const loadHistory = async () => {
    if (historyData) {
      setShowHistory(true)
      return
    }

    setLoading(true)
    try {
      // Fetch all jobs for this customer
      const { data: customerJobs } = await supabase
        .from('projects')
        .select('*')
        .eq('customer_id', project.customer_id)
        .order('created_at', { ascending: false })

      // Fetch similar jobs (same vehicle type)
      const { data: similarJobs } = await supabase
        .from('projects')
        .select('*, customer:customer_id(name)')
        .neq('customer_id', project.customer_id)
        .ilike('vehicle_desc', `%${project.vehicle_desc?.split(' ')[0] || ''}%`)
        .limit(10)

      // Calculate customer metrics
      const completedJobs = customerJobs?.filter(j => j.status === 'closed') || []
      const customerAvgRevenue = completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => sum + (j.revenue || 0), 0) / completedJobs.length
        : 0
      const customerAvgGPM = completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => sum + (j.gpm || 0), 0) / completedJobs.length
        : 0

      // Calculate shop averages
      const { data: shopJobs } = await supabase
        .from('projects')
        .select('revenue, gpm, actuals')
        .eq('org_id', profile.org_id)
        .eq('status', 'closed')
        .limit(100)

      const shopAvgRevenue = shopJobs && shopJobs.length > 0
        ? shopJobs.reduce((sum, j) => sum + (j.revenue || 0), 0) / shopJobs.length
        : 0
      const shopAvgGPM = shopJobs && shopJobs.length > 0
        ? shopJobs.reduce((sum, j) => sum + (j.gpm || 0), 0) / shopJobs.length
        : 0

      setHistoryData({
        customerJobs: customerJobs || [],
        similarJobs: similarJobs || [],
        customerAvgRevenue,
        customerAvgGPM,
        shopAvgRevenue,
        shopAvgGPM,
      })
      setShowHistory(true)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  const getLoyaltyColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return '#e5e4e2'
      case 'gold': return '#ffd700'
      case 'silver': return '#c0c0c0'
      default: return '#cd7f32'
    }
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <>
      {/* Customer Info Strip */}
      <div className="card p-4 mb-4" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface2)' }}>
              <User size={20} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-700 text-text1 truncate">{customer.name || 'Unknown Customer'}</h3>
                {customer.loyalty_tier && (
                  <span
                    className="text-xs font-700 px-2 py-0.5 rounded-full"
                    style={{
                      background: `${getLoyaltyColor(customer.loyalty_tier)}20`,
                      color: getLoyaltyColor(customer.loyalty_tier),
                    }}
                  >
                    {customer.loyalty_tier.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-text3 flex-wrap">
                {customer.company_name && (
                  <span className="flex items-center gap-1">
                    <Building2 size={12} />
                    {customer.company_name}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-2">
                    <Phone size={12} />
                    {customer.phone}
                    <ClickToCallButton
                      toNumber={customer.phone}
                      toName={customer.name}
                      projectId={project.id}
                      size="sm"
                    />
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {customer.email}
                  </span>
                )}
                {customer.lifetime_spend > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {formatMoney(customer.lifetime_spend)} lifetime
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={loadHistory}
            disabled={loading}
            className="btn-secondary text-sm shrink-0"
          >
            <History size={16} />
            {loading ? 'Loading...' : 'View Job History'}
          </button>
        </div>
      </div>

      {/* Job History Slide-over */}
      {showHistory && historyData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowHistory(false)}
        >
          <div
            className="h-full w-full max-w-2xl overflow-y-auto"
            style={{ background: 'var(--bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-border" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-900 text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                    Job History
                  </h2>
                  <p className="text-sm text-text3 mt-1">{customer.name}</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-surface2 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* This Customer's History */}
              <div>
                <h3 className="text-sm font-700 text-text2 uppercase tracking-wide mb-3">
                  This Customer's Jobs ({historyData.customerJobs.length})
                </h3>
                <div className="space-y-2">
                  {historyData.customerJobs.map((job: any) => (
                    <div
                      key={job.id}
                      className="card p-4 hover:border-accent/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/projects/${job.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-700 text-text1">
                              {job.vehicle_desc || 'Vehicle Wrap'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              job.status === 'closed' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                          <div className="text-xs text-text3">
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-700 text-text1">{formatMoney(job.revenue || 0)}</div>
                          {job.gpm && (
                            <div className="text-xs text-text3">{job.gpm.toFixed(1)}% GPM</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar Jobs */}
              {historyData.similarJobs.length > 0 && (
                <div>
                  <h3 className="text-sm font-700 text-text2 uppercase tracking-wide mb-3">
                    Similar Jobs (Other Customers)
                  </h3>
                  <div className="space-y-2">
                    {historyData.similarJobs.slice(0, 5).map((job: any) => (
                      <div key={job.id} className="card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-600 text-text1 mb-1">
                              {job.vehicle_desc || 'Vehicle Wrap'}
                            </div>
                            <div className="text-xs text-text3">
                              {job.customer?.name || 'Unknown'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-700 text-text1">{formatMoney(job.revenue || 0)}</div>
                            {job.gpm && (
                              <div className="text-xs text-text3">{job.gpm.toFixed(1)}% GPM</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics Comparison */}
              <div>
                <h3 className="text-sm font-700 text-text2 uppercase tracking-wide mb-3">
                  Metrics Comparison
                </h3>
                <div className="card p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-text3 uppercase">
                        <th className="text-left pb-3">Metric</th>
                        <th className="text-right pb-3">This Job</th>
                        <th className="text-right pb-3">Customer Avg</th>
                        <th className="text-right pb-3">Shop Avg</th>
                      </tr>
                    </thead>
                    <tbody className="text-text1">
                      <tr className="border-t border-border">
                        <td className="py-2">Sale Price</td>
                        <td className="text-right">{formatMoney(project.revenue || 0)}</td>
                        <td className="text-right">{formatMoney(historyData.customerAvgRevenue)}</td>
                        <td className="text-right">{formatMoney(historyData.shopAvgRevenue)}</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="py-2">GPM %</td>
                        <td className="text-right">{(project.gpm || 0).toFixed(1)}%</td>
                        <td className="text-right">{historyData.customerAvgGPM.toFixed(1)}%</td>
                        <td className="text-right">{historyData.shopAvgGPM.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
