"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  FileSearch,
  Home,
  Loader2,
} from "lucide-react"

import { CaseHero } from "./_components/case-hero"
import { DeepfakeModelTab } from "./_components/deepfake-model-tab"
import { EvidenceDrawer } from "./_components/evidence-drawer"
import { EvidenceSelector } from "./_components/evidence-selector"
import { EvidenceSummaryCard } from "./_components/evidence-summary-card"
import { IntegrityTab } from "./_components/integrity-tab"
import { MetadataReportTab } from "./_components/metadata-report-tab"
import { SummaryTab } from "./_components/summary-tab"
import {
  buildProgressSteps,
  getCaseRiskClassName,
  getCaseRiskTone,
  getDisplayRiskLabel,
} from "./_lib/evidence-display"
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
import { getAnalysisStatusLabel } from "@/lib/status-labels"
import { decodeRouteParam } from "@/lib/route-params"

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

function getStatusLabel(status: EvidenceDetailData["analysisInfo"]["status"]) {
  return getAnalysisStatusLabel(normalizeStatus(status))
}

function getCaseStatusLabel(status: string) {
  if (status === "COMPLETED") return "COMPLETED"
  if (status === "PROCESSING") return "PROCESSING"
  if (status === "FAILED") return "FAILED"
  return status || "PENDING"
}

function sortEvidences(evidences: CaseEvidenceSummary[]) {
  return [...evidences].sort((a, b) => b.evidenceId - a.evidenceId)
}

export default function CaseDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseId = decodeRouteParam(Array.isArray(id) ? id[0] : id)
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

      <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-5 px-5 py-7 sm:px-8 lg:px-10">
        {caseLoading ? (
          <LoadingCard label="사건 상세 정보를 불러오는 중입니다..." />
        ) : error ? (
          <ErrorState error={error} onBack={() => router.back()} />
        ) : caseData ? (
          <>
            <CaseBreadcrumb />

            <CaseHero data={caseData} getStatusLabel={getCaseStatusLabel} normalizeStatus={normalizeStatus} />

            <div className="relative">
              {/* 증거 파일: 2개 이상일 때만 왼쪽 hover 드로어로 (1개면 숨김) */}
              {caseData.evidences.length > 1 ? (
                <EvidenceDrawer count={caseData.evidences.length}>
                  <EvidenceSelector
                    evidences={caseData.evidences}
                    selectedEvidenceId={selectedEvidenceId}
                    onSelect={setSelectedEvidenceId}
                    getStatusLabel={getCaseStatusLabel}
                    normalizeStatus={normalizeStatus}
                  />
                </EvidenceDrawer>
              ) : null}

              {/* 결과: 전체 폭 (드로어는 오버레이라 폭에 영향 없음) */}
              <div className="min-w-0">
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

function CaseBreadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm font-bold text-muted-foreground" aria-label="현재 위치">
      <Link href="/mypage" className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
        <Home className="size-4" aria-hidden="true" />
        분석이력
      </Link>
      <ChevronRight className="size-4 text-muted-foreground/50" aria-hidden="true" />
      <span className="text-foreground">사건 상세</span>
    </nav>
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
  const riskTone = getCaseRiskTone(data)
  const riskClassName = getCaseRiskClassName(riskTone)
  const displayRiskLabel = getDisplayRiskLabel(data)
  const extension = getFileExtension(evidenceInfo.fileName, evidenceInfo.mediaType)
  const progressSteps = buildProgressSteps(data)
  const reportReady = analysisInfo.status === "COMPLETED"
  const verificationCode = `VF-${String(evidenceInfo.evidenceId).padStart(8, "0")}`

  return (
    <section className="min-w-0 space-y-4">
      <EvidenceSummaryCard
        data={data}
        extension={extension}
        riskLabel={displayRiskLabel}
        statusLabel={getStatusLabel(analysisInfo.status)}
        riskBadgeClassName={riskClassName.badge}
        riskTextClassName={riskClassName.text}
      />

      <Tabs defaultValue="summary" className="gap-4">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <TabsList
            variant="line"
            className="relative !grid h-16 w-full grid-cols-4 rounded-none border-b-0 bg-card p-0 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:content-['']"
          >
            <TabsTrigger
              value="summary"
              className="z-10 h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-[3px] border-transparent px-5 text-base font-semibold text-muted-foreground outline-none after:hidden data-active:border-blue-500 data-active:text-blue-600 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:data-active:text-blue-400"
            >
              분석 요약
            </TabsTrigger>
            <TabsTrigger
              value="deepfake"
              className="z-10 h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-[3px] border-transparent px-5 text-base font-semibold text-muted-foreground outline-none after:hidden data-active:border-blue-500 data-active:text-blue-600 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:data-active:text-blue-400"
            >
              탐지 상세
            </TabsTrigger>
            <TabsTrigger
              value="integrity"
              className="z-10 h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-[3px] border-transparent px-5 text-base font-semibold text-muted-foreground outline-none after:hidden data-active:border-blue-500 data-active:text-blue-600 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:data-active:text-blue-400"
            >
              무결성 검증
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="z-10 h-full min-w-0 rounded-none border-x-0 border-t-0 border-b-[3px] border-transparent px-5 text-base font-semibold text-muted-foreground outline-none after:hidden data-active:border-blue-500 data-active:text-blue-600 focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none dark:data-active:text-blue-400"
            >
              메타데이터/보고서
            </TabsTrigger>
          </TabsList>

          <div className="p-4">
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
          </div>
        </section>
      </Tabs>
    </section>
  )
}
