import SharePhotosClient from './SharePhotosClient'

interface Props {
  params: { token: string }
}

export default function SharePhotosPage({ params }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14' }}>
      <SharePhotosClient token={params.token} />
    </div>
  )
}
