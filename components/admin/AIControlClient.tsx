'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Activity, Zap, Clock, CheckCircle, AlertTriangle,
  Play, ToggleLeft, ToggleRight, ChevronDown, X, Star,
  TrendingUp, DollarSign, Cpu
} from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
}

interface PipelineConfig {
  id: string
  pipeline_step: string
  step_label: string
  primary_model: string
  fallback_model: string | null
  enabled: boolean
  cost_per_call: number
  avg_latency_ms: number
  success_rate: number
  total_calls: number
  org_id?: string
}

interface UsageLog {
  id: string
  pipeline_step: string
  model_used: string
  success: boolean
  latency_ms: number
  cost: number
  cost_usd: number
  created_at: string
}

const MODEL_OPTIONS = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'flux-1.1-pro-ultra',
  'flux-1.1-pro',
  'flux-dev',
  'flux-schnell',
  'clarity-upscaler',
  'real-esrgan',
]

export default function AIControlClient({ profile }: Props) {
  const supabase = createClient()

  const [pipelineConfigs, setPipelineConfigs] = useState<PipelineConfig[]>([])
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([])
  const [todayStats, setTodayStats] = useState({ spend: 0, calls: 0, successRate: 0, avgLatency: 0 })
  const [monthStats, setMonthStats] = useState({ spend: 0, calls: 0 })
  const [monthlyBudget] = useState(500)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [selectedModelType, setSelectedModelType] = useState<'primary' | 'fallback'>('primary')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Load pipeline configs
    const { data: configs } = await supabase
      .from('ai_pipeline_config')
      .select('*')
      .order('created_at', { ascending: true })

    if (configs) {
      // Map to expected shape, filling defaults
      const mapped: PipelineConfig[] = configs.map((c: any) => ({
        id: c.id,
        pipeline_step: c.pipeline_step || c.action_name || '',
        step_label: c.step_label || c.action_name || '',
        primary_model: c.primary_model || 'claude-sonnet-4-6',
        fallback_model: c.fallback_model || null,
        enabled: c.enabled ?? true,
        cost_per_call: c.cost_per_call || 0,
        avg_latency_ms: c.avg_latency_ms || 0,
        success_rate: c.success_rate || 100,
        total_calls: c.total_calls || 0,
        org_id: c.org_id,
      }))
      setPipelineConfigs(mapped)
    }

    // Load usage logs (last 100)
    const { data: logs } = await supabase
      .from('ai_usage_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (logs) setUsageLogs(logs as UsageLog[])

    // Calculate stats
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const allLogs = (logs || []) as any[]
    const todayLogs = allLogs.filter(l => new Date(l.created_at) >= todayStart)
    const monthLogs = allLogs.filter(l => new Date(l.created_at) >= monthStart)

    const todaySpend = todayLogs.reduce((s: number, l: any) => s + (l.cost || l.cost_usd || 0), 0)
    const monthSpend = monthLogs.reduce((s: number, l: any) => s + (l.cost || l.cost_usd || 0), 0)
    const todayCalls = todayLogs.length
    const monthCalls = monthLogs.length
    const successCount = todayLogs.filter((l: any) => l.success !== false).length
    const avgLatency = todayLogs.length > 0
      ? todayLogs.reduce((s: number, l: any) => s + (l.latency_ms || 0), 0) / todayLogs.length
      : 0

    setTodayStats({
      spend: todaySpend,
      calls: todayCalls,
      successRate: todayCalls > 0 ? (successCount / todayCalls) * 100 : 100,
      avgLatency: Math.round(avgLatency)
    })

    setMonthStats({ spend: monthSpend, calls: monthCalls })
    setLoading(false)
  }

  async function updateModel(step: string, modelType: 'primary' | 'fallback', newModel: string) {
    const field = modelType === 'primary' ? 'primary_model' : 'fallback_model'
    const config = pipelineConfigs.find(c => c.pipeline_step === step)
    if (!config) return

    await supabase
      .from('ai_pipeline_config')
      .update({ [field]: newModel })
      .eq('id', config.id)

    loadData()
    setShowModelSelector(false)
  }

  async function toggleEnabled(step: string, enabled: boolean) {
    const config = pipelineConfigs.find(c => c.pipeline_step === step)
    if (!config) return

    await supabase
      .from('ai_pipeline_config')
      .update({ enabled })
      .eq('id', config.id)

    setPipelineConfigs(prev => prev.map(c => c.pipeline_step === step ? { ...c, enabled } : c))
  }

  const budgetPercent = monthlyBudget > 0 ? (monthStats.spend / monthlyBudget) * 100 : 0

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text3)' }}>Loading AI Control Center...</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: 'Barlow Condensed', color: 'var(--text1)', marginBottom: 4 }}>
          AI CONTROL CENTER
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Mission control for every AI model in WrapShop Pro
        </p>
      </div>

      {/* Top Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
        <MetricCard icon={<DollarSign size={18} />} label="Today's AI Spend" value={`$${todayStats.spend.toFixed(2)}`} color="#4f7fff" />
        <MetricCard icon={<TrendingUp size={18} />} label="This Month" value={`$${monthStats.spend.toFixed(2)}`} color="#22c07a" />
        <MetricCard icon={<Activity size={18} />} label="Total Calls Today" value={todayStats.calls} color="#22d3ee" />
        <MetricCard icon={<CheckCircle size={18} />} label="Avg Success Rate" value={`${todayStats.successRate.toFixed(0)}%`} color="#22c07a" />
        <MetricCard icon={<Clock size={18} />} label="Avg Latency" value={`${todayStats.avgLatency}ms`} color="#8b5cf6" />
      </div>

      {/* Budget Alert */}
      <div style={{ background: budgetPercent > 80 ? 'rgba(242,90,90,0.1)' : 'rgba(79,127,255,0.1)', border: `1px solid ${budgetPercent > 80 ? '#f25a5a' : '#4f7fff'}`, borderRadius: 12, padding: 16, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: budgetPercent > 80 ? '#f25a5a' : '#4f7fff' }}>
            {budgetPercent > 80 ? 'Budget Alert — ' : ''}Monthly Budget: ${monthlyBudget}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            ${monthStats.spend.toFixed(2)} / ${monthlyBudget} used
          </div>
        </div>
        <div style={{ height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(budgetPercent, 100)}%`, background: budgetPercent > 80 ? '#f25a5a' : '#4f7fff', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Pipeline Status Table */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
            Pipeline Configuration
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>
            Every AI call goes through these steps. Swap models instantly.
          </p>
        </div>

        {pipelineConfigs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <Cpu size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>No pipeline configurations found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Step</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Primary Model</th>
                  <th style={thStyle}>Fallback</th>
                  <th style={thStyle}>Cost/Call</th>
                  <th style={thStyle}>Avg Latency</th>
                  <th style={thStyle}>Success%</th>
                  <th style={thStyle}>Total Calls</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pipelineConfigs.map((config) => (
                  <tr key={config.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{config.step_label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{config.pipeline_step}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: config.enabled ? '#22c07a' : '#5a6080' }}>
                        {config.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => { setSelectedStep(config.pipeline_step); setSelectedModelType('primary'); setShowModelSelector(true) }}
                        style={{ ...modelButtonStyle, border: '1px solid #4f7fff', color: '#4f7fff' }}
                      >
                        {config.primary_model}
                        <ChevronDown size={12} />
                      </button>
                    </td>
                    <td style={tdStyle}>
                      {config.fallback_model ? (
                        <button
                          onClick={() => { setSelectedStep(config.pipeline_step); setSelectedModelType('fallback'); setShowModelSelector(true) }}
                          style={{ ...modelButtonStyle, border: '1px solid #f59e0b', color: '#f59e0b' }}
                        >
                          {config.fallback_model}
                          <ChevronDown size={12} />
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>None</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text1)' }}>
                        ${(config.cost_per_call || 0).toFixed(4)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text1)' }}>
                        {config.avg_latency_ms || 0}ms
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: (config.success_rate || 100) >= 95 ? '#22c07a' : '#f59e0b' }}>
                        {(config.success_rate || 100).toFixed(0)}%
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text1)' }}>
                        {config.total_calls || 0}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleEnabled(config.pipeline_step, !config.enabled)}
                        style={actionButtonStyle}
                        title={config.enabled ? 'Disable' : 'Enable'}
                      >
                        {config.enabled ? <ToggleRight size={14} color="#22c07a" /> : <ToggleLeft size={14} color="#5a6080" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage Analytics */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
          Recent AI Usage
        </h2>

        {usageLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <Activity size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>No usage logs yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)' }}>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Step / Action</th>
                  <th style={thStyle}>Model</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Latency</th>
                  <th style={thStyle}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.slice(0, 50).map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{log.pipeline_step || log.action || '-'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono' }}>{log.model_used || log.model || '-'}</span>
                    </td>
                    <td style={tdStyle}>
                      {log.success !== false ? (
                        <span style={{ fontSize: 11, color: '#22c07a' }}>Success</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#f25a5a' }}>Failed</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>{log.latency_ms || 0}ms</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text1)' }}>
                        ${((log.cost || log.cost_usd || 0)).toFixed(4)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && selectedStep && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>
                Select {selectedModelType === 'primary' ? 'Primary' : 'Fallback'} Model
              </h3>
              <button onClick={() => setShowModelSelector(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
              {MODEL_OPTIONS.map((modelKey) => (
                <div key={modelKey} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>{modelKey}</div>
                  </div>
                  <button
                    onClick={() => updateModel(selectedStep, selectedModelType, modelKey)}
                    style={{ width: '100%', padding: '6px 12px', background: '#4f7fff', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Set as {selectedModelType === 'primary' ? 'Primary' : 'Fallback'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ color }}>{icon}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text1)', fontFamily: 'JetBrains Mono' }}>
        {value}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const tdStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: 12,
  color: 'var(--text2)'
}

const modelButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  background: 'transparent',
  cursor: 'pointer'
}

const actionButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text2)',
  cursor: 'pointer'
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
}

const modalStyle: React.CSSProperties = {
  background: 'var(--bg)',
  borderRadius: 12,
  padding: 24,
  maxWidth: 800,
  width: '90%',
  border: '1px solid var(--border)'
}
