"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Maximize2,
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

type ViewMode = "original" | "overlay" | "heatmap"

const THRESHOLD = 0.72

export function DeepfakeV2Tab({ data }: DeepfakeV2TabProps) {
  const { evidenceInfo, analysisInfo } = data
  const metadata = evidenceInfo.technicalMetadata

  // 실데이터에서 가져올 수 있는 값은 derive, 없는 부분은 데모용 mock.
  const modelScore = getPrimaryModelScore(analysisInfo.moduleResults) ?? 0.82
  const confidence = normalizePercent(analysisInfo.confidenceScore) ?? 94
  const quality = Math.min(100, confidence + 1)
  const duration = formatDuration(metadata.durationSec)
  const verdict = getVerdict(modelScore)
  const summary =
    analysisInfo.summary?.trim() ||
    "해당 구간에서 얼굴 경계의 비자연스러운 경계선, 피부 질감의 불일치, 조명 반응의 불균일성, 시간축 일관성 저하가 복합적으로 감지되었습니다. 특히 00:09~00:18 구간은 연속된 프레임에서 높은 점수가 지속되어 조작 의심이 높습니다."

  return (
    <div className="space-y-4">
      <SummaryCards verdict={verdict} modelScore={modelScore} confidence={confidence} quality={quality} />

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <ModelInfoSidebar />

        <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <VideoPlayerCard duration={duration} />
          <FrameRiskGraph score={modelScore} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <RepresentativeFrames />
        <PerItemScores modules={analysisInfo.moduleResults} />
      </div>

      <ReasoningNote summary={summary} />
    </div>
  )
}

