import OnboardingClient from '@/components/onboard/OnboardingClient'

export default function OnboardPage({ params }: { params: { token: string } }) {
  return <OnboardingClient token={params.token} />
}
