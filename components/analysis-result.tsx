"use client"

import { AlertTriangle, BarChart3, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type AnalysisResultTone = "red" | "orange" | "green"

export type FrameRiskBar = { label: string; value: number; color: string }

export type ReasonFrame = { time: string; risk: number }

export type ReasonGroup = {
  level: string
  timeRange: string
  reason: string
  score: string
  tone: string
  frames: ReasonFrame[]
}

export type AnalysisResultData = {
  fileName: string
  evidenceId: string
  uploadedAtLabel: string
  riskScore: number
  riskLabel: string
  tone: AnalysisResultTone
  frameRisks: FrameRiskBar[]
  reasonGroups: ReasonGroup[]
  integrityRows: [string, string][]
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

// 실제 프레임 데이터가 없을 때(증거 상세 등) 위험도 점수로 그럴듯한 차트를 생성한다.
export function sampleFrameRisks(seed: number, riskScore: number): FrameRiskBar[] {
  const peak = 3 + (seed % 4)
  const ceiling = Math.max(20, Math.min(99, riskScore + 5))

  return FRAME_LABELS.map((label, index) => {
    const distance = Math.abs(index - peak)
    const value = Math.max(8, ceiling - distance * 22)
    const color = value >= 85 ? "bg-red-400" : value >= 60 ? "bg-orange-400" : "bg-teal-500"
    return { label, value, color }
  })
}

export function sampleReasonGroups(isHigh: boolean): ReasonGroup[] {
  if (isHigh) {
    return [
      {
        level: "HIGH",
        timeRange: "00:09 - 00:18",
        reason: "GAN 아티팩트 / 얼굴 블렌딩 경계 감지",
        score: "94%",
        tone: "red",
        frames: [
          { time: "00:09", risk: 92 },
          { time: "00:12", risk: 98 },
          { time: "00:15", risk: 95 },
        ],
      },
    ]
  }

  return [
    {
      level: "MEDIUM",
      timeRange: "00:06 - 00:09",
      reason: "조명 불일치 (Shadow inconsistency)",
      score: "63%",
      tone: "amber",
      frames: [
        { time: "00:06", risk: 58 },
        { time: "00:07", risk: 64 },
        { time: "00:08", risk: 67 },
      ],
    },
  ]
}

// 실제 분석 결과가 없는 mock 증거(사건 상세 등)를 위해 evidenceId 기반으로
// 결과 화면 데이터를 그럴듯하게 생성한다. (분석요청 결과 화면과 동일한 무결성 항목 포함)
export function buildSampleResultData(params: {
  seed: number
  fileName: string
  evidenceCode: string
  uploadedAtLabel: string
  extension: string
}): AnalysisResultData {
  const { seed, fileName, evidenceCode, uploadedAtLabel, extension } = params
  const riskScore = ((seed * 37) % 96) + 4
  const tone: AnalysisResultTone = riskScore >= 70 ? "red" : riskScore >= 40 ? "orange" : "green"
  const riskLabel =
    riskScore >= 70
      ? "딥페이크 의심 - 위험"
      : riskScore >= 40
        ? "위변조 정황 - 주의"
        : "위변조 가능성 낮음"
  const tail = String(seed).slice(-3)

  return {
    fileName,
    evidenceId: evidenceCode,
    uploadedAtLabel,
    riskScore,
    riskLabel,
    tone,
    frameRisks: sampleFrameRisks(seed, riskScore),
    reasonGroups: tone === "green" ? [] : sampleReasonGroups(tone === "red"),
    integrityRows: [
      ["SHA-256", `a4f3b2c1d9e8f7a6...${tail}`],
      ["전자서명", "PKI · RSA-4096 적용"],
      ["WORM 저장", "S3 Object Lock"],
      ["블록체인 Tx", `0x8f3a...${tail}`],
      ["Custody Log", `LOG-2026-${String(488 + (seed % 200)).padStart(6, "0")}`],
      ["분석 모델", "DeepScan v2.4.1"],
      ["파일 형식", extension],
    ],
  }
}

function getRiskToneClass(tone: AnalysisResultTone) {
  if (tone === "green") {
    return {
      border: "border-emerald-200 dark:border-emerald-500/30",
      badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
      score: "text-emerald-600",
      bar: "bg-gradient-to-r from-emerald-300 to-emerald-500",
    }
  }

  if (tone === "orange") {
    return {
      border: "border-orange-200 dark:border-orange-500/30",
      badge: "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300",
      score: "text-orange-500",
      bar: "bg-gradient-to-r from-amber-300 to-orange-500",
    }
  }

  return {
    border: "border-red-200 dark:border-red-500/30",
    badge: "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-300",
    score: "text-red-500",
    bar: "bg-gradient-to-r from-orange-400 to-red-500",
  }
}

export function AnalysisResult({
  data,
  onReset,
}: {
  data: AnalysisResultData
  onReset?: () => void
}) {
  const riskTone = getRiskToneClass(data.tone)

  return (
    <div className="space-y-5">
      <section className={cn("rounded-xl border bg-white p-6 shadow-sm dark:bg-card", riskTone.border)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black",
                riskTone.badge
              )}
            >
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {data.riskLabel}
            </div>
            <h1 className="mt-3 text-lg font-black text-slate-950 dark:text-foreground">
              {data.fileName}
            </h1>
            <p className="mt-1 text-xs font-bold text-slate-400 dark:text-muted-foreground">
              {data.evidenceId} · 업로드 {data.uploadedAtLabel}
            </p>
          </div>
          <div className="text-right">
            <p className={cn("text-5xl font-black leading-none", riskTone.score)}>
              {data.riskScore}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-muted-foreground">
              / 100 위험도
            </p>
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
          <div
            className={cn("h-full rounded-full", riskTone.bar)}
            style={{ width: `${data.riskScore}%` }}
          />
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <FrameRiskCard items={data.frameRisks} />
        <IntegrityInfoCard rows={data.integrityRows} />
      </div>

      <EvidenceReasonCard groups={data.reasonGroups} />

      <div className="flex flex-wrap gap-3">
        {onReset ? (
          <Button
            variant="outline"
            className="h-10 rounded-lg px-5 text-sm font-bold"
            onClick={onReset}
          >
            새 분석 요청
          </Button>
        ) : null}
        <Button className="h-10 rounded-lg bg-teal-600 px-5 text-sm font-black hover:bg-teal-700">
          <Download className="size-4" aria-hidden="true" />
          PDF 리포트 다운로드
        </Button>
      </div>
    </div>
  )
}

function FrameRiskCard({ items }: { items: FrameRiskBar[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h2 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-foreground">
        <BarChart3 className="size-4 text-teal-600" aria-hidden="true" />
        프레임별 위험도
      </h2>
      <div className="mt-5 flex h-36 items-end gap-2">
        <div className="flex h-full flex-col justify-between pb-6 text-[10px] font-bold text-slate-400 dark:text-muted-foreground">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div className="flex h-full flex-1 items-end justify-between gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
              <div
                className={cn("w-full rounded-t-sm", item.color)}
                style={{ height: `${item.value}%` }}
              />
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

function IntegrityInfoCard({ rows }: { rows: [string, string][] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h2 className="text-base font-black text-slate-800 dark:text-foreground">무결성 정보</h2>
      <dl className="mt-4 divide-y divide-slate-100 dark:divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <dt className="shrink-0 text-xs font-bold text-slate-400 dark:text-muted-foreground">
              {label}
            </dt>
            <dd className="truncate text-right text-xs font-black text-slate-700 dark:text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function EvidenceReasonCard({ groups }: { groups: ReasonGroup[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <h2 className="text-base font-black text-slate-800 dark:text-foreground">탐지 근거</h2>
      {groups.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs font-medium text-slate-500 dark:border-border dark:text-muted-foreground">
          탐지된 의심 구간이 없습니다. 정상 영상으로 판정되었습니다.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {groups.map((group) => (
            <SuspiciousFrameGroup key={group.timeRange} group={group} />
          ))}
        </div>
      )}
    </section>
  )
}

function SuspiciousFrameGroup({ group }: { group: ReasonGroup }) {
  const isHigh = group.tone === "red"

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-4",
        isHigh
          ? "border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
          : "border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={cn(
              "rounded px-2 py-1 text-[10px] font-black",
              isHigh
                ? "bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-300"
                : "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
            )}
          >
            {group.level}
          </span>
          <p className="min-w-0 text-sm font-bold text-slate-700 dark:text-foreground">
            <span className="mr-2 text-xs text-slate-400 dark:text-muted-foreground">
              {group.timeRange}
            </span>
            {group.reason}
          </p>
        </div>
        <span
          className={cn("shrink-0 text-sm font-black", isHigh ? "text-red-500" : "text-orange-500")}
        >
          {group.score}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {group.frames.map((frame, index) => (
          <FrameThumbnail
            key={`${group.timeRange}-${frame.time}`}
            frame={frame}
            index={index}
            highRisk={isHigh}
          />
        ))}
      </div>
    </div>
  )
}

