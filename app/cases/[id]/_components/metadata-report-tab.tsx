"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import {
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileBadge,
  FileCheck2,
  FileText,
  Loader2,
  QrCode,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadEvidenceReport, type EvidenceDetailData } from "@/lib/api/evidence-detail"
import { getApiErrorMessage } from "@/lib/api/errors"
import { formatDateTime, formatDateTimeWithSeconds, formatDuration, formatFileSize } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type MetadataReportTabProps = {
  data: EvidenceDetailData
  extension: string
  reportReady: boolean
  verificationCode: string
  reviewApproved?: boolean
}

type PdfStatus = "NOT_CREATED" | "GENERATING" | "CREATED" | "FAILED"

type ReportTypeId = "full" | "deepfake" | "integrity" | "metadata" | "summary"

type ReportType = {
  id: ReportTypeId
  title: string
  description: string
}

const REPORT_TYPES: ReportType[] = [
  {
    id: "full",
    title: "전체 보고서",
    description: "분석 요약, 딥페이크, 위변조, 메타데이터, 검증 정보를 모두 포함합니다.",
  },
  {
    id: "deepfake",
    title: "딥페이크 보고서",
    description: "딥페이크 탐지 결과와 모델 분석 정보를 중심으로 구성합니다.",
  },
  {
    id: "integrity",
    title: "위변조·무결성 보고서",
    description: "편집 흔적, 무결성 검증, 원본성 확인 결과를 중심으로 구성합니다.",
  },
  {
    id: "metadata",
    title: "메타데이터 보고서",
    description: "파일 기본정보와 메타데이터 분석 결과를 중심으로 구성합니다.",
  },
  {
    id: "summary",
    title: "요약 보고서",
    description: "핵심 판정 결과와 주요 검증 정보만 간략히 포함합니다.",
  },
]

const REPORT_ITEMS = [
  "사건 정보",
  "파일 기본정보",
  "분석 요약",
  "딥페이크 탐지 결과",
  "위변조·무결성 검증 결과",
  "메타데이터 분석 결과",
  "보고서 검증 정보",
  "QR 검증 정보",
] as const

const DEFAULT_ITEMS: Record<ReportTypeId, (typeof REPORT_ITEMS)[number][]> = {
  full: [...REPORT_ITEMS],
  deepfake: ["파일 기본정보", "분석 요약", "딥페이크 탐지 결과", "보고서 검증 정보"],
  integrity: ["파일 기본정보", "위변조·무결성 검증 결과", "보고서 검증 정보", "QR 검증 정보"],
  metadata: ["파일 기본정보", "메타데이터 분석 결과", "보고서 검증 정보"],
  summary: ["사건 정보", "파일 기본정보", "분석 요약", "보고서 검증 정보"],
}

const STATUS_META: Record<PdfStatus, { label: string; badge: string; message: string; helper: string }> = {
  NOT_CREATED: {
    label: "미생성",
    badge: "bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground",
    message: "PDF 보고서가 아직 생성되지 않았습니다.",
    helper: "위에서 보고서 유형과 포함 항목을 선택한 뒤 PDF 보고서를 생성해 주세요.",
  },
  GENERATING: {
    label: "생성 중",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300",
    message: "PDF 보고서를 생성 중입니다.",
    helper: "생성 완료 후 다운로드와 QR 검증 정보를 확인할 수 있습니다.",
  },
  CREATED: {
    label: "생성 완료",
    badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
    message: "PDF 보고서가 생성되었습니다.",
    helper: "다운로드와 검증번호, QR 정보를 확인할 수 있습니다.",
  },
  FAILED: {
    label: "생성 실패",
    badge: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300",
    message: "PDF 보고서 생성에 실패했습니다.",
    helper: "관리자에게 문의하거나 다시 시도해 주세요.",
  },
}

