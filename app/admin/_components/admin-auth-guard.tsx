"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSession, setSession, type AuthSession } from "@/lib/auth"

const MOCK_ADMIN_SESSION: AuthSession = {
  role: "admin",
  userId: "1",
  loginId: "admin_kim",
  name: "김관리",
  token: "mock-admin-token",
}

const ENABLE_MOCK_ADMIN = process.env.NODE_ENV !== "production"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setAuthSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    const current = getSession()

    if (current?.role === "admin") {
      setAuthSession(current)
      return
    }

    if (ENABLE_MOCK_ADMIN) {
      setSession(MOCK_ADMIN_SESSION)
      setAuthSession(MOCK_ADMIN_SESSION)
      return
    }

    if (!current) {
      router.replace("/login")
      return
    }

    if (current.role !== "admin") {
      router.replace("/main")
    }
  }, [router])

  if (!session || session.role !== "admin") {
    return null
  }

  return <>{children}</>
}
