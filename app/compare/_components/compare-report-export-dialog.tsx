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
  const generatedAt = formatDateTime(new Date().toISOString())

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

          <article className="mx-auto flex min-h-[760px] w-full max-w-[560px] flex-col bg-white px-10 py-9 font-serif leading-relaxed text-slate-950 shadow-lg [font-variant-numeric:tabular-nums]">
            <header>
              <div className="flex items-end justify-between gap-4 text-[10px] leading-4 text-slate-600">
                <p>ForenShield AI 디지털 증거 분석 시스템</p>
                <div className="text-right">
                  <p>보고서 번호: COMPARE-{result.compareId}</p>
                  <p>보안 등급: 내부망 전용</p>
                </div>
              </div>
              <div className="mt-1.5 border-t-2 border-slate-900" />
              <div className="mt-[2px] border-t border-slate-900" />
              <h3 className="mt-7 text-center text-[20px] font-bold tracking-[0.3em] text-slate-950">
                비교검증 보고서
              </h3>
              <div className="mx-auto mt-3.5 w-20 border-t-2 border-slate-900" />
            </header>

            <div className="mt-6 flex-1">
              <DocSection number={1} title="검증 개요">
                <DocGrid
                  rows={[
                    ["기준 증거", `EVD-${result.originalEvidenceId}`],
                    ["비교 대상", result.candidateFileName || "제출본"],
                    ["검증 일시", formatDateTime(result.createdAt)],
                    ["생성 일시", generatedAt],
                  ]}
                />
              </DocSection>

              <DocSection number={2} title="검증 결과">
                <div className="border-2 border-slate-900 px-4 py-3 text-center">
                  <p className="text-[11px] text-slate-600">종합 판정</p>
                  <p className="mt-0.5 text-[16px] font-bold tracking-[0.08em] text-slate-950">
                    {result.summary.verdictLabel}
                  </p>
                </div>
                <div className="mt-2">
                  <DocGrid
                    rows={[
                      ["일치 항목", `${matchItems.length}건`],
                      ["불일치 항목", `${mismatchItems.length}건`],
                      ["제외 항목", `${skippedItems.length}건`],
                      ["검증 범위", "항목 대조 · 전자서명 · 블록체인"],
                    ]}
                    boldValues={["불일치 항목"]}
                  />
                </div>
              </DocSection>

              <DocSection number={3} title="주요 불일치 항목">
                {mismatchItems.length > 0 ? (
                  <table className="w-full table-fixed border-collapse border border-slate-500 text-[10px] leading-5">
                    <thead>
                      <tr>
                        <th className="w-[88px] border border-slate-500 bg-slate-100 px-2 py-1 text-center font-semibold text-slate-800">
                          항목
                        </th>
                        <th className="border border-slate-500 bg-slate-100 px-2 py-1 text-center font-semibold text-slate-800">
                          기준 증거
                        </th>
                        <th className="border border-slate-500 bg-slate-100 px-2 py-1 text-center font-semibold text-slate-800">
                          비교 대상
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mismatchItems.slice(0, 4).map((item) => (
                        <tr key={item.itemKey}>
                          <td className="border border-slate-500 px-2 py-1 text-center font-semibold text-slate-950">
                            {item.label}
                          </td>
                          <td className="border border-slate-500 px-2 py-1 text-center text-slate-950 [word-break:break-all]">
                            {formatPreviewValue(item.originalValue)}
                          </td>
                          <td className="border border-slate-500 px-2 py-1 text-center font-bold text-slate-950 [word-break:break-all]">
                            {formatPreviewValue(item.candidateValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[11px] leading-5 text-slate-950">불일치 항목이 확인되지 않았습니다.</p>
                )}
              </DocSection>

              <DocSection number={4} title="검증 계층">
                <DocGrid
                  rows={[
                    ["전자서명", formatSignatureStatus(result)],
                    ["블록체인", formatBlockchainStatus(result)],
                  ]}
                />
              </DocSection>

              <div className="mt-7">
                <p className="text-center text-[12px] leading-6 text-slate-950">
                  위와 같이 비교검증 결과를 보고합니다.
                </p>
                <p className="mt-2 text-center text-[11px] text-slate-950">
                  {generatedAt.split(" ")[0].replaceAll(".", ". ")}.
                </p>
                <table className="mx-auto mt-3 w-full max-w-[360px] border-collapse border border-slate-500 text-[11px]">
                  <tbody>
                    <tr>
                      <th className="w-[60px] border border-slate-500 bg-slate-100 px-2 py-1.5 text-center font-semibold text-slate-800">
                        작성자
                      </th>
                      <td className="border border-slate-500 px-2 py-1.5 text-slate-950">분석관</td>
                      <td className="w-[88px] border border-slate-500 px-2 py-1.5 text-center text-slate-400">(서명)</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-500 bg-slate-100 px-2 py-1.5 text-center font-semibold text-slate-800">
                        검토자
                      </th>
                      <td className="border border-slate-500 px-2 py-1.5 text-slate-950">책임 검토관</td>
                      <td className="border border-slate-500 px-2 py-1.5 text-center text-slate-400">(서명)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <footer className="mt-7">
              <div className="border-t border-slate-900" />
              <div className="mt-[2px] flex items-end justify-between border-t-2 border-slate-900 pt-2 text-[9px] leading-4 text-slate-600">
                <p>
                  본 보고서의 검증 결과는 기준 증거와 비교 대상의 무결성 대조 자료이며, 최종 판단은 사건 맥락과
                  검토자 확인을 함께 반영합니다. 무단 복제·배포를 금합니다.
                </p>
                <p className="shrink-0">- 1 / 1 -</p>
              </div>
            </footer>
          </article>
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

function DocSection({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h4 className="text-[13px] font-bold text-slate-950">
        {number}. {title}
      </h4>
      <div className="mt-1.5">{children}</div>
    </section>
  )
}

function DocGrid({ rows, boldValues = [] }: { rows: Array<[string, string]>; boldValues?: string[] }) {
  const pairs: Array<Array<[string, string]>> = []
  for (let index = 0; index < rows.length; index += 2) {
    pairs.push(rows.slice(index, index + 2))
  }

  return (
    <table className="w-full table-fixed border-collapse border border-slate-500 text-[11px] leading-5">
      <tbody>
        {pairs.map((pair, rowIndex) => (
          <tr key={rowIndex}>
            {pair.map(([label, value]) => (
              <DocGridCells key={label} label={label} value={value} bold={boldValues.includes(label)} />
            ))}
            {pair.length === 1 ? <DocGridCells label="" value="" /> : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DocGridCells({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <>
      <th className="w-[76px] border border-slate-500 bg-slate-100 px-2 py-1.5 text-left align-top text-[10px] font-semibold text-slate-800">
        {label}
      </th>
      <td
        className={cn(
          "border border-slate-500 px-2 py-1.5 align-top text-slate-950 [word-break:break-all]",
          bold && "font-bold"
        )}
      >
        {value}
      </td>
    </>
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