export function MetadataReportTab({
  data,
  extension,
  reportReady,
  verificationCode,
  reviewApproved = false,
}: MetadataReportTabProps) {
  const { evidenceInfo, analysisInfo } = data
  const metadata = evidenceInfo.technicalMetadata
  const [reportType, setReportType] = useState<ReportTypeId>("full")
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() =>
    makeSelectedItems(DEFAULT_ITEMS.full)
  )
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>(reportReady ? "CREATED" : "NOT_CREATED")
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    reportReady ? (analysisInfo.completedAt ?? evidenceInfo.uploadedAt) : null
  )

  const [pdfActionLoading, setPdfActionLoading] = useState(false)
  const [pdfActionError, setPdfActionError] = useState<string | null>(null)

  const currentType = REPORT_TYPES.find((type) => type.id === reportType) ?? REPORT_TYPES[0]
  const selectedCount = REPORT_ITEMS.filter((item) => selectedItems[item]).length
  const fileDate = (generatedAt ?? new Date().toISOString()).slice(0, 10)
  const fileName = `ForenShield_Report_EVD-${evidenceInfo.evidenceId}_${fileDate}.pdf`
  const reportHash = makeReportHash(`${fileName}:${verificationCode}`)
  const isCreated = pdfStatus === "CREATED"
  const isGenerating = pdfStatus === "GENERATING"

  function handleReportTypeChange(nextType: ReportTypeId) {
    setReportType(nextType)
    setSelectedItems(makeSelectedItems(DEFAULT_ITEMS[nextType]))
  }

  function handleGenerate() {
    if (selectedCount === 0 || isCreated || isGenerating) return
    setPdfStatus("GENERATING")
    window.setTimeout(() => {
      setGeneratedAt(new Date().toISOString())
      setPdfStatus("CREATED")
    }, 1400)
  }

  async function handleDownload() {
    if (!isCreated || !reviewApproved) return
    setPdfActionLoading(true)
    setPdfActionError(null)

    try {
      const blob = await downloadEvidenceReport(evidenceInfo.evidenceId)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    } catch (error) {
      setPdfActionError(getApiErrorMessage(error, "PDF 다운로드에 실패했습니다."))
    } finally {
      setPdfActionLoading(false)
    }
  }

  async function handlePreview() {
    if (!isCreated) return
    const previewWindow = window.open("", "_blank", "noopener")
    setPdfActionLoading(true)
    setPdfActionError(null)

    try {
      const blob = await downloadEvidenceReport(evidenceInfo.evidenceId, { preview: true })
      const objectUrl = URL.createObjectURL(blob)
      if (previewWindow) {
        previewWindow.location.href = objectUrl
      } else {
        window.open(objectUrl, "_blank", "noopener")
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    } catch (error) {
      previewWindow?.close()
      setPdfActionError(getApiErrorMessage(error, "PDF 미리보기를 열지 못했습니다."))
    } finally {
      setPdfActionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <StepSection
        number={1}
        title="메타데이터 확인"
        description="보고서 생성 전, 분석 대상 파일의 기본 메타데이터를 확인합니다."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoTableCard
            title="파일 기본정보"
            rows={[
              ["파일명", evidenceInfo.fileName],
              ["파일 유형", evidenceInfo.fileType || "VIDEO"],
              ["파일 크기", formatFileSize(evidenceInfo.fileSize, { zeroLabel: "확인되지 않음" })],
              ["재생 시간", metadata.durationSec != null ? formatDuration(metadata.durationSec) : "확인되지 않음"],
              ["해상도", formatResolution(data)],
              ["프레임레이트", metadata.fps != null ? `${metadata.fps} fps` : "확인되지 않음"],
            ]}
          />
          <InfoTableCard
            title="포렌식 메타데이터"
            rows={[
              ["업로드 일시", formatDateTime(evidenceInfo.uploadedAt)],
              ["증거번호", `EVD-${evidenceInfo.evidenceId}`],
              ["생성 일시", metadata.capturedAt ? formatDateTimeWithSeconds(metadata.capturedAt) : formatDateTimeWithSeconds(evidenceInfo.uploadedAt)],
              ["수정 일시", metadata.capturedAt ? formatDateTimeWithSeconds(metadata.capturedAt) : formatDateTimeWithSeconds(evidenceInfo.uploadedAt)],
              ["코덱", metadata.codec || "H.264 / AAC"],
              ["메타데이터 상태", "확인됨"],
            ]}
          />
        </div>
      </StepSection>

      <StepSection
        number={2}
        title="보고서 생성 신청"
        description="생성할 보고서 유형과 포함 범위를 선택해 주세요."
      >
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-bold text-foreground">보고서 유형을 선택해 주세요.</h4>
            <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {REPORT_TYPES.map((type) => (
                <ReportTypeCard
                  key={type.id}
                  type={type}
                  selected={type.id === reportType}
                  onSelect={() => handleReportTypeChange(type.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground">보고서에 포함할 항목을 선택해 주세요.</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {REPORT_ITEMS.map((item) => (
                <label
                  key={item}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                    selectedItems[item]
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-blue-600"
                    checked={selectedItems[item]}
                    onChange={() => setSelectedItems((prev) => ({ ...prev, [item]: !prev[item] }))}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <SummaryLine label="선택된 보고서 유형" value={currentType.title} />
              <SummaryLine label="포함 항목 수" value={`${selectedCount}개`} />
              <SummaryLine label="생성 방식" value="PDF 자동 생성" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                보고서 생성 후 다운로드와 검증번호, QR 정보를 확인할 수 있습니다.
              </p>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={selectedCount === 0 || isGenerating || isCreated}
                className="h-11 bg-teal-600 font-bold hover:bg-teal-700 disabled:bg-muted disabled:text-muted-foreground"
              >
                {isGenerating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileBadge className="size-4" aria-hidden="true" />}
                {isCreated ? "보고서 생성 완료" : "PDF 보고서 생성"}
              </Button>
            </div>
          </div>
        </div>
      </StepSection>

      <StepSection number={3} title="보고서 생성 결과">
        <ReportResult
          status={pdfStatus}
          generatedAt={generatedAt}
          fileName={fileName}
          isCreated={isCreated}
          isGenerating={isGenerating}
          reviewApproved={reviewApproved}
          isActionLoading={pdfActionLoading}
          actionError={pdfActionError}
          onDownload={handleDownload}
          onPreview={handlePreview}
        />
      </StepSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <VerificationCard
          title="보고서 무결성 정보"
          enabled={isCreated}
          rows={[
            ["보고서 해시(reportHash)", isCreated ? <HashValue key="hash" hash={reportHash} /> : "-"],
            ["Hash 알고리즘", "SHA-256"],
            ["보고서 파일명", fileName],
            ["보고서 생성 시각", isCreated ? formatDateTime(generatedAt) : "-"],
            ["검증 상태", isCreated ? <StatusText key="status">확인 가능</StatusText> : "미생성"],
          ]}
        />
        <QrVerificationCard
          enabled={isCreated}
          verificationCode={verificationCode}
          reportHash={reportHash}
        />
      </div>
    </div>
  )
}

function StepSection({
  number,
  title,
  description,
  children,
}: {
  number: number
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          {number}
        </span>
        <div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-sm font-semibold text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function InfoTableCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-background/40">
      <h4 className="border-b border-border bg-muted/20 px-4 py-3 text-sm font-bold text-foreground">{title}</h4>
      <dl className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm">
            <dt className="font-semibold text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-right font-bold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function ReportTypeCard({
  type,
  selected,
  onSelect,
}: {
  type: ReportType
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-[108px] items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-blue-400 bg-blue-50 text-blue-900 shadow-sm dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200"
          : "border-border bg-card text-foreground hover:bg-muted/30"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-blue-600 bg-blue-600" : "border-muted-foreground/50"
        )}
        aria-hidden="true"
      >
        {selected ? <span className="size-2 rounded-full bg-white" /> : null}
      </span>
      <span>
        <span className="block text-sm font-bold">{type.title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-muted-foreground">{type.description}</span>
      </span>
    </button>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold text-foreground">{value}</p>
    </div>
  )
}

function ReportResult({
  status,
  generatedAt,
  fileName,
  isCreated,
  isGenerating,
  reviewApproved,
  isActionLoading,
  actionError,
  onDownload,
  onPreview,
}: {
  status: PdfStatus
  generatedAt: string | null
  fileName: string
  isCreated: boolean
  isGenerating: boolean
  reviewApproved: boolean
  isActionLoading: boolean
  actionError: string | null
  onDownload: () => void
  onPreview: () => void
}) {
  const meta = STATUS_META[status]
  return (
    <div className={cn("rounded-xl border p-5", status === "FAILED" ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20" : "border-border bg-background/40")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full",
              isCreated && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
              isGenerating && "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300",
              !isCreated && !isGenerating && status !== "FAILED" && "bg-muted text-muted-foreground",
              status === "FAILED" && "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-300"
            )}
          >
            {isGenerating ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <FileCheck2 className="size-6" aria-hidden="true" />}
          </span>
          <div>
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {isCreated ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                    reviewApproved
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                  )}
                >
                  {reviewApproved ? "검토 승인 완료" : "검토 승인 대기"}
                </span>
              ) : null}
            </span>
            <p className="mt-3 text-base font-bold text-foreground">{meta.message}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {isCreated && !reviewApproved
                ? "검토자가 분석 결과를 승인하면 PDF를 다운로드할 수 있습니다."
                : meta.helper}
            </p>
            {isGenerating ? <div className="mt-4 h-2 w-72 max-w-full overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-blue-500" /></div> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!isCreated || !reviewApproved || isActionLoading}
            onClick={onDownload}
            title={isCreated && !reviewApproved ? "검토자 승인 후 다운로드할 수 있습니다" : undefined}
            className="h-11 bg-teal-600 font-bold hover:bg-teal-700 disabled:bg-muted disabled:text-muted-foreground"
          >
            {isActionLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
            {isActionLoading ? "PDF 준비 중" : "PDF 다운로드"}
          </Button>
          <Button type="button" variant="outline" disabled={!isCreated || isActionLoading} onClick={onPreview} className="h-11 font-bold">
            <ExternalLink className="size-4" aria-hidden="true" />
            미리보기
          </Button>
        </div>
      </div>

      {actionError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          {actionError}
        </p>
      ) : null}

      {isCreated ? (
        <dl className="mt-5 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
          <SummaryLine label="보고서 생성 시각" value={formatDateTime(generatedAt)} />
          <SummaryLine label="보고서 파일명" value={fileName} />
        </dl>
      ) : null}
    </div>
  )
}

function VerificationCard({
  title,
  enabled,
  rows,
}: {
  title: string
  enabled: boolean
  rows: Array<[string, ReactNode]>
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", !enabled && "opacity-75")}>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {enabled ? (
        <dl className="mt-4 divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt className="shrink-0 font-semibold text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-right font-bold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
          보고서 생성 후 무결성 정보가 표시됩니다.
        </p>
      )}
    </section>
  )
}

