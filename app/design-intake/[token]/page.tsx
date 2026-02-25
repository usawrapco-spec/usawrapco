import DesignIntakeClient from '@/components/design-intake/DesignIntakeClient'

interface Props {
  params: { token: string }
}

export default function DesignIntakePage({ params }: Props) {
  return <DesignIntakeClient token={params.token} />
}
