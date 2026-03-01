import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import ReferralLandingClient from '@/components/referral/ReferralLandingClient'

export const dynamic = 'force-dynamic'

export default async function ReferralPage({ params }: { params: { code: string } }) {
  const { code } = params
  const admin = getSupabaseAdmin()

  // Fetch referrer name from referral_codes
  const { data: codeData } = await admin
    .from('referral_codes')
    .select('owner_name, org_id')
    .eq('code', code)
    .eq('type', 'customer')
    .maybeSingle()

  // Track the click (fire-and-forget — don't await or crash on failure)
  const hdrs = headers()
  const ip = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip') || null
  const userAgent = hdrs.get('user-agent') || null
  void admin.from('referral_clicks').insert({
    referral_code: code,
    ip_address: ip,
    user_agent: userAgent,
  })

  return (
    <ReferralLandingClient
      code={code}
      referrerName={codeData?.owner_name || undefined}
    />
  )
}
