"use client"

import { useEffect, useState } from "react"
import {
  bootstrapAuthSession,
  expireSession,
  getSession,
  getSessionExpiresAt,
  isMockAuthSession,
} from "@/lib/auth"

type AuthProviderProps = {
  children: React.ReactNode
}

/** 앱 시작 시 refresh 쿠키로 액세스 JWT(메모리) 복구 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void bootstrapAuthSession().finally(() => setReady(true))
  }, [])

  useEffect(() => {
    let timeoutId: number | undefined

    function scheduleSessionExpiry() {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = undefined
      }

      const session = getSession()
      const expiresAt = getSessionExpiresAt()
      if (!session || isMockAuthSession(session) || !expiresAt) return

      const remainingMs = expiresAt - Date.now()
      if (remainingMs <= 0) {
        expireSession()
        return
      }

      timeoutId = window.setTimeout(expireSession, remainingMs)
    }

    scheduleSessionExpiry()
    window.addEventListener("auth-change", scheduleSessionExpiry)

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      window.removeEventListener("auth-change", scheduleSessionExpiry)
    }
  }, [])

  if (!ready) {
    return null
  }

  return <>{children}</>
}
