"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Copy, Download, ExternalLink, FileText, Loader2, RefreshCw, Share2 } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { getApiErrorMessage } from "@/lib/api/errors"
import { issuePublicReportAccess, type PublicReportAccessIssue } from "@/lib/api/public-report"
import { downloadReportPdf, fetchReports, type ReportListPage, type ReportSummary } from "@/lib/api/reports"
import { formatDateTime } from "@/lib/formatters"

const PAGE_SIZE = 10

export default function ReportsPage() {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<ReportListPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [sharingId, setSharingId] = useState<number | null>(null)
  const [shareResult, setShareResult] = useState<PublicReportAccessIssue | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      setError(null)
      try {
        const nextData = await fetchReports(page, PAGE_SIZE)
        if (!cancelled) {
          setData(nextData)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError, "보고서 목록을 불러오지 못했습니다."))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadReports()
    return () => {
      cancelled = true
    }
  }, [page])

  const reports = data?.content ?? []
  const totalPages = Math.max(data?.totalPages ?? 1, 1)
  const canGoPrev = page > 0
  const canGoNext = page + 1 < totalPages

  async function handleDownload(report: ReportSummary) {
    setDownloadingId(report.reportId)
    setActionMessage(null)
    try {
      const blob = await downloadReportPdf(report)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = report.reportFileName || `forenshield-report-${report.reportId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setActionMessage("PDF 다운로드를 시작했습니다.")
    } catch (downloadError) {
      setActionMessage(getApiErrorMessage(downloadError, "PDF 다운로드에 실패했습니다."))
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleShare(report: ReportSummary) {
    setSharingId(report.reportId)
    setShareResult(null)
    setActionMessage(null)
    try {
      const issued = await issuePublicReportAccess(report.reportId)
      setShareResult(issued)
      if (issued.publicViewUrl) {
        await navigator.clipboard?.writeText(issued.publicViewUrl)
        setActionMessage("외부 열람 링크를 복사했습니다.")
      } else {
        setActionMessage("외부 열람코드를 발급했습니다.")
      }
    } catch (shareError) {
      setActionMessage(getApiErrorMessage(shareError, "외부 열람코드 발급에 실패했습니다."))
    } finally {
      setSharingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-teal-600">Reports</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">보고서</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              분석 결과와 비교검증에서 생성한 PDF 보고서를 확인하고 다운로드합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchReports(page, PAGE_SIZE).then(setData).catch((refreshError) => {
              setError(getApiErrorMessage(refreshError, "보고서 목록을 새로고침하지 못했습니다."))
            })}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-bold text-card-foreground shadow-sm transition hover:bg-muted"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            새로고침
          </button>
        </div>

        {actionMessage ? (
          <div className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground shadow-sm">
            {actionMessage}
          </div>
        ) : null}

        {shareResult ? <ShareResultPanel result={shareResult} /> : null}

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-card-foreground">생성된 보고서</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  총 {data?.totalElements ?? 0}건
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <ReportState icon={<Loader2 className="size-5 animate-spin" />} title="보고서를 불러오는 중입니다" />
          ) : error ? (
            <ReportState icon={<FileText className="size-5" />} title={error} />
          ) : reports.length === 0 ? (
            <ReportState
              icon={<FileText className="size-5" />}
              title="생성된 보고서가 없습니다"
              description="사건 상세 또는 비교검증 결과 화면에서 PDF를 생성하면 이곳에 표시됩니다."
            />
          ) : (
            <div className="divide-y divide-border">
              {reports.map((report) => (
                <ReportRow
                  key={report.reportId}
                  report={report}
                  downloading={downloadingId === report.reportId}
                  sharing={sharingId === report.reportId}
                  onDownload={() => void handleDownload(report)}
                  onShare={() => void handleShare(report)}
                />
              ))}
            </div>
          )}

          {!loading && !error && reports.length > 0 ? (
            <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm font-semibold text-muted-foreground">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                className="rounded-md px-3 py-2 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                이전
              </button>
              <span>{page + 1} / {totalPages}</span>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md px-3 py-2 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음
              </button>
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function ReportRow({
  report,
  downloading,
  sharing,
  onDownload,
  onShare,
}: {
  report: ReportSummary
  downloading: boolean
  sharing: boolean
  onDownload: () => void
  onShare: () => void
}) {
  const detailHref = useMemo(() => {
    if (report.reportType === "COMPARE" && report.compareId) return `/compare/${report.compareId}`
    if (report.caseId) return `/cases/${encodeURIComponent(report.caseId)}${report.evidenceId ? `?evidenceId=${report.evidenceId}` : ""}`
    return null
  }, [report.caseId, report.compareId, report.evidenceId, report.reportType])

  return (
    <article className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-muted dark:text-muted-foreground">
            {report.reportType === "COMPARE" ? "비교검증" : "분석"}
          </span>
          {report.verdictLabel ? (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">
              {report.verdictLabel}
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 truncate text-base font-black text-card-foreground">
          {report.reportFileName || `보고서 #${report.reportId}`}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-muted-foreground">
          <span>{report.caseName ?? "사건 정보 없음"}</span>
          <span>{formatDateTime(report.createdAt)}</span>
          {report.evidenceId ? <span>EVD-{report.evidenceId}</span> : null}
          {report.compareId ? <span>CMP-{report.compareId}</span> : null}
        </div>
        <p className="mt-2 truncate font-mono text-xs text-slate-400">{report.reportHash}</p>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        {detailHref ? (
          <Link
            href={detailHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-bold text-card-foreground transition hover:bg-muted"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            상세
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onShare}
          disabled={sharing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-bold text-card-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
        >
          {sharing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
          공유
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 dark:bg-primary dark:text-primary-foreground"
        >
          {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          PDF
        </button>
      </div>
    </article>
  )
}

function ShareResultPanel({ result }: { result: PublicReportAccessIssue }) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-card-foreground">외부 열람코드 발급 완료</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.accessCode} · 만료 {formatDateTime(result.expiresAt)}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-slate-400">{result.publicViewUrl}</p>
        </div>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(result.publicViewUrl)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-bold text-card-foreground transition hover:bg-muted"
        >
          <Copy className="size-4" aria-hidden="true" />
          링크 복사
        </button>
      </div>
    </section>
  )
}

function ReportState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-bold text-card-foreground">{title}</h2>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}
