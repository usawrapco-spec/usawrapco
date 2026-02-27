'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile } from '@/types'
import {
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  ArrowLeft,
  Loader2,
  Link as LinkIcon,
  XCircle,
} from 'lucide-react'

interface EmailAccount {
  id: string
  org_id: string
  email: string
  display_name: string | null
  provider: string
  status: 'active' | 'expired' | 'disconnected'
  assigned_to: string | null
  connected_by: string | null
  last_synced_at: string | null
  gmail_history_id: string | null
  created_at: string
  updated_at: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface Props {
  profile: Profile
  emailAccounts: EmailAccount[]
  teamMembers: TeamMember[]
}

export default function EmailAccountsClient({ profile, emailAccounts: initialAccounts, teamMembers }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [accounts, setAccounts] = useState<EmailAccount[]>(initialAccounts)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Handle OAuth redirect params
  useEffect(() => {
    const success = searchParams?.get('success')
    const error = searchParams?.get('error')

    if (success) {
      setToast({ type: 'success', message: 'Gmail account connected successfully!' })
      router.replace('/settings/email-accounts')
      // Refresh data
      router.refresh()
    } else if (error) {
      setToast({ type: 'error', message: `OAuth error: ${error}` })
      router.replace('/settings/email-accounts')
    }
  }, [searchParams, router])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleConnect = () => {
    window.location.href = '/api/auth/gmail/connect'
  }

  const handleSync = async (accountId: string) => {
    setSyncingId(accountId)
    try {
      const res = await fetch(`/api/email/sync/${accountId}`, { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setToast({
          type: 'success',
          message: `Synced ${data.synced} email${data.synced !== 1 ? 's' : ''}${data.errors > 0 ? ` (${data.errors} errors)` : ''}`,
        })
        // Update local state with new sync time
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accountId
              ? { ...a, last_synced_at: new Date().toISOString(), status: 'active' }
              : a
          )
        )
      } else {
        setToast({ type: 'error', message: data.error || 'Sync failed' })
        if (data.error?.includes('reconnect')) {
          setAccounts((prev) =>
            prev.map((a) => (a.id === accountId ? { ...a, status: 'expired' } : a))
          )
        }
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Sync request failed' })
    } finally {
      setSyncingId(null)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Disconnect this Gmail account? Synced emails will remain in the system.')) return

    setDisconnectingId(accountId)
    try {
      const { error } = await supabase
        .from('email_accounts')
        .update({
          status: 'disconnected',
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId)

      if (error) {
        setToast({ type: 'error', message: 'Failed to disconnect account' })
      } else {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId))
        setToast({ type: 'success', message: 'Account disconnected' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to disconnect account' })
    } finally {
      setDisconnectingId(null)
    }
  }

  const handleAssign = async (accountId: string, userId: string | null) => {
    const { error } = await supabase
      .from('email_accounts')
      .update({ assigned_to: userId, updated_at: new Date().toISOString() })
      .eq('id', accountId)

    if (!error) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, assigned_to: userId } : a))
      )
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
      active: {
        bg: 'rgba(34,192,122,0.12)',
        color: 'var(--green)',
        icon: <CheckCircle size={12} />,
        label: 'Active',
      },
      expired: {
        bg: 'rgba(242,90,90,0.12)',
        color: 'var(--red)',
        icon: <AlertCircle size={12} />,
        label: 'Token Expired',
      },
      disconnected: {
        bg: 'rgba(90,96,128,0.12)',
        color: 'var(--text3)',
        icon: <XCircle size={12} />,
        label: 'Disconnected',
      },
    }

    const s = styles[status] || styles.disconnected

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          background: s.bg,
          color: s.color,
        }}
      >
        {s.icon} {s.label}
      </span>
    )
  }

  const getAssigneeName = (userId: string | null): string => {
    if (!userId) return 'Unassigned'
    const member = teamMembers.find((m) => m.id === userId)
    return member?.name || 'Unknown'
  }

  const activeAccounts = accounts.filter((a) => a.status !== 'disconnected')

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            right: 20,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 8,
            background: toast.type === 'success' ? 'rgba(34,192,122,0.15)' : 'rgba(242,90,90,0.15)',
            border: `1px solid ${toast.type === 'success' ? 'var(--green)' : 'var(--red)'}`,
            color: toast.type === 'success' ? 'var(--green)' : 'var(--red)',
            fontSize: 13,
            fontWeight: 500,
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push('/settings')}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: 8,
            padding: '6px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text2)',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text1)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Email Accounts
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0' }}>
            Connect Gmail accounts to sync and send emails from the CRM
          </p>
        </div>
        <button
          onClick={handleConnect}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={15} />
          Connect Gmail Account
        </button>
      </div>

      {/* Account List */}
      {activeAccounts.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            background: 'var(--surface)',
            borderRadius: 12,
            border: '1px solid var(--surface2)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(79,127,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Mail size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h2
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text1)',
              margin: '0 0 8px',
            }}
          >
            No Email Accounts Connected
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, margin: '0 0 20px', textAlign: 'center', maxWidth: 360 }}>
            Connect a Gmail account to sync customer emails, send messages, and track communication history.
          </p>
          <button
            onClick={handleConnect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <LinkIcon size={15} />
            Connect Gmail Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeAccounts.map((account) => (
            <div
              key={account.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--surface2)',
                borderRadius: 12,
                padding: 20,
                transition: 'border-color 0.15s',
              }}
            >
              {/* Top row: email + status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(79,127,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--text1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {account.email}
                    </span>
                    {getStatusBadge(account.status)}
                  </div>
                  {account.display_name && account.display_name !== account.email && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {account.display_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Details row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                  marginBottom: 14,
                  padding: '12px 0',
                  borderTop: '1px solid var(--surface2)',
                  borderBottom: '1px solid var(--surface2)',
                }}
              >
                {/* Assigned To */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Assigned To
                  </div>
                  <select
                    value={account.assigned_to || ''}
                    onChange={(e) => handleAssign(account.id, e.target.value || null)}
                    style={{
                      width: '100%',
                      background: 'var(--bg)',
                      border: '1px solid var(--surface2)',
                      borderRadius: 6,
                      padding: '5px 8px',
                      color: 'var(--text1)',
                      fontSize: 12,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Last Synced */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Last Synced
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                    <Clock size={12} />
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                      {formatDate(account.last_synced_at)}
                    </span>
                  </div>
                </div>

                {/* Connected */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Connected
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text2)' }}>
                    <User size={12} />
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                      {formatDate(account.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => handleSync(account.id)}
                  disabled={syncingId === account.id || account.status === 'expired'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid var(--surface2)',
                    background: 'var(--bg)',
                    color: account.status === 'expired' ? 'var(--text3)' : 'var(--text1)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: account.status === 'expired' ? 'not-allowed' : 'pointer',
                    opacity: syncingId === account.id ? 0.7 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {syncingId === account.id ? (
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  {syncingId === account.id ? 'Syncing...' : 'Sync Now'}
                </button>

                {account.status === 'expired' && (
                  <button
                    onClick={handleConnect}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'rgba(242,90,90,0.12)',
                      color: 'var(--red)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <AlertCircle size={13} />
                    Reconnect
                  </button>
                )}

                <div style={{ flex: 1 }} />

                <button
                  onClick={() => handleDisconnect(account.id)}
                  disabled={disconnectingId === account.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid rgba(242,90,90,0.2)',
                    background: 'transparent',
                    color: 'var(--red)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: disconnectingId === account.id ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {disconnectingId === account.id ? (
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
