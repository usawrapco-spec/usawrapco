import ReferralLandingClient from '@/components/referral/ReferralLandingClient'

export default function ReferralPage({ params }: { params: { code: string } }) {
  return <ReferralLandingClient code={params.code} />
}
