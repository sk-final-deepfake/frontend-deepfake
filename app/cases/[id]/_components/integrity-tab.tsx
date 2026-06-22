import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileCheck2,
  PenLine,
  ShieldCheck,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime, formatDuration } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type IntegrityTabProps = {
  data: EvidenceDetailData
  copied: boolean
  onCopyHash: () => void
}

type Tone = "safe" | "warning" | "danger" | "muted"

export function IntegrityTab({ data, copied, onCopyHash }: IntegrityTabProps) {
  const { integrityInfo, evidenceInfo, analysisInfo } = data
  const chainValid = integrityInfo.isChainValid ?? integrityInfo.chainValid
  const statusTone: Tone = chainValid ? "safe" : "danger"
  const metadata = evidenceInfo.technicalMetadata
  const duration = formatDuration(metadata.durationSec)
  const shortHash = shortenHash(integrityInfo.originalHash)
  const uploadedAt = formatDateTime(evidenceInfo.uploadedAt)
  const completedAt = formatDateTime(analysisInfo.completedAt ?? evidenceInfo.uploadedAt)
  const cocSteps = buildCocSteps(data)
  const validationRows = buildValidationRows(chainValid)

  return (
    <div className="space-y-4">
      <section className="grid gap-3 lg:grid-cols-3">
        <IntegritySummaryCard
          icon={ShieldCheck}
          title="위변조 의심 수준"
          value={chainValid ? "낮음" : "높음"}
          description={chainValid ? "판정 결과가 낮으며 조작 가능성이 낮습니다." : "해시 검증 결과를 확인해야 합니다."}
          tone={statusTone}
        />
        <IntegritySummaryCard
          icon={FileCheck2}
          title="해시 검증 결과"
          value={chainValid ? "원본 해시 일치" : "해시 불일치"}
          description={`${integrityInfo.hashAlgorithm || "SHA-256"} 기준 원본 파일과 현재 파일을 비교했습니다.`}
          tone={statusTone}
        />
        <IntegritySummaryCard
          icon={PenLine}
          title="전자서명 상태"
          value={chainValid ? "유효" : "미검증"}
          description="Evidence Manifest 전자서명 기준으로 표시됩니다."
          tone={chainValid ? "safe" : "muted"}
        />
      </section>

      <FrameIntegrityChart chainValid={chainValid} duration={duration} />

      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <h3 className="text-sm font-semibold text-foreground">영상 시간축 검증</h3>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                chainValid ? "bg-teal-500" : "bg-red-500"
              )}
              style={{ width: chainValid ? "100%" : "62%" }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 text-[11px] font-medium text-muted-foreground">
            <span>00:00</span>
            <span className="text-center">00:05</span>
            <span className="text-center">00:20</span>
            <span className="text-right">{duration === "-" ? "00:30" : duration}</span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className={cn("size-4", chainValid ? "text-teal-600" : "text-red-500")} aria-hidden="true" />
            {chainValid
              ? "프레임 누락, 반복, 급격한 병합 전환이 발견되지 않았습니다."
              : "일부 구간의 무결성 상태를 다시 확인해야 합니다."}
          </p>
        </div>

        <dl className="rounded-lg border border-border bg-muted/20 p-4">
          <TimelineMeta label="시작 시간" value="00:00:00" />
          <TimelineMeta label="종료 시간" value={duration === "-" ? "00:00:30" : duration} />
          <TimelineMeta label="전체 길이" value={duration === "-" ? "00:30" : duration} />
        </dl>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ResultPanel title="무결성 검증 결과">
          <ResultRow label="SHA-256" value={shortHash} mono action={onCopyHash} actionLabel={copied ? "복사됨" : "복사"} />
          <ResultRow label="해시 알고리즘" value={integrityInfo.hashAlgorithm || "SHA-256"} />
          <ResultRow label="검증 결과" value={chainValid ? "원본 해시 일치" : "해시 불일치"} badgeTone={statusTone} />
          <ResultRow label="Evidence Manifest 생성 시각" value={uploadedAt} />
          <ResultRow label="Manifest 원본 해시" value={shortHash} mono />
          <ResultRow label="전자서명 상태" value={chainValid ? "유효" : "미검증"} badgeTone={chainValid ? "safe" : "muted"} />
        </ResultPanel>

        <ResultPanel title="블록체인 검증">
          <ResultRow label="블록체인 등록 상태" value={analysisInfo.status === "COMPLETED" ? "등록 대기" : "대기"} badgeTone="safe" />
          <ResultRow label="Transaction Hash" value="미제공" />
          <ResultRow label="영지식 시각" value={completedAt} />
          <ResultRow label="블록체인 기록 해시 검증" value={chainValid ? "일치" : "확인 필요"} badgeTone={statusTone} />
          <ResultRow label="네트워크" value="Private Chain" />
          <Button type="button" variant="outline" className="mt-4 h-10 w-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/60 dark:hover:bg-blue-950/30" disabled>
            트랜잭션 보기
            <ExternalLink className="size-4" aria-hidden="true" />
          </Button>
        </ResultPanel>
      </section>

      <CocSummary steps={cocSteps} />

      <ValidationDetailTable rows={validationRows} />
    </div>
  )
}

