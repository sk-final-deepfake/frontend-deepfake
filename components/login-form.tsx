"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Lock } from "lucide-react"
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

const MOCK_ID = "1111"
const MOCK_PASSWORD = "2222"

export function LoginForm() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")
  const [showContactMessage, setShowContactMessage] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage("")

    if (employeeId === MOCK_ID && password === MOCK_PASSWORD) {
      router.push("/dashboard")
      return
    }

    setErrorMessage("아이디 또는 비밀번호가 올바르지 않습니다.")
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
        <CardTitle className="text-xl">VeriForensics 로그인</CardTitle>
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
              placeholder="예: 20240001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inputClassName}
              autoComplete="username"
              required
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
          <Button type="submit" className="w-full" size="lg">
            로그인
          </Button>

          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleFindAccount}
            >
              아이디/비밀번호 찾기
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
            >
              회원가입
            </Button>
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
