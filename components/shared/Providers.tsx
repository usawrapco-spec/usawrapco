'use client'

import { ToastProvider } from '@/components/shared/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
