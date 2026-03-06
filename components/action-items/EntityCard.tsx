'use client'

import Link from 'next/link'
import { ExternalLink, ChevronRight } from 'lucide-react'

interface Props {
  entity: any
  entityType: string
}

function statusColor(status: string) {
  const s = (status || '').toLowerCase()
  if (['accepted', 'paid', 'done', 'completed', 'closed', 'active'].includes(s)) return '#22c07a'
  if (['draft', 'pending', 'open', 'new'].includes(s)) return '#f59e0b'
  if (['overdue', 'rejected', 'cancelled', 'missed'].includes(s)) return '#f25a5a'
  if (['sent', 'in_progress', 'scheduled'].includes(s)) return '#4f7fff'
  return 'var(--text3, #5a6080)'
}

function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return null
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return null }
}

function getDetailLink(entityType: string, entity: any): string | null {
  switch (entityType) {
    case 'estimate': return `/estimates/${entity.id}`
    case 'invoice': return `/invoices/${entity.id}`
    case 'project': return `/projects/${entity.id}`
    case 'customer': return `/customers/${entity.id}`
    case 'task': return null
    case 'call': return null
    case 'message': return null
    default: return null
  }
}

export default function EntityCard({ entity, entityType }: Props) {
  const link = getDetailLink(entityType, entity)
  const status = entity.status || entity.pipe_stage || ''

  const renderContent = () => {
    switch (entityType) {
      case 'estimate':
        return (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1, #e8eaed)', marginBottom: 3 }}>
                {entity.title || 'Untitled Estimate'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3, #5a6080)' }}>
                {entity.customer?.name && <span>{entity.customer.name}</span>}
                {entity.created_at && <span> &middot; {formatDate(entity.created_at)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {entity.total != null && (
                <span style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text1, #e8eaed)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {formatCurrency(entity.total)}
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                color: statusColor(status), background: `${statusColor(status)}18`,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {status}
              </span>
            </div>
          </>
        )

      case 'invoice':
        return (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1, #e8eaed)', marginBottom: 3 }}>
                {entity.invoice_number ? `Invoice #${entity.invoice_number}` : 'Invoice'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3, #5a6080)' }}>
                {entity.customer?.name && <span>{entity.customer.name}</span>}
                {entity.due_date && <span> &middot; Due {formatDate(entity.due_date)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {entity.total != null && (
                <span style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text1, #e8eaed)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {formatCurrency(entity.total)}
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                color: statusColor(status), background: `${statusColor(status)}18`,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {status}
              </span>
            </div>
          </>
        )

      case 'project':
        return (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1, #e8eaed)', marginBottom: 3 }}>
                {entity.title || 'Untitled Project'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3, #5a6080)' }}>
                {entity.agent?.name && <span>Agent: {entity.agent.name}</span>}
                {entity.install_date && <span> &middot; Install: {formatDate(entity.install_date)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {entity.revenue != null && (
                <span style={{
                  fontSize: 14, fontWeight: 700, color: 'var(--text1, #e8eaed)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {formatCurrency(entity.revenue)}
                </span>
              )}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                color: statusColor(entity.pipe_stage || status),
                background: `${statusColor(entity.pipe_stage || status)}18`,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {(entity.pipe_stage || status || '').replace(/_/g, ' ')}
              </span>
            </div>
          </>
        )

      case 'customer':
        return (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1, #e8eaed)', marginBottom: 3 }}>
                {entity.name || 'Unknown Customer'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3, #5a6080)' }}>
                {entity.email && <span>{entity.email}</span>}
                {entity.phone && <span> &middot; {entity.phone}</span>}
              </div>
            </div>
          </>
        )

      case 'task':
        return (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1, #e8eaed)', marginBottom: 3 }}>
                {entity.title || 'Untitled Task'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3, #5a6080)' }}>
                {entity.due_at && <span>Due: {formatDate(entity.due_at)}</span>}
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              color: statusColor(status), background: `${statusColor(status)}18`,
              textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
            }}>
              {status}
            </span>
          </>
        )

      case 'call':
        return (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1, #e8eaed)', marginBottom: 3 }}>
                {entity.caller_name || entity.caller_number || 'Unknown Call'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3, #5a6080)' }}>
                {entity.direction && <span>{entity.direction}</span>}
                {entity.duration_seconds != null && <span> &middot; {Math.round(entity.duration_seconds / 60)}min</span>}
                {entity.created_at && <span> &middot; {formatDate(entity.created_at)}</span>}
              </div>
              {entity.notes && (
                <div style={{ fontSize: 12, color: 'var(--text2, #9299b5)', marginTop: 4, lineHeight: 1.4 }}>
                  {entity.notes.length > 120 ? entity.notes.slice(0, 120) + '...' : entity.notes}
                </div>
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              color: statusColor(entity.status || ''), background: `${statusColor(entity.status || '')}18`,
              textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0,
            }}>
              {entity.status || entity.direction}
            </span>
          </>
        )

      case 'message':
        return (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text1, #e8eaed)', lineHeight: 1.4 }}>
                {entity.body?.length > 150 ? entity.body.slice(0, 150) + '...' : entity.body}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3, #5a6080)', marginTop: 4 }}>
                {entity.direction} &middot; {formatDate(entity.created_at)}
              </div>
            </div>
          </>
        )

      default:
        return (
          <div style={{ flex: 1, fontSize: 13, color: 'var(--text1, #e8eaed)' }}>
            {JSON.stringify(entity).slice(0, 100)}
          </div>
        )
    }
  }

  const cardContent = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 10,
      background: 'var(--surface, #13151c)',
      border: '1px solid rgba(255,255,255,0.06)',
      transition: 'border-color 0.15s',
    }}>
      {renderContent()}
      {link && (
        <div style={{ flexShrink: 0, color: 'var(--text3, #5a6080)' }}>
          <ChevronRight size={14} />
        </div>
      )}
    </div>
  )

  if (link) {
    return (
      <Link href={link} style={{ textDecoration: 'none' }}>
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