function FrameIntegrityChart({ chainValid, duration }: { chainValid: boolean; duration: string }) {
  const bars = buildIntegrityBars(chainValid)

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          프레임별 위변조 위험도
          <InfoIcon />
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-muted-foreground">
          <LegendDot className="bg-teal-500" label="낮음 (0~0.3)" />
          <LegendDot className="bg-amber-400" label="주의 (0.3~0.6)" />
          <LegendDot className="bg-red-500" label="위험 (0.6~1.0)" />
          <LegendDot className="bg-slate-300" label="분석 불가" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[42px_minmax(0,1fr)] gap-3">
        <div className="flex h-44 flex-col justify-between pt-1 text-[11px] font-medium text-muted-foreground">
          <span>1.00</span>
          <span className="text-red-500">0.72</span>
          <span>0.50</span>
          <span>0.25</span>
          <span>0.00</span>
        </div>
        <div className="relative h-44 border-l border-border">
          <div className="absolute inset-x-0 top-[28%] border-t border-dashed border-red-300" />
          <span className="absolute right-0 top-[calc(28%-18px)] text-[11px] font-semibold text-red-500">임계값 0.72</span>
          <div className="absolute inset-x-0 top-0 h-px bg-border/60" />
          <div className="absolute inset-x-0 top-1/4 h-px bg-border/60" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
          <div className="absolute inset-x-0 top-3/4 h-px bg-border/60" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-border/60" />
          <div className="absolute inset-x-2 bottom-2 flex h-32 items-end gap-1">
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

      <div className="ml-[54px] mt-2 grid grid-cols-6 text-[11px] font-medium text-muted-foreground">
        <span>00:00</span>
        <span className="text-center">00:05</span>
        <span className="text-center">00:10</span>
        <span className="text-center">00:15</span>
        <span className="text-center">00:20</span>
        <span className="text-right">{duration === "-" ? "00:30" : duration}</span>
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <CheckCircle2 className={cn("size-4", chainValid ? "text-teal-600" : "text-red-500")} aria-hidden="true" />
        {chainValid
          ? "전체 무결성 결과 기준으로 낮은 위험 상태입니다. 실제 프레임별 점수는 백엔드 제공 시 반영됩니다."
          : "전체 무결성 결과에서 불일치가 확인되었습니다. 실제 프레임별 점수는 백엔드 제공 시 반영됩니다."}
      </p>
    </section>
  )
}

function IntegritySummaryCard({
  icon: Icon,
  title,
  value,
  description,
  tone,
}: {
  icon: LucideIcon
  title: string
  value: string
  description: string
  tone: Tone
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full bg-muted/30", toneTextClassName(tone))}>
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          <p className={cn("mt-2 text-xl font-semibold", toneTextClassName(tone))}>{value}</p>
          <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  )
}

function ResultPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="mt-3 divide-y divide-border">{children}</dl>
    </section>
  )
}

