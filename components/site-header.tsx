import Link from "next/link"
import { ShieldCheck, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SiteHeaderAuth } from "@/components/site-header-auth"

const navItems = [
  { label: "분석", href: "/main" },
  { label: "내 분석 기록", href: "/mypage" },
]

type SiteHeaderProps = {
  minimal?: boolean
  variant?: "default" | "admin" | "minimal"
}

export function SiteHeader({
  minimal = false,
  variant = minimal ? "minimal" : "default",
}: SiteHeaderProps) {
  const showNav = variant === "default"
  const showAuth = variant !== "minimal"

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={variant === "admin" ? "/admin" : "/main"} className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
              VeriForensics
            </span>
            <span className="text-[11px] text-muted-foreground">
              {variant === "admin"
                ? "Administration Console"
                : "Digital Media Authentication"}
            </span>
          </div>
        </Link>

        {showNav && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="hidden gap-1.5 border-primary/30 bg-primary/10 text-primary sm:flex"
          >
            <Lock className="size-3" aria-hidden="true" />
            {variant === "admin" ? "관리자 전용" : "내부망 전용"}
          </Badge>
          {showAuth && <SiteHeaderAuth />}
        </div>
      </div>
    </header>
  )
}
