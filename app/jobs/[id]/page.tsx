import { redirect } from 'next/navigation'

export default function JobDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/projects/${params.id}`)
}
