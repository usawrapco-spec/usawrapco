import '@/app/globals.css'
import type { Metadata } from 'next'
import { Providers } from '@/components/shared/Providers'
import VinylWidget from '@/components/vinyl/VinylWidget'

export const metadata: Metadata = {
  title: 'USA Wrap Co | WrapShop Pro',
  description: 'American Craftsmanship You Can Trust™ — Professional vehicle wrap shop CRM and operations platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f7fff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="USA Wrap Co" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <Providers>
          {children}
          <VinylWidget />
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`
          }}
        />
      </body>
    </html>
  )
}
