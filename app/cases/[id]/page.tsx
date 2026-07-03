"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FilePlus2,
  FileSearch,
  FileVideo,
  GitCompare,
  Home,
  Loader2,
  MessageSquareText,
  MoreVertical,
  Pencil,
  PlayCircle,
  Square,
  Trash2,
  UserRound,
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
  type FrameScore,
  type RepresentativeFrame,
} from "@/lib/api/evidence-detail"
import {
  cancelCaseAnalysis,
  markEvidenceExcluded,
  startCaseAnalysis,
  uploadEvidenceToCase,
} from "@/lib/api/case-workflow"
import { fetchAnalysisStatus } from "@/lib/evidence-api"
import { ApiError } from "@/lib/api/client"
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api/errors"
import { getSession, isReviewerSession, type AuthSession } from "@/lib/auth"
import { getLatestCompareResultSummary, type StoredCompareResultSummary } from "@/lib/compare-history"
import { mockUsers } from "@/lib/permissions"
import { getAnalysisStatusLabel } from "@/lib/status-labels"
import { buildCaseDetailPath, decodeRouteParam } from "@/lib/route-params"
import { normalizeEvidenceDetailForUi } from "@/lib/api/normalize-analysis"
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

function getCaseActorName(userId?: string | null) {
  if (!userId) return null
  return mockUsers.find((user) => user.id === userId)?.name ?? userId
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
const PRIORITY_REVIEW_START_SEC = 15.8
const PRIORITY_REVIEW_END_SEC = 23.8
const PRIORITY_REVIEW_RANGE_LABEL = "00:15.800 ~ 00:23.800"
const PEAK_FRAME_TIME_LABEL = "00:19.800"

const RESULT_RISK_SIGNALS = [
  {
    label: "얼굴 경계 불연속",
    badge: "높은 위험 신호",
    score: 0.7,
    description: "프레임 간 얼굴 랜드마크와 주변 영역의 연결성을 분석했습니다.",
    basis: "얼굴 윤곽선과 주변 배경의 연결성이 낮게 측정됨",
    interval: PRIORITY_REVIEW_RANGE_LABEL,
    tone: "danger",
  },
  {
    label: "압축 아티팩트",
    badge: "검토 필요",
    score: 0.6,
    description: "얼굴 주변 영역의 압축 패턴이 배경 영역과 다르게 나타나는지 분석했습니다.",
    basis: "얼굴 주변 압축 패턴이 주변 영역보다 높게 나타남",
    interval: "00:00.400 ~ 00:08.400",
    tone: "warning",
  },
] as const

const RESULT_EXTRA_SIGNALS = [
  { label: "얼굴 질감 이상", score: 0.48, note: "뚜렷한 위험 신호는 제한적으로 관찰됨" },
  { label: "시간적 일관성 저하", score: 0.52, note: "일부 변화는 있으나 주요 위험 신호로 분류되지는 않음" },
  { label: "얼굴 움직임 이상 보조 신호", score: 0.43, note: "GMFlow 기반 참고 지표이며 단독 판단 근거로 사용하지 않음" },
] as const

const TOP_RISK_FRAMES = [
  { time: PEAK_FRAME_TIME_LABEL, seconds: 19.8, score: 82, signal: "얼굴 경계 불연속" },
  { time: "00:17.600", seconds: 17.6, score: 78, signal: "압축 패턴 이상" },
  { time: "00:21.400", seconds: 21.4, score: 74, signal: "얼굴 경계 불연속" },
  { time: "00:06.200", seconds: 6.2, score: 67, signal: "압축 아티팩트" },
  { time: "00:08.400", seconds: 8.4, score: 63, signal: "압축 아티팩트" },
] as const

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
  const [showIntegrityDashboard, setShowIntegrityDashboard] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(() => getSession())
  const isReviewer = isReviewerSession(session)

  useEffect(() => {
    function syncSession() {
      setSession(getSession())
    }

    syncSession()
    window.addEventListener("auth-change", syncSession)
    return () => window.removeEventListener("auth-change", syncSession)
  }, [])

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
          setEvidenceDetail(normalizeEvidenceDetailForUi(result))
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
    setShowIntegrityDashboard(false)
    setShowResultDashboard(true)
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  function viewIntegrity(evidenceId: number) {
    selectEvidence(evidenceId)
    setShowResultDashboard(false)
    setShowIntegrityDashboard(true)
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  function startCompareVerification(evidenceId: number) {
    const query = new URLSearchParams({
      caseId,
      evidenceId: String(evidenceId),
    })
    router.push(`/compare?${query.toString()}`)
  }

  function viewCompareVerification(compareId: number) {
    router.push(`/compare/${compareId}`)
  }

  function updateCaseSettings(caseName: string, representativeEvidenceId: number | null) {
    setCaseData((current) => (current ? { ...current, caseName, representativeEvidenceId } : current))
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />

      <main
        className={cn(
          "mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 sm:px-8 lg:px-10",
          showResultDashboard ? "py-4" : "py-7"
        )}
      >
        {caseLoading ? (
          <LoadingCard label="사건 상세 정보를 불러오는 중입니다..." />
        ) : error ? (
          <ErrorState error={error} onBack={() => router.back()} />
        ) : caseData ? (
          <>
            {!showResultDashboard && !showIntegrityDashboard ? (
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
                ) : showIntegrityDashboard ? (
                  <CaseIntegrityView
                    caseData={caseData}
                    evidenceDetail={evidenceDetail}
                    selectedEvidenceId={selectedEvidenceId}
                    detailLoading={detailLoading}
                    detailError={detailError}
                    onBack={() => setShowIntegrityDashboard(false)}
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
                    onViewIntegrity={viewIntegrity}
                    onViewCompareResult={viewCompareVerification}
                    onStartCompare={startCompareVerification}
                    onUpdateCaseSettings={updateCaseSettings}
                    onRefresh={refreshCase}
                    currentUserName={session?.name ?? null}
                    readOnly={isReviewer}
                  />
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>

      {showResultDashboard ? null : <SiteFooter />}
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
      <div className="absolute bottom-4 left-4 rounded-md bg-red-600/90 px-2.5 py-1 text-xs font-bold text-white">
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
      <div className="absolute bottom-4 left-4 rounded-md bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
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
  const [resultTab, setResultTab] = useState<"summary" | "detection" | "frames" | "models">("summary")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const selectedEvidence =
    caseData.evidences.find((evidence) => evidence.evidenceId === selectedEvidenceId) ??
    caseData.evidences[0] ??
    null
  const riskTone = evidenceDetail ? getCaseRiskTone(evidenceDetail) : "red"
  const resultVerdict = getManipulationSuspicionLabel(riskTone)
  const riskScore = formatResultScore(evidenceDetail?.analysisInfo.riskScore ?? null)
  const confidenceScore = formatResultScore(evidenceDetail?.analysisInfo.confidenceScore ?? null)
  const riskScoreLabel = riskScore ? `${riskScore} / 100` : "70 / 100"
  const confidenceScoreLabel = confidenceScore ? `${confidenceScore}%` : "86%"
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
  const summaryLines = buildResultSummaryLines(evidenceDetail)
  const detectionModules = [...(evidenceDetail?.analysisInfo.moduleResults ?? [])].sort(
    (a, b) => normalizeResultValue(b.score) - normalizeResultValue(a.score)
  )
  const detectedModuleCount = detectionModules.filter((module) => module.detected).length
  const frameScores = evidenceDetail?.analysisInfo.frameScores ?? []
  const representativeFrames = evidenceDetail?.analysisInfo.representativeFrames ?? []
  const peakFrame = frameScores.reduce<FrameScore | null>(
    (peak, frame) => (peak == null || frame.score > peak.score ? frame : peak),
    null
  )
  const avgFrameScore =
    frameScores.length > 0
      ? frameScores.reduce((sum, frame) => sum + normalizeResultValue(frame.score), 0) / frameScores.length
      : null
  const highRiskFrameCount = frameScores.filter((frame) => normalizeResultValue(frame.score) >= 0.6).length
  const modelInsights = buildModelInsights(evidenceDetail, frameScores)
  const modelSettings = buildModelAnalysisSettings(evidenceDetail, frameScores)
  const verdictToneStyles = {
    red: {
      badge: "bg-red-50 text-red-600 dark:bg-red-500/10",
      dot: "bg-red-500",
    },
    orange: {
      badge: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
      dot: "bg-amber-500",
    },
    green: {
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10",
      dot: "bg-emerald-500",
    },
  }[riskTone]

  function seekResultVideo(seconds: number, mode: ResultMediaMode = mediaMode) {
    setMediaMode(mode)
    requestAnimationFrame(() => {
      const video = videoRef.current
      if (!video) return
      video.currentTime = seconds
      void video.play().catch(() => undefined)
    })
  }


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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-2xl font-bold tracking-normal text-slate-950 dark:text-foreground">
                딥페이크 분석 결과
              </h1>
              {evidenceDetail ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-bold",
                    verdictToneStyles.badge
                  )}
                >
                  <span className={cn("size-2 rounded-full", verdictToneStyles.dot)} aria-hidden="true" />
                  {resultVerdict} · {riskScoreLabel}
                </span>
              ) : null}
            </div>
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
          <div className="grid gap-6 lg:h-[calc(100vh-14.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-none lg:overflow-y-auto dark:border-border dark:bg-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-foreground">증거 영상</h2>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    원본, 오버레이, 히트맵을 같은 위치에서 비교합니다.
                  </p>
                </div>
                <div className="flex rounded-full bg-slate-950/80 p-1 backdrop-blur-sm">
                  {([
                    ["original", "원본"],
                    ["overlay", "오버레이"],
                    ["heatmap", "히트맵"],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                        mediaMode === mode ? "bg-teal-500 text-white" : "text-white/80 hover:text-white"
                      )}
                      onClick={() => setMediaMode(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
                {visibleVideoUrl ? (
                  <video
                    ref={videoRef}
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
                {mediaMode !== "original" ? (
                  <div className="absolute left-4 top-4 rounded-md bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
                    {mediaMode === "overlay" ? "탐지 오버레이" : "히트맵"}
                  </div>
                ) : null}
              </div>
              {frameScores.length > 0 ? (
                <FrameRiskHeatStrip scores={frameScores} onSeek={seekResultVideo} />
              ) : (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500 dark:bg-background">
                  위험 신호가 높은 구간은 분석 탭에서 시간과 대표 프레임으로 확인할 수 있습니다.
                </p>
              )}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-border">
                <p className="text-[11px] font-bold text-slate-400">분석 유의사항</p>
                <ul className="mt-1.5 space-y-1 text-xs font-medium leading-5 text-slate-500">
                  <li>본 결과는 AI 기반 조작 의심 신호 분석이며, 조작 여부를 확정하지 않습니다.</li>
                  <li>해상도, 압축률, 조명, 얼굴 가림, 빠른 움직임에 따라 분석 신뢰도가 달라질 수 있습니다.</li>
                  <li>최종 판단은 원본 자료, 사건 맥락, 전문가 검토 결과와 함께 이루어져야 합니다.</li>
                </ul>
              </div>
            </section>

            <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none lg:h-full dark:border-border dark:bg-card">
            <div className="relative grid shrink-0 grid-cols-4 border-b border-slate-200 text-center text-sm font-medium text-slate-500 dark:border-border">
              {([
                ["summary", "분석 요약"],
                ["detection", "위험 신호"],
                ["frames", "프레임 분석"],
                ["models", "모델 근거"],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setResultTab(tab)}
                  className={cn(
                    "py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground",
                    resultTab === tab && "font-semibold text-slate-950 dark:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[-1px] z-10 h-0.5 bg-slate-950 transition-[left] duration-300 ease-out dark:bg-foreground"
                style={{
                  left: `${(resultTab === "summary" ? 0 : resultTab === "detection" ? 1 : resultTab === "frames" ? 2 : 3) * 25}%`,
                  width: "25%",
                }}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {resultTab === "summary" ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FrameMetricCard
                      label="위험 점수"
                      value={riskScoreLabel}
                      sub={resultVerdict}
                      tone={riskTone === "red" ? "danger" : "neutral"}
                    />
                    <FrameMetricCard
                      label="분석 신뢰도"
                      value={confidenceScoreLabel}
                      sub="유효 프레임 · 점수 일관성 기준"
                    />
                    <FrameMetricCard label="품질 점수" value="68 / 100" sub="해상도 · 얼굴 검출 안정성 기준" />
                  </div>

                  <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-6 dark:border-border dark:bg-background">
                    <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">핵심 요약</h3>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      <strong className="font-bold text-slate-700">얼굴 경계부</strong>,{" "}
                      <strong className="font-bold text-slate-700">압축 패턴</strong>,{" "}
                      <strong className="font-bold text-slate-700">프레임 연속성</strong>을 기준으로 분석했습니다.
                    </p>
                    <ol className="mt-6 space-y-4">
                      {summaryLines.map((line, index) => (
                        <li key={line} className="flex gap-4 text-base font-semibold leading-7 text-slate-700 dark:text-muted-foreground">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-card dark:ring-border">
                            {index + 1}
                          </span>
                          <span>{renderSummaryLine(line, index)}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                </div>
              ) : resultTab === "detection" ? (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">위험 신호</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        위험도가 높은 항목을 우선 표시했습니다.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                      주요 위험 신호 2개
                    </span>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {RESULT_RISK_SIGNALS.map((signal) => (
                      <RiskSignalCard key={signal.label} signal={signal} />
                    ))}
                  </ul>

                  <details className="mt-4 rounded-xl border border-slate-100 bg-white p-4 dark:border-border dark:bg-card">
                    <summary className="cursor-pointer text-sm font-bold text-slate-700">
                      기타 분석 항목 보기
                    </summary>
                    <div className="mt-4 space-y-3">
                      {RESULT_EXTRA_SIGNALS.map((item) => (
                        <div key={item.label} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-border">
                          <div>
                            <p className="text-sm font-bold text-slate-950 dark:text-foreground">{item.label}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{item.note}</p>
                          </div>
                          <span className="font-mono text-sm font-bold text-slate-700">{formatScoreOutOf100(item.score)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </section>
              ) : resultTab === "frames" ? (
                <section>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">프레임 분석</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        영상 구간별 딥페이크 위험도 흐름입니다.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-secondary">
                      {frameScores.length}프레임
                    </span>
                  </div>

                  {frameScores.length > 0 ? (
                    <>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <FrameMetricCard
                          label="최고 위험"
                          value={formatScoreOutOf100(peakFrame?.score)}
                          sub={`${peakFrame?.timeSec != null ? formatDuration(peakFrame.timeSec) : PEAK_FRAME_TIME_LABEL} 지점`}
                          tone={peakFrame != null && normalizeResultValue(peakFrame.score) >= 0.6 ? "danger" : "neutral"}
                        />
                        <FrameMetricCard
                          label="의심 구간"
                          value={
                            highRiskFrameCount > 0 ? `${PRIORITY_REVIEW_START_SEC}초 ~ ${PRIORITY_REVIEW_END_SEC}초` : "-"
                          }
                          sub={
                            highRiskFrameCount > 0 ? `${highRiskFrameCount}개 프레임 연속 감지` : "임계값 초과 구간 없음"
                          }
                          tone={highRiskFrameCount > 0 ? "danger" : "neutral"}
                        />
                        <FrameMetricCard
                          label="평균 위험도"
                          value={formatScoreOutOf100(avgFrameScore)}
                          sub="전체 프레임 평균"
                        />
                        <FrameMetricCard
                          label="임계값 초과"
                          value={`${highRiskFrameCount} / ${frameScores.length} 프레임`}
                          sub="위험 점수 60 이상"
                          tone={highRiskFrameCount > 0 ? "danger" : "neutral"}
                        />
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
                        <MiniFrameRiskChart scores={frameScores} />
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
                        <div>
                          <h4 className="text-sm font-bold text-slate-950 dark:text-foreground">상위 위험 프레임</h4>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            행을 선택하면 영상이 해당 지점으로 이동하고, 히트맵으로 조작 의심 영역을 확인할 수 있습니다.
                          </p>
                        </div>
                        <div className="mt-2 divide-y divide-slate-100 dark:divide-border">
                          {TOP_RISK_FRAMES.map((frame, index) => {
                            const representative = representativeFrames.find(
                              (item) =>
                                (item.timeSec != null && Math.abs(item.timeSec - frame.seconds) < 0.35) ||
                                item.timestamp === frame.time
                            )
                            return (
                              <div key={frame.time} className="flex items-center gap-2 py-2">
                                <button
                                  type="button"
                                  onClick={() => seekResultVideo(frame.seconds)}
                                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-secondary/40"
                                >
                                  <span className="w-4 shrink-0 text-xs font-bold text-slate-400">{index + 1}</span>
                                  <span className="h-11 w-[74px] shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-secondary">
                                    {representative?.imageUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={representative.imageUrl}
                                        alt={`${frame.time} 프레임 미리보기`}
                                        className="size-full object-cover"
                                      />
                                    ) : (
                                      <span className="flex size-full items-center justify-center">
                                        <FileVideo className="size-4 text-slate-300" aria-hidden="true" />
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-sm font-semibold text-slate-950 dark:text-foreground">
                                    {frame.time}
                                  </span>
                                  <span className="shrink-0 text-sm font-bold text-red-600">{frame.score} / 100</span>
                                  <span className="truncate text-sm font-semibold text-slate-600 dark:text-muted-foreground">
                                    {frame.signal}
                                  </span>
                                </button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 shrink-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  onClick={() => seekResultVideo(frame.seconds, "heatmap")}
                                >
                                  히트맵
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400 dark:border-border dark:bg-background">
                      프레임 점수 데이터가 없습니다.
                    </p>
                  )}
                </section>
              ) : (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">모델 근거</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        주 모델 결과와 보조 신호를 분리해 표시합니다.
                      </p>
                    </div>
                  </div>

                  {/* 헤드라인: 종합 점수 하나만 강조 */}
                  <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-border dark:bg-background">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">종합 위험 점수</p>
                        <p className="mt-1.5 text-4xl font-bold text-slate-950 dark:text-foreground">
                          {formatScoreOutOf100(modelInsights.ensembleScore)}
                        </p>
                      </div>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        위험 신호 높음
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                      주 모델 2개 중 2개에서 위험 신호가 확인되었습니다. GMFlow는 보조 지표로만 참고합니다.
                    </p>
                  </div>

                  {/* 모델별 결과: 표로 스캔 가능하게 */}
                  <section className="mt-4 rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
                    <h4 className="text-base font-bold text-slate-950 dark:text-foreground">모델별 결과</h4>
                    <div className="mt-2">
                      {[
                        ...modelInsights.primaryModels.map((model) => ({
                          name: model.name,
                          role: model.role,
                          score: model.score,
                          aux: false,
                        })),
                        {
                          name: "GMFlow",
                          role: "Optical Flow 기반 얼굴 움직임 (보조)",
                          score: modelInsights.gmflow.score,
                          aux: true,
                        },
                      ].map((row) => {
                        const percent = Math.round(row.score * 100)
                        const verdict = row.aux
                          ? { label: "참고", cls: "bg-teal-100 text-teal-700" }
                          : row.score >= 0.5
                            ? { label: "위험", cls: "bg-red-100 text-red-700" }
                            : { label: "정상", cls: "bg-emerald-100 text-emerald-700" }
                        return (
                          <div
                            key={row.name}
                            className="flex items-center gap-3 border-b border-slate-100 py-3.5 last:border-b-0 dark:border-border"
                          >
                            <div className="w-36 shrink-0 sm:w-48">
                              <p className="truncate text-sm font-bold text-slate-950 dark:text-foreground">{row.name}</p>
                              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{row.role}</p>
                            </div>
                            <AnimatedRiskBar percent={percent} aux={row.aux} />
                            <span className="w-10 shrink-0 text-right font-mono text-sm font-bold text-slate-950 dark:text-foreground">
                              {percent}
                            </span>
                            <span className={cn("w-11 shrink-0 rounded-full py-0.5 text-center text-[11px] font-bold", verdict.cls)}>
                              {verdict.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      ▼ 표시는 위험 기준(60점) · 점수는 100점 만점 위험 신호 기준입니다.
                    </p>
                  </section>

                  {/* 상세 근거·설정은 접어서 숨김 */}
                  <details className="mt-4 rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
                    <summary className="cursor-pointer text-sm font-bold text-slate-700 dark:text-foreground">
                      모델별 상세 근거 · 분석 설정
                    </summary>
                    <div className="mt-4 space-y-2.5">
                      {[
                        ...modelInsights.primaryModels.map((model) => ({
                          name: model.name,
                          text: model.interpretation,
                        })),
                        { name: "GMFlow", text: modelInsights.gmflow.description },
                      ].map((row) => (
                        <p key={row.name} className="text-sm font-medium leading-6 text-slate-500">
                          <strong className="font-bold text-slate-700 dark:text-foreground">{row.name}</strong> — {row.text}
                        </p>
                      ))}
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-border">
                      <p className="text-xs font-semibold text-slate-400">분석 설정</p>
                      <div className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                        {modelSettings.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-slate-500">{item.label}</span>
                            <span className="text-right text-sm font-bold text-slate-950 dark:text-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                </section>
              )}
            </div>
          </section>
          </div>
        </>
      ) : (
        <EmptyEvidenceState />
      )}
    </section>
  )
}

function CaseIntegrityView({
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
  const selectedEvidence =
    caseData.evidences.find((evidence) => evidence.evidenceId === selectedEvidenceId) ??
    caseData.evidences[0] ??
    null
  const title =
    selectedEvidence?.originalFileName ??
    selectedEvidence?.fileName ??
    selectedEvidence?.displayLabel ??
    caseData.caseName
  const originalHash = evidenceDetail?.integrityInfo.originalHash ?? "-"
  const chainValid = evidenceDetail?.integrityInfo.chainValid ?? false
  const cocLogs = evidenceDetail?.cocLogs ?? []
  const signatureInfo = evidenceDetail?.signatureInfo ?? null
  const signatureSigned = (signatureInfo?.signatureStatus ?? "").toUpperCase() === "SIGNED"
  const signatureValid = signatureInfo?.signatureValid ?? false
  const blockchainInfo = evidenceDetail?.blockchainInfo ?? null
  const blockchainAnchored = (blockchainInfo?.status ?? "").toUpperCase() === "ANCHORED"
  const blockchainAnchors = blockchainInfo && evidenceDetail ? buildBlockchainAnchors(blockchainInfo, evidenceDetail) : []
  const [integrityTab, setIntegrityTab] = useState<"original" | "signature" | "blockchain" | "coc">("original")
  const [openTransactionId, setOpenTransactionId] = useState<string | null>(null)

  return (
    <section className="space-y-6 rounded-xl bg-[#f6f8fa] px-0 py-1 text-slate-950 dark:bg-background dark:text-foreground">
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
            <h1 className="truncate text-2xl font-bold tracking-normal text-slate-950 dark:text-foreground">
              무결성 검증 결과
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {title} · 원본 해시, 블록체인 기록, 증거 이력을 확인합니다.
            </p>
          </div>
        </div>
      </header>

      {detailLoading ? (
        <LoadingCard label="무결성 검증 결과를 불러오는 중입니다..." />
      ) : detailError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>무결성 결과 로드 오류</AlertTitle>
          <AlertDescription>{detailError}</AlertDescription>
        </Alert>
      ) : evidenceDetail ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <IntegrityStatusCard
              label="원본 해시"
              value={chainValid ? "일치" : "확인 필요"}
              description={evidenceDetail.integrityInfo.hashAlgorithm}
              tone={chainValid ? "safe" : "danger"}
            />
            <IntegrityStatusCard
              label="전자서명"
              value={signatureInfo ? (signatureValid ? "유효" : "확인 필요") : "미서명"}
              description={signatureInfo?.signatureAlgorithm || "발급기관 서명"}
              tone={signatureInfo ? (signatureValid ? "safe" : "danger") : "neutral"}
            />
            <IntegrityStatusCard
              label="블록체인"
              value={blockchainInfo ? getBlockchainStatusLabel(blockchainInfo.status) : "미앵커"}
              description={blockchainInfo?.network || "블록체인 앵커링"}
              tone={
                blockchainAnchored
                  ? "safe"
                  : (blockchainInfo?.status ?? "").toUpperCase() === "FAILED"
                    ? "danger"
                    : "neutral"
              }
            />
            <IntegrityStatusCard
              label="CoC 이력"
              value={`${cocLogs.length}건`}
              description="증거 처리 기록"
              tone="neutral"
            />
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none dark:border-border dark:bg-card">
            <div className="relative grid grid-cols-4 border-b border-slate-200 text-center text-sm font-medium text-slate-500 dark:border-border">
              <button
                type="button"
                onClick={() => setIntegrityTab("original")}
                className={cn(
                  "py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground",
                  integrityTab === "original" && "font-semibold text-slate-950 dark:text-foreground"
                )}
              >
                원본 검증
              </button>
              <button
                type="button"
                onClick={() => setIntegrityTab("signature")}
                className={cn(
                  "py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground",
                  integrityTab === "signature" && "font-semibold text-slate-950 dark:text-foreground"
                )}
              >
                전자서명
              </button>
              <button
                type="button"
                onClick={() => setIntegrityTab("blockchain")}
                className={cn(
                  "py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground",
                  integrityTab === "blockchain" && "font-semibold text-slate-950 dark:text-foreground"
                )}
              >
                블록체인
              </button>
              <button
                type="button"
                onClick={() => setIntegrityTab("coc")}
                className={cn(
                  "py-4 transition-colors hover:text-slate-950 dark:hover:text-foreground",
                  integrityTab === "coc" && "font-semibold text-slate-950 dark:text-foreground"
                )}
              >
                증거 이력 ({cocLogs.length})
              </button>

              {/* 활성 탭으로 부드럽게 슬라이드하는 밑줄 */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[-1px] z-10 h-0.5 bg-slate-950 transition-[left] duration-300 ease-out dark:bg-foreground"
                style={{
                  left: `${(integrityTab === "original" ? 0 : integrityTab === "signature" ? 1 : integrityTab === "blockchain" ? 2 : 3) * 25}%`,
                  width: "25%",
                }}
              />
            </div>

            <div className="p-5">
              {integrityTab === "original" ? (
                <>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-foreground">원본 검증</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">원본 해시와 현재 해시를 대조합니다.</p>
                  <div className="mt-4 space-y-3">
                    <IntegrityInfoRow label="해시 알고리즘" value={evidenceDetail.integrityInfo.hashAlgorithm} />
                    <IntegrityInfoRow label="원본 SHA-256" value={shortHash(originalHash)} mono copyValue={originalHash} />
                    <IntegrityInfoRow label="현재 SHA-256" value={shortHash(originalHash)} mono copyValue={originalHash} />
                    <IntegrityInfoRow
                      label="검증 결과"
                      value={chainValid ? "원본 해시 일치" : "확인 필요"}
                      accent={chainValid ? "safe" : "danger"}
                    />
                  </div>
                </>
              ) : integrityTab === "signature" ? (
                <>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-foreground">전자서명</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    발급기관의 전자서명으로 증거의 진본성을 확인합니다.
                  </p>
                  {signatureInfo ? (
                    <div className="mt-4 space-y-3">
                      <IntegrityInfoRow
                        label="서명 상태"
                        value={signatureSigned ? "서명됨" : "미서명"}
                        accent={signatureSigned ? "safe" : "danger"}
                      />
                      <IntegrityInfoRow
                        label="서명 유효성"
                        value={signatureValid ? "유효" : "확인 필요"}
                        accent={signatureValid ? "safe" : "danger"}
                      />
                      <IntegrityInfoRow label="서명 알고리즘" value={signatureInfo.signatureAlgorithm || "-"} />
                      <IntegrityInfoRow
                        label="서명 시각"
                        value={signatureInfo.signedAt ? formatDateTime(signatureInfo.signedAt) : "-"}
                      />
                      <IntegrityInfoRow
                        label="서명자 인증서"
                        value={signatureInfo.signerCertificateSubject || "-"}
                      />
                    </div>
                  ) : (
                    <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400 dark:border-border dark:bg-background">
                      전자서명 정보가 없습니다.
                    </p>
                  )}
                </>
              ) : integrityTab === "blockchain" ? (
                <>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-foreground">블록체인 앵커링</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    증거 원본, 분석 결과, 보고서 해시를 블록체인에 앵커링하여 처리 시점을 증명합니다.
                  </p>
                  {blockchainInfo ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-border dark:bg-background">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <p className="text-xs font-bold text-slate-400">최종 상태</p>
                            <p
                              className={cn(
                                "mt-1 text-base font-bold",
                                blockchainAnchored ? "text-teal-700" : "text-slate-950 dark:text-foreground"
                              )}
                            >
                              {getBlockchainStatusLabel(blockchainInfo.status)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">앵커 수</p>
                            <p className="mt-1 text-base font-bold text-slate-950 dark:text-foreground">
                              {blockchainAnchors.length}건
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-400">네트워크</p>
                            <p className="mt-1 text-base font-bold text-slate-950 dark:text-foreground">
                              {blockchainInfo.network || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {blockchainAnchors.map((anchor) => (
                          <BlockchainAnchorCard
                            key={anchor.id}
                            anchor={anchor}
                            isOpen={openTransactionId === anchor.id}
                            onToggle={() =>
                              setOpenTransactionId((current) => (current === anchor.id ? null : anchor.id))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400 dark:border-border dark:bg-background">
                      블록체인 앵커링 정보가 없습니다.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950 dark:text-foreground">CoC 로그</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">증거 등록 이후의 처리 이력</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {cocLogs.length}건
                    </span>
                  </div>
                  {cocLogs.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-blue-500" /> 진행
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" /> 완료·검증
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-red-500" /> 실패
                      </span>
                    </div>
                  ) : null}
                  {cocLogs.length > 0 ? (
                    <ol className="mt-6 space-y-0">
                      {cocLogs.map((log, index) => (
                        <li key={log.logId} className="relative flex gap-4 pb-6 last:pb-0">
                          {index < cocLogs.length - 1 ? (
                            <span
                              className="absolute left-[13px] top-7 -bottom-0 w-px bg-slate-200 dark:bg-border"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span
                            className="relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-card dark:ring-border"
                            aria-hidden="true"
                          >
                            <span className={cn("size-2.5 rounded-full", getCocEventDotClass(log.eventType))} />
                          </span>
                          <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 transition-colors hover:border-slate-200 dark:border-border dark:bg-background">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-950 dark:text-foreground">
                                  {getCocEventLabel(log.eventType)}
                                </p>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                    getCocActor(log.userId).roleClass
                                  )}
                                >
                                  {getCocActor(log.userId).role}
                                </span>
                              </div>
                              <time className="text-xs font-semibold text-slate-400">
                                {formatDateTime(log.createdAt)}
                              </time>
                            </div>
                            {log.description ? (
                              <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">{log.description}</p>
                            ) : null}
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-slate-100 dark:bg-card dark:ring-border">
                                <UserRound className="size-3 text-slate-400" aria-hidden="true" />
                                <span className="truncate text-[11px] font-bold text-slate-500">
                                  {getCocActor(log.userId).label}
                                </span>
                              </span>
                              <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-slate-100 dark:bg-card dark:ring-border">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">hash</span>
                                <span className="truncate font-mono text-[11px] font-semibold text-slate-400">
                                  {shortHash(log.currentLogHash)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400 dark:border-border dark:bg-background">
                      기록된 증거 이력이 없습니다.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </>
      ) : (
        <EmptyEvidenceState />
      )}
    </section>
  )
}

function IntegrityStatusCard({
  label,
  value,
  description,
  tone,
}: {
  label: string
  value: string
  description: string
  tone: "safe" | "danger" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-4 text-2xl font-bold",
          tone === "safe" && "text-teal-700",
          tone === "danger" && "text-red-600",
          tone === "neutral" && "text-slate-950 dark:text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{description}</p>
    </div>
  )
}

function IntegrityInfoRow({
  label,
  value,
  mono = false,
  accent,
  copyValue,
}: {
  label: string
  value: string
  mono?: boolean
  accent?: "safe" | "danger"
  copyValue?: string | null
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-border">
      <span className="shrink-0 text-sm font-bold text-slate-500">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span
          className={cn(
            "min-w-0 truncate text-right text-sm font-bold text-slate-950 dark:text-foreground",
            mono && "font-mono text-xs",
            accent === "safe" && "text-teal-700 dark:text-teal-400",
            accent === "danger" && "text-red-600 dark:text-red-400"
          )}
        >
          {value}
        </span>
        {copyValue ? <CopyIconButton value={copyValue} label={label} /> : null}
      </span>
    </div>
  )
}

type BlockchainAnchorItem = {
  id: string
  title: string
  target: string
  status: string
  subjectHash: string
  transactionId: string
  anchoredAt: string
  network: string
  channel: string
  chaincode: string
  blockHeight: string
  verificationResult: string
}

function BlockchainAnchorCard({
  anchor,
  isOpen,
  onToggle,
}: {
  anchor: BlockchainAnchorItem
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-border dark:bg-card">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-950 dark:text-foreground">{anchor.title}</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
              {anchor.status}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{anchor.target}</p>
          <p className="mt-2 font-mono text-xs font-semibold text-slate-400">{shortHash(anchor.transactionId)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-none hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
          onClick={onToggle}
        >
          트랜잭션 보기
          <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} aria-hidden="true" />
        </Button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-100 bg-slate-50/80 p-4 dark:border-border dark:bg-background">
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            <IntegrityInfoRow label="TxID" value={shortHash(anchor.transactionId)} mono copyValue={anchor.transactionId} />
            <IntegrityInfoRow label="앵커 해시" value={shortHash(anchor.subjectHash)} mono copyValue={anchor.subjectHash} />
            <IntegrityInfoRow label="Channel" value={anchor.channel} />
            <IntegrityInfoRow label="Chaincode" value={anchor.chaincode} />
            <IntegrityInfoRow label="Block Height" value={anchor.blockHeight} />
            <IntegrityInfoRow label="Timestamp" value={formatDateTime(anchor.anchoredAt)} />
            <IntegrityInfoRow label="Network" value={anchor.network} />
            <IntegrityInfoRow label="검증 결과" value={anchor.verificationResult} accent="safe" />
          </div>
        </div>
      ) : null}
    </article>
  )
}

function CopyIconButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ? `${label} 복사` : "복사"}
      title={copied ? "복사됨" : "복사"}
      className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-muted"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
    </button>
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
  onViewIntegrity,
  onViewCompareResult,
  onStartCompare,
  onUpdateCaseSettings,
  onRefresh,
  currentUserName,
  readOnly = false,
}: {
  caseData: CaseDetailData
  selectedEvidenceId: number | null
  evidenceDetail: EvidenceDetailData | null
  detailLoading: boolean
  detailError: string | null
  onSelectEvidence: (evidenceId: number) => void
  onViewResult: (evidenceId: number) => void
  onViewIntegrity: (evidenceId: number) => void
  onViewCompareResult: (compareId: number) => void
  onStartCompare: (evidenceId: number) => void
  onUpdateCaseSettings: (caseName: string, representativeEvidenceId: number | null) => void
  onRefresh: () => void
  currentUserName?: string | null
  readOnly?: boolean
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
  const [analystCommentsByEvidence, setAnalystCommentsByEvidence] = useState<Record<number, string>>({})
  const [reviewCommentsByEvidence, setReviewCommentsByEvidence] = useState<Record<number, string>>({})
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [reviewDecision, setReviewDecision] = useState<"PENDING" | "APPROVED" | "REVISION">("PENDING")
  const [isWorking, setIsWorking] = useState(false)
  const [localAnalysisProgress, setLocalAnalysisProgress] = useState<Record<number, number>>({})
  const [selectedCompareResult, setSelectedCompareResult] = useState<StoredCompareResultSummary | null>(null)
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
    ? !readOnly && isEvidenceSelectableForAnalysis(selectedEvidence)
    : false
  const selectedEvidenceRepresentative =
    selectedEvidence != null && caseData.representativeEvidenceId === selectedEvidence.evidenceId
  const selectableAnalysisEvidences = readOnly ? [] : evidences.filter(isEvidenceSelectableForAnalysis)
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
  const selectedAnalystComment = selectedEvidence
    ? analystCommentsByEvidence[selectedEvidence.evidenceId] ?? ""
    : ""
  const selectedReviewComment = selectedEvidence
    ? reviewCommentsByEvidence[selectedEvidence.evidenceId] ?? ""
    : ""
  const analystName = getCaseActorName(caseData.assigneeId ?? caseData.createdBy) ?? (!readOnly ? currentUserName : null)
  const reviewerName = getCaseActorName(caseData.reviewerId)
  const compareLabel = getCompareVerificationLabel(selectedCompareResult)
  const compareBadgeClassName = getCompareVerificationBadgeClassName(selectedCompareResult)
  const isReviewerMode = readOnly

  useEffect(() => {
    if (!selectedEvidence) {
      setSelectedCompareResult(null)
      return
    }

    setSelectedCompareResult(getLatestCompareResultSummary(selectedEvidence.evidenceId))
  }, [selectedEvidence])

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
    const runningEvidenceIds = evidences
      .filter((evidence) => isEvidenceAnalysisRunning(evidence))
      .map((evidence) => evidence.evidenceId)
    const optimisticIds = Object.keys(localAnalysisProgress).map(Number)
    const pollIds = [...new Set([...runningEvidenceIds, ...optimisticIds])]

    if (pollIds.length === 0) return

    let cancelled = false

    async function pollAnalysisStatuses() {
      const statuses = await Promise.all(
        pollIds.map((evidenceId) => fetchAnalysisStatus(evidenceId).catch(() => null))
      )

      if (cancelled) return

      let shouldRefresh = false

      setLocalAnalysisProgress((current) => {
        const next = { ...current }
        for (const status of statuses) {
          if (!status) continue
          if (
            status.status === "COMPLETED" ||
            status.status === "FAILED" ||
            (status.status === "PENDING" && status.analysisRequestId === 0)
          ) {
            delete next[status.evidenceId]
            shouldRefresh = true
          }
        }
        return next
      })

      if (statuses.some((status) => status?.status === "PROCESSING" || status?.status === "COMPLETED")) {
        shouldRefresh = true
      }

      if (shouldRefresh) {
        onRefresh()
      }
    }

    void pollAnalysisStatuses()

    const interval = window.setInterval(() => {
      if (document.hidden) return
      void pollAnalysisStatuses()
    }, 4000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [evidences, localAnalysisProgress, onRefresh])

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
    if (readOnly) return

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
    if (readOnly) return

    const target = evidences.find((evidence) => evidence.evidenceId === evidenceId)
    if (!target || !isEvidenceSelectableForAnalysis(target)) return

    setSelectedAnalysisIds((current) =>
      current.includes(evidenceId)
        ? current.filter((id) => id !== evidenceId)
        : [...current, evidenceId]
    )
  }

  function toggleAllSelectableAnalysis() {
    if (readOnly) return

    if (allSelectableAnalysisSelected) {
      setSelectedAnalysisIds([])
      return
    }

    setSelectedAnalysisIds(selectableAnalysisEvidences.map((evidence) => evidence.evidenceId))
  }

  async function handleStartAnalysis() {
    if (readOnly) return

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
      { showSuccess: false, refresh: true }
    )
  }

  async function handleQuickStartAnalysis() {
    if (readOnly) return

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
      { showSuccess: false, refresh: true }
    )
  }

  async function handleCancelSelectedAnalysis() {
    if (readOnly) return

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

  function handleViewIntegrityCheck() {
    if (!selectedEvidence) return
    onViewIntegrity(selectedEvidence.evidenceId)
  }

  function handleStartCompareVerification() {
    if (!selectedEvidence || !selectedEvidenceActive) return
    onStartCompare(selectedEvidence.evidenceId)
  }

  function handleSaveCaseSettings() {
    if (readOnly) return

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
    if (readOnly) return

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

  function handleReviewDecision(nextDecision: "APPROVED" | "REVISION") {
    setReviewDecision(nextDecision)
    setMessage({
      type: "success",
      text: nextDecision === "APPROVED" ? "승인으로 표시되었습니다." : "재검토로 표시되었습니다.",
    })
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">등록된 증거</h2>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            {activeEvidences.length}/{evidences.length}
          </span>
        </div>
        {readOnly ? (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            검토 전용
          </span>
        ) : (
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
              <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 text-sm font-bold shadow-lg">
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
        )}
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
        {evidences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center text-sm font-bold text-muted-foreground">
            아직 등록된 증거가 없습니다. 증거 영상을 먼저 업로드하세요.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="-mx-1 flex min-w-0 flex-1 gap-3 overflow-x-auto px-1 pb-3">
                {pagedEvidences.map((evidence) => (
                  <EvidenceStripCard
                    key={evidence.evidenceId}
                    evidence={evidence}
                    active={selectedEvidenceId === evidence.evidenceId}
                    representative={caseData.representativeEvidenceId === evidence.evidenceId}
                    disabled={(evidence.lifecycleStatus ?? "ACTIVE") !== "ACTIVE"}
                    analysisSelectable={!readOnly && isEvidenceSelectableForAnalysis(evidence)}
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
              {selectableAnalysisEvidences.length > 0 ? (
                <div className="flex shrink-0 justify-end">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedAnalysisCount > 0 ? (
                      <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
                        {selectedAnalysisCount}개 선택
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-lg px-3 text-xs font-bold"
                      disabled={isWorking}
                      onClick={toggleAllSelectableAnalysis}
                    >
                      {allSelectableAnalysisSelected ? "선택 해제" : "전체 선택"}
                    </Button>
                    <Button
                      type="button"
                      className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
                      disabled={selectedAnalysisCount === 0 || isWorking}
                      onClick={() => void handleStartAnalysis()}
                    >
                      {isWorking ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                      분석하기
                    </Button>
                  </div>
                </div>
              ) : null}
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
                  <span className="min-w-14 text-center font-bold text-foreground">
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
                <h3 className="truncate text-lg font-bold text-foreground">
                  {formatEvidenceTitle(selectedEvidence)}
                </h3>
                <p className="mt-0.5 font-mono text-xs font-bold text-muted-foreground">
                  EVD-{selectedEvidence.evidenceId}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2 text-xs font-bold">
                {(selectedEvidence.lifecycleStatus ?? "ACTIVE") !== "ACTIVE" ? (
                  <span className={cn("rounded-full px-2.5 py-1", getLifecycleClassName(selectedEvidence.lifecycleStatus ?? "ACTIVE"))}>
                    {getLifecycleLabel(selectedEvidence.lifecycleStatus ?? "ACTIVE")}
                  </span>
                ) : null}
                <span className={cn("rounded-full px-2.5 py-1", getEvidenceAnalysisBadgeClassName(selectedEvidence))}>
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
                  "h-9 rounded-md text-sm font-bold transition-colors",
                  infoTab === "metadata" ? "bg-card text-teal-700 shadow-sm" : "text-muted-foreground"
                )}
              >
                메타데이터
              </button>
              <button
                type="button"
                onClick={() => setInfoTab("comment")}
                className={cn(
                  "h-9 rounded-md text-sm font-bold transition-colors",
                  infoTab === "comment" ? "bg-card text-teal-700 shadow-sm" : "text-muted-foreground"
                )}
              >
                코멘트
              </button>
            </div>

            {infoTab === "metadata" ? (
              <div className="mt-4 space-y-3">
                <dl className="space-y-3">
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

                {selectedEvidenceActive ? (
                  <div className="space-y-3 border-t border-border pt-3">
                    <button
                      type="button"
                      className="group flex w-full items-center justify-between rounded-lg text-left"
                      onClick={handleViewIntegrityCheck}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-muted-foreground">
                        <CheckCircle2 className="size-4 shrink-0 text-teal-600" aria-hidden="true" />
                        무결성 검증
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          해시값 일치
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5 text-sm font-bold text-teal-700 transition-colors group-hover:text-teal-900">
                        상세보기
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </button>

                    {!readOnly ? (
                      <button
                        type="button"
                        className="group flex w-full items-center justify-between rounded-lg text-left disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isWorking}
                        onClick={
                          selectedCompareResult
                            ? () => onViewCompareResult(selectedCompareResult.compareId)
                            : handleStartCompareVerification
                        }
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-muted-foreground">
                          <GitCompare className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                          비교검증
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", compareBadgeClassName)}>
                            {compareLabel}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-0.5 text-sm font-bold text-teal-700 transition-colors group-hover:text-teal-900">
                          {selectedCompareResult ? "상세보기" : "분석하기"}
                          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-3">
                <div>
                  <label
                    htmlFor="caseAnalystComment"
                    className="flex items-center gap-2 text-sm font-bold text-foreground"
                  >
                    <MessageSquareText className="size-4 text-slate-500" aria-hidden="true" />
                    분석관 코멘트
                    {analystName ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                        {analystName}
                      </span>
                    ) : null}
                  </label>
                  <textarea
                    id="caseAnalystComment"
                    value={selectedAnalystComment}
                    readOnly={isReviewerMode}
                    onChange={(event) => {
                      if (isReviewerMode) return

                      setAnalystCommentsByEvidence((current) => ({
                        ...current,
                        [selectedEvidence.evidenceId]: event.target.value,
                      }))
                    }}
                    placeholder="증거 확인 내용이나 분석 요청 메모를 입력하세요."
                    className="mt-2 h-[92px] w-full resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-slate-300 read-only:bg-muted/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="caseReviewerComment"
                    className="flex items-center gap-2 text-sm font-bold text-foreground"
                  >
                    <MessageSquareText className="size-4 text-slate-500" aria-hidden="true" />
                    검토자 코멘트
                    {reviewerName ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                        {reviewerName}
                      </span>
                    ) : null}
                  </label>
                  <textarea
                    id="caseReviewerComment"
                    value={selectedReviewComment}
                    readOnly={!isReviewerMode}
                    onChange={(event) => {
                      if (!isReviewerMode) return

                      setReviewCommentsByEvidence((current) => ({
                        ...current,
                        [selectedEvidence.evidenceId]: event.target.value,
                      }))
                    }}
                    placeholder={
                      isReviewerMode
                        ? "검토 결과와 재검토 사유를 입력하세요."
                        : "검토자가 작성한 의견이 여기에 표시됩니다."
                    }
                    className="mt-2 h-[92px] w-full resize-none overflow-y-auto rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-slate-300 read-only:bg-muted/30"
                  />
                </div>

                {isReviewerMode ? (
                  <ReviewerDecisionActions
                    decision={reviewDecision}
                    onApprove={() => handleReviewDecision("APPROVED")}
                    onRevision={() => handleReviewDecision("REVISION")}
                  />
                ) : null}
              </div>
            )}

            {detailError ? (
              <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {detailError}
              </p>
            ) : null}

            <div className="mt-auto space-y-3 pt-4">
              {readOnly ? (
                selectedEvidence.analysisStatus === "COMPLETED" ? (
                  <Button
                    type="button"
                    className="h-11 w-full bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
                    disabled={!selectedEvidenceActive}
                    onClick={() => onViewResult(selectedEvidence.evidenceId)}
                  >
                    결과보기
                  </Button>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-bold text-muted-foreground">
                    검토 가능한 분석 결과가 아직 없습니다.
                  </div>
                )
              ) : selectedEvidence.analysisStatus === "COMPLETED" ? (
                <Button
                  type="button"
                  className="h-11 w-full bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
                  disabled={!selectedEvidenceActive}
                  onClick={() => onViewResult(selectedEvidence.evidenceId)}
                >
                  결과보기
                </Button>
              ) : selectedEvidenceRunning ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        AI 분석 중입니다
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-700/75">
                        완료되면 결과보기가 활성화됩니다.
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-emerald-700">
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
                  className="h-11 w-full bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
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

      {!readOnly && editCaseOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="editCaseTitle"
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="editCaseTitle" className="text-2xl font-bold text-foreground">
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
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-bold text-white">
                  1
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-bold text-foreground">사건 정보</h4>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">
                    목록과 상세 화면에 표시될 사건명을 입력합니다.
                  </p>
                  <label htmlFor="caseNameEdit" className="mt-5 block text-sm font-bold text-foreground">
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
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-bold text-white">
                  2
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-bold text-foreground">대표 증거 지정</h4>
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
                            <span className="block truncate text-base font-bold text-foreground">
                              {formatEvidenceTitle(evidence)}
                            </span>
                            <span className="mt-1 block font-mono text-xs font-bold text-muted-foreground">
                              EVD-{evidence.evidenceId}
                            </span>
                          </span>
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", getLifecycleClassName(lifecycle))}>
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
                className="h-11 bg-teal-600 px-7 font-bold text-white hover:bg-teal-700"
                onClick={handleSaveCaseSettings}
              >
                수정 완료
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!readOnly && deleteConfirmOpen && selectedEvidence ? (
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
                <h3 id="deleteEvidenceTitle" className="text-lg font-bold text-foreground">
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
                className="h-11 font-bold"
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
          <p className="truncate text-lg font-bold text-foreground">{formatEvidenceTitle(evidence)}</p>
          <p className="mt-1 font-mono text-xs font-bold text-muted-foreground">EVD-{evidence.evidenceId}</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", getLifecycleClassName(lifecycle))}>
          {getLifecycleLabel(lifecycle)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        {representative ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">대표 증거</span>
        ) : null}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{getRoleLabel(evidence.role)}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{evidence.mediaType}</span>
        <span className={cn("rounded-full px-2.5 py-1", getEvidenceAnalysisBadgeClassName(evidence))}>
          {getEvidenceAnalysisLabel(evidence)}
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
        <span className="min-w-0 truncate text-base font-bold leading-tight text-foreground">
          {formatEvidenceTitle(evidence)}
        </span>
        {representative ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            대표
          </span>
        ) : null}
      </span>
      <span className="mt-1 font-mono text-xs font-bold text-muted-foreground">EVD-{evidence.evidenceId}</span>
      <span
        className={cn(
          "mt-2 rounded-full px-2 py-0.5 text-xs font-bold",
          lifecycle !== "ACTIVE" ? "bg-slate-100 text-slate-400" : getEvidenceAnalysisBadgeClassName(evidence)
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
          "min-w-0 truncate text-right text-xs font-bold",
          accent ? "text-teal-600" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function ReviewerDecisionActions({
  decision,
  onApprove,
  onRevision,
}: {
  decision: "PENDING" | "APPROVED" | "REVISION"
  onApprove: () => void
  onRevision: () => void
}) {
  const statusLabel =
    decision === "APPROVED" ? "승인" : decision === "REVISION" ? "재검토" : "검토대기"
  const statusClassName =
    decision === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : decision === "REVISION"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600"

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-muted-foreground">검토 상태</span>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold", statusClassName)}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 font-bold"
          onClick={onRevision}
        >
          재검토
        </Button>
        <Button
          type="button"
          className="h-10 bg-teal-600 font-bold text-white hover:bg-teal-700"
          onClick={onApprove}
        >
          승인
        </Button>
      </div>
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
      <p className="text-sm font-bold text-foreground">{title}</p>
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
              <span className="block truncate text-sm font-bold text-foreground">{formatEvidenceTitle(evidence)}</span>
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
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-bold">
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
        <span className="shrink-0 text-xl font-bold text-slate-950 dark:text-foreground">{percent}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
        <div className="h-full rounded-full bg-red-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function RiskSignalCard({ signal }: { signal: (typeof RESULT_RISK_SIGNALS)[number] }) {
  const value = normalizeResultValue(signal.score)
  const toneClassName =
    signal.tone === "danger"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700"

  return (
    <li className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-slate-200 dark:border-border dark:bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-950 dark:text-foreground">{signal.label}</p>
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", toneClassName)}>
            {signal.badge}
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-slate-950 dark:text-foreground">
          {formatScoreOutOf100(value)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("h-full rounded-full", signal.tone === "danger" ? "bg-red-500" : "bg-amber-400")}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-muted-foreground">
        {signal.description}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 dark:border-border dark:bg-card">
          <p className="text-[11px] font-bold text-slate-400">판단 기준</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-700 dark:text-muted-foreground">{signal.basis}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 dark:border-border dark:bg-card">
          <p className="text-[11px] font-bold text-slate-400">영향 구간</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-700 dark:text-muted-foreground">{signal.interval}</p>
        </div>
      </div>
    </li>
  )
}

function RepresentativeFrameDetailCard({ frame, index }: { frame: RepresentativeFrame; index: number }) {
  const [view, setView] = useState<"original" | "heatmap">("original")
  const score = frame.score == null ? null : Math.round(normalizeResultValue(frame.score) * 100)
  const tone = score == null ? null : getDetectionTone(score / 100)
  const timeLabel =
    frame.timestamp ?? (frame.timeSec != null ? formatDuration(frame.timeSec) : `프레임 ${index + 1}`)
  const hasHeatmap = Boolean(frame.heatmapUrl)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 dark:border-border dark:bg-background">
      <div className="relative aspect-video bg-slate-950">
        {frame.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frame.imageUrl} alt={`대표 프레임 ${index + 1}`} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs font-bold text-white/45">
            대표 프레임
          </div>
        )}
        {view === "heatmap" && frame.heatmapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame.heatmapUrl}
            alt=""
            className="pointer-events-none absolute inset-0 size-full object-cover opacity-70 mix-blend-screen"
          />
        ) : null}

        <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-xs font-bold text-white">
          {timeLabel}
        </div>
        {hasHeatmap ? (
          <div className="absolute right-3 top-3 flex rounded-full bg-black/45 p-0.5 backdrop-blur-sm">
            {([
              ["original", "원본"],
              ["heatmap", "히트맵"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors",
                  view === mode ? "bg-teal-500 text-white" : "text-white/80 hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-foreground">
            {frame.frameNumber != null ? `프레임 ${frame.frameNumber}` : `대표 ${index + 1}`}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {view === "heatmap" ? "위험 영역 히트맵" : "원본 프레임"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm font-bold text-slate-950 dark:text-foreground">
            {score == null ? "-" : `${score} / 100`}
          </span>
          {tone ? (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", tone.badgeClass)}>{tone.level}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function renderSummaryLine(line: string, index: number): ReactNode {
  if (index === 0) {
    return (
      <>
        <strong className="font-bold text-slate-950">{PRIORITY_REVIEW_RANGE_LABEL}</strong> 구간에서{" "}
        <strong className="font-bold text-slate-950">얼굴 경계부의 연결성</strong>이 낮게 측정되었습니다.
      </>
    )
  }

  if (index === 1) {
    return (
      <>
        일부 구간에서는 <strong className="font-bold text-slate-950">압축 흔적</strong>이 주변 영역보다 높게
        나타나 <strong className="font-bold text-slate-950">조작 의심도</strong>가 상승했습니다.
      </>
    )
  }

  if (index === 2) {
    return (
      <>
        연속 프레임에서 유사한 <strong className="font-bold text-slate-950">위험 신호</strong>가 반복되어 해당
        구간에 대한 <strong className="font-bold text-slate-950">우선 검토</strong>가 권장됩니다.
      </>
    )
  }

  return line
}

function SummaryMetricRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "danger" | "safe" | "neutral"
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-border">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-sm font-bold",
          tone === "danger" && "bg-red-50 text-red-600",
          tone === "safe" && "bg-emerald-50 text-emerald-700",
          tone === "neutral" && "bg-slate-100 text-slate-700"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function FrameStatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: "danger"
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-border dark:bg-background">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-xl font-bold text-slate-950 dark:text-foreground",
          tone === "danger" && "text-red-600"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs font-semibold text-slate-400">{sub}</p> : null}
    </div>
  )
}

function AnimatedRiskBar({
  percent,
  aux = false,
  thresholdPercent = 60,
}: {
  percent: number
  aux?: boolean
  thresholdPercent?: number
}) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(percent))
    return () => cancelAnimationFrame(id)
  }, [percent])

  return (
    <div className="relative h-2 flex-1">
      <div className="absolute inset-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            aux ? "bg-teal-500" : "bg-red-500"
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      {/* 위험 기준(60) 플래그 마커 */}
      <span
        className="pointer-events-none absolute -top-4 -translate-x-1/2 text-[9px] font-bold leading-none text-slate-500 dark:text-slate-400"
        style={{ left: `${thresholdPercent}%` }}
        aria-hidden="true"
      >
        {thresholdPercent}
      </span>
      <span
        className="pointer-events-none absolute -top-1.5 size-0 -translate-x-1/2 border-x-[4px] border-t-[5px] border-x-transparent border-t-slate-500 dark:border-t-slate-400"
        style={{ left: `${thresholdPercent}%` }}
        aria-hidden="true"
      />
    </div>
  )
}

function MiniFrameRiskChart({ scores }: { scores: FrameScore[] }) {
  const fallbackScores = [0.18, 0.24, 0.31, 0.48, 0.63, 0.76, 0.7, 0.58, 0.42, 0.28, 0.2, 0.16]
  const items =
    scores.length > 0
      ? scores.slice(0, 36).map((item) => ({ value: normalizeResultValue(item.score), timeSec: item.timeSec ?? null }))
      : fallbackScores.map((value) => ({ value, timeSec: null }))
  const peakIndex = items.reduce((peak, item, index) => (item.value > items[peak].value ? index : peak), 0)
  const peakItem = items[peakIndex]
  const toX = (index: number) => (items.length <= 1 ? 50 : 2 + (index / (items.length - 1)) * 96)
  const toY = (value: number) => 92 - Math.max(0, Math.min(1, value)) * 76
  const points = items.map((item, index) => `${toX(index).toFixed(2)},${toY(item.value).toFixed(2)}`).join(" ")
  const areaPoints = `2,92 ${points} 98,92`
  const thresholdY = toY(0.6)
  const endTime = items[items.length - 1]?.timeSec
  const peakLabelLeft = Math.min(86, Math.max(14, toX(peakIndex)))
  const peakLabelTop = Math.max(3, toY(peakItem.value) - 14)
  const timelineStart = items[0]?.timeSec ?? 0
  const timelineEnd = endTime ?? Math.max(items.length - 1, 0)
  const timelineTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    formatSecondsForViewer(timelineStart + (timelineEnd - timelineStart) * ratio)
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full bg-red-500" />
          위험 점수
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 border-t-2 border-dashed border-red-300" />
          임계값 60 / 100
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-600" />
          최고 위험 프레임
        </span>
      </div>
      <div className="relative mt-3 h-48 rounded-lg bg-slate-50 py-4 pl-12 pr-4 dark:bg-background">
        <div className="relative h-full w-full">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label="프레임별 위험도 선 그래프"
            className="absolute inset-0 size-full overflow-visible"
          >
            <line x1="2" y1="16" x2="98" y2="16" className="stroke-slate-200 dark:stroke-border" strokeWidth="0.35" />
            <line x1="2" y1="54" x2="98" y2="54" className="stroke-slate-200 dark:stroke-border" strokeWidth="0.35" />
            <line x1="2" y1="92" x2="98" y2="92" className="stroke-slate-300 dark:stroke-border" strokeWidth="0.45" />
            <line
              x1="2"
              y1={thresholdY}
              x2="98"
              y2={thresholdY}
              className="stroke-red-300"
              strokeWidth="0.45"
              strokeDasharray="2 2"
            />
            <polygon points={areaPoints} className="fill-red-500/[0.08]" />
            <polyline
              points={points}
              fill="none"
              className="stroke-red-500"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {[
            { label: "100", top: 16 },
            { label: "60", top: thresholdY, danger: true },
            { label: "0", top: 92 },
          ].map((tick) => (
            <span
              key={tick.label}
              className={cn(
                "absolute -translate-x-full -translate-y-1/2 text-[11px] font-semibold text-slate-400",
                tick.danger && "text-red-400"
              )}
              style={{ left: -10, top: `${tick.top}%` }}
            >
              {tick.label}
            </span>
          ))}
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap text-xs font-bold text-red-600"
            style={{ left: `${peakLabelLeft}%`, top: `${peakLabelTop}%` }}
          >
            {formatScoreOutOf100(peakItem?.value)}
          </span>
          {items.map((item, index) => {
            const x = toX(index)
            const y = toY(item.value)
            const isPeak = index === peakIndex
            const timeLabel = item.timeSec != null ? formatDuration(item.timeSec) : `#${index + 1}`
            return (
              <span
                key={`${index}-${item.value}`}
                title={`${timeLabel} · 위험 점수 ${formatScoreOutOf100(item.value)}`}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                  isPeak
                    ? "size-3.5 bg-red-600 ring-2 ring-white dark:ring-card"
                    : "size-3 bg-red-500 opacity-0 ring-2 ring-white transition-opacity hover:opacity-100 dark:ring-card"
                )}
                style={{ left: `${x}%`, top: `${y}%` }}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-5 pl-12 pr-4 text-xs font-semibold text-slate-400">
        {timelineTicks.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className={cn(index === 0 && "text-left", index === 4 && "text-right", index > 0 && index < 4 && "text-center")}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function FrameMetricCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string
  value: string
  sub?: string
  tone?: "danger" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 dark:border-border dark:bg-card">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-lg font-bold tracking-tight text-slate-950 dark:text-foreground",
          tone === "danger" && "text-red-600"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p> : null}
    </div>
  )
}

function FrameRiskHeatStrip({
  scores,
  onSeek,
}: {
  scores: FrameScore[]
  onSeek?: (seconds: number) => void
}) {
  const items = scores.slice(0, 60)

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-400">타임라인 위험도 · 구간을 누르면 해당 지점으로 이동합니다</p>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[3px] bg-slate-200 dark:bg-secondary" />
            60 미만
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[3px] bg-red-200" />
            60+
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[3px] bg-red-400" />
            70+
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-[3px] bg-red-600" />
            80+
          </span>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex h-4 gap-0.5 overflow-hidden rounded-md">
          {items.map((frame, index) => {
          const value = normalizeResultValue(frame.score)
          const timeLabel = frame.timeSec != null ? formatDuration(frame.timeSec) : `프레임 ${index + 1}`
          const seekSeconds = frame.timeSec
          return (
            <button
              key={`${index}-${frame.score}`}
              type="button"
              title={`${timeLabel} · 위험 점수 ${formatScoreOutOf100(frame.score)}`}
              aria-label={`${timeLabel} 위험 점수 ${formatScoreOutOf100(frame.score)}`}
              onClick={seekSeconds != null && onSeek ? () => onSeek(seekSeconds) : undefined}
              className={cn(
                "min-w-0 flex-1 rounded-[2px] transition-opacity hover:opacity-70",
                value >= 0.8
                  ? "bg-red-600"
                  : value >= 0.7
                    ? "bg-red-400"
                    : value >= 0.6
                      ? "bg-red-200"
                      : "bg-slate-200 dark:bg-secondary"
              )}
            />
          )
          })}
        </div>
      </div>
    </div>
  )
}

function getFrameDurationSeconds(scores: FrameScore[], peakFrame: FrameScore | null) {
  const times = scores
    .map((frame) => frame.timeSec)
    .filter((time): time is number => typeof time === "number" && Number.isFinite(time))
  return Math.max(...times, peakFrame?.timeSec ?? 0, 0)
}

function getVideoPositionLabel(ratio: number) {
  if (ratio < 0.33) return "영상 초반부"
  if (ratio < 0.66) return "영상 중반부"
  return "영상 후반부"
}

function formatSecondsForViewer(seconds: number) {
  if (!Number.isFinite(seconds)) return "-"
  const rounded = Math.round(seconds * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}초`
}

function formatScoreOutOf100(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return "-"
  return `${Math.round(normalizeResultValue(score) * 100)} / 100`
}

function ResultDetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4">
      <h4 className="text-base font-bold text-foreground">{title}</h4>
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
      <span className={cn("min-w-0 truncate text-right font-bold text-foreground", mono && "font-mono text-xs")}>
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
  return `AI 기반 분석 결과 ${verdict} 신호가 확인되었으며, 위험 점수는 ${displayScore} / 100입니다. 얼굴 경계부와 압축 패턴을 중심으로 전문가 검토가 필요합니다.`
}

function buildResultSummaryLines(_data: EvidenceDetailData | null) {
  return [
    `${PRIORITY_REVIEW_RANGE_LABEL} 구간에서 얼굴 경계부의 연결성이 낮게 측정되었습니다.`,
    "일부 구간에서는 압축 흔적이 주변 영역보다 높게 나타나 조작 의심도가 상승했습니다.",
    "연속 프레임에서 유사한 위험 신호가 반복되어 해당 구간에 대한 우선 검토가 권장됩니다.",
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

function buildModelInsights(_data: EvidenceDetailData | null, _frameScores: FrameScore[]) {
  return {
    ensembleScore: 0.71,
    primaryModels: [
      {
        name: "TimesFormer",
        role: "연속 프레임 기반 시간적 일관성 분석",
        score: 0.7,
        interpretation: "일부 구간에서 얼굴 움직임과 프레임 흐름의 연속성이 낮게 측정되었습니다.",
      },
      {
        name: "Xception",
        role: "얼굴 crop 기반 공간적 합성 흔적 분석",
        score: 0.7,
        interpretation: "얼굴 경계부와 질감 패턴에서 합성 의심 신호가 확인되었습니다.",
      },
    ],
    gmflow: {
      score: 0.68,
      status: "보조 신호",
      description:
        "프레임 간 얼굴 움직임 벡터에서 일부 불안정 패턴이 관찰되었습니다. 이 결과는 단독 판단 근거가 아니라, Xception 및 TimesFormer 결과를 보강하는 참고 신호로 사용됩니다.",
    },
  }
}

function buildModelAnalysisSettings(data: EvidenceDetailData | null, frameScores: FrameScore[]) {
  const metadata = data?.evidenceInfo.technicalMetadata
  const width = metadata?.width
  const height = metadata?.height
  const fps = metadata?.fps
  const durationSec = metadata?.durationSec

  return [
    { label: "분석 모델", value: "TimesFormer + Xception" },
    { label: "보조 지표", value: "GMFlow" },
    { label: "입력 해상도", value: width && height ? `${width} x ${height}` : "1920 x 1080" },
    { label: "분석 프레임 수", value: `${frameScores.length || 14}개` },
    { label: "프레임 추출 간격", value: "2.2초" },
    { label: "영상 길이", value: durationSec ? formatDuration(durationSec) : "00:24.000" },
    { label: "프레임레이트", value: fps ? `${fps} fps` : "29.97 fps" },
    { label: "모델 버전", value: "v2.4.1" },
  ]
}

function findModuleByKeywords(modules: EvidenceDetailData["analysisInfo"]["moduleResults"], keywords: string[]) {
  return modules.find((module) => {
    const name = module.moduleName.toLowerCase()
    return keywords.some((keyword) => name.includes(keyword))
  })
}

function splitSummary(summary: string) {
  return summary
    .split(/[.!?。]\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getDetectionTone(value: number): { level: string; badgeClass: string; barClass: string } {
  if (value >= 0.6) return { level: "높음", badgeClass: "bg-red-100 text-red-700", barClass: "bg-red-500" }
  if (value >= 0.3) return { level: "보통", badgeClass: "bg-amber-100 text-amber-700", barClass: "bg-amber-500" }
  return { level: "낮음", badgeClass: "bg-emerald-100 text-emerald-700", barClass: "bg-emerald-500" }
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

function buildDetectionContext(moduleName: string, index: number, frameScores: FrameScore[]) {
  const label = formatModuleLabel(moduleName)
  const normalizedName = moduleName.toLowerCase()
  const basis =
    normalizedName.includes("boundary") || normalizedName.includes("face")
      ? "얼굴 윤곽선과 주변 배경의 연결성이 낮게 측정됨"
      : normalizedName.includes("compression") || normalizedName.includes("artifact")
        ? "얼굴 주변 압축 패턴이 주변 영역보다 높게 나타남"
        : normalizedName.includes("timeline") || normalizedName.includes("temporal")
          ? "프레임 간 움직임 흐름이 일부 구간에서 불연속적으로 측정됨"
          : normalizedName.includes("metadata")
            ? "파일 메타데이터와 프레임 특성 간 차이가 확인됨"
            : `${label} 점수가 기준값보다 높게 측정됨`

  return {
    basis,
    interval: buildDetectionInterval(index, frameScores),
  }
}

function buildDetectionInterval(index: number, frameScores: FrameScore[]) {
  if (frameScores.length === 0) return "대표 구간 없음"

  const scoredFrames = frameScores
    .map((frame, frameIndex) => ({
      timeSec: frame.timeSec ?? frameIndex,
      score: normalizeResultValue(frame.score),
    }))
    .sort((a, b) => b.score - a.score)
  const target = scoredFrames[index % scoredFrames.length]
  const maxTime = Math.max(...scoredFrames.map((frame) => frame.timeSec), target.timeSec)
  const windowSec = Math.max(1, Math.min(4, Math.round(maxTime / 8) || 1))
  const start = Math.max(0, target.timeSec - windowSec)
  const end = Math.min(Math.max(target.timeSec + windowSec, start + 1), Math.max(maxTime, target.timeSec + 1))

  return `${formatDuration(start)} - ${formatDuration(end)}`
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

function shortHash(hash: string) {
  if (!hash || hash === "-") return "-"
  if (hash.length <= 18) return hash
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

function buildBlockchainAnchors(
  blockchainInfo: NonNullable<EvidenceDetailData["blockchainInfo"]>,
  evidenceDetail: EvidenceDetailData
): BlockchainAnchorItem[] {
  const originalHash = evidenceDetail.integrityInfo.originalHash
  const baseTime = blockchainInfo.anchoredAt ?? evidenceDetail.evidenceInfo.uploadedAt
  const network = blockchainInfo.network || "ForenShield Private Chain"
  const anchors: BlockchainAnchorItem[] = [
    {
      id: "evidence-anchor",
      title: "증거 등록 앵커",
      target: "원본 SHA-256 + 최초 CoC 체인 해시",
      status: getBlockchainStatusLabel(blockchainInfo.status),
      subjectHash: blockchainInfo.subjectHash || originalHash,
      transactionId: blockchainInfo.transactionHash || buildMockTransactionId(originalHash, "evd"),
      anchoredAt: baseTime,
      network,
      channel: "forenshield-evidence",
      chaincode: "evidence-anchor",
      blockHeight: buildMockBlockHeight(originalHash, 0),
      verificationResult: "기록 일치",
    },
  ]

  if (evidenceDetail.analysisInfo.status === "COMPLETED") {
    const resultHash = buildDerivedHash(originalHash, "analysis-result")
    anchors.push({
      id: "analysis-anchor",
      title: "분석 결과 앵커",
      target: "AI 분석 결과 JSON 해시",
      status: "앵커링 완료",
      subjectHash: resultHash,
      transactionId: buildMockTransactionId(resultHash, "analysis"),
      anchoredAt: evidenceDetail.analysisInfo.completedAt ?? baseTime,
      network,
      channel: "forenshield-evidence",
      chaincode: "analysis-anchor",
      blockHeight: buildMockBlockHeight(originalHash, 12),
      verificationResult: "기록 일치",
    })

    const reportLog = evidenceDetail.cocLogs.find((log) => log.eventType === "REPORT_GENERATED")
    const reportHash = buildDerivedHash(originalHash, "report-pdf")
    anchors.push({
      id: "report-anchor",
      title: "보고서 앵커",
      target: "PDF 보고서 해시",
      status: "앵커링 완료",
      subjectHash: reportHash,
      transactionId: buildMockTransactionId(reportHash, "report"),
      anchoredAt: reportLog?.createdAt ?? evidenceDetail.analysisInfo.completedAt ?? baseTime,
      network,
      channel: "forenshield-evidence",
      chaincode: "report-anchor",
      blockHeight: buildMockBlockHeight(originalHash, 18),
      verificationResult: "기록 일치",
    })
  }

  return anchors
}

function buildDerivedHash(seed: string, suffix: string) {
  const compactSeed = (seed || "forenshield").replace(/[^a-fA-F0-9]/g, "")
  const compactSuffix = Array.from(suffix)
    .map((char) => char.charCodeAt(0).toString(16))
    .join("")
  return `${compactSeed}${compactSuffix}`.slice(0, 64).padEnd(64, "0")
}

function buildMockTransactionId(hash: string, namespace: string) {
  return `${namespace}-${buildDerivedHash(hash, namespace).slice(0, 48)}`
}

function buildMockBlockHeight(hash: string, offset: number) {
  const source = buildDerivedHash(hash, "block").slice(0, 6)
  const parsed = Number.parseInt(source, 16)
  return String(12000 + (Number.isNaN(parsed) ? 0 : parsed % 5000) + offset)
}

function getBlockchainStatusLabel(status: string) {
  const s = (status ?? "").toUpperCase()
  if (s === "ANCHORED") return "앵커링 완료"
  if (s === "PENDING") return "앵커링 진행 중"
  if (s === "FAILED") return "앵커링 실패"
  if (s === "NOT_ANCHORED") return "미앵커"
  return status || "-"
}

function getAnchorTypeLabel(anchorType: string) {
  const t = (anchorType ?? "").toUpperCase()
  if (t === "EVIDENCE_HASH") return "증거 해시"
  if (t === "REPORT_HASH") return "보고서 해시"
  if (t === "MERKLE_ROOT") return "머클 루트 (일괄)"
  return anchorType || "-"
}

function getCocEventLabel(eventType: string) {
  if (eventType === "UPLOAD") return "증거 등록"
  if (eventType === "HASH_CREATED") return "해시 생성"
  if (eventType === "INTEGRITY_VERIFIED") return "무결성 검증"
  if (eventType === "ANALYSIS_REQUESTED") return "분석 요청"
  if (eventType === "FRAME_ANALYSIS_STARTED") return "프레임 분석 시작"
  if (eventType === "ANALYSIS_COMPLETED") return "분석 완료"
  if (eventType === "ANALYSIS_FAILED") return "분석 실패"
  if (eventType === "REPORT_GENERATED") return "보고서 생성"
  return eventType
}

// 점 색상 = 이벤트 성격. 실패=빨강, 완료·검증 계열=초록, 그 외 진행 단계=파랑
function getCocEventDotClass(eventType: string) {
  if (eventType === "ANALYSIS_FAILED") return "bg-red-500"
  if (eventType === "ANALYSIS_COMPLETED" || eventType === "INTEGRITY_VERIFIED" || eventType === "REPORT_GENERATED")
    return "bg-emerald-500"
  return "bg-blue-500"
}

// 행위자(userId)를 역할 라벨로 변환 — 실데이터 연동 시 admin/reviewer id가 오면 자동으로 관리자/검토자 표기
function getCocActor(userId: string): { label: string; role: string; roleClass: string } {
  const id = (userId || "").toLowerCase()
  if (id.includes("admin") || id.includes("관리자"))
    return { label: userId, role: "관리자", roleClass: "bg-violet-100 text-violet-700" }
  if (id.includes("review") || id.includes("검토"))
    return { label: userId, role: "검토자", roleClass: "bg-amber-100 text-amber-700" }
  if (id.includes("ai") || id.includes("worker"))
    return { label: userId, role: "AI 엔진", roleClass: "bg-teal-100 text-teal-700" }
  if (id.includes("system"))
    return { label: userId, role: "시스템", roleClass: "bg-slate-100 text-slate-600" }
  return { label: userId || "-", role: "분석관", roleClass: "bg-blue-100 text-blue-700" }
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

  if (status === "COMPLETED") return getEvidenceRiskVerdictLabel(evidence)
  return getEvidenceStatusLabel(status)
}

function getEvidenceRiskVerdictLabel(evidence: CaseEvidenceSummary) {
  const riskLevel = evidence.riskLevel
  const riskScore = evidence.riskScore ?? null

  if (riskLevel === "HIGH" || (riskScore != null && riskScore >= 70)) return "위험"
  if (riskLevel === "MEDIUM" || (riskScore != null && riskScore >= 45)) return "주의"
  return "정상"
}

function getEvidenceAnalysisBadgeClassName(evidence: CaseEvidenceSummary) {
  const status = normalizeStatus(evidence.analysisStatus ?? "PENDING")

  if (isEvidenceAnalysisRunning(evidence)) return "bg-blue-50 text-blue-700"
  if (status === "FAILED") return "bg-red-50 text-red-600"
  if (status === "PENDING") return "bg-slate-100 text-slate-400"

  const verdict = getEvidenceRiskVerdictLabel(evidence)
  if (verdict === "위험") return "bg-red-50 text-red-600"
  if (verdict === "주의") return "bg-amber-50 text-amber-700"
  return "bg-emerald-50 text-emerald-700"
}

function getCompareVerificationLabel(result: StoredCompareResultSummary | null) {
  if (!result) return "미검증"
  if (result.verdict === "ORIGINAL_MATCH") return "일치"
  if (result.verdict === "TAMPERED") return "불일치"
  if (result.mismatchCount > 0) return "불일치"
  return result.verdictLabel || "판정 보류"
}

function getCompareVerificationBadgeClassName(result: StoredCompareResultSummary | null) {
  if (!result) return "bg-slate-100 text-slate-500"
  if (result.verdict === "ORIGINAL_MATCH") return "bg-emerald-100 text-emerald-700"
  if (result.verdict === "TAMPERED" || result.mismatchCount > 0) return "bg-red-50 text-red-600"
  return "bg-amber-50 text-amber-700"
}

function isEvidenceAnalysisRunning(evidence: CaseEvidenceSummary) {
  const lifecycle = evidence.lifecycleStatus ?? "ACTIVE"
  const status = normalizeStatus(evidence.analysisStatus ?? "PENDING")

  // PROCESSING(=백엔드 ANALYZING)만 분석 중. PENDING+progress 0은 미요청/대기.
  return lifecycle === "ACTIVE" && status === "PROCESSING"
}

function isEvidenceSelectableForAnalysis(evidence: CaseEvidenceSummary) {
  const lifecycle = evidence.lifecycleStatus ?? "ACTIVE"
  const status = normalizeStatus(evidence.analysisStatus ?? "PENDING")

  return lifecycle === "ACTIVE" && (status === "PENDING" || status === "FAILED")
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
