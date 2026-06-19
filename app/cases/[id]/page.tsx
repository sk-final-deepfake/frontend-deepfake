"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  FileSearch,
  Loader2,
} from "lucide-react"

import { CaseHero } from "./_components/case-hero"
import { DeepfakeModelTab } from "./_components/deepfake-model-tab"
import { EvidenceSelector } from "./_components/evidence-selector"
import { EvidenceSummaryCard } from "./_components/evidence-summary-card"
import { IntegrityTab } from "./_components/integrity-tab"
import { MetadataReportTab } from "./_components/metadata-report-tab"
import { SummaryTab } from "./_components/summary-tab"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AnalysisStatus } from "@/lib/analysis-status"
import {
  fetchCaseDetail,
  fetchEvidenceDetail,
  type CaseDetailData,
  type CaseEvidenceSummary,
  type EvidenceDetailData,
} from "@/lib/api/evidence-detail"
import { ApiError } from "@/lib/api/client"
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api/errors"
import {
  getAnalysisStatusLabel,
  getRiskLabel as getSharedRiskLabel,
  getRiskTone as getSharedRiskTone,
} from "@/lib/status-labels"

type RiskTone = "green" | "orange" | "red"

type ProgressStep = {
  title: string
  time?: string | null
  done: boolean
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (isUnauthorizedError(error)) {
      return "로그인이 만료되었습니다. 다시 로그인한 뒤 이용해 주세요."
    }

    if (error.status === 404 || error.errorCode === "CASE_NOT_FOUND") {
      return "현재 DB에서 이 사건을 찾을 수 없습니다. 분석이력에서 실제 등록된 사건을 다시 선택해 주세요."
    }
  }

  return getApiErrorMessage(error, fallback)
}

function normalizeStatus(status: string): AnalysisStatus {
  if (status === "PROCESSING" || status === "COMPLETED" || status === "FAILED") return status
  return "PENDING"
}

function getFileExtension(fileName: string, mediaType?: string) {
  const extension = fileName.split(".").pop()
  if (extension) return extension.toUpperCase()
  return mediaType || "VIDEO"
}

function getRiskTone(score: number, failed: boolean): RiskTone {
  if (failed) return "red"
  const tone = getSharedRiskTone(score)
  if (tone === "danger") return "red"
  if (tone === "caution") return "orange"
  return "green"
}

function getRiskLabel(tone: RiskTone) {
  if (tone === "red") return getSharedRiskLabel(70)
  if (tone === "orange") return getSharedRiskLabel(40)
  return getSharedRiskLabel(0)
}

function getDisplayRiskLabel(data: EvidenceDetailData, tone: RiskTone) {
  const { analysisInfo } = data
  if (analysisInfo.status === "FAILED") return "분석 실패"
  if (analysisInfo.summary?.trim()) return analysisInfo.summary.trim()
  return getRiskLabel(tone)
}

function getStatusLabel(status: EvidenceDetailData["analysisInfo"]["status"]) {
  if (status === "PENDING") return "대기"
  if (status === "PROCESSING") return "처리 중"
  return getAnalysisStatusLabel(status)
}

function getCaseStatusLabel(status: string) {
  if (status === "COMPLETED") return "COMPLETED"
  if (status === "PROCESSING") return "PROCESSING"
  if (status === "FAILED") return "FAILED"
  return status || "PENDING"
}

function getRiskClassName(tone: RiskTone) {
  if (tone === "red") {
    return {
      badge: "border-red-200 bg-red-50 text-red-600",
      text: "text-red-500",
      soft: "bg-red-50 text-red-600",
      bar: "bg-red-500",
    }
  }

  if (tone === "orange") {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-600",
      text: "text-orange-500",
      soft: "bg-orange-50 text-orange-600",
      bar: "bg-orange-500",
    }
  }

  return {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
    text: "text-emerald-600",
    soft: "bg-emerald-50 text-emerald-600",
    bar: "bg-teal-500",
  }
}

