'use client'

import { ToastProvider } from '@/components/shared/Toast'
import { PhoneProvider } from '@/components/phone/PhoneProvider'
import Softphone from '@/components/phone/Softphone'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PhoneProvider>
        {children}
        <Softphone />
      </PhoneProvider>
    </ToastProvider>
  )
}
