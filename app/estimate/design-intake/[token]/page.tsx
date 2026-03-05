import { Metadata } from 'next'
import DesignIntakeClient from '@/components/customer/DesignIntakeClient'

export const metadata: Metadata = {
  title: 'Design Intake | USA Wrap Co',
}

export default function DesignIntakePage({ params }: { params: { token: string } }) {
  return <DesignIntakeClient token={params.token} />
}
