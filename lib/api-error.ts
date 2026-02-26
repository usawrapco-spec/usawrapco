import { NextResponse } from 'next/server'

/**
 * Standard API error handler — logs the error server-side and returns
 * a consistent JSON response. Use in catch blocks instead of silent returns.
 */
export function apiError(
  err: unknown,
  context: string,
  status = 500
): NextResponse {
  const message = err instanceof Error ? err.message : 'Internal server error'
  console.error(`[API] ${context}:`, err)
  return NextResponse.json({ error: message }, { status })
}
