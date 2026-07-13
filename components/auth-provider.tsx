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

      // 타이머가 울릴 때 expiresAt을 다시 읽어, touchSessionExpiry로 연장된 경우를 반영한다.
      timeoutId = window.setTimeout(() => {
        const latestExpiresAt = getSessionExpiresAt()
        if (latestExpiresAt && latestExpiresAt > Date.now()) {
          scheduleSessionExpiry()
          return
        }
        expireSession()
      }, remainingMs)
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
