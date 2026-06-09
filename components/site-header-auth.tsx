"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { clearSession, getSession } from "@/lib/mock-auth"

export function SiteHeaderAuth() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    function syncAuthState() {
      setIsLoggedIn(getSession() !== null)
    }

    syncAuthState()
    window.addEventListener("auth-change", syncAuthState)
    window.addEventListener("storage", syncAuthState)

    return () => {
      window.removeEventListener("auth-change", syncAuthState)
      window.removeEventListener("storage", syncAuthState)
    }
  }, [])

  function handleLogout() {
    clearSession()
    router.push("/login")
  }

  if (isLoggedIn) {
    return (
      <Button variant="outline" size="sm" onClick={handleLogout}>
        <LogOut data-icon="inline-start" />
        로그아웃
      </Button>
    )
  }

  return (
    <Link href="/login">
      <Button variant="outline" size="sm">
        <LogIn data-icon="inline-start" />
        로그인
      </Button>
    </Link>
  )
}