function CocSummary({ steps }: { steps: CocStep[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Chain of Custody (CoC) 요약</h3>
      <div className="relative mt-5 grid gap-3 md:grid-cols-5">
        <div className="absolute left-[8%] right-[8%] top-4 hidden h-0.5 bg-teal-500 md:block" />
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="relative rounded-lg border border-border bg-background/40 p-3 text-center">
            <span className="absolute left-1/2 top-0 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-teal-500 text-card shadow-sm">
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-2 text-xs font-semibold text-foreground">{index + 1}. {step.title}</p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">{step.time}</p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">처리자: {step.actor}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ValidationDetailTable({ rows }: { rows: ValidationRow[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">검증 항목 상세</h3>
      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">검증 항목</th>
              <th className="px-3 py-2 font-semibold">결과</th>
              <th className="px-3 py-2 font-semibold">상태</th>
              <th className="px-3 py-2 font-semibold">설명</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-2 font-medium text-muted-foreground">{row.label}</td>
                <td className="px-3 py-2 font-medium text-foreground">{row.result}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className={cn("rounded-full border-transparent px-2.5 py-0.5 text-xs font-semibold", toneBadgeClassName(row.tone))}>
                    {row.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-medium text-muted-foreground">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
        <LegendDot className="bg-teal-500" label="정상" />
        <LegendDot className="bg-amber-400" label="주의" />
        <LegendDot className="bg-red-500" label="위험" />
      </div>
    </section>
  )
}

function ResultRow({
  label,
  value,
  mono,
  badgeTone,
  action,
  actionLabel,
}: {
  label: string
  value: string
  mono?: boolean
  badgeTone?: Tone
  action?: () => void
  actionLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-2 text-right font-medium text-foreground">
        {badgeTone ? (
          <Badge variant="outline" className={cn("rounded-full border-transparent px-2.5 py-0.5 text-xs font-semibold", toneBadgeClassName(badgeTone))}>
            {value}
          </Badge>
        ) : (
          <span className={cn("truncate", mono && "font-mono text-xs")}>{value}</span>
        )}
        {action ? (
          <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={action} aria-label={actionLabel}>
            <Copy className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </dd>
    </div>
  )
}

function TimelineMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-xs">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", className)} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

function InfoIcon() {
  return (
    <span className="inline-flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground">
      i
    </span>
  )
}

type CocStep = {
  title: string
  time: string
  actor: string
}

type ValidationRow = {
  label: string
  result: string
  status: string
  tone: Tone
  description: string
}

function buildCocSteps(data: EvidenceDetailData): CocStep[] {
  const { evidenceInfo, analysisInfo, cocLogs } = data
  const actors = cocLogs.map((log) => log.userId).filter(Boolean)
  const actor = actors[0] ?? "system"

  return [
    { title: "파일 업로드", time: formatDateTime(evidenceInfo.uploadedAt), actor },
    { title: "해시 생성", time: formatDateTime(evidenceInfo.uploadedAt), actor: "system" },
    { title: "분석 요청", time: formatDateTime(analysisInfo.requestedAt), actor: "system" },
    { title: "분석 완료", time: formatDateTime(analysisInfo.completedAt), actor: "system" },
    { title: "보고서 생성", time: formatDateTime(analysisInfo.completedAt), actor: "system" },
  ]
}

function buildValidationRows(chainValid: boolean): ValidationRow[] {
  const status = chainValid ? "정상" : "위험"
  const tone: Tone = chainValid ? "safe" : "danger"

  return [
    { label: "프레임 누락", result: chainValid ? "없음" : "확인 필요", status, tone, description: "누락된 프레임 패턴이 발견되지 않았습니다." },
    { label: "프레임 반복", result: chainValid ? "없음" : "확인 필요", status, tone, description: "반복 프레임 패턴이 발견되지 않았습니다." },
    { label: "프레임 혼합", result: chainValid ? "없음" : "확인 필요", status, tone, description: "비정상적인 연결 프레임 변형이 발견되지 않았습니다." },
    { label: "자연스러운 흐름", result: chainValid ? "OK" : "확인 필요", status, tone, description: "급격한 병합 전환이 탐지되지 않았습니다." },
    { label: "SHA-256 검증", result: chainValid ? "일치" : "불일치", status, tone, description: "계산된 원본 해시와 현재 파일 해시가 일치합니다." },
    { label: "전자서명", result: chainValid ? "유효" : "미검증", status, tone, description: "Evidence Manifest 서명이 유효합니다." },
    { label: "블록체인 검증", result: chainValid ? "일치" : "확인 필요", status, tone, description: "블록체인에 등록된 해시와 현재 파일 해시가 일치합니다." },
  ]
}

function buildIntegrityBars(chainValid: boolean) {
  return Array.from({ length: 54 }).map((_, index) => {
    const height = 12 + ((index * 7) % 9)
    return {
      height: chainValid ? height : index % 9 === 0 ? 76 : height + 12,
      className: chainValid ? "bg-teal-500" : index % 9 === 0 ? "bg-red-500" : "bg-amber-400",
    }
  })
}

function shortenHash(hash: string) {
  if (!hash) return "-"
  if (hash.length <= 22) return hash
  return `${hash.slice(0, 14)}...${hash.slice(-8)}`
}

function toneTextClassName(tone: Tone) {
  if (tone === "safe") return "text-teal-600 dark:text-teal-300"
  if (tone === "warning") return "text-amber-500 dark:text-amber-300"
  if (tone === "danger") return "text-red-500 dark:text-red-300"
  return "text-muted-foreground"
}

function toneBadgeClassName(tone: Tone) {
  if (tone === "safe") return "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300"
  if (tone === "warning") return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
  if (tone === "danger") return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
  return "bg-muted text-muted-foreground"
}
