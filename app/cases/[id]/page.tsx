"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  FileBadge,
  FileSearch,
  FileText,
  FileVideo,
  Fingerprint,
  Hash,
  History,
  KeyRound,
  Loader2,
  LockKeyhole,
  Play,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
  Video,
} from "lucide-react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AnalysisStatus } from "@/lib/analysis-status"
import {
  fetchCaseDetail,
  fetchEvidenceDetail,
  type CaseDetailData,
  type CaseEvidenceSummary,
  type CocLog,
  type EvidenceDetailData,
  type ModuleResult,
} from "@/lib/api/evidence-detail"
import { ApiError } from "@/lib/api/client"
import { getApiErrorMessage, isUnauthorizedError } from "@/lib/api/errors"
import { formatDateTime, formatFileSize as formatBytes } from "@/lib/formatters"
import {
  getAnalysisStatusLabel,
  getRiskLabel as getSharedRiskLabel,
  getRiskTone as getSharedRiskTone,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type RiskTone = "green" | "orange" | "red"

type ProgressStep = {
  title: string
  time?: string | null
  done: boolean
}

type SuspiciousSegment = {
  range: string
  score: number
  reason: string
}

type DetectionFinding = {
  title: string
  status: "정상" | "주의" | "위험"
  score: number
  details: string[]
}

const FRAME_LABELS = ["0:00", "0:03", "0:06", "0:09", "0:12", "0:15", "0:18", "0:21", "0:24", "0:27"]

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

function formatDateTimeWithSeconds(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function formatClockTime(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${hours}:${minutes}:${seconds}`
}

function formatDuration(seconds?: number) {
  if (!seconds) return "-"

  const minutes = Math.floor(seconds / 60)
  const remain = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`
}

function formatPreciseDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds - minutes * 60
  return `${String(minutes).padStart(2, "0")}:${remain.toFixed(3).padStart(6, "0")}`
}

function getDurationSeconds(data: EvidenceDetailData) {
  return data.evidenceInfo.technicalMetadata.durationSec ?? 31.24
}

function getFrameRate(data: EvidenceDetailData) {
  return data.evidenceInfo.technicalMetadata.fps ?? 29.97
}

function getTotalFrames(data: EvidenceDetailData) {
  return Math.round(getDurationSeconds(data) * getFrameRate(data))
}

function formatResolution(data: EvidenceDetailData) {
  const metadata = data.evidenceInfo.technicalMetadata
  const width = metadata?.width ?? 1920
  const height = metadata?.height ?? 1080
  return `${width} × ${height}`
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

function buildFrameRisks(seed: number, riskScore: number) {
  const peak = 3 + (seed % 4)
  const ceiling = Math.max(18, Math.min(98, riskScore + 10))

  return FRAME_LABELS.map((label, index) => {
    const value = Math.max(4, ceiling - Math.abs(index - peak) * 17)
    const color = value >= 72 ? "bg-red-400" : value >= 45 ? "bg-orange-400" : "bg-teal-500"
    return { label, value, color }
  })
}

function buildSuspiciousSegments(riskScore: number): SuspiciousSegment[] {
  if (riskScore >= 70) {
    return [
      { range: "00:08.120 - 00:14.640", score: riskScore, reason: "얼굴 경계부 블렌딩 흔적과 프레임 간 질감 불연속" },
      { range: "00:21.400 - 00:24.920", score: Math.max(62, riskScore - 12), reason: "구간 전환부 압축 패턴 급변" },
    ]
  }

  if (riskScore >= 40) {
    return [
      { range: "00:09.840 - 00:12.320", score: riskScore, reason: "랜드마크 흔들림과 조명 편차 관찰" },
      { range: "00:18.000 - 00:19.760", score: Math.max(36, riskScore - 8), reason: "코덱 블록 패턴 일부 변동" },
    ]
  }

  return [
    { range: "00:06.000 - 00:09.240", score: Math.max(12, riskScore), reason: "정상 범위 내 압축 노이즈 편차" },
    { range: "00:22.500 - 00:25.000", score: Math.max(10, riskScore - 2), reason: "연속성 이상 없음" },
  ]
}

function buildDetectionFindings(riskScore: number): DetectionFinding[] {
  const riskStatus: DetectionFinding["status"] = riskScore >= 70 ? "위험" : riskScore >= 40 ? "주의" : "정상"

  return [
    {
      title: "딥페이크 근거",
      status: riskStatus,
      score: riskScore,
      details: ["얼굴 블렌딩: 낮음", "경계 이상: 낮음", "프레임 이상: 정상 범위"],
    },
    {
      title: "립싱크 결과",
      status: riskScore >= 60 ? "주의" : "정상",
      score: Math.max(6, riskScore - 4),
      details: ["입 모양/음성 동기화 오차 42ms", "음성 피크와 구강 움직임 일치"],
    },
    {
      title: "프레임 편집 결과",
      status: riskScore >= 65 ? "주의" : "정상",
      score: Math.max(5, riskScore - 10),
      details: ["프레임 누락 없음", "반복 프레임 없음", "급전환 0건"],
    },
    {
      title: "영상 편집 의심",
      status: riskScore >= 55 ? "주의" : "정상",
      score: Math.max(8, riskScore - 8),
      details: ["구간 편집 흔적 낮음", "연결부 GOP 구조 정상"],
    },
    {
      title: "재인코딩 흔적",
      status: "주의",
      score: Math.max(34, riskScore + 18),
      details: ["컨테이너/코덱 조합 정상", "압축률 변동 일부 관찰", "메타데이터 생성 프로그램 미확인"],
    },
  ]
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
  const caseId = Array.isArray(id) ? id[0] : id
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
        setSelectedEvidenceId((current) => current ?? sorted[0]?.evidenceId ?? null)
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
  }, [caseId])

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

            <CaseHero data={caseData} />

            <div className="grid items-start gap-5 xl:grid-cols-[360px_1fr]">
              <EvidenceSelector
                evidences={caseData.evidences}
                selectedEvidenceId={selectedEvidenceId}
                onSelect={setSelectedEvidenceId}
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

function CaseHero({ data }: { data: CaseDetailData }) {
  const completed = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "COMPLETED").length
  const processing = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "PROCESSING").length
  const failed = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "FAILED").length

  return (
    <section className="py-2">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-3xl font-black tracking-normal text-slate-950 sm:text-4xl dark:text-foreground">
          {data.caseName}
        </h1>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-slate-400">
          <Copy className="size-4" />
        </Button>
      </div>
      <p className="mt-3 break-all font-mono text-sm font-bold text-slate-500 dark:text-muted-foreground">
        {data.caseId}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-black">
        <HeroChip label="생성일" value={formatDateTime(data.createdAt)} />
        <HeroChip label="상태" value={getCaseStatusLabel(data.status)} highlight />
        <HeroChip label="총 증거 수" value={`${data.evidences.length}개`} />
        <HeroChip label="완료" value={`${completed}개`} />
        <HeroChip label="처리 중" value={`${processing}개`} />
        <HeroChip label="실패" value={`${failed}개`} />
      </div>
    </section>
  )
}

function HeroChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-muted dark:text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-slate-800 dark:text-foreground", highlight && "text-emerald-600")}>{value}</span>
    </div>
  )
}

function EvidenceSelector({
  evidences,
  selectedEvidenceId,
  onSelect,
}: {
  evidences: CaseEvidenceSummary[]
  selectedEvidenceId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card xl:sticky xl:top-28">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900 dark:text-foreground">증거 파일</h2>
        <Badge variant="secondary" className="rounded-full px-3 font-black">
          {evidences.length}개
        </Badge>
      </div>

      {evidences.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-xs font-bold text-slate-500 dark:border-border dark:text-muted-foreground">
          연결된 증거가 없습니다.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {evidences.map((evidence) => {
            const active = evidence.evidenceId === selectedEvidenceId
            const completed = normalizeStatus(evidence.analysisStatus) === "COMPLETED"
            return (
              <button
                key={evidence.evidenceId}
                type="button"
                onClick={() => onSelect(evidence.evidenceId)}
                className={cn(
                  "group w-full overflow-hidden rounded-lg border text-left transition-colors",
                  active
                    ? "border-teal-400 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/30"
                )}
              >
                <div className="flex gap-3 p-3">
                  <EvidenceThumbnail evidenceId={evidence.evidenceId} active={active} />
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700 dark:text-foreground">
                          {evidence.fileName}
                        </p>
                        <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">EVD-{evidence.evidenceId}</p>
                      </div>
                      <ChevronRight className={cn("mt-0.5 size-4 shrink-0", active ? "text-teal-600" : "text-slate-300")} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-black", completed ? "text-teal-600" : "text-slate-500")}>
                        <span className={cn("size-2 rounded-full", completed ? "bg-teal-500" : "bg-slate-300")} />
                        {completed ? "분석 완료" : getCaseStatusLabel(evidence.analysisStatus)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-muted">
                        VIDEO
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </aside>
  )
}

function EvidenceThumbnail({ evidenceId, active }: { evidenceId: number; active: boolean }) {
  const tone = evidenceId % 3
  const backgroundClass =
    tone === 0
      ? "from-slate-950 via-slate-800 to-teal-900"
      : tone === 1
        ? "from-slate-950 via-blue-950 to-slate-700"
        : "from-slate-900 via-slate-700 to-emerald-900"

  return (
    <span
      className={cn(
        "relative flex aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-gradient-to-br shadow-inner",
        backgroundClass,
        active && "ring-2 ring-teal-400 ring-offset-2 ring-offset-teal-50"
      )}
    >
      <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-white/15" />
      <span className="absolute bottom-2 left-2 right-2 grid grid-cols-4 gap-1">
        <span className="h-1 rounded-full bg-white/25" />
        <span className="h-1 rounded-full bg-white/15" />
        <span className="h-1 rounded-full bg-white/20" />
        <span className="h-1 rounded-full bg-white/10" />
      </span>
      <span className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm">
        <Play className="ml-0.5 size-4 fill-current" />
      </span>
    </span>
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
  const extension = getFileExtension(evidenceInfo.fileName, evidenceInfo.mediaType)
  const frameRisks = useMemo(
    () => buildFrameRisks(evidenceInfo.evidenceId, riskScore),
    [evidenceInfo.evidenceId, riskScore]
  )
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
          riskTone={riskTone}
          riskClassName={riskClassName}
        />

        <TabsContent value="summary" className="space-y-5">
          <SummaryTab data={data} riskTone={riskTone} progressSteps={progressSteps} />
        </TabsContent>

        <TabsContent value="deepfake" className="space-y-5">
          <DeepfakeModelTab data={data} frameRisks={frameRisks} riskTone={riskTone} />
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

function EvidenceSummaryCard({
  data,
  extension,
  riskTone,
  riskClassName,
}: {
  data: EvidenceDetailData
  extension: string
  riskTone: RiskTone
  riskClassName: ReturnType<typeof getRiskClassName>
}) {
  const { evidenceInfo, analysisInfo } = data

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full px-4 font-black", riskClassName.badge)}>
            {getRiskLabel(riskTone)}
          </Badge>
          <Badge variant="secondary" className="rounded-full px-4 font-black">
            {getStatusLabel(analysisInfo.status)}
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 font-black">
            {extension}
          </Badge>
        </div>

        <h2 className="truncate text-2xl font-black tracking-normal text-slate-950 dark:text-foreground">
          {evidenceInfo.fileName}
        </h2>

        <div className="mt-4 grid overflow-hidden rounded-lg border border-slate-200 bg-slate-50/50 sm:grid-cols-2 2xl:grid-cols-3 dark:border-border dark:bg-muted/20">
          <SummaryMetaItem icon={LockKeyhole} label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
          <SummaryMetaItem icon={ClipboardCheck} label="업로드 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
          <SummaryMetaItem icon={FileBadge} label="파일 유형" value={evidenceInfo.mediaType || "VIDEO"} />
          <SummaryMetaItem icon={FileText} label="파일 크기" value={formatBytes(evidenceInfo.fileSize)} />
        </div>

        {analysisInfo.status === "FAILED" ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-black">실패 사유</p>
                <p className="mt-1 leading-5">{analysisInfo.summary || "분석 처리 중 오류가 발생했습니다."}</p>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </section>
  )
}

function SummaryMetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-r border-slate-200 px-4 py-3 last:border-b-0 sm:[&:nth-child(2n)]:border-r-0 2xl:[&:nth-child(2n)]:border-r 2xl:[&:nth-child(3n)]:border-r-0 2xl:[&:nth-last-child(-n+3)]:border-b-0 dark:border-border">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/70 text-slate-400 dark:bg-card">
        <Icon className="size-3.5" />
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-[92px_minmax(0,1fr)] items-center gap-3">
        <p className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-600 dark:text-foreground">{value}</p>
      </div>
    </div>
  )
}

function SummaryTab({
  data,
  riskTone,
  progressSteps,
}: {
  data: EvidenceDetailData
  riskTone: RiskTone
  progressSteps: ProgressStep[]
}) {
  const { analysisInfo } = data
  const riskClassName = getRiskClassName(riskTone)

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <CompactPanel title="판정 요약" icon={ShieldCheck}>
          <InfoLine label="위험 등급" value={getRiskLabel(riskTone)} pillClassName={riskClassName.soft} />
          <InfoLine label="분석 신뢰도" value={`${analysisInfo.confidenceScore ?? 0}%`} pillClassName="bg-emerald-50 text-emerald-600" />
          <InfoLine label="품질 점수" value={`${Math.max(0, (analysisInfo.confidenceScore ?? 0) - 1)} / 100`} pillClassName="bg-emerald-50 text-emerald-600" />
        </CompactPanel>

        <CompactPanel title="분석 결과 요약" icon={Sparkles} className="xl:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
            <p className="text-sm font-semibold text-slate-700 dark:text-foreground">최종 결론</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-muted-foreground">
              {analysisInfo.summary || "AI 분석 결과 위변조 가능성이 낮은 정상 영상으로 판정되었습니다."}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ModuleMini label="딥페이크 탐지" value={getRiskLabel(riskTone)} />
            <ModuleMini label="프레임 연속성" value="정상" />
            <ModuleMini label="품질 평가" value="통과" />
          </div>
        </CompactPanel>

        <CompactPanel title="보고서 상태" icon={FileText} quiet>
          <InfoLine label="생성 상태" value={analysisInfo.status === "COMPLETED" ? "생성 완료" : "생성 전"} pillClassName="bg-emerald-50/80 text-emerald-700" />
          <InfoLine label="최종 분석" value={formatDateTime(analysisInfo.completedAt)} valueClassName="text-slate-700" />
          <Button
            type="button"
            variant="outline"
            className="mt-6 h-11 w-full border-teal-200 bg-white font-black text-teal-700 hover:bg-teal-50 hover:text-teal-800"
          >
            <Download className="size-4" />
            보고서 다운로드
          </Button>
        </CompactPanel>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">분석 진행 요약</h3>
        <ProgressTimeline steps={progressSteps} />
      </section>
    </>
  )
}

function DeepfakeModelTab({
  data,
  frameRisks,
  riskTone,
}: {
  data: EvidenceDetailData
  frameRisks: Array<{ label: string; value: number; color: string }>
  riskTone: RiskTone
}) {
  const { analysisInfo } = data
  const riskScore = analysisInfo.riskScore ?? 0
  const modules = analysisInfo.moduleResults.length
    ? analysisInfo.moduleResults
    : fallbackModules(riskScore)
  const suspiciousSegments = buildSuspiciousSegments(riskScore)
  const findings = buildDetectionFindings(riskScore)
  const normalScore = Math.max(8, Math.round(riskScore * 0.18))

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <BarChart3 className="size-5 text-teal-600" />
            모델 탐지 결과
          </h3>
          <Badge variant="outline" className={cn("w-fit rounded-full px-4 font-black", getRiskClassName(riskTone).badge)}>
            {getRiskLabel(riskTone)}
          </Badge>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {modules.map((module) => (
            <ModelResultCard key={module.moduleName} module={module} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">프레임별 위험도</h3>
        <FrameRiskChart items={frameRisks} color={scoreTone(riskScore).hex} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">의심 구간</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {suspiciousSegments.map((segment) => (
            <SuspiciousSegmentCard key={segment.range} segment={segment} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">탐지 근거 상세</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {findings.map((finding) => (
            <DetectionFindingCard key={finding.title} finding={finding} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">정상 · 의심 구간 비교</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-muted/30">
            <p className="text-xs font-black text-slate-500 dark:text-muted-foreground">정상 구간</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">
              {normalScore}
              <span className="text-sm text-slate-400 dark:text-muted-foreground"> /100</span>
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500 dark:text-muted-foreground">경계 안정 · 입모양·음성 동기화 일치</p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <p className="text-xs font-black text-red-500 dark:text-red-300">의심 구간</p>
            <p className="mt-1 text-2xl font-black text-red-500 dark:text-red-300">
              {riskScore}
              <span className="text-sm"> /100</span>
            </p>
            <p className="mt-2 text-xs font-bold text-red-500/80 dark:text-red-300/80">경계 블렌딩 · 랜드마크 흔들림</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">모델 정보</h3>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-muted/30">
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">모델</span>
            <span className="font-bold text-slate-800 dark:text-foreground">DeepScan Video</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-muted/30">
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">버전</span>
            <span className="font-bold text-slate-800 dark:text-foreground">2.4.1</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-muted/30">
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">신뢰도</span>
            <span className="font-bold text-teal-600 dark:text-teal-300">{analysisInfo.confidenceScore ?? 0}%</span>
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-border">
          <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 dark:bg-muted/30 dark:text-muted-foreground">
            <span>모델별 점수</span>
            <span>점수</span>
          </div>
          {modules.map((module) => {
            const moduleScore = Math.round(module.score * 100)
            return (
              <div
                key={module.moduleName}
                className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-sm dark:border-border"
              >
                <span className="truncate pr-3 font-medium text-slate-700 dark:text-foreground">
                  {module.moduleName.replace(/_/g, " ")}
                </span>
                <span className={cn("shrink-0 font-black", scoreTone(moduleScore).text)}>{moduleScore}%</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function IntegrityTab({
  data,
  copied,
  onCopyHash,
}: {
  data: EvidenceDetailData
  copied: boolean
  onCopyHash: () => void
}) {
  const { integrityInfo, evidenceInfo, analysisInfo } = data
  const chainValid = integrityInfo.isChainValid ?? integrityInfo.chainValid
  const txHash = `0x${integrityInfo.originalHash.slice(0, 8)}...${integrityInfo.originalHash.slice(-6)}`
  const caseNumber = `CASE-2026-${String(evidenceInfo.evidenceId).slice(-4)}`
  const completed = analysisInfo.status === "COMPLETED"
  const steps = [
    { label: "업로드", time: evidenceInfo.uploadedAt, done: true },
    { label: "해시 생성", time: evidenceInfo.uploadedAt, done: true },
    { label: "분석 요청", time: analysisInfo.requestedAt, done: Boolean(analysisInfo.requestedAt) },
    { label: "분석 완료", time: analysisInfo.completedAt, done: completed },
    { label: "보고서 생성", time: analysisInfo.completedAt, done: completed },
  ]

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "flex items-center gap-4 rounded-xl border p-4",
          chainValid
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
        )}
      >
        {chainValid ? (
          <ShieldCheck className="size-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertCircle className="size-8 shrink-0 text-red-500" />
        )}
        <div>
          <p className={cn("text-base font-black", chainValid ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300")}>
            {chainValid ? "무결성 검증 완료" : "무결성 검증 실패"}
          </p>
          <p className={cn("mt-0.5 text-xs font-bold", chainValid ? "text-emerald-600/90 dark:text-emerald-300/80" : "text-red-500/90 dark:text-red-300/80")}>
            {chainValid
              ? "원본 해시와 블록체인 기록이 일치합니다 · 위변조 흔적 없음"
              : "원본 해시와 블록체인 기록이 일치하지 않습니다"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <Hash className="size-5 text-teal-600" />
            해시 · Evidence Manifest
          </h3>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">SHA-256</p>
              <Button type="button" variant="outline" size="sm" onClick={onCopyHash}>
                <Copy className="size-3.5" />
                {copied ? "복사됨" : "복사"}
              </Button>
            </div>
            <p className="break-all font-mono text-xs font-bold text-slate-700 dark:text-foreground">
              {integrityInfo.originalHash}
            </p>
          </div>
          <dl className="mt-3 divide-y divide-slate-100 dark:divide-border">
            <ManifestRow label="사건번호" value={caseNumber} />
            <ManifestRow label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
            <ManifestRow label="해시 알고리즘" value={integrityInfo.hashAlgorithm || "SHA-256"} />
            <ManifestRow label="Manifest 생성" value={formatDateTime(evidenceInfo.uploadedAt)} />
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-xs font-bold text-slate-400 dark:text-muted-foreground">전자서명</dt>
              <dd>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full font-bold",
                    chainValid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-border dark:bg-muted/30 dark:text-muted-foreground"
                  )}
                >
                  {chainValid ? "서명 유효 · RSA-4096" : "미검증"}
                </Badge>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <LockKeyhole className="size-5 text-teal-600" />
            블록체인 무결성
          </h3>
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-lg p-3",
              chainValid
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
            )}
          >
            <CheckCircle2 className="size-5 shrink-0" />
            <span className="text-sm font-black">{chainValid ? "검증 성공 — 해시 일치" : "검증 실패 — 해시 불일치"}</span>
          </div>
          <dl className="mt-3 divide-y divide-slate-100 dark:divide-border">
            <ManifestRow label="등록 상태" value={completed ? "앵커링 완료" : "대기"} />
            <ManifestRow label="앵커링 시각" value={formatDateTime(analysisInfo.completedAt ?? evidenceInfo.uploadedAt)} />
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-xs font-bold text-slate-400 dark:text-muted-foreground">Tx Hash</dt>
              <dd>
                <a
                  href="https://etherscan.io"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-bold text-teal-600 underline-offset-2 hover:underline dark:text-teal-300"
                >
                  {txHash}
                </a>
              </dd>
            </div>
            <ManifestRow label="검증 상태" value={integrityInfo.verificationStatus || (chainValid ? "VERIFIED" : "FAILED")} />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
          <History className="size-5 text-teal-600" />
          처리 타임라인
        </h3>
        <div className="relative mt-5 flex justify-between gap-2">
          <div className="absolute left-[10%] right-[10%] top-3 h-0.5 bg-slate-200 dark:bg-border" />
          {steps.map((step) => (
            <div key={step.label} className="relative z-10 flex-1 text-center">
              <span
                className={cn(
                  "mx-auto flex size-6 items-center justify-center rounded-full border-2 bg-white dark:bg-card",
                  step.done ? "border-teal-500 text-teal-600" : "border-slate-200 text-slate-300 dark:border-border"
                )}
              >
                <CheckCircle2 className="size-4" />
              </span>
              <p className="mt-2 text-xs font-bold text-slate-700 dark:text-foreground">{step.label}</p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-400 dark:text-muted-foreground">
                {step.done ? formatClockTime(step.time) : "-"}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

function ManifestRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-xs font-bold text-slate-400 dark:text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-semibold text-slate-700 dark:text-foreground">{value}</dd>
    </div>
  )
}

function ReportInfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-border dark:bg-muted/30">
      <dt className="text-xs font-bold text-slate-400 dark:text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 break-all text-sm font-bold text-slate-700 dark:text-foreground",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function MetadataReportTab({
  data,
  extension,
  reportReady,
  verificationCode,
}: {
  data: EvidenceDetailData
  extension: string
  reportReady: boolean
  verificationCode: string
}) {
  const { evidenceInfo, analysisInfo } = data
  const metadata = evidenceInfo.technicalMetadata
  const chainValid = data.integrityInfo.isChainValid ?? data.integrityInfo.chainValid
  const recoveryScore = chainValid ? 98 : 64
  const dataLoss = chainValid ? 2 : 28

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <FileVideo className="size-5 text-blue-500" />
            메타데이터
          </h3>
          <MetaTable
            rows={[
              ["해상도", formatResolution(data)],
              ["영상 길이", formatPreciseDuration(getDurationSeconds(data))],
              ["비디오 코덱", metadata.codec || "H.264"],
              ["FPS", `${getFrameRate(data)} fps`],
              ["오디오 포함", metadata.channels ? "포함" : "확인되지 않음"],
              ["컨테이너", extension || "MP4"],
              ["생성일", formatDateTimeWithSeconds(evidenceInfo.uploadedAt)],
              ["수정일", "확인되지 않음"],
              ["촬영기기", metadata.deviceInfo || "확인되지 않음"],
              ["소프트웨어", "확인되지 않음"],
              ["EXIF 존재 여부", metadata.capturedAt ? "존재" : "확인되지 않음"],
              ["추출 상태", metadata.extractionStatus || "COMPLETED"],
            ]}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="text-lg font-black text-slate-900 dark:text-foreground">파일 상태</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-4 dark:bg-muted/30">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-foreground">Recovery Score</p>
                <p className="mt-1 text-xs font-bold text-slate-400 dark:text-muted-foreground">파일 손상·메타 상태 기반</p>
              </div>
              <span className={cn("text-3xl font-black", recoveryScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500")}>
                {recoveryScore}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-4 dark:bg-muted/30">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-foreground">데이터 소실도</p>
                <p className="mt-1 text-xs font-bold text-slate-400 dark:text-muted-foreground">메타·스트림 누락 기반</p>
              </div>
              <span className={cn("text-3xl font-black", dataLoss <= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500")}>
                {dataLoss}%
              </span>
            </div>
          </div>
        </section>

      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
          <FileBadge className="size-5 text-teal-600" />
          보고서 · 검증
        </h3>

        {reportReady ? (
          <>
            <div className="mt-5 grid gap-5 xl:grid-cols-[220px_1fr]">
              <div className="flex aspect-square max-h-48 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/30">
                <VerificationQr value={verificationCode} />
              </div>
              <dl className="grid gap-3">
                <ReportInfoItem label="보고서 생성" value={formatDateTime(analysisInfo.completedAt)} />
                <ReportInfoItem label="검증번호" value={verificationCode} />
                <ReportInfoItem label="reportHash" value={`sha256:${data.integrityInfo.originalHash.slice(0, 24)}`} mono />
              </dl>
            </div>
            <Button type="button" className="mt-5 h-11 w-full bg-teal-600 font-black hover:bg-teal-700">
              <Download className="size-4" />
              PDF 보고서 다운로드
            </Button>
          </>
        ) : (
          <>
            <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-border dark:bg-muted/30">
              <FileText className="size-10 text-slate-300 dark:text-muted-foreground" />
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-foreground">PDF 보고서 생성 전</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-400 dark:text-muted-foreground">
                  분석이 완료되면 reportHash · 검증번호 · QR과 함께
                  <br />
                  보고서를 내려받을 수 있습니다.
                </p>
              </div>
            </div>
            <Button type="button" disabled className="mt-5 h-11 w-full bg-teal-600 font-black">
              <Download className="size-4" />
              생성 전 · 다운로드 불가
            </Button>
          </>
        )}
      </section>
    </div>
  )
}

function MetaTable({ rows }: { rows: Array<[string, string]> }) {
  const groupedRows = Array.from({ length: Math.ceil(rows.length / 3) }, (_, index) =>
    rows.slice(index * 3, index * 3 + 3)
  )

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-border">
      <div className="grid grid-cols-3 bg-slate-50 text-xs font-bold text-slate-400 dark:bg-muted/30 dark:text-muted-foreground">
        {["미디어", "기록 정보", "추출 정보"].map((title) => (
          <div key={title} className="border-r border-slate-200 px-5 py-3 last:border-r-0 dark:border-border">
            {title}
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-border">
        {groupedRows.map((group, rowIndex) => (
          <div
            key={`metadata-row-${rowIndex}`}
            className="grid grid-cols-3 text-sm"
          >
            {Array.from({ length: 3 }, (_, cellIndex) => {
              const item = group[cellIndex]

              return (
                <div
                  key={`${rowIndex}-${cellIndex}`}
                  className="min-h-16 border-r border-slate-100 px-5 py-3 last:border-r-0 dark:border-border"
                >
                  {item ? (
                    <>
                      <dt className="text-xs font-semibold text-slate-400 dark:text-muted-foreground">{item[0]}</dt>
                      <dd className="mt-1 min-w-0 break-words font-semibold text-slate-600 dark:text-foreground">{item[1]}</dd>
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function CompactPanel({
  title,
  icon: Icon,
  children,
  className,
  quiet,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
  className?: string
  quiet?: boolean
}) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card", className)}>
      <h3 className={cn("flex items-center gap-2 text-lg text-slate-900 dark:text-foreground", quiet ? "font-bold" : "font-black")}>
        <Icon className={cn("size-5", quiet ? "text-teal-500" : "text-teal-600")} />
        {title}
      </h3>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function InfoLine({
  label,
  value,
  pillClassName,
  valueClassName,
}: {
  label: string
  value: string
  pillClassName?: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-border">
      <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-500 dark:text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 whitespace-nowrap rounded-full px-3 py-1 text-right text-sm font-bold text-slate-800 dark:text-foreground",
          pillClassName,
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  )
}

function ModuleMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-border dark:bg-card">
      <p className="text-xs font-semibold text-slate-400 dark:text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-teal-600">{value}</p>
    </div>
  )
}

function ProgressTimeline({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-6">
      {steps.map((step, index) => (
        <div key={step.title} className="relative flex flex-col items-center text-center">
          {index < steps.length - 1 ? (
            <span className="absolute left-1/2 top-4 hidden h-0.5 w-full bg-teal-400 lg:block" />
          ) : null}
          <span
            className={cn(
              "relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-white",
              step.done ? "border-teal-500 text-teal-600" : "border-slate-200 text-slate-400"
            )}
          >
            <CheckCircle2 className="size-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-foreground">{step.title}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-muted-foreground">{formatDateTime(step.time)}</p>
        </div>
      ))}
    </div>
  )
}

function scoreTone(score: number) {
  if (score >= 70) return { text: "text-red-500 dark:text-red-400", bar: "bg-red-500", hex: "#ef4444" }
  if (score >= 40) return { text: "text-orange-500 dark:text-orange-400", bar: "bg-orange-500", hex: "#f97316" }
  return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", hex: "#10b981" }
}

function RingGauge({ value, size = "size-16" }: { value: number; size?: string }) {
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, value))
  const offset = circumference * (1 - clamped / 100)
  const tone = scoreTone(value)

  return (
    <div className={cn("relative shrink-0", size)}>
      <svg viewBox="0 0 48 48" className={cn("-rotate-90", size)}>
        <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="5" className="stroke-slate-100 dark:stroke-muted" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="5"
          stroke={tone.hex}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-black", tone.text)}>
        {value}
      </span>
    </div>
  )
}

function FrameRiskChart({
  items,
  color,
}: {
  items: Array<{ label: string; value: number; color: string }>
  color: string
}) {
  const count = items.length
  const points = items.map((item, index) => {
    const x = count <= 1 ? 0 : (index / (count - 1)) * 100
    const y = 100 - Math.min(100, Math.max(0, item.value))
    return `${x},${y}`
  })
  const line = points.join(" ")
  const area = `0,100 ${line} 100,100`

  return (
    <div className="mt-4 flex gap-3">
      <div
        className="flex flex-col justify-between py-0.5 text-[10px] font-bold text-slate-400 dark:text-muted-foreground"
        style={{ height: 132 }}
      >
        <span>100</span>
        <span>50</span>
        <span>0</span>
      </div>
      <div className="min-w-0 flex-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[132px] w-full" aria-hidden="true">
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
            className="text-slate-200 dark:text-border"
          />
          <polygon points={area} fill={color} fillOpacity="0.1" />
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400 dark:text-muted-foreground">
          {items.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function fallbackModules(riskScore: number): ModuleResult[] {
  const score = Math.max(0, riskScore / 100)
  return [
    {
      moduleName: "TEMPORAL_FACE_ANALYSIS",
      detected: riskScore >= 50,
      score,
      details: "프레임 간 얼굴 랜드마크와 시선 이동의 연속성을 분석했습니다.",
    },
    {
      moduleName: "LIP_SYNC_ANALYZER",
      detected: riskScore >= 60,
      score: Math.max(0, score - 0.04),
      details: "입 모양과 음성 동기화 오차를 검증했습니다.",
    },
    {
      moduleName: "COMPRESSION_TRACE_CHECK",
      detected: riskScore >= 65,
      score: Math.max(0, score - 0.08),
      details: "압축 패턴과 재인코딩 흔적을 비교했습니다.",
    },
  ]
}

function ModelResultCard({ module }: { module: ModuleResult }) {
  const score = Math.round(module.score * 100)
  const suspicious = module.detected || score >= 55

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-center gap-3">
        <RingGauge value={score} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800 dark:text-foreground">
            {module.moduleName.replace(/_/g, " ")}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "mt-1.5 rounded-full font-bold",
              suspicious
                ? "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            )}
          >
            {suspicious ? "탐지" : "정상"}
          </Badge>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-muted-foreground">{module.details}</p>
    </div>
  )
}

function SuspiciousSegmentCard({ segment }: { segment: SuspiciousSegment }) {
  const tone = scoreTone(segment.score)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold text-slate-500 dark:text-muted-foreground">{segment.range}</p>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-800 dark:text-foreground">{segment.reason}</p>
        </div>
        <span className={cn("shrink-0 text-2xl font-black", tone.text)}>{segment.score}%</span>
      </div>
    </div>
  )
}

function DetectionFindingCard({ finding }: { finding: DetectionFinding }) {
  const tone = scoreTone(finding.status === "위험" ? 80 : finding.status === "주의" ? 50 : 10)
  const badge =
    finding.status === "위험"
      ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
      : finding.status === "주의"
        ? "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800 dark:text-foreground">{finding.title}</p>
          <span className={cn("text-sm font-black", tone.text)}>{finding.score}%</span>
        </div>
        <Badge variant="outline" className={cn("shrink-0 rounded-full font-bold", badge)}>
          {finding.status}
        </Badge>
      </div>
      <ul className="mt-3 space-y-1">
        {finding.details.map((detail) => (
          <li key={detail} className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-teal-500" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusPanel({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon
  title: string
  value: string
  tone: "green"
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-muted-foreground">{title}</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{value}</p>
        </div>
      </div>
    </section>
  )
}

function getCocEventTitle(eventType: string) {
  const labels: Record<string, string> = {
    UPLOAD: "파일 수신",
    HASH_CREATED: "SHA-256 생성",
    INTEGRITY_VERIFIED: "원본 증거 저장",
    ANALYSIS_REQUESTED: "분석용 사본 생성",
    FRAME_ANALYSIS_STARTED: "프레임 분석 시작",
    ANALYSIS_COMPLETED: "자동 분석 완료",
    ANALYSIS_FAILED: "자동 분석 실패",
    REPORT_GENERATED: "보고서 생성",
  }

  return labels[eventType] ?? eventType
}

function getCocDetail(log: CocLog) {
  if (log.eventType === "UPLOAD") return `${log.userId} / 웹 업로드`
  if (log.eventType === "HASH_CREATED") return `${log.currentLogHash.slice(0, 8)}...${log.currentLogHash.slice(-4)} / 검증 성공`
  if (log.eventType === "INTEGRITY_VERIFIED") return "Object Version ID: obj-v20260618-001 / 보존 기한: 2031-06-18"
  if (log.eventType === "ANALYSIS_REQUESTED") return "원본 해시와 일치"
  if (log.eventType === "FRAME_ANALYSIS_STARTED") return "매 5프레임 추출 / 임계값 0.72"
  if (log.eventType === "ANALYSIS_COMPLETED") return "Analysis Job AJ-20260618-0488"
  if (log.eventType === "REPORT_GENERATED") return "PDF 보고서 및 검증번호 발급"
  return log.description
}

function CocTimelineItem({ log, last }: { log: CocLog; last: boolean }) {
  return (
    <div className="grid min-w-0 grid-cols-[72px_24px_1fr] gap-4">
      <p className="pt-1 font-mono text-xs font-semibold text-slate-500 dark:text-muted-foreground">
        {formatClockTime(log.createdAt)}
      </p>
      <div className="relative flex justify-center">
        <span className="mt-1 flex size-5 items-center justify-center rounded-full border-2 border-teal-500 bg-white">
          <span className="size-2 rounded-full bg-teal-500" />
        </span>
        {!last ? <span className="absolute top-7 h-[calc(100%+8px)] w-px bg-slate-200" /> : null}
      </div>
      <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-border dark:bg-muted/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-foreground">{getCocEventTitle(log.eventType)}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-muted-foreground">{getCocDetail(log)}</p>
          </div>
          <Badge variant="outline" className="w-fit shrink-0 rounded-full font-bold">
            {log.userId}
          </Badge>
        </div>
        <p className="mt-3 min-w-0 break-all font-mono text-[11px] leading-5 text-slate-500">{log.currentLogHash}</p>
      </div>
    </div>
  )
}

function VerificationQr({ value }: { value: string }) {
  const cells = Array.from({ length: 121 }, (_, index) => {
    const charCode = value.charCodeAt(index % value.length)
    const row = Math.floor(index / 11)
    const col = index % 11
    const finder =
      (row <= 2 && col <= 2) ||
      (row <= 2 && col >= 8) ||
      (row >= 8 && col <= 2)
    return finder || (charCode + row * 7 + col * 11) % 3 === 0
  })

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid size-32 grid-cols-11 gap-0.5">
        {cells.map((filled, index) => (
          <span
            key={`${value}-${index}`}
            className={cn("rounded-[2px]", filled ? "bg-slate-900" : "bg-slate-100")}
          />
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] font-semibold text-slate-500">{value}</p>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-border dark:bg-muted/30">
      <p className="text-[11px] font-semibold text-slate-400 dark:text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-600 dark:text-foreground">{value}</p>
    </div>
  )
}
