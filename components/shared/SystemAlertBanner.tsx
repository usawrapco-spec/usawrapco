"use client"
import { useState, useEffect } from "react"

export default function SystemAlertBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Only show once per session, never block workflow
    const d = sessionStorage.getItem("sys_banner_dismissed")
    if (!d) setDismissed(false)
  }, [])

  if (dismissed) return null

  return (
    <div style={{
      background: "#78350f", borderBottom: "1px solid #92400e",
      padding: "5px 16px", display: "flex", alignItems: "center",
      justifyContent: "space-between", fontSize: 12, color: "#fde68a",
      zIndex: 9999
    }}>
      <span>⚙ System integrations need configuration — <a href="/settings" style={{ color: "#fcd34d", fontWeight: 700 }}>Open Settings</a></span>
      <button
        onClick={() => {
          sessionStorage.setItem("sys_banner_dismissed", "1")
          setDismissed(true)
        }}
        style={{ background: "none", border: "none", color: "#fde68a", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px", marginLeft: 16 }}
      >×</button>
    </div>
  )
}
