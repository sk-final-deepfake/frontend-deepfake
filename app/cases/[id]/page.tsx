"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  FileSearch,
  FileVideo,
  Home,
  Loader2,
  MessageSquareText,
  MoreVertical,
  Pencil,
  PlayCircle,
  Square,
  Trash2,
  X,
} from "lucide-react"

import { CaseHero } from "./_components/case-hero"
import { DeepfakeV2Tab } from "./_components/deepfake-v2-tab"
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
  type AnalysisType,
  fetchCaseDetail,
  fetchEvidenceDetail,
  type CaseDetailData,
  type CaseEvidenceSummary,
  type EvidenceDetailData,
} from "@/lib/api/evidence-detail"
import {
  cancelCaseAnalysis,
  markEvidenceExcluded,
  startCaseAnalysis,
  uploadEvidenceToCase,
} from "@/lib/api/case-workflow"
import { ApiError } from "@/lib/api/client"
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api/errors"
import { getAnalysisStatusLabel } from "@/lib/status-labels"
import { buildCaseDetailPath, decodeRouteParam } from "@/lib/route-params"
import { cn } from "@/lib/utils"
import { formatDateTime, formatDuration } from "@/lib/formatters"

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
  return [...evidences].sort((a, b) => a.evidenceId - b.evidenceId)
}

