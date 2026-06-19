import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CheckCircle2, Download, FileText, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

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
  const { analysisInfo } = data

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <CompactPanel title="판정 요약" icon={ShieldCheck}>
          <InfoLine label="위험 등급" value={riskLabel} pillClassName={riskSoftClassName} />
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
            <ModuleMini label="딥페이크 탐지" value={riskLabel} />
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
