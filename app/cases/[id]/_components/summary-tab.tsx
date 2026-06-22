import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CheckCircle2, Download, FileText, Fingerprint, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime, formatFileSize } from "@/lib/formatters"
import { cn } from "@/lib/utils"

import { getSummaryPlaceholder } from "../_lib/evidence-display"

type ProgressStep = {
  title: string
  time?: string | null
  done: boolean
}

type SummaryTabProps = {
  data: EvidenceDetailData
  riskLabel: string
  riskSoftClassName: string
  progressSteps: ProgressStep[]
}

export function SummaryTab({
  data,
  riskLabel,
  riskSoftClassName,
  progressSteps,
}: SummaryTabProps) {
  const { evidenceInfo, integrityInfo, analysisInfo } = data
  const reportStatus = analysisInfo.status === "COMPLETED" ? "생성 완료" : "생성 전"
  const confidence = formatScorePercent(analysisInfo.confidenceScore)
  const qualityScore = confidence == null ? "-" : `${Math.max(0, confidence - 1)} / 100`
  const shortHash = integrityInfo.originalHash
    ? `${integrityInfo.originalHash.slice(0, 12)}...${integrityInfo.originalHash.slice(-8)}`
    : "-"

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <CompactPanel title="파일 기본정보" icon={FileText}>
          <InfoLine label="파일명" value={evidenceInfo.fileName} valueClassName="max-w-[160px] truncate" />
          <InfoLine label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
          <InfoLine label="업로드 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
          <InfoLine label="파일 유형" value={evidenceInfo.mediaType || "VIDEO"} />
          <InfoLine label="파일 크기" value={formatFileSize(evidenceInfo.fileSize)} />
        </CompactPanel>

        <CompactPanel title="판정 요약" icon={ShieldCheck}>
          <InfoLine label="위험 등급" value={riskLabel} pillClassName={riskSoftClassName} />
          <InfoLine label="분석 신뢰도" value={confidence == null ? "-" : `${confidence}%`} pillClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" />
          <InfoLine label="품질 점수" value={qualityScore} pillClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" />
        </CompactPanel>

        <CompactPanel title="무결성 검증" icon={Fingerprint}>
          <InfoLine label="해시 알고리즘" value={integrityInfo.hashAlgorithm || "SHA-256"} />
          <InfoLine label="해시 값" value={shortHash} valueClassName="max-w-[160px] truncate font-mono text-xs" />
          <InfoLine label="전자서명" value={integrityInfo.chainValid ? "유효" : "미검증"} pillClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" />
          <InfoLine label="검증 상태" value={integrityInfo.verificationStatus || "완료"} pillClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" />
        </CompactPanel>

        <CompactPanel title="메타데이터/보고서" icon={FileText} quiet>
          <InfoLine label="보고서 상태" value={reportStatus} pillClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" />
          <InfoLine label="보고서 생성" value={formatDateTime(analysisInfo.completedAt)} valueClassName="text-foreground" />
          <Button
            type="button"
            variant="outline"
            className="mt-6 h-11 w-full border-blue-200 bg-card font-black text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900/60 dark:hover:bg-blue-950/30"
          >
            <Download className="size-4" aria-hidden="true" />
            보고서 다운로드
          </Button>
        </CompactPanel>
      </div>

      <section className="rounded-lg border border-border bg-background/40 p-5">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
          <Sparkles className="size-5 text-teal-600" aria-hidden="true" />
          분석 결과 요약
        </h3>
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground">최종 결론</p>
          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
            {analysisInfo.summary?.trim() || getSummaryPlaceholder(analysisInfo.status)}
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background/40 p-5">
        <h3 className="text-lg font-black text-foreground">분석 진행 요약</h3>
        <ProgressTimeline steps={progressSteps} />
      </section>
    </>
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
    <section className={cn("rounded-lg border border-border bg-background/40 p-5", className)}>
      <h3 className={cn("flex items-center gap-2 text-lg text-foreground", quiet ? "font-bold" : "font-black")}>
        <Icon className={cn("size-5", quiet ? "text-teal-500" : "text-teal-600")} aria-hidden="true" />
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
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="shrink-0 whitespace-nowrap text-sm font-bold text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 whitespace-nowrap rounded-full px-3 py-1 text-right text-sm font-bold text-foreground",
          pillClassName,
          valueClassName
        )}
      >
        {value}
      </span>
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
              "relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-card",
              step.done ? "border-teal-500 text-teal-600" : "border-border text-muted-foreground"
            )}
          >
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">{step.title}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">{formatDateTime(step.time)}</p>
        </div>
      ))}
    </div>
  )
}

function formatScorePercent(score: number | null) {
  if (score == null) return null
  const normalized = score > 0 && score <= 1 ? score * 100 : score
  return Math.round(normalized)
}
