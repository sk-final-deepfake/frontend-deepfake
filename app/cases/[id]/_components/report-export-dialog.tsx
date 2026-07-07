"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Download, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime, formatFileSize } from "@/lib/formatters"
import { cn } from "@/lib/utils"

// 백엔드 PDF 생성 API 연동 전 샘플. 연동 시 이 URL만 다운로드 API로 교체한다.
const SAMPLE_REPORT_URL = "/mock/report-sample.pdf"

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
  caseName,
  verificationCode,
}: {
  open: boolean
  onClose: () => void
  data: EvidenceDetailData
  caseName: string
  verificationCode: string
}) {
  const [reportType, setReportType] = useState<ReportTypeId>("full")
  const [reviewApproved, setReviewApproved] = useState(false)
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)

  const { evidenceInfo, integrityInfo, analysisInfo } = data
  const analysisDone = analysisInfo.status === "COMPLETED"
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

  if (!open) return null

  function handleDownload() {
    if (!reviewApproved) return
    const link = document.createElement("a")
    link.href = SAMPLE_REPORT_URL
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const riskScore = analysisInfo.riskScore != null ? Math.round(analysisInfo.riskScore) : null

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
          <p className="mb-3 text-center text-xs font-bold text-slate-500">{fileName}</p>

          <div className="mx-auto flex aspect-[210/297] w-full max-w-[520px] flex-col bg-white p-8 text-slate-900 shadow-lg">
            <header className="border-b-2 border-slate-900 pb-3">
              <p className="text-[10px] font-bold tracking-widest text-slate-500">FORENSHIELD AI · 내부망 전용</p>
              <h3 className="mt-1.5 text-lg font-black">
                {REPORT_TYPES.find((type) => type.id === reportType)?.label ?? "증거 분석 보고서"}
              </h3>
              <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-500">
                <span>보고서 번호: {verificationCode}</span>
                <span>생성일: {formatDateTime(new Date().toISOString())}</span>
              </div>
            </header>

            <PreviewSection title="1. 사건 정보">
              <PreviewRow label="사건명" value={caseName} />
              <PreviewRow label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
              <PreviewRow label="파일명" value={evidenceInfo.originalFileName ?? evidenceInfo.fileName} />
              <PreviewRow label="파일 크기" value={formatFileSize(evidenceInfo.fileSize, { zeroLabel: "-" })} />
              <PreviewRow label="등록 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
            </PreviewSection>

            {reportType !== "summary" ? (
              <PreviewSection title={reportType === "integrity" ? "2. 무결성 검증" : "2. 무결성 검증"}>
                <PreviewRow label="해시 알고리즘" value={integrityInfo.hashAlgorithm} />
                <PreviewRow label="원본 해시" value={shortHash(integrityInfo.originalHash)} mono />
                <PreviewRow label="검증 결과" value={integrityInfo.chainValid ? "원본 해시 일치" : "확인 필요"} />
              </PreviewSection>
            ) : null}

            {reportType !== "integrity" ? (
              <PreviewSection title={reportType === "summary" ? "2. AI 분석 결과" : "3. AI 분석 결과"}>
                {analysisDone ? (
                  <>
                    <PreviewRow label="위험 점수" value={riskScore != null ? `${riskScore} / 100` : "-"} />
                    <PreviewRow
                      label="신뢰도"
                      value={analysisInfo.confidenceScore != null ? `${Math.round(analysisInfo.confidenceScore)}%` : "-"}
                    />
                    <PreviewRow label="판정 요약" value={analysisInfo.summary || "-"} />
                  </>
                ) : (
                  <p className="py-1 text-[10px] font-semibold text-slate-400">
                    분석 대기 — AI 분석 완료 후 위험 점수와 판정 요약이 포함됩니다.
                  </p>
                )}
              </PreviewSection>
            ) : null}

            <footer className="mt-auto border-t border-slate-200 pt-2.5">
              <div className="flex items-end justify-between">
                <p className="text-[9px] font-semibold leading-4 text-slate-400">
                  본 보고서는 ForenShield AI가 생성한 분석 참고 자료이며,
                  <br />
                  최종 판단은 검토자 승인을 거칩니다. 검증코드 {verificationCode}
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

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h4 className="border-b border-slate-300 pb-1 text-[11px] font-black text-slate-800">{title}</h4>
      <dl className="mt-1.5 space-y-1">{children}</dl>
    </section>
  )
}

function PreviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2 text-[10px] leading-4">
      <dt className="font-semibold text-slate-400">{label}</dt>
      <dd className={cn("min-w-0 break-words font-semibold text-slate-700", mono && "font-mono")}>{value}</dd>
    </div>
  )
}

function shortHash(hash: string) {
  if (!hash || hash === "-") return "-"
  if (hash.length <= 40) return hash
  return `${hash.slice(0, 20)}...${hash.slice(-16)}`
}
