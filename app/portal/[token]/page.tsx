import CustomerPortalHome from '../../../components/portal/CustomerPortalHome'

export default async function PortalPage({ params }: { params: { token: string } }) {
  return <CustomerPortalHome token={params.token} />
}
