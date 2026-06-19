"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { bootstrapAuthSession, getSession, type AuthSession } from "@/lib/auth"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setAuthSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    let cancelled = false

    async function syncSession() {
      await bootstrapAuthSession()
      if (cancelled) return

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

    const onAuthChange = () => {
      void syncSession()
    }

    void syncSession()
    window.addEventListener("auth-change", onAuthChange)
    return () => {
      cancelled = true
      window.removeEventListener("auth-change", onAuthChange)
    }
  }, [router])

  if (!session || session.role !== "admin") {
    return null
  }

  return <>{children}</>
}
