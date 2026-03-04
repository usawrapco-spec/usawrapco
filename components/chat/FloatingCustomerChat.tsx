'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, X, Minus } from 'lucide-react'
import JobChat from '@/components/chat/JobChat'

interface Props {
  projectId: string
  orgId: string
  currentUserId: string
  currentUserName: string
  customerName?: string
}

export default function FloatingCustomerChat({ projectId, orgId, currentUserId, currentUserName, customerName }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return createPortal(
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 8000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
      {open && (
        <div style={{
          width: 340, height: 460, marginBottom: 10,
          background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface2)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MessageSquare size={14} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                {customerName ? `Chat with ${customerName.split(' ')[0]}` : 'Customer Chat'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}
              >
                <Minus size={12} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
          {/* Chat (only customer channel) */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <JobChat
              projectId={projectId}
              orgId={orgId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              customerName={customerName}
              installerName=""
              defaultChannel="customer"
            />
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Customer Chat"
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: open ? 'var(--surface2)' : 'var(--green)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.1)' : 'var(--green)'}`,
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(34,192,122,0.4)',
          transition: 'all 0.2s',
        }}
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>
    </div>,
    document.body
  )
}
