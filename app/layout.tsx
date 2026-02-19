import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'USA Wrap Co — Ops',
  description: 'Operations platform for USA Wrap Co',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
