'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0d0f14', color: '#e8eaed', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f25a5a' }}>Something went wrong</h1>
          <p style={{ color: '#9299b5', marginBottom: '1.5rem' }}>An unexpected error occurred.</p>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: '#4f7fff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
