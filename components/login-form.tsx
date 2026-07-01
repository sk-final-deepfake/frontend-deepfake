"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldCheck, Lock } from "lucide-react"
import { login } from "@/lib/auth-api"
import { getApiErrorMessage } from "@/lib/api/errors"
import { applyLoginResponse, getSession } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const inputClassName = cn(
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm",
  "placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50"
)

export function LoginForm() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [showContactMessage, setShowContactMessage] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) return
    router.replace(session.role === "admin" ? "/admin" : "/main")
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)

    try {
      const response = await login({
        loginId: employeeId.trim(),
        password,
      })

      applyLoginResponse(response)

      router.replace(response.role === "ROLE_ADMIN" ? "/admin" : "/main")
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "로그인 요청에 실패했습니다. 백엔드 서버 상태를 확인해 주세요.")
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFindAccount() {
    setShowContactMessage(true)
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <Badge
          variant="outline"
          className="mb-1 w-fit gap-1.5 border-primary/30 bg-primary/10 text-primary"
        >
          <Lock className="size-3" aria-hidden="true" />
          내부망 전용
        </Badge>
        <CardTitle className="text-xl">ForenShield AI 로그인</CardTitle>
        <CardDescription>
          수사관 계정으로 로그인하여 포렌식 분석 시스템에 접속합니다.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="employeeId"
              className="text-sm font-medium text-foreground"
            >
              사번
            </label>
            <input
              id="employeeId"
              type="text"
              placeholder="예: 1111"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inputClassName}
              autoComplete="username"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3 border-t-0 bg-transparent">
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </Button>

          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleFindAccount}
              disabled={isSubmitting}
            >
              아이디/비밀번호 찾기
            </Button>
            <Link href="/signup" className="flex-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isSubmitting}
              >
                회원가입
              </Button>
            </Link>
          </div>

          {showContactMessage && (
            <p
              role="status"
              className="w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-primary"
            >
              관리자 연락처 : 010-1234-5678 로 문의 주세요.
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            접속 기록은 보안 감사 목적으로 저장됩니다.
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
