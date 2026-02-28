'use client'

import { ToastProvider } from '@/components/shared/Toast'
import { PhoneProvider } from '@/components/phone/PhoneProvider'
import { PhotoEditorProvider } from '@/components/photo-editor/PhotoEditorProvider'
import { PhotoPickerProvider } from '@/components/media/PhotoPickerModal'
import Softphone from '@/components/phone/Softphone'
import IncomingCallBanner from '@/components/phone/IncomingCallBanner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PhoneProvider>
        <PhotoEditorProvider>
          <PhotoPickerProvider>
            {/* Full-width top banner — impossible to miss on any page */}
            <IncomingCallBanner />
            {children}
            <Softphone />
          </PhotoPickerProvider>
        </PhotoEditorProvider>
      </PhoneProvider>
    </ToastProvider>
  )
}
