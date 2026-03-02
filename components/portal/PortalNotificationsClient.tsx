'use client'

import Link from 'next/link'
import { Bell, CheckCircle, AlertCircle, FileText, CreditCard, MessageSquare, Zap, ChevronRight } from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  action_url: string | null
  read: boolean
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  action_required: { icon: AlertCircle, color: '#f59e0b' },
  estimate_ready:  { icon: FileText,    color: '#4f7fff' },
  proof_ready:     { icon: Zap,         color: '#8b5cf6' },
  invoice_ready:   { icon: CreditCard,  color: '#22c07a' },
  status_update:   { icon: CheckCircle, color: '#22d3ee' },
  message:         { icon: MessageSquare, color: '#4f7fff' },
  general:         { icon: Bell,        color: '#9299b5' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function PortalNotificationsClient({
  notifications,
  token,
}: {
  notifications: Notification[]
  token: string
}) {
  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 20,
        fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
      }}>
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: C.text3,
        }}>
          <Bell size={36} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>No notifications yet</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            We will notify you about estimates, proofs, invoices, and project updates.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {notifications.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general
            const Icon = cfg.icon
            const content = (
              <div style={{
                display: 'flex',
                gap: 14,
                padding: '14px 0',
                borderBottom: i < notifications.length - 1 ? `1px solid ${C.border}` : 'none',
                opacity: n.read ? 0.6 : 1,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${cfg.color}18`,
                  border: `1px solid ${cfg.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} color={cfg.color} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: n.read ? 400 : 600,
                    color: C.text1,
                    lineHeight: 1.3,
                  }}>
                    {n.title}
                  </div>
                  {n.body && (
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 3, lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {n.action_url && (
                  <ChevronRight size={16} color={C.text3} style={{ flexShrink: 0, marginTop: 12 }} />
                )}
              </div>
            )

            if (n.action_url) {
              // Resolve relative action URLs against portal base
              const href = n.action_url.startsWith('/portal/')
                ? n.action_url
                : `/portal/${token}${n.action_url}`
              return (
                <Link key={n.id} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {content}
                </Link>
              )
            }
            return <div key={n.id}>{content}</div>
          })}
        </div>
      )}
    </div>
  )
}
