import { AlertCircle, CheckCircle2, ClipboardCheck, FileBadge, FileText, LockKeyhole, Play, Star, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime, formatDuration, formatFileSize as formatBytes } from "@/lib/formatters"
import { cn } from "@/lib/utils"

import { SummaryMetaItem } from "./summary-meta-item"

type EvidenceSummaryCardProps = {
  data: EvidenceDetailData
  extension: string
  riskLabel: string
  statusLabel: string
  riskBadgeClassName: string
  riskTextClassName: string
  progressBarClassName: string
}

export function EvidenceSummaryCard({
  data,
  extension,
  riskLabel,
  statusLabel,
  riskBadgeClassName,
  riskTextClassName,
  progressBarClassName,
}: EvidenceSummaryCardProps) {
  const { evidenceInfo, analysisInfo } = data
  const { technicalMetadata } = evidenceInfo
  const riskScore = formatScore(analysisInfo.riskScore)
  const confidenceScore = formatScore(analysisInfo.confidenceScore)
  const progressValue = getProgressValue(analysisInfo.status)
  const resolution = technicalMetadata.width && technicalMetadata.height
    ? `${technicalMetadata.width} × ${technicalMetadata.height}`
    : "-"
  const duration = formatDuration(technicalMetadata.durationSec)

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("rounded-full px-4 font-black", riskBadgeClassName)}>
              {riskLabel}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-4 font-black">
              {statusLabel}
            </Badge>
            <Badge variant="outline" className="rounded-full px-4 font-black">
              {extension}
            </Badge>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-2xl font-black tracking-normal text-foreground sm:text-3xl">
              {evidenceInfo.fileName}
            </h2>
            <Star className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>

          <div className="mt-4 grid overflow-hidden rounded-lg border border-border bg-muted/20 sm:grid-cols-2 2xl:grid-cols-3">
            <SummaryMetaItem icon={LockKeyhole} label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
            <SummaryMetaItem icon={ClipboardCheck} label="업로드 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
            <SummaryMetaItem icon={FileBadge} label="파일 유형" value={evidenceInfo.mediaType || "VIDEO"} />
            <SummaryMetaItem icon={FileText} label="파일 크기" value={formatBytes(evidenceInfo.fileSize)} />
            <SummaryMetaItem icon={Video} label="해상도" value={resolution} />
            <SummaryMetaItem icon={Play} label="재생 시간" value={duration} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <MetricCard
            label="최종 위험도"
            value={riskScore ?? "-"}
            suffix={riskScore == null ? "" : "/ 100"}
            badge={riskScore == null ? "분석 대기" : riskLabel}
            valueClassName={riskTextClassName}
          />
          <MetricCard
            label="신뢰도"
            value={confidenceScore ?? "-"}
            suffix={confidenceScore == null ? "" : "%"}
            badge={confidenceScore == null ? "분석 대기" : "높음"}
            valueClassName={confidenceScore == null ? "text-muted-foreground" : "text-emerald-600"}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", progressBarClassName)}
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-black text-teal-600">
          {statusLabel}
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </span>
      </div>

      {analysisInfo.status === "FAILED" ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-black">실패 사유</p>
              <p className="mt-1 leading-5">{analysisInfo.summary || "분석 처리 중 오류가 발생했습니다."}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function MetricCard({
  label,
  value,
  suffix,
  badge,
  valueClassName,
}: {
  label: string
  value: string
  suffix: string
  badge: string
  valueClassName: string
}) {
  return (
    <div className="flex min-h-[148px] flex-col items-center justify-center rounded-lg border border-border bg-background/40 px-4 py-5 text-center">
      <p className="text-sm font-black text-muted-foreground">{label}</p>
      <div className="mt-4 flex items-end justify-center gap-1">
        <span className={cn("text-5xl font-black leading-none", valueClassName)}>{value}</span>
        {suffix ? (
          <span className="pb-1 text-lg font-black text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      <span className="mt-4 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
        {badge}
      </span>
    </div>
  )
}

function getProgressValue(status: EvidenceDetailData["analysisInfo"]["status"]) {
  if (status === "COMPLETED") return 88
  if (status === "PROCESSING") return 62
  if (status === "FAILED") return 100
  return 18
}

function formatScore(score: number | null) {
  if (score == null) return null
  const normalized = score > 0 && score <= 1 ? score * 100 : score
  return String(Math.round(normalized))
}
