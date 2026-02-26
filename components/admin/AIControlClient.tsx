'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MODEL_REGISTRY, DEFAULT_PIPELINE, initializePipelineConfig } from '@/lib/services/ai-pipeline'
import {
  Activity, Zap, Clock, CheckCircle, AlertTriangle, Settings,
  Play, Eye, ToggleLeft, ToggleRight, ChevronDown, X, Star,
  TrendingUp, DollarSign, Cpu, Key
} from 'lucide-react'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
}

export default function AIControlClient({ profile }: Props) {
  const supabase = createClient()

  const [pipelineConfigs, setPipelineConfigs] = useState<any[]>([])
  const [usageLogs, setUsageLogs] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState({ spend: 0, calls: 0, successRate: 0, avgLatency: 0 })
  const [monthStats, setMonthStats] = useState({ spend: 0, calls: 0 })
  const [monthlyBudget, setMonthlyBudget] = useState(500)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [selectedModelType, setSelectedModelType] = useState<'primary' | 'fallback'>('primary')
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testStep, setTestStep] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Initialize pipeline config if not exists
    await initializePipelineConfig(profile.org_id)

    // Load pipeline configs
    const { data: configs } = await supabase
      .from('ai_pipeline_config')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('pipeline_step')

    if (configs) setPipelineConfigs(configs)

    // Load usage logs (last 100)
    const { data: logs } = await supabase
      .from('ai_usage_log')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (logs) setUsageLogs(logs)

    // Calculate stats
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const todayLogs = logs?.filter(l => new Date(l.created_at) >= todayStart) || []
    const monthLogs = logs?.filter(l => new Date(l.created_at) >= monthStart) || []

    const todaySpend = todayLogs.reduce((s, l) => s + (l.cost || 0), 0)
    const monthSpend = monthLogs.reduce((s, l) => s + (l.cost || 0), 0)
    const todayCalls = todayLogs.length
    const monthCalls = monthLogs.length
    const successCount = todayLogs.filter(l => l.success).length
    const avgLatency = todayLogs.length > 0
      ? todayLogs.reduce((s, l) => s + (l.latency_ms || 0), 0) / todayLogs.length
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

  function getStatusBadge(config: any) {
    const recentLogs = usageLogs.filter(l => l.pipeline_step === config.pipeline_step).slice(0, 10)
    if (recentLogs.length === 0) return { status: 'idle', color: '#9299b5', label: 'Idle' }
    if (!config.enabled) return { status: 'disabled', color: '#5a6080', label: 'Disabled' }

    const failCount = recentLogs.filter(l => !l.success).length
    const usingFallback = recentLogs[0]?.model_used === config.fallback_model

    if (failCount === 0) return { status: 'active', color: '#22c07a', label: '🟢 Active' }
    if (usingFallback) return { status: 'degraded', color: '#f59e0b', label: '🟡 Degraded' }
    if (failCount > 5) return { status: 'down', color: '#f25a5a', label: '🔴 Down' }
    return { status: 'active', color: '#22c07a', label: '🟢 Active' }
  }

  async function updateModel(step: string, modelType: 'primary' | 'fallback', newModel: string) {
    const field = modelType === 'primary' ? 'primary_model' : 'fallback_model'
    await supabase
      .from('ai_pipeline_config')
      .update({ [field]: newModel })
      .eq('org_id', profile.org_id)
      .eq('pipeline_step', step)

    loadData()
    setShowModelSelector(false)
  }

  async function toggleEnabled(step: string, enabled: boolean) {
    await supabase
      .from('ai_pipeline_config')
      .update({ enabled })
      .eq('org_id', profile.org_id)
      .eq('pipeline_step', step)

    loadData()
  }

  const budgetPercent = (monthStats.spend / monthlyBudget) * 100

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
            {budgetPercent > 80 ? '⚠️ ' : ''}Monthly Budget: ${monthlyBudget}
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
                <th style={thStyle}>Month Cost</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipelineConfigs.map((config) => {
                const status = getStatusBadge(config)
                const monthLogs = usageLogs.filter(l => l.pipeline_step === config.pipeline_step && new Date(l.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                const monthCost = monthLogs.reduce((s, l) => s + (l.cost || 0), 0)

                return (
                  <tr key={config.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13 }}>{config.step_label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{config.pipeline_step}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>{status.label}</span>
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
                        ${config.cost_per_call?.toFixed(4) || '0.0000'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text1)' }}>
                        {config.avg_latency_ms || 0}ms
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: config.success_rate >= 95 ? '#22c07a' : '#f59e0b' }}>
                        {config.success_rate?.toFixed(0) || 100}%
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text1)' }}>
                        {config.total_calls || 0}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text1)' }}>
                        ${monthCost.toFixed(2)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setTestStep(config.pipeline_step); setTestModalOpen(true) }}
                          style={actionButtonStyle}
                          title="Test"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={() => toggleEnabled(config.pipeline_step, !config.enabled)}
                          style={actionButtonStyle}
                          title={config.enabled ? 'Disable' : 'Enable'}
                        >
                          {config.enabled ? <ToggleRight size={14} color="#22c07a" /> : <ToggleLeft size={14} color="#5a6080" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Analytics */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
          Recent AI Usage
        </h2>

        <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)' }}>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Step</th>
                <th style={thStyle}>Model</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Latency</th>
                <th style={thStyle}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {usageLogs.slice(0, 50).map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{log.pipeline_step}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'JetBrains Mono' }}>{log.model_used}</span>
                  </td>
                  <td style={tdStyle}>
                    {log.success ? (
                      <span style={{ fontSize: 11, color: '#22c07a' }}>✓ Success</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#f25a5a' }}>✗ Failed</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text2)' }}>{log.latency_ms}ms</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text1)' }}>${log.cost?.toFixed(4) || '0.0000'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              {Object.entries(MODEL_REGISTRY)
                .filter(([_, info]) => {
                  const config = pipelineConfigs.find(c => c.pipeline_step === selectedStep)
                  const defaultConfig = DEFAULT_PIPELINE[selectedStep]
                  if (!config && !defaultConfig) return false
                  const category = info.category
                  const stepCategory = category
                  // Show models matching the step category
                  if (selectedStep === 'concept_generation') return category === 'image_generation'
                  if (selectedStep === 'upscaling') return category === 'upscaling'
                  if (selectedStep === 'depth_mapping') return category === 'depth_mapping'
                  if (selectedStep === 'brand_analysis') return category === 'brand_analysis'
                  if (selectedStep === 'background_removal') return category === 'background_removal'
                  if (selectedStep === 'vectorization') return category === 'vectorization'
                  return false
                })
                .map(([modelKey, modelInfo]) => (
                  <div key={modelKey} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 2 }}>{modelKey}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>{modelInfo.provider}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
                      Cost: ${modelInfo.costPerImage?.toFixed(4) || modelInfo.costPer1kTokens?.toFixed(4) || '0.0000'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--text3)' }}>Quality</div>
                        <div style={{ display: 'flex', gap: 1 }}>
                          {Array(modelInfo.quality).fill(null).map((_, i) => <Star key={i} size={11} color="#f59e0b" fill="#f59e0b" />)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--text3)' }}>Speed</div>
                        <div style={{ display: 'flex', gap: 1 }}>
                          {Array(modelInfo.speed).fill(null).map((_, i) => <Zap key={i} size={11} color="#22d3ee" fill="#22d3ee" />)}
                        </div>
                      </div>
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

function MetricCard({ icon, label, value, color }: any) {
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
