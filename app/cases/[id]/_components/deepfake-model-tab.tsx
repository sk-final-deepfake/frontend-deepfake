import { BarChart3, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatModuleDetailsText, getAnalysisEvidenceMessage, resolveModelLabel } from "@/lib/analysis-display"
import type { EvidenceDetailData, ModuleResult } from "@/lib/api/evidence-detail"
import { cn } from "@/lib/utils"

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

type DeepfakeModelTabProps = {
  data: EvidenceDetailData
  riskLabel: string
  riskBadgeClassName: string
}

export function DeepfakeModelTab({
  data,
  riskLabel,
  riskBadgeClassName,
}: DeepfakeModelTabProps) {
  const { analysisInfo } = data
  const modules = analysisInfo.moduleResults
  const evidenceMessage = getAnalysisEvidenceMessage(analysisInfo.status)
  const modelLabel = resolveModelLabel(analysisInfo.summary ?? "")
  const confidence = formatScorePercent(analysisInfo.confidenceScore)

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <BarChart3 className="size-5 text-teal-600" />
            모델 탐지 결과
          </h3>
          <Badge variant="outline" className={cn("w-fit rounded-full px-4 font-black", riskBadgeClassName)}>
            {riskLabel}
          </Badge>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {modules.length > 0 ? (
            modules.map((module) => (
              <ModelResultCard key={module.moduleName} module={module} />
            ))
          ) : (
            <AnalysisEvidenceEmptyState message={evidenceMessage} className="lg:col-span-3" />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">프레임별 위험도</h3>
        <AnalysisEvidenceEmptyState message={evidenceMessage} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">의심 구간</h3>
        <AnalysisEvidenceEmptyState message={evidenceMessage} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">탐지 근거 상세</h3>
        <AnalysisEvidenceEmptyState message={evidenceMessage} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">정상 · 의심 구간 비교</h3>
        <AnalysisEvidenceEmptyState message={evidenceMessage} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">모델 정보</h3>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-muted/30">
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">모델</span>
            <span className="font-bold text-slate-800 dark:text-foreground">{modelLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-muted/30">
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">버전</span>
            <span className="font-bold text-slate-800 dark:text-foreground">
              {/xception/i.test(analysisInfo.summary ?? "") ? "v1.0.0" : "test"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-muted/30">
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">신뢰도</span>
            <span className="font-bold text-teal-600 dark:text-teal-300">
              {confidence == null ? "-" : `${confidence}%`}
            </span>
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
          {modules.length === 0 ? (
            <div className="border-t border-slate-200 px-4 py-6 text-center text-sm font-bold text-slate-400 dark:border-border dark:text-muted-foreground">
              {evidenceMessage}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function AnalysisEvidenceEmptyState({
  message,
  className,
}: {
  message: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-border dark:bg-muted/30",
        className
      )}
    >
      <p className="text-sm font-black text-slate-600 dark:text-foreground">{message}</p>
      <p className="mt-1 text-xs font-bold text-slate-400 dark:text-muted-foreground">
        백엔드에서 프레임 점수, 의심 구간, 탐지 근거가 제공되면 이 영역에 표시됩니다.
      </p>
    </div>
  )
}

function scoreTone(score: number) {
  if (score >= 70) return { text: "text-red-500 dark:text-red-400", bar: "bg-red-500", hex: "#ef4444" }
  if (score >= 40) return { text: "text-orange-500 dark:text-orange-400", bar: "bg-orange-500", hex: "#f97316" }
  return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", hex: "#10b981" }
}

function formatScorePercent(score: number | null) {
  if (score == null) return null
  const normalized = score > 0 && score <= 1 ? score * 100 : score
  return Math.round(normalized)
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

function ModelResultCard({ module }: { module: ModuleResult }) {
  const score = Math.round(module.score * 100)
  const suspicious = module.detected || score >= 55
  const detailText = formatModuleDetailsText(module.details) ?? module.details

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
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-muted-foreground">{detailText}</p>
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
