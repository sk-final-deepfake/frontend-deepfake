"use client"

import { useEffect, useState } from "react"
import { bootstrapAuthSession, getSession, type AuthSession } from "@/lib/auth"
import { getPostLoginHomePath, normalizeUserRole } from "@/lib/permissions"
import { writeUiSessionCookies } from "@/lib/ui-session-cookie"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setAuthSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    let cancelled = false

    async function syncSession() {
      await bootstrapAuthSession()
      if (cancelled) return

      const current = getSession()

      if (!current) {
        window.location.replace("/login")
        return
      }

      writeUiSessionCookies(current.role)

      if (normalizeUserRole(current.role) !== "ORG_ADMIN") {
        window.location.replace(getPostLoginHomePath(current.role))
        return
      }

      setAuthSession(current)
    }

    const onAuthChange = () => {
      void syncSession()
    }

    void syncSession()
    window.addEventListener("auth-change", onAuthChange)
    return () => {
      cancelled = true
      window.removeEventListener("auth-change", onAuthChange)
    }
  }, [])

  if (!session || normalizeUserRole(session.role) !== "ORG_ADMIN") {
    return null
  }

  return <>{children}</>
}
