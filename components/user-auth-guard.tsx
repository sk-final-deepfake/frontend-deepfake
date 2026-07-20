"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { bootstrapAuthSession, getSession, type AuthSession } from "@/lib/auth"
import { getPostLoginHomePath, normalizeUserRole } from "@/lib/permissions"
import { writeUiSessionCookies } from "@/lib/ui-session-cookie"

/**
 * 일반 사용자 영역 가드 (클라이언트 2중 방어).
 * - 미로그인 → /login
 * - 시스템 관리자(ORG_ADMIN) → /admin
 * 서버 미들웨어(middleware.ts)가 1차, 여기가 2차.
 */
export function UserAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setAuthSession] = useState<AuthSession | null>(null)
  const [ready, setReady] = useState(false)

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

      if (normalizeUserRole(current.role) === "ORG_ADMIN") {
        window.location.replace("/admin")
        return
      }

      setAuthSession(current)
      setReady(true)
    }

    const onAuthChange = () => {
      setReady(false)
      void syncSession()
    }

    void syncSession()
    window.addEventListener("auth-change", onAuthChange)
    return () => {
      cancelled = true
      window.removeEventListener("auth-change", onAuthChange)
    }
  }, [router])

  if (!ready || !session || normalizeUserRole(session.role) === "ORG_ADMIN") {
    return null
  }

  return <>{children}</>
}

export function resolveBrandHomeHref(options: {
  variant?: "default" | "admin" | "minimal"
  session: AuthSession | null
}): string {
  const { variant = "default", session } = options
  if (variant === "minimal") return "/login"
  if (variant === "admin") return "/admin"
  if (!session) return "/login"
  return getPostLoginHomePath(session.role)
}
