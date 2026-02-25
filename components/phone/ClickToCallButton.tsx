'use client'

import { useState } from 'react'
import { Phone, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'

interface Props {
  toNumber: string
  toName?: string
  projectId?: string
  size?: 'sm' | 'md'
}

export default function ClickToCallButton({ toNumber, toName, projectId, size = 'md' }: Props) {
  const [calling, setCalling] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  async function handleCall() {
    setCalling(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast('Not signed in', 'error'); setCalling(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()

      if (!profile?.phone) {
        toast('Add your cell number in Settings > Profile to use click-to-call', 'error')
        setCalling(false)
        return
      }

      const res = await fetch('/api/phone/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toNumber,
          toName: toName || toNumber,
          projectId: projectId || null,
          agentCellNumber: profile.phone,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast(`Calling your phone — pick up to connect to ${toName || toNumber}`)
      } else if (data.error?.includes('not configured')) {
        toast('Twilio not configured — add TWILIO env vars to Vercel', 'error')
      } else {
        toast(data.error || 'Call failed', 'error')
      }
    } catch {
      toast('Call failed', 'error')
    }
    setCalling(false)
  }

  const isSmall = size === 'sm'

  return (
    <button
      onClick={handleCall}
      disabled={calling}
      title={`Call ${toName || toNumber}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 4 : 6,
        padding: isSmall ? '4px 10px' : '6px 14px',
        borderRadius: 8,
        background: calling ? 'var(--surface2)' : 'var(--green)22',
        color: calling ? 'var(--text3)' : 'var(--green)',
        border: `1px solid ${calling ? 'transparent' : 'var(--green)44'}`,
        fontSize: isSmall ? 11 : 12,
        fontWeight: 600,
        cursor: calling ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!calling) { e.currentTarget.style.background = 'var(--green)33'; e.currentTarget.style.borderColor = 'var(--green)66' } }}
      onMouseLeave={e => { if (!calling) { e.currentTarget.style.background = 'var(--green)22'; e.currentTarget.style.borderColor = 'var(--green)44' } }}
    >
      {calling
        ? <><Loader2 size={isSmall ? 11 : 13} style={{ animation: 'spin 1s linear infinite' }} />Calling...</>
        : <><Phone size={isSmall ? 11 : 13} />Call</>
      }
    </button>
  )
}
