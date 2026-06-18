"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, LogOut, Moon, Sun, UserCog, User } from "lucide-react"
import { useUserSettings } from "@/hooks/use-user-settings"
import { fetchMyProfile } from "@/lib/api/user"
import { clearSession, getSession, type AuthSession } from "@/lib/auth"
import { cn } from "@/lib/utils"

const themeOptions: { value: "light" | "dark"; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
]

export function SiteHeaderAuth() {
  const router = useRouter()
  const { settings, updateSettings } = useUserSettings()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [department, setDepartment] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const profile = await fetchMyProfile()
        if (!cancelled) setDepartment(profile.department)
      } catch {
        if (!cancelled) setDepartment(null)
      }
    }

    function syncAuthState() {
      setSession(getSession())
      loadProfile()
    }

    syncAuthState()

    window.addEventListener("auth-change", syncAuthState)
    window.addEventListener("storage", syncAuthState)

    return () => {
      cancelled = true
      window.removeEventListener("auth-change", syncAuthState)
      window.removeEventListener("storage", syncAuthState)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  function handleLogout() {
    clearSession()
    setOpen(false)
    setSession(null)
    router.push("/login")
  }

  const displayName = session?.name || "홍길동"

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="알림"
        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
      >
        <Bell className="size-4" aria-hidden="true" />
      </button>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="계정 메뉴"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold transition-colors",
            open
              ? "bg-slate-100 text-slate-900 dark:bg-muted dark:text-foreground"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
          )}
        >
          <User className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{displayName}</span>
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            role="menu"
            aria-label="계정 메뉴"
            className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-popover p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-popover-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {department ?? "소속 부서 미등록"}
                </p>
              </div>
            </div>

            <div className="space-y-2 py-3">
              <p className="text-xs font-medium text-muted-foreground">화면 테마</p>
              <div className="grid grid-cols-2 gap-1.5">
                {themeOptions.map((option) => {
                  const Icon = option.icon
                  const isActive = settings.theme === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => updateSettings({ theme: option.value })}
                      className={cn(
                        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <Link
                href="/mypage/edit"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <UserCog className="size-4" aria-hidden="true" />
                개인정보 수정
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" aria-hidden="true" />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
