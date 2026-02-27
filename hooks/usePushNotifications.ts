'use client'

import { useState, useEffect, useCallback } from 'react'

type PermState = 'unsupported' | 'default' | 'granted' | 'denied' | 'loading'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [permState, setPermState] = useState<PermState>('loading')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [vapidKey, setVapidKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On mount — check current state
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermState('unsupported')
      return
    }

    const perm = Notification.permission as PermissionState
    setPermState(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default')

    // Check if we already have an active subscription
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
      })
    })

    // Fetch VAPID public key from server
    fetch('/api/push/subscribe')
      .then(r => r.json())
      .then(d => { if (d.vapidPublicKey) setVapidKey(d.vapidPublicKey) })
      .catch((error) => { console.error(error); })
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null)
    setBusy(true)
    try {
      if (!vapidKey) throw new Error('Push not configured')

      const perm = await Notification.requestPermission()
      setPermState(perm as PermState)
      if (perm !== 'granted') {
        setBusy(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      const json = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      })

      if (!res.ok) throw new Error('Failed to save subscription')
      setIsSubscribed(true)
      setBusy(false)
      return true
    } catch (err: any) {
      setError(err.message)
      setBusy(false)
      return false
    }
  }, [vapidKey])

  const unsubscribe = useCallback(async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setIsSubscribed(false); setBusy(false); return }

      const endpoint = sub.endpoint
      await sub.unsubscribe()

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })

      setIsSubscribed(false)
    } catch (err: any) {
      setError(err.message)
    }
    setBusy(false)
  }, [])

  return { permState, isSubscribed, vapidKey, busy, error, subscribe, unsubscribe }
}
