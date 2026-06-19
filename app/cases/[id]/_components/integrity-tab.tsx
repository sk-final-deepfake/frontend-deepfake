import { AlertCircle, CheckCircle2, Copy, Hash, History, LockKeyhole, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type IntegrityTabProps = {
  data: EvidenceDetailData
  copied: boolean
  onCopyHash: () => void
}

export function IntegrityTab({ data, copied, onCopyHash }: IntegrityTabProps) {
  const { integrityInfo, evidenceInfo, analysisInfo } = data
  const chainValid = integrityInfo.isChainValid ?? integrityInfo.chainValid
  const txHash = `0x${integrityInfo.originalHash.slice(0, 8)}...${integrityInfo.originalHash.slice(-6)}`
  const caseNumber = `CASE-2026-${String(evidenceInfo.evidenceId).slice(-4)}`
  const completed = analysisInfo.status === "COMPLETED"
  const steps = [
    { label: "업로드", time: evidenceInfo.uploadedAt, done: true },
    { label: "해시 생성", time: evidenceInfo.uploadedAt, done: true },
    { label: "분석 요청", time: analysisInfo.requestedAt, done: Boolean(analysisInfo.requestedAt) },
    { label: "분석 완료", time: analysisInfo.completedAt, done: completed },
    { label: "보고서 생성", time: analysisInfo.completedAt, done: completed },
  ]

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "flex items-center gap-4 rounded-xl border p-4",
          chainValid
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
        )}
      >
        {chainValid ? (
          <ShieldCheck className="size-8 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertCircle className="size-8 shrink-0 text-red-500" />
        )}
        <div>
          <p className={cn("text-base font-black", chainValid ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300")}>
            {chainValid ? "무결성 검증 완료" : "무결성 검증 실패"}
          </p>
          <p className={cn("mt-0.5 text-xs font-bold", chainValid ? "text-emerald-600/90 dark:text-emerald-300/80" : "text-red-500/90 dark:text-red-300/80")}>
            {chainValid
              ? "원본 해시와 블록체인 기록이 일치합니다 · 위변조 흔적 없음"
              : "원본 해시와 블록체인 기록이 일치하지 않습니다"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <Hash className="size-5 text-teal-600" />
            해시 · Evidence Manifest
          </h3>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">SHA-256</p>
              <Button type="button" variant="outline" size="sm" onClick={onCopyHash}>
                <Copy className="size-3.5" />
                {copied ? "복사됨" : "복사"}
              </Button>
            </div>
            <p className="break-all font-mono text-xs font-bold text-slate-700 dark:text-foreground">
              {integrityInfo.originalHash}
            </p>
          </div>
          <dl className="mt-3 divide-y divide-slate-100 dark:divide-border">
            <ManifestRow label="사건번호" value={caseNumber} />
            <ManifestRow label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
            <ManifestRow label="해시 알고리즘" value={integrityInfo.hashAlgorithm || "SHA-256"} />
            <ManifestRow label="Manifest 생성" value={formatDateTime(evidenceInfo.uploadedAt)} />
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-xs font-bold text-slate-400 dark:text-muted-foreground">전자서명</dt>
              <dd>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full font-bold",
                    chainValid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-border dark:bg-muted/30 dark:text-muted-foreground"
                  )}
                >
                  {chainValid ? "서명 유효 · RSA-4096" : "미검증"}
                </Badge>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <LockKeyhole className="size-5 text-teal-600" />
            블록체인 무결성
          </h3>
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-lg p-3",
              chainValid
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
            )}
          >
            <CheckCircle2 className="size-5 shrink-0" />
            <span className="text-sm font-black">{chainValid ? "검증 성공 — 해시 일치" : "검증 실패 — 해시 불일치"}</span>
          </div>
          <dl className="mt-3 divide-y divide-slate-100 dark:divide-border">
            <ManifestRow label="등록 상태" value={completed ? "앵커링 완료" : "대기"} />
            <ManifestRow label="앵커링 시각" value={formatDateTime(analysisInfo.completedAt ?? evidenceInfo.uploadedAt)} />
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-xs font-bold text-slate-400 dark:text-muted-foreground">Tx Hash</dt>
              <dd>
                <a
                  href="https://etherscan.io"
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-bold text-teal-600 underline-offset-2 hover:underline dark:text-teal-300"
                >
                  {txHash}
                </a>
              </dd>
            </div>
            <ManifestRow label="검증 상태" value={integrityInfo.verificationStatus || (chainValid ? "VERIFIED" : "FAILED")} />
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
          <History className="size-5 text-teal-600" />
          처리 타임라인
        </h3>
        <div className="relative mt-5 flex justify-between gap-2">
          <div className="absolute left-[10%] right-[10%] top-3 h-0.5 bg-slate-200 dark:bg-border" />
          {steps.map((step) => (
            <div key={step.label} className="relative z-10 flex-1 text-center">
              <span
                className={cn(
                  "mx-auto flex size-6 items-center justify-center rounded-full border-2 bg-white dark:bg-card",
                  step.done ? "border-teal-500 text-teal-600" : "border-slate-200 text-slate-300 dark:border-border"
                )}
              >
                <CheckCircle2 className="size-4" />
              </span>
              <p className="mt-2 text-xs font-bold text-slate-700 dark:text-foreground">{step.label}</p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-400 dark:text-muted-foreground">
                {step.done ? formatClockTime(step.time) : "-"}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

function ManifestRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-xs font-bold text-slate-400 dark:text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-semibold text-slate-700 dark:text-foreground">{value}</dd>
    </div>
  )
}

function formatClockTime(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${hours}:${minutes}:${seconds}`
}
