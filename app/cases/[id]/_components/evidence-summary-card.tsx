import { AlertCircle, ClipboardCheck, FileBadge, FileText, LockKeyhole, Play, Star, Video } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime, formatDuration, formatFileSize as formatBytes } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type EvidenceSummaryCardProps = {
  data: EvidenceDetailData
  extension: string
  riskLabel: string
  statusLabel: string
  riskBadgeClassName: string
  riskTextClassName: string
}

export function EvidenceSummaryCard({
  data,
  extension,
  riskLabel,
  statusLabel,
  riskBadgeClassName,
  riskTextClassName,
}: EvidenceSummaryCardProps) {
  const { evidenceInfo, analysisInfo } = data
  const { technicalMetadata } = evidenceInfo
  const riskScore = formatScore(analysisInfo.riskScore)
  const confidenceScore = formatScore(analysisInfo.confidenceScore)
  const resolution = technicalMetadata.width && technicalMetadata.height
    ? `${technicalMetadata.width} × ${technicalMetadata.height}`
    : "-"
  const duration = formatDuration(technicalMetadata.durationSec)

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("rounded-full px-4 text-xs font-semibold", riskBadgeClassName)}>
              {riskLabel}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-4 text-xs font-semibold">
              {statusLabel}
            </Badge>
            <Badge variant="outline" className="rounded-full px-4 text-xs font-semibold">
              {extension}
            </Badge>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-2xl font-semibold tracking-normal text-foreground sm:text-[28px]">
              {evidenceInfo.fileName}
            </h2>
            <Star className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <MetaInline icon={LockKeyhole} label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
            <MetaDivider />
            <MetaInline icon={ClipboardCheck} label="업로드 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
            <MetaDivider />
            <MetaInline icon={FileBadge} label="파일 유형" value={evidenceInfo.mediaType || "VIDEO"} />
            <MetaDivider />
            <MetaInline icon={FileText} label="파일 크기" value={formatBytes(evidenceInfo.fileSize)} />
            <MetaDivider />
            <MetaInline icon={Video} label="해상도" value={resolution} />
            <MetaDivider />
            <MetaInline icon={Play} label="재생 시간" value={duration} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <MetricCard
            label="최종 위험도"
            value={riskScore ?? "-"}
            suffix={riskScore == null ? "" : "/ 100"}
            badge={riskScore == null ? "분석 대기" : riskLabel}
            valueClassName={riskTextClassName}
            badgeClassName={riskBadgeClassName}
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

      {analysisInfo.status === "FAILED" ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
          <p className="font-semibold">실패 사유</p>
              <p className="mt-1 leading-5">{analysisInfo.summary || "분석 처리 중 오류가 발생했습니다."}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

// 헤더 메타 정보는 박스 그리드 대신 한 줄 인라인으로 노출한다(목표 UI와 동일, 시선 이동 최소화).
function MetaInline({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  )
}

function MetaDivider() {
  return <span className="hidden h-3.5 w-px bg-border sm:inline-block" aria-hidden="true" />
}

function MetricCard({
  label,
  value,
  suffix,
  badge,
  valueClassName,
  badgeClassName,
}: {
  label: string
  value: string
  suffix: string
  badge: string
  valueClassName: string
  badgeClassName?: string
}) {
  return (
    <div className="flex min-h-[132px] flex-col items-center justify-center rounded-lg border border-border bg-background/40 px-4 py-4 text-center">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="mt-4 flex items-end justify-center gap-1">
        <span className={cn("text-4xl font-semibold leading-none", valueClassName)}>{value}</span>
        {suffix ? (
          <span className="pb-1 text-base font-semibold text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      <span className={cn(
        "mt-4 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
        badgeClassName
      )}>
        {badge}
      </span>
    </div>
  )
}

function formatScore(score: number | null) {
  if (score == null) return null
  const normalized = score > 0 && score <= 1 ? score * 100 : score
  return String(Math.round(normalized))
}
