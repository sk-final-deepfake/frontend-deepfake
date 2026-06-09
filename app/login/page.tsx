// 담당: 장현준
// 역할: 로그인 페이지 구현
import { SiteHeader } from "@/components/site-header"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader minimal />

      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <LoginForm />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>VeriForensics · 디지털 미디어 인증 시스템 v1.0</p>
          <p className="font-mono">내부망 전용 · 외부 반출 금지</p>
        </div>
      </footer>
    </div>
  )
}
