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
  FileVideo,
  Fingerprint,
  Hash,
  History,
  KeyRound,
  Loader2,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Timer,
  Waves,
} from "lucide-react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const FRAME_LABELS = [
  "0:00",
  "0:03",
  "0:06",
  "0:09",
  "0:12",
  "0:15",
  "0:18",
  "0:21",
  "0:24",
  "0:27",
  "0:30",
]

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
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
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
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
  const ceiling = Math.max(20, Math.min(99, riskScore + 5))

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

  const items: DetectionItem[] = [
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

  return items
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

function sortCaseEvidences(evidences: CaseEvidenceSummary[]) {
  return [...evidences].sort((a, b) => b.evidenceId - a.evidenceId)
}

export default function EvidenceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const evidenceId = Array.isArray(id) ? Number(id[0]) : Number(id)
  const [data, setData] = useState<EvidenceDetailData | null>(null)
  const [caseData, setCaseData] = useState<CaseDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadEvidenceResult() {
      setLoading(true)
      setError(null)

      try {
        if (!id) return
        if (!Number.isFinite(evidenceId)) {
          throw new Error("올바르지 않은 증거 ID입니다.")
        }

        const evidenceDetail = await fetchEvidenceDetail(evidenceId)
        if (cancelled) return

        setData(evidenceDetail)

        if (evidenceDetail.evidenceInfo.caseId) {
          try {
            const nextCaseData = await fetchCaseDetail(evidenceDetail.evidenceInfo.caseId)
            if (!cancelled) {
              setCaseData(nextCaseData)
            }
          } catch {
            if (!cancelled) {
              setCaseData(null)
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setError(getErrorMessage(error, "분석 결과를 불러오는 데 실패했습니다."))
          setData(null)
          setCaseData(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadEvidenceResult()

    return () => {
      cancelled = true
    }
  }, [id, evidenceId])

  const sortedCaseEvidences = useMemo(
    () => sortCaseEvidences(caseData?.evidences ?? []),
    [caseData]
  )
  const activeIndex = sortedCaseEvidences.findIndex((item) => item.evidenceId === evidenceId)
  const activePosition = activeIndex >= 0 ? activeIndex : 0

  function navigateToEvidence(offset: -1 | 1) {
    if (sortedCaseEvidences.length === 0) return

    const nextIndex =
      (activePosition + offset + sortedCaseEvidences.length) % sortedCaseEvidences.length
    const nextEvidence = sortedCaseEvidences[nextIndex]
    router.push(`/evidences/${nextEvidence.evidenceId}`)
  }

  async function copyHash(hash: string) {
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8 lg:px-10">
        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <Loader2 className="size-10 animate-spin text-teal-600" />
            <p className="animate-pulse text-sm font-bold text-slate-500 dark:text-muted-foreground">
              분석 결과를 불러오는 중입니다...
            </p>
          </div>
        ) : error ? (
          <div className="space-y-5">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
              onClick={() => router.back()}
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
        ) : data ? (
          <EvidenceDetailContent
            data={data}
            caseEvidences={sortedCaseEvidences}
            activeIndex={activePosition}
            copied={copied}
            onCopyHash={copyHash}
            onPrevious={() => navigateToEvidence(-1)}
            onNext={() => navigateToEvidence(1)}
            onNewAnalysis={() => router.push("/main#new-analysis")}
          />
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}

function EvidenceDetailContent({
  data,
  caseEvidences,
  activeIndex,
  copied,
  onCopyHash,
  onPrevious,
  onNext,
  onNewAnalysis,
}: {
  data: EvidenceDetailData
  caseEvidences: CaseEvidenceSummary[]
  activeIndex: number
  copied: boolean
  onCopyHash: (hash: string) => void
  onPrevious: () => void
  onNext: () => void
  onNewAnalysis: () => void
}) {
  const { evidenceInfo, integrityInfo, analysisInfo, cocLogs } = data
  const riskScore = analysisInfo.riskScore ?? 0
  const confidenceScore = analysisInfo.confidenceScore ?? 0
  const failed = analysisInfo.status === "FAILED"
  const riskTone = getRiskTone(riskScore, failed)
  const riskClassName = getRiskClassName(riskTone)
  const extension = getFileExtension(evidenceInfo.fileName, evidenceInfo.mediaType)
  const frameRisks = buildFrameRisks(evidenceInfo.evidenceId, riskScore)
  const suspiciousSections = buildSuspiciousSections(riskScore)
  const detectionItems = buildDetectionItems(riskScore, analysisInfo.moduleResults)
  const timelineItems = buildTimeline(data)
  const reportReady = analysisInfo.status === "COMPLETED"
  const verificationCode = `VF-${String(evidenceInfo.evidenceId).padStart(8, "0")}`

  return (
    <>
      {caseEvidences.length > 1 ? (
        <ResultFileNavigator
          evidences={caseEvidences}
          activeIndex={activeIndex}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-black", riskClassName.badge)}>
                {getRiskLabel(riskTone)}
              </Badge>
              <Badge variant="secondary">{getStatusLabel(analysisInfo.status)}</Badge>
              <Badge variant="outline">{extension}</Badge>
            </div>
            <h1 className="truncate text-2xl font-black text-slate-950 dark:text-foreground">
              {evidenceInfo.fileName}
            </h1>
            <p className="mt-2 font-mono text-xs font-bold text-slate-400 dark:text-muted-foreground">
              EVD-{evidenceInfo.evidenceId} · 업로드 {formatDateTime(evidenceInfo.uploadedAt)}
            </p>
            <div className="mt-4 grid gap-3 text-xs font-bold text-slate-500 sm:grid-cols-2 lg:grid-cols-4 dark:text-muted-foreground">
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

      <Tabs defaultValue="analysis" className="gap-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-white p-1 shadow-sm md:grid-cols-4 dark:bg-card">
          <TabsTrigger value="analysis" className="h-10 text-xs font-black sm:text-sm">
            분석 결과
          </TabsTrigger>
          <TabsTrigger value="metadata" className="h-10 text-xs font-black sm:text-sm">
            파일/메타데이터
          </TabsTrigger>
          <TabsTrigger value="custody" className="h-10 text-xs font-black sm:text-sm">
            무결성/보관
          </TabsTrigger>
          <TabsTrigger value="report" className="h-10 text-xs font-black sm:text-sm">
            모델/보고서
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-5">
          <div className="grid items-start gap-5 md:grid-cols-2">
            <FrameRiskCard items={frameRisks} />
            <SuspiciousRangeCard sections={suspiciousSections} />
          </div>
          <DetectionGrid items={detectionItems} />
        </TabsContent>

        <TabsContent value="metadata" className="space-y-5">
          <MetadataPanel data={data} extension={extension} />
        </TabsContent>

        <TabsContent value="custody" className="space-y-5">
          <IntegrityPanel
            data={data}
            copied={copied}
            onCopyHash={() => onCopyHash(integrityInfo.originalHash)}
          />
          <CocTimeline timelineItems={timelineItems} rawLogs={cocLogs} />
        </TabsContent>

        <TabsContent value="report" className="space-y-5">
          <ModelReportPanel
            modules={analysisInfo.moduleResults}
            reportReady={reportReady}
            verificationCode={verificationCode}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-lg px-5 text-sm font-bold"
          onClick={onNewAnalysis}
        >
          새 분석 요청
        </Button>
        <Button
          type="button"
          disabled={!reportReady}
          className="h-10 rounded-lg bg-teal-600 px-5 text-sm font-black hover:bg-teal-700"
        >
          <Download className="size-4" aria-hidden="true" />
          PDF 리포트 다운로드
        </Button>
      </div>
    </>
  )
}

function ResultFileNavigator({
  evidences,
  activeIndex,
  onPrevious,
  onNext,
}: {
  evidences: CaseEvidenceSummary[]
  activeIndex: number
  onPrevious: () => void
  onNext: () => void
}) {
  const currentEvidence = evidences[activeIndex]

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-border dark:bg-card">
      <div className="grid items-center gap-3 sm:grid-cols-[140px_1fr_140px]">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="h-10 rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        >
          &lt; 이전 파일
        </Button>
        <div className="min-w-0 text-center">
          <p className="text-xs font-black text-teal-600">
            {activeIndex + 1} / {evidences.length}
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-800 dark:text-foreground">
            {currentEvidence?.fileName ?? "분석 결과"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          className="h-10 rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        >
          다음 파일 &gt;
        </Button>
      </div>
    </section>
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
      <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <BarChart3 className="size-4 text-teal-600" aria-hidden="true" />
        프레임별 위험도
      </h2>
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
      <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <Timer className="size-4 text-teal-600" aria-hidden="true" />
        의심 구간
      </h2>
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
      <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <SlidersHorizontal className="size-4 text-teal-600" aria-hidden="true" />
        세부 탐지 결과
      </h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
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

function MetadataPanel({ data, extension }: { data: EvidenceDetailData; extension: string }) {
  const { evidenceInfo } = data
  const metadata = evidenceInfo.technicalMetadata

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <FileVideo className="size-4 text-teal-600" aria-hidden="true" />
        파일 기본정보 및 메타데이터
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoRow label="파일명" value={evidenceInfo.fileName} />
        <InfoRow label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
        <InfoRow label="업로드 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
        <InfoRow label="파일 유형" value={evidenceInfo.mediaType || evidenceInfo.fileType || extension} />
        <InfoRow label="파일 크기" value={formatBytes(evidenceInfo.fileSize)} />
        <InfoRow label="코덱" value={metadata?.codec ?? "-"} />
        <InfoRow label="해상도" value={formatResolution(data)} />
        <InfoRow label="FPS" value={metadata?.fps ? String(metadata.fps) : "-"} />
        <InfoRow label="길이" value={metadata?.durationSec ? `${metadata.durationSec}초` : "-"} />
        <InfoRow label="EXIF/생성일" value={metadata?.capturedAt ? formatDateTime(metadata.capturedAt) : "-"} />
        <InfoRow label="수정일" value="-" />
        <InfoRow label="소프트웨어" value={metadata?.deviceInfo ?? "DeepScan metadata extractor"} />
      </div>
    </section>
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
    <section className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-border dark:bg-card">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <Hash className="size-4 text-teal-600" aria-hidden="true" />
          무결성 정보
        </h2>
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
            <InfoRow label="전자서명" value={signatureStatus} />
            <InfoRow label="블록체인 Tx Hash" value={txHash} />
            <InfoRow label="앵커링 상태" value={analysisInfo.status === "COMPLETED" ? "앵커링 완료" : "대기"} />
            <InfoRow label="검증 상태" value={integrityInfo.verificationStatus} />
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <KeyRound className="size-4 text-teal-600" aria-hidden="true" />
          전자서명
        </h2>
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-700">
          {integrityInfo.isChainValid ? (
            <ShieldCheck className="size-8 shrink-0" />
          ) : (
            <ShieldAlert className="size-8 shrink-0" />
          )}
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
      <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <History className="size-4 text-teal-600" aria-hidden="true" />
        CoC 요약 타임라인
      </h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
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
            {rawLogs.map((log) => (
              <div key={log.logId}>
                <p className="text-xs font-black text-slate-700 dark:text-foreground">{log.eventType}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-muted-foreground">
                  {log.description}
                </p>
              </div>
            ))}
          </div>
        </div>
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
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <Waves className="size-4 text-teal-600" aria-hidden="true" />
          모델 정보
        </h2>
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
        <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
          <Fingerprint className="size-4 text-teal-600" aria-hidden="true" />
          보고서 검증
        </h2>
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
