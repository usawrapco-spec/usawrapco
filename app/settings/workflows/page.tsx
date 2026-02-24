'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Zap, Plus, Play, Pause, Trash2, GripVertical, ChevronDown,
  ChevronRight, Clock, Mail, MessageCircle, CheckCircle2,
  Bell, ClipboardList, ArrowRight, X, Loader2, Save,
  UserPlus, FileText, AlertTriangle, DollarSign
} from 'lucide-react'

interface WorkflowStep {
  id: string
  type: 'send_sms' | 'send_email' | 'wait' | 'update_status' | 'create_task' | 'notify_team'
  config: Record<string, any>
}

interface Workflow {
  id: string
  name: string
  trigger_type: string
  is_active: boolean
  steps: WorkflowStep[]
  created_at: string
}

const TRIGGERS = [
  { id: 'new_lead', label: 'New Lead Submitted', icon: UserPlus, color: '#22c07a' },
  { id: 'quote_not_viewed', label: 'Quote Not Viewed in 48h', icon: FileText, color: '#f59e0b' },
  { id: 'design_approved', label: 'Design Approved', icon: CheckCircle2, color: '#4f7fff' },
  { id: 'install_complete', label: 'Install Complete', icon: CheckCircle2, color: '#22d3ee' },
  { id: 'payment_received', label: 'Payment Received', icon: DollarSign, color: '#22c07a' },
  { id: 'job_overdue', label: 'Job Overdue', icon: AlertTriangle, color: '#f25a5a' },
]

const STEP_TYPES = [
  { id: 'send_sms', label: 'Send SMS', icon: MessageCircle, color: '#22c07a' },
  { id: 'send_email', label: 'Send Email', icon: Mail, color: '#4f7fff' },
  { id: 'wait', label: 'Wait', icon: Clock, color: '#f59e0b' },
  { id: 'update_status', label: 'Update Job Status', icon: CheckCircle2, color: '#22d3ee' },
  { id: 'create_task', label: 'Create Task', icon: ClipboardList, color: '#8b5cf6' },
  { id: 'notify_team', label: 'Notify Team Member', icon: Bell, color: '#f25a5a' },
]

