import '@/app/globals.css'
import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/shared/Providers'
import VinylChat from '@/components/vinyl-chat'
import SystemAlertBanner from '@/components/shared/SystemAlertBanner'
import SystemHealthBanner from '@/components/layout/SystemHealthBanner'

export const metadata: Metadata = {
  title: 'USA Wrap Co | WrapShop Pro',
  description: 'American Craftsmanship You Can Trust™ — Professional vehicle wrap shop CRM and operations platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'USA Wrap Co',
    statusBarStyle: 'black-translucent',
    startupImage: '/icon-512.png',
  },
  icons: {
    apple: [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#4f7fff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <SystemHealthBanner />
        <Providers>
          <SystemAlertBanner />
          {children}
          <VinylChat />
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch((e)=>{console.error(e)})}`
          }}
        />
      </body>
    </html>
  )
}
