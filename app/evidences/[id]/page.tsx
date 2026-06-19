"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AnalysisStatusBadge } from "@/components/analysis-status-badge"
import { AnalysisProgress } from "@/components/analysis-progress"
import {
  AnalysisResult,
  sampleFrameRisks,
  sampleReasonGroups,
  type AnalysisResultData,
  type AnalysisResultTone,
} from "@/components/analysis-result"
import {
  fetchCaseDetail,
  fetchEvidenceDetail,
  type CaseEvidenceSummary,
  type EvidenceDetailData,
} from "@/lib/api/evidence-detail"
import { ApiError } from "@/lib/api/client"
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api/errors"

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

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildResultData(data: EvidenceDetailData): AnalysisResultData {
  const { evidenceInfo, integrityInfo, analysisInfo } = data
  const failed = analysisInfo.status === "FAILED"
  const score = analysisInfo.riskScore ?? 0
  const level: "LOW" | "MEDIUM" | "HIGH" =
    analysisInfo.riskLevel ?? (score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW")
  const tone: AnalysisResultTone =
    failed || level === "HIGH" ? "red" : level === "MEDIUM" ? "orange" : "green"
  const riskLabel = failed
    ? "분석 실패"
    : level === "HIGH"
      ? "딥페이크 의심 - 위험"
      : level === "MEDIUM"
        ? "위변조 정황 - 주의"
        : "위변조 가능성 낮음"
  const isChainValid = integrityInfo.isChainValid ?? integrityInfo.chainValid

  return {
    fileName: evidenceInfo.fileName,
    evidenceId: `EVD-${evidenceInfo.evidenceId}`,
    uploadedAtLabel: formatDateTime(evidenceInfo.uploadedAt),
    riskScore: score,
    riskLabel,
    tone,
    frameRisks: sampleFrameRisks(evidenceInfo.evidenceId, score),
    reasonGroups: failed || level === "LOW" ? [] : sampleReasonGroups(level === "HIGH"),
    integrityRows: [
      ["SHA-256", integrityInfo.originalHash],
      ["해시 알고리즘", integrityInfo.hashAlgorithm],
      ["무결성", isChainValid ? "검증 완료" : "훼손 주의"],
      ["전자서명", "PKI · RSA-4096 적용"],
      ["분석 모델", "DeepScan v2.4.1"],
      ["파일 형식", evidenceInfo.mediaType || evidenceInfo.fileType || "-"],
    ],
  }
}

export default function EvidenceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const evidenceId = Array.isArray(id) ? Number(id[0]) : Number(id)
  const [data, setData] = useState<EvidenceDetailData | null>(null)
  const [caseEvidences, setCaseEvidences] = useState<CaseEvidenceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyzeProgress, setAnalyzeProgress] = useState(8)

  useEffect(() => {
    let cancelled = false

    async function loadDetail() {
      setLoading(true)
      setError(null)

      try {
        if (!id) return
        if (!Number.isFinite(evidenceId)) {
          throw new Error("올바르지 않은 증거 ID입니다.")
        }

        const detail = await fetchEvidenceDetail(evidenceId)
        if (cancelled) return
        setData(detail)

        if (detail.evidenceInfo.caseId) {
          try {
            const caseDetail = await fetchCaseDetail(detail.evidenceInfo.caseId)
            if (!cancelled) setCaseEvidences(caseDetail.evidences ?? [])
          } catch {
            if (!cancelled) setCaseEvidences([])
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(getDetailErrorMessage(err, "분석 결과를 불러오는 데 실패했습니다."))
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDetail()
    return () => {
      cancelled = true
    }
  }, [id, evidenceId])

  // 분석 중인 증거는 진행 과정을 단계별로 보여준다. (mock: 완료 전까지 진행률을 끌어올림)
  useEffect(() => {
    const status = data?.analysisInfo.status
    if (status !== "PENDING" && status !== "PROCESSING") return

    const interval = window.setInterval(() => {
      setAnalyzeProgress((current) => Math.min(92, current + 4))
    }, 600)

    return () => window.clearInterval(interval)
  }, [data])

  const activeIndex = caseEvidences.findIndex((item) => item.evidenceId === evidenceId)
  const position = activeIndex >= 0 ? activeIndex : 0

  function navigate(offset: -1 | 1) {
    if (caseEvidences.length === 0) return
    const next = (position + offset + caseEvidences.length) % caseEvidences.length
    router.push(`/evidences/${caseEvidences[next].evidenceId}`)
  }

  const isAnalyzing =
    data?.analysisInfo.status === "PENDING" || data?.analysisInfo.status === "PROCESSING"

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

        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card shadow-sm">
            <Loader2 className="size-10 animate-spin text-teal-600" />
            <p className="animate-pulse text-sm font-bold text-muted-foreground">
              분석 결과를 불러오는 중입니다...
            </p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mx-auto max-w-2xl">
            <AlertCircle className="size-4" />
            <AlertTitle>데이터 로드 오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : data ? (
          <>
            {caseEvidences.length > 1 ? (
              <FileNavigator
                fileName={caseEvidences[position]?.fileName ?? data.evidenceInfo.fileName}
                position={position}
                total={caseEvidences.length}
                onPrevious={() => navigate(-1)}
                onNext={() => navigate(1)}
              />
            ) : null}

            {isAnalyzing ? (
              <div className="rounded-xl border border-border bg-card px-6 py-10 shadow-sm sm:px-8">
                <AnalysisProgress
                  fileName={data.evidenceInfo.fileName}
                  progress={analyzeProgress}
                  title="증거 분석 처리 중..."
                />
                <div className="mt-6 flex justify-center">
                  <AnalysisStatusBadge status={data.analysisInfo.status} />
                </div>
              </div>
            ) : (
              <AnalysisResult data={buildResultData(data)} />
            )}
          </>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}

function FileNavigator({
  fileName,
  position,
  total,
  onPrevious,
  onNext,
}: {
  fileName: string
  position: number
  total: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <section className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="grid items-center gap-3 sm:grid-cols-[140px_1fr_140px]">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="h-10 rounded-lg text-sm font-bold text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          이전 파일
        </Button>
        <div className="min-w-0 text-center">
          <p className="text-xs font-black text-teal-600">
            {position + 1} / {total}
          </p>
          <p className="mt-1 truncate text-sm font-black text-foreground">{fileName}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          className="h-10 rounded-lg text-sm font-bold text-muted-foreground"
        >
          다음 파일
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}
