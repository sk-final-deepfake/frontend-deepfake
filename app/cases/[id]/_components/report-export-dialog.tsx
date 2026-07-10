"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertCircle, Check, ChevronDown, Download, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadEvidenceReport, type EvidenceDetailData, type ModelScore, type ModuleResult } from "@/lib/api/evidence-detail"
import { getApiErrorMessage } from "@/lib/api/errors"
import { cn } from "@/lib/utils"

type ReportTypeId = "full" | "summary" | "integrity"

const REPORT_TYPES: Array<{ id: ReportTypeId; label: string; helper: string }> = [
  { id: "full", label: "전체 종합 보고서", helper: "사건, AI 분석, 무결성, CoC를 모두 포함합니다." },
  { id: "summary", label: "요약 보고서", helper: "핵심 판정과 주요 근거만 1장으로 정리합니다." },
  { id: "integrity", label: "무결성 검증 보고서", helper: "해시, 전자서명, 블록체인, CoC 중심입니다." },
]

const THRESHOLD = 60

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
  const [pdfActionLoading, setPdfActionLoading] = useState(false)
  const [pdfActionError, setPdfActionError] = useState<string | null>(null)
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false)
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfPreviewReloadKey, setPdfPreviewReloadKey] = useState(0)

  const { evidenceInfo } = data
  const fileName = `ForenShield_Report_EVD-${evidenceInfo.evidenceId}_${new Date().toISOString().slice(0, 10)}.pdf`
  const currentType = REPORT_TYPES.find((type) => type.id === reportType) ?? REPORT_TYPES[0]
  const preview = useMemo(() => buildReportPreview(data, fileName, reviewApproved), [data, fileName, reviewApproved])

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
    let cancelled = false
    let objectUrl: string | null = null

    setPdfActionError(null)

    if (!open) {
      setPdfPreviewLoading(false)
      setPdfPreviewError(null)
      setPdfPreviewUrl(null)
      return
    }

    setPdfPreviewLoading(true)
    setPdfPreviewError(null)
    setPdfPreviewUrl(null)

    async function loadBackendPdfPreview() {
      try {
        const blob = await downloadEvidenceReport(evidenceInfo.evidenceId, { preview: !reviewApproved })
        if (cancelled) return

        objectUrl = URL.createObjectURL(blob)
        setPdfPreviewUrl(objectUrl)
      } catch (error) {
        if (!cancelled) {
          setPdfPreviewError(getApiErrorMessage(error, "PDF 미리보기를 불러오지 못했습니다."))
        }
      } finally {
        if (!cancelled) {
          setPdfPreviewLoading(false)
        }
      }
    }

    void loadBackendPdfPreview()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [evidenceInfo.evidenceId, open, pdfPreviewReloadKey, reviewApproved])

  if (!open) return null

  async function handleDownload() {
    if (!reviewApproved || pdfActionLoading || pdfPreviewLoading) return

    setPdfActionError(null)
    setPdfActionLoading(true)

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="보고서 PDF 다운로드"
        className="grid max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl lg:grid-cols-[330px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden"
      >
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
                  "mt-2 flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 text-left text-sm font-bold text-foreground outline-none transition-colors",
                  typeMenuOpen
                    ? "border-teal-300 ring-4 ring-teal-100 dark:ring-teal-950/40"
                    : "border-border hover:border-teal-200"
                )}
              >
                <span id="reportTypeValue" className="truncate">
                  {currentType.label}
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
                          "flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left transition-colors",
                          selected
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-200"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span>
                          <span className="block text-sm font-bold">{type.label}</span>
                          <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">{type.helper}</span>
                        </span>
                        {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground">대상 증거</p>
              <div className="mt-2 rounded-xl border border-border bg-muted/30 px-3 py-3">
                <p className="font-mono text-xs font-bold text-foreground">EVD-{evidenceInfo.evidenceId}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                  {evidenceInfo.originalFileName ?? evidenceInfo.fileName}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-muted-foreground">생성 파일명</p>
              <p className="mt-2 break-all rounded-xl bg-muted/30 px-3 py-3 font-mono text-[11px] font-semibold text-muted-foreground">
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
              <p className="mb-2 rounded-xl bg-muted/40 px-3 py-2 text-center text-xs font-semibold leading-5 text-muted-foreground">
                승인 완료 후 다운로드 버튼이 활성화됩니다.
              </p>
            ) : null}
            {pdfActionError ? (
              <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">
                {pdfActionError}
              </p>
            ) : null}
            <Button
              type="button"
              disabled={!reviewApproved || pdfActionLoading || pdfPreviewLoading}
              onClick={handleDownload}
              className="h-11 w-full bg-teal-600 text-base font-bold text-white hover:bg-teal-700 disabled:bg-muted disabled:text-muted-foreground"
            >
              {pdfActionLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
              {pdfActionLoading || pdfPreviewLoading ? "PDF 준비 중" : "PDF 다운로드"}
            </Button>
          </div>
        </div>

        <div className="relative min-h-0 overflow-y-auto bg-slate-200/80 p-5 dark:bg-slate-900/40 lg:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 hidden size-9 items-center justify-center rounded-xl bg-white/80 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-900 lg:flex"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <p className="mb-4 pr-12 text-center text-sm font-bold text-slate-600">
            {fileName}
            <span className="ml-2 text-xs font-semibold text-slate-400">
              PDF 미리보기
            </span>
          </p>

          <BackendPdfPreview
            fileName={fileName}
            loading={pdfPreviewLoading}
            error={pdfPreviewError}
            url={pdfPreviewUrl}
            onRetry={() => setPdfPreviewReloadKey((key) => key + 1)}
          />
        </div>
      </section>
    </div>
  )
}