function FrameThumbnail({
  frame,
  index,
  highRisk,
}: {
  frame: ReasonFrame
  index: number
  highRisk: boolean
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/80 bg-white shadow-sm dark:bg-card">
      <div className="relative aspect-video bg-slate-900">
        <div
          className={cn(
            "absolute inset-0",
            index === 0 && "bg-[radial-gradient(circle_at_42%_42%,#64748b_0,#334155_23%,#0f172a_60%)]",
            index === 1 && "bg-[radial-gradient(circle_at_54%_38%,#94a3b8_0,#475569_25%,#111827_62%)]",
            index === 2 && "bg-[radial-gradient(circle_at_48%_45%,#7f1d1d_0,#334155_28%,#0f172a_64%)]"
          )}
        />
        <div
          className={cn(
            "absolute left-[33%] top-[18%] h-[54%] w-[34%] rounded-full border-2",
            highRisk ? "border-red-400" : "border-amber-400"
          )}
        />
        <div
          className={cn(
            "absolute bottom-3 left-3 right-3 h-1 rounded-full",
            highRisk ? "bg-red-400" : "bg-amber-400"
          )}
        />
        <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-[10px] font-black text-white">
          {frame.time}
        </span>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground">
          대표 프레임
        </span>
        <span className={cn("text-xs font-black", highRisk ? "text-red-500" : "text-orange-500")}>
          {frame.risk}%
        </span>
      </div>
    </div>
  )
}
