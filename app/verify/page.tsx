"use client"

import { Suspense, useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  Link2,
  Loader2,
  PenLine,
  QrCode,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/client"
import { getApiErrorMessage } from "@/lib/api/errors"
import {
  fetchReportVerification,
  type ReportVerification,
  type ReportVerifyStatus,
} from "@/lib/api/public-report"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export default function PublicReportVerifyPage() {
  return (
    <Suspense fallback={<VerifyShell><VerifyLoading /></VerifyShell>}>
      <VerifyPageBody />
    </Suspense>
  )
}

function VerifyPageBody() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const [result, setResult] = useState<ReportVerification | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const [errorKind, setErrorKind] = useState<"notFound" | "server" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function verify() {
      setIsLoading(true)
      setErrorKind(null)
      setErrorMessage(null)

      try {
        const data = await fetchReportVerification(token)
        if (!cancelled) setResult(data)
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          setErrorKind("notFound")
        } else {
          setErrorKind("server")
        }
        setErrorMessage(getApiErrorMessage(error, "검증 정보를 확인하지 못했습니다."))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [token, retryKey])

  return (
    <VerifyShell>
      {!token ? (
        <VerifyEmptyState
          icon={<QrCode className="size-9 text-slate-400" aria-hidden="true" />}
          title="검증 정보 없음"
          description={"주소에 검증 토큰이 없습니다.\n보고서의 QR 코드를 다시 스캔해 주세요."}
        />
      ) : isLoading ? (
        <VerifyLoading />
      ) : errorKind === "notFound" ? (
        <VerifyEmptyState
          icon={<QrCode className="size-9 text-slate-400" aria-hidden="true" />}
          title="등록되지 않은 검증 주소입니다"
          description={
            errorMessage ?? "검증 토큰이 만료되었거나 잘못된 주소입니다.\n보고서의 QR 코드를 다시 스캔해 주세요."
          }
        />
      ) : errorKind === "server" ? (
        <VerifyEmptyState
          icon={<AlertCircle className="size-9 text-slate-400" aria-hidden="true" />}
          title="일시적으로 확인할 수 없습니다"
          description={errorMessage ?? "잠시 후 다시 시도해 주세요."}
          action={
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg px-4 font-bold"
              onClick={() => setRetryKey((key) => key + 1)}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              다시 확인
            </Button>
          }
        />
      ) : result ? (
        <VerifyResult result={result} />
      ) : null}
    </VerifyShell>
  )
}

function VerifyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-5 py-8 sm:py-16">
        <header className="flex items-center justify-center gap-2 pb-2">
          <ShieldCheck className="size-5 text-teal-600 dark:text-teal-300" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-700 dark:text-foreground">
            ForenShield 보고서 진위 확인
          </p>
        </header>

        {children}

        <p className="px-1 pt-1 text-center text-[11px] font-medium leading-5 text-slate-400">
          이 페이지는 ForenShield가 발급한 보고서의 위·변조 여부만 확인하며, 보고서 내용은 제공하지
          않습니다.
        </p>
      </main>
    </div>
  )
}

function VerifyLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-8 dark:border-border dark:bg-card">
      <Loader2 className="size-8 animate-spin text-slate-400" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-500 dark:text-muted-foreground">
        검증 정보를 확인하는 중입니다.
      </p>
    </div>
  )
}

function VerifyEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-border dark:bg-card">
      {icon}
      <div className="space-y-2">
        <p className="text-base font-bold text-slate-950 dark:text-foreground">{title}</p>
        <p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-500 dark:text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}

const VERDICT_DISPLAY: Record<
  ReportVerifyStatus,
  { title: string; fallbackMessage: string; icon: ReactNode; text: string }
> = {
  VALID: {
    title: "검증 완료",
    fallbackMessage: "이 보고서는 발급 이후 변조되지 않았습니다.",
    icon: <CheckCircle2 className="size-11 text-teal-600 dark:text-teal-300" aria-hidden="true" />,
    text: "text-teal-700 dark:text-teal-300",
  },
  WARNING: {
    title: "일부 확인 필요",
    fallbackMessage: "일부 항목을 자동으로 확인하지 못했습니다. 발급 기관에 문의해 주세요.",
    icon: <AlertCircle className="size-11 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    text: "text-amber-600 dark:text-amber-400",
  },
  INVALID: {
    title: "검증 실패",
    fallbackMessage: "발급 기록과 일치하지 않는 보고서입니다. 위·변조되었거나 등록되지 않은 문서일 수 있습니다.",
    icon: <XCircle className="size-11 text-red-700 dark:text-red-400" aria-hidden="true" />,
    text: "text-red-700 dark:text-red-400",
  },
}

type CheckTone = "ok" | "danger" | "muted"

const CHECK_BADGE_CLASS: Record<CheckTone, string> = {
  ok: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  muted: "bg-slate-100 text-slate-500 dark:bg-secondary dark:text-muted-foreground",
}

