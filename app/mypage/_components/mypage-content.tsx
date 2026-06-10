"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import type { CaseSummary } from "@/app/mypage/_types/case"
import { CaseHistorySection } from "@/app/mypage/_components/case-history-section"
import { fetchMyAnalysisHistory } from "@/lib/api/mypage"
import { ApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"

export function MyPageContent() {
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCases() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchMyAnalysisHistory()
        if (cancelled) return
        setCases(response.content)
        setTotalCount(response.totalElements)
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          setErrorMessage("분석 기록을 보려면 로그인이 필요합니다.")
        } else {
          setErrorMessage("분석 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
        }
        setCases([])
        setTotalCount(0)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadCases()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            내 분석 기록
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            내가 요청한 포렌식 분석 사건을 확인하고 추적합니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/mypage/edit" />}
          nativeButton={false}
        >
          개인정보 수정
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              분석 기록 목록
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              총 {totalCount}건
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            분석 기록을 불러오는 중...
          </div>
        ) : errorMessage ? (
          <div className="space-y-4 px-5 py-16 text-center">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            {errorMessage.includes("로그인") && (
              <Button render={<Link href="/login" />} nativeButton={false}>
                로그인하기
              </Button>
            )}
          </div>
        ) : (
          <CaseHistorySection cases={cases} />
        )}
      </section>
    </main>
  )
}
