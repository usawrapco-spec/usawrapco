'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, RefreshCw, ExternalLink, CheckCircle2,
  FileText, Receipt, Briefcase, Users, ListTodo, Phone, MessageSquare,
  ChevronRight,
} from 'lucide-react'
import EntityCard from './EntityCard'
import SuggestedActions from './SuggestedActions'
import ScopedChat from './ScopedChat'

interface Props {
  recapId: string
  itemId: string
  ownerName: string
}

function priorityColor(p: string) {
  if (p === 'high') return '#f25a5a'
  if (p === 'medium') return '#f59e0b'
  return '#22c07a'
}

function entityTypeIcon(type: string) {
  switch (type) {
    case 'estimate': return FileText
    case 'invoice': return Receipt
    case 'project': return Briefcase
    case 'customer': return Users
    case 'task': return ListTodo
    case 'call': return Phone
    case 'message': return MessageSquare
    default: return FileText
  }
}

function entityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    estimate: 'Estimates',
    invoice: 'Invoices',
    project: 'Projects',
    customer: 'Customers',
    task: 'Tasks',
    call: 'Calls',
    message: 'Messages',
  }
  return labels[type] || 'Records'
}

export default function ActionItemDetailClient({ recapId, itemId, ownerName }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionItem, setActionItem] = useState<any>(null)
  const [entities, setEntities] = useState<any[]>([])
  const [entityType, setEntityType] = useState<string>('')
  const [session, setSession] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [executedActions, setExecutedActions] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/action-items/${recapId}/${itemId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data = await res.json()
      setActionItem(data.actionItem)
      setEntities(data.entities || [])
      setEntityType(data.entityType || '')
      setSession(data.session)

      // Log view feedback
      fetch('/api/ai/action-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'log_view',
          recapId,
          itemId,
          entityType: data.entityType,
          entityIds: data.actionItem?.entity_ids,
          suggestionLabel: 'viewed_detail',
          payload: {},
        }),
      }).catch(() => {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [recapId, itemId])

  const loadSuggestions = useCallback(async () => {
    if (!actionItem || suggestionsLoading) return
    setSuggestionsLoading(true)
    try {
      const res = await fetch('/api/ai/action-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionItem,
          entities,
          entityType,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
    } catch {} finally {
      setSuggestionsLoading(false)
    }
  }, [actionItem, entities, entityType, suggestionsLoading])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (actionItem && entities.length > 0 && suggestions.length === 0 && !suggestionsLoading) {
      loadSuggestions()
    }
  }, [actionItem, entities, suggestions.length, suggestionsLoading, loadSuggestions])

  const handleActionExecuted = (label: string) => {
    setExecutedActions(prev => new Set(prev).add(label))
  }

  const Icon = entityType ? entityTypeIcon(entityType) : FileText

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg, #0d0f14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text3, #5a6080)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={24} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>Loading action item...</div>
        </div>
      </div>
    )
  }

  if (error || !actionItem) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg, #0d0f14)',
        padding: '40px 24px', color: 'var(--text1, #e8eaed)',
      }}>
        <Link href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--text3, #5a6080)', fontSize: 13, textDecoration: 'none', marginBottom: 24,
        }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <div style={{
          padding: '20px 24px', background: 'rgba(242,90,90,0.08)',
          border: '1px solid rgba(242,90,90,0.2)', borderRadius: 12,
          fontSize: 14, color: '#f25a5a',
        }}>
          {error || 'Action item not found'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg, #0d0f14)',
      padding: '24px 24px 80px',
      maxWidth: 960, margin: '0 auto',
    }}>
      {/* Back nav */}
      <Link href="/dashboard" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: 'var(--text3, #5a6080)', fontSize: 13, textDecoration: 'none',
        marginBottom: 20,
      }}>
        <ArrowLeft size={14} /> Back to Brief
      </Link>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,127,255,0.08) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(79,127,255,0.2)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900, fontSize: 12, letterSpacing: '0.06em',
                color: 'var(--text3, #5a6080)', textTransform: 'uppercase',
              }}>
                Action Item Detail
              </span>
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: 'var(--text1, #e8eaed)',
              lineHeight: 1.4, marginBottom: 8,
            }}>
              {actionItem.text}
            </div>
            {entityType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3, #5a6080)' }}>
                <Icon size={13} />
                <span>{entities.length} {entityTypeLabel(entityType).toLowerCase()} referenced</span>
              </div>
            )}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
            color: priorityColor(actionItem.priority),
            background: `${priorityColor(actionItem.priority)}18`,
            textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
          }}>
            {actionItem.priority}
          </div>
        </div>
      </div>

      {/* Referenced Records */}
      {entities.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <Icon size={15} color="var(--text2, #9299b5)" />
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 900, fontSize: 14, letterSpacing: '0.04em',
              color: 'var(--text2, #9299b5)', textTransform: 'uppercase',
            }}>
              Referenced {entityTypeLabel(entityType)}
            </span>
            <span style={{
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--text3, #5a6080)',
            }}>
              ({entities.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entities.map((entity: any) => (
              <EntityCard key={entity.id} entity={entity} entityType={entityType} />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Next Steps */}
      <SuggestedActions
        suggestions={actionItem.suggested_actions || suggestions}
        loading={suggestionsLoading && suggestions.length === 0}
        actionItem={actionItem}
        entities={entities}
        entityType={entityType}
        recapId={recapId}
        itemId={itemId}
        executedActions={executedActions}
        onExecuted={handleActionExecuted}
        onRefresh={loadSuggestions}
      />

      {/* Scoped Mini-Chat */}
      <ScopedChat
        recapId={recapId}
        itemId={itemId}
        actionItem={actionItem}
        entities={entities}
        entityType={entityType}
        initialSession={session}
        ownerName={ownerName}
      />
    </div>
  )
}