function buildProgressSteps(data: EvidenceDetailData): ProgressStep[] {
  const { evidenceInfo, analysisInfo } = data

  return [
    { title: "파일 업로드", time: evidenceInfo.uploadedAt, done: true },
    { title: "무결성 검증", time: evidenceInfo.uploadedAt, done: true },
    { title: "프레임 분석", time: analysisInfo.requestedAt, done: Boolean(analysisInfo.requestedAt) },
    { title: "위험도 탐지", time: analysisInfo.completedAt, done: analysisInfo.status === "COMPLETED" },
    { title: "품질 평가", time: analysisInfo.completedAt, done: analysisInfo.status === "COMPLETED" },
    { title: "분석 완료", time: analysisInfo.completedAt, done: analysisInfo.status === "COMPLETED" },
  ]
}

function sortEvidences(evidences: CaseEvidenceSummary[]) {
  return [...evidences].sort((a, b) => b.evidenceId - a.evidenceId)
}

export default function CaseDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseId = Array.isArray(id) ? id[0] : id
  const initialEvidenceId = Number(searchParams.get("evidenceId"))
  const [caseData, setCaseData] = useState<CaseDetailData | null>(null)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null)
  const [evidenceDetail, setEvidenceDetail] = useState<EvidenceDetailData | null>(null)
  const [caseLoading, setCaseLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCaseDetail() {
      setCaseLoading(true)
      setError(null)

      try {
        if (!caseId) return

        const result = await fetchCaseDetail(caseId)
        if (cancelled) return

        const sorted = sortEvidences(result.evidences ?? [])
        setCaseData({ ...result, evidences: sorted })
        setSelectedEvidenceId((current) => {
          if (Number.isFinite(initialEvidenceId) && sorted.some((item) => item.evidenceId === initialEvidenceId)) {
            return initialEvidenceId
          }

          if (current && sorted.some((item) => item.evidenceId === current)) {
            return current
          }

          return sorted[0]?.evidenceId ?? null
        })
      } catch (error) {
        if (!cancelled) {
          setError(getErrorMessage(error, "사건 정보를 불러오는 데 실패했습니다."))
        }
      } finally {
        if (!cancelled) {
          setCaseLoading(false)
        }
      }
    }

    loadCaseDetail()

    return () => {
      cancelled = true
    }
  }, [caseId, initialEvidenceId])

  useEffect(() => {
    let cancelled = false

    async function loadEvidenceDetail() {
      if (!selectedEvidenceId) {
        setEvidenceDetail(null)
        return
      }

      setDetailLoading(true)
      setDetailError(null)

      try {
        const result = await fetchEvidenceDetail(selectedEvidenceId)
        if (!cancelled) {
          setEvidenceDetail(result)
        }
      } catch (error) {
        if (!cancelled) {
          setEvidenceDetail(null)
          setDetailError(getErrorMessage(error, "증거 상세 정보를 불러오지 못했습니다."))
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    loadEvidenceDetail()

    return () => {
      cancelled = true
    }
  }, [selectedEvidenceId])

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-5 px-5 py-8 sm:px-8 lg:px-10">
        {caseLoading ? (
          <LoadingCard label="사건 상세 정보를 불러오는 중입니다..." />
        ) : error ? (
          <ErrorState error={error} onBack={() => router.back()} />
        ) : caseData ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-fit rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
              onClick={() => router.back()}
            >
              <ArrowLeft className="size-4" />
              분석 이력
            </Button>

            <CaseHero data={caseData} getStatusLabel={getCaseStatusLabel} normalizeStatus={normalizeStatus} />

            <div className="grid items-start gap-5 xl:grid-cols-[360px_1fr]">
              <EvidenceSelector
                evidences={caseData.evidences}
                selectedEvidenceId={selectedEvidenceId}
                onSelect={setSelectedEvidenceId}
                getStatusLabel={getCaseStatusLabel}
                normalizeStatus={normalizeStatus}
              />

              {detailLoading ? (
                <LoadingCard label="선택한 증거의 분석 상세를 불러오는 중입니다..." />
              ) : detailError ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>증거 상세 로드 오류</AlertTitle>
                  <AlertDescription>{detailError}</AlertDescription>
                </Alert>
              ) : evidenceDetail ? (
                <EvidenceWorkspace
                  data={evidenceDetail}
                  copied={copied}
                  onCopyHash={() => copyHash(evidenceDetail.integrityInfo.originalHash)}
                />
              ) : (
                <EmptyEvidenceState />
              )}
            </div>
          </>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="flex min-h-[46vh] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
      <Loader2 className="size-10 animate-spin text-teal-600" />
      <p className="animate-pulse text-sm font-bold text-slate-500 dark:text-muted-foreground">{label}</p>
    </div>
  )
}

function ErrorState({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        뒤로 가기
      </Button>
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertCircle className="size-4" />
        <AlertTitle>데이터 로드 오류</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  )
}

function EmptyEvidenceState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-14 text-center shadow-sm dark:border-border dark:bg-card">
      <FileSearch className="mx-auto size-8 text-slate-300" />
      <p className="mt-3 text-sm font-bold text-slate-500 dark:text-muted-foreground">
        상세 분석을 볼 증거 파일을 선택해 주세요.
      </p>
    </div>
  )
}