function QrVerificationCard({
  enabled,
  verificationCode,
  reportHash,
}: {
  enabled: boolean
  verificationCode: string
  reportHash: string
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", !enabled && "opacity-75")}>
      <h3 className="text-lg font-bold text-foreground">QR 검증 정보</h3>
      {enabled ? (
        <div className="mt-4 grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3">
            <QrPlaceholder seed={reportHash} />
            <p className="font-mono text-sm font-bold text-foreground">{verificationCode}</p>
          </div>
          <div className="space-y-3">
            <InfoPill label="QR 상태" value="생성 완료" />
            <InfoPill label="검증번호" value={verificationCode} />
            <InfoPill label="검증 URL" value="검증 페이지에서 확인 가능" />
            <div className="flex flex-wrap gap-2 pt-1">
              <CopyButton label="검증번호 복사" text={verificationCode} />
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1 font-semibold">
                <ExternalLink className="size-4" aria-hidden="true" />
                검증 페이지 열기
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8">
          <QrCode className="size-14 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-center text-sm font-semibold text-muted-foreground">
            보고서 생성 후 QR 검증 정보가 표시됩니다.
          </p>
        </div>
      )}
    </section>
  )
}

function HashValue({ hash }: { hash: string }) {
  return (
    <span className="inline-flex min-w-0 items-center justify-end gap-2">
      <span className="truncate font-mono text-xs">{shorten(hash)}</span>
      <CopyButton label="복사" text={hash} />
    </span>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  )
}