const TEMPLATES: Omit<Workflow, 'id' | 'created_at'>[] = [
  {
    name: '48-Hour Quote Follow-Up',
    trigger_type: 'quote_not_viewed',
    is_active: false,
    steps: [
      { id: '1', type: 'wait', config: { duration: 48, unit: 'hours' } },
      { id: '2', type: 'send_sms', config: { message: 'Hi {{customer_name}}, just checking in on the quote we sent over for your {{vehicle_desc}}. Any questions? Reply here or call us!' } },
      { id: '3', type: 'create_task', config: { title: 'Follow up on unviewed quote - {{customer_name}}', assignee: 'sales_rep' } },
    ],
  },
  {
    name: 'Post-Install Review Request',
    trigger_type: 'install_complete',
    is_active: false,
    steps: [
      { id: '1', type: 'wait', config: { duration: 24, unit: 'hours' } },
      { id: '2', type: 'send_email', config: { subject: 'How does your new wrap look?', body: "Hi {{customer_name}},\n\nWe hope you're loving your new vehicle wrap! We'd really appreciate it if you could leave us a quick review.\n\n{{review_link}}\n\nThank you!\nUSA Wrap Co" } },
      { id: '3', type: 'wait', config: { duration: 7, unit: 'days' } },
      { id: '4', type: 'send_sms', config: { message: 'Hey {{customer_name}}! Quick reminder - we would love a review of your wrap from USA Wrap Co. It helps us a lot! {{review_link}}' } },
    ],
  },
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [expandedWorkflows, setExpandedWorkflows] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      const { data } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setWorkflows(data)
    } catch {}
    setLoading(false)
  }

  const toggleWorkflow = async (id: string, is_active: boolean) => {
    await supabase.from('workflows').update({ is_active }).eq('id', id)
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active } : w))
  }

  const deleteWorkflow = async (id: string) => {
    await supabase.from('workflows').delete().eq('id', id)
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  const createFromTemplate = async (template: typeof TEMPLATES[0]) => {
    const { data } = await supabase.from('workflows').insert({
      name: template.name,
      trigger_type: template.trigger_type,
      is_active: template.is_active,
      steps: template.steps,
    }).select().single()

    if (data) setWorkflows(prev => [data, ...prev])
  }

  const saveWorkflow = async (workflow: Workflow) => {
    if (workflow.id) {
      await supabase.from('workflows').update({
        name: workflow.name,
        trigger_type: workflow.trigger_type,
        steps: workflow.steps,
      }).eq('id', workflow.id)
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? workflow : w))
    } else {
      const { data } = await supabase.from('workflows').insert({
        name: workflow.name,
        trigger_type: workflow.trigger_type,
        is_active: false,
        steps: workflow.steps,
      }).select().single()
      if (data) setWorkflows(prev => [data, ...prev])
    }
    setEditingWorkflow(null)
    setShowCreate(false)
  }

  const getTriggerInfo = (type: string) => TRIGGERS.find(t => t.id === type)
  const getStepInfo = (type: string) => STEP_TYPES.find(s => s.id === type)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--amber), var(--red))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 28,
              color: 'var(--text1)', margin: 0,
            }}>Workflow Automation</h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
              Automate follow-ups, notifications, and job updates
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditingWorkflow({
            id: '',
            name: '',
            trigger_type: '',
            is_active: false,
            steps: [],
            created_at: '',
          })
          setShowCreate(true)
        }}>
          <Plus size={16} /> Create Workflow
        </button>
      </div>

      {/* Templates */}
      {workflows.length === 0 && !loading && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Quick Start Templates</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {TEMPLATES.map((template, i) => {
              const trigger = getTriggerInfo(template.trigger_type)
              return (
                <div key={i} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 16, cursor: 'pointer',
                }} onClick={() => createFromTemplate(template)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {trigger && <trigger.icon size={16} style={{ color: trigger.color }} />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{template.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                    Trigger: {trigger?.label} &middot; {template.steps.length} steps
                  </div>
                  <button className="btn-primary btn-sm" style={{ width: '100%' }}>
                    <Plus size={14} /> Use Template
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Workflow List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13 }}>Loading workflows...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {workflows.map(workflow => {
            const trigger = getTriggerInfo(workflow.trigger_type)
            const isExpanded = expandedWorkflows[workflow.id]

            return (
              <div key={workflow.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  {/* Toggle */}
                  <button
                    onClick={() => toggleWorkflow(workflow.id, !workflow.is_active)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: workflow.is_active ? 'var(--green)' : 'var(--surface2)',
                      position: 'relative', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: workflow.is_active ? 23 : 3,
                      transition: 'left 0.2s',
                    }} />
                  </button>

                  {/* Info */}
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedWorkflows(p => ({ ...p, [workflow.id]: !p[workflow.id] }))}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{workflow.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {trigger && <trigger.icon size={12} style={{ color: trigger.color }} />}
                      {trigger?.label} &middot; {workflow.steps?.length || 0} steps
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingWorkflow(workflow)
                      setShowCreate(true)
                    }}
                    className="btn-ghost btn-xs"
                  >Edit</button>
                  <button onClick={() => deleteWorkflow(workflow.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
                    padding: 4,
                  }}><Trash2 size={14} /></button>
                  <button
                    onClick={() => setExpandedWorkflows(p => ({ ...p, [workflow.id]: !p[workflow.id] }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>

                {/* Expanded Steps */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Trigger */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        background: `${trigger?.color}15`, border: `1px solid ${trigger?.color}30`,
                        borderRadius: 10,
                      }}>
                        <Zap size={16} style={{ color: trigger?.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: trigger?.color, textTransform: 'uppercase' }}>Trigger</div>
                          <div style={{ fontSize: 13, color: 'var(--text1)' }}>{trigger?.label}</div>
                        </div>
                      </div>

                      {/* Steps */}
                      {(workflow.steps || []).map((step, i) => {
                        const stepInfo = getStepInfo(step.type)
                        return (
                          <div key={step.id}>
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                              <ArrowRight size={14} style={{ color: 'var(--text3)', transform: 'rotate(90deg)' }} />
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                              background: 'var(--surface2)', border: '1px solid var(--border)',
                              borderRadius: 10,
                            }}>
                              <GripVertical size={14} style={{ color: 'var(--text3)', cursor: 'grab', flexShrink: 0 }} />
                              {stepInfo && <stepInfo.icon size={16} style={{ color: stepInfo.color, flexShrink: 0 }} />}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: stepInfo?.color, textTransform: 'uppercase' }}>
                                  Step {i + 1}: {stepInfo?.label}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                                  {step.type === 'wait' && `Wait ${step.config.duration} ${step.config.unit}`}
                                  {step.type === 'send_sms' && step.config.message?.substring(0, 60) + '...'}
                                  {step.type === 'send_email' && `Subject: ${step.config.subject}`}
                                  {step.type === 'create_task' && step.config.title}
                                  {step.type === 'notify_team' && `Notify ${step.config.target || 'team'}`}
                                  {step.type === 'update_status' && `Update to ${step.config.status || 'next stage'}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreate && editingWorkflow && (
        <WorkflowEditor
          workflow={editingWorkflow}
          onSave={saveWorkflow}
          onClose={() => { setShowCreate(false); setEditingWorkflow(null) }}
        />
      )}
    </div>
  )
}

function WorkflowEditor({ workflow, onSave, onClose }: {
  workflow: Workflow
  onSave: (w: Workflow) => void
  onClose: () => void
}) {
  const [name, setName] = useState(workflow.name)
  const [trigger, setTrigger] = useState(workflow.trigger_type)
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow.steps || [])
  const [saving, setSaving] = useState(false)

  const addStep = (type: WorkflowStep['type']) => {
    setSteps(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      config: type === 'wait' ? { duration: 24, unit: 'hours' } : {},
    }])
  }

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id))
  }

  const updateStepConfig = (id: string, key: string, value: any) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...workflow, name, trigger_type: trigger, steps })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 600, maxHeight: '80vh', background: 'var(--surface)',
          borderRadius: 16, border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          animation: 'popIn 0.2s ease',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', margin: 0, fontFamily: 'Barlow Condensed' }}>
            {workflow.id ? 'Edit Workflow' : 'Create Workflow'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="field-label">Workflow Name</label>
              <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Quote Follow-Up" />
            </div>

            <div>
              <label className="field-label">Trigger</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {TRIGGERS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTrigger(t.id)}
                    style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${trigger === t.id ? t.color : 'var(--border)'}`,
                      background: trigger === t.id ? `${t.color}15` : 'var(--surface2)',
                      display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                    }}
                  >
                    <t.icon size={14} style={{ color: t.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: trigger === t.id ? t.color : 'var(--text2)', fontWeight: 600 }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="field-label">Steps</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((step, i) => {
                  const info = STEP_TYPES.find(s => s.id === step.type)
                  return (
                    <div key={step.id} style={{
                      padding: 14, borderRadius: 10,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <GripVertical size={14} style={{ color: 'var(--text3)', cursor: 'grab' }} />
                        {info && <info.icon size={14} style={{ color: info.color }} />}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', flex: 1 }}>
                          Step {i + 1}: {info?.label}
                        </span>
                        <button onClick={() => removeStep(step.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
                        }}><Trash2 size={14} /></button>
                      </div>

                      {step.type === 'wait' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input type="number" className="field" style={{ width: 80 }}
                            value={step.config.duration || ''} onChange={e => updateStepConfig(step.id, 'duration', Number(e.target.value))}
                            placeholder="24" />
                          <select className="field" value={step.config.unit || 'hours'} onChange={e => updateStepConfig(step.id, 'unit', e.target.value)}>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                      )}
                      {step.type === 'send_sms' && (
                        <textarea className="field" rows={2} value={step.config.message || ''}
                          onChange={e => updateStepConfig(step.id, 'message', e.target.value)}
                          placeholder="SMS message... Use {{customer_name}}, {{vehicle_desc}}" />
                      )}
                      {step.type === 'send_email' && (
                        <>
                          <input className="field" style={{ marginBottom: 8 }} value={step.config.subject || ''}
                            onChange={e => updateStepConfig(step.id, 'subject', e.target.value)}
                            placeholder="Email subject" />
                          <textarea className="field" rows={3} value={step.config.body || ''}
                            onChange={e => updateStepConfig(step.id, 'body', e.target.value)}
                            placeholder="Email body..." />
                        </>
                      )}
                      {step.type === 'create_task' && (
                        <input className="field" value={step.config.title || ''}
                          onChange={e => updateStepConfig(step.id, 'title', e.target.value)}
                          placeholder="Task title... Use {{customer_name}}" />
                      )}
                      {step.type === 'notify_team' && (
                        <select className="field" value={step.config.target || ''} onChange={e => updateStepConfig(step.id, 'target', e.target.value)}>
                          <option value="">Select team member...</option>
                          <option value="owner">Owner</option>
                          <option value="sales_rep">Assigned Sales Rep</option>
                          <option value="designer">Assigned Designer</option>
                        </select>
                      )}
                      {step.type === 'update_status' && (
                        <select className="field" value={step.config.status || ''} onChange={e => updateStepConfig(step.id, 'status', e.target.value)}>
                          <option value="">Select status...</option>
                          <option value="active">Active</option>
                          <option value="in_production">In Production</option>
                          <option value="install_scheduled">Install Scheduled</option>
                          <option value="closing">Closing</option>
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add Step */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {STEP_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => addStep(type.id as WorkflowStep['type'])}
                    className="btn-ghost btn-xs"
                    style={{ gap: 4 }}
                  >
                    <type.icon size={12} style={{ color: type.color }} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!name || !trigger || saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {workflow.id ? 'Save Changes' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  )
}
