'use client'

import { useState } from 'react'
import {
  Sparkles, Send, RefreshCw, CheckCircle2, ListTodo, PenTool,
  ArrowUpRight, X, Loader2, Eye,
} from 'lucide-react'

interface Suggestion {
  label: string
  type: string
  draft?: string
  description?: string
  target_name?: string
  new_status?: string
  task_title?: string
  due_in_days?: number
}

interface Props {
  suggestions: Suggestion[]
  loading: boolean
  actionItem: any
  entities: any[]
  entityType: string
  recapId: string
  itemId: string
  executedActions: Set<string>
  onExecuted: (label: string) => void
  onRefresh: () => void
}

function isViewSuggestion(suggestion: Suggestion): boolean {
  const label = suggestion.label.toLowerCase()
  return (
    suggestion.type === 'view' ||
    suggestion.type === 'review' ||
    suggestion.type === 'navigate' ||
    label.includes('review') ||
    label.includes('compare') ||
    label.includes('side by side') ||
    label.includes('open') ||
    label.includes('check')
  )
}

function getEntityLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'estimate': return `/estimates/${entityId}`
    case 'invoice': return `/invoices/${entityId}`
    case 'project': return `/projects/${entityId}`
    case 'customer': return `/customers/${entityId}`
    default: return null
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'send_message': return Send
    case 'update_status': return ArrowUpRight
    case 'create_task': return ListTodo
    case 'ai_draft': return PenTool
    case 'view': case 'review': case 'navigate': return Eye
    default: return Sparkles
  }
}

function typeColor(type: string) {
  switch (type) {
    case 'send_message': return '#4f7fff'
    case 'update_status': return '#22c07a'
    case 'create_task': return '#f59e0b'
    case 'ai_draft': return '#8b5cf6'
    case 'view': case 'review': case 'navigate': return '#4f7fff'
    default: return '#4f7fff'
  }
}

