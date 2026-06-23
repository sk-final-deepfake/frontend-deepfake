"use client"

import { useEffect, useState, type MouseEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SiteHeaderAuth } from "@/components/site-header-auth"
import { cn } from "@/lib/utils"

const defaultNavItems = [
  { key: "dashboard", label: "대시보드", href: "/main" },
  { key: "analysis", label: "분석요청", href: "/main#new-analysis" },
  { key: "history", label: "분석이력", href: "/mypage" },
  { key: "compare", label: "비교검증", href: "/compare" },
]

const adminNavItems = [
  { key: "admin-dashboard", label: "대시보드", href: "/admin" },
  { key: "admin-users", label: "계정 관리", href: "/admin/users" },
  { key: "admin-evidences", label: "증거 관리", href: "/admin/evidences" },
  { key: "admin-invite-codes", label: "생성코드", href: "/admin/invite-codes" },
  { key: "admin-logs", label: "로그", href: "/admin/logs" },
  { key: "admin-profile", label: "내 정보", href: "/admin/profile" },
]

type SiteHeaderProps = {
  minimal?: boolean
  variant?: "default" | "admin" | "minimal"
}

export function SiteHeader({
  minimal = false,
  variant = minimal ? "minimal" : "default",
}: SiteHeaderProps) {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  const showNav = variant !== "minimal"
  const showAuth = variant !== "minimal"
  const activeKey = getActiveNavKey(pathname, hash)
  const brandHref = variant === "admin" ? "/admin" : "/main"
  const navItems = variant === "admin" ? adminNavItems : defaultNavItems

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash)
    }

    syncHash()
    window.addEventListener("hashchange", syncHash)
    window.addEventListener("popstate", syncHash)
    const interval = window.setInterval(syncHash, 150)

    return () => {
      window.removeEventListener("hashchange", syncHash)
      window.removeEventListener("popstate", syncHash)
      window.clearInterval(interval)
    }
  }, [pathname])

  function handleMainNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("/main")) return
    if (pathname !== "/main") return

    event.preventDefault()
    window.history.pushState(null, "", href)

    const nextHash = href.includes("#") ? `#${href.split("#")[1]}` : ""
    const nextView = nextHash === "#new-analysis" ? "analysis" : "dashboard"

    setHash(nextHash)

    function dispatchMainViewChange() {
      window.dispatchEvent(new CustomEvent("main-view-change", { detail: { view: nextView } }))
      window.dispatchEvent(new Event("hashchange"))
    }

    dispatchMainViewChange()
    window.setTimeout(dispatchMainViewChange, 0)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#f8fbfd]/95 backdrop-blur-sm dark:border-border dark:bg-background/90">
      <div className="mx-auto grid h-20 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:h-24 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          href={brandHref}
          onClick={(event) => handleMainNavigation(event, brandHref)}
          className="flex min-w-0 items-center gap-4"
        >
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-100 text-sky-700 shadow-sm dark:border-primary/30 dark:bg-primary/15 dark:text-primary">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-base font-bold tracking-tight text-slate-900 dark:text-foreground">
              VeriForensics
            </span>
            <span className="mt-1 text-xs font-medium text-slate-500 dark:text-muted-foreground">
              Digital Media Authentication
            </span>
          </div>
        </Link>

        {showNav && (
          <nav
            className={cn(
              "hidden items-center",
              variant === "admin" ? "md:flex" : "lg:flex",
              variant === "admin" ? "gap-5" : "gap-8"
            )}
            aria-label="주 메뉴"
          >
            {navItems.map((item) => {
              const isActive = activeKey === item.key
              const className = cn(
                "font-semibold transition-colors hover:text-slate-950 dark:hover:text-foreground",
                variant === "admin" ? "text-sm" : "text-base",
                isActive
                  ? "font-black text-slate-950 dark:text-foreground"
                  : "text-slate-500 dark:text-muted-foreground"
              )

              return item.href.includes("#") ? (
                <a
                  key={item.label}
                  href={item.href}
                  className={className}
                  onClick={(event) => handleMainNavigation(event, item.href)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={className}
                  onClick={(event) => handleMainNavigation(event, item.href)}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}

        <div className={cn("flex items-center justify-end gap-3", !showNav && "lg:col-start-3")}>
          <Badge
            variant="outline"
            className="hidden h-8 gap-1.5 rounded-full border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 sm:flex dark:border-primary/30 dark:bg-primary/10 dark:text-primary"
          >
            <Lock className="size-4" aria-hidden="true" />
            {variant === "admin" ? "관리자 전용" : "내부망 전용"}
          </Badge>
          {showAuth && <SiteHeaderAuth />}
        </div>
      </div>
    </header>
  )
}

function getActiveNavKey(pathname: string, hash: string) {
  if (pathname === "/admin") return "admin-dashboard"
  if (pathname.startsWith("/admin/users")) return "admin-users"
  if (pathname.startsWith("/admin/evidences")) return "admin-evidences"
  if (pathname.startsWith("/admin/invite-codes")) return "admin-invite-codes"
  if (pathname.startsWith("/admin/logs")) return "admin-logs"
  if (pathname.startsWith("/admin/profile")) return "admin-profile"
  if (pathname === "/mypage") return "history"
  if (pathname.startsWith("/cases") || pathname.startsWith("/evidences")) return "history"
  if (pathname === "/compare") return "compare"
  if (pathname !== "/main") return ""
  if (hash === "#new-analysis") return "analysis"
  if (hash === "#compare") return "compare"

  return "dashboard"
}
