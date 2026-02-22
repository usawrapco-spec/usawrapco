import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

interface ScoreInput {
  business_name: string
  industry: string
  email: string | null
  website: string | null
  google_rating: number | null
  linkedin: string | null
  instagram: string | null
  facebook: string | null
  phone: string | null
}

export function calculateProspectScore(input: ScoreInput): number {
  let score = 0

  // Has email (+30) — most important for outreach
  if (input.email) score += 30

  // Has website (+20) — legitimacy signal
  if (input.website) score += 20

  // Google rating 4+ (+15) — established business
  if (input.google_rating && input.google_rating >= 4) score += 15

  // Industry fit (+20) — fleet-heavy industries
  const highValueIndustries = ['fleet', 'plumber', 'electrician', 'hvac', 'landscaper', 'contractor', 'food truck', 'moving', 'delivery', 'towing', 'pest control', 'cleaning']
  if (highValueIndustries.some(ind => input.industry?.toLowerCase().includes(ind))) score += 20

  // Has social presence (+5 each, max 15)
  if (input.linkedin) score += 5
  if (input.instagram) score += 5
  if (input.facebook) score += 5

  // Has phone (+10) — reachable
  if (input.phone) score += 10

  return Math.min(100, score)
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prospects } = await req.json()
  if (!Array.isArray(prospects)) {
    return NextResponse.json({ error: 'prospects array required' }, { status: 400 })
  }

  const scored = prospects.map((p: ScoreInput) => ({
    ...p,
    score: calculateProspectScore(p),
  }))

  return NextResponse.json({ scored })
}
