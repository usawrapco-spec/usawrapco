'use client'

import { useState } from 'react'
import { Phone, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/Toast'
import { usePhone } from './PhoneProvider'

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
  const phone = usePhone() // null if not inside PhoneProvider

  async function handleCall() {
    // Use browser softphone if Device is ready
    if (phone?.isReady) {
      phone.makeCall(toNumber, toName)
      return
    }

    // Fall back to cell-phone outbound (rings agent cell → bridges to customer)
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
  const isBusy = calling || (phone?.callState !== 'idle' && phone?.callState !== undefined)

  return (
    <button
      onClick={handleCall}
      disabled={isBusy}
      title={`Call ${toName || toNumber}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 4 : 6,
        padding: isSmall ? '4px 10px' : '6px 14px',
        borderRadius: 8,
        background: isBusy ? 'var(--surface2)' : 'var(--green)22',
        color: isBusy ? 'var(--text3)' : 'var(--green)',
        border: `1px solid ${isBusy ? 'transparent' : 'var(--green)44'}`,
        fontSize: isSmall ? 11 : 12,
        fontWeight: 600,
        cursor: isBusy ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!isBusy) { e.currentTarget.style.background = 'var(--green)33'; e.currentTarget.style.borderColor = 'var(--green)66' } }}
      onMouseLeave={e => { if (!isBusy) { e.currentTarget.style.background = 'var(--green)22'; e.currentTarget.style.borderColor = 'var(--green)44' } }}
    >
      {calling
        ? <><Loader2 size={isSmall ? 11 : 13} style={{ animation: 'spin 1s linear infinite' }} />Calling...</>
        : <><Phone size={isSmall ? 11 : 13} />Call</>
      }
    </button>
  )
}