function StatusText({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
      <Check className="size-4" aria-hidden="true" />
      {children}
    </span>
  )
}

function StatusBadge({ status }: { status: PdfStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold", meta.badge)}>
      {meta.label}
    </span>
  )
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          window.setTimeout(() => setDone(false), 1200)
        } catch {
          setDone(false)
        }
      }}
      className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/40"
    >
      <ClipboardCopy className="size-3.5" aria-hidden="true" />
      {done ? "복사됨" : label}
    </button>
  )
}

function QrPlaceholder({ seed }: { seed: string }) {
  const cells = Array.from({ length: 121 }, (_, index) => {
    const row = Math.floor(index / 11)
    const col = index % 11
    const finder = (row <= 2 && col <= 2) || (row <= 2 && col >= 8) || (row >= 8 && col <= 2)
    const charCode = seed.charCodeAt(index % Math.max(1, seed.length)) || index
    return finder || (charCode + row * 7 + col * 11) % 3 === 0
  })

  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
      <div className="grid size-36 grid-cols-11 gap-0.5">
        {cells.map((filled, index) => (
          <span key={index} className={cn("rounded-[2px]", filled ? "bg-slate-900" : "bg-slate-100")} />
        ))}
      </div>
    </div>
  )
}

function makeSelectedItems(items: readonly string[]) {
  return Object.fromEntries(REPORT_ITEMS.map((item) => [item, items.includes(item)]))
}

function makeReportHash(seed: string): string {
  let hash = 0x811c9dc5
  let out = ""
  for (let i = 0; i < 32; i += 1) {
    hash ^= seed.charCodeAt(i % seed.length) || i + 1
    hash = Math.imul(hash, 0x01000193) >>> 0
    out += (hash & 0xff).toString(16).padStart(2, "0")
  }
  return out
}

function shorten(hash: string) {
  if (hash.length <= 28) return hash
  return `${hash.slice(0, 12)}...${hash.slice(-12)}`
}

function formatResolution(data: EvidenceDetailData) {
  const metadata = data.evidenceInfo.technicalMetadata
  const width = metadata?.width
  const height = metadata?.height
  if (width == null || height == null) return "확인되지 않음"
  return `${width} × ${height}`
}
