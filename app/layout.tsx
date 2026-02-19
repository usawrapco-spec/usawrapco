import '@/app/globals.css'
import type { Metadata } from 'next'
import { Providers } from '@/components/shared/Providers'

export const metadata: Metadata = {
  title: 'USA Wrap Co — Ops Platform',
  description: 'Operations and project management for USA Wrap Co',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
