import {
  ChevronLeft,
  ChevronRight,
  Expand,
  FileVideo,
  Info,
  Pause,
  Play,
  Volume2,
} from "lucide-react"

import type { EvidenceDetailData, ModuleResult } from "@/lib/api/evidence-detail"
import { formatDuration } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type DeepfakeV2TabProps = {
  data: EvidenceDetailData
}

export function DeepfakeV2Tab({ data }: DeepfakeV2TabProps) {
  const { evidenceInfo, analysisInfo } = data
  const metadata = evidenceInfo.technicalMetadata
  const duration = formatDuration(metadata.durationSec)
  const modelScore = getPrimaryModelScore(analysisInfo.moduleResults)
  const confidence = normalizePercent(analysisInfo.confidenceScore)
  const summary = analysisInfo.summary || "현재 표시할 상세 탐지 근거가 없습니다."

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <FileVideo className="size-4 text-blue-500" aria-hidden="true" />
          영상 딥페이크 탐지
        </h2>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)]">
          <FaceVideoPanel fileName={evidenceInfo.fileName} duration={duration} />
          <OverallFrameRiskPanel score={modelScore} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <SuspiciousRangePanel score={modelScore} />
          <DetectionScorePanel modules={analysisInfo.moduleResults} confidence={confidence} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <RepresentativeFrames score={modelScore} />
        <DetectionEvidenceNote summary={summary} />
      </section>
    </div>
  )
}

