'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type CallState = 'idle' | 'connecting' | 'ringing' | 'in-call' | 'incoming'

interface PhoneContextValue {
  callState: CallState
  activeNumber: string
  activeName: string
  isMuted: boolean
  isReady: boolean
  duration: number
  makeCall: (to: string, name?: string) => Promise<void>
  hangUp: () => void
  answer: () => void
  decline: () => void
  toggleMute: () => void
  sendDigit: (digit: string) => void
}

const PhoneContext = createContext<PhoneContextValue | null>(null)

export function usePhone() {
  return useContext(PhoneContext)
}

export function PhoneProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>('idle')
  const [activeNumber, setActiveNumber] = useState('')
  const [activeName, setActiveName] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [duration, setDuration] = useState(0)

  const deviceRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setDuration(0)
  }, [])

  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const resetCall = useCallback(() => {
    stopTimer()
    setCallState('idle')
    setActiveNumber('')
    setActiveName('')
    setIsMuted(false)
    callRef.current = null
  }, [stopTimer])

  const initDevice = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch('/api/phone/token')
      if (!res.ok) return // Twilio browser calling not configured

      const { token } = await res.json()
      if (!token) return

      // Dynamic import — browser only, avoids SSR issues
      const { Device } = await import('@twilio/voice-sdk')

      const device = new Device(token, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu'] as any,
        allowIncomingWhileBusy: false,
      })

      device.on('registered', () => setIsReady(true))
      device.on('unregistered', () => setIsReady(false))
      device.on('error', (err: any) => console.error('[Softphone]', err))

      device.on('incoming', (call: any) => {
        callRef.current = call
        const from = call.parameters?.From || 'Unknown'
        setActiveNumber(from)
        setActiveName(call.parameters?.CallerName || from)
        setCallState('incoming')

        call.on('disconnect', resetCall)
        call.on('cancel', resetCall)
      })

      device.on('tokenWillExpire', async () => {
        const r = await fetch('/api/phone/token')
        if (r.ok) {
          const { token: newToken } = await r.json()
          device.updateToken(newToken)
        }
      })

      await device.register()
      deviceRef.current = device
    } catch (err) {
      console.error('[Softphone] Init error:', err)
    }
  }, [supabase, resetCall])

  useEffect(() => {
    initDevice()
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy()
        deviceRef.current = null
      }
      stopTimer()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const makeCall = useCallback(async (to: string, name?: string) => {
    if (!deviceRef.current || callState !== 'idle') return

    setCallState('connecting')
    setActiveNumber(to)
    setActiveName(name || to)
    setIsMuted(false)

    try {
      const call = await deviceRef.current.connect({ params: { To: to } })
      callRef.current = call

      call.on('ringing', () => setCallState('ringing'))
      call.on('accept', () => { setCallState('in-call'); startTimer() })
      call.on('disconnect', resetCall)
      call.on('error', (err: any) => { console.error('[Softphone] Call error:', err); resetCall() })
    } catch (err) {
      console.error('[Softphone] Connect error:', err)
      resetCall()
    }
  }, [callState, startTimer, resetCall])

  const hangUp = useCallback(() => {
    callRef.current?.disconnect()
  }, [])

  const answer = useCallback(() => {
    if (callRef.current && callState === 'incoming') {
      callRef.current.accept()
      setCallState('in-call')
      startTimer()
    }
  }, [callState, startTimer])

  const decline = useCallback(() => {
    if (callRef.current && callState === 'incoming') {
      callRef.current.reject()
      resetCall()
    }
  }, [callState, resetCall])

  const toggleMute = useCallback(() => {
    if (callRef.current) {
      const next = !isMuted
      callRef.current.mute(next)
      setIsMuted(next)
    }
  }, [isMuted])

  const sendDigit = useCallback((digit: string) => {
    callRef.current?.sendDigits(digit)
  }, [])

  return (
    <PhoneContext.Provider value={{
      callState, activeNumber, activeName, isMuted, isReady, duration,
      makeCall, hangUp, answer, decline, toggleMute, sendDigit,
    }}>
      {children}
    </PhoneContext.Provider>
  )
}
