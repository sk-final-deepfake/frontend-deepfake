"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace("/login")
      return
    }
    if (session.role !== "admin") {
      router.replace("/main")
    }
  }, [router])

  const session = typeof window !== "undefined" ? getSession() : null
  if (!session || session.role !== "admin") {
    return null
  }

  return <>{children}</>
}
