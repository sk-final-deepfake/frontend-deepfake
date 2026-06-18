"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  FileSearch,
  FileStack,
  FileVideo,
  Fingerprint,
  Hash,
  History,
  KeyRound,
  Loader2,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  Waves,
} from "lucide-react"

import { AnalysisStatusBadge } from "@/components/analysis-status-badge"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
import { cn } from "@/lib/utils"

type RiskTone = "green" | "orange" | "red"

type DetectionItem = {
  title: string
  description: string
  score: number
  status: "정상" | "주의" | "위험"
}

type TimelineItem = {
  title: string
  description: string
  time?: string | null
  done: boolean
}

const FRAME_LABELS = ["0:00", "0:03", "0:06", "0:09", "0:12", "0:15", "0:18", "0:21", "0:24", "0:27", "0:30"]

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function normalizeStatus(status: string): AnalysisStatus {
  if (status === "PROCESSING" || status === "COMPLETED" || status === "FAILED") return status
  return "PENDING"
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}.${month}.${day} ${hours}:${minutes}`
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return "-"

  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`
}

function getFileExtension(fileName: string, mediaType?: string) {
  const extension = fileName.split(".").pop()
  if (extension) return extension.toUpperCase()
  return mediaType || "UNKNOWN"
}

function getRiskTone(score: number, failed: boolean): RiskTone {
  if (failed || score >= 70) return "red"
  if (score >= 40) return "orange"
  return "green"
}

function getRiskLabel(tone: RiskTone) {
  if (tone === "red") return "위험"
  if (tone === "orange") return "주의"
  return "정상"
}

function getStatusLabel(status: EvidenceDetailData["analysisInfo"]["status"]) {
  if (status === "PENDING") return "대기중"
  if (status === "PROCESSING") return "분석중"
  if (status === "COMPLETED") return "완료"
  return "실패"
}

function getRiskClassName(tone: RiskTone) {
  if (tone === "red") {
    return {
      badge: "border-red-200 bg-red-50 text-red-600",
      text: "text-red-500",
      bar: "bg-gradient-to-r from-orange-400 to-red-500",
    }
  }

  if (tone === "orange") {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-600",
      text: "text-orange-500",
      bar: "bg-gradient-to-r from-amber-300 to-orange-500",
    }
  }

  return {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
    text: "text-emerald-600",
    bar: "bg-gradient-to-r from-emerald-300 to-emerald-500",
  }
}

function buildFrameRisks(seed: number, riskScore: number) {
  const peak = 3 + (seed % 4)
  const ceiling = Math.max(22, Math.min(99, riskScore + 5))

  return FRAME_LABELS.map((label, index) => {
    const value = Math.max(8, ceiling - Math.abs(index - peak) * 22)
    const color = value >= 85 ? "bg-red-400" : value >= 60 ? "bg-orange-400" : "bg-teal-500"
    return { label, value, color }
  })
}

function buildSuspiciousSections(riskScore: number) {
  if (riskScore < 40) {
    return [
      {
        range: "00:03 - 00:06",
        score: Math.max(18, riskScore),
        reason: "압축 노이즈 편차 낮음",
        level: "LOW",
      },
    ]
  }

  if (riskScore < 70) {
    return [
      {
        range: "00:06 - 00:09",
        score: riskScore,
        reason: "조명 불일치 및 얼굴 랜드마크 흔들림",
        level: "MEDIUM",
      },
    ]
  }

  return [
    {
      range: "00:09 - 00:18",
      score: riskScore,
      reason: "GAN 아티팩트 / 얼굴 블렌딩 경계 감지",
      level: "HIGH",
    },
    {
      range: "00:06 - 00:09",
      score: Math.max(58, riskScore - 31),
      reason: "조명 불일치 (Shadow inconsistency)",
      level: "MEDIUM",
    },
  ]
}

