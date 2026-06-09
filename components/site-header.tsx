import { ShieldCheck, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const navItems = [
  { label: "분석", href: "#analyze" },
  { label: "사건 관리", href: "#cases" },
  { label: "보고서", href: "#reports" },
  { label: "설정", href: "#settings" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
              VeriForensics
            </span>
            <span className="text-[11px] text-muted-foreground">
              Digital Media Authentication
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="hidden gap-1.5 border-primary/30 bg-primary/10 text-primary sm:flex"
          >
            <Lock className="size-3" aria-hidden="true" />
            내부망 전용
          </Badge>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
              KIM
            </div>
            <span className="hidden text-sm text-muted-foreground lg:inline">
              김분석 수사관
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
