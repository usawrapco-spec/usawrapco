'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface PortalLinkCopierProps {
  token: string
  portalType: 'dealer' | 'sales-agent' | 'affiliate'
  size?: number
}

const PORTAL_URL = typeof window !== 'undefined' ? window.location.origin : 'https://app.usawrapco.com'

export default function PortalLinkCopier({ token, portalType, size = 14 }: PortalLinkCopierProps) {
  const [copied, setCopied] = useState(false)
  const url = `${PORTAL_URL}/portal/${portalType}/${token}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy portal link'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
        background: copied ? 'rgba(34,192,122,.12)' : 'var(--surface2)',
        color: copied ? 'var(--green)' : 'var(--text2)',
        cursor: 'pointer', fontSize: 11, fontWeight: 600,
        transition: 'all .15s',
      }}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}
