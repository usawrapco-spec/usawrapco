'use client'

import { ToastProvider } from '@/components/shared/Toast'
import IncomingCallPopup from '@/components/phone/IncomingCallPopup'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <IncomingCallPopup />
    </ToastProvider>
  )
}
