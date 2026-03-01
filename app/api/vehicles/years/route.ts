import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i)
  return NextResponse.json({ years })
}
