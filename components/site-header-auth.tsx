"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDropdown } from "@/components/settings-dropdown"
import { clearSession, getSession } from "@/lib/mock-auth"

export function SiteHeaderAuth() {
  const router = useRouter()
  // 초기 상태를 getSession()으로 설정하여 클라이언트 사이드에서 최대한 빨리 반영되도록 함
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsLoggedIn(getSession() !== null)

    function syncAuthState() {
      setIsLoggedIn(getSession() !== null)
    }

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
    // 로그아웃 후 상태 즉시 반영
    setIsLoggedIn(false)
  }

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        {/* 1. 설정 드롭다운 */}
        <SettingsDropdown />
        
        {/* 2. 로그아웃 버튼 */}
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="size-4" />
          <span className="hidden sm:inline">로그아웃</span>
        </Button>
      </div>
    )
  }
  return (
    <Link href="/login">
      <Button variant="outline" size="sm">
        <LogIn className="size-4" />
        로그인
      </Button>
    </Link>
  )
}
