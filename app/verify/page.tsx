"use client"

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  FileUp,
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
  verifyReportFileHash,
  type ReportFileHashVerification,
  type ReportVerification,
  type ReportVerificationLookup,
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
  const [codeInput, setCodeInput] = useState("")
  const [submittedCode, setSubmittedCode] = useState("")
  const [result, setResult] = useState<ReportVerification | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const [errorKind, setErrorKind] = useState<"notFound" | "server" | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const activeCode = token ? "" : submittedCode.trim()
  const shouldVerify = Boolean(token || activeCode)

  useEffect(() => {
    if (!shouldVerify) {
      setIsLoading(false)
      return
    }
    let cancelled = false

    async function verify() {
      setIsLoading(true)
      setErrorKind(null)
      setErrorMessage(null)
      setResult(null)

      try {
        const data = await fetchReportVerification(token ? { token } : { code: activeCode })
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
  }, [activeCode, shouldVerify, token, retryKey])

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextCode = codeInput.trim()
    if (!nextCode) return

    setErrorKind(null)
    setErrorMessage(null)
    setResult(null)
    if (submittedCode === nextCode) {
      setRetryKey((key) => key + 1)
    } else {
      setSubmittedCode(nextCode)
    }
  }

  function resetCodeEntry() {
    setSubmittedCode("")
    setErrorKind(null)
    setErrorMessage(null)
    setResult(null)
  }

  return (
    <VerifyShell>
      {!shouldVerify ? (
        <VerifyCodeEntry
          codeInput={codeInput}
          onCodeChange={setCodeInput}
          onSubmit={handleCodeSubmit}
        />
      ) : isLoading ? (
        <VerifyLoading />
      ) : errorKind === "notFound" ? (
        <VerifyEmptyState
          icon={<QrCode className="size-9 text-slate-400" aria-hidden="true" />}
          title={token ? "등록되지 않은 검증 주소입니다" : "등록되지 않은 검증코드입니다"}
          description={
            errorMessage ??
            (token
              ? "검증 토큰이 만료되었거나 잘못된 주소입니다.\n보고서의 QR 코드를 다시 스캔해 주세요."
              : "검증코드를 다시 확인해 주세요.\n하이픈 없이 입력해도 확인할 수 있습니다.")
          }
          action={
            token ? undefined : (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg px-4 font-bold"
                onClick={resetCodeEntry}
              >
                다시 입력
              </Button>
            )
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
        <VerifyResult
          result={result}
          lookup={token ? { token } : { code: activeCode }}
        />
      ) : null}
    </VerifyShell>
  )
}

function VerifyCodeEntry({
  codeInput,
  onCodeChange,
  onSubmit,
}: {
  codeInput: string
  onCodeChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const [verifyUrl, setVerifyUrl] = useState("/verify")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setVerifyUrl(`${window.location.origin}/verify`)
  }, [])

  async function copyVerifyUrl() {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // 클립보드 접근이 차단된 환경에서는 무시
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-border dark:bg-card">
      <div className="text-center">
        <ShieldCheck className="mx-auto size-10 text-teal-600 dark:text-teal-300" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-bold text-slate-950 dark:text-foreground">보고서 진위 확인</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-muted-foreground">
          보고서에 표시된 검증 URL에 접속한 뒤 검증코드를 입력하세요.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-lg bg-slate-50 px-3 py-3 dark:bg-background/60">
          <p className="text-[11px] font-bold text-slate-400">검증 URL</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate font-mono text-sm font-bold text-slate-700 dark:text-muted-foreground">
              {verifyUrl}
            </p>
            <button
              type="button"
              onClick={copyVerifyUrl}
              aria-label="검증 URL 복사"
              className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-secondary"
            >
              {copied ? (
                <Check className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground">검증코드</span>
            <input
              value={codeInput}
              onChange={(event) => onCodeChange(event.target.value)}
              placeholder="VF-8F3K-29QX"
              autoCapitalize="characters"
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-base font-bold text-slate-950 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-background dark:text-foreground dark:focus:ring-teal-500/20"
            />
          </label>
          <Button
            type="submit"
            disabled={!codeInput.trim()}
            className="h-11 w-full rounded-lg bg-teal-600 font-bold text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
          >
            확인하기
          </Button>
        </form>
      </div>
    </section>
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
          이 페이지는 발행 기록과 사용자가 선택한 PDF의 무결성을 확인하며, 보고서 내용은 제공하지
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
    title: "발행 기록 확인됨",
    fallbackMessage: "ForenShield에 등록된 공식 발행 기록입니다.",
    icon: <CheckCircle2 className="size-11 text-teal-600 dark:text-teal-300" aria-hidden="true" />,
    text: "text-teal-700 dark:text-teal-300",
  },
  WARNING: {
    title: "발행 기록 일부 확인 필요",
    fallbackMessage: "발행 기록의 일부 상태를 자동으로 확인하지 못했습니다.",
    icon: <AlertCircle className="size-11 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
    text: "text-amber-600 dark:text-amber-400",
  },
  INVALID: {
    title: "발행 기록 검증 실패",
    fallbackMessage: "발행 기록에 문제가 있습니다. 발급 기관에 문의해 주세요.",
    icon: <XCircle className="size-11 text-red-700 dark:text-red-400" aria-hidden="true" />,
    text: "text-red-700 dark:text-red-400",
  },
}

type CheckTone = "ok" | "warning" | "danger" | "muted"

const CHECK_BADGE_CLASS: Record<CheckTone, string> = {
  ok: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  muted: "bg-slate-100 text-slate-500 dark:bg-secondary dark:text-muted-foreground",
}

function VerifyResult({
  result,
  lookup,
}: {
  result: ReportVerification
  lookup: ReportVerificationLookup
}) {
  const verdict = VERDICT_DISPLAY[result.status] ?? VERDICT_DISPLAY.WARNING

  const signature = getSignatureCheck(result)
  const blockchain = getBlockchainCheck(result)
  const storedFileIntact = result.storedFileIntact ?? result.hashMatched

  return (
    <div className="flex flex-col gap-2.5">
      <section className="rounded-xl border border-slate-200 bg-white p-7 text-center dark:border-border dark:bg-card">
        <div className="flex justify-center">{verdict.icon}</div>
        <h1 className={cn("mt-3 text-xl font-bold", verdict.text)}>{verdict.title}</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-muted-foreground">
          {getRecordSummary(result, verdict.fallbackMessage)}
        </p>
        <p className="mt-3 font-mono text-xs font-semibold text-slate-400">{result.reportNo}</p>
      </section>

      <ReportFileVerification lookup={lookup} />

      <CheckCard
        icon={<FileCheck2 className="size-4" aria-hidden="true" />}
        title="발행 원본 보관 상태"
        badge={storedFileIntact ? "정상" : "확인 필요"}
        tone={storedFileIntact ? "ok" : "danger"}
        note={
          storedFileIntact
            ? "서버 보관 원본이 발급 시 등록된 해시와 일치합니다."
            : "서버 보관 원본 상태를 확인할 수 없습니다. 발급 기관에 문의해 주세요."
        }
      >
        <HashLine label="등록된 최종 PDF 해시 (SHA-256)" value={result.reportHash} />
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
          {result.verificationCode ? <InfoRow label="검증코드" value={result.verificationCode} /> : null}
          <InfoRow label="파일명" value={result.reportFileName} />
          <InfoRow label="생성일" value={formatDateTime(result.createdAt)} />
          <InfoRow label="증거 ID" value={`EVD-${result.evidenceId}`} />
        </dl>
      </section>
    </div>
  )
}

function getRecordSummary(result: ReportVerification, fallbackMessage: string) {
  if (result.status === "VALID") {
    return "공식 발행 기록과 보관 상태를 확인했습니다. 현재 보유한 PDF는 아래에서 별도로 검사할 수 있습니다."
  }
  if (result.status === "WARNING") {
    return "공식 발행 기록은 확인됐지만 일부 상태를 자동으로 확인하지 못했습니다. 현재 PDF는 아래에서 별도로 검사하세요."
  }
  return result.message?.trim() || fallbackMessage
}

type FileCheckProgress = "idle" | "hashing" | "verifying" | "done" | "error"

function ReportFileVerification({ lookup }: { lookup: ReportVerificationLookup }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<FileCheckProgress>("idle")
  const [fileName, setFileName] = useState("")
  const [fileHash, setFileHash] = useState("")
  const [verification, setVerification] = useState<ReportFileHashVerification | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const isProcessing = progress === "hashing" || progress === "verifying"

  async function inspectFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setProgress("error")
      setFileName(file.name)
      setFileHash("")
      setVerification(null)
      setErrorMessage("PDF 파일만 검사할 수 있습니다.")
      return
    }

    setProgress("hashing")
    setFileName(file.name)
    setFileHash("")
    setVerification(null)
    setErrorMessage("")

    try {
      const hash = await calculateFileSha256(file)
      setFileHash(hash)
      setProgress("verifying")
      const checked = await verifyReportFileHash({ ...lookup, fileHash: hash })
      setVerification(checked)
      setProgress("done")
    } catch (error) {
      setProgress("error")
      setErrorMessage(getApiErrorMessage(error, "PDF 파일을 검사하지 못했습니다."))
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void inspectFile(file)
  }

  function chooseFile() {
    if (fileInputRef.current) fileInputRef.current.value = ""
    fileInputRef.current?.click()
  }

  const tone: CheckTone = verification
    ? verification.status === "MATCH"
      ? "ok"
      : verification.status === "WARNING"
        ? "warning"
        : "danger"
    : progress === "error"
      ? "danger"
      : "muted"
  const badge = verification
    ? verification.status === "MATCH"
      ? "원본 일치"
      : verification.status === "WARNING"
        ? "추가 확인 필요"
        : "불일치"
    : isProcessing
      ? "검사 중"
      : progress === "error"
        ? "검사 실패"
        : "선택 전"

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-950 dark:text-foreground">
          <FileUp className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
          내 PDF 파일 검사
        </p>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", CHECK_BADGE_CLASS[tone])}>
          {badge}
        </span>
      </div>

      <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500 dark:text-muted-foreground">
        PDF는 서버로 전송하지 않습니다. 이 브라우저에서 SHA-256을 계산하고 해시값만 확인합니다.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {isProcessing ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 dark:bg-background/60">
          <Loader2 className="size-5 shrink-0 animate-spin text-teal-600 dark:text-teal-300" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-700 dark:text-foreground">{fileName}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              {progress === "hashing" ? "PDF 해시를 계산하고 있습니다." : "등록된 최종 해시와 비교하고 있습니다."}
            </p>
          </div>
        </div>
      ) : verification ? (
        <div className="mt-3">
          <p className={cn(
            "rounded-lg px-3 py-2.5 text-xs font-bold leading-5",
            verification.status === "MATCH"
              ? "bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-300"
              : verification.status === "WARNING"
                ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                : "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300"
          )}>
            {verification.message}
          </p>
          <HashLine label="선택한 PDF 해시 (SHA-256)" value={fileHash} />
          {!verification.matched ? (
            <HashLine label="등록된 최종 PDF 해시 (SHA-256)" value={verification.registeredHash} />
          ) : null}
        </div>
      ) : progress === "error" ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-bold leading-5 text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="mt-3 h-10 w-full rounded-lg font-bold"
        disabled={isProcessing}
        onClick={chooseFile}
      >
        <FileUp className="size-4" aria-hidden="true" />
        {verification || progress === "error" ? "다른 PDF 검사" : "PDF 선택"}
      </Button>
    </section>
  )
}

async function calculateFileSha256(file: File) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("이 브라우저에서는 로컬 파일 해시 계산을 지원하지 않습니다.")
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function getSignatureCheck(result: ReportVerification): { badge: string; tone: CheckTone; note: string } {
  const status = result.signatureStatus?.trim().toUpperCase() ?? ""

  if (status === "UNSIGNED" || status === "NONE") {
    return { badge: "서명 없음", tone: "muted", note: "전자서명이 확인되지 않았습니다." }
  }
  if (result.signatureValid == null) {
    return {
      badge: "확인 불가",
      tone: "muted",
      note: "서명 검증 결과가 아직 제공되지 않았습니다.",
    }
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
  if (result.blockchainMatched == null) {
    return {
      badge: "확인 불가",
      tone: "muted",
      note: "블록체인 기록을 확인하지 못했습니다. 발급 기관에 문의해 주세요.",
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
