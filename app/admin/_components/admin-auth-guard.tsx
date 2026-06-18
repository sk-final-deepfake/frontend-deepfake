"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession, type AuthSession } from "@/lib/auth"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setAuthSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    function syncSession() {
      const current = getSession()

      if (!current) {
        router.replace("/login")
        return
      }

      if (current.role !== "admin") {
        router.replace("/main")
        return
      }

      setAuthSession(current)
    }

    syncSession()
    window.addEventListener("auth-change", syncSession)
    return () => window.removeEventListener("auth-change", syncSession)
  }, [router])

  if (!session || session.role !== "admin") {
    return null
  }

  return <>{children}</>
}
