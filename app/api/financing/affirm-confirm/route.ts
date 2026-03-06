import { NextRequest, NextResponse } from 'next/server'

/**
 * Legacy route — Affirm is now handled through Stripe Checkout.
 * Stripe manages authorization and capture automatically.
 * This route exists only as a fallback redirect.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const payToken = searchParams.get('token')

  // Redirect back to the pay page
  const destination = payToken ? `/pay/${payToken}` : '/'
  return NextResponse.redirect(new URL(destination, req.url))
}