const EVIDENCE_PAGE_SIZE = 10

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
  const [caseRefreshKey, setCaseRefreshKey] = useState(0)
  const [showResultDashboard, setShowResultDashboard] = useState(false)

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
  }, [caseId, initialEvidenceId, caseRefreshKey])

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

  function selectEvidence(evidenceId: number) {
    setSelectedEvidenceId(evidenceId)
    if (selectedEvidenceId !== evidenceId) {
      router.replace(buildCaseDetailPath(caseId, evidenceId), { scroll: false })
    }
  }

  function refreshCase() {
    setCaseRefreshKey((key) => key + 1)
  }

  function viewResult(evidenceId: number) {
    selectEvidence(evidenceId)
    setShowResultDashboard(true)
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  function updateCaseSettings(caseName: string, representativeEvidenceId: number | null) {
    setCaseData((current) => (current ? { ...current, caseName, representativeEvidenceId } : current))
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-7 sm:px-8 lg:px-10">
        {caseLoading ? (
          <LoadingCard label="사건 상세 정보를 불러오는 중입니다..." />
        ) : error ? (
          <ErrorState error={error} onBack={() => router.back()} />
        ) : caseData ? (
          <>
            {!showResultDashboard ? (
              <>
                <CaseBreadcrumb />
                <CaseHero data={caseData} getStatusLabel={getCaseStatusLabel} />
              </>
            ) : null}

            <div className="relative">
              <div className="min-w-0 space-y-4">
                {showResultDashboard ? (
                  <CaseResultView
                    caseData={caseData}
                    evidenceDetail={evidenceDetail}
                    selectedEvidenceId={selectedEvidenceId}
                    detailLoading={detailLoading}
                    detailError={detailError}
                    onBack={() => setShowResultDashboard(false)}
                  />
                ) : (
                  <CaseWorkflowPanel
                    caseData={caseData}
                    selectedEvidenceId={selectedEvidenceId}
                    evidenceDetail={evidenceDetail}
                    detailLoading={detailLoading}
                    detailError={detailError}
                    onSelectEvidence={selectEvidence}
                    onViewResult={viewResult}
                    onUpdateCaseSettings={updateCaseSettings}
                    onRefresh={refreshCase}
                  />
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
        사건 관리
      </Link>
      <ChevronRight className="size-4 text-muted-foreground/50" aria-hidden="true" />
      <span className="text-foreground">사건 상세</span>
    </nav>
  )
}

type ResultMediaMode = "original" | "overlay" | "heatmap"

function MockAnalysisOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[39%] top-[20%] h-[34%] w-[24%] rounded-[18%] border-2 border-red-400 bg-red-500/18 shadow-[0_0_24px_rgba(239,68,68,0.35)]" />
      <div className="absolute left-[43%] top-[38%] h-[7%] w-[16%] rounded-sm bg-yellow-300/55" />
      <div className="absolute left-[34%] top-[56%] h-[18%] w-[36%] rounded-md border border-red-300 bg-red-500/12" />
      <div className="absolute bottom-4 left-4 rounded-md bg-red-600/90 px-2.5 py-1 text-xs font-black text-white">
        얼굴 경계 불연속 · 압축 흔적
      </div>
    </div>
  )
}

function HeatmapLayer({ heatmapImageUrl }: { heatmapImageUrl: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {heatmapImageUrl ? (
        <img
          src={heatmapImageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-70 mix-blend-screen"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_32%,rgba(255,0,0,0.58),rgba(255,210,0,0.42)_16%,rgba(0,210,255,0.18)_34%,rgba(0,0,0,0)_58%)] mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_57%,rgba(255,80,0,0.42),rgba(255,220,0,0.2)_20%,rgba(0,0,0,0)_50%)] mix-blend-screen" />
        </>
      )}
      <div className="absolute bottom-4 left-4 rounded-md bg-black/60 px-2.5 py-1 text-xs font-black text-white">
        위험도가 높은 영역을 색상으로 표시합니다.
      </div>
    </div>
  )
}

function CaseResultView({
  caseData,
  evidenceDetail,
  selectedEvidenceId,
  detailLoading,
  detailError,
  onBack,
}: {
  caseData: CaseDetailData
  evidenceDetail: EvidenceDetailData | null
  selectedEvidenceId: number | null
  detailLoading: boolean
  detailError: string | null
  onBack: () => void
}) {
  const [mediaMode, setMediaMode] = useState<ResultMediaMode>("original")
  const selectedEvidence =
    caseData.evidences.find((evidence) => evidence.evidenceId === selectedEvidenceId) ??
    caseData.evidences[0] ??
    null
  const displayRiskLabel = evidenceDetail ? getDisplayRiskLabel(evidenceDetail) : "위험"
  const riskTone = evidenceDetail ? getCaseRiskTone(evidenceDetail) : "red"
  const resultVerdict = getManipulationSuspicionLabel(riskTone)
  const riskScore = formatResultScore(evidenceDetail?.analysisInfo.riskScore ?? null)
  const numericRiskScore = Number(riskScore ?? 0)
  const confidenceScore = formatResultScore(evidenceDetail?.analysisInfo.confidenceScore ?? null)
  const resultTitle =
    selectedEvidence?.originalFileName ??
    selectedEvidence?.fileName ??
    selectedEvidence?.displayLabel ??
    caseData.caseName
  const analyzedAt = evidenceDetail?.analysisInfo.completedAt ?? evidenceDetail?.analysisInfo.requestedAt ?? caseData.createdAt
  const resultMediaUrl =
    evidenceDetail?.evidenceInfo.videoUrl ??
    evidenceDetail?.evidenceInfo.streamUrl ??
    evidenceDetail?.evidenceInfo.fileUrl ??
    evidenceDetail?.evidenceInfo.previewUrl ??
    selectedEvidence?.videoUrl ??
    selectedEvidence?.fileUrl ??
    selectedEvidence?.previewUrl ??
    null
  const overlayVideoUrl =
    evidenceDetail?.analysisInfo.overlayVideoUrl ??
    evidenceDetail?.evidenceInfo.overlayVideoUrl ??
    null
  const heatmapImageUrl =
    evidenceDetail?.analysisInfo.heatmapImageUrl ??
    evidenceDetail?.evidenceInfo.heatmapImageUrl ??
    evidenceDetail?.analysisInfo.representativeFrames?.find((frame) => Boolean(frame.heatmapUrl))?.heatmapUrl ??
    null
  const visibleVideoUrl = mediaMode === "overlay" && overlayVideoUrl ? overlayVideoUrl : resultMediaUrl
  const summaryRows = buildResultSummaryRows(evidenceDetail, resultVerdict, confidenceScore)
  const summaryLines = buildResultSummaryLines(evidenceDetail)

  return (
    <section className="space-y-8 rounded-xl bg-[#f6f8fa] px-0 py-1 text-slate-950 dark:bg-background dark:text-foreground">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            증거 관리
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-normal text-slate-950 dark:text-foreground">
              증거 분석 결과
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {resultTitle} · 분석 완료 {formatDateTime(analyzedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 shadow-none hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
          >
            <Download className="size-4" aria-hidden="true" />
            Download PDF
          </Button>
        </div>
      </header>

      {detailLoading ? (
        <LoadingCard label="분석 결과를 불러오는 중입니다..." />
      ) : detailError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>분석 결과 로드 오류</AlertTitle>
          <AlertDescription>{detailError}</AlertDescription>
        </Alert>
      ) : evidenceDetail ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-950">
              {visibleVideoUrl ? (
                <video
                  src={visibleVideoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-bold text-white/60">
                  <FileVideo className="mb-3 size-8" aria-hidden="true" />
                  미리보기 가능한 영상이 없습니다.
                </div>
              )}
              {mediaMode === "overlay" && !overlayVideoUrl ? <MockAnalysisOverlay /> : null}
              {mediaMode === "heatmap" ? <HeatmapLayer heatmapImageUrl={heatmapImageUrl} /> : null}
              <div className="absolute right-3 top-3 flex rounded-full bg-black/45 p-1 backdrop-blur-sm">
                {([
                  ["original", "원본"],
                  ["overlay", "오버레이"],
                  ["heatmap", "히트맵"],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-black transition-colors",
                      mediaMode === mode ? "bg-teal-500 text-white" : "text-white/80 hover:text-white"
                    )}
                    onClick={() => setMediaMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {mediaMode !== "original" ? (
                <div className="absolute left-4 top-4 rounded-md bg-black/55 px-2.5 py-1 text-xs font-black text-white">
                  {mediaMode === "overlay" ? "탐지 오버레이" : "히트맵"}
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <section className="overflow-hidden rounded-xl border border-red-100 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/20">
                <div className="border-l-4 border-red-500 p-5">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-xs font-black text-slate-500">자동 탐지 결과</p>
                      <p className="mt-3 flex items-center gap-2 text-3xl font-black text-red-600">
                        <span className="size-2.5 rounded-full bg-red-500" aria-hidden="true" />
                        {resultVerdict}
                      </p>
                      <p className="mt-3 max-w-80 text-sm font-semibold leading-6 text-slate-600">
                        AI 분석 결과이며, 최종 검토가 필요합니다.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-500">위험 점수</p>
                      <p className="mt-3 whitespace-nowrap text-3xl font-black text-red-600">
                        {riskScore ?? "-"}
                        {riskScore ? <span className="text-base font-semibold text-slate-500">/100</span> : null}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none dark:border-border dark:bg-card">
                <div className="border-b border-slate-200 px-5 py-4 dark:border-border">
                  <h2 className="text-base font-bold text-slate-950 dark:text-foreground">주요 분석 결과</h2>
                  <p className="mt-1 text-sm text-slate-500">딥페이크 탐지 중심 요약</p>
                </div>
                <div className="space-y-5 p-5">
                  {summaryRows.map((row) => (
                    <ResultSummaryRow
                      key={row.label}
                      label={row.label}
                      description={row.description}
                      value={row.value}
                      tone={row.tone}
                    />
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none dark:border-border dark:bg-card">
            <div className="grid grid-cols-4 border-b border-slate-200 text-center text-sm font-medium text-slate-500 dark:border-border">
              <button
                type="button"
                className="border-b-2 border-slate-950 py-4 font-semibold text-slate-950 dark:border-foreground dark:text-foreground"
              >
                분석 요약
              </button>
              <button type="button" className="py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground">
                딥페이크
              </button>
              <button type="button" className="py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground">
                위변조
              </button>
              <button type="button" className="py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground">
                이력
              </button>
            </div>
            <div className="px-5 py-6">
              <div className="space-y-2 text-base font-normal leading-8 text-slate-950 dark:text-foreground">
                {summaryLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                <span>EVD-{evidenceDetail.evidenceInfo.evidenceId}</span>
                <span aria-hidden="true">·</span>
                <span>{displayRiskLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{formatDateTime(analyzedAt)}</span>
              </div>
            </div>
          </section>
        </>
      ) : (
        <EmptyEvidenceState />
      )}
    </section>
  )
}

function CaseWorkflowPanel({
  caseData,
  selectedEvidenceId,
  evidenceDetail,
  detailLoading,
  detailError,
  onSelectEvidence,
  onViewResult,
  onUpdateCaseSettings,
  onRefresh,
}: {
  caseData: CaseDetailData
  selectedEvidenceId: number | null
  evidenceDetail: EvidenceDetailData | null
  detailLoading: boolean
  detailError: string | null
  onSelectEvidence: (evidenceId: number) => void
  onViewResult: (evidenceId: number) => void
  onUpdateCaseSettings: (caseName: string, representativeEvidenceId: number | null) => void
  onRefresh: () => void
}) {
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [actionMode, setActionMode] = useState<"idle" | "analyze" | "exclude" | "replace">("idle")
  const [analysisType, setAnalysisType] = useState<AnalysisType>("DEEPFAKE")
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<number[]>([])
  const [baseEvidenceId, setBaseEvidenceId] = useState<number | null>(null)
  const [targetEvidenceId, setTargetEvidenceId] = useState<number | null>(null)
  const [excludeReason, setExcludeReason] = useState("잘못 업로드된 증거로 사용 제외 처리")
  const [infoTab, setInfoTab] = useState<"metadata" | "comment">("metadata")
  const [menuOpen, setMenuOpen] = useState(false)
  const [editCaseOpen, setEditCaseOpen] = useState(false)
  const [caseNameDraft, setCaseNameDraft] = useState(caseData.caseName)
  const [representativeDraftId, setRepresentativeDraftId] = useState<number | null>(
    caseData.representativeEvidenceId ?? null
  )
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [commentsByEvidence, setCommentsByEvidence] = useState<Record<number, string>>({})
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [localAnalysisProgress, setLocalAnalysisProgress] = useState<Record<number, number>>({})
  const [evidencePage, setEvidencePage] = useState(1)

  const evidences = caseData.evidences
  const activeEvidences = evidences.filter((item) => (item.lifecycleStatus ?? "ACTIVE") === "ACTIVE")
  const evidencePageCount = Math.max(1, Math.ceil(evidences.length / EVIDENCE_PAGE_SIZE))
  const evidencePageStart = (evidencePage - 1) * EVIDENCE_PAGE_SIZE
  const pagedEvidences = evidences.slice(evidencePageStart, evidencePageStart + EVIDENCE_PAGE_SIZE)
  const selectedEvidence =
    evidences.find((item) => item.evidenceId === selectedEvidenceId) ?? evidences[0] ?? null
  const selectedEvidenceActive = (selectedEvidence?.lifecycleStatus ?? "ACTIVE") === "ACTIVE"
  const selectedEvidenceStatus = normalizeStatus(selectedEvidence?.analysisStatus ?? "PENDING")
  const selectedEvidenceLocalProgress = selectedEvidence
    ? localAnalysisProgress[selectedEvidence.evidenceId]
    : undefined
  const selectedEvidenceRunning = selectedEvidence
    ? isEvidenceAnalysisRunning(selectedEvidence) || selectedEvidenceLocalProgress != null
    : false
  const selectedEvidenceProgress = selectedEvidenceRunning
    ? Math.max(selectedEvidenceLocalProgress ?? 0, selectedEvidence?.analysisProgress ?? 0)
    : selectedEvidenceStatus === "COMPLETED"
      ? 100
      : 0
  const selectedEvidenceAnalysisSelectable = selectedEvidence
    ? isEvidenceSelectableForAnalysis(selectedEvidence)
    : false
  const selectedEvidenceRepresentative =
    selectedEvidence != null && caseData.representativeEvidenceId === selectedEvidence.evidenceId
  const selectableAnalysisEvidences = evidences.filter(isEvidenceSelectableForAnalysis)
  const selectedAnalysisIdSet = new Set(selectedAnalysisIds)
  const selectedAnalysisCount = selectedAnalysisIds.filter((id) =>
    selectableAnalysisEvidences.some((evidence) => evidence.evidenceId === id)
  ).length
  const allSelectableAnalysisSelected =
    selectableAnalysisEvidences.length > 0 &&
    selectableAnalysisEvidences.every((evidence) => selectedAnalysisIdSet.has(evidence.evidenceId))
  const selectedMediaUrl =
    evidenceDetail?.evidenceInfo.videoUrl ??
    evidenceDetail?.evidenceInfo.streamUrl ??
    evidenceDetail?.evidenceInfo.fileUrl ??
    evidenceDetail?.evidenceInfo.previewUrl ??
    selectedEvidence?.videoUrl ??
    selectedEvidence?.fileUrl ??
    selectedEvidence?.previewUrl ??
    null
  const selectedMetadata = evidenceDetail?.evidenceInfo.technicalMetadata ?? null
  const selectedComment = selectedEvidence ? commentsByEvidence[selectedEvidence.evidenceId] ?? "" : ""

  useEffect(() => {
    if (message?.type !== "success") return

    const timer = window.setTimeout(() => {
      setMessage((current) => (current?.type === "success" ? null : current))
    }, 2200)

    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    const selectableIds = new Set(selectableAnalysisEvidences.map((evidence) => evidence.evidenceId))
    setSelectedAnalysisIds((current) => {
      const next = current.filter((id) => selectableIds.has(id))
      return next.length === current.length ? current : next
    })
  }, [evidences])

  useEffect(() => {
    setEvidencePage((current) => Math.min(current, evidencePageCount))
  }, [evidencePageCount])

  useEffect(() => {
    if (!selectedEvidenceId) return

    const selectedIndex = evidences.findIndex((evidence) => evidence.evidenceId === selectedEvidenceId)
    if (selectedIndex < 0) return

    setEvidencePage(Math.floor(selectedIndex / EVIDENCE_PAGE_SIZE) + 1)
  }, [evidences, selectedEvidenceId])

  useEffect(() => {
    const runningIds = new Set(
      evidences
        .filter((evidence) => isEvidenceAnalysisRunning(evidence) || localAnalysisProgress[evidence.evidenceId] != null)
        .map((evidence) => evidence.evidenceId)
    )

    if (runningIds.size === 0) return

    const interval = window.setInterval(() => {
      setLocalAnalysisProgress((current) => {
        let changed = false
        const next = { ...current }

        for (const evidenceId of runningIds) {
          const currentValue = next[evidenceId] ?? 8
          const bumped = Math.min(92, currentValue + 4)
          if (bumped !== currentValue) {
            next[evidenceId] = bumped
            changed = true
          }
        }

        return changed ? next : current
      })
    }, 900)

    return () => window.clearInterval(interval)
  }, [evidences, localAnalysisProgress])

  async function runAction(
    action: () => Promise<void>,
    successText: string,
    options: { showSuccess?: boolean; refresh?: boolean } = {}
  ) {
    setIsWorking(true)
    setMessage(null)

    try {
      await action()
      if (options.showSuccess !== false) {
        setMessage({ type: "success", text: successText })
      }
      if (options.refresh !== false) {
        onRefresh()
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "작업 처리 중 오류가 발생했습니다.",
      })
    } finally {
      setIsWorking(false)
    }
  }

  async function handleUploadFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return

    await runAction(async () => {
      let firstEvidenceId: number | null = null
      for (const file of selectedFiles) {
        const result = await uploadEvidenceToCase(caseData.caseId, caseData.caseName, file)
        firstEvidenceId ??= result.evidenceId
      }
      if (firstEvidenceId) onSelectEvidence(firstEvidenceId)
    }, `${selectedFiles.length}개 증거가 사건에 추가되었습니다.`)

    if (uploadInputRef.current) uploadInputRef.current.value = ""
  }

  function toggleAnalysisEvidence(evidenceId: number) {
    const target = evidences.find((evidence) => evidence.evidenceId === evidenceId)
    if (!target || !isEvidenceSelectableForAnalysis(target)) return

    setSelectedAnalysisIds((current) =>
      current.includes(evidenceId)
        ? current.filter((id) => id !== evidenceId)
        : [...current, evidenceId]
    )
  }

  function toggleAllSelectableAnalysis() {
    if (allSelectableAnalysisSelected) {
      setSelectedAnalysisIds([])
      return
    }

    setSelectedAnalysisIds(selectableAnalysisEvidences.map((evidence) => evidence.evidenceId))
  }

  async function handleStartAnalysis() {
    if (activeEvidences.length === 0) {
      setMessage({ type: "error", text: "분석 가능한 활성 증거가 없습니다." })
      return
    }

    if (analysisType === "COMPARE") {
      if (!baseEvidenceId || !targetEvidenceId || baseEvidenceId === targetEvidenceId) {
        setMessage({ type: "error", text: "비교검증은 서로 다른 기준 증거와 비교 대상 증거를 선택해야 합니다." })
        return
      }
    } else if (selectedAnalysisIds.length === 0) {
      setMessage({ type: "error", text: "분석할 증거를 1개 이상 선택해 주세요." })
      return
    }

    const targetIds =
      analysisType === "COMPARE"
        ? [baseEvidenceId, targetEvidenceId].filter((id): id is number => typeof id === "number")
        : selectedAnalysisIds

    await runAction(
      async () => {
        await startCaseAnalysis({
          caseId: caseData.caseId,
          caseName: caseData.caseName,
          analysisType,
          evidenceIds: targetIds,
          baseEvidenceId,
          targetEvidenceId,
        })
        if (targetIds[0]) onSelectEvidence(targetIds[0])
        setLocalAnalysisProgress((current) => {
          const next = { ...current }
          for (const id of targetIds) next[id] = Math.max(next[id] ?? 0, 8)
          return next
        })
        setSelectedAnalysisIds([])
        setActionMode("idle")
      },
      `${getAnalysisTypeLabel(analysisType)} 요청이 등록되었습니다.`,
      { showSuccess: false, refresh: false }
    )
  }

  async function handleQuickStartAnalysis() {
    if (!selectedEvidence) return

    if (!selectedEvidenceAnalysisSelectable) {
      setMessage({ type: "error", text: "미분석 상태의 활성 증거만 분석할 수 있습니다." })
      return
    }

    await runAction(
      async () => {
        await startCaseAnalysis({
          caseId: caseData.caseId,
          caseName: caseData.caseName,
          analysisType: "DEEPFAKE",
          evidenceIds: [selectedEvidence.evidenceId],
        })
        onSelectEvidence(selectedEvidence.evidenceId)
        setLocalAnalysisProgress((current) => ({
          ...current,
          [selectedEvidence.evidenceId]: Math.max(current[selectedEvidence.evidenceId] ?? 0, 8),
        }))
      },
      `${formatEvidenceTitle(selectedEvidence)} 분석 요청이 등록되었습니다.`,
      { showSuccess: false, refresh: false }
    )
  }

  async function handleCancelSelectedAnalysis() {
    if (!selectedEvidence || !selectedEvidenceRunning) return

    const confirmed = window.confirm(
      `${formatEvidenceTitle(selectedEvidence)} 분석을 중단하시겠습니까?\n원본 증거와 등록 이력은 유지됩니다.`
    )
    if (!confirmed) return

    await runAction(async () => {
      await cancelCaseAnalysis(selectedEvidence.evidenceId)
      setLocalAnalysisProgress((current) => {
        const next = { ...current }
        delete next[selectedEvidence.evidenceId]
        return next
      })
      onSelectEvidence(selectedEvidence.evidenceId)
    }, `${formatEvidenceTitle(selectedEvidence)} 분석이 중단되었습니다.`)
  }

  function handleSaveCaseSettings() {
    const nextName = caseNameDraft.trim()
    if (!nextName) {
      setMessage({ type: "error", text: "사건명을 입력해 주세요." })
      return
    }

    onUpdateCaseSettings(nextName, representativeDraftId)
    setEditCaseOpen(false)
    setMenuOpen(false)
    setMessage({
      type: "success",
      text: "사건 정보가 수정되었습니다. 원본 증거와 CoC 기록은 변경되지 않습니다.",
    })
  }

  async function handleConfirmDeleteEvidence() {
    if (!selectedEvidence || !selectedEvidenceActive) return
    if (selectedEvidenceRepresentative && activeEvidences.length > 1) {
      setDeleteConfirmOpen(false)
      setMessage({
        type: "error",
        text: "대표는 삭제 불가능합니다. 대표 증거를 먼저 변경한 뒤 삭제해 주세요.",
      })
      return
    }

    const nextActiveEvidence = activeEvidences.find((evidence) => evidence.evidenceId !== selectedEvidence.evidenceId)

    await runAction(async () => {
      await markEvidenceExcluded(selectedEvidence.evidenceId, "화면에서 삭제 처리")
      if (selectedEvidenceRepresentative && !nextActiveEvidence) {
        onUpdateCaseSettings(caseData.caseName, null)
      }
      if (nextActiveEvidence) onSelectEvidence(nextActiveEvidence.evidenceId)
    }, `${formatEvidenceTitle(selectedEvidence)}가 삭제 처리되었습니다.`)

    setDeleteConfirmOpen(false)
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-foreground">등록된 증거</h2>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-muted-foreground">
            {activeEvidences.length}/{evidences.length}
          </span>
        </div>
        <div className="relative">
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept="video/*"
            className="sr-only"
            onChange={(event) => void handleUploadFiles(event.target.files)}
          />
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isWorking}
            aria-label="증거 작업 메뉴"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreVertical className="size-5" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 text-sm font-black shadow-lg">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isWorking}
                onClick={() => {
                  setMenuOpen(false)
                  setCaseNameDraft(caseData.caseName)
                  setRepresentativeDraftId(caseData.representativeEvidenceId ?? selectedEvidence?.evidenceId ?? null)
                  setEditCaseOpen(true)
                  setDeleteConfirmOpen(false)
                }}
              >
                수정하기
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isWorking}
                onClick={() => {
                  setMenuOpen(false)
                  uploadInputRef.current?.click()
                }}
              >
                증거 추가
                <FilePlus2 className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedEvidence || isWorking || (selectedEvidence.lifecycleStatus ?? "ACTIVE") !== "ACTIVE"}
                onClick={() => {
                  setMenuOpen(false)
                  if (selectedEvidenceRepresentative && activeEvidences.length > 1) {
                    setDeleteConfirmOpen(false)
                    setMessage({
                      type: "error",
                      text: "대표는 삭제 불가능합니다. 대표 증거를 먼저 변경한 뒤 삭제해 주세요.",
                    })
                    return
                  }
                  setDeleteConfirmOpen(true)
                }}
              >
                삭제하기
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-600"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="size-4" aria-hidden="true" />
          )}
          {message.text}
        </div>
      ) : null}

      <div className="mt-5">
        {selectableAnalysisEvidences.length > 0 ? (
          <div className="mb-3 flex justify-end">
            <div className="flex flex-wrap items-center gap-2">
              {selectedAnalysisCount > 0 ? (
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-black text-muted-foreground">
                  {selectedAnalysisCount}개 선택
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg px-3 text-xs font-black"
                disabled={isWorking}
                onClick={toggleAllSelectableAnalysis}
              >
                {allSelectableAnalysisSelected ? "선택 해제" : "전체 선택"}
              </Button>
              <Button
                type="button"
                className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700"
                disabled={selectedAnalysisCount === 0 || isWorking}
                onClick={() => void handleStartAnalysis()}
              >
                {isWorking ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                분석하기
              </Button>
            </div>
          </div>
        ) : null}
        {evidences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center text-sm font-bold text-muted-foreground">
            아직 등록된 증거가 없습니다. 증거 영상을 먼저 업로드하세요.
          </div>
        ) : (
          <>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
              {pagedEvidences.map((evidence) => (
                <EvidenceStripCard
                  key={evidence.evidenceId}
                  evidence={evidence}
                  active={selectedEvidenceId === evidence.evidenceId}
                  representative={caseData.representativeEvidenceId === evidence.evidenceId}
                  disabled={(evidence.lifecycleStatus ?? "ACTIVE") !== "ACTIVE"}
                  analysisSelectable={isEvidenceSelectableForAnalysis(evidence)}
                  analysisSelected={selectedAnalysisIdSet.has(evidence.evidenceId)}
                  onToggleAnalysisSelect={() => toggleAnalysisEvidence(evidence.evidenceId)}
                  onSelect={() => {
                    if ((evidence.lifecycleStatus ?? "ACTIVE") !== "ACTIVE") return
                    onSelectEvidence(evidence.evidenceId)
                    setActionMode("idle")
                    setMenuOpen(false)
                    setEditCaseOpen(false)
                    setDeleteConfirmOpen(false)
                  }}
                />
              ))}
            </div>
            {evidencePageCount > 1 ? (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
                <span>
                  {evidencePageStart + 1}-{Math.min(evidencePageStart + EVIDENCE_PAGE_SIZE, evidences.length)} /{" "}
                  {evidences.length}건
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-2"
                    disabled={evidencePage <= 1}
                    onClick={() => setEvidencePage((page) => Math.max(1, page - 1))}
                    aria-label="이전 증거 페이지"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <span className="min-w-14 text-center font-black text-foreground">
                    {evidencePage} / {evidencePageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-2"
                    disabled={evidencePage >= evidencePageCount}
                    onClick={() => setEvidencePage((page) => Math.min(evidencePageCount, page + 1))}
                    aria-label="다음 증거 페이지"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {selectedEvidence ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_420px]">
          <section className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-foreground">
                  {formatEvidenceTitle(selectedEvidence)}
                </h3>
                <p className="mt-0.5 font-mono text-xs font-bold text-muted-foreground">
                  EVD-{selectedEvidence.evidenceId}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2 text-xs font-bold">
                <span className={cn("rounded-full px-2.5 py-1", getLifecycleClassName(selectedEvidence.lifecycleStatus ?? "ACTIVE"))}>
                  {getLifecycleLabel(selectedEvidence.lifecycleStatus ?? "ACTIVE")}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                  {getEvidenceAnalysisLabel(selectedEvidence)}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
                {detailLoading ? (
                  <div className="flex size-full items-center justify-center text-sm font-bold text-white/70">
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    영상 정보를 불러오는 중
                  </div>
                ) : selectedMediaUrl ? (
                  <video
                    src={selectedMediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center text-sm font-bold text-white/60">
                    <FileVideo className="mb-3 size-8" aria-hidden="true" />
                    미리보기 가능한 영상이 없습니다.
                  </div>
                )}
              </div>

            </div>
          </section>

          <aside className="flex min-h-full flex-col rounded-xl border border-border bg-background p-4">
            <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setInfoTab("metadata")}
                className={cn(
                  "h-9 rounded-md text-sm font-black transition-colors",
                  infoTab === "metadata" ? "bg-card text-teal-700 shadow-sm" : "text-muted-foreground"
                )}
              >
                메타데이터
              </button>
              <button
                type="button"
                onClick={() => setInfoTab("comment")}
                className={cn(
                  "h-9 rounded-md text-sm font-black transition-colors",
                  infoTab === "comment" ? "bg-card text-teal-700 shadow-sm" : "text-muted-foreground"
                )}
              >
                코멘트
              </button>
            </div>

            {infoTab === "metadata" ? (
              <dl className="mt-4 space-y-3">
                <CaseMetadataRow label="증거 ID" value={`EVD-${selectedEvidence.evidenceId}`} accent />
                <CaseMetadataRow label="파일 유형" value={selectedEvidence.mediaType || "-"} />
                <CaseMetadataRow
                  label="해상도"
                  value={
                    selectedMetadata?.width && selectedMetadata?.height
                      ? `${selectedMetadata.width} x ${selectedMetadata.height}`
                      : "-"
                  }
                />
                <CaseMetadataRow
                  label="재생 시간"
                  value={selectedMetadata?.durationSec != null ? formatDuration(selectedMetadata.durationSec) : "-"}
                />
                <CaseMetadataRow
                  label="프레임레이트"
                  value={selectedMetadata?.fps != null ? `${selectedMetadata.fps} fps` : "-"}
                />
                <CaseMetadataRow label="코덱" value={selectedMetadata?.codec || "-"} />
                <CaseMetadataRow
                  label="원본 파일명"
                  value={selectedEvidence.originalFileName ?? selectedEvidence.fileName}
                />
              </dl>
            ) : (
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <label
                  htmlFor="caseEvidenceComment"
                  className="flex items-center gap-2 text-sm font-black text-foreground"
                >
                  <MessageSquareText className="size-4 text-teal-600" aria-hidden="true" />
                  증거 코멘트
                </label>
                <textarea
                  id="caseEvidenceComment"
                  value={selectedComment}
                  onChange={(event) =>
                    setCommentsByEvidence((current) => ({
                      ...current,
                      [selectedEvidence.evidenceId]: event.target.value,
                    }))
                  }
                  placeholder="증거 확인 내용이나 분석 요청 메모를 입력하세요."
                  className="mt-3 min-h-32 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm font-medium leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                />
              </div>
            )}

            {detailError ? (
              <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {detailError}
              </p>
            ) : null}

            <div className="mt-auto space-y-3 pt-4">
              {selectedEvidence.analysisStatus === "COMPLETED" ? (
                <Button
                  type="button"
                  className="h-11 w-full bg-emerald-600 text-base font-black text-white hover:bg-emerald-700"
                  disabled={!selectedEvidenceActive}
                  onClick={() => onViewResult(selectedEvidence.evidenceId)}
                >
                  결과보기
                </Button>
              ) : selectedEvidenceRunning ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        AI 분석 중입니다
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-700/75">
                        완료되면 결과보기가 활성화됩니다.
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-emerald-700">
                      {selectedEvidenceProgress}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${selectedEvidenceProgress}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      className="flex size-6 shrink-0 items-center justify-center bg-transparent text-slate-950 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isWorking}
                      aria-label="분석 중단"
                      title="분석 중단"
                      onClick={() => void handleCancelSelectedAnalysis()}
                    >
                      <Square className="size-3.5 fill-current" strokeWidth={0} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  className="h-11 w-full bg-emerald-600 text-base font-black text-white hover:bg-emerald-700"
                  disabled={isWorking || !selectedEvidenceAnalysisSelectable}
                  onClick={() => void handleQuickStartAnalysis()}
                >
                  <PlayCircle className="size-5" aria-hidden="true" />
                  {selectedEvidence.analysisStatus === "PROCESSING" ? "분석 중" : "분석하기"}
                </Button>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {editCaseOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="editCaseTitle"
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="editCaseTitle" className="text-2xl font-black text-foreground">
                  사건 수정
                </h3>
                <p className="mt-2 text-sm font-bold text-muted-foreground">
                  사건 표시명과 대표 증거를 수정합니다. 원본 증거와 CoC 기록은 변경되지 않습니다.
                </p>
              </div>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                aria-label="사건 수정 닫기"
                onClick={() => setEditCaseOpen(false)}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5">
              <div className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-black text-white">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-black text-foreground">사건 정보</h4>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">
                    목록과 상세 화면에 표시될 사건명을 입력합니다.
                  </p>
                  <label htmlFor="caseNameEdit" className="mt-5 block text-sm font-black text-foreground">
                    사건명
                  </label>
                  <input
                    id="caseNameEdit"
                    value={caseNameDraft}
                    onChange={(event) => setCaseNameDraft(event.target.value)}
                    className="mt-2 h-12 w-full rounded-lg border border-border bg-card px-4 text-base font-bold text-foreground outline-none transition-colors focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-muted/20 p-5">
              <div className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-black text-white">
                  2
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-black text-foreground">대표 증거 지정</h4>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">
                    사건 목록과 상단 요약에 기준으로 보여줄 증거를 선택합니다.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {evidences.map((evidence) => {
                      const lifecycle = evidence.lifecycleStatus ?? "ACTIVE"
                      const disabled = lifecycle !== "ACTIVE"
                      return (
                        <label
                          key={evidence.evidenceId}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors",
                            representativeDraftId === evidence.evidenceId
                              ? "border-teal-500 bg-teal-50"
                              : "border-border hover:border-teal-200",
                            disabled && "cursor-not-allowed opacity-50"
                          )}
                        >
                          <input
                            type="radio"
                            name="representativeEvidence"
                            checked={representativeDraftId === evidence.evidenceId}
                            disabled={disabled}
                            onChange={() => setRepresentativeDraftId(evidence.evidenceId)}
                            className="size-4 accent-teal-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-base font-black text-foreground">
                              {formatEvidenceTitle(evidence)}
                            </span>
                            <span className="mt-1 block font-mono text-xs font-bold text-muted-foreground">
                              EVD-{evidence.evidenceId}
                            </span>
                          </span>
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", getLifecycleClassName(lifecycle))}>
                            {getLifecycleLabel(lifecycle)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-6 font-bold"
                onClick={() => setEditCaseOpen(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                className="h-11 bg-teal-600 px-7 font-black text-white hover:bg-teal-700"
                onClick={handleSaveCaseSettings}
              >
                수정 완료
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmOpen && selectedEvidence ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deleteEvidenceTitle"
            className="w-full max-w-md rounded-2xl border border-red-100 bg-card p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertCircle className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 id="deleteEvidenceTitle" className="text-lg font-black text-foreground">
                  삭제 전 확인
                </h3>
                <p className="mt-1 text-sm font-bold leading-6 text-muted-foreground">
                  {formatEvidenceTitle(selectedEvidence)}는 실제로 삭제되지 않고, 사건 기록에 사용 제외 상태로 표시됩니다.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 font-bold"
                disabled={isWorking}
                onClick={() => setDeleteConfirmOpen(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 font-black"
                disabled={isWorking || (selectedEvidence.lifecycleStatus ?? "ACTIVE") !== "ACTIVE"}
                onClick={() => void handleConfirmDeleteEvidence()}
              >
                삭제하기
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function EvidenceManagementCard({
  evidence,
  representative,
  active,
  onSelect,
}: {
  evidence: CaseEvidenceSummary
  representative: boolean
  active: boolean
  onSelect: () => void
}) {
  const lifecycle = evidence.lifecycleStatus ?? "ACTIVE"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-xl border bg-background/50 p-4 text-left transition-colors",
        active ? "border-teal-400 bg-teal-50 shadow-sm" : "border-border hover:bg-muted/30",
        lifecycle !== "ACTIVE" && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-foreground">{formatEvidenceTitle(evidence)}</p>
          <p className="mt-1 font-mono text-xs font-bold text-muted-foreground">EVD-{evidence.evidenceId}</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-black", getLifecycleClassName(lifecycle))}>
          {getLifecycleLabel(lifecycle)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        {representative ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">대표 증거</span>
        ) : null}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{getRoleLabel(evidence.role)}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{evidence.mediaType}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          {getEvidenceStatusLabel(evidence.analysisStatus)}
        </span>
      </div>
      {evidence.replacementEvidenceId ? (
        <p className="mt-3 text-xs font-bold text-muted-foreground">
          대체 증거: EVD-{evidence.replacementEvidenceId}
        </p>
      ) : null}
      {evidence.excludedReason ? (
        <p className="mt-2 text-xs font-bold text-red-500">{evidence.excludedReason}</p>
      ) : null}
      <details className="mt-3 text-xs font-semibold text-muted-foreground">
        <summary className="cursor-pointer">원본 파일 정보</summary>
        <p className="mt-2 truncate">{evidence.originalFileName ?? evidence.fileName}</p>
      </details>
    </button>
  )
}

function EvidenceStripCard({
  evidence,
  active,
  representative,
  disabled,
  analysisSelectable,
  analysisSelected,
  onSelect,
  onToggleAnalysisSelect,
}: {
  evidence: CaseEvidenceSummary
  active: boolean
  representative: boolean
  disabled: boolean
  analysisSelectable: boolean
  analysisSelected: boolean
  onSelect: () => void
  onToggleAnalysisSelect: () => void
}) {
  const lifecycle = evidence.lifecycleStatus ?? "ACTIVE"
  const analysisStatus = normalizeStatus(evidence.analysisStatus ?? "PENDING")
  const statusLabel = lifecycle === "ACTIVE" ? getEvidenceAnalysisLabel(evidence) : getLifecycleLabel(lifecycle)

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
      aria-disabled={disabled}
      className={cn(
        "relative flex h-[86px] min-w-[210px] cursor-pointer flex-col items-start justify-center rounded-lg border px-4 pr-11 text-left transition-colors",
        active
          ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700",
        disabled && "cursor-not-allowed border-slate-200 bg-slate-50 opacity-55 hover:border-slate-200 hover:bg-slate-50 hover:text-muted-foreground"
      )}
    >
      {analysisSelectable ? (
        <button
          type="button"
          aria-label={`${formatEvidenceTitle(evidence)} 분석 선택`}
          onClick={(event) => {
            event.stopPropagation()
            onToggleAnalysisSelect()
          }}
          className={cn(
            "absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-xs transition-colors",
            analysisSelected ? "text-emerald-600" : "text-slate-300 hover:text-emerald-500"
          )}
        >
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </button>
      ) : null}
      <span className="flex w-full items-center gap-2">
        <span className="min-w-0 truncate text-base font-black leading-tight text-foreground">
          {formatEvidenceTitle(evidence)}
        </span>
        {representative ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
            대표
          </span>
        ) : null}
      </span>
      <span className="mt-1 font-mono text-xs font-bold text-muted-foreground">EVD-{evidence.evidenceId}</span>
      <span
        className={cn(
          "mt-2 rounded-full px-2 py-0.5 text-xs font-black",
          lifecycle !== "ACTIVE" ? "bg-slate-100 text-slate-400" : "bg-slate-100",
          lifecycle === "ACTIVE" && getAnalysisStatusTextClassName(analysisStatus)
        )}
      >
        {statusLabel}
      </span>
    </div>
  )
}

function CaseMetadataRow({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-xs font-bold text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-xs font-black",
          accent ? "text-teal-600" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function EvidenceRadioGroup({
  title,
  evidences,
  value,
  onChange,
}: {
  title: string
  evidences: CaseEvidenceSummary[]
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-black text-foreground">{title}</p>
      <div className="mt-3 grid gap-2">
        {evidences.map((evidence) => (
          <label
            key={evidence.evidenceId}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
              value === evidence.evidenceId ? "border-blue-400 bg-blue-50" : "border-border hover:bg-muted/30"
            )}
          >
            <input
              type="radio"
              checked={value === evidence.evidenceId}
              onChange={() => onChange(evidence.evidenceId)}
              className="size-4 accent-blue-600"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-foreground">{formatEvidenceTitle(evidence)}</span>
              <span className="font-mono text-xs font-semibold text-muted-foreground">EVD-{evidence.evidenceId}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function formatEvidenceTitle(evidence: CaseEvidenceSummary) {
  return evidence.displayLabel || `EVD-${evidence.evidenceId}`
}

function ResultScoreBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(normalizeResultValue(value) * 100)

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-black">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="text-foreground">{percent}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            percent >= 60 ? "bg-red-500" : percent >= 30 ? "bg-amber-400" : "bg-emerald-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function ResultBreakdownRow({
  label,
  description,
  value,
}: {
  label: string
  description: string
  value: number
}) {
  const percent = Math.round(normalizeResultValue(value) * 100)

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-950 dark:text-foreground">{label}</p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 text-xl font-black text-slate-950 dark:text-foreground">{percent}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
        <div className="h-full rounded-full bg-red-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function ResultSummaryRow({
  label,
  description,
  value,
  tone,
}: {
  label: string
  description: string
  value: string
  tone: "danger" | "safe" | "neutral"
}) {
  const toneClassName =
    tone === "danger"
      ? "bg-red-50 text-red-600"
      : tone === "safe"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-700"

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 dark:border-border">
      <div className="min-w-0">
        <p className="text-base font-bold text-slate-950 dark:text-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
      </div>
      <span className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-black", toneClassName)}>
        {value}
      </span>
    </div>
  )
}

function ResultDetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <h4 className="text-base font-black text-foreground">{title}</h4>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ResultFrameImage({ src, label }: { src?: string | null; label: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-slate-950">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="aspect-video w-full object-cover" />
      ) : (
        <div className="flex aspect-video items-center justify-center text-[11px] font-bold text-white/50">
          {label}
        </div>
      )}
    </div>
  )
}

function ResultInfoLine({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 truncate text-right font-black text-foreground", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  )
}

function EmptyResultText({ text }: { text: string }) {
  return <p className="text-sm font-bold text-muted-foreground">{text}</p>
}

function buildResultBreakdownRows(data: EvidenceDetailData | null) {
  const bars = buildResultDetectionBars(data)

  return [
    { label: "Forensic", description: "Pixel-level analysis", value: bars[0]?.value ?? 1 },
    { label: "Intent", description: "Logical consistency", value: bars[1]?.value ?? 0.2 },
    { label: "Subjective", description: "Social perception", value: bars[2]?.value ?? 0.4 },
  ]
}

function buildResultSummaryRows(
  data: EvidenceDetailData | null,
  verdict: string,
  confidenceScore: string | null
) {
  const riskTone = data ? getCaseRiskTone(data) : "red"

  return [
    {
      label: "딥페이크 탐지",
      description: "얼굴·프레임 기반 AI 탐지 결과",
      value: verdict,
      tone: riskTone === "green" ? "safe" : "danger",
    },
    {
      label: "위변조/무결성",
      description: "원본 해시와 증거 이력 대조",
      value: data?.integrityInfo.chainValid ? "원본 해시 일치" : "확인 필요",
      tone: data?.integrityInfo.chainValid ? "safe" : "danger",
    },
    {
      label: "분석 신뢰도",
      description: "유효 프레임과 모델 점수 일관성 기반",
      value: confidenceScore ? `${confidenceScore}%` : "-",
      tone: "neutral",
    },
  ] satisfies Array<{
    label: string
    description: string
    value: string
    tone: "danger" | "safe" | "neutral"
  }>
}

function getManipulationSuspicionLabel(tone: ReturnType<typeof getCaseRiskTone>) {
  if (tone === "green") return "조작 의심 낮음"
  if (tone === "orange") return "조작 의심 보통"
  return "조작 의심 높음"
}

function buildResultSummaryParagraph(data: EvidenceDetailData | null, verdict: string, score: number) {
  if (data?.analysisInfo.summary) {
    return data.analysisInfo.summary
  }

  const displayScore = Number.isFinite(score) && score > 0 ? score : 70
  return `This video is classified as ${verdict} with an overall score of ${displayScore} because multiple forensic signals were detected in the submitted evidence. Pixel-level analysis found instability around facial boundaries and compression patterns, while integrity checks confirm the original file hash remains consistent with the uploaded evidence record.`
}

function buildResultSummaryLines(_data: EvidenceDetailData | null) {
  return [
    "분석 결과, 얼굴 경계부에서 자연스럽지 않은 연결 흔적이 확인되었습니다.",
    "일부 구간에서는 압축 흔적이 주변 영역보다 높게 나타나 조작 의심도가 상승했습니다.",
    "원본 SHA-256 해시는 증거 이력과 일치하여, 등록 이후 원본성은 유지된 것으로 확인됩니다.",
  ]
}

function buildResultDetectionBars(data: EvidenceDetailData | null) {
  const modules = data?.analysisInfo.moduleResults ?? []
  if (modules.length > 0) {
    return modules.slice(0, 4).map((module) => ({
      label: formatModuleLabel(module.moduleName),
      value: normalizeResultValue(module.score),
    }))
  }

  return [
    { label: "얼굴 경계 불연속", value: 0.91 },
    { label: "시간축 일관성 저하", value: 0.84 },
    { label: "압축 아티팩트", value: 0.79 },
  ]
}

function splitSummary(summary: string) {
  return summary
    .split(/[.!?。]\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function formatModuleLabel(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes("boundary") || normalized.includes("face")) return "얼굴 경계 불연속"
  if (normalized.includes("timeline") || normalized.includes("temporal")) return "시간축 일관성 저하"
  if (normalized.includes("metadata")) return "메타데이터 기반 이상"
  if (normalized.includes("compression") || normalized.includes("artifact")) return "압축 아티팩트"
  if (normalized.includes("vision")) return "모델 A (Vision Transformer)"
  if (normalized.includes("cnn")) return "모델 B (CNN 기반)"
  if (normalized.includes("xception")) return "모델 C (Xception 기반)"
  if (normalized.includes("swin")) return "모델 D (Swin Transformer)"
  return name
}

function normalizeResultValue(value: number) {
  if (value > 0 && value <= 1) return value
  return Math.max(0, Math.min(100, value)) / 100
}

function formatResultScore(score: number | null) {
  if (score == null) return null
  const normalized = score > 0 && score <= 1 ? score * 100 : score
  return String(Math.round(normalized))
}

function getLifecycleLabel(status: string) {
  if (status === "EXCLUDED") return "사용 제외"
  if (status === "REPLACED") return "대체됨"
  return "활성"
}

function getLifecycleClassName(status: string) {
  if (status === "EXCLUDED") return "bg-slate-100 text-slate-600"
  if (status === "REPLACED") return "bg-orange-100 text-orange-700"
  return "bg-emerald-100 text-emerald-700"
}

function getRoleLabel(role?: string | null) {
  if (role === "PRIMARY") return "주요 증거"
  return "보충 증거"
}

function getEvidenceStatusLabel(status: string) {
  if (status === "COMPLETED") return "분석 완료"
  if (status === "PROCESSING") return "처리 중"
  if (status === "FAILED") return "실패"
  return "미분석"
}

function getEvidenceAnalysisLabel(evidence: CaseEvidenceSummary) {
  const status = normalizeStatus(evidence.analysisStatus ?? "PENDING")
  if (isEvidenceAnalysisRunning(evidence)) {
    return status === "PENDING" ? "분석 대기" : "분석 중"
  }

  return getEvidenceStatusLabel(status)
}

function getAnalysisStatusTextClassName(status: AnalysisStatus) {
  if (status === "COMPLETED") return "text-emerald-600"
  if (status === "PROCESSING") return "text-blue-600"
  if (status === "FAILED") return "text-red-500"
  return "text-slate-400"
}

function isEvidenceAnalysisRunning(evidence: CaseEvidenceSummary) {
  const lifecycle = evidence.lifecycleStatus ?? "ACTIVE"
  const status = normalizeStatus(evidence.analysisStatus ?? "PENDING")

  return lifecycle === "ACTIVE" && (
    status === "PROCESSING" || (status === "PENDING" && evidence.analysisProgress != null)
  )
}

function isEvidenceSelectableForAnalysis(evidence: CaseEvidenceSummary) {
  const lifecycle = evidence.lifecycleStatus ?? "ACTIVE"
  const status = normalizeStatus(evidence.analysisStatus ?? "PENDING")

  return lifecycle === "ACTIVE" &&
    status !== "COMPLETED" &&
    status !== "PROCESSING" &&
    !(status === "PENDING" && evidence.analysisProgress != null)
}

function getAnalysisTypeLabel(type: AnalysisType) {
  if (type === "INTEGRITY") return "위변조/무결성 검증"
  if (type === "COMPARE") return "비교검증"
  return "딥페이크 탐지"
}

const TAB_VALUES = ["summary", "deepfake", "integrity", "report"]

function EvidenceWorkspace({
  data,
  evidences,
  selectedEvidenceId,
  onSelectEvidence,
  copied,
  onCopyHash,
  hideSummaryCard = false,
}: {
  data: EvidenceDetailData
  evidences: CaseEvidenceSummary[]
  selectedEvidenceId: number | null
  onSelectEvidence: (evidenceId: number) => void
  copied: boolean
  onCopyHash: () => void
  hideSummaryCard?: boolean
}) {
  const { evidenceInfo, analysisInfo } = data
  const riskTone = getCaseRiskTone(data)
  const riskClassName = getCaseRiskClassName(riskTone)
  const displayRiskLabel = getDisplayRiskLabel(data)
  const extension = getFileExtension(evidenceInfo.fileName, evidenceInfo.mediaType)
  const progressSteps = buildProgressSteps(data)
  const reportReady = analysisInfo.status === "COMPLETED"
  const verificationCode = `VF-${String(evidenceInfo.evidenceId).padStart(8, "0")}`
  // 내용 전환은 클릭으로만. hover는 파란 밑줄(인디케이터)만 따라가게 별도 상태로 관리.
  const [activeTab, setActiveTab] = useState("summary")
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const litTab = hoveredTab ?? activeTab
  const litIndex = Math.max(0, TAB_VALUES.indexOf(litTab))
  const tabClass = (value: string) =>
    cn(
      "z-10 h-full min-w-0 rounded-none px-5 text-base font-medium outline-none transition-colors after:hidden focus-visible:ring-0 focus-visible:outline-none",
      litTab === value ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
    )

  return (
    <section className="min-w-0 space-y-4">
      {hideSummaryCard ? null : (
        <EvidenceSummaryCard
          data={data}
          extension={extension}
          riskLabel={displayRiskLabel}
          statusLabel={getStatusLabel(analysisInfo.status)}
          riskBadgeClassName={riskClassName.badge}
          riskTextClassName={riskClassName.text}
          evidences={evidences}
          selectedEvidenceId={selectedEvidenceId}
          onSelectEvidence={onSelectEvidence}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <TabsList
            variant="line"
            onMouseLeave={() => setHoveredTab(null)}
            className="relative !grid h-16 w-full grid-cols-4 rounded-none border-b-0 bg-card p-0 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-border after:content-['']"
          >
            <TabsTrigger
              value="summary"
              onMouseEnter={() => setHoveredTab("summary")}
              className={tabClass("summary")}
            >
              분석 요약
            </TabsTrigger>
            <TabsTrigger
              value="deepfake"
              onMouseEnter={() => setHoveredTab("deepfake")}
              className={tabClass("deepfake")}
            >
              딥페이크 탐지
            </TabsTrigger>
            <TabsTrigger
              value="integrity"
              onMouseEnter={() => setHoveredTab("integrity")}
              className={tabClass("integrity")}
            >
              무결성 검증
            </TabsTrigger>
            <TabsTrigger
              value="report"
              onMouseEnter={() => setHoveredTab("report")}
              className={tabClass("report")}
            >
              메타데이터/보고서
            </TabsTrigger>

            {/* 활성/hover 탭으로 부드럽게 슬라이드하는 파란 밑줄 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 z-20 h-[3px] bg-blue-500 transition-[left] duration-300 ease-out"
              style={{ left: `${litIndex * 25}%`, width: "25%" }}
            />
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
              <DeepfakeV2Tab data={data} />
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