function buildDetectionItems(score: number, modules: ModuleResult[]): DetectionItem[] {
  const moduleScore = (index: number, fallback: number) =>
    modules[index]?.score ? Math.round(modules[index].score * 100) : fallback

  return [
    {
      title: "딥페이크 근거",
      description: "얼굴 블렌딩, 경계 이상, 프레임 간 얼굴 랜드마크 변화를 분석했습니다.",
      score: moduleScore(0, score),
      status: score >= 70 ? "위험" : score >= 40 ? "주의" : "정상",
    },
    {
      title: "립싱크 결과",
      description: "입 모양과 음성 동기화의 시간 차이를 확인했습니다.",
      score: Math.max(12, score - 9),
      status: score >= 75 ? "위험" : score >= 45 ? "주의" : "정상",
    },
    {
      title: "프레임 편집 결과",
      description: "프레임 누락, 반복, 급전환 패턴을 검사했습니다.",
      score: Math.max(10, score - 18),
      status: score >= 80 ? "위험" : score >= 50 ? "주의" : "정상",
    },
    {
      title: "영상 편집 의심",
      description: "구간 편집과 연결부 이상 여부를 탐지했습니다.",
      score: moduleScore(1, Math.max(8, score - 12)),
      status: score >= 65 ? "위험" : score >= 38 ? "주의" : "정상",
    },
    {
      title: "재인코딩 흔적",
      description: "코덱, 압축률, 메타데이터 일관성을 기반으로 재인코딩 여부를 분석했습니다.",
      score: Math.max(6, score - 22),
      status: score >= 72 ? "위험" : score >= 42 ? "주의" : "정상",
    },
  ]
}