function VideoPlayerCard({ duration }: { duration: string }) {
  const [view, setView] = useState<ViewMode>("original")

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
        {/* 베이스 영상(플레이스홀더) */}
        <div className="absolute inset-0 bg-[linear-gradient(105deg,#1f2937_0%,#334155_30%,#475569_55%,#1e293b_100%)]" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />

        {/* 오버레이: 의심 영역 박스 */}
        {view === "overlay" ? (
          <div className="absolute left-[46%] top-[24%] h-[40%] w-[14%] rounded border-2 border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
        ) : null}

        {/* 히트맵 */}
        {view === "heatmap" ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_42%,rgba(239,68,68,0.85)_0%,rgba(249,115,22,0.5)_18%,rgba(37,99,235,0.35)_40%,transparent_62%)] mix-blend-screen" />
        ) : null}

        {/* 보기 전환 토글 (상단 오른쪽) */}
        <div className="absolute right-3 top-3 flex rounded-full bg-black/45 p-1 backdrop-blur-sm">
          {(
            [
              ["original", "원본"],
              ["overlay", "오버레이"],
              ["heatmap", "히트맵"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                view === mode ? "bg-teal-500 text-white" : "text-white/80 hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 촬영 시각 / 카메라 ID */}
        <div className="absolute left-4 top-4 rounded bg-black/55 px-2 py-1 text-xs font-semibold text-white">
          2026-06-15 02:31:45
        </div>
        <div className="absolute bottom-14 left-4 text-sm font-black tracking-wide text-white">CAM01</div>

        {/* 하단 컨트롤 */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/30">
            <div className="h-full w-[40%] rounded-full bg-teal-400" />
          </div>
          <div className="mt-2 flex items-center gap-3 text-white">
            <Play className="size-4 fill-current" aria-hidden="true" />
            <Pause className="size-4" aria-hidden="true" />
            <span className="text-xs font-semibold">00:12 / {duration === "-" ? "00:03.000" : duration}</span>
            <Volume2 className="ml-auto size-4" aria-hidden="true" />
            <span className="text-xs font-semibold">1.0x</span>
            <Maximize2 className="size-4" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}

function SummaryCards({
  verdict,
  modelScore,
  confidence,
  quality,
}: {
  verdict: { label: string; tone: Tone }
  modelScore: number
  confidence: number
  quality: number
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SummaryCard title="자동 탐지 결과" value={verdict.label} tone={verdict.tone} icon />
      <SummaryCard title="모델 점수" value={modelScore.toFixed(2)} sub="0~1 (높을수록 의심 ↑)" tone={toneByScore(modelScore)} emphasize />
      <SummaryCard title="판정 임계값" value={THRESHOLD.toFixed(2)} sub="기준값 초과 시 의심" tone="neutral" />
      <SummaryCard title="분석 신뢰도" value={`${confidence}%`} tone="teal" />
      <SummaryCard title="품질 점수" value={`${quality} / 100`} tone="blue" />
    </div>
  )
}

function SummaryCard({
  title,
  value,
  sub,
  tone,
  icon,
  emphasize,
}: {
  title: string
  value: string
  sub?: string
  tone: Tone
  icon?: boolean
  emphasize?: boolean
}) {
  return (
    <section
      className={cn(
        "flex min-h-[148px] flex-col items-center justify-center rounded-xl border bg-card p-4 text-center shadow-sm",
        emphasize ? "border-red-200 dark:border-red-900/50" : "border-border"
      )}
    >
      <p className="flex items-center justify-center gap-1 text-xs font-bold text-muted-foreground">
        {title}
        <Info className="size-3 text-muted-foreground/60" aria-hidden="true" />
      </p>
      <p className={cn("mt-3 flex items-center justify-center gap-1 font-black", TONE_TEXT[tone], icon ? "text-xl" : "text-[2rem] leading-none")}>
        {icon ? <AlertTriangle className="size-5 shrink-0" aria-hidden="true" /> : null}
        {value}
      </p>
      {sub ? <p className="mt-2 text-[11px] font-semibold text-muted-foreground">{sub}</p> : null}
    </section>
  )
}

function FrameRiskGraph({ score }: { score: number }) {
  const bars = buildRiskBars(score)

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-foreground">프레임별 위험도 그래프</h3>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <LegendDot className="bg-teal-500" label="낮음 (0~0.3)" />
          <LegendDot className="bg-amber-400" label="보통 (0.3~0.6)" />
          <LegendDot className="bg-red-500" label="높음 (0.6~1.0)" />
          <LegendDot className="bg-slate-300" label="분석 불가" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[30px_minmax(0,1fr)] gap-2">
        <div className="flex h-40 flex-col justify-between pt-1 text-[11px] font-medium text-muted-foreground">
          <span>1.0</span>
          <span>0.5</span>
          <span>0</span>
        </div>
        <div className="relative h-40">
          <div className="absolute inset-x-0 top-[28%] border-t border-dashed border-red-400">
            <span className="absolute -top-4 right-0 text-[11px] font-bold text-red-500">임계값 0.72</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-[3px]">
            {bars.map((bar, index) => (
              <span
                key={index}
                className={cn("flex-1", bar.className)}
                style={{ height: `${bar.height}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="ml-[38px] mt-2 grid grid-cols-6 text-[11px] font-medium text-muted-foreground">
        <span>00:00</span>
        <span>00:05</span>
        <span>00:10</span>
        <span>00:15</span>
        <span>00:20</span>
        <span className="text-right">00:30</span>
      </div>
    </section>
  )
}

function ReasoningNote({ summary }: { summary: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-base font-black text-foreground">
        판정 임계값
        <Info className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
        <span className="text-muted-foreground">/ 탐지 근거 설명</span>
      </h3>
      <p className="mt-4 text-sm font-medium leading-7 text-muted-foreground">{summary}</p>
      <button
        type="button"
        className="mt-5 h-10 w-full rounded-md border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40"
      >
        자세히 보기
      </button>
    </section>
  )
}

function RepresentativeFrames() {
  const frames = [
    { time: "00:12.240", frame: "프레임 367", score: "0.98" },
    { time: "00:13.080", frame: "프레임 389", score: "0.97" },
    { time: "00:14.320", frame: "프레임 427", score: "0.96" },
    { time: "00:16.880", frame: "프레임 499", score: "0.93" },
  ]

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-black text-foreground">대표 프레임 <span className="text-sm font-semibold text-muted-foreground">(의심 구간)</span></h3>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">모델 점수가 높았던 주요 의심 프레임입니다.</p>
      <div className="mt-4 flex items-center gap-2">
        <ChevronLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {frames.map((frame) => (
            <article key={frame.time} className="min-w-0 rounded-lg border border-border bg-background/40 p-2">
              <p className="truncate text-[11px] font-semibold text-muted-foreground">
                {frame.time} <span className="text-muted-foreground/70">({frame.frame})</span>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="aspect-square rounded-md bg-[linear-gradient(135deg,#1e293b,#64748b_55%,#0f172a)]" />
                <div className="aspect-square rounded-md bg-[radial-gradient(circle_at_50%_44%,#ef4444_0%,#f97316_22%,#1e40af_60%,#312e81_100%)]" />
              </div>
              <p className="mt-2 text-xs font-bold text-foreground">점수 {frame.score}</p>
            </article>
          ))}
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <button
        type="button"
        className="mx-auto mt-4 flex h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
      >
        전체 프레임 보기
      </button>
    </section>
  )
}

function PerItemScores({ modules }: { modules: ModuleResult[] }) {
  const rows = buildScoreRows(modules)

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-base font-black text-foreground">
        탐지 항목별 점수
        <Info className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
      </h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 text-xs">
            <span className="font-medium text-muted-foreground">{row.label}</span>
            <div className="h-2 rounded-full bg-muted">
              <div className={cn("h-full rounded-full", TONE_BAR[row.tone])} style={{ width: `${row.value * 100}%` }} />
            </div>
            <span className="flex items-center justify-end gap-2">
              <span className="font-bold text-foreground">{row.value.toFixed(2)}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE_BADGE[row.tone])}>{row.level}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ModelInfoSidebar() {
  const rows: Array<[string, string]> = [
    ["분석 모델", "DeepScan Video"],
    ["모델 버전", "v2.4.1"],
    ["모델 유형", "Video Deepfake Detection"],
    ["입력 해상도", "224 × 224"],
    ["분석 프레임 수", "936"],
    ["유효 프레임 수", "902"],
    ["얼굴 검출 프레임 수", "888"],
    ["프레임 추출 간격", "5프레임"],
    ["처리 시간", "2분 12초"],
    ["판정 임계값", THRESHOLD.toFixed(2)],
  ]

  return (
    <section className="rounded-lg border border-border bg-background/40 p-4">
      <h3 className="text-base font-black text-foreground">딥페이크 모델 분석 정보</h3>
      <dl className="mt-3 grid gap-x-5 md:grid-cols-2 xl:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-2.5">
            <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-right text-xs font-bold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
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

// ---- tone helpers ----
type Tone = "red" | "amber" | "teal" | "blue" | "neutral"

const TONE_TEXT: Record<Tone, string> = {
  red: "text-red-500",
  amber: "text-amber-500",
  teal: "text-teal-600 dark:text-teal-400",
  blue: "text-blue-600 dark:text-blue-400",
  neutral: "text-foreground",
}

const TONE_BAR: Record<Tone, string> = {
  red: "bg-red-500",
  amber: "bg-amber-400",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  neutral: "bg-slate-400",
}

const TONE_BADGE: Record<Tone, string> = {
  red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300",
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300",
  neutral: "bg-muted text-muted-foreground",
}

function getVerdict(score: number): { label: string; tone: Tone } {
  if (score >= 0.7) return { label: "조작 의심 높음", tone: "red" }
  if (score >= 0.4) return { label: "조작 의심 보통", tone: "amber" }
  return { label: "정상", tone: "teal" }
}

function toneByScore(score: number): Tone {
  if (score >= 0.6) return "red"
  if (score >= 0.3) return "amber"
  return "teal"
}

function levelByScore(score: number): { level: string; tone: Tone } {
  if (score >= 0.6) return { level: "높음", tone: "red" }
  if (score >= 0.3) return { level: "보통", tone: "amber" }
  return { level: "낮음", tone: "teal" }
}

function buildRiskBars(score: number) {
  const peak = Math.max(0.5, score)
  return Array.from({ length: 36 }).map((_, index) => {
    const center = 13 // 00:09~00:18 구간(약 13번째 막대)에 집중
    const distance = Math.abs(index - center)
    const base = Math.max(0.1, peak - distance * 0.05)
    const height = Math.min(96, Math.max(10, base * 100))
    const className = base >= 0.6 ? "bg-red-500" : base >= 0.3 ? "bg-amber-400" : "bg-teal-500"
    return { height, className }
  })
}

function buildScoreRows(modules: ModuleResult[]) {
  const scores = modules.map((item) => normalizeProbability(item.score))
  // 스펙 항목 + 실데이터 있으면 우선 사용
  const defaults: Array<{ label: string; value: number }> = [
    { label: "얼굴 경계 불연속", value: scores[0] ?? 0.99 },
    { label: "시간축 일관성 저하", value: scores[1] ?? 0.74 },
    { label: "압축 아티팩트", value: scores[2] ?? 0.61 },
    { label: "조명·색상 불일치", value: scores[3] ?? 0.35 },
    { label: "오디오·립싱크 불일치", value: scores[4] ?? 0.08 },
    { label: "메타데이터 기반 이상", value: scores[5] ?? 0.03 },
  ]
  return defaults.map((row) => ({ ...row, ...levelByScore(row.value) }))
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