function EvidenceWorkspace({
  data,
  copied,
  onCopyHash,
}: {
  data: EvidenceDetailData
  copied: boolean
  onCopyHash: () => void
}) {
  const { evidenceInfo, analysisInfo } = data
  const riskScore = analysisInfo.riskScore ?? 0
  const confidenceScore = analysisInfo.confidenceScore ?? 0
  const failed = analysisInfo.status === "FAILED"
  const riskTone = getRiskTone(riskScore, failed)
  const riskClassName = getRiskClassName(riskTone)
  const displayRiskLabel = getDisplayRiskLabel(data, riskTone)
  const extension = getFileExtension(evidenceInfo.fileName, evidenceInfo.mediaType)
  const progressSteps = useMemo(() => buildProgressSteps(data), [data])
  const reportReady = analysisInfo.status === "COMPLETED"
  const verificationCode = `VF-${String(evidenceInfo.evidenceId).padStart(8, "0")}`

  return (
    <section className="min-w-0 space-y-5">
      <Tabs defaultValue="summary" className="gap-4">
        <TabsList
          variant="line"
          className="!grid h-24 w-full grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-sm dark:border-border dark:bg-card"
        >
          <TabsTrigger
            value="summary"
            className="h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-4 border-transparent px-5 text-sm font-bold text-slate-500 outline-none after:hidden data-active:border-teal-600 data-active:text-slate-950 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:text-muted-foreground dark:data-active:text-foreground"
          >
            분석 요약
          </TabsTrigger>
          <TabsTrigger
            value="deepfake"
            className="h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-4 border-transparent px-5 text-sm font-bold text-slate-500 outline-none after:hidden data-active:border-teal-600 data-active:text-slate-950 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:text-muted-foreground dark:data-active:text-foreground"
          >
            딥페이크 · 모델 분석
          </TabsTrigger>
          <TabsTrigger
            value="integrity"
            className="h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-4 border-transparent px-5 text-sm font-bold text-slate-500 outline-none after:hidden data-active:border-teal-600 data-active:text-slate-950 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:text-muted-foreground dark:data-active:text-foreground"
          >
            위변조 · 무결성 검증
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className="h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-4 border-transparent px-5 text-sm font-bold text-slate-500 outline-none after:hidden data-active:border-teal-600 data-active:text-slate-950 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:text-muted-foreground dark:data-active:text-foreground"
          >
            메타데이터 · 보고서
          </TabsTrigger>
        </TabsList>

        <EvidenceSummaryCard
          data={data}
          extension={extension}
          riskLabel={displayRiskLabel}
          statusLabel={getStatusLabel(analysisInfo.status)}
          riskBadgeClassName={riskClassName.badge}
        />

        <TabsContent value="summary" className="space-y-5">
          <SummaryTab
            data={data}
            riskLabel={displayRiskLabel}
            riskSoftClassName={riskClassName.soft}
            progressSteps={progressSteps}
          />
        </TabsContent>

        <TabsContent value="deepfake" className="space-y-5">
          <DeepfakeModelTab
            data={data}
            riskLabel={displayRiskLabel}
            riskBadgeClassName={riskClassName.badge}
          />
        </TabsContent>

        <TabsContent value="integrity" className="space-y-5">
          <IntegrityTab data={data} copied={copied} onCopyHash={onCopyHash} />
        </TabsContent>

        <TabsContent value="report" className="space-y-5">
          <MetadataReportTab data={data} extension={extension} reportReady={reportReady} verificationCode={verificationCode} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
