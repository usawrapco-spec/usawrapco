'use client'

import { ToastProvider } from '@/components/shared/Toast'
import { PhoneProvider } from '@/components/phone/PhoneProvider'
import { PhotoEditorProvider } from '@/components/photo-editor/PhotoEditorProvider'
import Softphone from '@/components/phone/Softphone'
import IncomingCallBanner from '@/components/phone/IncomingCallBanner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PhoneProvider>
        <PhotoEditorProvider>
          {/* Full-width top banner — impossible to miss on any page */}
          <IncomingCallBanner />
          {children}
          <Softphone />
        </PhotoEditorProvider>
      </PhoneProvider>
    </ToastProvider>
  )
}