function VerifyResult({ result }: { result: ReportVerification }) {
  const verdict = VERDICT_DISPLAY[result.status] ?? VERDICT_DISPLAY.WARNING

  const signature = getSignatureCheck(result)
  const blockchain = getBlockchainCheck(result)

  return (
    <div className="flex flex-col gap-2.5">
      <section className="rounded-xl border border-slate-200 bg-white p-7 text-center dark:border-border dark:bg-card">
        <div className="flex justify-center">{verdict.icon}</div>
        <h1 className={cn("mt-3 text-xl font-bold", verdict.text)}>{verdict.title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-muted-foreground">
          {result.message?.trim() || verdict.fallbackMessage}
        </p>
        <p className="mt-3 font-mono text-xs font-semibold text-slate-400">{result.reportNo}</p>
      </section>

      <CheckCard
        icon={<FileCheck2 className="size-4" aria-hidden="true" />}
        title="PDF 해시"
        badge={result.hashMatched ? "일치" : "불일치"}
        tone={result.hashMatched ? "ok" : "danger"}
        note={
          result.hashMatched
            ? "발급 시 등록된 해시와 동일합니다."
            : "발급 시 등록된 해시와 다릅니다. 파일이 변경되었을 수 있습니다."
        }
      >
        <HashLine label="보고서 해시 (SHA-256)" value={result.reportHash} />
      </CheckCard>

      <CheckCard
        icon={<PenLine className="size-4" aria-hidden="true" />}
        title="전자서명"
        badge={signature.badge}
        tone={signature.tone}
        note={signature.note}
      />

      <CheckCard
        icon={<Link2 className="size-4" aria-hidden="true" />}
        title="블록체인 기록"
        badge={blockchain.badge}
        tone={blockchain.tone}
        note={blockchain.note}
      >
        {result.blockchainTxHash ? (
          <HashLine label="트랜잭션 해시" value={result.blockchainTxHash} />
        ) : null}
      </CheckCard>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
        <h2 className="text-sm font-bold text-slate-950 dark:text-foreground">보고서 정보</h2>
        <dl className="mt-3 space-y-2">
          <InfoRow label="보고서 번호" value={result.reportNo} />
          <InfoRow label="파일명" value={result.reportFileName} />
          <InfoRow label="생성일" value={formatDateTime(result.createdAt)} />
          <InfoRow label="증거 ID" value={`EVD-${result.evidenceId}`} />
        </dl>
      </section>
    </div>
  )
}

function getSignatureCheck(result: ReportVerification): { badge: string; tone: CheckTone; note: string } {
  const status = result.signatureStatus?.trim().toUpperCase() ?? ""

  if (status === "UNSIGNED" || status === "NONE") {
    return { badge: "서명 없음", tone: "muted", note: "전자서명이 확인되지 않았습니다." }
  }
  if (result.signatureValid) {
    const parts = [result.signatureAlgorithm?.trim(), extractCommonName(result.signerCertificateSubject)]
      .filter(Boolean)
      .join(" · ")
    return {
      badge: "유효",
      tone: "ok",
      note: parts || "서명이 보고서 내용과 일치합니다.",
    }
  }
  return {
    badge: "유효하지 않음",
    tone: "danger",
    note: "서명 이후 보고서가 변경된 것으로 확인됩니다.",
  }
}

function getBlockchainCheck(result: ReportVerification): { badge: string; tone: CheckTone; note: string } {
  const status = result.blockchainStatus?.trim().toUpperCase() ?? ""

  if (status === "NOT_ANCHORED" || status === "NONE" || status === "PENDING") {
    return {
      badge: "기록 없음",
      tone: "muted",
      note: "이 보고서는 블록체인에 기록되어 있지 않습니다.",
    }
  }
  if (result.blockchainMatched) {
    const parts = [
      result.blockchainNetwork?.trim(),
      result.blockchainAnchoredAt ? `${formatDateTime(result.blockchainAnchoredAt)} 앵커링` : null,
    ]
      .filter(Boolean)
      .join(" · ")
    return {
      badge: "기록 확인",
      tone: "ok",
      note: parts || "블록체인에 기록된 해시와 일치합니다.",
    }
  }
  return {
    badge: "기록 불일치",
    tone: "danger",
    note: "블록체인에 기록된 해시와 일치하지 않습니다.",
  }
}

function CheckCard({
  icon,
  title,
  badge,
  tone,
  note,
  children,
}: {
  icon: ReactNode
  title: string
  badge: string
  tone: CheckTone
  note: string
  children?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-950 dark:text-foreground">
          <span className="text-teal-600 dark:text-teal-300">{icon}</span>
          {title}
        </p>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", CHECK_BADGE_CLASS[tone])}>
          {badge}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500 dark:text-muted-foreground">{note}</p>
      {children}
    </section>
  )
}

function HashLine({ label, value }: { label: string; value: string }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const trimmed = value?.trim() ?? ""

  if (!trimmed) return null

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(trimmed)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // 클립보드 접근이 차단된 환경에서는 무시
    }
  }

  return (
    <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-background/60">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <div className="mt-1 flex items-start justify-between gap-2">
        <p
          className={cn(
            "min-w-0 font-mono text-xs font-semibold text-slate-600 dark:text-muted-foreground",
            expanded ? "break-all" : "truncate"
          )}
        >
          {expanded ? trimmed : `${trimmed.slice(0, 14)}…${trimmed.slice(-10)}`}
        </p>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={copyValue}
            aria-label="해시값 복사"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-secondary"
          >
            {copied ? (
              <Check className="size-3.5 text-teal-600 dark:text-teal-300" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-md px-1.5 py-1 text-[11px] font-bold text-teal-700 transition-colors hover:bg-slate-200/60 dark:text-teal-300 dark:hover:bg-secondary"
          >
            {expanded ? "접기" : "전체 보기"}
          </button>
        </span>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 font-medium text-slate-500 dark:text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all text-right font-bold text-slate-950 dark:text-foreground">{value}</dd>
    </div>
  )
}

function extractCommonName(subject: string | null | undefined) {
  if (!subject?.trim()) return null
  const match = subject.match(/CN=([^,]+)/i)
  return match ? match[1].trim() : subject.trim()
}
