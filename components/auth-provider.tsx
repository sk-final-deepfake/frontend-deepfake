"use client"

import { useEffect, useState } from "react"
import { bootstrapAuthSession } from "@/lib/auth"

type AuthProviderProps = {
  children: React.ReactNode
}

/** 앱 시작 시 refresh 쿠키로 액세스 JWT(메모리) 복구 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void bootstrapAuthSession().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return null
  }

  return <>{children}</>
}