function BackendPdfPreview({
  fileName,
  loading,
  error,
  url,
  onRetry,
}: {
  fileName: string
  loading: boolean
  error: string | null
  url: string | null
  onRetry: () => void
}) {
  if (loading) {
    return (
      <div className="flex min-h-[68vh] flex-col items-center justify-center rounded-sm bg-white shadow-xl">
        <Loader2 className="size-8 animate-spin text-teal-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-slate-700">PDF를 생성하고 있습니다.</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">잠시만 기다려 주세요.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[68vh] flex-col items-center justify-center rounded-sm bg-white px-6 text-center shadow-xl">
        <AlertCircle className="size-10 text-red-600" aria-hidden="true" />
        <p className="mt-4 text-base font-bold text-slate-950">PDF를 표시하지 못했습니다.</p>
        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">{error}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-5 h-10 rounded-lg px-4 font-bold"
          onClick={onRetry}
        >
          다시 불러오기
        </Button>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="flex min-h-[68vh] flex-col items-center justify-center rounded-sm bg-white px-6 text-center shadow-xl">
        <AlertCircle className="size-10 text-slate-400" aria-hidden="true" />
        <p className="mt-4 text-base font-bold text-slate-950">표시할 PDF가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-sm bg-white shadow-xl">
      <iframe
        title={`${fileName} 미리보기`}
        src={`${url}#toolbar=0&navpanes=0`}
        className="h-[min(72vh,920px)] min-h-[680px] w-full border-0 bg-white"
      />
    </div>
  )
}

function ReportPreviewPages({ type, preview }: { type: ReportTypeId; preview: ReportPreview }) {
  if (type === "summary") {
    return (
      <div className="space-y-8">
        <SummaryReportPage preview={preview} />
      </div>
    )
  }

  if (type === "integrity") {
    return (
      <div className="space-y-8">
        <IntegrityReportPage preview={preview} compact={false} pageLabel="1 / 1" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <FullReportPageOne preview={preview} />
      <FullReportPageTwo preview={preview} />
      <IntegrityReportPage preview={preview} compact pageLabel="3 / 3" />
    </div>
  )
}

function FullReportPageOne({ preview }: { preview: ReportPreview }) {
  return (
    <ReportPage title="전체 종합 보고서" subtitle={`보고서 번호: ${preview.reportNo}`} pageLabel="1 / 3">
      <ReportSection number={1} title="문서 개요">
        <InfoGrid
          rows={[
            ["보고서 유형", "딥페이크 분석 종합 보고서"],
            ["검토 상태", preview.reviewStatus, preview.reviewApproved ? "success" : "warning"],
            ["보안 등급", "내부망 전용"],
            ["생성자", preview.creator],
            ["생성일", preview.generatedAt],
            ["검증 방식", "QR · 검증 URL · 전자서명", "teal"],
          ]}
        />
      </ReportSection>

      <ReportSection number={2} title="사건 및 증거 요약">
        <InfoGrid
          rows={[
            ["사건명", preview.caseName],
            ["사건 번호", preview.caseId],
            ["대상 증거", preview.evidenceNo],
            ["파일명", preview.fileName],
            ["등록 일시", preview.uploadedAt],
            ["파일 유형", preview.fileType],
            ["파일 크기", preview.fileSize],
            ["원본 해시", preview.originalHash],
          ]}
        />
      </ReportSection>

      <ReportSection number={3} title="최종 분석 판정">
        <div className="border-2 border-slate-900 px-5 py-4 text-center">
          <p className="text-[13px] text-slate-600">종합 판정</p>
          <p className="mt-1 text-xl font-bold tracking-[0.08em] text-slate-950">{preview.riskLabel}</p>
        </div>
        <div className="mt-3">
          <InfoGrid
            rows={[
              ["위험 점수", `${preview.riskScore} / 100 (판정 기준 ${THRESHOLD})`],
              ["분석 신뢰도", `${preview.confidence}%`],
            ]}
          />
        </div>
        <p className="mt-3 text-[13px] leading-7 text-slate-950">{preview.summary}</p>
      </ReportSection>

      <ReportSection number={4} title="핵심 근거 요약" last>
        <div className="space-y-4">
          {preview.reasonRows.map((row) => (
            <div key={row.label} className="grid gap-4 text-[13px] sm:grid-cols-[130px_minmax(0,1fr)]">
              <p className="font-semibold text-slate-950">{row.label}</p>
              <p className="leading-6 text-slate-950">{row.value}</p>
            </div>
          ))}
        </div>
      </ReportSection>
    </ReportPage>
  )
}

function FullReportPageTwo({ preview }: { preview: ReportPreview }) {
  return (
    <ReportPage title="AI 분석 상세" subtitle={`보고서 번호: ${preview.reportNo}`} pageLabel="2 / 3">
      <ReportSection number={1} title="모델별 추론 결과">
        <div className="space-y-5">
          {preview.modelRows.map((model) => (
            <ScoreBar key={model.label} label={model.label} score={model.score} />
          ))}
        </div>
        <p className="mt-4 text-right text-[11px] text-slate-600">※ 점선은 판정 기준(60점)을 나타냅니다.</p>
      </ReportSection>

      <ReportSection number={2} title="모듈별 측정 항목">
        <ReportTable
          headers={["모듈", "측정 항목", "점수", "판정", "비고"]}
          rows={preview.modelRows.map((model) => [
            model.label,
            model.metric,
            String(model.score),
            model.score >= THRESHOLD ? "기준 초과" : "기준 미만",
            model.note,
          ])}
          colorColumns={[2, 3]}
        />
      </ReportSection>

      <ReportSection number={3} title="의심 구간 및 타임라인" last>
        <ReportTable
          headers={["구간", "모듈", "최대 점수", "상태", "설명"]}
          rows={preview.timelineRows}
          colorColumns={[2, 3]}
        />
      </ReportSection>
    </ReportPage>
  )
}

function SummaryReportPage({ preview }: { preview: ReportPreview }) {
  return (
    <ReportPage title="요약 보고서" subtitle={`보고서 번호: ${preview.reportNo}`} pageLabel="1 / 1">
      <ReportSection number={1} title="핵심 판정">
        <div className="border-2 border-slate-900 px-5 py-4 text-center">
          <p className="text-[13px] text-slate-600">종합 판정</p>
          <p className="mt-1 text-xl font-bold tracking-[0.08em] text-slate-950">{preview.riskLabel}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-0 [&>div+div]:border-l-0">
          <SummaryMetric label="위험 점수" value={`${preview.riskScore} / 100`} />
          <SummaryMetric label="분석 신뢰도" value={`${preview.confidence}%`} />
          <SummaryMetric label="검토 상태" value={preview.reviewStatus} />
        </div>
      </ReportSection>

      <ReportSection number={2} title="대상 증거">
        <InfoGrid
          rows={[
            ["사건명", preview.caseName],
            ["대상 증거", preview.evidenceNo],
            ["파일명", preview.fileName],
            ["등록 일시", preview.uploadedAt],
            ["파일 크기", preview.fileSize],
            ["원본 해시", preview.originalHash],
          ]}
        />
      </ReportSection>

      <ReportSection number={3} title="주요 근거">
        <div className="space-y-4">
          {preview.reasonRows.slice(0, 3).map((row) => (
            <div key={row.label} className="grid gap-4 text-[13px] sm:grid-cols-[130px_minmax(0,1fr)]">
              <p className="font-semibold text-slate-950">{row.label}</p>
              <p className="leading-6 text-slate-950">{row.value}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      <ReportSection number={4} title="진위 확인" last>
        <VerificationBlock preview={preview} />
      </ReportSection>

      <SignatureBlock generatedAt={preview.generatedAt} />
    </ReportPage>
  )
}

function IntegrityReportPage({
  preview,
  compact,
  pageLabel,
}: {
  preview: ReportPreview
  compact: boolean
  pageLabel: string
}) {
  return (
    <ReportPage title="무결성 및 감사 이력" subtitle={`보고서 번호: ${preview.reportNo}`} pageLabel={pageLabel}>
      <ReportSection number={1} title="무결성 검증 결과">
        <InfoGrid
          rows={[
            ["원본 해시", preview.originalHash],
            ["PDF 해시", preview.reportHash],
            ["해시 알고리즘", preview.hashAlgorithm],
            ["검증 결과", preview.integrityLabel, "success"],
            ["전자서명", preview.signatureLabel, preview.signatureOk ? "success" : "warning"],
            ["서명 기관", preview.signer],
          ]}
        />
      </ReportSection>

      <ReportSection number={2} title="블록체인 기록">
        <InfoGrid
          rows={[
            ["기록 상태", preview.blockchainLabel, preview.blockchainOk ? "success" : "warning"],
            ["네트워크", preview.blockchainNetwork],
            ["트랜잭션", preview.transactionHash],
            ["앵커 시각", preview.anchoredAt],
            ["블록 번호", preview.blockNo],
            ["상태", preview.blockchainOk ? "검증 가능" : "확인 필요", preview.blockchainOk ? "success" : "warning"],
          ]}
        />
      </ReportSection>

      <ReportSection number={3} title="CoC 처리 이력">
        <ReportTable headers={["시각", "이벤트", "담당", "상태", "해시"]} rows={preview.cocRows} colorColumns={[3]} />
      </ReportSection>

      <ReportSection number={4} title="검증 방법 및 유의사항" last={compact}>
        <VerificationBlock preview={preview} />
        <p className="mt-5 text-[13px] leading-7 text-slate-950">
          본 보고서의 AI 분석 결과는 조작 여부를 확정하지 않는 참고 소견이며, 최종 판단은 원본 자료, 사건 맥락,
          전문가 검토와 함께 이루어져야 합니다.
        </p>
      </ReportSection>

      <SignatureBlock generatedAt={preview.generatedAt} />
    </ReportPage>
  )
}

function ReportPage({
  title,
  subtitle,
  pageLabel,
  children,
}: {
  title: string
  subtitle: string
  pageLabel: string
  children: ReactNode
}) {
  return (
    <article className="mx-auto flex min-h-[1018px] w-full max-w-[720px] flex-col bg-white px-14 py-12 font-serif leading-relaxed text-slate-950 shadow-xl ring-1 ring-slate-200 [font-variant-numeric:tabular-nums]">
      <header>
        <div className="flex items-end justify-between gap-6 text-[11px] leading-5 text-slate-600">
          <p>ForenShield AI 디지털 증거 분석 시스템</p>
          <div className="text-right">
            <p>{subtitle}</p>
            <p>보안 등급: 내부망 전용</p>
          </div>
        </div>
        <div className="mt-2 border-t-2 border-slate-900" />
        <div className="mt-[3px] border-t border-slate-900" />
        <h3 className="mt-10 text-center text-[26px] font-bold tracking-[0.3em] text-slate-950">{title}</h3>
        <div className="mx-auto mt-5 w-24 border-t-2 border-slate-900" />
      </header>

      <div className="mt-9 flex-1">{children}</div>

      <footer className="mt-10">
        <div className="border-t border-slate-900" />
        <div className="mt-[3px] flex items-center justify-between border-t-2 border-slate-900 pt-3 text-[11px] leading-5 text-slate-600">
          <p>본 문서는 ForenShield AI 시스템이 생성한 분석 보고서이며, 무단 복제·배포를 금합니다.</p>
          <p>- {pageLabel} -</p>
        </div>
      </footer>
    </article>
  )
}

function ReportSection({
  number,
  title,
  children,
  last = false,
}: {
  number: number
  title: string
  children: ReactNode
  last?: boolean
}) {
  return (
    <section className={cn(!last && "mb-8")}>
      <h4 className="text-[15px] font-bold text-slate-950">
        {number}. {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function InfoGrid({ rows }: { rows: Array<[string, string, ValueTone?]> }) {
  const pairs: Array<Array<[string, string, ValueTone?]>> = []
  for (let index = 0; index < rows.length; index += 2) {
    pairs.push(rows.slice(index, index + 2))
  }

  return (
    <table className="w-full table-fixed border-collapse border border-slate-500 text-[13px] leading-6">
      <tbody>
        {pairs.map((pair, rowIndex) => (
          <tr key={rowIndex}>
            {pair.map(([label, value]) => (
              <FragmentCells key={label} label={label} value={value} />
            ))}
            {pair.length === 1 ? <FragmentCells label="" value="" /> : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FragmentCells({ label, value }: { label: string; value: string }) {
  return (
    <>
      <th className="w-[96px] border border-slate-500 bg-slate-100 px-3 py-2 text-left align-top text-[12px] font-semibold text-slate-800">
        {label}
      </th>
      <td className="border border-slate-500 px-3 py-2 align-top text-slate-950 [word-break:break-all]">{value}</td>
    </>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string; tone?: "danger" | "safe" }) {
  return (
    <div className="border border-slate-500 px-4 py-2.5">
      <p className="text-[11px] font-semibold text-slate-600">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-950">{value}</p>
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const safeScore = clamp(score, 0, 100)
  const overThreshold = safeScore >= THRESHOLD

  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)_36px] items-center gap-4 text-[13px]">
      <p className="text-slate-950">{label}</p>
      <div className="relative h-3 border border-slate-500 bg-white">
        <div
          className={cn("h-full", overThreshold ? "bg-slate-800" : "bg-slate-400")}
          style={{ width: `${safeScore}%` }}
        />
        <div
          className="absolute top-1/2 h-5 -translate-y-1/2 border-l border-dashed border-slate-700"
          style={{ left: `${THRESHOLD}%` }}
        />
      </div>
      <p className={cn("text-right text-slate-950", overThreshold && "font-bold")}>{safeScore}</p>
    </div>
  )
}

function ReportTable({
  headers,
  rows,
  colorColumns = [],
}: {
  headers: string[]
  rows: string[][]
  colorColumns?: number[]
}) {
  return (
    <table className="w-full table-fixed border-collapse border border-slate-500 text-[13px] leading-6">
      <thead>
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="border border-slate-500 bg-slate-100 px-2 py-1.5 text-center text-[12px] font-semibold text-slate-800"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${row.join("-")}-${rowIndex}`}>
            {row.map((cell, columnIndex) => (
              <td
                key={`${cell}-${columnIndex}`}
                className={cn(
                  "border border-slate-500 px-2 py-1.5 text-center text-slate-950 [word-break:break-all]",
                  colorColumns.includes(columnIndex) &&
                    (cell.includes("초과") || Number(cell) >= THRESHOLD) &&
                    "font-bold"
                )}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SignatureBlock({ generatedAt }: { generatedAt: string }) {
  return (
    <div className="mt-10">
      <p className="text-center text-[14px] leading-7 text-slate-950">
        위와 같이 분석 결과를 보고합니다.
      </p>
      <p className="mt-4 text-center text-[13px] text-slate-950">{generatedAt.split(" ")[0].replaceAll(".", ". ")}.</p>
      <table className="mx-auto mt-6 w-full max-w-[440px] border-collapse border border-slate-500 text-[13px]">
        <tbody>
          <tr>
            <th className="w-[72px] border border-slate-500 bg-slate-100 px-3 py-2.5 text-center font-semibold text-slate-800">
              작성자
            </th>
            <td className="border border-slate-500 px-3 py-2.5 text-slate-950">분석관</td>
            <td className="w-[110px] border border-slate-500 px-3 py-2.5 text-center text-slate-400">(서명)</td>
          </tr>
          <tr>
            <th className="border border-slate-500 bg-slate-100 px-3 py-2.5 text-center font-semibold text-slate-800">
              검토자
            </th>
            <td className="border border-slate-500 px-3 py-2.5 text-slate-950">책임 검토관</td>
            <td className="border border-slate-500 px-3 py-2.5 text-center text-slate-400">(서명)</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function VerificationBlock({ preview }: { preview: ReportPreview }) {
  return (
    <div className="grid gap-6 sm:grid-cols-[112px_minmax(0,1fr)]">
      <QrPreview />
      <div className="space-y-4 text-sm">
        <VerificationRow label="모바일" value="QR 코드를 스캔하여 공개 진위 확인 페이지에 접속합니다." />
        <VerificationRow label="PC" value="검증 URL 접속 후 검증코드를 입력합니다." />
        <VerificationRow label="검증 URL" value={preview.verifyUrl} tone="teal" />
        <VerificationRow label="검증코드" value={preview.verifyCode} />
      </div>
    </div>
  )
}

function VerificationRow({ label, value, tone }: { label: string; value: string; tone?: ValueTone }) {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-4 text-[13px]">
      <p className="font-semibold text-slate-600">{label}</p>
      <p className={cn("break-words text-slate-950", valueToneClass(tone))}>{value}</p>
    </div>
  )
}

function QrPreview() {
  const cells = Array.from({ length: 49 }, (_, index) => {
    const on = [0, 1, 2, 4, 5, 6, 7, 10, 14, 16, 18, 20, 21, 24, 25, 28, 30, 31, 35, 37, 40, 42, 43, 45, 46, 48].includes(index)
    return <span key={index} className={cn("block aspect-square", on ? "bg-slate-950" : "bg-white")} />
  })

  return (
    <div className="grid size-24 grid-cols-7 gap-1 border border-slate-200 bg-white p-2 shadow-sm" aria-label="QR 코드 미리보기">
      {cells}
    </div>
  )
}

type ValueTone = "success" | "warning" | "danger" | "teal"

type ReportPreview = {
  reportNo: string
  reviewStatus: string
  reviewApproved: boolean
  creator: string
  generatedAt: string
  caseName: string
  caseId: string
  evidenceNo: string
  fileName: string
  uploadedAt: string
  fileType: string
  fileSize: string
  originalHash: string
  reportHash: string
  hashAlgorithm: string
  riskScore: number
  riskTone: "safe" | "danger"
  riskLabel: string
  confidence: number
  summary: string
  reasonRows: Array<{ label: string; value: string }>
  modelRows: Array<{ label: string; metric: string; score: number; note: string }>
  timelineRows: string[][]
  signatureOk: boolean
  signatureLabel: string
  signer: string
  integrityLabel: string
  blockchainOk: boolean
  blockchainLabel: string
  blockchainNetwork: string
  transactionHash: string
  anchoredAt: string
  blockNo: string
  cocRows: string[][]
  verifyUrl: string
  verifyCode: string
}

function buildReportPreview(data: EvidenceDetailData, fileName: string, reviewApproved: boolean): ReportPreview {
  const { evidenceInfo, analysisInfo, integrityInfo, signatureInfo, blockchainInfo, cocLogs } = data
  const riskScore = toPercentScore(analysisInfo.riskScore)
  const confidence = toPercentScore(analysisInfo.confidenceScore)
  const reportHash = makeReportHash(`${fileName}:${evidenceInfo.evidenceId}`)
  const verifyCode = `VF-${String(evidenceInfo.evidenceId).padStart(8, "0")}`
  const originalFileName = evidenceInfo.originalFileName ?? evidenceInfo.fileName
  const modelRows = buildModelRows(analysisInfo.modelScores, analysisInfo.moduleResults)
  const timelineRows = modelRows.map((model, index) => [
    index === 0 ? "전체 구간" : `00:0${index - 1}-00:0${index + 2}`,
    model.label,
    String(model.score),
    model.score >= THRESHOLD ? "기준 초과" : "기준 미만",
    model.score >= THRESHOLD ? "추가 검토 필요" : "위험 신호 낮음",
  ])

  const signatureOk = signatureInfo?.signatureValid ?? signatureInfo?.signatureStatus === "VALID"
  const blockchainOk = blockchainInfo?.hashValid ?? (blockchainInfo?.status === "ANCHORED")

  return {
    reportNo: `RPT-${new Date().getFullYear()}-${String(evidenceInfo.evidenceId).padStart(4, "0")}`,
    reviewStatus: reviewApproved ? "검토 승인 완료" : "검토 승인 대기",
    reviewApproved,
    creator: "분석관",
    generatedAt: formatDateTime(new Date().toISOString()),
    caseName: evidenceInfo.caseName || "사건명 미지정",
    caseId: evidenceInfo.caseId ?? "-",
    evidenceNo: `EVD-${evidenceInfo.evidenceId}`,
    fileName: originalFileName,
    uploadedAt: formatDateTime(evidenceInfo.uploadedAt),
    fileType: evidenceInfo.fileType ?? evidenceInfo.mediaType ?? "VIDEO",
    fileSize: formatFileSize(evidenceInfo.fileSize),
    originalHash: shortenHash(integrityInfo.originalHash),
    reportHash: shortenHash(reportHash),
    hashAlgorithm: integrityInfo.hashAlgorithm || "SHA-256",
    riskScore,
    riskTone: riskScore >= THRESHOLD ? "danger" : "safe",
    riskLabel: getRiskLabel(riskScore),
    confidence,
    summary: analysisInfo.summary || "분석 결과 요약이 제공되지 않았습니다.",
    reasonRows: buildReasonRows(analysisInfo.evidenceItems),
    modelRows,
    timelineRows,
    signatureOk,
    signatureLabel: signatureOk ? `유효 · ${signatureInfo?.signatureAlgorithm || "SHA256withRSA"}` : "확인 필요",
    signer: formatSigner(signatureInfo?.signerCertificateSubject),
    integrityLabel: integrityInfo.chainValid || integrityInfo.isChainValid ? "등록된 해시와 일치" : "확인 필요",
    blockchainOk,
    blockchainLabel: blockchainOk ? "기록 일치" : "기록 확인 필요",
    blockchainNetwork: blockchainInfo?.network || "local-simulated",
    transactionHash: shortenHash(blockchainInfo?.transactionHash || "0x08117aac9ed08117aac9ed"),
    anchoredAt: formatDateTime(blockchainInfo?.anchoredAt ?? new Date().toISOString()),
    blockNo: "-",
    cocRows: buildCocRows(cocLogs),
    verifyUrl: "https://forenshield.ai/verify",
    verifyCode,
  }
}

function buildModelRows(modelScores?: ModelScore[] | null, moduleResults?: ModuleResult[] | null) {
  const scores = modelScores && modelScores.length > 0
    ? modelScores.map((score) => ({
        label: modelLabel(score.moduleName, score.modelName),
        metric: modelMetric(score.moduleName, score.modelName),
        score: toPercentScore(score.score),
        note: modelNote(score.moduleName, score.modelName),
      }))
    : (moduleResults ?? []).map((result) => ({
        label: modelLabel(result.moduleName, result.modelName ?? result.moduleName),
        metric: modelMetric(result.moduleName, result.modelName ?? result.moduleName),
        score: toPercentScore(result.score),
        note: modelNote(result.moduleName, result.modelName ?? result.moduleName),
      }))

  const fallback = [
    { label: "Late Fusion", metric: "종합 위험 프로파일", score: 24, note: "최종 종합" },
    { label: "Xception", metric: "얼굴 경계부·질감 패턴", score: 31, note: "CNN" },
    { label: "TimeSFormer", metric: "시간적 일관성", score: 18, note: "클립" },
    { label: "GMFlow", metric: "움직임 벡터", score: 12, note: "프레임쌍" },
  ]

  return scores.length > 0 ? scores.slice(0, 4) : fallback
}

function buildReasonRows(items?: string[] | null) {
  const labels = ["Late Fusion", "Xception", "TimeSFormer", "GMFlow"]
  const fallback = [
    "종합 위험 프로파일이 기준값 60보다 낮게 산출되었습니다.",
    "얼굴 경계부와 질감 패턴에서 합성 의심 신호가 기준 미만입니다.",
    "프레임 흐름과 얼굴 움직임의 시간적 불연속성이 낮게 측정되었습니다.",
    "프레임 간 움직임 벡터의 불안정 패턴이 뚜렷하지 않습니다.",
  ]

  return labels.map((label, index) => ({
    label,
    value: items?.[index] ?? fallback[index],
  }))
}

function buildCocRows(logs: EvidenceDetailData["cocLogs"]) {
  const rows = logs.slice(0, 5).map((log) => [
    formatDateTime(log.createdAt),
    cocEventLabel(log.eventType),
    log.userId || "시스템",
    "완료",
    shortenHash(log.currentLogHash),
  ])

  if (rows.length > 0) return rows

  return [
    ["-", "증거 등록", "분석관", "완료", "aaaa...aaaa"],
    ["-", "해시 생성", "시스템", "완료", "2f67...0784"],
    ["-", "보고서 생성", "시스템", "완료", "d7ed...3e39"],
  ]
}

function modelLabel(moduleName: string, modelName?: string | null) {
  const normalized = `${moduleName} ${modelName ?? ""}`.toLowerCase()
  if (normalized.includes("deepfake") && !normalized.includes("cnn") && !normalized.includes("temporal") && !normalized.includes("optical")) return "Late Fusion"
  if (normalized.includes("xception") || normalized.includes("cnn")) return "Xception"
  if (normalized.includes("times") || normalized.includes("temporal")) return "TimeSFormer"
  if (normalized.includes("gmflow") || normalized.includes("optical")) return "GMFlow"
  return modelName || moduleName
}

function modelMetric(moduleName: string, modelName?: string | null) {
  const label = modelLabel(moduleName, modelName)
  if (label === "Late Fusion") return "종합 위험 프로파일"
  if (label === "Xception") return "얼굴 경계부·질감 패턴"
  if (label === "TimeSFormer") return "시간적 일관성"
  if (label === "GMFlow") return "움직임 벡터"
  return "분석 점수"
}

function modelNote(moduleName: string, modelName?: string | null) {
  const label = modelLabel(moduleName, modelName)
  if (label === "Late Fusion") return "최종 종합"
  if (label === "Xception") return "CNN"
  if (label === "TimeSFormer") return "클립"
  if (label === "GMFlow") return "프레임쌍"
  return "모듈"
}

function getRiskLabel(score: number) {
  if (score >= 80) return "조작 가능성 높음"
  if (score >= 60) return "추가 검토 필요"
  return "조작 가능성 낮음"
}

function cocEventLabel(eventType: string) {
  const map: Record<string, string> = {
    EVIDENCE_UPLOADED: "증거 등록",
    HASH_CREATED: "해시 생성",
    METADATA_EXTRACTED: "메타데이터 추출",
    REPORT_CREATED: "보고서 생성",
    REPORT_SIGNED: "전자서명",
    BLOCKCHAIN_ANCHORED: "블록체인 앵커",
  }
  return map[eventType] ?? eventType
}

// 법정 제출 문서 형식: 본문은 무채색으로 통일하고 강조는 굵기만 사용한다.
function valueToneClass(_tone?: ValueTone) {
  return ""
}

function toPercentScore(value?: number | null) {
  if (value == null || Number.isNaN(value)) return 0
  const score = value <= 1 ? value * 100 : value
  return clamp(Math.round(score), 0, 100)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${year}.${month}.${day} ${hour}:${minute}`
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "-"
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function shortenHash(value?: string | null) {
  if (!value) return "-"
  if (value.length <= 22) return value
  return `${value.slice(0, 10)}...${value.slice(-6)}`
}

function formatSigner(value?: string | null) {
  if (!value) return "ForenShield Evidence Authority"
  if (value.includes("ForenShield Evidence Authority")) return "ForenShield Evidence Authority"
  if (value.startsWith("CN=")) {
    const cn = value
      .split(",")
      .find((part) => part.trim().startsWith("CN="))
      ?.replace("CN=", "")
      .trim()
    return cn || "ForenShield Evidence Authority"
  }
  return value
}

function makeReportHash(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  const hex = hash.toString(16).padStart(8, "0")
  return `${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`
}
