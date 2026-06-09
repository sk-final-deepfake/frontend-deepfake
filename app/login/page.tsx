// 담당: 장현준
// 역할: 로그인 페이지 구현
import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground">
              VeriForensics
            </h1>
            <p className="text-sm text-muted-foreground">수사관 로그인</p>
          </div>
        </div>

        <form className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              아이디
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="아이디 입력"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호 입력"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {/* TODO: 실제 로그인 API 연동 예정 (현재 동작 없음) */}
          <Button type="submit" size="lg" className="w-full">
            로그인
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
