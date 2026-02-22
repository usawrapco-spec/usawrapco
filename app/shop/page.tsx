// Public-facing shop page — no auth required
import ShopClient from '@/components/shop/ShopClient'

export const metadata = {
  title: 'Get a Wrap Quote — USA Wrap Co',
  description: 'Configure your vehicle wrap online and get an instant quote. Start with a $250 design deposit.',
}

export default function ShopPage() {
  return <ShopClient />
}