function FaceVideoPanel({ fileName, duration }: { fileName: string; duration: string }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">영상 플레이어</h3>
        <div className="flex rounded-full bg-muted/50 p-1">
          {["원본", "오버레이", "히트맵"].map((label, index) => (
            <span
              key={label}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                index === 1 ? "bg-blue-500 text-white" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,#f3d4c7_0_11%,transparent_12%),linear-gradient(90deg,#0f172a_0%,#1e293b_23%,#334155_47%,#111827_100%)]" />
        <div className="absolute left-[40%] top-[22%] h-[28%] w-[19%] rounded-full bg-[#f1d0c5]" />
        <div className="absolute left-[37%] top-[18%] h-[40%] w-[25%] rounded-t-full bg-slate-900/85" />
        <div className="absolute left-[38%] top-[57%] h-[32%] w-[23%] rounded-t-3xl bg-slate-200/85" />
        <div className="absolute left-[38%] top-[22%] h-[30%] w-[24%] border-2 border-red-500" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute left-4 top-4 rounded bg-black/65 px-2 py-1 text-xs font-semibold text-white">
          {fileName}
        </div>
        <div className="absolute bottom-8 left-4 right-4 h-1 rounded-full bg-white/55">
          <div className="h-full w-1/3 rounded-full bg-red-500" />
        </div>
        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3 text-white">
          <Play className="size-4 fill-current" aria-hidden="true" />
          <Volume2 className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold">00:12.340 / {duration === "-" ? "00:31.240" : duration}</span>
          <span className="ml-auto text-xs font-semibold">1.0x</span>
          <Expand className="size-4" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}

function OverallFrameRiskPanel({ score }: { score: number | null }) {
  const bars = buildRiskBars(score)

  return (
    <section className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          전체 구간 위험도 (프레임 단위)
          <Info className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </h3>
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="text-red-500">--- 임계값 0.72</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[34px_minmax(0,1fr)] gap-3">
        <div className="flex h-44 flex-col justify-between pt-1 text-[11px] font-medium text-muted-foreground">
          <span>1.0</span>
          <span>0.5</span>
          <span>0</span>
        </div>
        <div className="relative h-44">
          <div className="absolute inset-x-0 top-[28%] border-t border-dashed border-red-300" />
          <div className="absolute inset-x-0 top-0 h-px bg-border" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
          <div className="absolute inset-x-2 bottom-0 flex h-40 items-end gap-1">
            {bars.map((bar, index) => (
              <span
                key={index}
                className={cn("flex-1 rounded-t-sm", bar.className)}
                style={{ height: `${bar.height}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="ml-[46px] mt-2 grid grid-cols-6 text-[11px] font-medium text-muted-foreground">
        <span>00:00</span>
        <span>00:06</span>
        <span>00:12</span>
        <span>00:18</span>
        <span>00:24</span>
        <span className="text-right">03:30</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
        <LegendDot className="bg-teal-500" label="낮음 (0~0.4)" />
        <LegendDot className="bg-amber-400" label="보통 (0.4~0.7)" />
        <LegendDot className="bg-red-500" label="높음 (0.7~1.0)" />
        <LegendDot className="bg-slate-300" label="분석 불가" />
      </div>
    </section>
  )
}

function SuspiciousRangePanel({ score }: { score: number | null }) {
  const severe = score != null && score >= 0.72

  return (
    <section className="rounded-lg border border-border bg-background/40 p-4">
      <h3 className="text-sm font-semibold text-foreground">주요 의심 구간</h3>
      <div className="mt-4 space-y-3 text-xs font-medium">
        <RangeRow active label={severe ? "최대 위험 구간" : "관찰 구간"} time="00:09.240 ~ 00:18.080" detail="지속 시간 8.840s | 평균 점수 0.94 | 최고 점수 0.98" tone="red" />
        <RangeRow label="00:03.120 ~ 00:05.600" detail="지속 시간 2.480s | 평균 점수 0.61 | 최고 점수 0.66" tone="amber" />
        <RangeRow label="00:21.320 ~ 00:22.800" detail="지속 시간 1.480s | 평균 점수 0.58 | 최고 점수 0.63" tone="amber" />
      </div>
      <button type="button" className="mx-auto mt-4 flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted/40">
        구간 전체 보기
      </button>
    </section>
  )
}

function DetectionScorePanel({ modules, confidence }: { modules: ModuleResult[]; confidence: number | null }) {
  const rows = buildScoreRows(modules, confidence)

  return (
    <section className="rounded-lg border border-border bg-background/40 p-4">
      <h3 className="text-sm font-semibold text-foreground">탐지 항목별 점수</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[120px_minmax(0,1fr)_40px] items-center gap-3 text-xs">
            <span className="font-medium text-muted-foreground">{row.label}</span>
            <div className="h-2 rounded-full bg-muted">
              <div className={cn("h-full rounded-full", row.className)} style={{ width: `${row.value * 100}%` }} />
            </div>
            <span className="text-right font-semibold text-muted-foreground">{row.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function RepresentativeFrames({ score }: { score: number | null }) {
  const frames = buildRepresentativeFrames(score)

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">대표 프레임 (의심 구간)</h3>
      <div className="mt-4 flex items-center gap-3">
        <ChevronLeft className="size-5 text-muted-foreground" aria-hidden="true" />
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-3">
          {frames.map((frame) => (
            <article key={frame.time} className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground">{frame.time}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="aspect-[4/3] rounded-md bg-[linear-gradient(135deg,#0f172a,#475569_48%,#111827)]" />
                <div className="aspect-[4/3] rounded-md bg-[radial-gradient(circle_at_50%_44%,#f97316_0_14%,#1e40af_15%,#312e81_100%)]" />
              </div>
              <p className="mt-2 text-xs font-semibold text-foreground">점수 {frame.score}</p>
            </article>
          ))}
        </div>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <button type="button" className="mx-auto mt-4 flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted/40">
        전체 프레임 보기
      </button>
    </section>
  )
}

function DetectionEvidenceNote({ summary }: { summary: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">탐지 근거 설명</h3>
      <p className="mt-4 text-sm font-medium leading-7 text-muted-foreground">{summary}</p>
      <button type="button" className="mt-6 h-10 w-full rounded-md border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40">
        자세히 보기
      </button>
    </section>
  )
}

function RangeRow({
  active,
  label,
  time,
  detail,
  tone,
}: {
  active?: boolean
  label: string
  time?: string
  detail: string
  tone: "red" | "amber"
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[86px_minmax(0,1fr)]">
      <span
        className={cn(
          "w-fit rounded-md px-2 py-1 text-xs font-semibold",
          active ? "bg-red-500 text-white" : tone === "red" ? "text-red-500" : "text-amber-500"
        )}
      >
        {label}
      </span>
      <div className="min-w-0">
        {time ? <p className="font-semibold text-muted-foreground">{time}</p> : null}
        <p className="mt-1 truncate text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} aria-hidden="true" />
      {label}
    </span>
  )
}

function buildRiskBars(score: number | null) {
  const peak = score ?? 0.74

  return Array.from({ length: 36 }).map((_, index) => {
    const center = 17
    const distance = Math.abs(index - center)
    const base = Math.max(0.12, peak - distance * 0.045)
    const height = Math.min(96, Math.max(12, base * 100))
    const className = base >= 0.7 ? "bg-red-500" : base >= 0.4 ? "bg-amber-400" : "bg-teal-500"
    return { height, className }
  })
}

function buildScoreRows(modules: ModuleResult[], confidence: number | null) {
  const scores = modules.map((item) => normalizeProbability(item.score))
  const fallback = confidence == null ? 0.74 : confidence / 100

  return [
    { label: "얼굴 경계 불연속", value: scores[0] ?? fallback, className: "bg-red-500" },
    { label: "시간축 일관성 저하", value: scores[1] ?? Math.max(0.31, fallback - 0.15), className: "bg-red-500" },
    { label: "질감 · 주파수 이상", value: scores[2] ?? Math.min(0.91, fallback - 0.03), className: "bg-amber-400" },
    { label: "조명 · 색상 불일치", value: scores[3] ?? Math.max(0.31, fallback - 0.18), className: "bg-amber-400" },
    { label: "오디오 · 립싱크 불일치", value: scores[4] ?? 0.31, className: "bg-teal-500" },
  ]
}

function buildRepresentativeFrames(score: number | null) {
  const base = score ?? 0.96

  return [
    { time: "00:12.240 (프레임 367)", score: clampScore(base + 0.01) },
    { time: "00:13.080 (프레임 389)", score: clampScore(base) },
    { time: "00:14.320 (프레임 427)", score: clampScore(base - 0.01) },
  ]
}

function getPrimaryModelScore(modules: ModuleResult[]) {
  const primary = modules.find((module) => typeof module.score === "number")
  if (!primary) return null
  return normalizeProbability(primary.score)
}

function normalizePercent(value: number | null) {
  if (value == null) return null
  return Math.round(value <= 1 ? value * 100 : value)
}

function normalizeProbability(value: number) {
  if (value > 1) return Math.min(1, value / 100)
  return Math.max(0, value)
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value)).toFixed(2)
}