export default function SuggestedActions({
  suggestions, loading, actionItem, entities, entityType,
  recapId, itemId, executedActions, onExecuted, onRefresh,
}: Props) {
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})

  async function executeSuggestion(suggestion: Suggestion) {
    setExecuting(suggestion.label)
    try {
      const payload: any = {}
      if (suggestion.type === 'update_status') {
        payload.newStatus = suggestion.new_status || 'reviewed'
        // Map entity type to table name
        const tableMap: Record<string, string> = {
          estimate: 'estimates', invoice: 'invoices', project: 'projects', task: 'tasks',
        }
        payload.tableName = tableMap[entityType] || entityType + 's'
      } else if (suggestion.type === 'create_task') {
        payload.taskTitle = suggestion.task_title || suggestion.label
        payload.dueInDays = suggestion.due_in_days || 1
      } else if (suggestion.type === 'send_message') {
        payload.draft = suggestion.draft || ''
        payload.recipientName = suggestion.target_name || ''
      }

      const res = await fetch('/api/ai/action-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: suggestion.type,
          payload,
          recapId,
          itemId,
          entityType,
          entityIds: actionItem.entity_ids,
          suggestionLabel: suggestion.label,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        onExecuted(suggestion.label)
        setResults(prev => ({ ...prev, [suggestion.label]: data.message || 'Done' }))
      } else {
        setResults(prev => ({ ...prev, [suggestion.label]: `Error: ${data.error}` }))
      }
    } catch (err: any) {
      setResults(prev => ({ ...prev, [suggestion.label]: `Error: ${err.message}` }))
    } finally {
      setExecuting(null)
      setConfirmDelete(null)
    }
  }

  async function dismissSuggestion(suggestion: Suggestion) {
    // Log dismiss feedback
    fetch('/api/ai/action-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'log_dismiss',
        payload: {},
        recapId,
        itemId,
        entityType,
        entityIds: actionItem.entity_ids,
        suggestionLabel: suggestion.label,
      }),
    }).catch(() => {})
    onExecuted(suggestion.label)
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} color="#8b5cf6" />
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900, fontSize: 14, letterSpacing: '0.04em',
            color: 'var(--text2, #9299b5)', textTransform: 'uppercase',
          }}>
            Suggested Next Steps
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text3, #5a6080)', fontSize: 11, cursor: 'pointer',
          }}
        >
          <RefreshCw size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {loading && suggestions.length === 0 && (
        <div style={{
          padding: '20px', textAlign: 'center', color: 'var(--text3, #5a6080)',
          fontSize: 13, background: 'var(--surface, #13151c)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
        }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
          V.I.N.Y.L. is analyzing and generating suggestions...
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((suggestion, idx) => {
          const SIcon = typeIcon(suggestion.type)
          const color = typeColor(suggestion.type)
          const isExecuted = executedActions.has(suggestion.label)
          const isExpanded = expandedDraft === suggestion.label
          const isConfirming = confirmDelete === suggestion.label
          const isExecuting = executing === suggestion.label
          const result = results[suggestion.label]

          if (isExecuted && result) {
            return (
              <div key={idx} style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(34,192,122,0.06)',
                border: '1px solid rgba(34,192,122,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <CheckCircle2 size={15} color="#22c07a" />
                <span style={{ fontSize: 13, color: '#22c07a' }}>{suggestion.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text3, #5a6080)', marginLeft: 'auto' }}>{result}</span>
              </div>
            )
          }

          if (isExecuted) return null

          return (
            <div key={idx} style={{
              borderRadius: 10,
              background: 'var(--surface, #13151c)',
              border: `1px solid ${isExpanded ? `${color}30` : 'rgba(255,255,255,0.06)'}`,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: `${color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <SIcon size={14} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1, #e8eaed)' }}>
                    {suggestion.label}
                  </div>
                  {suggestion.description && (
                    <div style={{ fontSize: 11, color: 'var(--text3, #5a6080)', marginTop: 2 }}>
                      {suggestion.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {suggestion.draft && (
                    <button
                      onClick={() => setExpandedDraft(isExpanded ? null : suggestion.label)}
                      style={{
                        padding: '5px 10px', borderRadius: 6,
                        border: `1px solid ${color}30`,
                        background: `${color}10`,
                        color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Hide' : 'Preview'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (suggestion.type === 'send_message' && suggestion.draft && !isExpanded) {
                        setExpandedDraft(suggestion.label)
                        return
                      }
                      // For view/review suggestions, open entity pages directly
                      if (isViewSuggestion(suggestion)) {
                        const entityIds = actionItem.entity_ids || []
                        const links = entityIds
                          .map((id: string) => getEntityLink(entityType, id))
                          .filter(Boolean)
                        if (links.length > 0) {
                          links.forEach((link: string) => window.open(link, '_blank'))
                          // Log the action
                          fetch('/api/ai/action-execute', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'log_view',
                              payload: {},
                              recapId,
                              itemId,
                              entityType,
                              entityIds,
                              suggestionLabel: suggestion.label,
                            }),
                          }).catch(() => {})
                          onExecuted(suggestion.label)
                          setResults(prev => ({
                            ...prev,
                            [suggestion.label]: `Opened ${links.length} ${entityType}${links.length > 1 ? 's' : ''}`,
                          }))
                          return
                        }
                      }
                      setConfirmDelete(suggestion.label)
                    }}
                    disabled={isExecuting}
                    style={{
                      padding: '5px 12px', borderRadius: 6,
                      border: 'none',
                      background: color, color: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      opacity: isExecuting ? 0.6 : 1,
                    }}
                  >
                    {isExecuting ? 'Running...' : (isViewSuggestion(suggestion) ? 'Open' : 'Do It')}
                  </button>
                  <button
                    onClick={() => dismissSuggestion(suggestion)}
                    style={{
                      padding: '5px 6px', borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'transparent', color: 'var(--text3, #5a6080)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Draft preview */}
              {isExpanded && suggestion.draft && (
                <div style={{
                  padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,0,0,0.15)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text3, #5a6080)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Draft Preview
                  </div>
                  <div style={{
                    fontSize: 13, color: 'var(--text1, #e8eaed)', lineHeight: 1.5,
                    whiteSpace: 'pre-wrap', padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {suggestion.draft}
                  </div>
                </div>
              )}

              {/* Confirmation */}
              {isConfirming && (
                <div style={{
                  padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(242,90,90,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text2, #9299b5)' }}>
                    Execute this action?
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{
                        padding: '4px 10px', borderRadius: 5,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent', color: 'var(--text3, #5a6080)',
                        fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => executeSuggestion(suggestion)}
                      disabled={isExecuting}
                      style={{
                        padding: '4px 12px', borderRadius: 5,
                        border: 'none', background: color, color: '#fff',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {isExecuting ? 'Running...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
