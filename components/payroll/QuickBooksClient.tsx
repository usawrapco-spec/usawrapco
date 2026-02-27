'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import {
  Link2, Link2Off, RefreshCw, Upload, Check, AlertTriangle, Loader2,
  FileText, X, ExternalLink, Info
} from 'lucide-react'

interface QBStatus {
  connected: boolean
  realm_id?: string
  connected_at?: string
  is_expired?: boolean
}

interface ImportResult {
  imported: number
  skipped: number
  unmatched: number
  unmatched_list: any[]
  errors: string[]
  total_rows: number
}

interface SyncResult {
  imported: number
  unmatched: number
  unmatched_list: any[]
  total_qb: number
}

export default function QuickBooksClient({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [status, setStatus] = useState<QBStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [uploading, setUploading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true)
    const res = await fetch('/api/payroll/quickbooks/status')
    const data = await res.json()
    setStatus(data)
    setLoadingStatus(false)
  }, [])

  useEffect(() => {
    fetchStatus()
    // Check URL for QB connection result
    const params = new URLSearchParams(window.location.search)
    if (params.get('qb_connected')) {
      window.history.replaceState({}, '', window.location.pathname)
      fetchStatus()
    }
  }, [fetchStatus])

  const handleConnect = () => {
    router.push('/api/payroll/quickbooks/auth')
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/payroll/quickbooks/sync', { method: 'POST' })
    const data = await res.json()
    setSyncing(false)
    if (!res.ok) { alert(data.error || 'Sync failed'); return }
    setSyncResult(data)
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect QuickBooks? This will remove stored tokens.')) return
    setDisconnecting(true)
    await fetch('/api/payroll/quickbooks/status', { method: 'DELETE' })
    setDisconnecting(false)
    setStatus({ connected: false })
    setSyncResult(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setImportResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/payroll/invoice-import', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { alert(data.error || 'Import failed'); return }
    setImportResult(data)
    if (fileRef.current) fileRef.current.value = ''
  }

  const card: React.CSSProperties = {
    background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', padding: 24, marginBottom: 20
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, color: 'var(--text1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8
  }
  const sectionSub: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 20 }

  if (loadingStatus) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
  }

  return (
    <div style={{ maxWidth: 760 }}>
      {/* QB Connection */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={sectionTitle}>
              <Link2 size={16} color={status?.connected ? 'var(--green)' : 'var(--text2)'} />
              QuickBooks Online
            </div>
            <div style={sectionSub}>
              {status?.connected
                ? `Connected to company ID ${status.realm_id} · Connected ${status.connected_at ? new Date(status.connected_at).toLocaleDateString() : 'recently'}`
                : 'Connect to sync invoices, customers, and financial data from QuickBooks Online.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {status?.connected ? (
              <>
                <button onClick={handleDisconnect} disabled={disconnecting} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--red)44', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link2Off size={13} /> Disconnect
                </button>
                <button onClick={handleSync} disabled={syncing} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {syncing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
                  {syncing ? 'Syncing...' : 'Sync Invoices'}
                </button>
              </>
            ) : (
              <button onClick={handleConnect} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2ca01c', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={14} /> Connect QuickBooks
              </button>
            )}
          </div>
        </div>

        {/* Connection status badge */}
        {status?.connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--green)11', border: '1px solid var(--green)33', borderRadius: 8 }}>
            <Check size={14} color="var(--green)" />
            <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
              {status.is_expired ? 'Token expired — sync will auto-refresh' : 'Connected and ready to sync'}
            </span>
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, color: 'var(--text1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Info size={13} /> What this integration does:</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>Syncs invoices from QuickBooks → your invoices table (last 90 days)</li>
              <li>Matches QB customers to your existing customer records by name</li>
              <li>Updates invoice status (paid/unpaid) automatically</li>
              <li>Shows unmatched invoices so you can manually link them</li>
            </ul>
            <div style={{ marginTop: 12, color: 'var(--text3)' }}>
              Requires <code style={{ background: '#1a1d27', padding: '1px 6px', borderRadius: 4 }}>QUICKBOOKS_CLIENT_ID</code> and <code style={{ background: '#1a1d27', padding: '1px 6px', borderRadius: 4 }}>QUICKBOOKS_CLIENT_SECRET</code> in your environment variables.
            </div>
          </div>
        )}

        {/* Sync result */}
        {syncResult && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--accent)11', border: '1px solid var(--accent)33', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: 'var(--text1)', marginBottom: 8 }}>Sync complete</div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <span><strong style={{ color: 'var(--green)' }}>{syncResult.imported}</strong> invoices imported</span>
              <span><strong style={{ color: 'var(--amber)' }}>{syncResult.unmatched}</strong> unmatched customers</span>
              <span><strong style={{ color: 'var(--text2)' }}>{syncResult.total_qb}</strong> total from QB</span>
            </div>
            {syncResult.unmatched_list.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>UNMATCHED CUSTOMERS</div>
                {syncResult.unmatched_list.slice(0, 5).map((u, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--amber)', padding: '3px 0' }}>
                    {u.name} — Invoice #{u.invoice} — ${u.amount}
                  </div>
                ))}
                {syncResult.unmatched_list.length > 5 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>...and {syncResult.unmatched_list.length - 5} more</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual CSV Import */}
      <div style={card}>
        <div style={sectionTitle}>
          <Upload size={16} color="var(--cyan)" />
          Manual Invoice Import (CSV)
        </div>
        <div style={sectionSub}>
          Export invoices from QuickBooks as CSV and import them here. Columns recognized: Invoice Number, Customer, Amount, Date, Status, Due Date.
        </div>

        <div style={{ border: '2px dashed #2a2d3a', borderRadius: 10, padding: '24px', textAlign: 'center', cursor: 'pointer', position: 'relative', transition: 'border-color 0.15s' }}
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--accent)' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Importing...</span>
            </div>
          ) : (
            <>
              <FileText size={28} style={{ color: 'var(--text3)', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Click to upload QuickBooks CSV export</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Supports QuickBooks Invoice List export format</div>
            </>
          )}
        </div>

        {importResult && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: importResult.errors.length > 0 ? 'var(--amber)11' : 'var(--green)11', border: `1px solid ${importResult.errors.length > 0 ? 'var(--amber)33' : 'var(--green)33'}`, borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: 'var(--text1)', marginBottom: 8 }}>Import complete</div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, flexWrap: 'wrap' }}>
              <span><strong style={{ color: 'var(--green)' }}>{importResult.imported}</strong> imported</span>
              <span><strong style={{ color: 'var(--text2)' }}>{importResult.skipped}</strong> skipped</span>
              <span><strong style={{ color: 'var(--amber)' }}>{importResult.unmatched}</strong> unmatched customers</span>
              <span><strong style={{ color: 'var(--text3)' }}>{importResult.total_rows}</strong> total rows</span>
            </div>
            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>ERRORS ({importResult.errors.length})</div>
                {importResult.errors.slice(0, 3).map((err, i) => <div key={i} style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{err}</div>)}
              </div>
            )}
            {importResult.unmatched_list.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>UNMATCHED CUSTOMERS</div>
                {importResult.unmatched_list.slice(0, 4).map((u, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>
                    {u.name} — Invoice #{u.invoice} — ${u.amount?.toFixed(2)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text1)' }}>CSV Column Guide:</strong> The importer recognizes common QuickBooks export column names.
          At minimum, include <em>Customer</em> and <em>Amount</em> columns. Invoice Number, Date, Status, and Due Date are optional but recommended.
        </div>
      </div>
    </div>
  )
}
