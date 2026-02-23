'use client'

import { useEffect } from 'react'

export default function EstimateError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[estimate error]', error)
  }, [error])

  return (
    <div style={{
      maxWidth: 600, margin: '80px auto', padding: 32,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)', marginBottom: 12 }}>
        Something went wrong
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
        {error.message || 'An unexpected error occurred while loading this estimate.'}
      </div>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  )
}
