"use client"

import { Download, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CompareResult } from "@/lib/api/compare"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type CompareReportExportDialogProps = {
  open: boolean
  onClose: () => void
  result: CompareResult
  isDownloading: boolean
  downloadError?: string | null
  onDownload: () => void
}

export function CompareReportExportDialog({
  open,
  onClose,
  result,
  isDownloading,
  downloadError,
  onDownload,
}: CompareReportExportDialogProps) {
  if (!open) return null

  const fileName = `ForenShield_Compare_Report_${result.compareId}_${new Date().toISOString().slice(0, 10)}.pdf`
  const mismatchItems = result.items.filter((item) => item.result === "MISMATCH")
  const matchItems = result.items.filter((item) => item.result === "MATCH")
  const skippedItems = result.items.filter((item) => item.result === "SKIPPED")
  const verdictTone = result.verdict === "TAMPERED" ? "text-red-700" : "text-teal-700"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="비교검증 PDF 보고서"
        className="grid max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden"
      >
        <div className="flex min-h-0 flex-col border-b border-border p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">비교검증 PDF</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 space-y-5">
            <InfoBlock label="보고서 유형" value="비교검증 보고서" strong />
            <InfoBlock label="검증 번호" value={`COMPARE-${result.compareId}`} mono />
            <InfoBlock label="기준 증거" value={`EVD-${result.originalEvidenceId}`} mono />
            <InfoBlock label="생성 파일명" value={fileName} mono subtle />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-muted-foreground">검증 결과</p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  result.verdict === "TAMPERED"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                    : "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300"
                )}
              >
                {result.summary.verdictLabel}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-6">
            {downloadError ? (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-semibold leading-5 text-red-700">
                {downloadError}
              </p>
            ) : (
              <p className="mb-2 rounded-lg bg-muted/40 px-3 py-2 text-center text-xs font-semibold leading-5 text-muted-foreground">
                미리보기 확인 후 PDF를 저장할 수 있습니다.
              </p>
            )}
            <Button
              type="button"
              disabled={isDownloading}
              onClick={onDownload}
              className="h-11 w-full bg-teal-600 text-base font-bold text-white hover:bg-teal-700 disabled:bg-muted disabled:text-muted-foreground"
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {isDownloading ? "PDF 생성 중" : "PDF 다운로드"}
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 overflow-y-auto bg-slate-200/70 p-6 dark:bg-slate-900/40 lg:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 hidden size-8 items-center justify-center rounded-md bg-white/70 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-900 lg:flex"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <p className="mb-3 text-center text-xs font-bold text-slate-500">{fileName}</p>

          <div className="mx-auto flex aspect-[210/297] w-full max-w-[520px] flex-col bg-white p-8 text-slate-900 shadow-lg">
            <header className="border-b-2 border-slate-900 pb-3">
              <p className="text-[10px] font-bold tracking-widest text-slate-500">FORENSHIELD AI · 비교검증</p>
              <h3 className="mt-1.5 text-lg font-black">비교검증 보고서</h3>
              <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-500">
                <span>보고서 번호: COMPARE-{result.compareId}</span>
                <span>생성일: {formatDateTime(new Date().toISOString())}</span>
              </div>
            </header>

            <PreviewSection title="1. 검증 개요">
              <PreviewRow label="기준 증거" value={`EVD-${result.originalEvidenceId}`} />
              <PreviewRow label="비교 대상" value={result.candidateFileName || "제출본"} />
              <PreviewRow label="검증 일시" value={formatDateTime(result.createdAt)} />
              <PreviewRow label="판정" value={result.summary.verdictLabel} valueClassName={verdictTone} />
            </PreviewSection>

            <PreviewSection title="2. 비교 결과">
              <PreviewRow label="일치" value={`${matchItems.length}건`} />
              <PreviewRow label="불일치" value={`${mismatchItems.length}건`} valueClassName="text-red-700" />
              <PreviewRow label="제외" value={`${skippedItems.length}건`} />
            </PreviewSection>

            <PreviewSection title="3. 주요 불일치 항목">
              {mismatchItems.length > 0 ? (
                mismatchItems.slice(0, 4).map((item) => (
                  <PreviewRow
                    key={item.itemKey}
                    label={item.label}
                    value={`${formatPreviewValue(item.originalValue)} → ${formatPreviewValue(item.candidateValue)}`}
                    mono
                    valueClassName="text-red-700"
                  />
                ))
              ) : (
                <p className="py-1 text-[10px] font-semibold text-slate-400">주요 불일치 항목이 없습니다.</p>
              )}
            </PreviewSection>

            <PreviewSection title="4. 검증 계층">
              <PreviewRow label="전자서명" value={formatSignatureStatus(result)} />
              <PreviewRow label="블록체인" value={formatBlockchainStatus(result)} />
            </PreviewSection>

            <footer className="mt-auto border-t border-slate-200 pt-2.5">
              <div className="flex items-end justify-between">
                <p className="text-[9px] font-semibold leading-4 text-slate-400">
                  본 보고서는 기준 증거와 비교 대상의 무결성 차이를 정리한 자료입니다.
                  <br />
                  최종 판단은 사건 맥락과 검토자 확인을 함께 반영합니다.
                </p>
                <span className="text-[9px] font-bold text-slate-400">1 / 1</span>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>
  )
}

function InfoBlock({
  label,
  value,
  strong = false,
  mono = false,
  subtle = false,
}: {
  label: string
  value: string
  strong?: boolean
  mono?: boolean
  subtle?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 break-all rounded-lg px-3 py-2.5 text-sm font-bold",
          subtle ? "bg-muted/30 text-muted-foreground" : "border border-border bg-muted/20 text-foreground",
          strong && "text-base",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h4 className="border-b border-slate-300 pb-1 text-[11px] font-black text-slate-800">{title}</h4>
      <dl className="mt-1.5 space-y-1">{children}</dl>
    </section>
  )
}

function PreviewRow({
  label,
  value,
  mono = false,
  valueClassName,
}: {
  label: string
  value: string
  mono?: boolean
  valueClassName?: string
}) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-[10px] leading-4">
      <dt className="font-semibold text-slate-400">{label}</dt>
      <dd className={cn("min-w-0 break-words font-semibold text-slate-700", mono && "font-mono", valueClassName)}>
        {value}
      </dd>
    </div>
  )
}

function formatPreviewValue(value: string) {
  if (!value) return "-"
  if (value.length <= 22) return value
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

function formatSignatureStatus(result: CompareResult) {
  if (!result.signature) return "정보 없음"
  if (result.signature.originalStatus === "VALID" && result.signature.candidateStatus === "VALID") return "서명 유효"
  if (result.signature.candidateStatus === "INVALID") return "제출본 서명 불일치"
  return "서명 확인 필요"
}

function formatBlockchainStatus(result: CompareResult) {
  if (!result.blockchain) return "정보 없음"
  if (result.blockchain.status === "MATCH") return "기록 일치"
  if (result.blockchain.status === "MISMATCH") return "기록 불일치"
  return "미앵커"
}
