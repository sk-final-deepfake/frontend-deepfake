"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { fetchEvidenceDetail } from "@/lib/api/evidence-detail"
import { ApiError } from "@/lib/api/client"
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api/errors"
import { buildCaseDetailPath } from "@/lib/route-params"

function getDetailErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (isUnauthorizedError(error)) {
      return "로그인이 만료되었습니다. 다시 로그인한 뒤 이용해 주세요."
    }

    if (error.status === 404) {
      return "현재 DB에서 이 증거를 찾을 수 없습니다. 분석이력에서 실제 등록된 증거를 다시 선택해 주세요."
    }
  }

  return getApiErrorMessage(error, fallback)
}

export default function EvidenceDetailRedirectPage() {
  const { id } = useParams()
  const router = useRouter()
  const evidenceId = Array.isArray(id) ? Number(id[0]) : Number(id)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolveCaseRoute() {
      setError(null)

      try {
        if (!id) return
        if (!Number.isFinite(evidenceId)) {
          throw new Error("올바르지 않은 증거 ID입니다.")
        }

        const detail = await fetchEvidenceDetail(evidenceId)
        if (cancelled) return

        const caseKey = detail.evidenceInfo.caseId ?? detail.evidenceInfo.caseName
        if (!caseKey) {
          throw new Error("이 증거가 연결된 사건 정보를 찾을 수 없습니다.")
        }

        router.replace(buildCaseDetailPath(caseKey, evidenceId))
      } catch (err) {
        if (!cancelled) {
          setError(getDetailErrorMessage(err, "사건 상세 페이지로 이동하지 못했습니다."))
        }
      }
    }

    resolveCaseRoute()

    return () => {
      cancelled = true
    }
  }, [id, evidenceId, router])

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 py-8 sm:px-8 lg:px-10">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 self-start text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
          뒤로 가기
        </Button>

        {error ? (
          <Alert variant="destructive" className="mx-auto max-w-2xl">
            <AlertCircle className="size-4" />
            <AlertTitle>데이터 로드 오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card shadow-sm">
            <Loader2 className="size-10 animate-spin text-teal-600" />
            <p className="animate-pulse text-sm font-bold text-muted-foreground">
              사건 상세 페이지로 이동하는 중입니다...
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
