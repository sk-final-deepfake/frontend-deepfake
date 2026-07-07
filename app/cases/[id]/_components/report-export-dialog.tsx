"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Check, ChevronDown, Download, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadEvidenceReport, type EvidenceDetailData } from "@/lib/api/evidence-detail"
import { getApiErrorMessage } from "@/lib/api/errors"
import { cn } from "@/lib/utils"

type ReportTypeId = "full" | "summary" | "integrity"

const REPORT_TYPES: Array<{ id: ReportTypeId; label: string }> = [
  { id: "full", label: "전체 종합 보고서" },
  { id: "summary", label: "요약 보고서" },
  { id: "integrity", label: "무결성 검증 보고서" },
]

export function ReportExportDialog({
  open,
  onClose,
  data,
}: {
  open: boolean
  onClose: () => void
  data: EvidenceDetailData
}) {
  const [reportType, setReportType] = useState<ReportTypeId>("full")
  const [reviewApproved, setReviewApproved] = useState(false)
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfReloadKey, setPdfReloadKey] = useState(0)

  const { evidenceInfo } = data
  const fileName = `ForenShield_Report_EVD-${evidenceInfo.evidenceId}_${new Date().toISOString().slice(0, 10)}.pdf`

  // 검토자 승인 여부 — 검토 화면의 승인 버튼이 localStorage에 기록하고 이벤트로 알린다
  useEffect(() => {
    const approvalKey = `fs-report-approval:${evidenceInfo.evidenceId}`

    function syncApproval() {
      try {
        setReviewApproved(window.localStorage.getItem(approvalKey) === "1")
      } catch {
        setReviewApproved(false)
      }
    }

    syncApproval()
    window.addEventListener("storage", syncApproval)
    window.addEventListener("fs-report-approval-change", syncApproval)
    return () => {
      window.removeEventListener("storage", syncApproval)
      window.removeEventListener("fs-report-approval-change", syncApproval)
    }
  }, [evidenceInfo.evidenceId])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    let objectUrl: string | null = null

    setPdfBlob(null)
    setPdfPreviewUrl(null)
    setPdfError(null)
    setPdfLoading(true)

    downloadEvidenceReport(evidenceInfo.evidenceId)
      .then((blob) => {
        const nextUrl = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(nextUrl)
          return
        }
        objectUrl = nextUrl
        setPdfBlob(blob)
        setPdfPreviewUrl(nextUrl)
      })
      .catch((error) => {
        if (!cancelled) {
          setPdfError(getApiErrorMessage(error, "PDF 미리보기를 불러오지 못했습니다."))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPdfLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [evidenceInfo.evidenceId, open, pdfReloadKey])

  if (!open) return null

  async function handleDownload() {
    if (!reviewApproved) return
    setPdfError(null)

    try {
      const blob = pdfBlob ?? (await downloadEvidenceReport(evidenceInfo.evidenceId))
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    } catch (error) {
      setPdfError(getApiErrorMessage(error, "PDF 다운로드에 실패했습니다."))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="보고서 PDF 다운로드"
        className="grid max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden"
      >
        {/* 왼쪽: 출력 설정 */}
        <div className="flex min-h-0 flex-col border-b border-border p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">보고서 PDF</h2>
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
            <div className="relative">
              <p id="reportTypeLabel" className="text-xs font-bold text-muted-foreground">
                보고서 유형
              </p>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={typeMenuOpen}
                aria-labelledby="reportTypeLabel reportTypeValue"
                onClick={() => setTypeMenuOpen((current) => !current)}
                className={cn(
                  "mt-2 flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 text-left text-sm font-bold text-foreground outline-none transition-colors",
                  typeMenuOpen
                    ? "border-teal-300 ring-4 ring-teal-100 dark:ring-teal-950/40"
                    : "border-border hover:border-teal-200"
                )}
              >
                <span id="reportTypeValue" className="truncate">
                  {REPORT_TYPES.find((type) => type.id === reportType)?.label}
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", typeMenuOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {typeMenuOpen ? (
                <div
                  role="listbox"
                  aria-labelledby="reportTypeLabel"
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-xl dark:bg-card"
                >
                  {REPORT_TYPES.map((type) => {
                    const selected = type.id === reportType
                    return (
                      <button
                        key={type.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setReportType(type.id)
                          setTypeMenuOpen(false)
                        }}
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-bold transition-colors",
                          selected
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-200"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span>{type.label}</span>
                        {selected ? <Check className="size-4" aria-hidden="true" /> : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground">대상 증거</p>
              <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="font-mono text-xs font-bold text-foreground">EVD-{evidenceInfo.evidenceId}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                  {evidenceInfo.originalFileName ?? evidenceInfo.fileName}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground">생성 파일명</p>
              <p className="mt-2 break-all rounded-lg bg-muted/30 px-3 py-2.5 font-mono text-[11px] font-semibold text-muted-foreground">
                {fileName}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-muted-foreground">검토 상태</p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  reviewApproved
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                )}
              >
                {reviewApproved ? "검토 승인 완료" : "검토 승인 대기"}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-6">
            {!reviewApproved ? (
              <p className="mb-2 rounded-lg bg-muted/40 px-3 py-2 text-center text-xs font-semibold leading-5 text-muted-foreground">
                승인 완료 후 다운로드 버튼이 활성화됩니다.
              </p>
            ) : null}
            <Button
              type="button"
              disabled={!reviewApproved}
              onClick={handleDownload}
              className="h-11 w-full bg-teal-600 text-base font-bold text-white hover:bg-teal-700 disabled:bg-muted disabled:text-muted-foreground"
            >
              <Download className="size-4" aria-hidden="true" />
              PDF 다운로드
            </Button>
          </div>
        </div>

        {/* 오른쪽: 문서 미리보기 */}
        <div className="relative min-h-0 overflow-y-auto bg-slate-200/70 p-6 dark:bg-slate-900/40 lg:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 hidden size-8 items-center justify-center rounded-md bg-white/70 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-900 lg:flex"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <p className="mb-3 text-center text-xs font-bold text-slate-500">
            {fileName}
            <span className="ml-2 text-[11px] font-semibold text-slate-400">백엔드 생성 PDF 미리보기</span>
          </p>

          <div className="mx-auto flex h-[calc(92vh-8rem)] min-h-[520px] w-full max-w-[620px] overflow-hidden rounded-sm bg-white text-slate-900 shadow-lg">
            {pdfLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="size-8 animate-spin" aria-hidden="true" />
                <p className="text-sm font-bold">QR 포함 PDF를 불러오는 중입니다.</p>
              </div>
            ) : pdfError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertCircle className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-bold text-slate-900">PDF를 표시하지 못했습니다.</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{pdfError}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 font-bold"
                  onClick={() => setPdfReloadKey((key) => key + 1)}
                >
                  다시 불러오기
                </Button>
              </div>
            ) : pdfPreviewUrl ? (
              <iframe
                title="보고서 PDF 미리보기"
                src={`${pdfPreviewUrl}#toolbar=0&navpanes=0`}
                className="h-full w-full border-0 bg-white"
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
