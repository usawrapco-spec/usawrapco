import PhotoShareClient from './PhotoShareClient'

export default function PhotoSharePage({ params }: { params: { token: string } }) {
  return <PhotoShareClient token={params.token} />
}