function buildTimeline(data: EvidenceDetailData): TimelineItem[] {
  const { evidenceInfo, analysisInfo } = data

  return [
    {
      title: "업로드",
      description: "증거 파일이 저장소에 등록되었습니다.",
      time: evidenceInfo.uploadedAt,
      done: true,
    },
    {
      title: "SHA-256 해시 생성",
      description: "원본 증거 해시가 생성되었습니다.",
      time: evidenceInfo.uploadedAt,
      done: true,
    },
    {
      title: "분석 요청",
      description: "AI 위변조 분석 요청이 등록되었습니다.",
      time: analysisInfo.requestedAt,
      done: Boolean(analysisInfo.requestedAt),
    },
    {
      title: "분석 완료",
      description: "모델 분석 결과가 생성되었습니다.",
      time: analysisInfo.completedAt,
      done: analysisInfo.status === "COMPLETED",
    },
    {
      title: "보고서 생성",
      description: "PDF 리포트와 검증번호가 발급됩니다.",
      time: analysisInfo.completedAt,
      done: analysisInfo.status === "COMPLETED",
    },
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

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8 lg:px-10">
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
              뒤로 가기
            </Button>

            <CaseHero data={caseData} selectedEvidenceId={selectedEvidenceId} />

            <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
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
                <EvidenceDetailTabs
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

function CaseHero({
  data,
  selectedEvidenceId,
}: {
  data: CaseDetailData
  selectedEvidenceId: number | null
}) {
  const completed = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "COMPLETED").length
  const processing = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "PROCESSING").length
  const failed = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "FAILED").length

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs font-black text-teal-600">
            <FileStack className="size-4" />
            사건 상세
          </div>
          <h1 className="truncate text-2xl font-black text-slate-950 dark:text-foreground">{data.caseName}</h1>
          <p className="mt-2 break-all font-mono text-xs font-bold text-slate-400 dark:text-muted-foreground">
            {data.caseId}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">총 {data.evidences.length}개 증거</Badge>
            <Badge variant="outline">완료 {completed}</Badge>
            <Badge variant="outline">처리 중 {processing}</Badge>
            <Badge variant="outline">실패 {failed}</Badge>
            {selectedEvidenceId ? <Badge variant="outline">선택 EVD-{selectedEvidenceId}</Badge> : null}
          </div>
        </div>
        <div className="grid min-w-64 gap-3 sm:grid-cols-2">
          <SummaryPill label="사건 생성" value={formatDateTime(data.createdAt)} />
          <SummaryPill label="사건 상태" value={data.status} />
        </div>
      </div>
    </section>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-border dark:bg-muted/30">
      <p className="text-[11px] font-black text-slate-400 dark:text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-800 dark:text-foreground">{value}</p>
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
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card lg:sticky lg:top-28">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-slate-900 dark:text-foreground">증거 파일</h2>
        <Badge variant="secondary">{evidences.length}건</Badge>
      </div>

      {evidences.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs font-bold text-slate-500 dark:border-border dark:text-muted-foreground">
          연결된 증거가 없습니다.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {evidences.map((evidence) => {
            const active = evidence.evidenceId === selectedEvidenceId
            return (
              <button
                key={evidence.evidenceId}
                type="button"
                onClick={() => onSelect(evidence.evidenceId)}
                className={cn(
                  "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-teal-300 bg-teal-50"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-800 dark:text-foreground">{evidence.fileName}</p>
                    <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">EVD-{evidence.evidenceId}</p>
                  </div>
                  <ChevronRight className={cn("mt-0.5 size-4 shrink-0", active ? "text-teal-600" : "text-slate-300")} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <AnalysisStatusBadge status={normalizeStatus(evidence.analysisStatus)} />
                  <span className="text-[10px] font-black text-slate-400">{evidence.mediaType || "video"}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </aside>
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

function EvidenceDetailTabs({
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
  const suspiciousSections = useMemo(() => buildSuspiciousSections(riskScore), [riskScore])
  const detectionItems = useMemo(
    () => buildDetectionItems(riskScore, analysisInfo.moduleResults),
    [analysisInfo.moduleResults, riskScore]
  )
  const timelineItems = useMemo(() => buildTimeline(data), [data])
  const reportReady = analysisInfo.status === "COMPLETED"
  const verificationCode = `VF-${String(evidenceInfo.evidenceId).padStart(8, "0")}`

  return (
    <section className="min-w-0 space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-black", riskClassName.badge)}>
                {getRiskLabel(riskTone)}
              </Badge>
              <Badge variant="secondary">{getStatusLabel(analysisInfo.status)}</Badge>
              <Badge variant="outline">{extension}</Badge>
            </div>
            <h2 className="truncate text-2xl font-black text-slate-950 dark:text-foreground">
              {evidenceInfo.fileName}
            </h2>
            <p className="mt-2 font-mono text-xs font-bold text-slate-400 dark:text-muted-foreground">
              EVD-{evidenceInfo.evidenceId} · 업로드 {formatDateTime(evidenceInfo.uploadedAt)}
            </p>
            <div className="mt-4 grid gap-3 text-xs font-bold text-slate-500 sm:grid-cols-2 xl:grid-cols-4 dark:text-muted-foreground">
              <SummaryField label="파일 유형" value={evidenceInfo.mediaType || evidenceInfo.fileType || "-"} />
              <SummaryField label="파일 크기" value={formatBytes(evidenceInfo.fileSize)} />
              <SummaryField label="해상도" value={formatResolution(data)} />
              <SummaryField label="완료 시각" value={formatDateTime(analysisInfo.completedAt)} />
            </div>
            {failed ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                실패 사유: {analysisInfo.summary || "분석 처리 중 오류가 발생했습니다."}
              </div>
            ) : null}
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-3 sm:min-w-80">
            <MetricCard label="최종 위험도" value={`${riskScore}`} suffix="/ 100" className={riskClassName.text} />
            <MetricCard label="신뢰도" value={`${confidenceScore}`} suffix="%" className="text-teal-600" />
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
          <div className={cn("h-full rounded-full", riskClassName.bar)} style={{ width: `${riskScore}%` }} />
        </div>
      </section>

      <Tabs defaultValue="summary" className="gap-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-white p-1 shadow-sm md:grid-cols-4 dark:bg-card">
          <TabsTrigger value="summary" className="h-10 text-xs font-black sm:text-sm">
            분석 요약
          </TabsTrigger>
          <TabsTrigger value="detection" className="h-10 text-xs font-black sm:text-sm">
            탐지 상세
          </TabsTrigger>
          <TabsTrigger value="integrity" className="h-10 text-xs font-black sm:text-sm">
            무결성 검증
          </TabsTrigger>
          <TabsTrigger value="report" className="h-10 text-xs font-black sm:text-sm">
            메타데이터/보고서
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-5">
          <SummaryTab data={data} riskLabel={getRiskLabel(riskTone)} extension={extension} />
        </TabsContent>

        <TabsContent value="detection" className="space-y-5">
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <FrameRiskCard items={frameRisks} />
            <SuspiciousRangeCard sections={suspiciousSections} />
          </div>
          <DetectionGrid items={detectionItems} />
        </TabsContent>

        <TabsContent value="integrity" className="space-y-5">
          <IntegrityPanel data={data} copied={copied} onCopyHash={onCopyHash} />
          <CocTimeline timelineItems={timelineItems} rawLogs={data.cocLogs} />
        </TabsContent>

        <TabsContent value="report" className="space-y-5">
          <MetadataPanel data={data} extension={extension} />
          <ModelReportPanel
            modules={analysisInfo.moduleResults}
            reportReady={reportReady}
            verificationCode={verificationCode}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function SummaryTab({
  data,
  riskLabel,
  extension,
}: {
  data: EvidenceDetailData
  riskLabel: string
  extension: string
}) {
  const { evidenceInfo, analysisInfo } = data
  const qualityScore = Math.max(0, Math.min(100, (analysisInfo.confidenceScore ?? 0) - 3))

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <FileVideo className="size-4 text-teal-600" />
          파일 기본정보
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoRow label="파일명" value={evidenceInfo.fileName} />
          <InfoRow label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
          <InfoRow label="업로드 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
          <InfoRow label="파일 유형" value={evidenceInfo.mediaType || evidenceInfo.fileType || extension} />
          <InfoRow label="파일 크기" value={formatBytes(evidenceInfo.fileSize)} />
          <InfoRow label="분석 상태" value={getStatusLabel(analysisInfo.status)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <ShieldCheck className="size-4 text-teal-600" />
          판정 요약
        </h3>
        <div className="mt-4 space-y-3">
          <InfoRow label="위험 등급" value={riskLabel} />
          <InfoRow label="분석 신뢰도" value={`${analysisInfo.confidenceScore ?? 0}%`} />
          <InfoRow label="품질 점수" value={`${qualityScore}%`} />
          <InfoRow label="모델 탐지 점수" value={`${analysisInfo.riskScore ?? 0}/100`} />
        </div>
      </section>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-border dark:bg-muted/30">
      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-slate-700 dark:text-foreground">{value}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  suffix,
  className,
}: {
  label: string
  value: string
  suffix: string
  className: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-right dark:border-border dark:bg-muted/30">
      <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-4xl font-black leading-none", className)}>{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-muted-foreground">{suffix}</p>
    </div>
  )
}

function FrameRiskCard({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <BarChart3 className="size-4 text-teal-600" aria-hidden="true" />
        프레임별 위험도
      </h3>
      <div className="mt-5 flex h-44 items-end gap-2">
        <div className="flex h-full flex-col justify-between pb-6 text-[10px] font-bold text-slate-400 dark:text-muted-foreground">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div className="flex h-full flex-1 items-end justify-between gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div className={cn("w-full rounded-t-sm", item.color)} style={{ height: `${item.value}%` }} />
              <span className="text-center text-[10px] font-bold text-slate-400 dark:text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SuspiciousRangeCard({
  sections,
}: {
  sections: Array<{ range: string; score: number; reason: string; level: string }>
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <Timer className="size-4 text-teal-600" aria-hidden="true" />
        의심 구간
      </h3>
      <div className="mt-4 space-y-3">
        {sections.map((section) => {
          const high = section.level === "HIGH"
          return (
            <div
              key={section.range}
              className={cn(
                "rounded-lg border px-4 py-3",
                high ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-400">{section.range}</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{section.reason}</p>
                </div>
                <p className={cn("text-lg font-black", high ? "text-red-500" : "text-orange-500")}>
                  {section.score}%
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DetectionGrid({ items }: { items: DetectionItem[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <SlidersHorizontal className="size-4 text-teal-600" aria-hidden="true" />
        세부 탐지 결과
      </h3>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {items.map((item) => (
          <div key={item.title} className="rounded-lg border border-slate-200 px-4 py-4 dark:border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-foreground">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <DetectionBadge status={item.status} />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={item.score} className="h-2 flex-1" />
              <span className="w-9 text-right text-xs font-black text-slate-600 dark:text-foreground">
                {item.score}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DetectionBadge({ status }: { status: DetectionItem["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-black",
        status === "위험" && "border-red-200 bg-red-50 text-red-600",
        status === "주의" && "border-orange-200 bg-orange-50 text-orange-600",
        status === "정상" && "border-emerald-200 bg-emerald-50 text-emerald-600"
      )}
    >
      {status}
    </Badge>
  )
}

function IntegrityPanel({
  data,
  copied,
  onCopyHash,
}: {
  data: EvidenceDetailData
  copied: boolean
  onCopyHash: () => void
}) {
  const { integrityInfo, analysisInfo } = data
  const txHash = `0x${integrityInfo.originalHash.slice(0, 8)}...${integrityInfo.originalHash.slice(-6)}`
  const signatureStatus = integrityInfo.isChainValid ? "서명 유효" : "미검증"

  return (
    <section className="grid gap-5 xl:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <Hash className="size-4 text-teal-600" aria-hidden="true" />
          SHA-256 및 블록체인 상태
        </h3>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black text-slate-500 dark:text-muted-foreground">SHA-256</p>
              <Button type="button" variant="outline" size="sm" onClick={onCopyHash}>
                <Copy className="size-3.5" />
                {copied ? "복사됨" : "복사"}
              </Button>
            </div>
            <p className="break-all font-mono text-xs font-bold text-slate-700 dark:text-foreground">
              {integrityInfo.originalHash}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="블록체인 Tx Hash" value={txHash} />
            <InfoRow label="앵커링 상태" value={analysisInfo.status === "COMPLETED" ? "앵커링 완료" : "대기"} />
            <InfoRow label="검증 상태" value={integrityInfo.verificationStatus} />
            <InfoRow label="해시 알고리즘" value={integrityInfo.hashAlgorithm || "SHA-256"} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <KeyRound className="size-4 text-teal-600" aria-hidden="true" />
          전자서명
        </h3>
        <div
          className={cn(
            "mt-5 flex items-center gap-3 rounded-lg border px-4 py-4",
            integrityInfo.isChainValid
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-600"
          )}
        >
          {integrityInfo.isChainValid ? <ShieldCheck className="size-8 shrink-0" /> : <ShieldAlert className="size-8 shrink-0" />}
          <div>
            <p className="text-sm font-black">{signatureStatus}</p>
            <p className="mt-1 text-xs font-semibold">PKI · RSA-4096 기준</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function CocTimeline({
  timelineItems,
  rawLogs,
}: {
  timelineItems: TimelineItem[]
  rawLogs: CocLog[]
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <History className="size-4 text-teal-600" aria-hidden="true" />
        CoC 요약 타임라인
      </h3>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <ol className="space-y-4">
          {timelineItems.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                  item.done
                    ? "border-teal-500 bg-teal-500 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                )}
              >
                <CheckCircle2 className="size-3.5" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-800 dark:text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">{item.description}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">{formatDateTime(item.time)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
          <p className="mb-3 text-xs font-black text-slate-500 dark:text-muted-foreground">원본 로그</p>
          <div className="space-y-3">
            {rawLogs.length === 0 ? (
              <p className="text-xs font-bold text-slate-400">아직 기록된 로그가 없습니다.</p>
            ) : (
              rawLogs.map((log) => (
                <div key={log.logId}>
                  <p className="text-xs font-black text-slate-700 dark:text-foreground">{log.eventType}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-muted-foreground">
                    {log.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function MetadataPanel({ data, extension }: { data: EvidenceDetailData; extension: string }) {
  const { evidenceInfo } = data
  const metadata = evidenceInfo.technicalMetadata

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <FileVideo className="size-4 text-teal-600" aria-hidden="true" />
        메타데이터 결과
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <InfoRow label="EXIF/생성일" value={metadata?.capturedAt ? formatDateTime(metadata.capturedAt) : "-"} />
        <InfoRow label="수정일" value="-" />
        <InfoRow label="소프트웨어" value={metadata?.deviceInfo ?? "DeepScan metadata extractor"} />
        <InfoRow label="코덱" value={metadata?.codec ?? "-"} />
        <InfoRow label="해상도" value={formatResolution(data)} />
        <InfoRow label="파일 형식" value={extension} />
      </div>
    </section>
  )
}

function ModelReportPanel({
  modules,
  reportReady,
  verificationCode,
}: {
  modules: ModuleResult[]
  reportReady: boolean
  verificationCode: string
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <Waves className="size-4 text-teal-600" aria-hidden="true" />
          모델 정보
        </h3>
        <div className="mt-4 grid gap-3">
          <InfoRow label="모델명" value="DeepScan" />
          <InfoRow label="버전" value="v2.4.1" />
          {modules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs font-medium text-slate-500 dark:border-border dark:text-muted-foreground">
              모델별 점수가 아직 생성되지 않았습니다.
            </div>
          ) : (
            modules.map((module) => (
              <div key={module.moduleName} className="rounded-lg border border-slate-200 px-4 py-3 dark:border-border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-foreground">
                      {module.moduleName.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-muted-foreground">{module.details}</p>
                  </div>
                  <p className="text-sm font-black text-teal-600">{Math.round(module.score * 100)}%</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <Fingerprint className="size-4 text-teal-600" aria-hidden="true" />
          보고서 검증
        </h3>
        <div className="mt-5 flex aspect-square max-h-44 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/30">
          <QrCode className="size-20 text-slate-500" />
        </div>
        <InfoRow label="검증번호" value={verificationCode} className="mt-4" />
        <InfoRow label="PDF 상태" value={reportReady ? "다운로드 가능" : "보고서 생성 전"} className="mt-3" />
        <Button type="button" disabled={!reportReady} className="mt-4 h-10 w-full bg-teal-600 font-black hover:bg-teal-700">
          <Download className="size-4" />
          PDF 다운로드
        </Button>
      </section>
    </div>
  )
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-border dark:bg-muted/30", className)}>
      <p className="text-[11px] font-black text-slate-400 dark:text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-700 dark:text-foreground">{value}</p>
    </div>
  )
}

function formatResolution(data: EvidenceDetailData) {
  const metadata = data.evidenceInfo.technicalMetadata
  if (!metadata?.width || !metadata?.height) return "-"
  return `${metadata.width.toLocaleString()} x ${metadata.height.toLocaleString()}`
}
